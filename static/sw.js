const CACHE_NAME = 'qu-portal-v3';
const ASSETS_TO_CACHE = [
  // Arabic is the default locale (served at /), English at /en/.
  '/',
  '/en/',
  '/manifest.webmanifest',
  '/en/manifest.webmanifest',
  '/images/logo.png',
  '/images/logo.webp'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
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
    }).then(() => self.clients.claim()) // Take control immediately
  );
});
self.addEventListener('fetch', (event) => {
  // Navigation requests (HTML pages) - Network First, then Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the network response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Fall back to a cached copy; if that misses, fall back to the
          // language-specific shell so an English visitor never gets the
          // Arabic root and vice-versa.
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          if (cached) {
            return cached;
          }
          const url = new URL(event.request.url);
          // Arabic (default locale) is served at /; English at /en/. See
          // CR-02 in REVIEW.md.
          const langPrefix = url.pathname.startsWith('/en/') ? '/en/' : '/';
          const shell = await cache.match(langPrefix);
          if (shell) {
            return shell;
          }
          // Last resort: synthesise a minimal offline response so respondWith
          // never rejects (which would surface a worse error than the
          // browser's default network-error page).
          return new Response('', { status: 504, statusText: 'Offline' });
        })
    );
  } else {
    // Static assets - Cache First, then Network
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
  }
});
