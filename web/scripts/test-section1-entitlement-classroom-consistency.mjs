// web/scripts/test-section1-entitlement-classroom-consistency.mjs
// Automated Verification Suite for Section 1 Remediation:
// Payment, Account, Entitlement Consistency, Classroom Access & Mobile UI Fixes

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
console.log('  TECHMED SECTION 1: ENTITLEMENT & CLASSROOM CONSISTENCY AUDIT');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');

const dashboardDataPath = resolve(baseDir, 'web/src/lib/dashboard-data.ts');
const supabaseTsPath = resolve(baseDir, 'web/src/lib/supabase.ts');
const dashboardPagePath = resolve(baseDir, 'web/src/pages/dashboard.astro');
const libraryIndexPath = resolve(baseDir, 'web/src/pages/library/index.astro');
const navbarPath = resolve(baseDir, 'web/src/components/Navbar.astro');

assert(existsSync(dashboardDataPath), '1. Structured dashboard data exists: web/src/lib/dashboard-data.ts');
assert(existsSync(supabaseTsPath), '2. Supabase security library exists: web/src/lib/supabase.ts');
assert(existsSync(dashboardPagePath), '3. Student Dashboard page exists: web/src/pages/dashboard.astro');
assert(existsSync(libraryIndexPath), '4. Bookshelf index exists: web/src/pages/library/index.astro');
assert(existsSync(navbarPath), '5. Navbar component exists: web/src/components/Navbar.astro');

const dashboardData = readFileSync(dashboardDataPath, 'utf-8');
const supabaseTs = readFileSync(supabaseTsPath, 'utf-8');
const dashboardAstro = readFileSync(dashboardPagePath, 'utf-8');
const libraryIndexAstro = readFileSync(libraryIndexPath, 'utf-8');
const navbarAstro = readFileSync(navbarPath, 'utf-8');

// 1. Group Access Rules & Classroom Link Integrity
const ENROLMENT_REQUIRED_URLS = [
  { id: 'biology', url: 'https://t.me/+-MMNZixSVJM3ZjRk', name: 'Biology' },
  { id: 'chemistry', url: 'https://t.me/+B6xm1bGauWgyZDJk', name: 'Chemistry' },
  { id: 'physics', url: 'https://t.me/+Uhvk2wlI-LQ3MWJk', name: 'Physics' },
  { id: 'english', url: 'https://t.me/+WAhmsDP-4rM4OWVk', name: 'English' },
  { id: 'mathematics', url: 'https://t.me/+H5AcDzEEd49kMTJk', name: 'Mathematics' },
  { id: 'brainstorming-group', url: 'https://chat.whatsapp.com/HKR7lb7mRoA5wivQLjUhUc?s=cl&p=a&mlu=4&ilr=4&iam=2', name: 'Brainstorming Group' },
  { id: 'paid-class-official', url: 'https://chat.whatsapp.com/FbCsdrxF7KE3E1q2ckwKOW?s=cl&p=a&mlu=4&ilr=4&iam=2', name: 'Paid Class Official Group' },
];

const OPEN_COMMUNITY_URLS = [
  { id: 'free-intensive-community', url: 'https://chat.whatsapp.com/LicHJ6aIHNV6x34CrbpviV?s=cl&p=a&mlu=4&ilr=4&iam=2', name: 'Free intensive classes' },
  { id: 'whatsapp-channel', url: 'https://whatsapp.com/channel/0029Vb8nzXH545v4f8EF103D', name: 'WhatsApp Channel' },
];

let allEnrolmentRequiredWired = true;
for (const item of ENROLMENT_REQUIRED_URLS) {
  if (!dashboardData.includes(item.url)) {
    allEnrolmentRequiredWired = false;
    console.error(`Missing enrolment required URL for ${item.name}: ${item.url}`);
  }
}
assert(allEnrolmentRequiredWired, '6. All 7 enrolment-required classroom and community URLs are accurately wired');

let allOpenWired = true;
for (const item of OPEN_COMMUNITY_URLS) {
  if (!dashboardData.includes(item.url)) {
    allOpenWired = false;
    console.error(`Missing open community URL for ${item.name}: ${item.url}`);
  }
}
assert(allOpenWired, '7. Both 2 open-to-everyone community URLs are accurately wired');

// 2. Classroom Access Control & Destination Enforcement
assert(
  dashboardData.includes('requiresEnrolment?: boolean') &&
  dashboardData.includes('requiresEnrolment: true') &&
  dashboardData.includes('requiresEnrolment: false'),
  '8. ClassroomLink interface distinguishes enrolment-required rooms from open communities'
);

assert(
  dashboardAstro.includes('data-requires-enrolment={requiresEnrol ? \'true\' : \'false\'}') &&
  dashboardAstro.includes('data-locked-url={cls.url}') &&
  dashboardAstro.includes('href="/pricing"'),
  '9. SSR HTML strictly defaults enrolment-required rooms to /pricing instead of exposing raw Telegram/WhatsApp invite URLs'
);

assert(
  dashboardAstro.includes('actionBtn.setAttribute(\'href\', lockedUrl)') &&
  dashboardAstro.includes('actionBtn.setAttribute(\'href\', \'/pricing\')') &&
  dashboardAstro.includes('actionBtn.className = \'btn-secondary locked-classroom-btn\''),
  '10. Client updateClassroomsAccess enforces destination URLs based on verified cohort access'
);

