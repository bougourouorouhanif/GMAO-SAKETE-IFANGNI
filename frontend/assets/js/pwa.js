// Gestion PWA (Progressive Web App) - GMAO Sakété v2.1.0

// ============================================
// CONFIGURATION
// ============================================

const PWA_CONFIG = {
    CACHE_NAME: 'gmao-cache-v2',
    OFFLINE_URL: '/offline.html',
    ASSETS_TO_CACHE: [
        '/',
        '/index.html',
        '/login.html',
        '/register.html',
        '/offline.html',
        '/manifest.json',
        '/assets/css/style.css',
        '/assets/css/mobile.css',
        '/assets/js/api.js',
        '/assets/js/auth.js',
        '/assets/js/utils.js',
        '/assets/images/logo.png',
        '/assets/images/FOND.png',
        '/assets/images/icons/icon-72.png',
        '/assets/images/icons/icon-96.png',
        '/assets/images/icons/icon-128.png',
        '/assets/images/icons/icon-144.png',
        '/assets/images/icons/icon-152.png',
        '/assets/images/icons/icon-192.png',
        '/assets/images/icons/icon-384.png',
        '/assets/images/icons/icon-512.png'
    ],
    // API endpoints à mettre en cache
    API_CACHE_ENDPOINTS: [
        '/equipements',
        '/stock',
        '/alertes',
        '/maintenances/mes-interventions'
    ],
    // Durée de vie du cache API (24 heures)
    API_CACHE_TTL: 24 * 60 * 60 * 1000,
    // Maximum de tentatives de synchronisation
    MAX_SYNC_RETRIES: 5,
    // Délai entre les tentatives (exponentiel)
    SYNC_RETRY_DELAY: 5000
};

// ============================================
# UTILITAIRES
============================================

// Stockage IndexedDB pour les requêtes hors ligne
let db = null;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('GMaoOfflineDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pendingRequests')) {
                const store = db.createObjectStore('pendingRequests', { 
                    autoIncrement: true 
                });
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('retryCount', 'retryCount');
            }
        };
    });
}

// Sauvegarder une requête pour synchronisation ultérieure
async function savePendingRequest(requestData) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingRequests'], 'readwrite');
        const store = transaction.objectStore('pendingRequests');
        
        const data = {
            ...requestData,
            timestamp: Date.now(),
            retryCount: 0
        };
        
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Récupérer les requêtes en attente
async function getPendingRequests() {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingRequests'], 'readonly');
        const store = transaction.objectStore('pendingRequests');
        const requests = [];
        
        store.openCursor().onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                requests.push(cursor.value);
                cursor.continue();
            } else {
                resolve(requests);
            }
        };
        transaction.onerror = () => reject(transaction.error);
    });
}

// Supprimer une requête après synchronisation
async function removePendingRequest(id) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingRequests'], 'readwrite');
        const store = transaction.objectStore('pendingRequests');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============================================
# SERVICE WORKER
============================================

// Enregistrer le Service Worker
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker non supporté par ce navigateur');
        return false;
    }
    
    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        
        console.log('✅ Service Worker enregistré:', registration.scope);
        
        // Vérifier les mises à jour
        checkForUpdates(registration);
        
        // Écouter les messages du service worker
        listenToServiceWorkerMessages();
        
        return true;
    } catch (error) {
        console.error('❌ Erreur enregistrement Service Worker:', error);
        return false;
    }
}

// Vérifier les mises à jour
function checkForUpdates(registration) {
    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Nouveau Service Worker détecté');
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateNotification();
            }
        });
    });
    
    // Vérification périodique (toutes les heures)
    setInterval(() => {
        registration.update();
    }, 60 * 60 * 1000);
}

