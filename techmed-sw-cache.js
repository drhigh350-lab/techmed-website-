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

const CACHE_NAME = 'techmed-v11-2026';
const urlsToCache = [
  '/',
  '/index.html',
  '/predictor.html',
  '/resources.html',
  '/about.html',
  '/intelligence.html',
  '/testimonials.html',
  '/download.html',
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

// Cache each URL independently so one missing/renamed file (e.g. a page
// that gets renamed or removed) can't silently break the entire install,
// which is what happened when /materials.html and /cutoffs.html stopped
// existing but were still in this list — cache.addAll() fails ALL-or-
// NOTHING, so a single 404 here used to leave the whole cache empty/stale.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        urlsToCache.map(url =>
          cache.add(url).catch(err =>
            console.warn('[SW] Skipped caching (not found or failed):', url, err)
          )
        )
      )
    )
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

// Network-first for page navigations (HTML) so visitors always get the
// live version of a page — falling back to cache only if the network
// request fails (e.g. actually offline). This is what prevents a renamed
// or updated page from silently serving a stale cached copy, which is
// the bug that caused predictor.html to fail when reached via an in-app
// link (the browser was serving a broken/stale cached navigation).
//
// Cache-first for everything else (images, CSS, JS) since those assets
// change rarely and benefit from instant offline-style loading.
self.addEventListener('fetch', event => {
  const isNavigation =
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' &&
      event.request.headers.get('accept')?.includes('text/html'));

  if (isNavigation || event.request.url.includes('/images/foundation-protocol/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request);
    })
  );
});
