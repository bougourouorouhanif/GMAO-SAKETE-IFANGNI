// Gestion des notifications push - GMAO Sakété

// Vérifier si les notifications sont supportées
function isNotificationSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

// Demander la permission
async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
        console.log('Notifications non supportées');
        return false;
    }
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Permission accordée pour les notifications');
            registerPushSubscription();
            return true;
        } else {
            console.log('Permission refusée');
            return false;
        }
    } catch (error) {
        console.error('Erreur permission notifications:', error);
        return false;
    }
}

// Enregistrer la subscription push
async function registerPushSubscription() {
    try {
        const sw = await navigator.serviceWorker.ready;
        const subscription = await sw.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('VOTRE_CLE_PUBLIC_VAPID')
        });
        
        // Envoyer la subscription au serveur
        const token = localStorage.getItem('token');
        await fetch('https://gmao-sakete-ifangni-1.onrender.com/api/mobile/push-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                pushToken: JSON.stringify(subscription)
            })
        });
        
        console.log('Push subscription enregistrée');
    } catch (error) {
        console.error('Erreur subscription push:', error);
    }
}

// Convertir base64 en Uint8Array
function urlBase64ToUint8Array(base64String) {
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

// Afficher une notification
function showLocalNotification(title, body, icon = '/assets/images/icons/icon-192.png', url = '/') {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        const options = {
            body: body,
            icon: icon,
            badge: '/assets/images/icons/icon-72.png',
            vibrate: [200, 100, 200],
            data: { url: url },
            actions: [
                { action: 'open', title: 'Voir' },
                { action: 'close', title: 'Fermer' }
            ]
        };
        
        const notification = new Notification(title, options);
        
        notification.onclick = function(event) {
            event.preventDefault();
            window.focus();
            window.location.href = url;
            notification.close();
        };
        
        return notification;
    }
}

// Types de notifications
const NOTIFICATION_TYPES = {
    NOUVELLE_PANNE: {
        title: '🚨 Nouvelle panne signalée',
        icon: '/assets/images/icons/alert.png',
        url: '/technicien/maintenances.html'
    },
    INTERVENTION_TERMINEE: {
        title: '✅ Panne résolue',
        icon: '/assets/images/icons/success.png',
        url: '/soignant/historique.html'
    },
    MAINTENANCE_PREVENTIVE: {
        title: '📅 Maintenance préventive',
        icon: '/assets/images/icons/calendar.png',
        url: '/technicien/preventive.html'
    },
    STOCK_FAIBLE: {
        title: '⚠️ Stock faible',
        icon: '/assets/images/icons/stock.png',
        url: '/technicien/stock.html'
    },
    ALERTE_CRITIQUE: {
        title: '🔴 Alerte critique',
        icon: '/assets/images/icons/critical.png',
        url: '/technicien/alertes.html'
    }
};

// Envoyer une notification selon le type
function sendNotificationByType(type, data = {}) {
    const config = NOTIFICATION_TYPES[type];
    if (!config) return;
    
    let body = '';
    switch(type) {
        case 'NOUVELLE_PANNE':
            body = `${data.equipementNom} - ${data.service} nécessite une intervention`;
            break;
        case 'INTERVENTION_TERMINEE':
            body = `L'équipement ${data.equipementNom} est à nouveau fonctionnel`;
            break;
        case 'MAINTENANCE_PREVENTIVE':
            body = `${data.equipementNom} - Maintenance ${data.type} à réaliser`;
            break;
        case 'STOCK_FAIBLE':
            body = `La pièce ${data.pieceDesignation} n'a plus que ${data.quantite} unités`;
            break;
        case 'ALERTE_CRITIQUE':
            body = data.message || 'Une alerte nécessite votre attention immédiate';
            break;
        default:
            body = data.message || 'Nouvelle notification GMAO';
    }
    
    showLocalNotification(config.title, body, config.icon, config.url);
}

// Écouter les messages du service worker
function listenToServiceWorkerMessages() {
    navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'SHOW_NOTIFICATION') {
            showLocalNotification(data.title, data.body, data.icon, data.url);
        }
    });
}

// Initialiser les notifications
async function initNotifications() {
    if (!isNotificationSupported()) {
        console.log('Notifications non supportées par ce navigateur');
        return;
    }
    
    // Vérifier la permission
    if (Notification.permission === 'default') {
        // Demander après un délai
        setTimeout(() => {
            requestNotificationPermission();
        }, 5000);
    } else if (Notification.permission === 'granted') {
        registerPushSubscription();
    }
    
    listenToServiceWorkerMessages();
}

// Tester une notification (pour debug)
function testNotification() {
    showLocalNotification(
        'Test GMAO',
        'Les notifications fonctionnent correctement !',
        '/assets/images/icons/icon-192.png',
        '/'
    );
}

// Exporter
export {
    isNotificationSupported,
    requestNotificationPermission,
    showLocalNotification,
    sendNotificationByType,
    initNotifications,
    testNotification,
    NOTIFICATION_TYPES
};