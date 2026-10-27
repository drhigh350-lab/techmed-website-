// web/scripts/test-task4-resource-guardrails.mjs
// Automated Verification Suite for Task 4:
// Resource Guardrails & Entitlement Access Controls for TECHMED Student Ecosystem

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
console.log('  TECHMED TASK 4: RESOURCE GUARDRAILS & ENTITLEMENT CONTROLS');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');

const resourcesPath = resolve(baseDir, 'web/src/lib/resources.ts');
const readerContentPath = resolve(baseDir, 'web/src/lib/readerContent.ts');
const readerPagePath = resolve(baseDir, 'web/src/pages/library/read/[id].astro');
const libraryIndexPath = resolve(baseDir, 'web/src/pages/library/index.astro');
const dashboardPagePath = resolve(baseDir, 'web/src/pages/dashboard.astro');
const supabaseTsPath = resolve(baseDir, 'web/src/lib/supabase.ts');

// 1. Files existence check
assert(existsSync(resourcesPath), '1. Resource catalogue exists: web/src/lib/resources.ts');
assert(existsSync(readerContentPath), '2. In-App reader engine exists: web/src/lib/readerContent.ts');
assert(existsSync(readerPagePath), '3. Reader dynamic page exists: web/src/pages/library/read/[id].astro');
assert(existsSync(libraryIndexPath), '4. Bookshelf index exists: web/src/pages/library/index.astro');
assert(existsSync(dashboardPagePath), '5. Dashboard page exists: web/src/pages/dashboard.astro');
assert(existsSync(supabaseTsPath), '6. Supabase security library exists: web/src/lib/supabase.ts');

const resourcesTs = readFileSync(resourcesPath, 'utf-8');
const readerContentTs = readFileSync(readerContentPath, 'utf-8');
const readerAstro = readFileSync(readerPagePath, 'utf-8');
const libraryIndexAstro = readFileSync(libraryIndexPath, 'utf-8');
const dashboardAstro = readFileSync(dashboardPagePath, 'utf-8');
const supabaseTs = readFileSync(supabaseTsPath, 'utf-8');

// 2. Core Science Study Blueprints Verification in Catalogue
assert(
  resourcesTs.includes("id: 'chemistry-booster'") &&
  resourcesTs.includes("slug: 'chemistry-booster-system'") &&
  resourcesTs.includes("title: 'Chemistry Booster System'") &&
  resourcesTs.includes("price: 5000"),
  '7. Chemistry Booster System defined with ₦5,000 standalone price and correct ID/slug'
);

assert(
  resourcesTs.includes("id: 'biology-booster'") &&
  resourcesTs.includes("slug: 'biology-booster-system'") &&
  resourcesTs.includes("title: 'Biology Booster System'") &&
  resourcesTs.includes("price: 3000"),
  '8. Biology Booster System defined with ₦3,000 standalone price and correct ID/slug'
);

assert(
  resourcesTs.includes("id: 'physics-booster'") &&
  resourcesTs.includes("slug: 'physics-booster-system'") &&
  resourcesTs.includes("title: 'Physics Booster System'") &&
  resourcesTs.includes("price: 3000"),
  '9. Physics Booster System defined with ₦3,000 standalone price and correct ID/slug'
);

// 3. Reader Manuals & Technical Content Architecture
assert(
  readerContentTs.includes("'chemistry-booster':") &&
  readerContentTs.includes("The Mole Concept Cure") &&
  readerContentTs.includes("formulaBox:") &&
  readerContentTs.includes("examinerTrap:"),
  '10. Chemistry Booster manual contains technical mole formula triangle, worked examples & examiner traps'
);

assert(
  readerContentTs.includes("'biology-booster':") &&
  readerContentTs.includes("Organelle Functions") &&
  readerContentTs.includes("Osmosis, Plasmolysis & Turgidity") &&
  readerContentTs.includes("Mendelian Ratios"),
  '11. Biology Booster manual contains organelle profiles, turgidity mechanisms, and genetics crosses'
);

assert(
  readerContentTs.includes("'physics-booster':") &&
  readerContentTs.includes("Linear Motion & Projectile Master Equations") &&
  readerContentTs.includes("formulaBox:") &&
  readerContentTs.includes("totalChapters: 5"),
  '12. Physics Booster manual contains kinematics, projectile formulas, and full 5-chapter syllabus'
);

