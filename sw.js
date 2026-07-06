const CACHE_NAME = 'techmed-v7-2026';
const urlsToCache = [
  '/',
  '/index.html',
  '/predictor.html',
  '/cutoffs.html',
  '/materials.html',
  '/about.html',
  '/testimonials.html',
  '/manifest.json',
  '/css/style.css',
  '/js/engine.js',
  '/images/logo.png',
  '/images/logo-light.jpg',
  '/images/quiz-cover.png',
  '/images/197363.jpg',
  '/images/200263.png',
  '/images/200303.png',
  '/images/200306.png',
  '/images/201319.jpg',
  '/images/202735.jpg',
  '/images/202733.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});
