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
        'Tap "Become a Builder" to join the TECHMED WhatsApp Channel — that\'s where onboarding, your Builder Cohort assignment, and everything else begins.',
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

async function main() {
  console.log(`Seeding project ${process.env.SANITY_PROJECT_ID} / dataset ${process.env.SANITY_DATASET}\n`);
  await seedSiteSettings();
  await seedBuilderManifesto();
  await seedFaqItems();
  await seedFounder();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
