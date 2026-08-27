// Contact-page data model. Follows the same content-managed-with-fallback
// pattern as banner.ts/resources.ts: every value is editable from Sanity
// (siteSettings for sitewide contact identity, contactPageSettings for
// this page's copy, proofPoint for the progressively-filled credibility
// list), and every fallback below is real, already-established TECHMED
// content — nothing invented, no placeholder stats.
import { fetchSanity } from './sanity';

// Same number already used sitewide for the real wa.me purchase flow
// (see resources.ts) — this is the CEO's personal number today. It is
// stored as a single Sanity field specifically so it can be swapped for a
// dedicated TECHMED support number later without touching any code.
const FALLBACK_WHATSAPP_NUMBER = '2347044255045';
const FALLBACK_INSTAGRAM_URL = 'https://instagram.com/heytechmed';
const FALLBACK_FACEBOOK_URL = 'https://facebook.com/heytechmed';
const FALLBACK_YOUTUBE_URL = 'https://youtube.com/@heytechmed';

export interface ContactChannels {
  whatsappNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
}

const CHANNELS_QUERY = `*[_id == "siteSettings"][0]{whatsappNumber, instagramUrl, facebookUrl, youtubeUrl}`;

export async function getContactChannels(): Promise<ContactChannels> {
  const settings = await fetchSanity<Partial<ContactChannels> | null>(CHANNELS_QUERY, null);
  return {
    whatsappNumber: settings?.whatsappNumber || FALLBACK_WHATSAPP_NUMBER,
    instagramUrl: settings?.instagramUrl || FALLBACK_INSTAGRAM_URL,
    facebookUrl: settings?.facebookUrl || FALLBACK_FACEBOOK_URL,
    youtubeUrl: settings?.youtubeUrl || FALLBACK_YOUTUBE_URL,
  };
}

/** wa.me link with an optional pre-filled message — same helper shape as resources.ts's whatsapp(). */
export function whatsappLink(number: string, text?: string): string {
  return text ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : `https://wa.me/${number}`;
}

export function telLink(number: string): string {
  return `tel:+${number}`;
}

export function smsLink(number: string): string {
  return `sms:+${number}`;
}

export interface ContactPageCopy {
  heroTitle: string;
  heroSubtitle: string;
  supportTopics: string[];
  supportDisclaimer: string;
  proofHeading: string;
  proofIntro: string;
}

const FALLBACK_COPY: ContactPageCopy = {
  heroTitle: "Need help? We're here.",
  heroSubtitle:
    "Whatever stage of your preparation you're at, you don't have to figure it out alone. Reach out for questions about your journey, help using TECHMED, or anything getting in your way — a real person reads every message.",
  supportTopics: [
    'Questions about your preparation journey',
    'Difficulty understanding how to use TECHMED',
    'Technical or access issues',
    'Questions about programmes and tutorials',
    'General enquiries',
  ],
  supportDisclaimer:
    "This channel is for support and guidance, not a substitute for 1:1 tutoring — for structured teaching, the Builder Cohort and Resources are the right place to start.",
  proofHeading: 'Built around real preparation, not hype',
  proofIntro:
    "TECHMED isn't a random page giving advice. It's built by someone who went through the exact process — the confusion, the setback, the second attempt — and turned what worked into a system other students could follow.",
};

const COPY_QUERY = `*[_id == "contactPageSettings"][0]{
  heroTitle, heroSubtitle, supportTopics, supportDisclaimer, proofHeading, proofIntro
}`;

export async function getContactPageCopy(): Promise<ContactPageCopy> {
  const copy = await fetchSanity<Partial<ContactPageCopy> | null>(COPY_QUERY, null);
  return {
    heroTitle: copy?.heroTitle || FALLBACK_COPY.heroTitle,
    heroSubtitle: copy?.heroSubtitle || FALLBACK_COPY.heroSubtitle,
    supportTopics: copy?.supportTopics?.length ? copy.supportTopics : FALLBACK_COPY.supportTopics,
    supportDisclaimer: copy?.supportDisclaimer || FALLBACK_COPY.supportDisclaimer,
    proofHeading: copy?.proofHeading || FALLBACK_COPY.proofHeading,
    proofIntro: copy?.proofIntro || FALLBACK_COPY.proofIntro,
  };
}

export interface FounderCredibility {
  name: string;
  role: string;
  fact: string;
}

// Same real founder doc/fallback FounderWelcome.astro uses on the About
// page (singleton doc _id: "founder") — reused here as one honest,
// already-established credential for the Contact page's proof section,
// not restated or embellished.
const FOUNDER_FALLBACK: FounderCredibility = {
  name: 'Wisdom Johnson',
  role: 'Founder, TECHMED',
  fact: 'Scored 331 in UTME and 91% in Chemistry on his second attempt, and secured admission to study Medicine & Surgery — after building the exact system now taught through TECHMED.',
};

export async function getFounderCredibility(): Promise<FounderCredibility> {
  const founder = await fetchSanity<{ name?: string; role?: string } | null>(
    `*[_id == "founder"][0]{name, role}`,
    null,
  );
  return {
    name: founder?.name || FOUNDER_FALLBACK.name,
    role: founder?.role || FOUNDER_FALLBACK.role,
    fact: FOUNDER_FALLBACK.fact,
  };
}

export interface ProofPoint {
  category: string;
  statement: string;
  attribution?: string;
}

const PROOF_POINTS_QUERY = `*[_type == "proofPoint" && !(_id in path("drafts.**"))] | order(order asc){category, statement, attribution}`;

// No fallback array here on purpose — an empty/unreachable Sanity means no
// proof points exist yet, and the page must show nothing rather than
// invented testimonials or stats. The proof section still reads complete
// without any (see contact.astro), so this is never an empty-looking gap.
export async function getProofPoints(): Promise<ProofPoint[]> {
  return fetchSanity<ProofPoint[]>(PROOF_POINTS_QUERY, []);
}
