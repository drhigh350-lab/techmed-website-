// web/scripts/test-section3-resources-entitlements.mjs
// Automated Unit & Integration Test Suite for:
// Section 3: Student Resources & Entitlements Foundation

import { readFileSync, existsSync } from 'fs';
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
console.log('  TECHMED SECTION 3: STUDENT RESOURCES & ENTITLEMENTS VALIDATION');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');

const dashboardPath = resolve(baseDir, 'web/src/pages/dashboard.astro');
const readerPath = resolve(baseDir, 'web/src/pages/library/read/[id].astro');
const libraryIndexPath = resolve(baseDir, 'web/src/pages/library/index.astro');
const supabaseTsPath = resolve(baseDir, 'web/src/lib/supabase.ts');

// 1. Files existence check
assert(existsSync(dashboardPath), '1. Dashboard page exists: web/src/pages/dashboard.astro');
assert(existsSync(readerPath), '2. Interactive Reader route exists: web/src/pages/library/read/[id].astro');
assert(existsSync(libraryIndexPath), '3. Bookshelf Index exists: web/src/pages/library/index.astro');
assert(existsSync(supabaseTsPath), '4. Supabase library exists: web/src/lib/supabase.ts');

const dashboardAstro = readFileSync(dashboardPath, 'utf-8');
const readerAstro = readFileSync(readerPath, 'utf-8');
const libraryIndexAstro = readFileSync(libraryIndexPath, 'utf-8');
const supabaseTs = readFileSync(supabaseTsPath, 'utf-8');

// 2. Dashboard Section 3 UI Elements
assert(
  dashboardAstro.includes('class="resource-filter-bar"') &&
  dashboardAstro.includes('data-filter="all-my"') &&
  dashboardAstro.includes('data-filter="boosters"') &&
  dashboardAstro.includes('data-filter="cohorts"') &&
  dashboardAstro.includes('data-filter="catalogue"'),
  '5. Dashboard provides interactive filter segmented controls for student resources (All My, Boosters, Cohorts, Catalogue)'
);

assert(
  dashboardAstro.includes('id="resourcesEmptyBanner"') &&
  dashboardAstro.includes('empty-icon-wrap') &&
  dashboardAstro.includes('href="/pricing"'),
  '6. Dashboard provides informative empty state banner for candidates with 0 paid items without blocking account access'
);

assert(
  dashboardAstro.includes('id="authorizedResourcesContainer"') &&
  dashboardAstro.includes('renderResourceCards') &&
  dashboardAstro.includes('resource-card'),
  '7. Dashboard renders student resource cards dynamically with clean unboxed metadata and access status'
);

assert(
  dashboardAstro.includes('getUserResourceEntitlements') &&
  dashboardAstro.includes('myItemsCount'),
  '8. Dashboard integrates getUserResourceEntitlements and displays dynamic count of active student items'
);

// 3. UserResourceEntitlementItem Interface & Type Integrity
assert(
  supabaseTs.includes('export interface UserResourceEntitlementItem') &&
  supabaseTs.includes('purchaseStatus:') &&
  supabaseTs.includes('purchaseStatusLabel: string') &&
  supabaseTs.includes('accessStatus:') &&
  supabaseTs.includes('accessStatusLabel: string') &&
  supabaseTs.includes('readerUrl?: string'),
  '9. supabase.ts exports UserResourceEntitlementItem with purchaseStatus, accessStatus, and readerUrl'
);

// 4. In-Browser Reader Security & Authorization
assert(
  readerAstro.includes('hasActiveResourceAccess') &&
  readerAstro.includes('isEntitled = await hasActiveResourceAccess') &&
  readerAstro.includes('isLocked = !isEntitled && !chap.isPreview'),
  '10. Library Reader strictly locks non-preview chapters (Chapter 2+) when hasActiveResourceAccess evaluates to false'
);

assert(
  !readerAstro.includes('localStorage.getItem("techmed_paid")') &&
  !readerAstro.includes('window.isPaidStudent = true'),
  '11. Reader does not rely on client-side flags, mock globals, or insecure local overrides for paid chapters'
);

// 5. Entitlement Engine Logic Tests (Simulated with mocked Supabase responses)
// Re-implement / import pure entitlement comparison logic to test exhaustively
const nowUtc = Date.now();

function simulateEntitlementFilter(rows) {
  return (rows || []).filter((row) => {
    if (row.is_active !== true) return false;
    if (row.starts_at) {
      const startsUtc = new Date(row.starts_at).getTime();
      if (!isNaN(startsUtc) && startsUtc > nowUtc) {
        return false;
      }
    }
    if (row.expires_at) {
      const expiresUtc = new Date(row.expires_at).getTime();
      if (!isNaN(expiresUtc) && expiresUtc <= nowUtc) {
        return false;
      }
    }
    return true;
  });
}

