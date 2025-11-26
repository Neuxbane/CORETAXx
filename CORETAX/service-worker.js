const CACHE_NAME = 'coretax-cache-v1';
const ASSETS = [
  './',
  './index.xhtml',
  './manifest.webmanifest',
  './scripts/security.js',
  './scripts/syncService.js',
  './scripts/storage.js',
  './scripts/geolocation.js',
  './scripts/taxCalculation.js',
  './scripts/taxSync.js',
  './scripts/utils.js',
  './scripts/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('./index.xhtml');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
