// Seeds the initial TECHMED content into Sanity. Run locally (not from the
// build environment): the Astro app can reach api.sanity.io fine at
// Cloudflare Pages build time, but this specific sandbox's network policy
// blocks outbound calls to it, so this script has to be run from a machine
// that can actually reach Sanity — your own.
//
// Usage:
//   cd web
//   npm install
//   node scripts/seed.mjs
//
// Safe to re-run: every document uses createOrReplace with a fixed _id (or
// a deterministic id derived from content), so running this twice updates
// the same documents rather than duplicating them.
//
// Subject roadmap images / guide PDFs: this script cannot invent those —
// drop them into scripts/assets/roadmaps/<slug>.(png|jpg) and
// scripts/assets/guides/<slug>.pdf (slugs: mathematics, physics, chemistry,
// biology, use-of-english) before running. Any subject missing a file there
// is seeded with its text content only and no error — re-run this script
// later once the file exists to attach it, no code changes needed. See
// scripts/assets/README.md.
//
// Also seeds: the real resource catalogue (with their existing images from
// public/images/resources/), the Blog's starter category taxonomy, and one
// real first Blog article — see RESOURCES and FIRST_ARTICLE below for what
// each one actually contains.

import { createClient } from '@sanity/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const requiredEnv = ['SANITY_PROJECT_ID', 'SANITY_DATASET', 'SANITY_API_TOKEN'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing ${key} in web/.env — see .env.example`);
    process.exit(1);
  }
}

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

async function seedSiteSettings() {
  await client.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    tagline: 'Think Smart. Perform Elite.',
    whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vb7tQsfD38CSNxWtHN3i',
  });
  console.log('✓ siteSettings');
}

async function seedBuilderManifesto() {
  await client.createOrReplace({
    _id: 'builderManifesto',
    _type: 'builderManifesto',
    label: 'The Builder Manifesto',
    lines: [
      'We are not here to chase motivation.',
      'We are here to build discipline.',
      'We are not looking for shortcuts.',
      'We are laying foundations.',
      'We do not measure progress by perfection.',
      'We measure progress by consistency.',
      'We believe understanding lasts longer than cramming.',
      'We believe confidence is earned.',
      'We believe preparation should strengthen character as much as performance.',
      'We help one another.',
      'We celebrate growth.',
      'We keep building even when the journey feels slow.',
      'Brick by brick.',
      'Day by day.',
      'Because things built well last.',
      'We are The Builders.',
    ],
  });
  console.log('✓ builderManifesto');
}

async function seedFaqItems() {
  const faqs = [
    {
      question: 'What is TECHMED, exactly?',
      answer:
        "A student-success ecosystem for Nigerian students preparing for UTME and Post-UTME — combining structured preparation, a Builder community, and personal growth content, built around one belief: most students don't fail from lack of intelligence, but from lack of a clear system.",
    },
    {
      question: 'What is a Builder Cohort?',
      answer:
        'Your academic home inside TECHMED — an assigned group (not a giant public chat) where you attend Builder Sessions, ask questions, and prepare alongside the same set of fellow Builders throughout the journey.',
    },
    {
      question: 'Is TECHMED free?',
      answer:
        'The Builder community, the WhatsApp Channel, and a number of resources are free. Some structured programs and revision materials are paid. You will always know which is which before joining.',
    },
    {
      question: "I've already written UTME before. Is this still for me?",
      answer:
        'Yes. Builders include first-time candidates and students rewriting UTME. TECHMED focuses on building the systems and understanding that carry you forward, whichever attempt this is.',
    },
    {
      question: 'How do I actually join?',
      answer:
        'Tap "Join Builder Cohort" to join the TECHMED WhatsApp Channel — that\'s where onboarding, your Builder Cohort assignment, and everything else begins.',
    },
  ];

  for (const [index, faq] of faqs.entries()) {
    await client.createOrReplace({
      _id: `faq-${index + 1}`,
      _type: 'faqItem',
      order: index + 1,
      question: faq.question,
      answer: faq.answer,
    });
  }
  console.log(`✓ faqItem (${faqs.length} documents)`);
}

async function seedFounder() {
  let photoAssetId;
  try {
    const photoPath = path.join(__dirname, '..', 'public', 'images', '201319.jpg');
    const photoBuffer = await readFile(photoPath);
    const asset = await client.assets.upload('image', photoBuffer, { filename: '201319.jpg' });
    photoAssetId = asset._id;
    console.log('✓ founder photo uploaded');
  } catch (err) {
    console.warn('  Could not upload founder photo, continuing without it:', err.message);
  }

  await client.createOrReplace({
    _id: 'founder',
    _type: 'founder',
    name: 'Wisdom Johnson',
    role: 'Tutor TechMed',
    label: 'A Note From the Founder',
    ...(photoAssetId
      ? { photo: { _type: 'image', asset: { _type: 'reference', _ref: photoAssetId } } }
      : {}),
    bio: [
      'Wisdom Johnson is a medical student at the University of Uyo and the founder of TECHMED. Before gaining admission, he lived the exact pain many Nigerian students face today — after secondary school in 2021, he wrote UTME in 2022 hoping to study Medicine & Surgery, and was not admitted. He spent nearly three years at home facing that disappointment.',
      'Instead of giving up, he studied the admission process deeply. On his second attempt, he scored 331 in UTME and 91% in Chemistry, and secured admission to study Medicine & Surgery in 2024.',
    ],
    quote:
      "Most students don't fail because they lack intelligence. They fail because they lack strategy, systems and proper guidance.",
  });
  console.log('✓ founder');
}

