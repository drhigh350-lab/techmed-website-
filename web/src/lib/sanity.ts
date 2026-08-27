import { createClient, type SanityClient } from '@sanity/client';

// Server-side only — these envs are intentionally not PUBLIC_-prefixed, so
// Astro/Vite never bundles them into client-side JS. Every call site here
// runs in .astro frontmatter (build time), never in the browser.
//
// Client construction is lazy and defensive on purpose: @sanity/client
// throws synchronously if projectId is missing (e.g. the env vars aren't
// configured yet in this build environment), and that throw happens the
// moment this module is imported — before fetchSanity's own try/catch
// below ever gets a chance to run. A missing/misconfigured env var should
// degrade to fallback content like any other Sanity failure, not crash
// the whole build at import time.
let client: SanityClient | null | undefined;
function getClient(): SanityClient | null {
  if (client !== undefined) return client;
  try {
    client = createClient({
      projectId: import.meta.env.SANITY_PROJECT_ID,
      dataset: import.meta.env.SANITY_DATASET ?? 'production',
      apiVersion: '2024-01-01',
      useCdn: true,
      timeout: 8000,
    });
  } catch (err) {
    console.warn('[sanity] client could not be configured, using fallback content:', (err as Error).message);
    client = null;
  }
  return client;
}

// The underlying HTTP layer can emit a socket 'error' event *after* a
// request has already rejected and been handled by fetchSanity's own
// try/catch below (observed with dangling keep-alive sockets when a
// network proxy tears down the connection mid-tunnel). An unhandled
// 'error'/'uncaughtException' of that kind is fatal to the whole Node
// process by default, which would crash the entire static build over a
// single flaky Sanity request — exactly what fetchSanity exists to avoid.
// This is scoped to that specific failure mode: log and continue, don't
// swallow anything else.
let stragglerGuardInstalled = false;
function installStragglerGuard() {
  if (stragglerGuardInstalled) return;
  stragglerGuardInstalled = true;
  process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
    if (err && (err.syscall === 'read' || err.syscall === 'write') && err.code) {
      console.warn('[sanity] ignoring late socket error from a request already handled:', err.message);
      return;
    }
    throw err;
  });
}
installStragglerGuard();

// Every page includes Navbar + Footer, both of which call
// getWhatsappChannelUrl() independently — across a growing number of
// pages that's a lot of identical requests for the same siteSettings
// document. Cache by query string for the lifetime of the build process
// (a fresh Node process per build, so this never serves stale data
// across builds) and share the in-flight Promise so concurrent callers
// during the same prerender pass don't each start their own request.
const queryCache = new Map<string, Promise<unknown>>();

// Fetches are defensive by design: if Sanity is unreachable at build time
// (misconfigured env, network issue, project not yet seeded), the site
// still builds using the caller's fallback rather than failing the deploy.
export async function fetchSanity<T>(query: string, fallback: T): Promise<T> {
  const sanity = getClient();
  if (!sanity) return fallback;

  let pending = queryCache.get(query) as Promise<T> | undefined;
  if (!pending) {
    pending = sanity.fetch<T>(query);
    queryCache.set(query, pending);
  }

  try {
    const result = await pending;
    if (result === null || result === undefined || (Array.isArray(result) && result.length === 0)) {
      return fallback;
    }
    return result;
  } catch (err) {
    // Don't cache a failure — a transient network blip on the first page
    // shouldn't permanently doom every later page in the same build to
    // the fallback when a retry might succeed.
    queryCache.delete(query);
    console.warn('[sanity] fetch failed, using fallback content:', (err as Error).message);
    return fallback;
  }
}

export const FALLBACK_WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029Vb7tQsfD38CSNxWtHN3i';

export async function getWhatsappChannelUrl(): Promise<string> {
  return fetchSanity<string>(
    `*[_id == "siteSettings"][0].whatsappChannelUrl`,
    FALLBACK_WHATSAPP_CHANNEL,
  );
}
