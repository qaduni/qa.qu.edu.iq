const CACHE_NAME = 'qu-portal-v6';
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

  // 1. Only process GET requests over HTTP/HTTPS
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. IMPORTANT: Bypass SW for cross-origin requests (e.g. external Pagefind domains)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Bypass SW for dynamic API endpoints
  if (url.pathname.includes('/api/')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
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
          return new Response('Offline', { status: 504, statusText: 'Offline' });
        })
    );
  } else {
    // Static assets - Cache First, then Network
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok && networkResponse.type === 'basic') {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            // Catch network errors during local development or offline states
            console.warn('SW fetch failed for:', event.request.url, err);
            return new Response('', { status: 408, statusText: 'Request Timed Out' });
          });
      })
    );
  }
});