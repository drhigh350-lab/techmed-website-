// Sanity data access for the Astro rebuild.
//
// No Sanity project has been provisioned for this repo yet (no project ID,
// dataset, or token is configured anywhere). This client is intentionally
// fail-soft: with no config, or if a request fails for any reason, callers
// get an empty result instead of a crashed build — matching the "Sanity
// fail-safe" requirement for the resource/article system. Once a real
// project is provisioned, set PUBLIC_SANITY_PROJECT_ID and
// PUBLIC_SANITY_DATASET (and SANITY_API_TOKEN if the dataset is private)
// and this starts returning real content with no code changes.

import { createClient, type SanityClient } from '@sanity/client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET || 'production';
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION || '2024-01-01';
const token = import.meta.env.SANITY_API_TOKEN;

let client: SanityClient | null = null;

if (projectId) {
  client = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: !token,
  });
}

export function isSanityConfigured(): boolean {
  return client !== null;
}

/**
 * Runs a GROQ query and returns its result, or `fallback` if Sanity isn't
 * configured or the request fails. Never throws — a broken/unreachable CMS
 * must not take the rest of the site down at build time.
 */
export async function sanityFetch<T>(
  query: string,
  params: Record<string, unknown> = {},
  fallback: T
): Promise<T> {
  if (!client) return fallback;

  try {
    return await client.fetch<T>(query, params);
  } catch (error) {
    console.warn('[sanity] query failed, falling back to empty result:', error);
    return fallback;
  }
}
