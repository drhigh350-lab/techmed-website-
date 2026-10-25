// TECHMED Study Reader & Bookshelf Service Worker (Offline PWA)
// Enables persistent offline reading for authorized assets on mobile and desktop devices.

const STATIC_CACHE = 'techmed-static-v3';
const READER_CACHE = 'techmed-reader-v3';

// Explicit Public Precache Allowlist (FREE & PUBLIC SHELL ASSETS ONLY)
// Note: Never precache paid booster systems anonymously to protect premium study materials.
const PRECACHE_URLS = [
  '/',
  '/library',
  '/resources',
  '/manifest.json',
  '/favicon.png',
  '/library/read/admission-intelligence-guide-2026',
];

// Sensitive Routes & Endpoints that must NEVER be cached by the service worker
function isRestrictedEndpoint(url) {
  const path = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();

  // Administrative portals & operations
  if (path.startsWith('/library/admin') || path.startsWith('/admin')) return true;

  // Authentication & session exchange
  if (path.includes('/auth/') || path.includes('/oauth/')) return true;

  // Payment webhooks & callback handlers
  if (path.startsWith('/payment/callback') || path.includes('/pay-initiate') || path.includes('/pay-verify')) return true;

  // Supabase REST, RPC, Auth, and Functions endpoints
  if (path.includes('/rest/v1') || path.includes('/auth/v1') || path.includes('/functions/v1')) return true;

  // URLs containing sensitive tokens or credentials in query parameters
  if (
    search.includes('access_token=') ||
    search.includes('refresh_token=') ||
    search.includes('token=') ||
    search.includes('code=')
  ) {
    return true;
  }

  return false;
}

// Install: Precache public shell & authorized free learning assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn('[SW] Skipped precaching url:', url, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== READER_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy:
// 1. Never intercept restricted endpoints (admin, auth, payments, Supabase APIs).
// 2. Navigation / Reader requests: Network-first with fallback to cached copy.
// 3. Static public assets: Cache-first with network fallback.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests or external API calls (e.g. Supabase, Paystack, Google Analytics)
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Block caching on restricted/sensitive endpoints
  if (isRestrictedEndpoint(url)) {
    return; // Pass through to network directly without caching
  }

  const isReaderRoute = url.pathname.startsWith('/library/read') || url.pathname.startsWith('/read');
  const isNavigation = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');

  if (isReaderRoute || isNavigation) {
    // Network-First with background cache update for authorized responses
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          // Only cache successful 200 responses for non-restricted routes
          if (networkRes && networkRes.status === 200 && !isRestrictedEndpoint(url)) {
            const clone = networkRes.clone();
            const targetCache = isReaderRoute ? READER_CACHE : STATIC_CACHE;
            caches.open(targetCache).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(async () => {
          // Network failed: Try reader cache then static cache
          const cachedReader = await caches.match(req);
          if (cachedReader) return cachedReader;

          // If navigation to library, return cached library shell
          if (isNavigation) {
            const cachedLib = await caches.match('/library');
            if (cachedLib) return cachedLib;
          }

          return new Response(
            `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline — TECHMED</title><style>body{background:#030d17;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;}a{color:#eab308;}</style></head><body><div><h2>You are offline</h2><p>You can read any previously saved study manuals from your <a href="/library">Bookshelf</a>.</p></div></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Cache-First for static assets (images, css, js)
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      if (cachedRes) return cachedRes;

      return fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200 && !isRestrictedEndpoint(url)) {
          const clone = networkRes.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      });
    })
  );
});

// Explicit Message Handling:
// - 'cache-manual': Download and verify offline storage
// - 'clear-user-cache': Purge protected user-specific reader caches on sign out
self.addEventListener('message', (event) => {
  if (event.data?.action === 'clear-user-cache') {
    event.waitUntil(
      caches.delete(READER_CACHE).then(() => caches.open(READER_CACHE))
    );
  } else if (event.data?.action === 'cache-manual') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(READER_CACHE).then((cache) => {
        return Promise.all(
          urls.map((u) => {
            const parsed = new URL(u, self.location.origin);
            if (isRestrictedEndpoint(parsed)) return Promise.resolve();
            return fetch(u).then((res) => {
              if (res.ok) return cache.put(u, res);
            }).catch((err) => console.warn('[SW] Offline manual caching error:', u, err));
          })
        );
      }).then(() => {
        event.source?.postMessage({ status: 'cached-complete' });
      })
    );
  }
});
