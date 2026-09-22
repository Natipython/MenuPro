const CACHE_NAME = 'menuapp-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  // SvelteKit generates assets with hashes, so in a real app we'd use Vite PWA plugin to inject them here.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // Offline fallback
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});
