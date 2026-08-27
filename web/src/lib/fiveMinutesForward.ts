// Data for the /podcast page — a short doorway to the real 5 Minutes
// Forward site, not a rebuild of it. Same content-managed-with-fallback
// pattern as contact.ts/banner.ts. The fallback copy below is reused
// verbatim from already-established TECHMED copy (utme-2027.astro's
// "Beyond Academics" section and WhatYoullReceive.astro), not invented.
import { fetchSanity } from './sanity';

export interface FiveMinutesForwardSettings {
  heroTitle: string;
  intro: string;
  previewImageUrl?: string;
  ctaLabel: string;
  externalUrl: string;
}

const FALLBACK: FiveMinutesForwardSettings = {
  heroTitle: '5 Minutes Forward',
  intro:
    "5 Minutes Forward is TECHMED's daily habit of intentional growth — a few minutes a day to think clearly, reset, and keep moving forward. Discipline, consistency, resilience: the character behind the score.",
  ctaLabel: 'Explore 5 Minutes Forward',
  externalUrl: 'https://forward.techmedng.com',
};

const QUERY = `*[_id == "fiveMinutesForwardSettings"][0]{
  heroTitle, intro, ctaLabel, externalUrl, "previewImageUrl": previewImage.asset->url
}`;

export async function getFiveMinutesForwardSettings(): Promise<FiveMinutesForwardSettings> {
  const settings = await fetchSanity<Partial<FiveMinutesForwardSettings> | null>(QUERY, null);
  return {
    heroTitle: settings?.heroTitle || FALLBACK.heroTitle,
    intro: settings?.intro || FALLBACK.intro,
    previewImageUrl: settings?.previewImageUrl,
    ctaLabel: settings?.ctaLabel || FALLBACK.ctaLabel,
    externalUrl: settings?.externalUrl || FALLBACK.externalUrl,
  };
}
