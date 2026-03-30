const CACHE_NAME = 'davis-portfolio-v3';
const ASSETS = [
  '/davis-portfolio/',
  '/davis-portfolio/index.html',
  '/davis-portfolio/css/global_style.css',
  '/davis-portfolio/js/main.js',
  '/davis-portfolio/js/translations.js',
  '/davis-portfolio/images/logo.webp',
  '/davis-portfolio/images/baners.webp',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&family=Space+Grotesk:wght@400;700;900&display=swap'
];

// Instalācija un kešatmiņas izveide
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Caching assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Veco kešatmiņu tīrīšana (SVARĪGI, lai redzētu izmaiņas)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Pieprasījumu pārtveršana
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});