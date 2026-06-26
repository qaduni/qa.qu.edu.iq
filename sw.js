// Bumped from v3 → v4 to invalidate every visitor's stale cache. The v3
// build pre-dated /media/news/ and /media/announcements/ (both languages),
// so installed clients had a cache that knew /en/ as the only English page
// and the SW's fallback returned that home shell whenever a request to a
// section page failed for any reason — making nav links look like they
// redirected to the home page. v4 ships the new section shells and removes
// the home-shell fallback (see fetch handler below).
const CACHE_NAME = 'qu-portal-v4';
const ASSETS_TO_CACHE = [
  // Arabic is the default locale (served at /), English at /en/.
  '/',
  '/en/',
  '/manifest.webmanifest',
  '/en/manifest.webmanifest',
  '/images/logo.png',
  '/images/logo.webp',
  // Section shells — pre-cached so offline navigation lands on the right
  // section page instead of bouncing to the language home.
  '/media/news/',
  '/media/announcements/',
  '/en/media/news/',
  '/en/media/announcements/'
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
          // Fall back to a cached copy of the EXACT URL only. Earlier
          // versions also fell back to the language-specific home shell
          // (/ or /en/) when no exact match was cached — that "helpful"
          // fallback made every flaky-network click look like a redirect
          // to the home page, which is worse than an honest offline
          // response. Section shells we *want* available offline live in
          // ASSETS_TO_CACHE above, so they'll match here on first hit.
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          if (cached) {
            return cached;
          }
          // No exact-URL cache hit — return a minimal offline response so
          // respondWith never rejects (which would surface a worse error
          // than the browser's default network-error page).
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
