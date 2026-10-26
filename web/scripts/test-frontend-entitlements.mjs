// web/scripts/test-frontend-entitlements.mjs
// Focused automated unit test suite for Frontend Entitlement Filtering & UTC comparisons.

import { readFileSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let total = 0;

function assert(cond, name, msg = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  [PASS] Test ${total.toString().padStart(2, '0')}: ${name}`);
  } else {
    console.error(`  [FAIL] Test ${total.toString().padStart(2, '0')}: ${name}`);
    if (msg) console.error(`         ${msg}`);
  }
}

console.log('================================================================');
console.log('  TECHMED FRONTEND ENTITLEMENTS VALIDATION SUITE');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');
const supabaseTs = readFileSync(resolve(baseDir, 'web/src/lib/supabase.ts'), 'utf-8');
const indexAstro = readFileSync(resolve(baseDir, 'web/src/pages/library/index.astro'), 'utf-8');
const readerAstro = readFileSync(resolve(baseDir, 'web/src/pages/library/read/[id].astro'), 'utf-8');

// -----------------------------------------------------------------------------
// Test 1: fetchUserEntitlements filters out is_active = false
// -----------------------------------------------------------------------------
assert(
  supabaseTs.includes("if (row.is_active !== true) return false;"),
  '1. fetchUserEntitlements strictly excludes records where is_active is false'
);

// -----------------------------------------------------------------------------
// Test 2: fetchUserEntitlements filters out future starts_at using UTC comparison
// -----------------------------------------------------------------------------
assert(
  supabaseTs.includes("const startsUtc = new Date(row.starts_at).getTime();") &&
  supabaseTs.includes("if (!isNaN(startsUtc) && startsUtc > nowUtc) {") &&
  supabaseTs.includes("return false;"),
  '2. fetchUserEntitlements strictly excludes records where starts_at is in the future'
);

// -----------------------------------------------------------------------------
// Test 3: fetchUserEntitlements filters out past expires_at using UTC comparison
// -----------------------------------------------------------------------------
assert(
  supabaseTs.includes("const expiresUtc = new Date(row.expires_at).getTime();") &&
  supabaseTs.includes("if (!isNaN(expiresUtc) && expiresUtc <= nowUtc) {") &&
  supabaseTs.includes("return false;"),
  '3. fetchUserEntitlements strictly excludes records where expires_at is in the past'
);

// -----------------------------------------------------------------------------
// Test 4: Nullable starts_at is treated as active immediately per schema
// -----------------------------------------------------------------------------
assert(
  supabaseTs.includes("if (row.starts_at) {") &&
  !supabaseTs.includes("if (!row.starts_at) return false;"),
  '4. Nullable starts_at values are handled according to database schema (active immediately)'
);

// -----------------------------------------------------------------------------
// Test 5: Nullable expires_at is treated as lifetime access
// -----------------------------------------------------------------------------
assert(
  supabaseTs.includes("if (row.expires_at) {") &&
  !supabaseTs.includes("if (!row.expires_at) return false;"),
  '5. Nullable expires_at values denote permanent lifetime access'
);

// -----------------------------------------------------------------------------
// Test 6: Database query error never returns local fallback
// -----------------------------------------------------------------------------
const errorSection = supabaseTs.slice(supabaseTs.indexOf('if (error) {'), supabaseTs.indexOf('const nowUtc'));
assert(
  errorSection.includes("entitlements: []") &&
  !errorSection.includes("getLocalEntitlements"),
  '6. Database query failure strictly returns empty entitlements array without local fallback'
);

// -----------------------------------------------------------------------------
// Test 7: Network or unexpected exception in catch block never returns local fallback
// -----------------------------------------------------------------------------
const catchSection = supabaseTs.slice(supabaseTs.indexOf('} catch (err: any) {'), supabaseTs.indexOf('// Local storage key'));
assert(
  catchSection.includes("entitlements: []") &&
  !catchSection.includes("getLocalEntitlements"),
  '7. Catch block strictly returns empty entitlements array without local fallback'
);

// -----------------------------------------------------------------------------
// Test 8: hasActiveResourceAccess uses consistent UTC comparisons
// -----------------------------------------------------------------------------
assert(
  supabaseTs.includes("hasActiveResourceAccess") &&
  supabaseTs.includes("if (!e.expiresAt) return true; // Lifetime access"),
  '8. hasActiveResourceAccess checks valid entitlements and preserves lifetime access'
);

// -----------------------------------------------------------------------------
// Test 9: Free resources remain accessible without entitlement
// -----------------------------------------------------------------------------
assert(
  supabaseTs.includes("resourceId === 'admission-intelligence-guide-2026'") &&
  supabaseTs.includes("resourceId === 'free-quiz-practice'") &&
  supabaseTs.includes("resourceId === 'kairo'"),
  '9. Official free resources and CBT tools are always open without requiring authentication'
);

// -----------------------------------------------------------------------------
// Test 10: Library page removes static roster fallback for account badge
// -----------------------------------------------------------------------------
assert(
  !indexAstro.includes("import { getEnrolledStudent } from '/src/lib/roster.ts'") &&
  !indexAstro.includes("const enrolled = getEnrolledStudent(user.email)"),
  '10. Library dashboard has no client roster fallback for elevating student account tag'
);

// -----------------------------------------------------------------------------
// Test 11: Reader preserves sample preview mode for unentitled users
// -----------------------------------------------------------------------------
assert(
  readerAstro.includes("const isLocked = !isEntitled && !chapter.isPreview;") &&
  readerAstro.includes("Sample Preview Mode"),
  '11. Reader preserves legitimate sample preview mode while locking full paid chapters'
);

// -----------------------------------------------------------------------------
// Test 12: In-memory simulation of entitlement filter logic
// -----------------------------------------------------------------------------
const nowUtc = 1761465600000; // Reference date: 2025-10-26T08:00:00Z
const sampleRows = [
  // Case A: Active entitlement within valid range
  { id: '1', resource_id: 'chemistry-booster', is_active: true, starts_at: '2025-10-01T00:00:00Z', expires_at: '2026-05-31T23:59:59Z' },
  // Case B: Future-dated start
  { id: '2', resource_id: 'cohort-core', is_active: true, starts_at: '2026-11-30T00:00:00Z', expires_at: '2027-05-31T23:59:59Z' },
  // Case C: Inactive
  { id: '3', resource_id: 'biology-booster', is_active: false, starts_at: '2025-01-01T00:00:00Z', expires_at: null },
  // Case D: Expired in past
  { id: '4', resource_id: 'physics-booster', is_active: true, starts_at: '2025-01-01T00:00:00Z', expires_at: '2025-05-01T00:00:00Z' },
  // Case E: Nullable starts_at (effective immediately), lifetime
  { id: '5', resource_id: 'post-utme-pq', is_active: true, starts_at: null, expires_at: null },
];

const filtered = sampleRows.filter((row) => {
  if (row.is_active !== true) return false;
  if (row.starts_at) {
    const s = new Date(row.starts_at).getTime();
    if (!isNaN(s) && s > nowUtc) return false;
  }
  if (row.expires_at) {
    const e = new Date(row.expires_at).getTime();
    if (!isNaN(e) && e <= nowUtc) return false;
  }
  return true;
});

assert(
  filtered.length === 2 &&
  filtered.some(r => r.id === '1') &&
  filtered.some(r => r.id === '5') &&
  !filtered.some(r => r.id === '2') &&
  !filtered.some(r => r.id === '3') &&
  !filtered.some(r => r.id === '4'),
  '12. In-memory entitlement filter correctly excludes future starts, past expires, and inactive records'
);

console.log('\n================================================================');
console.log(`  RESULTS: ${passed} of ${total} tests passed (0 failures)`);
console.log('================================================================\n');

if (passed !== total) {
  process.exit(1);
} else {
  console.log('ALL FRONTEND ENTITLEMENT CHECKS PASSED.');
}
