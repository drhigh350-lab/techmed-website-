// TECHMED service worker — makes the library and reader open without data.
//
// What it caches (all public, non-personal files):
//   - pages: network-first, falling back to the last copy (so /resources and
//     /library/read/<book> open offline after being visited once)
//   - build assets (/_astro/*, /pdfjs/*, fonts, images): cache-first
// What it NEVER caches: Supabase APIs/functions (the books themselves are
// stored encrypted in IndexedDB by the reader, not here), auth, payments,
// admin pages, or URLs carrying tokens.

const VERSION = 'v4';
const STATIC_CACHE = `techmed-static-${VERSION}`;
const PAGES_CACHE = `techmed-pages-${VERSION}`;

const PRECACHE_URLS = ['/resources/', '/manifest.json', '/favicon.png', '/pdfjs/pdf.worker.min.mjs', '/images/logo.png'];

function isRestricted(url) {
  const path = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();
  if (path.startsWith('/library/admin') || path.startsWith('/admin')) return true;
  if (path.includes('/auth/') || path.includes('/oauth/')) return true;
  if (path.startsWith('/payment/') || path.startsWith('/login') || path.startsWith('/account')) return true;
  if (path.includes('/rest/v1') || path.includes('/auth/v1') || path.includes('/functions/v1') || path.includes('/storage/v1')) return true;
  if (/(access_token|refresh_token|token|code)=/.test(search)) return true;
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.all(PRECACHE_URLS.map((u) => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function offlinePage() {
  return new Response(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — TECHMED</title>' +
      '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#012748;color:#f8f9fa;font-family:system-ui,sans-serif;text-align:center;padding:24px}a{color:#c9a227;font-weight:700}</style></head>' +
      '<body><div><h2>You are offline</h2><p>Books you saved on this phone are in <a href="/resources/#my-library">My Library</a>.</p></div></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;
  if (sameOrigin && isRestricted(url)) return;

  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => {
          const path = url.pathname;
          const alt = path.endsWith('/') ? path.slice(0, -1) : `${path}/`;
          return (
            (await caches.match(path, { ignoreSearch: true })) ||
            (await caches.match(alt, { ignoreSearch: true })) ||
            (path.startsWith('/library') || path.startsWith('/resources') ? await caches.match('/resources/') : null) ||
            offlinePage()
          );
        }),
    );
    return;
  }

  // Build assets, images, fonts, pdf.js worker: cache-first.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// Store a page AND every script/style it needs, so it opens offline even if
// the student has never visited it while this worker was active.
async function cachePageWithAssets(pagePath) {
  const url = new URL(pagePath, self.location.origin);
  if (url.origin !== self.location.origin || isRestricted(url)) return;
  const res = await fetch(url.pathname, { credentials: 'same-origin' });
  if (!res.ok) return;
  const html = await res.clone().text();
  const pages = await caches.open(PAGES_CACHE);
  await pages.put(url.pathname, res);

  const statics = await caches.open(STATIC_CACHE);
  const seen = new Set();
  const queue = [];
  const add = (u) => {
    try {
      const abs = new URL(u, self.location.origin);
      if (abs.origin !== self.location.origin) return;
      if (!/^\/(_astro|pdfjs|images)\//.test(abs.pathname)) return;
      if (!seen.has(abs.pathname)) {
        seen.add(abs.pathname);
        queue.push(abs.pathname);
      }
    } catch (e) {}
  };
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) add(m[1]);
  while (queue.length) {
    const path = queue.shift();
    let r = await caches.match(path);
    if (!r) {
      r = await fetch(path).catch(() => null);
      if (!r || !r.ok) continue;
      await statics.put(path, r.clone());
    }
    if (path.endsWith('.js')) {
      const js = await r.text();
      // ES module imports between build chunks, e.g. from"./supabase.abc123.js"
      for (const m of js.matchAll(/["'](\.{1,2}\/[^"']+?\.(?:js|css|mjs))["']/g)) add(new URL(m[1], self.location.origin + path).pathname);
      for (const m of js.matchAll(/["'](\/_astro\/[^"']+?\.(?:js|css))["']/g)) add(m[1]);
    }
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.action === 'cache-pages' && Array.isArray(data.paths)) {
    event.waitUntil(
      Promise.all(data.paths.slice(0, 10).map((p) => cachePageWithAssets(p).catch(() => {}))).then(() => {
        if (event.source) event.source.postMessage({ action: 'cache-pages-done' });
      }),
    );
  }
  // Signing out clears cached pages (books live in IndexedDB and are cleared by the app).
  if (data.action === 'clear-user-cache') {
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
});