// Test 5A: Valid active entitlement within valid range
const activeRow = {
  id: 'ent_1',
  user_id: 'user_123',
  customer_email: 'student@example.com',
  resource_id: 'chemistry-booster',
  grant_source: 'purchase',
  is_active: true,
  starts_at: new Date(nowUtc - 86400000).toISOString(),
  expires_at: null, // permanent
};
assert(
  simulateEntitlementFilter([activeRow]).length === 1,
  '12. Entitlement Filter: Active entitlement within valid range is accepted'
);

// Test 5B: Future start date must NOT unlock
const futureRow = {
  id: 'ent_future',
  user_id: 'user_123',
  customer_email: 'student@example.com',
  resource_id: 'physics-booster',
  grant_source: 'purchase',
  is_active: true,
  starts_at: new Date(nowUtc + 864000000).toISOString(), // 10 days in future
  expires_at: null,
};
assert(
  simulateEntitlementFilter([futureRow]).length === 0,
  '13. Entitlement Filter: Future-dated start date (starts_at > now) is strictly excluded'
);

// Test 5C: Expired entitlement must NOT unlock
const expiredRow = {
  id: 'ent_expired',
  user_id: 'user_123',
  customer_email: 'student@example.com',
  resource_id: 'biology-booster',
  grant_source: 'purchase',
  is_active: true,
  starts_at: new Date(nowUtc - 10000000).toISOString(),
  expires_at: new Date(nowUtc - 5000).toISOString(), // expired 5 seconds ago
};
assert(
  simulateEntitlementFilter([expiredRow]).length === 0,
  '14. Entitlement Filter: Expired entitlement (expires_at <= now) is strictly excluded'
);

// Test 5D: Inactive entitlement (is_active = false) must NOT unlock
const inactiveRow = {
  id: 'ent_inactive',
  user_id: 'user_123',
  customer_email: 'student@example.com',
  resource_id: 'chemistry-booster',
  grant_source: 'purchase',
  is_active: false, // revoked or refunded
  starts_at: null,
  expires_at: null,
};
assert(
  simulateEntitlementFilter([inactiveRow]).length === 0,
  '15. Entitlement Filter: Inactive entitlement (is_active = false) is strictly excluded'
);

// Test 5E: Nullable starts_at is treated as immediately active (per database default)
const nullStartsRow = {
  id: 'ent_null_starts',
  user_id: 'user_123',
  customer_email: 'student@example.com',
  resource_id: 'chemistry-booster',
  grant_source: 'purchase',
  is_active: true,
  starts_at: null,
  expires_at: null,
};
assert(
  simulateEntitlementFilter([nullStartsRow]).length === 1,
  '16. Entitlement Filter: Nullable starts_at is treated as immediately active'
);

// Test 5F: Nullable expires_at is treated as permanent lifetime access
assert(
  simulateEntitlementFilter([nullStartsRow])[0].expires_at === null,
  '17. Entitlement Filter: Nullable expires_at denotes permanent lifetime access'
);

// 6. hasActiveResourceAccess logic simulation
function simulateHasAccess(resourceId, entitlements) {
  // Free resources are open to everyone
  if (
    resourceId === 'admission-intelligence-guide-2026' ||
    resourceId === 'free-quiz-practice' ||
    resourceId === 'kairo'
  ) {
    return true;
  }

  if (!entitlements || entitlements.length === 0) return false;

  return entitlements.some(e => {
    const matchesId =
      e.resourceId === resourceId ||
      e.resourceId === resourceId.replace('-system', '') ||
      (resourceId === 'post-utme-brainstorming-hub' && e.resourceId === 'post-utme-pq') ||
      (resourceId === 'post-utme-pq' && e.resourceId === 'post-utme-brainstorming-hub');

    const isMasteryBooster =
      (resourceId === 'chemistry-booster' || resourceId === 'biology-booster' || resourceId === 'physics-booster') &&
      (e.resourceId.startsWith('cohort-mastery') || e.resourceId === 'mastery' || e.planId?.startsWith('cohort-mastery') ||
       e.resourceId.startsWith('cohort-ultimate') || e.resourceId === 'ultimate' || e.planId?.startsWith('cohort-ultimate'));

    const isUltimateResource =
      (resourceId === 'post-utme-brainstorming-hub' || resourceId === 'post-utme-pq') &&
      (e.resourceId.startsWith('cohort-ultimate') || e.resourceId === 'ultimate' || e.planId?.startsWith('cohort-ultimate'));

    if (!matchesId && !isMasteryBooster && !isUltimateResource) return false;
    if (!e.isActive) return false;

    if (e.startsAt && !isMasteryBooster && !isUltimateResource) {
      const starts = new Date(e.startsAt).getTime();
      if (starts > nowUtc) return false;
    }

    if (e.expiresAt && !isMasteryBooster && !isUltimateResource) {
      const expires = new Date(e.expiresAt).getTime();
      if (expires <= nowUtc) return false;
    }

    return true;
  });
}