// Afficher notification de mise à jour
function showUpdateNotification() {
    // Vérifier si la bannière existe déjà
    if (document.getElementById('updateBanner')) return;
    
    const updateBanner = document.createElement('div');
    updateBanner.id = 'updateBanner';
    updateBanner.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: white;
            padding: 14px 20px;
            border-radius: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 2000;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            animation: slideUp 0.3s ease;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🔄</span>
                <div>
                    <strong>Nouvelle version disponible</strong>
                    <div style="font-size: 11px; opacity: 0.8;">Redémarrez pour bénéficier des dernières améliorations</div>
                </div>
            </div>
            <button onclick="window.refreshApp()" style="
                background: #0066FF;
                border: none;
                color: white;
                padding: 8px 20px;
                border-radius: 30px;
                cursor: pointer;
                font-weight: 600;
                transition: 0.2s;
            ">Mettre à jour</button>
        </div>
    `;
    
    // Ajouter les styles d'animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(updateBanner);
}

// Rafraîchir l'application
function refreshApp() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

// Écouter les messages du service worker
function listenToServiceWorkerMessages() {
    navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        
        if (!data) return;
        
        switch (data.type) {
            case 'CACHE_UPDATED':
                console.log('Cache mis à jour');
                break;
            case 'SYNC_COMPLETE':
                console.log('Synchronisation terminée');
                break;
            default:
                console.log('Message du service worker:', data);
        }
    });
}

// ============================================
# MODE HORS LIGNE
============================================

// Vérifier si l'application est en mode hors ligne
function isOffline() {
    return !navigator.onLine;
}

// Afficher le mode hors ligne
let offlineBanner = null;

function showOfflineMode() {
    if (document.getElementById('offlineBanner')) return;
    
    offlineBanner = document.createElement('div');
    offlineBanner.id = 'offlineBanner';
    offlineBanner.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f59e0b;
            color: white;
            text-align: center;
            padding: 10px;
            font-size: 12px;
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        ">
            <span>📡</span>
            <span>Mode hors ligne - Les données sont lues depuis le cache</span>
        </div>
    `;
    document.body.prepend(offlineBanner);
    
    // Ajuster le padding du body
    document.body.style.paddingTop = '40px';
}

function hideOfflineMode() {
    const banner = document.getElementById('offlineBanner');
    if (banner) {
        banner.remove();
        document.body.style.paddingTop = '';
    }
}

// Écouter les changements de connexion
function initNetworkListeners() {
    window.addEventListener('online', () => {
        console.log('🟢 Connexion rétablie');
        hideOfflineMode();
        syncOfflineData();
        
        // Afficher un toast de confirmation
        showToast('Connexion rétablie', 'success');
    });
    
    window.addEventListener('offline', () => {
        console.log('🔴 Mode hors ligne');
        showOfflineMode();
        showToast('Mode hors ligne activé', 'warning');
    });
    
    // Vérifier l'état initial
    if (isOffline()) {
        showOfflineMode();
    }
}

// Afficher un toast temporaire
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 20px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 12px 16px;
        border-radius: 12px;
        text-align: center;
        z-index: 2000;
        animation: slideUp 0.3s ease;
        font-size: 13px;
        font-weight: 500;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============================================
# SYNCHRONISATION HORS LIGNE
============================================

