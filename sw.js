// Service Worker for AutoPulse OBD2 PWA
// Incremente CACHE_NAME a cada release para descartar caches antigos.
const CACHE_NAME = 'autopulse-obd2-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.json',
  './icon.svg',
  './js/app.js',
  './js/trip.js',
  './js/obd/elm327.js',
  './js/obd/pids.js',
  './js/obd/dtc-db.js',
  './js/obd/simulator.js',
  './js/obd/transports/ble.js',
  './js/obd/transports/serial.js',
  './js/obd/transports/websocket.js',
  './js/obd/transports/http-bridge.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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
  self.clients.claim();
});

// Estratégia "rede primeiro, cache como reserva": com o servidor local no ar o app sempre
// carrega o código mais recente; sem rede (offline) usa a cópia em cache.
self.addEventListener('fetch', (event) => {
  // Requisições de API e não-GET vão direto para a rede, sem cache
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
