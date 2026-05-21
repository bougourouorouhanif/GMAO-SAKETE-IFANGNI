// Service Worker pour GMAO Sakété-Ifangni
// Version: 2.1.0
// Permet le mode hors ligne et l'installation sur mobile

const CACHE_NAME = 'gmao-cache-v2';
const OFFLINE_URL = '/offline.html';
const API_BASE_URL = 'https://gmao-sakete-ifangni-1.onrender.com/api';

// Fichiers statiques à mettre en cache (uniquement ceux qui existent réellement)
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/offline.html',
  
  // CSS principaux
  '/assets/css/style.css',
  '/assets/css/mobile.css',
  
  // JS principaux (correction URL)
  '/assets/js/api.js',
  '/assets/js/auth.js',
  '/assets/js/utils.js',
  
  // Images principales
  '/assets/images/logo.png',
  '/assets/images/FOND.png',
  
  // Icônes PWA
  '/assets/images/icons/icon-72.png',
  '/assets/images/icons/icon-96.png',
  '/assets/images/icons/icon-128.png',
  '/assets/images/icons/icon-144.png',
  '/assets/images/icons/icon-152.png',
  '/assets/images/icons/icon-192.png',
  '/assets/images/icons/icon-384.png',
  '/assets/images/icons/icon-512.png',
  
  // Manifest
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installation v2.1.0');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des fichiers statiques');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[SW] Erreur cache initial:', err);
        // On continue même si certains fichiers manquent
      })
  );
  
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Activation - Nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('[SW] Activation');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('gmao-cache')) {
            console.log('[SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Prendre le contrôle immédiat
  return self.clients.claim();
});

// Interception des requêtes réseau
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // === STRATÉGIES DE CACHE ===
  
  // 1. Requêtes API : stratégie "Network First"
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.href.includes(API_BASE_URL)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Mettre en cache les réponses GET réussies
          if (event.request.method === 'GET' && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Tentative de récupération depuis le cache
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Réponse d'erreur personnalisée
          return new Response(JSON.stringify({ 
            offline: true, 
            message: 'Mode hors ligne. Connexion requise.' 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  // 2. Fichiers statiques (HTML, CSS, JS, images) : stratégie "Cache First"
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Retourner depuis le cache
          return cachedResponse;
        }
        
        // Sinon, requête réseau
        return fetch(event.request)
          .then(response => {
            // Vérifier si la réponse est valide pour mise en cache
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Mettre en cache pour la prochaine fois
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            
            return response;
          })
          .catch(async () => {
            // Si requête HTML en échec, afficher page hors ligne
            const acceptHeader = event.request.headers.get('accept') || '';
            if (acceptHeader.includes('text/html')) {
              const offlinePage = await caches.match(OFFLINE_URL);
              if (offlinePage) return offlinePage;
            }
            
            // Sinon, retourner une réponse générique
            return new Response('Ressource non disponible hors ligne', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ==================== NOTIFICATIONS PUSH ====================

self.addEventListener('push', event => {
  console.log('[SW] Notification push reçue');
  
  let data = {
    title: 'GMAO Sakété',
    body: 'Nouvelle notification',
    icon: '/assets/images/icons/icon-192.png',
    badge: '/assets/images/icons/icon-72.png',
    tag: 'gmao-notification',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    url: '/',
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
      vibrate: data.vibrate,
      requireInteraction: data.requireInteraction,
      data: { url: data.url, ...data.data },
      actions: [
        { action: 'open', title: '🔍 Voir' },
        { action: 'close', title: '❌ Fermer' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[SW] Clic sur notification', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Vérifier si une fenêtre est déjà ouverte sur cette URL
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

// ==================== SYNCHRONISATION ARRIÈRE-PLAN ====================

self.addEventListener('sync', event => {
  console.log('[SW] Synchronisation demandée:', event.tag);
  
  if (event.tag === 'sync-signalements') {
    event.waitUntil(syncPendingReports());
  }
});

async function syncPendingReports() {
  console.log('[SW] Synchronisation des signalements en attente');
  
  try {
    // Récupérer les signalements en attente depuis IndexedDB ou localStorage
    const pendingReports = await getPendingReports();
    
    for (const report of pendingReports) {
      try {
        const response = await fetch(`${API_BASE_URL}/maintenances/signaler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${report.token}`
          },
          body: JSON.stringify(report.data)
        });
        
        if (response.ok) {
          await removePendingReport(report.id);
          console.log('[SW] Signalement synchronisé:', report.id);
        }
      } catch (err) {
        console.error('[SW] Erreur sync signalement:', err);
      }
    }
  } catch (error) {
    console.error('[SW] Erreur synchronisation:', error);
  }
}

// Helper: Récupérer les signalements en attente
async function getPendingReports() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/pending-reports');
    if (response) {
      return await response.json();
    }
  } catch (e) {}
  return [];
}

async function removePendingReport(id) {
  const reports = await getPendingReports();
  const filtered = reports.filter(r => r.id !== id);
  const cache = await caches.open(CACHE_NAME);
  await cache.put('/pending-reports', new Response(JSON.stringify(filtered)));
}

// ==================== MESSAGES DEPUIS LA PAGE ====================

self.addEventListener('message', event => {
  console.log('[SW] Message reçu:', event.data.type);
  
  switch (event.data.type) {
    case 'CACHE_TOKEN':
      // Stocker le token pour les futures synchronisations
      caches.open(CACHE_NAME).then(cache => {
        cache.put('/token-cache', new Response(JSON.stringify({ 
          token: event.data.token,
          expiry: Date.now() + 7 * 24 * 60 * 60 * 1000
        })));
      });
      break;
      
    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache effacé');
      });
      break;
      
    case 'PENDING_REPORT':
      // Ajouter un signalement en attente
      getPendingReports().then(reports => {
        reports.push({
          id: Date.now(),
          data: event.data.report,
          token: event.data.token
        });
        caches.open(CACHE_NAME).then(cache => {
          cache.put('/pending-reports', new Response(JSON.stringify(reports)));
        });
      });
      break;
      
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    default:
      console.log('[SW] Message inconnu:', event.data.type);
  }
});

// ==================== SYNCHRONISATION PÉRIODIQUE ====================

if ('periodicsync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-data') {
      event.waitUntil(updateBackgroundData());
    }
  });
}

async function updateBackgroundData() {
  console.log('[SW] Mise à jour données en arrière-plan');
  
  try {
    // Récupérer le token depuis le cache
    const cache = await caches.open(CACHE_NAME);
    const tokenResponse = await cache.match('/token-cache');
    
    if (tokenResponse) {
      const { token } = await tokenResponse.json();
      
      if (token) {
        // Tenter de mettre à jour les données dashboard
        const response = await fetch(`${API_BASE_URL}/dashboard/technicien`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          await cache.put('/dashboard-cache', new Response(JSON.stringify(data)));
          console.log('[SW] Dashboard mis à jour');
        }
      }
    }
  } catch (error) {
    console.error('[SW] Erreur mise à jour:', error);
  }
}

// ==================== GESTION DES ERREURS ====================

self.addEventListener('error', event => {
  console.error('[SW] Erreur:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Promise non gérée:', event.reason);
});
