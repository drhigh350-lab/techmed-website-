// TECHMED offline bookshelf.
//
// A purchased e-book is saved ONCE on the student's device so they never
// spend data on it again. It lives inside the website's own storage
// (IndexedDB), not in Downloads, and survives closing the browser and
// restarting the phone. It is removed only if the student clears this
// site's data in browser settings, removes it themselves, or loses access.
//
// Protection: the file is stored encrypted (AES-GCM) with a per-student key
// that is generated as NON-EXTRACTABLE — the browser can use it to decrypt
// inside the reader, but it cannot be exported. So the saved data is not a
// usable PDF if someone digs into the phone's browser files. (No web
// technology can stop a determined person on their own device; this is
// reasonable protection, not DRM.)

const DB_NAME = 'techmed-library';
const DB_VERSION = 1;
const META = 'meta';
const FILES = 'files';
const KEYS = 'keys';
const LAST_USER_KEY = 'techmed_reader_user';

export interface OfflineBookMeta {
  key: string; // `${userId}:${resourceId}`
  userId: string;
  resourceId: string;
  title: string;
  fileType: 'pdf' | 'zip';
  version: string;
  size: number;
  savedAt: string;
}

interface StoredFile {
  key: string;
  iv: Uint8Array;
  data: ArrayBuffer;
}

function bookKey(userId: string, resourceId: string): string {
  return `${userId}:${resourceId}`;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Offline storage is not supported on this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) {
        const meta = db.createObjectStore(META, { keyPath: 'key' });
        meta.createIndex('userId', 'userId', { unique: false });
      }
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(KEYS)) db.createObjectStore(KEYS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

async function getUserKey(userId: string): Promise<CryptoKey> {
  const existing = await tx<CryptoKey | undefined>(KEYS, 'readonly', (s) => s.get(userId));
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await tx(KEYS, 'readwrite', (s) => s.put(key, userId));
  return key;
}

/** Ask the browser not to evict our storage under pressure (best effort). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export function isOfflineStorageSupported(): boolean {
  return typeof indexedDB !== 'undefined' && typeof crypto !== 'undefined' && !!crypto.subtle;
}

export async function saveBook(
  meta: Omit<OfflineBookMeta, 'key' | 'savedAt' | 'size'>,
  bytes: ArrayBuffer,
): Promise<OfflineBookMeta> {
  const key = await getUserKey(meta.userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  const full: OfflineBookMeta = {
    ...meta,
    key: bookKey(meta.userId, meta.resourceId),
    size: bytes.byteLength,
    savedAt: new Date().toISOString(),
  };
  await tx(FILES, 'readwrite', (s) => s.put({ key: full.key, iv, data } satisfies StoredFile));
  await tx(META, 'readwrite', (s) => s.put(full));
  void requestPersistentStorage();
  return full;
}

export async function getBookMeta(userId: string, resourceId: string): Promise<OfflineBookMeta | null> {
  try {
    return (await tx<OfflineBookMeta | undefined>(META, 'readonly', (s) => s.get(bookKey(userId, resourceId)))) ?? null;
  } catch {
    return null;
  }
}

export async function loadBook(
  userId: string,
  resourceId: string,
): Promise<{ meta: OfflineBookMeta; bytes: ArrayBuffer } | null> {
  const meta = await getBookMeta(userId, resourceId);
  if (!meta) return null;
  const file = await tx<StoredFile | undefined>(FILES, 'readonly', (s) => s.get(meta.key));
  if (!file) return null;
  const key = await getUserKey(userId);
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: file.iv }, key, file.data);
  return { meta, bytes };
}

export async function listBooks(userId: string): Promise<OfflineBookMeta[]> {
  try {
    return await openDb().then(
      (db) =>
        new Promise<OfflineBookMeta[]>((resolve, reject) => {
          const req = db.transaction(META, 'readonly').objectStore(META).index('userId').getAll(userId);
          req.onsuccess = () => resolve(req.result as OfflineBookMeta[]);
          req.onerror = () => reject(req.error);
        }),
    );
  } catch {
    return [];
  }
}

export async function removeBook(userId: string, resourceId: string): Promise<void> {
  const key = bookKey(userId, resourceId);
  await tx(FILES, 'readwrite', (s) => s.delete(key));
  await tx(META, 'readwrite', (s) => s.delete(key));
}

/** Remember who last signed in, so saved books open offline even if the session can't refresh. */
export function rememberReader(user: { id: string; email?: string | null }): void {
  try {
    localStorage.setItem(LAST_USER_KEY, JSON.stringify({ id: user.id, email: user.email ?? null }));
  } catch {
    /* ignore */
  }
}

export function lastReader(): { id: string; email: string | null } | null {
  try {
    const raw = localStorage.getItem(LAST_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function forgetReader(): void {
  try {
    localStorage.removeItem(LAST_USER_KEY);
  } catch {
    /* ignore */
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Ask the service worker to store these pages (and all their scripts/styles)
 * so they open with no connection. Safe to call often.
 */
export async function keepPagesOffline(paths: string[]): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.register('/sw.js');
    const ready = await navigator.serviceWorker.ready;
    (ready.active || reg.active)?.postMessage({ action: 'cache-pages', paths });
  } catch {
    /* offline pages are a convenience; the saved book itself is in IndexedDB */
  }
}
