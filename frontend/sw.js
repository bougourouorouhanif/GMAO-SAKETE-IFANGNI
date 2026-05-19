// Service Worker pour GMAO Sakété-Ifangni
// Version: 2.0.0
// Permet le mode hors ligne et l'installation sur mobile

const CACHE_NAME = 'gmao-cache-v2';
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/offline.html',
  
  // CSS
  '/assets/css/style.css',
  '/assets/css/mobile.css',
  '/assets/css/admin.css',
  
  // JS
  '/assets/jshttps://gmao-sakete-ifangni-1.onrender.com/api.js',
  '/assets/js/auth.js',
  '/assets/js/utils.js',
  
  // Images
  '/assets/images/logo.png',
  '/assets/images/background-login.jpg',
  '/assets/images/icons/icon-72.png',
  '/assets/images/icons/icon-96.png',
  '/assets/images/icons/icon-128.png',
  '/assets/images/icons/icon-144.png',
  '/assets/images/icons/icon-152.png',
  '/assets/images/icons/icon-192.png',
  '/assets/images/icons/icon-384.png',
  '/assets/images/icons/icon-512.png',
  
  // Pages technicien
  '/technicien/index.html',
  '/technicien/dashboard.html',
  '/technicien/inventaire.html',
  '/technicien/equipement-detail.html',
  '/technicien/equipement-form.html',
  '/technicien/maintenances.html',
  '/technicien/intervention-form.html',
  '/technicien/preventive.html',
  '/technicien/diagnostic-bot.html',
  '/technicien/stock.html',
  '/technicien/piece-form.html',
  '/technicien/utilisateurs.html',
  '/technicien/planning-garde.html',
  '/technicien/codir-rapports.html',
  '/technicien/parametres.html',
  '/technicien/profil.html',
  '/technicien/fournisseurs.html',
  '/technicien/contrats.html',
  '/technicien/alertes.html',
  '/technicien/documents.html',
  
  // Pages soignant
  '/soignant/index.html',
  '/soignant/dashboard.html',
  '/soignant/signaler-panne.html',
  '/soignant/scanner.html',
  '/soignant/historique.html',
  '/soignant/profil.html',
  
  // Pages mobile
  '/mobile/index.html',
  '/mobile/intervention.html',
  '/mobile/equipement.html',
  '/mobile/diagnostic.html'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Installation');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Mise en cache des fichiers');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[Service Worker] Erreur cache:', err);
      })
  );
  
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Activation - Nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activation');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendre le contrôle des clients
  return self.clients.claim();
});

// Interception des requêtes réseau
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Ignorer les requêtes API (ne pas cacher)
  if (requestUrl.pathname.startsWith('https://gmao-sakete-ifangni-1.onrender.com/api/')) {
    // Stratégie: réseau d'abord pour les API
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Mettre en cache les réponses API GET
          if (event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // En cas d'échec, retourner une réponse d'erreur
          return new Response(JSON.stringify({ 
            offline: true, 
            message: 'Mode hors ligne. Impossible de contacter le serveur.' 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // Pour les requêtes statiques: stratégie cache d'abord
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Retourner le cache si disponible
          return response;
        }
        
        // Sinon, faire la requête réseau
        return fetch(event.request)
          .then(response => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cloner et mettre en cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(() => {
            // Si hors ligne et pas de cache, retourner la page offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', event => {
  console.log('[Service Worker] Notification push reçue', event);
  
  let data = {
    title: 'GMAO Sakété',
    body: 'Une nouvelle notification',
    icon: '/assets/images/icons/icon-192.png',
    badge: '/assets/images/icons/icon-72.png',
    tag: 'gmao-notification',
    data: {}
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      data: data.data,
      actions: [
        { action: 'open', title: 'Voir' },
        { action: 'close', title: 'Fermer' }
      ]
    })
  );
});

// Gestion du clic sur les notifications
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Clic sur notification', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Si une fenêtre est déjà ouverte, l'utiliser
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Synchronisation en arrière-plan
self.addEventListener('sync', event => {
  console.log('[Service Worker] Synchronisation', event.tag);
  
  if (event.tag === 'sync-interventions') {
    event.waitUntil(syncInterventions());
  }
});

// Fonction de synchronisation des interventions hors ligne
async function syncInterventions() {
  console.log('[Service Worker] Synchronisation des interventions');
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingRequests = await cache.keys();
    
    for (const request of pendingRequests) {
      if (request.url.includes('https://gmao-sakete-ifangni-1.onrender.com/api/maintenances/signaler') && 
          request.method === 'POST') {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[Service Worker] Requête synchronisée:', request.url);
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Erreur synchronisation:', error);
  }
}

// Mise à jour périodique en arrière-plan (si supporté)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-data') {
    event.waitUntil(updateBackgroundData());
  }
});

async function updateBackgroundData() {
  console.log('[Service Worker] Mise à jour données en arrière-plan');
  
  try {
    const token = await getTokenFromCache();
    if (token) {
      const response = await fetch('https://gmao-sakete-ifangni-1.onrender.com/api/dashboard/technicien', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const cache = await caches.open(CACHE_NAME);
        await cache.put('https://gmao-sakete-ifangni-1.onrender.com/api/dashboard/technicien', new Response(JSON.stringify(data)));
      }
    }
  } catch (error) {
    console.error('[Service Worker] Erreur mise à jour:', error);
  }
}

async function getTokenFromCache() {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match('/token-cache');
  if (response) {
    const data = await response.json();
    return data.token;
  }
  return null;
}

// Gestion des erreurs de réseau
self.addEventListener('fetcherror', event => {
  console.log('[Service Worker] Erreur réseau', event);
});

// Message depuis la page principale
self.addEventListener('message', event => {
  console.log('[Service Worker] Message reçu', event.data);
  
  if (event.data.type === 'CACHE_TOKEN') {
    const token = event.data.token;
    caches.open(CACHE_NAME).then(cache => {
      cache.put('/token-cache', new Response(JSON.stringify({ token })));
    });
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});