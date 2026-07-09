// ============================================================
// TechMed offline page caching logic.
// This file is loaded via importScripts() from OneSignalSDKWorker.js —
// it is NOT registered directly and does not need its own
// navigator.serviceWorker.register() call anywhere.
//
// IMPORTANT: because this file is imported (not the top-level worker
// script), browsers may not detect changes here on their own. Whenever
// you edit the cache list or logic below, also bump CACHE_VERSION_TAG
// in OneSignalSDKWorker.js so browsers reliably pick up the update.
// ============================================================

const CACHE_NAME = 'techmed-v8-2026';
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

// Cleans up old cache versions on activation so a bumped CACHE_NAME
// doesn't leave stale caches around forever.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
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
