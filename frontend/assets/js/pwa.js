// Gestion PWA (Progressive Web App) - GMAO Sakété

// Configuration PWA
const PWA_CONFIG = {
    CACHE_NAME: 'gmao-cache-v2',
    OFFLINE_URL: '/offline.html',
    ASSETS_TO_CACHE: [
        '/',
        '/index.html',
        '/login.html',
        '/offline.html',
        '/assets/css/style.css',
        '/assets/css/mobile.css',
        '/assets/css/chatbot.css',
        '/assets/jshttps://gmao-sakete-ifangni-1.onrender.com/api.js',
        '/assets/js/auth.js',
        '/assets/js/utils.js',
        '/assets/js/notification.js',
        '/assets/images/logo.png'
    ]
};

// Enregistrer le Service Worker
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker non supporté');
        return false;
    }
    
    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });
        console.log('Service Worker enregistré:', registration.scope);
        
        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('Nouveau Service Worker trouvé');
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    showUpdateNotification();
                }
            });
        });
        
        return true;
    } catch (error) {
        console.error('Erreur enregistrement Service Worker:', error);
        return false;
    }
}

// Afficher notification de mise à jour
function showUpdateNotification() {
    const updateBanner = document.createElement('div');
    updateBanner.id = 'updateBanner';
    updateBanner.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: #1a2a4f;
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 2000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        ">
            <span>🔄 Une nouvelle version est disponible</span>
            <button onclick="refreshApp()" style="
                background: #3b82f6;
                border: none;
                color: white;
                padding: 6px 16px;
                border-radius: 20px;
                cursor: pointer;
            ">Mettre à jour</button>
        </div>
    `;
    document.body.appendChild(updateBanner);
}

// Rafraîchir l'application
function refreshApp() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        });
    }
}

// Vérifier si l'application est en mode hors ligne
function isOffline() {
    return !navigator.onLine;
}

// Afficher le mode hors ligne
function showOfflineMode() {
    const offlineBanner = document.createElement('div');
    offlineBanner.id = 'offlineBanner';
    offlineBanner.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ef4444;
            color: white;
            text-align: center;
            padding: 8px;
            font-size: 12px;
            z-index: 2000;
        ">
            📡 Mode hors ligne - Données en cache
        </div>
    `;
    document.body.prepend(offlineBanner);
}

// Cacher le mode hors ligne
function hideOfflineMode() {
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.remove();
}

// Écouter les changements de connexion
function initNetworkListeners() {
    window.addEventListener('online', () => {
        console.log('Connexion rétablie');
        hideOfflineMode();
        syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
        console.log('Mode hors ligne');
        showOfflineMode();
    });
    
    // Vérifier l'état initial
    if (isOffline()) {
        showOfflineMode();
    }
}

// Synchroniser les données hors ligne
async function syncOfflineData() {
    console.log('Synchronisation des données hors ligne...');
    
    // Récupérer les requêtes en attente
    const cache = await caches.open(PWA_CONFIG.CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
        if (request.url.includes('https://gmao-sakete-ifangni-1.onrender.com/api/') && request.method === 'POST') {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                    console.log('Requête synchronisée:', request.url);
                }
            } catch (error) {
                console.error('Erreur synchronisation:', error);
            }
        }
    }
    
    // Recharger les données
    if (window.location.pathname.includes('dashboard')) {
        window.location.reload();
    }
}

// Demander l'installation de l'application
let deferredPrompt;

function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Afficher un bouton d'installation
        showInstallButton();
    });
}

function showInstallButton() {
    const installBtn = document.createElement('div');
    installBtn.id = 'installPWA';
    installBtn.innerHTML = `
        <button id="installBtn" style="
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #1a2a4f;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-size: 12px;
        ">
            📱 Installer l'application
        </button>
    `;
    document.body.appendChild(installBtn);
    
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Installation: ${outcome}`);
            deferredPrompt = null;
            document.getElementById('installPWA')?.remove();
        }
    });
}

// Initialiser la PWA
async function initPWA() {
    console.log('Initialisation PWA...');
    
    // Enregistrer Service Worker
    const swRegistered = await registerServiceWorker();
    
    if (swRegistered) {
        // Initialiser les notifications
        if (typeof initNotifications !== 'undefined') {
            initNotifications();
        }
        
        // Écouter les changements de réseau
        initNetworkListeners();
        
        // Demander l'installation
        initInstallPrompt();
    }
    
    // Vérifier si l'application est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Application installée - mode standalone');
        document.body.classList.add('pwa-installed');
    }
}

// S'assurer que le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
} else {
    initPWA();
}

// Exporter les fonctions
export {
    registerServiceWorker,
    refreshApp,
    isOffline,
    syncOfflineData,
    initPWA
};