// Synchroniser les données hors ligne
async function syncOfflineData() {
    if (isOffline()) {
        console.log('Toujours hors ligne, synchronisation différée');
        return false;
    }
    
    console.log('🔄 Synchronisation des données hors ligne...');
    
    try {
        const pendingRequests = await getPendingRequests();
        
        if (pendingRequests.length === 0) {
            console.log('Aucune donnée en attente de synchronisation');
            return true;
        }
        
        console.log(`${pendingRequests.length} requête(s) en attente`);
        
        let syncedCount = 0;
        
        for (const request of pendingRequests) {
            const success = await processPendingRequest(request);
            if (success) {
                await removePendingRequest(request.id);
                syncedCount++;
            } else if (request.retryCount >= PWA_CONFIG.MAX_SYNC_RETRIES) {
                console.warn(`Requête abandonnée après ${PWA_CONFIG.MAX_SYNC_RETRIES} tentatives:`, request.url);
                await removePendingRequest(request.id);
            } else {
                // Mettre à jour le compteur de tentatives
                await updateRetryCount(request.id, request.retryCount + 1);
            }
        }
        
        if (syncedCount > 0) {
            showToast(`${syncedCount} élément(s) synchronisé(s)`, 'success');
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la synchronisation:', error);
        return false;
    }
}

async function processPendingRequest(request) {
    try {
        const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body
        });
        
        if (response.ok) {
            console.log('✅ Requête synchronisée:', request.url);
            return true;
        } else {
            console.warn(`Échec synchronisation ${request.url}: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`Erreur lors de la synchronisation de ${request.url}:`, error);
        return false;
    }
}

async function updateRetryCount(id, newCount) {
    if (!db) await initIndexedDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingRequests'], 'readwrite');
        const store = transaction.objectStore('pendingRequests');
        
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (data) {
                data.retryCount = newCount;
                store.put(data);
                resolve();
            } else {
                resolve();
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

// ============================================
# INSTALLATION PWA
============================================

let deferredPrompt = null;

function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Afficher le bouton d'installation
        showInstallButton();
    });
    
    // Détecter si l'application est déjà installée
    window.addEventListener('appinstalled', () => {
        console.log('✅ Application installée');
        deferredPrompt = null;
        hideInstallButton();
        showToast('Application installée avec succès !', 'success');
    });
}

function showInstallButton() {
    if (document.getElementById('installPWA')) return;
    
    const installDiv = document.createElement('div');
    installDiv.id = 'installPWA';
    installDiv.innerHTML = `
        <button id="installBtn" style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #0066FF, #0052CC);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 50px;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0,102,255,0.4);
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s;
        ">
            <span>📱</span>
            Installer l'application
        </button>
    `;
    document.body.appendChild(installDiv);
    
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Installation: ${outcome}`);
            deferredPrompt = null;
            hideInstallButton();
        }
    });
}

function hideInstallButton() {
    const installDiv = document.getElementById('installPWA');
    if (installDiv) installDiv.remove();
}

// ============================================
# INITIALISATION
============================================

// Initialiser la PWA
async function initPWA() {
    console.log('📱 Initialisation PWA...');
    
    // Initialiser IndexedDB
    await initIndexedDB();
    
    // Enregistrer Service Worker
    const swRegistered = await registerServiceWorker();
    
    if (swRegistered) {
        // Initialiser les notifications (si disponibles)
        if (typeof window.Notifications !== 'undefined') {
            window.Notifications.init();
        }
        
        // Écouter les changements de réseau
        initNetworkListeners();
        
        // Demander l'installation
        initInstallPrompt();
        
        // Synchroniser périodiquement (toutes les heures)
        setInterval(() => {
            if (!isOffline()) {
                syncOfflineData();
            }
        }, 60 * 60 * 1000);
    }
    
    // Vérifier si l'application est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('📱 Application installée - mode standalone');
        document.body.classList.add('pwa-installed');
        hideInstallButton();
    }
    
    // Vérifier la version du cache
    await checkCacheVersion();
}

// Vérifier la version du cache
async function checkCacheVersion() {
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
            name.startsWith('gmao-cache-') && name !== PWA_CONFIG.CACHE_NAME
        );
        
        if (oldCaches.length > 0) {
            console.log(`Suppression de ${oldCaches.length} ancien(s) cache(s)`);
            for (const cacheName of oldCaches) {
                await caches.delete(cacheName);
            }
        }
    }
}

// Exporter les fonctions pour un usage global
window.refreshApp = refreshApp;
window.syncOfflineData = syncOfflineData;

// ============================================
# AUTO-INITIALISATION
============================================

// S'assurer que le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
} else {
    initPWA();
}

// Export pour ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        registerServiceWorker,
        refreshApp,
        isOffline,
        syncOfflineData,
        initPWA
    };
}
