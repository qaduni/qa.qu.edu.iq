const CACHE_NAME = 'qu-portal-v5';
const ASSETS_TO_CACHE = [
  '/ar/',
  '/en/',
  '/ar/manifest.webmanifest',
  '/en/manifest.webmanifest',
  '/images/logo.webp',
  '/ar/media/news/',
  '/ar/media/announcements/',
  '/en/media/news/',
  '/en/media/announcements/'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Only process HTTP/HTTPS GET requests (Ignores POST, PUT, DELETE, extension schemas)
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. Bypass Service Worker entirely for dynamic API endpoints (e.g., Umami stats)
  if (url.pathname.includes('/api/')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          if (cached) {
            return cached;
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        })
    );
  } else {
    // Static assets - Cache First, then Network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Only cache valid local/same-origin GET responses (HTTP 200)
          if (networkResponse.ok && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});