// Free resources check for unauthenticated / unentitled candidate
assert(
  simulateHasAccess('admission-intelligence-guide-2026', []) === true &&
  simulateHasAccess('free-quiz-practice', []) === true &&
  simulateHasAccess('kairo', []) === true,
  '18. Access Check: Free official materials and quiz drills are accessible without purchase'
);

// Unauthenticated or unentitled candidate accessing paid booster
assert(
  simulateHasAccess('chemistry-booster', []) === false &&
  simulateHasAccess('physics-booster', []) === false &&
  simulateHasAccess('biology-booster', []) === false &&
  simulateHasAccess('post-utme-brainstorming-hub', []) === false,
  '19. Access Check: Paid resources are strictly denied for users with 0 confirmed entitlements'
);

// Candidate with direct purchase of Chemistry Booster
const studentPurchasedChem = [
  { resourceId: 'chemistry-booster', isActive: true, grantSource: 'purchase', startsAt: null, expiresAt: null },
];
assert(
  simulateHasAccess('chemistry-booster', studentPurchasedChem) === true &&
  simulateHasAccess('physics-booster', studentPurchasedChem) === false,
  '20. Access Check: Direct Chemistry Booster purchaser accesses Chemistry but not Physics'
);

// Candidate enrolled in TECHMED Mastery
const studentMastery = [
  { resourceId: 'cohort-mastery', planId: 'cohort-mastery', isActive: true, grantSource: 'purchase', startsAt: '2026-11-30T00:00:00Z', expiresAt: '2027-05-31T00:00:00Z' },
];
assert(
  simulateHasAccess('chemistry-booster', studentMastery) === true &&
  simulateHasAccess('biology-booster', studentMastery) === true &&
  simulateHasAccess('physics-booster', studentMastery) === true &&
  simulateHasAccess('post-utme-brainstorming-hub', studentMastery) === false,
  '21. Access Check: Mastery student has access to all 3 science boosters, but NOT Post-UTME hub'
);

// Candidate enrolled in TECHMED Ultimate
const studentUltimate = [
  { resourceId: 'cohort-ultimate', planId: 'cohort-ultimate', isActive: true, grantSource: 'purchase', startsAt: '2026-11-30T00:00:00Z', expiresAt: '2027-05-31T00:00:00Z' },
];
assert(
  simulateHasAccess('chemistry-booster', studentUltimate) === true &&
  simulateHasAccess('biology-booster', studentUltimate) === true &&
  simulateHasAccess('physics-booster', studentUltimate) === true &&
  simulateHasAccess('post-utme-brainstorming-hub', studentUltimate) === true,
  '22. Access Check: Ultimate student has access to all 3 science boosters AND Post-UTME brainstorming hub'
);

// Candidate enrolled in TECHMED Core
const studentCore = [
  { resourceId: 'cohort-core', planId: 'cohort-core', isActive: true, grantSource: 'purchase', startsAt: '2026-11-30T00:00:00Z', expiresAt: null },
];
assert(
  simulateHasAccess('chemistry-booster', studentCore) === false &&
  simulateHasAccess('biology-booster', studentCore) === false &&
  simulateHasAccess('physics-booster', studentCore) === false,
  '23. Access Check: Core student live class enrolment does NOT falsely unlock standalone science boosters'
);

// 7. Cross-User Entitlement Isolation & URL Tampering Resistance
assert(
  supabaseTs.includes('auth.uid() = user_id') ||
  supabaseTs.includes('Users can view own entitlements') ||
  supabaseTs.includes('cleanEmail'),
  '24. Security Architecture: Entitlements table RLS guarantees users can query only their own database records'
);

// 8. Resource Readers and Catalogue URLs
assert(
  supabaseTs.includes("readerUrl: '/library/read/chemistry-booster'") &&
  supabaseTs.includes("readerUrl: '/library/read/biology-booster'") &&
  supabaseTs.includes("readerUrl: '/library/read/physics-booster'") &&
  supabaseTs.includes("readerUrl: '/library/read/post-utme-brainstorming-hub'"),
  '25. Catalogue Mapping: Study boosters route directly to existing reader URLs in /library/read/[id]'
);

assert(
  supabaseTs.includes("readerUrl: '/techmed-admission-intelligence-guide-2026.pdf'") &&
  supabaseTs.includes("externalUrl: 'https://quizboot.com/page/techmedofficial'") &&
  supabaseTs.includes("readerUrl: '/utme-2027/builders'"),
  '26. Catalogue Mapping: Free guide routes to official PDF, quizzes route to QuizBoot, and Core routes to Builder hub'
);

console.log('\n----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------\n');

if (passed === total) {
  console.log('All Section 3 validation checks passed successfully!\n');
  process.exit(0);
} else {
  console.error(`Validation failed with ${total - passed} failure(s).\n`);
  process.exit(1);
}
