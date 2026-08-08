// TECHMED Resources data model.
//
// Every entry here is a real TECHMED product or resource — sourced from
// supabase/functions/pay-initiate/index.ts (authoritative prices/names for
// paid products) and resources.html (the live static site's existing
// resource descriptions and the real free QuizBoot practice link). Nothing
// here is invented: no fabricated prices, URLs, testimonials or stats.
//
// Paystack integration on the legacy site is a dynamic, server-initiated
// flow (POST to a Supabase Edge Function, which returns a one-time
// Paystack authorization_url) — not a static payment link. Since no static
// Paystack Payment Link exists for these products yet, `paystackUrl` is
// left undefined everywhere for now; WhatsApp remains the real, working
// acquisition path (same wa.me number and message pattern as the legacy
// buyWhatsApp() flow). When static Paystack links exist, set `paystackUrl`
// per resource and the Buy with Paystack button appears automatically.
//
// Content-managed: getResources() reads from the Sanity `resource` document
// type (studio/schemaTypes/resource.ts) with FALLBACK_RESOURCES below as
// the fallback — same pattern as FAQ.astro/FounderWelcome.astro elsewhere
// in this codebase. Once resources are published in Sanity, they take over
// automatically; no page or component code needs to change. Publishing a
// new resource is a Sanity Studio task, not an Astro code change.
import { fetchSanity } from './sanity';

export type ResourceCategory =
  | 'Academic'
  | 'Admission'
  | 'Quizzes'
  | 'Digital Tools'
  | 'Growth'
  | 'Opportunities';

export type ResourceType =
  | 'Guide'
  | 'Blueprint'
  | 'Booster System'
  | 'Quiz'
  | 'Tool'
  | 'Course'
  | 'Webinar'
  | 'Opportunity'
  | 'Other';

export type ResourceStatus = 'free' | 'paid';

export interface Resource {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ResourceCategory;
  type: ResourceType;
  status: ResourceStatus;
  /** Naira amount. Omitted entirely (not zero) when pricing isn't public yet. */
  price?: number;
  currency?: string;
  /** Display order, lower first — same convention as the faqItem schema's `order` field. */
  order?: number;
  /** Sanity image asset URL. When absent, the card/detail views fall back to a category icon. */
  primaryImage?: string;
  /** Additional Sanity image asset URLs shown on the detail page. */
  previewImages?: string[];
  /** Inline SVG markup, matching FeatureCard's icon pattern — not Sanity-editable (arbitrary HTML from a CMS field is an XSS risk); only ever developer-authored in FALLBACK_RESOURCES below. */
  thumbnail?: string;
  featured?: boolean;
  tags?: string[];
  /** Verb-first label for the primary action, e.g. "View Guide", "Start Quiz". */
  actionLabel: string;
  /** Internal or external URL for free resources / tools with direct access. */
  accessUrl?: string;
  /** Static Paystack Payment Link, when one exists for this product. */
  paystackUrl?: string;
  /** wa.me acquisition link with a pre-filled, product-specific message. */
  whatsappUrl?: string;
  /** For resources that live entirely off-site (e.g. a partner platform). */
  externalUrl?: string;
  /** Detail-page-only copy: what a student gets. */
  whatsIncluded?: string[];
  /** Detail-page-only copy: who this resource is built for. */
  whoItsFor?: string;
}

const WHATSAPP_NUMBER = '2347044255045';

