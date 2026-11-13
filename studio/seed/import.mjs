// Imports JSON documents into Sanity. Never overwrites: uses createIfNotExists,
// so anything the founder has already edited in the Studio is left alone.
// Usage: SANITY_WRITE_TOKEN=... node studio/seed/import.mjs studio/seed/<file>.json [...]
import { readFileSync } from 'node:fs';

const PROJECT = 'kxoz58eb';
const DATASET = 'production';
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error('::error::Add the SANITY_IMPORT_TOKEN repository secret (Sanity Editor token from project kxoz58eb).');
  process.exit(1);
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Give one or more JSON files to import.');
  process.exit(1);
}

let created = 0;
for (const file of files) {
  const docs = JSON.parse(readFileSync(file, 'utf8'));
  for (let i = 0; i < docs.length; i += 50) {
    const batch = docs.slice(i, i + 50);
    const res = await fetch(`https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}?returnIds=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: batch.map((doc) => ({ createIfNotExists: doc })) }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error(`::error::Sanity rejected ${file}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
      process.exit(1);
    }
    created += (body.results || []).filter((r) => r.operation === 'create').length;
  }
  console.log(`${file}: ${docs.length} document(s) checked`);
}
console.log(`Done. ${created} new document(s) created; existing ones left unchanged.`);