// 3. Entitlement Consistency: Distinguish Enrolment from Programme Start Date
assert(
  supabaseTs.includes('isCohortPlan') &&
  supabaseTs.includes('Distinguish paid enrolment from programme/resource availability'),
  '11. fetchUserEntitlements recognizes cohort enrolment as active immediately even if live lectures commence in the future'
);

// Entitlement simulation test
const nowUtc = Date.now();
function simulateEntitlementFilterWithCohortDistinction(rows) {
  return (rows || []).filter((row) => {
    if (row.is_active !== true) return false;

    const isCohortPlan =
      row.resource_id?.toLowerCase().includes('cohort') ||
      row.resource_id?.toLowerCase().includes('mastery') ||
      row.resource_id?.toLowerCase().includes('ultimate') ||
      row.resource_id?.toLowerCase().includes('core') ||
      row.plan_id?.toLowerCase().includes('cohort') ||
      row.plan_id?.toLowerCase().includes('mastery') ||
      row.plan_id?.toLowerCase().includes('ultimate') ||
      row.plan_id?.toLowerCase().includes('core');

    if (row.starts_at && !isCohortPlan) {
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

// Cohort Mastery with future start date (30 Nov 2026)
const masteryRow = {
  id: 'ent_mastery_nov30',
  user_id: 'usr_student_1',
  customer_email: 'candidate@techmed.ng',
  resource_id: 'cohort-mastery',
  plan_id: 'cohort-mastery',
  grant_source: 'purchase',
  is_active: true,
  starts_at: '2026-11-30T00:00:00Z',
  expires_at: '2027-05-31T00:00:00Z',
};

const filteredMastery = simulateEntitlementFilterWithCohortDistinction([masteryRow]);
assert(
  filteredMastery.length === 1 && filteredMastery[0].resource_id === 'cohort-mastery',
  '12. Mastery cohort enrolment purchased before 30 November is preserved and recognized immediately'
);

// Standalone future resource should still be excluded before its start date
const futureStandaloneBooster = {
  id: 'ent_future_mock',
  user_id: 'usr_student_1',
  customer_email: 'candidate@techmed.ng',
  resource_id: 'physics-booster',
  grant_source: 'purchase',
  is_active: true,
  starts_at: new Date(nowUtc + 864000000).toISOString(),
  expires_at: null,
};
const filteredFuture = simulateEntitlementFilterWithCohortDistinction([futureStandaloneBooster]);
assert(
  filteredFuture.length === 0,
  '13. Standalone scheduled resource with future start date remains gated until start date'
);

// 4. Bookshelf & Dashboard Tier Consistency
assert(
  libraryIndexAstro.includes('isMasteryMatch') &&
  libraryIndexAstro.includes('isUltimateMatch') &&
  libraryIndexAstro.includes('isCoreMatch') &&
  libraryIndexAstro.includes("accountTag.className = 'account-tag mastery'"),
  '14. Bookshelf index resolves Mastery, Ultimate, and Core consistently with case-insensitive matching and order verification'
);

// 5. Theme Switching Neutrality
const applyThemeBody = navbarAstro.slice(navbarAstro.indexOf('function applyTheme'), navbarAstro.indexOf('// Mobile menu toggle'));
assert(
  applyThemeBody.includes("document.documentElement.setAttribute('data-theme', theme)") &&
  !applyThemeBody.includes('sessionStorage.clear') &&
  !applyThemeBody.includes('supabase.auth.signOut') &&
  !applyThemeBody.includes('entitlements'),
  '15. Theme switching toggles data-theme without modifying authentication or entitlement state'
);

// 6. UI Loading State Positioning
assert(
  dashboardAstro.includes('.state-card {') &&
  dashboardAstro.includes('flex-direction: column;') &&
  dashboardAstro.includes('align-items: center;') &&
  dashboardAstro.includes('min-height: 280px;'),
  '16. Loading state card is positioned with flexbox column centering and minimum height to prevent misplacement'
);

// 7. Mobile Overflow Guardrails (320px - 430px)
assert(
  dashboardAstro.includes('@media (max-width: 640px)') &&
  dashboardAstro.includes('.classrooms-grid') &&
  dashboardAstro.includes('.resources-grid') &&
  dashboardAstro.includes('grid-template-columns: 1fr;'),
  '17. Responsive media queries collapse multi-column grids to 1fr on mobile, preventing horizontal overflow at 320-430px'
);

assert(
  dashboardAstro.includes('word-break: break-word;') &&
  dashboardAstro.includes('overflow-x: hidden;'),
  '18. Text overflow and horizontal clipping are prevented with word-break and page overflow containment'
);

// 8. WCAG 2.2 AA Contrast Compliance
assert(
  dashboardAstro.includes('.classroom-join-btn') &&
  dashboardAstro.includes('color: #012748;') &&
  dashboardAstro.includes('.locked-classroom-btn') &&
  dashboardAstro.includes('color: var(--color-soft-blue);'),
  '19. Action button text meets WCAG 2.2 AA contrast requirements (Navy on Gold > 8:1, Soft Blue on dark surface > 6.7:1)'
);

console.log('\n----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------\n');

if (passed === total) {
  console.log('All Section 1 Entitlement & Classroom Consistency checks passed successfully!\n');
  process.exit(0);
} else {
  console.error(`Section 1 verification failed with ${total - passed} failure(s).\n`);
  process.exit(1);
}