function whatsapp(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const ICONS = {
  guide: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  quiz: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  flask: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6"/><path d="M10 2v6.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 8.5V2"/></svg>`,
  leaf: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 4 13V8a1 1 0 0 1 1-1h5a7 7 0 0 1 7 7v1a5 5 0 0 1-5 5z"/><path d="M4 8c6-1 9 2 10 8"/></svg>`,
  bolt: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  target: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  folder: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  flag: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="3"/></svg>`,
  compass: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
};

// Fallback icon by category — used whenever a resource has neither a real
// primaryImage nor a hand-picked `thumbnail`, e.g. every resource authored
// through Sanity (thumbnail is deliberately not a CMS field). Keeps the
// placeholder meaningful instead of a generic blank box.
const CATEGORY_ICONS: Record<ResourceCategory, string> = {
  Academic: ICONS.flask,
  Admission: ICONS.compass,
  Quizzes: ICONS.quiz,
  'Digital Tools': ICONS.guide,
  Growth: ICONS.bolt,
  Opportunities: ICONS.flag,
};

export function resourceIcon(resource: Resource): string {
  return resource.thumbnail ?? CATEGORY_ICONS[resource.category];
}

export const FALLBACK_RESOURCES: Resource[] = [
  {
    id: 'admission-intelligence-guide-2026',
    slug: 'techmed-admission-intelligence-guide-2026',
    title: 'TECHMED Admission Intelligence Guide 2026',
    description:
      'The complete Nigerian university admission roadmap — how to secure admission or move forward strategically without wasting years.',
    category: 'Admission',
    type: 'Guide',
    status: 'free',
    order: 1,
    thumbnail: ICONS.compass,
    featured: true,
    tags: ['Admission', 'Strategy', 'Free'],
    actionLabel: 'View Guide',
    accessUrl: '/techmed-admission-intelligence-guide-2026.pdf',
    whatsIncluded: [
      'A full breakdown of how Nigerian university admission actually works',
      'Strategic planning guidance for choosing courses and universities',
      'How to move forward if a previous attempt did not go as planned',
    ],
    whoItsFor:
      'Any student — first-time candidate or one rewriting UTME — who wants a clear, strategic view of the admission process before making decisions.',
  },
  {
    id: 'free-quiz-practice',
    slug: 'free-quiz-practice',
    title: 'Free & Unlimited Quiz Practice',
    description:
      'Thousands of UTME and Post-UTME questions with detailed solutions — no sign-up required.',
    category: 'Quizzes',
    type: 'Quiz',
    status: 'free',
    order: 2,
    thumbnail: ICONS.quiz,
    tags: ['Quiz', 'Practice', 'Free'],
    actionLabel: 'Start Quiz',
    externalUrl: 'https://quizboot.com/page/techmedofficial',
    whatsIncluded: [
      'Unlimited UTME and Post-UTME practice questions',
      'Detailed solutions for every question',
      'No account or sign-up required to start',
    ],
    whoItsFor: 'Students who want consistent, low-friction practice without a paywall.',
  },
  {
    id: 'chemistry-booster',
    slug: 'chemistry-booster-system',
    title: 'Chemistry Booster System',
    description:
      'High-yield revision for maximum Chemistry score — the Mole Concept Cure plus the Ultimate Formula Bank, covering stoichiometry, acids and bases, equilibrium, electrolysis, organic chemistry and more.',
    category: 'Academic',
    type: 'Booster System',
    status: 'paid',
    order: 3,
    price: 5000,
    currency: 'NGN',
    thumbnail: ICONS.flask,
    tags: ['Chemistry', 'Revision'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Chemistry Booster System. Price: ₦5,000. My name is ______.'),
    whatsIncluded: [
      'The Mole Concept Cure',
      'The Ultimate Chemistry Formula Bank',
      'Coverage of stoichiometry, acids/bases, equilibrium, electrolysis and organic chemistry',
    ],
    whoItsFor: 'UTME candidates who want a fast, high-yield route to a stronger Chemistry score.',
  },
  {
    id: 'biology-booster',
    slug: 'biology-booster-system',
    title: 'Biology Booster System',
    description:
      'Memory aids, recall shortcuts and frequently tested patterns — rapid revision tables, common misconceptions and exam-oriented content for maximum Biology score.',
    category: 'Academic',
    type: 'Booster System',
    status: 'paid',
    order: 4,
    price: 3000,
    currency: 'NGN',
    thumbnail: ICONS.leaf,
    tags: ['Biology', 'Revision'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Biology Booster System. Price: ₦3,000. My name is ______.'),
    whatsIncluded: [
      'Rapid revision tables built for recall under exam pressure',
      'Common misconceptions and how examiners test them',
      'Exam-oriented content across the full Biology syllabus',
    ],
    whoItsFor: 'UTME candidates who want to lock in Biology recall quickly before exam day.',
  },
  {
    id: 'physics-booster',
    slug: 'physics-booster-system',
    title: 'Physics Booster System',
    description:
      'Master calculations, solve smart, score high — the Ultimate Formula Bank, the Examiner Traps Playbook, and a strategy cheatsheet for step-by-step problem-solving speed.',
    category: 'Academic',
    type: 'Booster System',
    status: 'paid',
    order: 5,
    price: 3000,
    currency: 'NGN',
    thumbnail: ICONS.bolt,
    tags: ['Physics', 'Revision'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Physics Booster System. Price: ₦3,000. My name is ______.'),
    whatsIncluded: [
      'The Ultimate Physics Formula Bank',
      'The Examiner Traps Playbook',
      'A step-by-step problem-solving strategy cheatsheet',
    ],
    whoItsFor: 'UTME candidates who want faster, more accurate Physics problem-solving under time pressure.',
  },
  {
    id: 'post-utme-brainstorming-hub',
    slug: 'post-utme-brainstorming-hub',
    title: 'Post Brainstorming Hub — All Universities',
    description:
      'A structured system for Post-UTME preparation across universities that require it — daily drills, timed practice exams, performance tracking and focused review.',
    category: 'Admission',
    type: 'Course',
    status: 'paid',
    order: 6,
    price: 3000,
    currency: 'NGN',
    thumbnail: ICONS.target,
    tags: ['Post-UTME', 'Admission'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Post Brainstorming Hub — All Universities. Price: ₦3,000. My name is ______.'),
    whatsIncluded: [
      'Daily Post-UTME practice drills',
      'Weekly timed practice exams',
      'Performance tracking and likely-question focus areas',
    ],
    whoItsFor: 'Students preparing for Post-UTME at any university that runs a screening exam.',
  },
  {
    id: 'university-research-file',
    slug: 'university-research-file',
    title: 'Detailed University Research File',
    description:
      'Everything you need to gain admission at a specific university — 5-year Post-UTME trends, detailed solutions, departmental cut-offs, merit list info, admission guidance and scholarship tips, all in one file.',
    category: 'Admission',
    type: 'Guide',
    status: 'paid',
    order: 7,
    price: 1000,
    currency: 'NGN',
    thumbnail: ICONS.folder,
    tags: ['Admission', 'Research'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Detailed University Research File. Price: ₦1,000. My name is ______.'),
    whatsIncluded: [
      '5-year Post-UTME question trends for your chosen university',
      'Departmental cut-off marks and merit list information',
      'Admission guidance and scholarship tips specific to that university',
    ],
    whoItsFor: 'Students who already know which university they are targeting and want the full research done for them.',
  },
  {
    id: 'operation-100',
    slug: 'operation-100',
    title: 'Operation 100 — 2027 Edition',
    description:
      'A focused daily challenge for serious JAMB candidates — 100 carefully selected past questions every day across Physics, Chemistry, Biology, Mathematics and English, built to sharpen speed, accuracy and exam confidence.',
    category: 'Opportunities',
    type: 'Opportunity',
    status: 'paid',
    order: 8,
    currency: 'NGN',
    thumbnail: ICONS.flag,
    tags: ['JAMB', 'Challenge', 'Waitlist'],
    actionLabel: 'Join the Waitlist',
    whatsappUrl: whatsapp('Hi TECHMED, I want to join the Operation 100 2027 waitlist. My name is ______ and I am preparing for JAMB. Please notify me when registration opens.'),
    whatsIncluded: [
      '100 daily past questions across Physics, Chemistry, Biology, Mathematics and English',
      'A consistent, structured daily practice rhythm',
      'A competitive environment built around consistency, not cramming',
    ],
    whoItsFor: 'JAMB candidates who want daily accountability and structured practice in the run-up to their exam.',
  },
  {
    id: 'kairo',
    slug: 'kairo',
    title: 'Kairo',
    description:
      'Kairo is a student intelligence and learning platform designed to understand the learner’s journey and help them make meaningful progress.',
    category: 'Digital Tools',
    type: 'Tool',
    status: 'free',
    order: 9,
    thumbnail: ICONS.guide,
    tags: ['Learning', 'Intelligence'],
    actionLabel: 'Open Tool',
    accessUrl: '/tools',
    whatsIncluded: [
      "A view into where you are in your own learning journey",
      'Guidance built around your actual progress, not a generic study plan',
    ],
    whoItsFor: 'Students who want a clearer picture of their own progress and what to focus on next.',
  },
];

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  'Academic',
  'Admission',
  'Quizzes',
  'Digital Tools',
  'Growth',
  'Opportunities',
];

const RESOURCE_QUERY = `*[_type == "resource"] {
  "id": _id,
  "slug": slug.current,
  title,
  description,
  category,
  type,
  status,
  price,
  currency,
  order,
  featured,
  tags,
  actionLabel,
  accessUrl,
  paystackUrl,
  whatsappUrl,
  externalUrl,
  whatsIncluded,
  whoItsFor,
  "primaryImage": primaryImage.asset->url,
  "previewImages": previewImages[].asset->url
}`;

function byOrder(a: Resource, b: Resource): number {
  const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.title.localeCompare(b.title);
}

// Content-managed: pulls from Sanity's `resource` documents, sorted by
// `order` (a missing order value sinks to the end, then ties break by
// title) — falls back to FALLBACK_RESOURCES, already sorted, if Sanity has
// no resources published yet or is unreachable.
export async function getResources(): Promise<Resource[]> {
  const resources = await fetchSanity<Resource[]>(RESOURCE_QUERY, FALLBACK_RESOURCES);
  return [...resources].sort(byOrder);
}

export function getResourceBySlug(resources: Resource[], slug: string): Resource | undefined {
  return resources.find((resource) => resource.slug === slug);
}

export function getFeaturedResource(resources: Resource[]): Resource | undefined {
  return resources.find((resource) => resource.featured);
}

export function getResourcesByCategory(resources: Resource[], category: ResourceCategory | 'All'): Resource[] {
  if (category === 'All') return resources;
  return resources.filter((resource) => resource.category === category);
}

export function getQuizResources(resources: Resource[]): Resource[] {
  return resources.filter((resource) => resource.type === 'Quiz');
}
