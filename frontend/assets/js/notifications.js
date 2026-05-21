// Gestion des notifications push - GMAO Sakété v2.1.0

// ============================================
// CONFIGURATION
// ============================================

const API_URL = 'https://gmao-sakete-ifangni-1.onrender.com/api';

// Clé publique VAPID (à remplacer par votre clé générée)
// Générer avec: `web-push generate-vapid-keys --json`
const VAPID_PUBLIC_KEY = 'BEl62iUYxuUjZJqZxjfFm-OqxW5QJ9EEr-rpz3DQv5nL0w4YwZ5yR6x7s8t9u0v1w2x3y4z5A6B7C8D9E0F1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6V7W8X9Y10Z';

// ============================================
// UTILITAIRES
// ============================================

// Convertir base64 en Uint8Array
function urlBase64ToUint8Array(base64String) {
    // Ajouter le padding si nécessaire
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Vérifier si les notifications sont supportées
function isNotificationSupported() {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
}

// Vérifier si le service worker est actif
async function isServiceWorkerActive() {
    if (!('serviceWorker' in navigator)) return false;
    
    const registration = await navigator.serviceWorker.getRegistration();
    return registration && registration.active;
}

// ============================================
// PERMISSIONS
// ============================================

// Demander la permission
async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
        console.warn('Notifications non supportées par ce navigateur');
        return false;
    }
    
    // Vérifier si déjà accordé
    if (Notification.permission === 'granted') {
        console.log('Permission déjà accordée');
        await registerPushSubscription();
        return true;
    }
    
    // Vérifier si déjà refusé
    if (Notification.permission === 'denied') {
        console.warn('Permission refusée par l\'utilisateur');
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('✅ Permission accordée pour les notifications');
            await registerPushSubscription();
            return true;
        } else {
            console.log('❌ Permission refusée');
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la demande de permission:', error);
        return false;
    }
}

// ============================================
# SUBSCRIPTION PUSH
============================================

// Enregistrer la subscription push
async function registerPushSubscription() {
    try {
        // Vérifier que le service worker est prêt
        const swReady = await isServiceWorkerActive();
        if (!swReady) {
            console.warn('Service worker non prêt');
            return false;
        }
        
        const sw = await navigator.serviceWorker.ready;
        
        // Vérifier si déjà abonné
        let subscription = await sw.pushManager.getSubscription();
        
        if (!subscription) {
            // Créer une nouvelle subscription
            subscription = await sw.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }
        
        // Envoyer la subscription au serveur
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Utilisateur non authentifié');
            return false;
        }
        
        const response = await fetch(`${API_URL}/notifications/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                userAgent: navigator.userAgent,
                platform: getPlatform()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        console.log('✅ Push subscription enregistrée avec succès');
        return true;
        
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement push:', error);
        return false;
    }
}

// Désenregistrer la subscription push
async function unregisterPushSubscription() {
    try {
        const sw = await navigator.serviceWorker.ready;
        const subscription = await sw.pushManager.getSubscription();
        
        if (subscription) {
            // Supprimer du serveur
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_URL}/notifications/unregister`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint
                    })
                });
            }
            
            // Supprimer localement
            await subscription.unsubscribe();
            console.log('✅ Push subscription désenregistrée');
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors du désenregistrement push:', error);
        return false;
    }
}

// ============================================
# AFFICHAGE DES NOTIFICATIONS
============================================

// Afficher une notification locale
function showLocalNotification(title, body, options = {}) {
    if (!('Notification' in window)) {
        console.warn('Notification API non supportée');
        return null;
    }
    
    if (Notification.permission !== 'granted') {
        console.warn('Permission non accordée');
        return null;
    }
    
    const defaultOptions = {
        icon: '/assets/images/icons/icon-192.png',
        badge: '/assets/images/icons/icon-72.png',
        vibrate: [200, 100, 200],
        silent: false,
        requireInteraction: false,
        tag: Date.now().toString(),
        data: { url: '/' }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const notification = new Notification(title, {
            body: body,
            icon: finalOptions.icon,
            badge: finalOptions.badge,
            vibrate: finalOptions.vibrate,
            silent: finalOptions.silent,
            requireInteraction: finalOptions.requireInteraction,
            tag: finalOptions.tag,
            data: finalOptions.data
        });
        
        // Gestionnaire de clic
        notification.onclick = function(event) {
            event.preventDefault();
            window.focus();
            
            const url = finalOptions.data?.url || '/';
            window.location.href = url;
            notification.close();
        };
        
        // Auto-fermeture après 10 secondes
        setTimeout(() => {
            if (notification) notification.close();
        }, 10000);
        
        return notification;
    } catch (error) {
        console.error('Erreur lors de l\'affichage de la notification:', error);
        return null;
    }
}

