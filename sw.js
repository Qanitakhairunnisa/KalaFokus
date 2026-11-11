/**
 * KALAFOKUS — Service Worker (Progressive Web App)
 * Menyediakan caching aset inti agar ruang kerja kognitif tetap dapat diakses
 * secara instan dan mendukung pemicu instalasi "Add to Home Screen".
 */

const CACHE_NAME = 'kalafokus-editorial-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/custom.css',
  './assets/js/app.js',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Jangan cache request API backend atau panggilan eksternal Gemini API
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('generativelanguage.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