// Verbatim from web/src/lib/syllabus.ts's FALLBACK_SUBJECTS — the real
// JAMB/UTME 2027 syllabus content already used as the site's fallback.
// Keep these in sync if that file changes; this script deliberately
// doesn't import across the Astro app's TypeScript source (no TS loader
// in this plain-Node script), so the content is duplicated here.
const SUBJECTS = [
  {
    name: 'Chemistry',
    slug: 'chemistry',
    description:
      "The official JAMB Chemistry syllabus covers 18 topics. TECHMED's Chemistry Blueprint reorganizes them into five conceptual stages so preparation follows a clear dependency order rather than the syllabus's original sequence.",
    order: 1,
    topicCount: 18,
    keyDependencies:
      'Chemical Combination (the Mole Concept) and Atomic Structure & Bonding are identified as major dependency points — most later Chemistry topics build on them.',
    relatedResourceSlug: 'chemistry-booster-system',
    stages: [
      {
        name: '01 — Foundations',
        order: 1,
        topics: [
          { title: 'Separation of Mixtures & Purification' },
          { title: 'Chemical Combination' },
          { title: 'Kinetic Theory & Gas Laws' },
          { title: 'Atomic Structure & Bonding' },
        ],
      },
      {
        name: '02 — Quantitative Core',
        order: 2,
        topics: [
          { title: 'Air' },
          { title: 'Water' },
          { title: 'Solubility' },
          { title: 'Environmental Pollution' },
          { title: 'Acids, Bases & Salts' },
        ],
      },
      {
        name: '03 — Reactions & Energy',
        order: 3,
        topics: [
          { title: 'Oxidation & Reduction' },
          { title: 'Electrolysis' },
          { title: 'Energy Changes' },
          { title: 'Rates of Chemical Reaction' },
          { title: 'Chemical Equilibrium' },
        ],
      },
      {
        name: '04 — Applied Inorganic',
        order: 4,
        topics: [{ title: 'Non-metals & Their Compounds' }, { title: 'Metals & Their Compounds' }],
      },
      {
        name: '05 — Organic & Industry',
        order: 5,
        topics: [{ title: 'Organic Compounds' }, { title: 'Chemistry & Industry' }],
      },
    ],
  },
  {
    name: 'Physics',
    slug: 'physics',
    description:
      "The official JAMB Physics syllabus contains 38 numbered topics, from Measurements & Units through to Atomic & Nuclear Physics, emphasizing conceptual interpretation and quantitative problem-solving. TECHMED reorganizes them into eight stages.",
    order: 2,
    topicCount: 38,
    relatedResourceSlug: 'physics-booster-system',
    stages: [
      { name: '01 — Foundations', order: 1, topics: [{ title: 'Measurements & Units' }, { title: 'Scalars & Vectors' }] },
      {
        name: '02 — Mechanics',
        order: 2,
        topics: [
          { title: 'Motion' },
          { title: 'Gravitational Field' },
          { title: 'Equilibrium of Forces' },
          { title: 'Work, Energy & Power' },
          { title: 'Friction' },
          { title: 'Simple Machines' },
          { title: 'Elasticity' },
        ],
      },
      { name: '03 — Fluids', order: 3, topics: [{ title: 'Pressure' }, { title: 'Liquids at Rest' }] },
      {
        name: '04 — Heat & Thermal Physics',
        order: 4,
        topics: [
          { title: 'Temperature' },
          { title: 'Thermal Expansion' },
          { title: 'Gas Laws' },
          { title: 'Quantity of Heat' },
          { title: 'Change of State' },
          { title: 'Vapours' },
          { title: 'Structure of Matter & Kinetic Theory' },
          { title: 'Heat Transfer' },
        ],
      },
      {
        name: '05 — Waves, Sound & Light',
        order: 5,
        topics: [
          { title: 'Waves' },
          { title: 'Propagation of Sound' },
          { title: 'Characteristics of Sound' },
          { title: 'Light Energy' },
          { title: 'Reflection' },
          { title: 'Refraction' },
          { title: 'Optical Instruments' },
          { title: 'Dispersion & Electromagnetic Spectrum' },
        ],
      },
      {
        name: '06 — Electricity',
        order: 6,
        topics: [
          { title: 'Electrostatics' },
          { title: 'Capacitors' },
          { title: 'Electric Cells' },
          { title: 'Current Electricity' },
          { title: 'Electrical Energy & Power' },
        ],
      },
      {
        name: '07 — Magnetism & Electromagnetism',
        order: 7,
        topics: [
          { title: 'Magnets & Magnetic Fields' },
          { title: 'Force on Current-Carrying Conductors' },
          { title: 'Electromagnetic Induction' },
          { title: 'A.C. Circuits' },
        ],
      },
      { name: '08 — Modern Physics', order: 8, topics: [{ title: 'Electronics' }, { title: 'Atomic & Nuclear Physics' }] },
    ],
  },
  {
    name: 'Biology',
    slug: 'biology',
    description:
      "The official JAMB Biology syllabus is organized around the diversity, interdependence and unity of life; continuity through inheritance and evolution; and the application of Biology to living things, society, health and the environment. TECHMED reorganizes it into five stages.",
    order: 3,
    topicCount: 22,
    relatedResourceSlug: 'biology-booster-system',
    stages: [
      {
        name: '01 — Foundations of Life',
        order: 1,
        topics: [
          { title: 'Living Organisms' },
          { title: 'Evolution Among Taxonomic Groups' },
          { title: 'Variety of Organisms' },
          { title: 'Internal Structure of Flowering Plants & Mammals' },
        ],
      },
      {
        name: '02 — Form & Function I: Sustaining Life',
        order: 2,
        topics: [{ title: 'Nutrition' }, { title: 'Transport' }, { title: 'Respiration' }, { title: 'Excretion' }],
      },
      {
        name: '03 — Form & Function II: Continuing Life',
        order: 3,
        topics: [
          { title: 'Support & Movement' },
          { title: 'Reproduction' },
          { title: 'Growth' },
          { title: 'Coordination & Control' },
        ],
      },
      {
        name: '04 — Ecology',
        order: 4,
        topics: [
          { title: 'Factors Affecting Distribution' },
          { title: 'Symbiotic Interactions & Energy Flow' },
          { title: 'Natural Habitats' },
          { title: 'Local Nigerian Biomes' },
          { title: 'Ecology of Populations' },
          { title: 'Soil' },
          { title: 'Humans & Environment' },
        ],
      },
      {
        name: '05 — Heredity, Variation & Evolution',
        order: 5,
        topics: [
          { title: 'Variation in Population' },
          { title: 'Heredity' },
          { title: 'Theories & Evidence of Evolution' },
        ],
      },
    ],
  },
  {
    name: 'Mathematics',
    slug: 'mathematics',
    description:
      "TECHMED reorganizes the 23 official JAMB Mathematics topics by conceptual dependency rather than JAMB's original sectional arrangement.",
    order: 4,
    topicCount: 23,
    stages: [
      {
        name: '01 — Foundations & Number Sense',
        order: 1,
        topics: [
          { title: 'Number Bases' },
          { title: 'Fractions, Decimals, Approximations & Percentages' },
          { title: 'Indices, Logarithms & Surds' },
          { title: 'Sets' },
        ],
      },
      {
        name: '02 — Algebra & Functions',
        order: 2,
        topics: [
          { title: 'Polynomials' },
          { title: 'Variation' },
          { title: 'Inequalities' },
          { title: 'Progression' },
          { title: 'Binary Operations' },
          { title: 'Matrices & Determinants' },
        ],
      },
      {
        name: '03 — Geometry, Trigonometry & Spatial Reasoning',
        order: 3,
        topics: [
          { title: 'Euclidean Geometry' },
          { title: 'Mensuration' },
          { title: 'Loci' },
          { title: 'Coordinate Geometry' },
          { title: 'Trigonometry' },
        ],
      },
      {
        name: '04 — Calculus & Mathematical Modelling',
        order: 4,
        topics: [{ title: 'Differentiation' }, { title: 'Application of Differentiation' }, { title: 'Integration' }],
      },
      {
        name: '05 — Statistics & Probability',
        order: 5,
        topics: [
          { title: 'Representation of Data' },
          { title: 'Measures of Location' },
          { title: 'Measures of Dispersion' },
          { title: 'Permutation & Combination' },
          { title: 'Probability' },
        ],
      },
    ],
  },
  {
    name: 'Use of English',
    slug: 'use-of-english',
    description:
      "JAMB's Use of English exam is primarily a language-skills progression rather than a conventional chapter-based subject, examined across Comprehension/Summary, Lexis & Structure and Oral Forms. TECHMED's skill roadmap breaks this into five stages.",
    order: 5,
    requiredText: 'The Lekki Headmaster',
    examStructure: [
      { section: 'A', area: 'Comprehension Passage', questions: 5 },
      { section: 'A', area: 'Cloze Passage', questions: 10 },
      { section: 'A', area: 'Reading Text — The Lekki Headmaster', questions: 10 },
      { section: 'B', area: 'Sentence Interpretation', questions: 5 },
      { section: 'B', area: 'Antonyms', questions: 5 },
      { section: 'B', area: 'Synonyms', questions: 5 },
      { section: 'B', area: 'Sentence Completion', questions: 10 },
      { section: 'C', area: 'Oral Forms', questions: 10 },
    ],
    stages: [
      {
        name: '01 — Reading & Understanding',
        order: 1,
        topics: [
          { title: 'Comprehension' },
          { title: 'Summary' },
          { title: 'Main Ideas' },
          { title: 'Implied Meaning' },
          { title: "Writer's Attitude" },
          { title: 'Inference' },
          { title: 'Logical Reasoning' },
        ],
      },
      {
        name: '02 — Vocabulary & Meaning',
        order: 2,
        topics: [
          { title: 'Synonyms' },
          { title: 'Antonyms' },
          { title: 'Homonyms' },
          { title: 'Idioms' },
          { title: 'Figurative Meaning' },
          { title: 'Contextual Meaning' },
          { title: 'Lexical Relationships' },
        ],
      },
      {
        name: '03 — Grammar & Sentence Mastery',
        order: 3,
        topics: [
          { title: 'Word Classes' },
          { title: 'Sentence Patterns' },
          { title: 'Clauses' },
          { title: 'Concord' },
          { title: 'Tense' },
          { title: 'Aspect' },
          { title: 'Mood' },
          { title: 'Agreement' },
          { title: 'Question Tags' },
          { title: 'Punctuation' },
          { title: 'Spelling' },
          { title: 'Sentence Completion' },
          { title: 'Sentence Interpretation' },
        ],
      },
      {
        name: '04 — Spoken English',
        order: 4,
        topics: [
          { title: 'Vowels' },
          { title: 'Diphthongs' },
          { title: 'Consonants' },
          { title: 'Consonant Clusters' },
          { title: 'Homophones' },
          { title: 'Stress' },
          { title: 'Intonation' },
        ],
      },
      {
        name: '05 — Exam Application',
        order: 5,
        topics: [
          { title: 'Required Reading Text' },
          { title: 'Examination Structure' },
          { title: 'Question Distribution' },
          { title: 'Section Strategy' },
        ],
      },
    ],
  },
];