// ============================================
# TYPES DE NOTIFICATIONS
============================================

const NOTIFICATION_TYPES = {
    NOUVELLE_PANNE: {
        title: '🚨 Nouvelle panne signalée',
        icon: '/assets/images/icons/alert.png',
        level: 'high',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200]
    },
    INTERVENTION_TERMINEE: {
        title: '✅ Panne résolue',
        icon: '/assets/images/icons/success.png',
        level: 'normal',
        requireInteraction: false
    },
    MAINTENANCE_PREVENTIVE: {
        title: '📅 Maintenance préventive',
        icon: '/assets/images/icons/calendar.png',
        level: 'normal',
        requireInteraction: false
    },
    STOCK_FAIBLE: {
        title: '⚠️ Stock faible',
        icon: '/assets/images/icons/stock.png',
        level: 'medium',
        requireInteraction: true
    },
    ALERTE_CRITIQUE: {
        title: '🔴 Alerte critique',
        icon: '/assets/images/icons/critical.png',
        level: 'urgent',
        requireInteraction: true,
        vibrate: [300, 150, 300, 150, 300]
    },
    EQUIPEMENT_ECHEC: {
        title: '❌ Équipement hors service',
        icon: '/assets/images/icons/error.png',
        level: 'high',
        requireInteraction: true
    },
    RAPPORT_MENSUEL: {
        title: '📊 Rapport mensuel disponible',
        icon: '/assets/images/icons/report.png',
        level: 'normal',
        requireInteraction: false
    },
    UTILISATEUR_VALIDE: {
        title: '✅ Compte validé',
        icon: '/assets/images/icons/success.png',
        level: 'normal',
        requireInteraction: false
    }
};

// Envoyer une notification selon le type
function sendNotificationByType(type, data = {}) {
    const config = NOTIFICATION_TYPES[type];
    if (!config) {
        console.warn(`Type de notification inconnu: ${type}`);
        return null;
    }
    
    let body = '';
    let url = '/';
    
    switch(type) {
        case 'NOUVELLE_PANNE':
            body = `${data.equipementNom || 'Un équipement'} - ${data.service || 'Service inconnu'} nécessite une intervention ${data.priorite ? `(Priorité: ${data.priorite})` : ''}`;
            url = `/technicien/maintenances.html${data.interventionId ? `?id=${data.interventionId}` : ''}`;
            break;
            
        case 'INTERVENTION_TERMINEE':
            body = `L'intervention sur ${data.equipementNom || "l'équipement"} est terminée et ${data.satisfaction ? `notée ${data.satisfaction}/5` : 'validée'}`;
            url = `/soignant/historique.html`;
            break;
            
        case 'MAINTENANCE_PREVENTIVE':
            body = `${data.equipementNom || 'Un équipement'} - Maintenance ${data.type || 'préventive'} à réaliser pour le ${new Date(data.date).toLocaleDateString() || 'prochainement'}`;
            url = `/technicien/preventive.html?id=${data.maintenanceId || ''}`;
            break;
            
        case 'STOCK_FAIBLE':
            body = `La pièce ${data.pieceDesignation || 'référence inconnue'} n'a plus que ${data.quantite || 0} unité(s) en stock (seuil: ${data.seuil || 5})`;
            url = `/technicien/stock.html`;
            break;
            
        case 'ALERTE_CRITIQUE':
            body = data.message || 'Une alerte critique nécessite votre attention immédiate';
            url = `/technicien/alertes.html`;
            break;
            
        case 'EQUIPEMENT_ECHEC':
            body = `${data.equipementNom || 'Un équipement'} est hors service. Intervention requise en urgence.`;
            url = `/technicien/maintenances.html`;
            break;
            
        case 'RAPPORT_MENSUEL':
            body = `Le rapport ${data.mois || 'mensuel'} est disponible. Taux de disponibilité: ${data.disponibilite || 0}%`;
            url = `/technicien/codir-rapports.html`;
            break;
            
        case 'UTILISATEUR_VALIDE':
            body = `Votre compte a été validé. Vous pouvez maintenant vous connecter.`;
            url = `/login.html`;
            break;
            
        default:
            body = data.message || 'Nouvelle notification GMAO';
    }
    
    return showLocalNotification(config.title, body, {
        icon: config.icon,
        vibrate: config.vibrate,
        requireInteraction: config.requireInteraction,
        data: { url: url, type: type, level: config.level }
    });
}

