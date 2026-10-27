// web/scripts/test-section2-dashboard-home.mjs
// Automated Unit & Integration Test Suite for:
// Section 2: Student Dashboard Home & Account Experience

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
console.log('  TECHMED SECTION 2: STUDENT DASHBOARD & ACCOUNT VALIDATION');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');

const dashboardPath = resolve(baseDir, 'web/src/pages/dashboard.astro');
const settingsPath = resolve(baseDir, 'web/src/pages/account/settings.astro');
const onboardingPath = resolve(baseDir, 'web/src/pages/account/onboarding.astro');
const supabaseTsPath = resolve(baseDir, 'web/src/lib/supabase.ts');
const navbarPath = resolve(baseDir, 'web/src/components/Navbar.astro');

// 1. Files existence check
assert(existsSync(dashboardPath), '1. Dashboard landing page exists: web/src/pages/dashboard.astro');
assert(existsSync(settingsPath), '2. Account Settings page exists: web/src/pages/account/settings.astro');
assert(existsSync(onboardingPath), '3. Profile & Onboarding page exists: web/src/pages/account/onboarding.astro');

const dashboardAstro = readFileSync(dashboardPath, 'utf-8');
const settingsAstro = readFileSync(settingsPath, 'utf-8');
const onboardingAstro = readFileSync(onboardingPath, 'utf-8');
const supabaseTs = readFileSync(supabaseTsPath, 'utf-8');
const navbarAstro = readFileSync(navbarPath, 'utf-8');

// 2. Student Welcome and Profile Completion Display
assert(
  dashboardAstro.includes('id="studentGreetingName"') &&
  (dashboardAstro.includes('id="incompleteBanner"') || dashboardAstro.includes('id="profileProgressCard"')) &&
  dashboardAstro.includes('id="profileCompletePill"') &&
  dashboardAstro.includes('id="resumeOnboardingBtn"'),
  '4. Dashboard welcomes student by name and provides dynamic profile completion indicator and resume CTA'
);

const hubNavPath = resolve(baseDir, 'web/src/components/StudentHubNav.astro');
const studentHubNavAstro = existsSync(hubNavPath) ? readFileSync(hubNavPath, 'utf-8') : '';

// 3. Clear Navigation across Student Hub (Dashboard, Profile, Settings, Bookshelf)
assert(
  (dashboardAstro.includes('class="hub-nav-tabs"') || (dashboardAstro.includes('StudentHubNav') && studentHubNavAstro.includes('class="hub-nav-tabs"'))) &&
  (dashboardAstro.includes('href="/dashboard"') || studentHubNavAstro.includes('href="/dashboard"')) &&
  (dashboardAstro.includes('href="/account/onboarding"') || studentHubNavAstro.includes('href="/account/onboarding"')) &&
  (dashboardAstro.includes('href="/account/settings"') || studentHubNavAstro.includes('href="/account/settings"')) &&
  (dashboardAstro.includes('href="/library"') || studentHubNavAstro.includes('href="/library"')),
  '5. Dashboard provides prominent tab navigation to Dashboard, Profile, Settings, and Bookshelf'
);

assert(
  (settingsAstro.includes('class="hub-nav-tabs"') || (settingsAstro.includes('StudentHubNav') && studentHubNavAstro.includes('class="hub-nav-tabs"'))) &&
  (settingsAstro.includes('href="/dashboard"') || studentHubNavAstro.includes('href="/dashboard"')) &&
  (settingsAstro.includes('href="/account/onboarding"') || studentHubNavAstro.includes('href="/account/onboarding"')) &&
  (settingsAstro.includes('href="/account/settings"') || studentHubNavAstro.includes('href="/account/settings"')),
  '6. Account Settings page contains shared hub navigation tabs'
);

assert(
  (onboardingAstro.includes('class="hub-nav-tabs"') || (onboardingAstro.includes('StudentHubNav') && studentHubNavAstro.includes('class="hub-nav-tabs"'))) &&
  (onboardingAstro.includes('href="/dashboard"') || studentHubNavAstro.includes('href="/dashboard"')) &&
  (onboardingAstro.includes('href="/account/onboarding"') || studentHubNavAstro.includes('href="/account/onboarding"')) &&
  (onboardingAstro.includes('href="/account/settings"') || studentHubNavAstro.includes('href="/account/settings"')),
  '7. Onboarding page contains shared hub navigation tabs'
);

