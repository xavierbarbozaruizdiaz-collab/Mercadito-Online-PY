// ============================================
// MERCADITO ONLINE PY - SERVICE WORKER
// Service Worker para PWA y caching offline
// ============================================

const CACHE_NAME = 'mercadito-online-py-v1';
const STATIC_CACHE_NAME = 'mercadito-static-v1';
const DYNAMIC_CACHE_NAME = 'mercadito-dynamic-v1';

// Archivos estáticos para cache
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Rutas que siempre deben ir a la red
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/auth/',
  '/dashboard/',
  '/admin/',
];

// Rutas que pueden usar cache primero
const CACHE_FIRST_ROUTES = [
  '/products/',
  '/stores/',
  '/search',
];

// ============================================
// INSTALACIÓN DEL SERVICE WORKER
// ============================================

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// ============================================
// ACTIVACIÓN DEL SERVICE WORKER
// ============================================

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// ============================================
// INTERCEPTAR REQUESTS
// ============================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo interceptar requests HTTP/HTTPS
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // Estrategia basada en la ruta
  if (isNetworkFirstRoute(url.pathname)) {
    event.respondWith(networkFirstStrategy(request));
  } else if (isCacheFirstRoute(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// ============================================
// ESTRATEGIAS DE CACHE
// ============================================

// Network First: Para datos dinámicos
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si es una página HTML, mostrar página offline
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

// Cache First: Para recursos estáticos
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    throw error;
  }
}

// Stale While Revalidate: Para contenido mixto
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Si falla la red, devolver cache si existe
    return cachedResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function isNetworkFirstRoute(pathname) {
  return NETWORK_FIRST_ROUTES.some(route => pathname.startsWith(route));
}

function isCacheFirstRoute(pathname) {
  return CACHE_FIRST_ROUTES.some(route => pathname.startsWith(route));
}

// ============================================
// MANEJO DE MENSAJES
// ============================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(DYNAMIC_CACHE_NAME)
          .then(cache => cache.addAll(payload.urls))
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys()
          .then(cacheNames => 
            Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            )
          )
      );
      break;
      
    default:
      console.log('Service Worker: Unknown message type', type);
  }
});

// ============================================
// MANEJO DE NOTIFICACIONES PUSH
// ============================================

self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Mercadito Online PY',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: '/icons/checkmark.png',
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/xmark.png',
      },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification('Mercadito Online PY', options)
  );
});

// ============================================
// MANEJO DE CLICKS EN NOTIFICACIONES
// ============================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Solo cerrar la notificación
    return;
  } else {
    // Clic en la notificación
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// ============================================
// MANEJO DE SINCRONIZACIÓN EN BACKGROUND
// ============================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sincronizar datos pendientes
    console.log('Service Worker: Background sync');
    
    // Aquí puedes implementar lógica para sincronizar datos
    // que se guardaron offline cuando vuelva la conexión
    
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}