// Looks for <baseName>.<ext> (first match wins) in `dir`, returning its
// buffer and filename, or null if none of the extensions exist there.
async function findAsset(dir, baseName, extensions) {
  for (const ext of extensions) {
    const filePath = path.join(dir, `${baseName}${ext}`);
    try {
      const buffer = await readFile(filePath);
      return { buffer, filename: `${baseName}${ext}` };
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return null;
}

async function seedSubjects() {
  const roadmapsDir = path.join(__dirname, 'assets', 'roadmaps');
  const guidesDir = path.join(__dirname, 'assets', 'guides');

  for (const subject of SUBJECTS) {
    const doc = {
      _id: `subject-${subject.slug}`,
      _type: 'subject',
      name: subject.name,
      slug: { _type: 'slug', current: subject.slug },
      description: subject.description,
      order: subject.order,
      stages: subject.stages.map((stage) => ({
        _type: 'stage',
        _key: `stage-${stage.order}`,
        name: stage.name,
        order: stage.order,
        topics: stage.topics.map((topic, i) => ({
          _type: 'topicRef',
          _key: `topic-${stage.order}-${i}`,
          title: topic.title,
        })),
      })),
    };

    if (subject.topicCount) doc.topicCount = subject.topicCount;
    if (subject.keyDependencies) doc.keyDependencies = subject.keyDependencies;
    if (subject.relatedResourceSlug) doc.relatedResourceSlug = subject.relatedResourceSlug;
    if (subject.requiredText) doc.requiredText = subject.requiredText;
    if (subject.examStructure) {
      doc.examStructure = subject.examStructure.map((row, i) => ({
        _type: 'examSection',
        _key: `exam-${i}`,
        ...row,
      }));
    }

    const image = await findAsset(roadmapsDir, subject.slug, ['.png', '.jpg', '.jpeg']);
    if (image) {
      const asset = await client.assets.upload('image', image.buffer, { filename: image.filename });
      doc.previewImage = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
      console.log(`  ✓ ${subject.name} roadmap image uploaded (${image.filename})`);
    } else {
      console.log(`  – ${subject.name}: no roadmap image at scripts/assets/roadmaps/${subject.slug}.(png|jpg) — skipped, text content still seeded`);
    }

    const guide = await findAsset(guidesDir, subject.slug, ['.pdf']);
    if (guide) {
      const asset = await client.assets.upload('file', guide.buffer, { filename: guide.filename });
      doc.guideFile = { _type: 'file', asset: { _type: 'reference', _ref: asset._id } };
      console.log(`  ✓ ${subject.name} guide PDF uploaded (${guide.filename})`);
    } else {
      console.log(`  – ${subject.name}: no guide PDF at scripts/assets/guides/${subject.slug}.pdf — skipped, add it later and re-run`);
    }

    await client.createOrReplace(doc);
    console.log(`✓ subject: ${subject.name}`);
  }
}

// Starter taxonomy for the Blog, from the agreed content architecture —
// not articles, just the category shelf they'll be filed under. Seeding
// these (rather than requiring them to be hand-created in Studio) doesn't
// invent any content: no article exists in any of them yet.
const ARTICLE_CATEGORIES = [
  'Getting Started',
  'JAMB / UTME',
  'Syllabus',
  'Subject Preparation',
  'Study Strategy',
  'Examination Strategy',
  'Admission',
  'Student Guides',
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedArticleCategories() {
  for (const title of ARTICLE_CATEGORIES) {
    const slug = slugify(title);
    await client.createOrReplace({
      _id: `articleCategory-${slug}`,
      _type: 'articleCategory',
      title,
      slug: { _type: 'slug', current: slug },
    });
  }
  console.log(`✓ articleCategory (${ARTICLE_CATEGORIES.length} documents)`);
}

// Portable-text block builder — keeps the article content below readable
// as prose instead of a wall of _key/_type boilerplate. Random keys are
// fine: Sanity only needs uniqueness within the array, and createOrReplace
// swaps the whole body each run anyway, so keys don't need to be stable
// across seed runs.
let keyCounter = 0;
function key(prefix) {
  keyCounter += 1;
  return `${prefix}-${keyCounter}`;
}
function block(style, text, opts = {}) {
  return {
    _type: 'block',
    _key: key('b'),
    style,
    ...(opts.listItem ? { listItem: opts.listItem, level: 1 } : {}),
    markDefs: [],
    children: [{ _type: 'span', _key: key('s'), text, marks: [] }],
  };
}
// Like block(), but takes a mix of plain strings and {text, href} segments
// so a sentence can carry a real inline link (e.g. to a Blueprint) without
// hand-writing markDefs/marks each time.
function blockWithLinks(style, segments) {
  const markDefs = [];
  const children = segments.map((seg) => {
    if (typeof seg === 'string') {
      return { _type: 'span', _key: key('s'), text: seg, marks: [] };
    }
    const linkKey = key('link');
    markDefs.push({ _key: linkKey, _type: 'link', href: seg.href });
    return { _type: 'span', _key: key('s'), text: seg.text, marks: [linkKey] };
  });
  return { _type: 'block', _key: key('b'), style, markDefs, children };
}

// The first real Blog article — v2, after a research/audit pass against
// the live search landscape for "how to prepare for JAMB" and its related
// query cluster. Still built entirely around the same real UNDERSTAND ->
// PLAN -> LEARN -> PRACTICE -> DIAGNOSE -> REVISE -> PREPARE system
// already live on /utme-2027 — now branded "The TECHMED Method" per
// direct instruction, not a new framework. No fabricated stats/dates;
// author is Wisdom Johnson (real founder, see studio/schemaTypes/founder.ts
// and its seeded bio below), not invented. Kept evergreen in substance —
// no hard dates in the body — while the title targets 2027 search intent,
// per the explicit decision to decouple those two things.
//
// _id is intentionally NOT slug-derived (unlike every other seeded type)
// so the slug/title can keep evolving without orphaning documents under a
// stale id — ARTICLE_OLD_IDS below is the one-time cleanup for the first
// version's slug-derived id, seeded before this was decided.
const ARTICLE_OLD_IDS = ['article-how-to-start-preparing-for-jamb'];
const FIRST_ARTICLE = {
  id: 'article-jamb-2027-study-system',
  slug: 'how-to-prepare-for-jamb-2027',
  title: 'How to Prepare for JAMB 2027: A Step-by-Step Study System',
  excerpt:
    "Most students don't fail JAMB because they lack intelligence — they fail because they never had a system. This is the TECHMED Method: the same seven-step system behind every TECHMED Blueprint, resource and tool.",
  categoryId: 'articleCategory-getting-started',
  tags: ['Study Plan', 'JAMB Syllabus', 'JAMB 2027', 'UTME 2027'],
  authorName: 'Wisdom Johnson',
  authorRole: 'Founder, TECHMED',
  publishedAt: '2026-08-08T09:00:00.000Z',
  updatedAt: '2026-08-08T15:30:00.000Z',
  featured: true,
  relatedBlueprintSlugs: ['chemistry', 'physics', 'biology', 'mathematics', 'use-of-english'],
  relatedResourceSlugs: ['free-quiz-practice'],
  relatedToolSlugs: ['kairo'],
  body: [
    block(
      'normal',
      "If you're reading this, you're probably trying to figure out where to actually start. This is the TECHMED Method — the same seven-step system behind every TECHMED Blueprint, resource and tool. By the end, you'll know exactly what to do next, not just what to feel motivated about.",
    ),
    block('h2', 'I know what this feels like'),
    block(
      'normal',
      'Maybe you\'ve already bought materials and still don\'t know what to read first. Maybe you started strong and stopped a few weeks in. Maybe everyone around you keeps saying "JAMB is coming" and it\'s starting to feel less like a countdown and more like pressure. If any of that sounds familiar, you\'re not behind — you just haven\'t had a system yet. That\'s what this is.',
    ),
    block('blockquote', "You don't need more motivation. You need a system that keeps working after the motivation runs out."),
    block('h2', 'The TECHMED Method'),
    block(
      'normal',
      'Every TECHMED Blueprint, resource and tool is built around the same seven-step system — not seven random tips, one repeatable cycle: Understand, Plan, Learn, Practice, Diagnose, Revise, Prepare. Most JAMB advice hands you a list. This is a loop — you move through it once per topic, then again, until exam day.',
    ),
    block('h3', '1. Understand'),
    block(
      'normal',
      'Before you plan anything, you need to actually know what you\'re preparing for — not the fear of "JAMB," but the real shape of it: what each subject covers, how the topics connect, and which ones everything else depends on. A syllabus by itself is just a list. Understanding it means seeing the structure underneath the list.',
    ),
    blockWithLinks('normal', [
      'What to do: open your subject\'s ',
      { text: 'TECHMED Blueprint', href: '/jamb-syllabus-2027' },
      ' and look at the stages before you look at a single topic in detail. You\'re mapping the terrain before you walk it.',
    ]),
    block(
      'normal',
      'The mistake most students make here: opening a textbook to page one and reading in order, instead of understanding the shape of the whole subject first.',
    ),
    block('h3', '2. Plan'),
    block(
      'normal',
      "Once you understand what you're preparing for, turn it into a schedule you'll actually follow. A plan you can't keep isn't a plan — it's a wish with a timetable attached.",
    ),
    block(
      'normal',
      'How much time you have changes what your plan should look like. Six months lets you move through the syllabus at a steady pace, with room to revisit weak topics twice. Three months means prioritizing high-weight topics first. Thirty days looks less like "cover everything" and more like triage — and that\'s its own conversation, one we\'ll go deeper on in a dedicated guide.',
    ),
    block(
      'normal',
      "What to do: block out the time you genuinely have — not the time you wish you had — and assign it to subjects based on what your Blueprint tells you carries the most weight.",
    ),
    block(
      'normal',
      "The mistake: building a six-hour daily plan in a burst of motivation, keeping it for four days, then quietly abandoning it. Two honest hours a day beats six hours you won't sustain.",
    ),
    block('h3', '3. Learn'),
    block(
      'normal',
      "This is where most of your time goes — working through each topic with real material, not just re-reading notes until they feel familiar. Familiar isn't the same as understood.",
    ),
    block(
      'normal',
      "What to do: after studying a topic, close the book and explain it out loud, in your own words, like you're teaching someone else. If you can't, you don't know it yet — you recognize it.",
    ),
    block(
      'normal',
      'The mistake: mistaking recognition for understanding. You read a solution and think "yes, I get it" — but getting it while reading and producing it from scratch under pressure are different skills.',
    ),
    block('h3', '4. Practice'),
    block(
      'normal',
      'Understanding a concept and applying it under exam conditions are two different skills. Practice — real past questions, under a timer — is where you build the second one.',
    ),
    blockWithLinks('normal', [
      'What to do: once you\'ve learned a topic, immediately test it with ',
      { text: 'real past questions', href: '/resources/free-quiz-practice' },
      ' under a timer — not "whenever you feel ready," right after, while it\'s fresh.',
    ]),
    block(
      'normal',
      'The mistake: practicing untimed, then being surprised by how different the exam feels when the clock is real.',
    ),
    block('h3', '5. Diagnose'),
    block(
      'normal',
      "Practice only helps you if you actually look at what went wrong — and more importantly, why. This is the step almost every study guide skips, and it's the one that actually moves your score.",
    ),
    block('normal', "When you get a question wrong, it's usually one of three things, and each one needs a different fix:"),
    block('normal', "A knowledge gap — you didn't know it. Go back and relearn it.", { listItem: 'bullet' }),
    block('normal', 'A careless mistake — you knew it but rushed or misread the question. Slow down on similar questions next time.', {
      listItem: 'bullet',
    }),
    block('normal', "A timing problem — you knew it but ran out of time to get there. Practice pacing, not just content.", {
      listItem: 'bullet',
    }),
    block(
      'normal',
      'Most students treat every wrong answer the same way: "I need to read more." Sometimes that\'s true. Often it isn\'t.',
    ),
    block('h3', '6. Revise'),
    block(
      'normal',
      "Revision is not re-reading everything from the beginning — that's just re-learning, slower. Real revision is closing the specific gaps your diagnosis found, spending your remaining time on what you're actually weak on, not what feels comfortable to review.",
    ),
    block(
      'normal',
      "What to do: keep a running list of exactly which topics you got wrong and why. That list is your revision plan — not the syllabus from page one again.",
    ),
    block('h3', '7. Prepare'),
    block(
      'normal',
      "The final stage isn't academic — it's logistical and mental. Knowing your exam format, practicing under real time pressure, and having an actual plan for exam day all matter as much as the studying that came before it.",
    ),
    block(
      'normal',
      'What to do: in your last week, simulate the real thing — same time of day, same time limit, no pausing. The exam shouldn\'t be the first time your brain works under those exact conditions.',
    ),
    block('h2', 'Frequently Asked Questions'),
    block('h3', 'How many hours a day should I study for JAMB?'),
    block(
      'normal',
      'Less than you think, done consistently, beats more than you can sustain. Two to four focused hours a day, every day, will take you further than an occasional ten-hour session followed by three days of burnout. Consistency is the variable that actually matters.',
    ),
    block('h3', 'Can I really prepare for JAMB in one month?'),
    block(
      'normal',
      "You can meaningfully improve your readiness in a month — but it looks different from a six-month plan. It's less about covering everything and more about triage: high-weight topics first, heavy practice, and honest diagnosis of what's actually fixable in the time you have left. We'll go deeper on exactly how in a dedicated 30-day guide.",
    ),
    block('h3', "What's the actual difference between practice and revision?"),
    block(
      'normal',
      "Practice is how you find out what you don't know yet. Revision is what you do about it. Skipping straight to revision without practice means you're guessing at your own weaknesses instead of knowing them.",
    ),
    block('h3', 'How do I know if I\'m actually ready?'),
    block(
      'normal',
      'Not by how you feel — by your diagnosed results. If your practice scores are consistently near your target, your careless-mistake rate is low, and you can finish within the time limit, that\'s readiness. "Ready" is a measurement, not a feeling.',
    ),
    block('h2', 'Where to start'),
    blockWithLinks('normal', [
      'If you haven\'t started yet: begin with Understand. Open your subject\'s ',
      { text: 'TECHMED Blueprint', href: '/jamb-syllabus-2027' },
      ' — it takes the JAMB syllabus and organizes it into a clearer study order, so you\'re not figuring out the structure entirely on your own.',
    ]),
    block('blockquote', 'Practice tells you what you can answer. Diagnosis tells you why you couldn\'t.'),
    block(
      'normal',
      'Preparation isn\'t a single decision made once — it\'s this cycle, repeated per topic, until exam day: understand, plan, learn, practice, diagnose, revise, prepare. Every TECHMED Blueprint, resource and tool exists to support one part of it.',
    ),
  ],
};

async function seedFirstArticle() {
  const a = FIRST_ARTICLE;

  for (const oldId of ARTICLE_OLD_IDS) {
    try {
      await client.delete(oldId);
    } catch {
      // Fine if it was never seeded on this dataset — nothing to clean up.
    }
  }

  await client.createOrReplace({
    _id: a.id,
    _type: 'article',
    title: a.title,
    slug: { _type: 'slug', current: a.slug },
    excerpt: a.excerpt,
    category: { _type: 'reference', _ref: a.categoryId },
    tags: a.tags,
    author: { name: a.authorName, role: a.authorRole },
    publishedAt: a.publishedAt,
    updatedAt: a.updatedAt,
    featured: a.featured,
    body: a.body,
    relatedBlueprints: a.relatedBlueprintSlugs.map((slug) => ({
      _type: 'reference',
      _key: key('rb'),
      _ref: `subject-${slug}`,
    })),
    relatedResources: a.relatedResourceSlugs.map((slug) => ({
      _type: 'reference',
      _key: key('rr'),
      _ref: `resource-${slug}`,
    })),
    relatedTools: a.relatedToolSlugs.map((slug) => ({
      _type: 'reference',
      _key: key('rt'),
      _ref: `resource-${slug}`,
    })),
  });
  console.log(`✓ article: ${a.title}`);
}

// The real TECHMED resource catalogue — copied verbatim from
// FALLBACK_RESOURCES in web/src/lib/resources.ts (real prices, real
// WhatsApp acquisition links, real descriptions — see that file's own
// header comment for provenance). Resources have only ever lived in that
// code-level fallback until now; seeding them here is what makes the
// Blog's relatedResources/relatedTools reference fields resolve to real
// documents instead of dangling references, and lets these become
// Studio-editable going forward instead of requiring a code change.
const WHATSAPP_NUMBER = '2347044255045';
function whatsapp(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const RESOURCES = [
  {
    slug: 'techmed-admission-intelligence-guide-2026',
    title: 'TECHMED Admission Intelligence Guide 2026',
    description:
      'The complete Nigerian university admission roadmap — how to secure admission or move forward strategically without wasting years.',
    category: 'Admission',
    type: 'Guide',
    status: 'free',
    order: 1,
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
    imageFile: 'admission-intelligence-guide-2026.jpg',
  },
  {
    slug: 'free-quiz-practice',
    title: 'Free & Unlimited Quiz Practice',
    description:
      'Thousands of UTME and Post-UTME questions with detailed solutions — no sign-up required.',
    category: 'Quizzes',
    type: 'Quiz',
    status: 'free',
    order: 2,
    tags: ['Quiz', 'Practice', 'Free'],
    actionLabel: 'Start Quiz',
    externalUrl: 'https://quizboot.com/page/techmedofficial',
    whatsIncluded: [
      'Unlimited UTME and Post-UTME practice questions',
      'Detailed solutions for every question',
      'No account or sign-up required to start',
    ],
    whoItsFor: 'Students who want consistent, low-friction practice without a paywall.',
    imageFile: 'free-quiz-practice.jpg',
  },
  {
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
    tags: ['Chemistry', 'Revision'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Chemistry Booster System. Price: ₦5,000. My name is ______.'),
    whatsIncluded: [
      'The Mole Concept Cure',
      'The Ultimate Chemistry Formula Bank',
      'Coverage of stoichiometry, acids/bases, equilibrium, electrolysis and organic chemistry',
    ],
    whoItsFor: 'UTME candidates who want a fast, high-yield route to a stronger Chemistry score.',
    imageFile: 'chemistry-booster-system.jpg',
  },
  {
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
    tags: ['Biology', 'Revision'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Biology Booster System. Price: ₦3,000. My name is ______.'),
    whatsIncluded: [
      'Rapid revision tables built for recall under exam pressure',
      'Common misconceptions and how examiners test them',
      'Exam-oriented content across the full Biology syllabus',
    ],
    whoItsFor: 'UTME candidates who want to lock in Biology recall quickly before exam day.',
    imageFile: 'biology-booster-system.jpg',
  },
  {
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
    tags: ['Physics', 'Revision'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Physics Booster System. Price: ₦3,000. My name is ______.'),
    whatsIncluded: [
      'The Ultimate Physics Formula Bank',
      'The Examiner Traps Playbook',
      'A step-by-step problem-solving strategy cheatsheet',
    ],
    whoItsFor: 'UTME candidates who want faster, more accurate Physics problem-solving under time pressure.',
    imageFile: 'physics-booster-system.jpg',
  },
  {
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
    tags: ['Post-UTME', 'Admission'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Post Brainstorming Hub — All Universities. Price: ₦3,000. My name is ______.'),
    whatsIncluded: [
      'Daily Post-UTME practice drills',
      'Weekly timed practice exams',
      'Performance tracking and likely-question focus areas',
    ],
    whoItsFor: 'Students preparing for Post-UTME at any university that runs a screening exam.',
    imageFile: 'post-utme-brainstorming-hub.jpg',
  },
  {
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
    tags: ['Admission', 'Research'],
    actionLabel: 'Get via WhatsApp',
    whatsappUrl: whatsapp('Hi TECHMED, I want to buy the Detailed University Research File. Price: ₦1,000. My name is ______.'),
    whatsIncluded: [
      '5-year Post-UTME question trends for your chosen university',
      'Departmental cut-off marks and merit list information',
      'Admission guidance and scholarship tips specific to that university',
    ],
    whoItsFor: 'Students who already know which university they are targeting and want the full research done for them.',
    imageFile: 'university-research-file.jpg',
  },
  {
    slug: 'operation-100',
    title: 'Operation 100 — 2027 Edition',
    description:
      'A focused daily challenge for serious JAMB candidates — 100 carefully selected past questions every day across Physics, Chemistry, Biology, Mathematics and English, built to sharpen speed, accuracy and exam confidence.',
    category: 'Opportunities',
    type: 'Opportunity',
    status: 'paid',
    order: 8,
    currency: 'NGN',
    tags: ['JAMB', 'Challenge', 'Waitlist'],
    actionLabel: 'Join the Waitlist',
    whatsappUrl: whatsapp('Hi TECHMED, I want to join the Operation 100 2027 waitlist. My name is ______ and I am preparing for JAMB. Please notify me when registration opens.'),
    whatsIncluded: [
      '100 daily past questions across Physics, Chemistry, Biology, Mathematics and English',
      'A consistent, structured daily practice rhythm',
      'A competitive environment built around consistency, not cramming',
    ],
    whoItsFor: 'JAMB candidates who want daily accountability and structured practice in the run-up to their exam.',
    imageFile: 'operation-100.jpg',
  },
  {
    slug: 'kairo',
    title: 'Kairo',
    description:
      'Kairo is a student intelligence and learning platform designed to understand the learner’s journey and help them make meaningful progress.',
    category: 'Digital Tools',
    type: 'Tool',
    status: 'free',
    order: 9,
    tags: ['Learning', 'Intelligence'],
    actionLabel: 'Open Tool',
    accessUrl: '/tools',
    whatsIncluded: [
      'A view into where you are in your own learning journey',
      'Guidance built around your actual progress, not a generic study plan',
    ],
    whoItsFor: 'Students who want a clearer picture of their own progress and what to focus on next.',
    imageFile: null,
  },
];

async function seedResources() {
  for (const r of RESOURCES) {
    let imageAssetId;
    if (r.imageFile) {
      try {
        const imagePath = path.join(__dirname, '..', 'public', 'images', 'resources', r.imageFile);
        const imageBuffer = await readFile(imagePath);
        const asset = await client.assets.upload('image', imageBuffer, { filename: r.imageFile });
        imageAssetId = asset._id;
      } catch (err) {
        console.warn(`  Could not upload image for ${r.title}, continuing without it:`, err.message);
      }
    }

    const doc = {
      _id: `resource-${r.slug}`,
      _type: 'resource',
      title: r.title,
      slug: { _type: 'slug', current: r.slug },
      description: r.description,
      category: r.category,
      type: r.type,
      status: r.status,
      order: r.order,
      actionLabel: r.actionLabel,
      tags: r.tags,
      whatsIncluded: r.whatsIncluded,
      whoItsFor: r.whoItsFor,
    };

    if (r.featured) doc.featured = true;
    if (r.price) doc.price = r.price;
    if (r.currency) doc.currency = r.currency;
    if (r.accessUrl) doc.accessUrl = r.accessUrl;
    if (r.externalUrl) doc.externalUrl = r.externalUrl;
    if (r.whatsappUrl) doc.whatsappUrl = r.whatsappUrl;
    if (imageAssetId) doc.primaryImage = { _type: 'image', asset: { _type: 'reference', _ref: imageAssetId } };

    await client.createOrReplace(doc);
    console.log(`✓ resource: ${r.title}`);
  }
}

async function main() {
  console.log(`Seeding project ${process.env.SANITY_PROJECT_ID} / dataset ${process.env.SANITY_DATASET}\n`);
  await seedSiteSettings();
  await seedBuilderManifesto();
  await seedFaqItems();
  await seedFounder();
  await seedSubjects();
  await seedResources();
  await seedArticleCategories();
  await seedFirstArticle();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
