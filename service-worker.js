const CACHE_NAME = 'davis-portfolio-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/global_style.css',
  '/js/main.js',
  '/js/translations.js',
  '/images/logo.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});