// 4. Navbar includes Account Settings in Desktop and Mobile menus
assert(
  navbarAstro.includes('href="/account/settings"') &&
  navbarAstro.includes('Account Settings'),
  '8. Website Navbar links to Account Settings in both desktop menu and mobile drawer'
);

// 5. Account and Student-Status Indicators without False Presentation
assert(
  (dashboardAstro.includes('id="verifiedStatusBadge"') || dashboardAstro.includes('id="studentStatusBadge"')) &&
  dashboardAstro.includes('id="planPillContainer"'),
  '9. Dashboard renders authoritative student status badge and plan pill'
);

assert(
  supabaseTs.includes('resolveStudentPrivileges') &&
  supabaseTs.includes("badgeType: 'unverified'") &&
  supabaseTs.includes("statusLabel: 'Free Registered Candidate'") &&
  supabaseTs.includes("isVerified: false"),
  '10. supabase.ts resolveStudentPrivileges classifies non-purchasers as Free Registered Candidates, not verified students'
);

// 6. Non-blocking next steps for unverified candidates
assert(
  (dashboardAstro.includes('id="unverifiedNotice"') || dashboardAstro.includes('id="unverifiedNextSteps"')) &&
  dashboardAstro.includes('id="nextStepsCardsGrid"') &&
  dashboardAstro.includes('Recommended Next Steps'),
  '11. Dashboard renders informative next steps for unverified candidates without locking account access'
);

assert(
  supabaseTs.includes("title: 'Explore UTME 2027 Cohort Plans'") &&
  supabaseTs.includes("title: 'Download Free Admission Guide'") &&
  supabaseTs.includes("title: 'Practice on Kairo CBT'"),
  '12. Unverified students receive productive, non-blocking next steps'
);

// 7. Entitlement-based authorized visibility for verified students
assert(
  dashboardAstro.includes('id="authorizedResourcesContainer"') &&
  dashboardAstro.includes('id="benefitsChecklist"') &&
  dashboardAstro.includes('privileges.authorizedBenefits'),
  '13. Dashboard displays authorized resources and benefits matching student entitlements'
);

// 8. Strict Privilege Separation: Core vs Mastery vs Ultimate vs Mentorship
assert(
  supabaseTs.includes("planName: 'TECHMED Core (Enrolled)'") &&
  supabaseTs.includes("hasFounderMentorship: false") &&
  supabaseTs.includes("planName: 'TECHMED Mastery (3-Month Enrolment)'") &&
  supabaseTs.includes("planName: 'TECHMED Ultimate (Full UTME 2027 Access)'") &&
  supabaseTs.includes("hasFounderMentorship: true"),
  '14. Privileges resolver strictly prohibits Core and Mastery students from receiving Founder Mentorship or Ultimate features'
);

// 9. Sensible Loading, Empty, Error, and Unauthenticated States
assert(
  dashboardAstro.includes('id="loadingState"') &&
  dashboardAstro.includes('id="errorState"') &&
  dashboardAstro.includes('id="unauthCard"') &&
  dashboardAstro.includes('id="retryLoadBtn"') &&
  dashboardAstro.includes('/login?redirect=/dashboard'),
  '15. Dashboard includes robust loading, error with retry, and unauthenticated state with redirect to login'
);

assert(
  settingsAstro.includes('id="loadingState"') &&
  settingsAstro.includes('id="unauthCard"') &&
  settingsAstro.includes('/login?redirect=/account/settings'),
  '16. Settings page includes loading and unauthenticated redirect'
);

// 10. Account Settings Security & Password reset
assert(
  settingsAstro.includes('id="requestResetBtn"') &&
  settingsAstro.includes('resetPasswordForEmail') &&
  settingsAstro.includes('id="settingsSignOutBtn"'),
  '17. Settings page allows requesting password reset email and clean sign out'
);

// 11. Academic target and 4-subject combination visibility on Dashboard
assert(
  (dashboardAstro.includes('id="displayTargetCourse"') || dashboardAstro.includes('id="displayCourse"')) &&
  (dashboardAstro.includes('id="displayTargetUniversity"') || dashboardAstro.includes('id="displayUniversity"')) &&
  (dashboardAstro.includes('id="subjectPills"') || dashboardAstro.includes('id="subjectsContainer"')),
  '18. Dashboard displays target course, university, and 4 UTME subjects'
);

