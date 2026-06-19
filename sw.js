const CACHE_NAME = 'senas-letras-v9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './assets/icon.png',
  // Cache all sign images
  './assets/signs/A.png',
  './assets/signs/B.png',
  './assets/signs/C.png',
  './assets/signs/D.png',
  './assets/signs/E.png',
  './assets/signs/F.png',
  './assets/signs/G.png',
  './assets/signs/H.png',
  './assets/signs/I.png',
  './assets/signs/J.png',
  './assets/signs/K.png',
  './assets/signs/L.png',
  './assets/signs/M.png',
  './assets/signs/N.png',
  './assets/signs/Ñ.png',
  './assets/signs/O.png',
  './assets/signs/P.png',
  './assets/signs/Q.png',
  './assets/signs/R.png',
  './assets/signs/S.png',
  './assets/signs/T.png',
  './assets/signs/U.png',
  './assets/signs/V.png',
  './assets/signs/W.png',
  './assets/signs/X.png',
  './assets/signs/Y.png',
  './assets/signs/Z.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