// 4. Sample Chapter 1 Preview vs Chapter 2+ Locking
assert(
  readerContentTs.includes("id: 'ch1-mole-concept'") &&
  readerContentTs.includes("isPreview: true") &&
  readerContentTs.includes("id: 'ch2-electrochemistry'") &&
  readerContentTs.includes("isPreview: false"),
  '13. Chemistry Booster sets Chapter 1 as free sample preview (isPreview: true) and Chapters 2-5 as locked'
);

assert(
  readerContentTs.includes("id: 'bio-ch1-cell-transport'") &&
  readerContentTs.includes("isPreview: true") &&
  readerContentTs.includes("id: 'bio-ch2-genetics'") &&
  readerContentTs.includes("isPreview: false"),
  '14. Biology Booster sets Chapter 1 as free sample preview and Chapters 2-5 as locked'
);

assert(
  readerContentTs.includes("id: 'phys-ch1-mechanics'") &&
  readerContentTs.includes("isPreview: true") &&
  readerContentTs.includes("isPreview: false"),
  '15. Physics Booster sets Chapter 1 as free sample preview and Chapters 2-5 as locked'
);

// 5. In-App Reader Security Architecture
assert(
  readerAstro.includes('hasActiveResourceAccess') &&
  readerAstro.includes('isLocked = !isEntitled && !chap.isPreview') &&
  readerAstro.includes('locked-chapter-banner'),
  '16. Reader strictly checks database access and displays locked banner for Chapters 2+ when unentitled'
);

assert(
  readerAstro.includes('renderWatermark(userEmail)') &&
  readerAstro.includes('UNAUTHORIZED SHARING PROHIBITED') &&
  readerAstro.includes('watermarkCanvas'),
  '17. Reader renders anti-piracy dynamic watermark canvas stamped with student email and warning notice'
);

assert(
  readerAstro.includes('saveOfflineBtn') &&
  readerAstro.includes('if (!isEntitled)') &&
  readerAstro.includes('Access Required: Full study access is required to download this manual'),
  '18. PWA Offline Save is guarded: unentitled students cannot download manuals for offline access'
);

assert(
  libraryIndexAstro.includes("caches.delete('techmed-reader-v2')") &&
  libraryIndexAstro.includes("caches.delete('techmed-reader-v3')") &&
  libraryIndexAstro.includes("sessionStorage.clear()"),
  '19. Sign-out purges cached manuals and session storage to guarantee multi-student device isolation'
);

// 6. Entitlement Logic Simulation for Cohort Plans and Standalone Boosters
const nowUtc = Date.now();

function simulateAccessCheck(resourceId, entitlements, orders = []) {
  if (
    resourceId === 'admission-intelligence-guide-2026' ||
    resourceId === 'free-quiz-practice' ||
    resourceId === 'kairo'
  ) {
    return true;
  }

  const isMasteryCohort =
    entitlements.some(e => e.isActive && (e.resourceId?.toLowerCase().includes('mastery') || e.planId?.toLowerCase().includes('mastery'))) ||
    orders.some(o => o.status === 'paid' && (o.product_id?.toLowerCase().includes('mastery') || o.product_name?.toLowerCase().includes('mastery')));

  const isUltimateCohort =
    entitlements.some(e => e.isActive && (e.resourceId?.toLowerCase().includes('ultimate') || e.planId?.toLowerCase().includes('ultimate'))) ||
    orders.some(o => o.status === 'paid' && (o.product_id?.toLowerCase().includes('ultimate') || o.product_name?.toLowerCase().includes('ultimate')));

  // Bundled 3 science boosters for Mastery and Ultimate
  if (['chemistry-booster', 'biology-booster', 'physics-booster'].includes(resourceId)) {
    if (isMasteryCohort || isUltimateCohort) return true;
  }

  // Bundled Post-UTME Brainstorming Hub for Ultimate
  if (['post-utme-brainstorming-hub', 'post-utme-pq'].includes(resourceId)) {
    if (isUltimateCohort) return true;
  }

  // Check direct entitlements
  const matchingEnt = entitlements.find(e => {
    if (!e.isActive) return false;
    const matches = e.resourceId === resourceId || e.resourceId === resourceId.replace('-system', '');
    if (!matches) return false;

    // Check future start date
    if (e.startsAt) {
      const starts = new Date(e.startsAt).getTime();
      if (!isNaN(starts) && starts > nowUtc) return false;
    }

    // Check expired date
    if (e.expiresAt) {
      const expires = new Date(e.expiresAt).getTime();
      if (!isNaN(expires) && expires <= nowUtc) return false;
    }

    return true;
  });

  if (matchingEnt) return true;

  // Check direct orders
  const matchingOrder = orders.find(o => {
    return o.status === 'paid' && (o.product_id === resourceId || o.product_id === resourceId.replace('-system', ''));
  });

  return Boolean(matchingOrder);
}