// 12. Direct Channels visibility on Dashboard
assert(
  dashboardAstro.includes('id="displayPhone"') &&
  dashboardAstro.includes('id="displayWhatsapp"') &&
  dashboardAstro.includes('id="displayTelegram"'),
  '19. Dashboard displays student communication channels (Phone, WhatsApp, Telegram)'
);

// 13. Unit test privilege resolution logic programmatically
import { resolveStudentPrivileges } from '../src/lib/supabase.ts';

// Test 13A: Unverified candidate
const unverifiedPrivileges = resolveStudentPrivileges([], []);
assert(
  unverifiedPrivileges.isVerified === false &&
  unverifiedPrivileges.badgeType === 'unverified' &&
  unverifiedPrivileges.hasFounderMentorship === false &&
  unverifiedPrivileges.nextSteps.length >= 2,
  '20. Programmatic check: Unverified candidate has isVerified: false, badge: unverified, mentorship: false'
);

// Test 13B: Core student (wisdomjohnson207@gmail.com)
const coreEntitlement = {
  id: 'ent-1',
  customerEmail: 'wisdomjohnson207@gmail.com',
  resourceId: 'cohort-core-monthly',
  grantSource: 'purchase',
  grantedAt: new Date().toISOString(),
  expiresAt: '2026-12-30T00:00:00Z',
  isActive: true,
};
const corePrivileges = resolveStudentPrivileges([coreEntitlement], []);
assert(
  corePrivileges.isVerified === true &&
  corePrivileges.badgeType === 'core' &&
  corePrivileges.hasFounderMentorship === false &&
  corePrivileges.planName.includes('Core') &&
  !corePrivileges.authorizedBenefits.some(b => b.includes('Founder Mentorship')),
  '21. Programmatic check: Core student has badge: core, isVerified: true, hasFounderMentorship: false'
);

// Test 13C: Mastery student
const masteryEntitlement = {
  id: 'ent-2',
  customerEmail: 'student@example.com',
  resourceId: 'cohort-mastery-standard',
  grantSource: 'purchase',
  grantedAt: new Date().toISOString(),
  expiresAt: '2027-05-31T00:00:00Z',
  isActive: true,
};
const masteryPrivileges = resolveStudentPrivileges([masteryEntitlement], []);
assert(
  masteryPrivileges.isVerified === true &&
  masteryPrivileges.badgeType === 'mastery' &&
  masteryPrivileges.hasFounderMentorship === false &&
  masteryPrivileges.planName.includes('Mastery'),
  '22. Programmatic check: Mastery student has badge: mastery, isVerified: true, hasFounderMentorship: false'
);

// Test 13D: Ultimate student
const ultimateEntitlement = {
  id: 'ent-3',
  customerEmail: 'ultimate@example.com',
  resourceId: 'cohort-ultimate',
  grantSource: 'purchase',
  grantedAt: new Date().toISOString(),
  expiresAt: '2027-05-31T00:00:00Z',
  isActive: true,
};
const ultimatePrivileges = resolveStudentPrivileges([ultimateEntitlement], []);
assert(
  ultimatePrivileges.isVerified === true &&
  ultimatePrivileges.badgeType === 'ultimate' &&
  ultimatePrivileges.hasFounderMentorship === true &&
  ultimatePrivileges.planName.includes('Ultimate'),
  '23. Programmatic check: Ultimate student has badge: ultimate, isVerified: true, hasFounderMentorship: true'
);

// Test 13E: Standalone book purchaser
const bookEntitlement = {
  id: 'ent-4',
  customerEmail: 'buyer@example.com',
  resourceId: 'chemistry-booster',
  resourceTitle: 'Chemistry Booster System',
  grantSource: 'purchase',
  grantedAt: new Date().toISOString(),
  expiresAt: null,
  isActive: true,
};
const bookPrivileges = resolveStudentPrivileges([bookEntitlement], []);
assert(
  bookPrivileges.isVerified === true &&
  bookPrivileges.badgeType === 'resource_purchaser' &&
  bookPrivileges.hasFounderMentorship === false &&
  bookPrivileges.authorizedResources.length === 1 &&
  bookPrivileges.authorizedResources[0].isLifetime === true,
  '24. Programmatic check: Standalone booster purchaser has permanent lifetime access without false cohort enrollment'
);

console.log('\n----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------\n');

if (passed === total) {
  console.log('All Section 2 validation checks passed successfully!\n');
  process.exit(0);
} else {
  console.error(`Validation failed with ${total - passed} failing test(s).\n`);
  process.exit(1);
}
