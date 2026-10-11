// Odry Studio Service Worker — Purges legacy caches and ensures fresh network delivery
const CACHE_NAME = 'odry-studio-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((windowClients) => {
          windowClients.forEach((client) => {
            if ('navigate' in client) {
              client.navigate(client.url).catch(() => {});
            }
          });
        })
      )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  // Always use network-first for Odry Studio
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
