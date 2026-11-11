// Fetches an e-book from the protected reader-file Edge Function.
// The browser never sees a storage URL: it sends the signed-in student's
// session token, the server checks entitlement, then streams the file.
import { getSupabase, SUPABASE_URL } from './supabase';

export type ReaderFetchError =
  | 'offline'
  | 'sign_in_required'
  | 'not_entitled'
  | 'file_not_uploaded'
  | 'failed';

export class ReaderError extends Error {
  constructor(public code: ReaderFetchError, message?: string) {
    super(message ?? code);
  }
}

export interface ReaderFile {
  bytes: ArrayBuffer;
  fileType: 'pdf' | 'zip';
  version: string;
}

async function sessionToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

function errorFrom(status: number, body: { error?: string } | null): ReaderError {
  const code = body?.error;
  if (status === 401 || code === 'sign_in_required') return new ReaderError('sign_in_required');
  if (status === 403 || code === 'not_entitled') return new ReaderError('not_entitled');
  if (status === 404 || code === 'file_not_uploaded') return new ReaderError('file_not_uploaded');
  return new ReaderError('failed', code);
}

/** Cheap check (no download): is the student entitled and is the file uploaded? */
export async function checkBook(resourceId: string): Promise<{ fileType: 'pdf' | 'zip'; version: string; size: number | null }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ReaderError('offline');
  const token = await sessionToken();
  if (!token) throw new ReaderError('sign_in_required');
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/reader-file?resource=${encodeURIComponent(resourceId)}&mode=check`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  ).catch(() => {
    throw new ReaderError('offline');
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw errorFrom(res.status, body);
  return { fileType: body.file_type, version: body.version, size: body.size ?? null };
}

/** Download the whole file, reporting progress (0–1, or null if size unknown). */
export async function downloadBook(
  resourceId: string,
  onProgress?: (fraction: number | null, receivedBytes: number) => void,
): Promise<ReaderFile> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ReaderError('offline');
  const token = await sessionToken();
  if (!token) throw new ReaderError('sign_in_required');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/reader-file?resource=${encodeURIComponent(resourceId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => {
    throw new ReaderError('offline');
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw errorFrom(res.status, body);
  }

  const fileType = (res.headers.get('x-techmed-file-type') === 'zip' ? 'zip' : 'pdf') as 'pdf' | 'zip';
  const version = res.headers.get('x-techmed-file-version') ?? '';
  const total = Number(res.headers.get('content-length')) || 0;

  if (!res.body) {
    const bytes = await res.arrayBuffer();
    onProgress?.(1, bytes.byteLength);
    return { bytes, fileType, version };
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress?.(total ? Math.min(received / total, 1) : null, received);
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return { bytes: out.buffer, fileType, version };
}