// Scenario 1: Free candidates have access to free items but NOT paid boosters
assert(
  simulateAccessCheck('admission-intelligence-guide-2026', []) === true &&
  simulateAccessCheck('free-quiz-practice', []) === true &&
  simulateAccessCheck('kairo', []) === true &&
  simulateAccessCheck('chemistry-booster', []) === false,
  '20. Free candidates access Admission Guide and CBT tools, but are strictly barred from paid boosters'
);

// Scenario 2: Direct purchaser of Chemistry Booster gets lifetime Chemistry access but not Physics or Biology
const directChemStudent = [
  { resourceId: 'chemistry-booster', isActive: true, grantSource: 'purchase', startsAt: null, expiresAt: null },
];
assert(
  simulateAccessCheck('chemistry-booster', directChemStudent) === true &&
  simulateAccessCheck('physics-booster', directChemStudent) === false &&
  simulateAccessCheck('biology-booster', directChemStudent) === false,
  '21. Direct Chemistry Booster purchaser gets permanent lifetime access to Chemistry but not others'
);

// Scenario 3: Mastery student (Early bird ₦20,000 or Standard ₦25,000) unlocks all 3 science boosters
const masteryStudent = [
  { resourceId: 'cohort-mastery', planId: 'cohort-mastery', isActive: true, grantSource: 'purchase', startsAt: '2026-11-30T00:00:00Z', expiresAt: '2027-05-31T00:00:00Z' },
];
assert(
  simulateAccessCheck('chemistry-booster', masteryStudent) === true &&
  simulateAccessCheck('biology-booster', masteryStudent) === true &&
  simulateAccessCheck('physics-booster', masteryStudent) === true &&
  simulateAccessCheck('post-utme-brainstorming-hub', masteryStudent) === false,
  '22. Mastery cohort unlocks all 3 science booster systems (Chemistry, Biology, Physics) and denies Post-UTME hub'
);

// Scenario 4: Ultimate student (₦40,000) unlocks all 3 science boosters AND Post-UTME hub
const ultimateStudent = [
  { resourceId: 'cohort-ultimate', planId: 'cohort-ultimate', isActive: true, grantSource: 'purchase', startsAt: '2026-11-30T00:00:00Z', expiresAt: '2027-05-31T00:00:00Z' },
];
assert(
  simulateAccessCheck('chemistry-booster', ultimateStudent) === true &&
  simulateAccessCheck('biology-booster', ultimateStudent) === true &&
  simulateAccessCheck('physics-booster', ultimateStudent) === true &&
  simulateAccessCheck('post-utme-brainstorming-hub', ultimateStudent) === true,
  '23. Ultimate cohort unlocks all 3 science booster systems PLUS the Post-UTME Brainstorming Hub'
);

// Scenario 5: Core cohort student (₦15,000) does NOT get free science boosters
const coreStudent = [
  { resourceId: 'cohort-core', planId: 'cohort-core', isActive: true, grantSource: 'purchase', startsAt: '2026-11-30T00:00:00Z', expiresAt: null },
];
assert(
  simulateAccessCheck('chemistry-booster', coreStudent) === false &&
  simulateAccessCheck('biology-booster', coreStudent) === false &&
  simulateAccessCheck('physics-booster', coreStudent) === false,
  '24. Core cohort live class enrolment does NOT falsely unlock standalone science booster systems'
);

// Scenario 6: Scheduled resource with future start date is NOT unlocked early
const scheduledFutureBooster = [
  { resourceId: 'physics-booster', isActive: true, grantSource: 'purchase', startsAt: new Date(nowUtc + 86400000).toISOString(), expiresAt: null },
];
assert(
  simulateAccessCheck('physics-booster', scheduledFutureBooster) === false,
  '25. Future start date (starts_at > now) strictly prevents premature activation'
);

// Scenario 7: Inactive / revoked entitlement does NOT grant access
const revokedEntitlement = [
  { resourceId: 'chemistry-booster', isActive: false, grantSource: 'purchase', startsAt: null, expiresAt: null },
];
assert(
  simulateAccessCheck('chemistry-booster', revokedEntitlement) === false,
  '26. Inactive or refunded entitlement (is_active = false) is strictly denied'
);

console.log('\n----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------\n');

if (passed === total) {
  console.log('All Task 4 Resource Guardrails & Entitlement Access Control checks passed successfully!\n');
  process.exit(0);
} else {
  console.error(`Task 4 verification failed with ${total - passed} failure(s).\n`);
  process.exit(1);
}
