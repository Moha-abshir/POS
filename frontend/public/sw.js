const CACHE_NAME = 'smartpos-runtime-v3';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (e.request.url.includes('/ws') || e.request.url.includes('socket') || e.request.url.includes('@vite') || e.request.url.includes('hot-update')) {
    return;
  }

  e.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(e.request)
        .then((response) => {
          if (response.status === 200) {
            cache.put(e.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          return cache.match(e.request);
        });
    })
  );
});
