// TECHMED push notifications (OneSignal web push, "Techmed app").
// Browser-only. The SDK loads on demand (dashboard), never on every page.
// /OneSignalSDKWorker.js is the site's single service worker: it loads
// OneSignal's push code and the offline reader (/sw.js) together.
export const ONESIGNAL_APP_ID = '25f06ed1-29ab-4da8-871a-2fb9f0aa35b5';

type OS = any;
let ready: Promise<OS | null> | null = null;

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function loadOneSignal(): Promise<OS | null> {
  if (!pushSupported()) return Promise.resolve(null);
  if (ready) return ready;
  ready = new Promise((resolve) => {
    const w = window as any;
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push(async (OneSignal: OS) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          serviceWorkerPath: 'OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButton: { enable: false },
          promptOptions: { slidedown: { prompts: [] } },
        });
        resolve(OneSignal);
      } catch (err) {
        console.warn('[push] init failed', err);
        resolve(null);
      }
    });
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.defer = true;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return ready;
}

/** Link this browser to the student and tag their plan so announcements can target it. */
export async function linkPushUser(userId: string, plan: string, firstName?: string): Promise<void> {
  const OneSignal = await loadOneSignal();
  if (!OneSignal) return;
  try {
    await OneSignal.login(userId);
    const tags: Record<string, string> = { plan };
    if (firstName) tags.first_name = firstName;
    await OneSignal.User.addTags(tags);
  } catch (err) {
    console.warn('[push] link failed', err);
  }
}

export async function isPushOn(): Promise<boolean> {
  const OneSignal = await loadOneSignal();
  return !!OneSignal?.User?.PushSubscription?.optedIn;
}

/** Ask the browser for permission (must be called from a tap). */
export async function turnOnPush(): Promise<boolean> {
  const OneSignal = await loadOneSignal();
  if (!OneSignal) return false;
  try {
    if (Notification.permission === 'denied') return false;
    await OneSignal.Notifications.requestPermission();
    await OneSignal.User.PushSubscription.optIn();
    return !!OneSignal.User.PushSubscription.optedIn;
  } catch {
    return false;
  }
}

/** Unlink this phone from the student on sign-out (shared phones get no wrong alerts). Never blocks sign-out for more than 3s. */
export async function pushLogout(): Promise<void> {
  if (!pushSupported()) return;
  const done = (async () => {
    const OneSignal = await loadOneSignal();
    await OneSignal?.logout?.();
  })().catch(() => {});
  await Promise.race([done, new Promise((r) => setTimeout(r, 3000))]);
}
