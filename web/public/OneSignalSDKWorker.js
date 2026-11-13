// One service worker for the whole site: OneSignal push + TECHMED offline reader.
// OneSignal ("Typical site" setup) registers this file at scope "/", and the
// site registers the same file, so the two never replace each other.
// If OneSignal's script can't load, the offline reader still works.
try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
} catch (err) {
  console.warn('[sw] push code unavailable', err);
}
importScripts('/sw.js');
