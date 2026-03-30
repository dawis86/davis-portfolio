const CACHE_NAME = 'davis-portfolio-v5';
const ASSETS = [
  './',
  './index.html',
  './header.html',
  './footer.html',
  './css/global_style.css',
  './js/main.js',
  './js/translations.js',
  './images/logo.webp',
  './images/baners.webp'
];

// Instalācija un kešatmiņas izveide
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: [Install] Start caching assets');
      // Using individual add calls to pinpoint 404 failures (Izmantojam individuālus add izsaukumus, lai atrastu 404)
      return Promise.all(
        ASSETS.map(url => cache.add(url).catch(err => console.error(`PWA: Failed to cache ${url}:`, err)))
      );
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
  // 1. FILTRS: Ignorējam pieprasījumus, kas nav HTTP vai HTTPS (piemēram, chrome-extension)
  if (!e.request.url.startsWith('http')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((res) => {
      // Atgriežam kešoto versiju, ja tāda ir
      if (res) return res;

      // Ja nav kešā, veicam tīkla pieprasījumu
      return fetch(e.request).then((response) => {
        // Pārbaudām, vai atbilde ir derīga kešošanai
        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
          return response;
        }

        // Dinamiski kešojam jaunus resursus (piemēram, Google Fonts)
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return response;
      });
    }).catch(() => {
      // Šeit varētu atgriezt 'offline.html', ja tīkls nav pieejams un resursa nav kešā
    })
  );
});