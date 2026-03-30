const CACHE_NAME = 'davis-portfolio-v2';
const ASSETS = [
  './',
  './index.html',
  './css/global_style.css',
  './js/main.js',
  './js/translations.js',
  './images/logo.webp',
  './images/baners.webp',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&family=Space+Grotesk:wght@400;700;900&display=swap'
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