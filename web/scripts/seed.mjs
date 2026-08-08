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

async function main() {
  console.log(`Seeding project ${process.env.SANITY_PROJECT_ID} / dataset ${process.env.SANITY_DATASET}\n`);
  await seedSiteSettings();
  await seedBuilderManifesto();
  await seedFaqItems();
  await seedFounder();
  await seedSubjects();
  await seedArticleCategories();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