// ============================================
# SERVICE WORKER COMMUNICATION
============================================

// Écouter les messages du service worker
function listenToServiceWorkerMessages() {
    if (!('serviceWorker' in navigator)) return;
    
    navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        
        if (!data || !data.type) return;
        
        switch (data.type) {
            case 'SHOW_NOTIFICATION':
                showLocalNotification(data.title, data.body, {
                    icon: data.icon,
                    data: { url: data.url }
                });
                break;
                
            case 'NOTIFICATION_CLICK':
                console.log('Notification cliquée:', data);
                if (data.url) {
                    window.location.href = data.url;
                }
                break;
                
            default:
                console.log('Message du service worker:', data);
        }
    });
}

// ============================================
# INITIALISATION
============================================

// Obtenir la plateforme
function getPlatform() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'web';
}

// Initialiser les notifications
async function initNotifications() {
    if (!isNotificationSupported()) {
        console.warn('⚠️ Notifications non supportées par ce navigateur');
        return false;
    }
    
    // Vérifier que le service worker est enregistré
    const swReady = await isServiceWorkerActive();
    if (!swReady) {
        console.warn('⚠️ Service worker non actif, attente...');
        
        // Attendre que le service worker soit actif
        navigator.serviceWorker.ready.then(() => {
            initNotifications();
        });
        return false;
    }
    
    // Écouter les messages du service worker
    listenToServiceWorkerMessages();
    
    // Vérifier la permission
    if (Notification.permission === 'default') {
        // Demander après un délai (pour ne pas être intrusif)
        setTimeout(() => {
            requestNotificationPermission();
        }, 5000);
    } else if (Notification.permission === 'granted') {
        await registerPushSubscription();
    }
    
    return true;
}

// ============================================
# UTILITAIRES DE DEBUG
============================================

// Tester une notification (pour debug)
function testNotification() {
    if (Notification.permission !== 'granted') {
        console.warn('Permission non accordée. Appelez requestNotificationPermission() d\'abord.');
        return false;
    }
    
    showLocalNotification(
        '🔔 Test GMAO',
        'Les notifications fonctionnent correctement sur votre appareil !',
        {
            icon: '/assets/images/icons/icon-192.png',
            requireInteraction: true,
            data: { url: '/' }
        }
    );
    
    return true;
}

// Tester tous les types de notifications
function testAllNotificationTypes() {
    const types = Object.keys(NOTIFICATION_TYPES);
    let index = 0;
    
    function showNext() {
        if (index >= types.length) return;
        
        const type = types[index];
        sendNotificationByType(type, {
            equipementNom: 'Test Équipement',
            service: 'Test Service',
            pieceDesignation: 'Test Pièce',
            quantite: 3,
            seuil: 5
        });
        
        index++;
        setTimeout(showNext, 2000);
    }
    
    showNext();
}

// ============================================
# EXPORTATION
============================================

// Export pour ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isNotificationSupported,
        requestNotificationPermission,
        registerPushSubscription,
        unregisterPushSubscription,
        showLocalNotification,
        sendNotificationByType,
        initNotifications,
        testNotification,
        testAllNotificationTypes,
        NOTIFICATION_TYPES
    };
}

// Export global
if (typeof window !== 'undefined') {
    window.Notifications = {
        isSupported: isNotificationSupported,
        requestPermission: requestNotificationPermission,
        register: registerPushSubscription,
        unregister: unregisterPushSubscription,
        show: showLocalNotification,
        sendByType: sendNotificationByType,
        init: initNotifications,
        test: testNotification,
        testAll: testAllNotificationTypes,
        TYPES: NOTIFICATION_TYPES
    };
}
