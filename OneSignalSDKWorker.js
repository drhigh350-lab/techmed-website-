// ============================================================
// TechMed combined service worker (OneSignal + offline page caching)
//
// Per OneSignal's own documentation on combining service workers
// (https://documentation.onesignal.com/docs/en/onesignal-service-worker):
// a browser can only have ONE service worker controlling a given scope
// (here, the site root "/"). This site previously had TWO separate
// files both trying to control "/" — OneSignalSDKWorker.js (for push)
// and sw.js (for offline caching) — so only one could ever actually be
// in control, and OneSignal's push subscriptions never completed.
//
// Fix: keep THIS file named OneSignalSDKWorker.js (OneSignal's SDK
// looks for this exact filename at the site root by default, so no
// OneSignal dashboard/config changes are needed) and pull the site's
// own caching logic into it via importScripts. DELETE the old
// stand-alone sw.js from the server once this is deployed — do not
// keep both.
//
// KNOWN CACHING CAVEAT (from OneSignal's GitHub issue trackers):
// browsers detect service worker updates by diffing the TOP-LEVEL
// script byte-for-byte. Because our caching logic now lives inside an
// importScripts()'d file rather than directly in the top-level file,
// simply editing techmed-sw-cache.js may not reliably trigger browsers
// to install the update. Whenever the cache list or logic changes,
// also bump CACHE_VERSION_TAG below (in THIS top-level file) so the
// byte-for-byte diff actually changes and browsers pick up the update.
// ============================================================

const CACHE_VERSION_TAG = 'v8-2026'; // bump this on every deploy that changes techmed-sw-cache.js

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
importScripts("/techmed-sw-cache.js");
