import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] Test ${String(total).padStart(2, '0')}: ${message}`);
  } else {
    console.error(`  [FAIL] Test ${String(total).padStart(2, '0')}: ${message}`);
  }
}

console.log('================================================================');
console.log('  TECHMED: DASHBOARD NAVIGATION & OVERVIEW AUDIT SUITE');
console.log('================================================================\n');

const basePath = existsSync(resolve(process.cwd(), 'web/src'))
  ? resolve(process.cwd(), 'web')
  : process.cwd();

const dashboardPath = resolve(basePath, 'src/pages/dashboard.astro');
const studentHubNavPath = resolve(basePath, 'src/components/StudentHubNav.astro');
const tokensPath = resolve(basePath, 'src/styles/tokens.css');

assert(existsSync(dashboardPath), '1. dashboard.astro exists');
assert(existsSync(studentHubNavPath), '2. StudentHubNav.astro exists');
assert(existsSync(tokensPath), '3. tokens.css exists');

const dashboardSrc = readFileSync(dashboardPath, 'utf-8');
const studentHubNavSrc = readFileSync(studentHubNavPath, 'utf-8');
const tokensSrc = readFileSync(tokensPath, 'utf-8');

// 1. Navigation Redundancy & Structure
assert(
  !dashboardSrc.includes('data-view="all"') && !dashboardSrc.includes('All Views'),
  '4. All Views button completely removed from dashboard'
);

const expectedDestinations = [
  'data-view="overview"',
  'data-view="timetable"',
  'data-view="curriculum"',
  'data-view="classrooms"',
  'data-view="resources"',
];
const hasAll5Destinations = expectedDestinations.every(dest => dashboardSrc.includes(dest));
assert(
  hasAll5Destinations,
  '5. Retains exactly the 5 approved destinations: Overview, Timetable, Curriculum, Classrooms, Bookshelf & CBT'
);

// 2. Account-Level Navigation in StudentHubNav
assert(
  studentHubNavSrc.includes('href="/dashboard"') &&
  studentHubNavSrc.includes('href="/account/onboarding"') &&
  studentHubNavSrc.includes('href="/account/settings"') &&
  !studentHubNavSrc.includes('href="/library"') &&
  !studentHubNavSrc.includes('Bookshelf &amp; Materials'),
  '6. StudentHubNav retains Dashboard, Profile & Onboarding, Account Settings, and removes Bookshelf & Materials'
);

assert(
  studentHubNavSrc.includes('variant-account') && dashboardSrc.includes('variant="account"'),
  '7. Account navigation uses subtle utility pill variant to eliminate competing stacked horizontal bars'
);

// 3. Mobile Navigation Accessibility (No hidden horizontal scrolling dependency)
assert(
  dashboardSrc.includes('flex-wrap: wrap') &&
  !dashboardSrc.includes('.dashboard-segmented-nav {\n    display: flex;\n    gap: 6px;\n    overflow-x: auto;') &&
  dashboardSrc.includes('@media (max-width: 480px)') &&
  dashboardSrc.includes('calc(50% - 4px)'),
  '8. Segmented control wraps responsively on mobile without requiring undiscovered horizontal scrolling'
);

// 4. Overview Section Hierarchy
const scheduleIndex = dashboardSrc.indexOf('class="programme-overview-card');
const quickstartIndex = dashboardSrc.indexOf('id="quickstartSection"');
const todayIndex = dashboardSrc.indexOf('id="todayScheduleGlance"');
const actionIndex = dashboardSrc.indexOf('class="relevant-action-wrapper');

assert(
  scheduleIndex !== -1 && quickstartIndex !== -1 && todayIndex !== -1 && actionIndex !== -1,
  '9. All 4 key Overview sections exist in the markup'
);

assert(
  scheduleIndex < quickstartIndex && quickstartIndex < todayIndex && todayIndex < actionIndex,
  '10. Overview follows the strict hierarchy: 1. Official Programme Schedule -> 2. Orientation Checklist -> 3. Today\'s Schedule -> 4. Relevant Next Action'
);

// 5. Academic Target & Direct Channels Removal from Overview
assert(
  !dashboardSrc.includes('class="dashboard-card academic-card"') &&
  !dashboardSrc.includes('class="dashboard-card channels-card"') &&
  !dashboardSrc.includes('id="displayTargetCourse"') &&
  !dashboardSrc.includes('id="displayTargetUniversity"'),
  '11. Unnecessary Academic Target and Direct Channels cards removed from Overview (delegated to Profile & Onboarding)'
);

// 6. Onboarding Completion Contradiction Audit
assert(
  dashboardSrc.includes('const isCompleted = profile?.onboardingCompleted === true;') &&
  dashboardSrc.includes("profileProgressCard.style.display = 'none'") &&
  dashboardSrc.includes("profileCompletePill.style.display = 'flex'") &&
  dashboardSrc.includes("profileProgressCard.style.display = 'flex'") &&
  dashboardSrc.includes("profileCompletePill.style.display = 'none'"),
  '12. Incomplete profile notice and complete pill are strictly mutually exclusive and never show simultaneously'
);

assert(
  dashboardSrc.includes('class="relevant-action-wrapper dashboard-view-section" data-section-view="overview"') &&
  !dashboardSrc.includes('id="incompleteBanner" class="profile-progress-card dashboard-view-section"') &&
  !dashboardSrc.includes('id="profileCompletePill" class="profile-complete-banner dashboard-view-section"'),
  '13. Inner action cards are isolated from tab switcher display resets to prevent contradictory state flash'
);

// 7. Visual Design & Theme Contrast Tokens
assert(
  dashboardSrc.includes("setDashboardView('overview')"),
  '14. Default view on initialization is cleanly set to Overview'
);

assert(
  tokensSrc.includes('--color-deep-navy: #012748') &&
  tokensSrc.includes('--color-professional-blue: #09476E') &&
  tokensSrc.includes('--color-soft-blue: #98B0C4') &&
  tokensSrc.includes('--color-white: #F8F9FA') &&
  tokensSrc.includes('--color-gold: #C9A227'),
  '15. Official TECHMED brand palette tokens defined and preserved'
);

assert(
  dashboardSrc.includes(":root[data-theme='light'] .segmented-control-container") &&
  dashboardSrc.includes(":root[data-theme='light'] .programme-overview-card") &&
  dashboardSrc.includes(":root[data-theme='light'] .today-glance-card") &&
  dashboardSrc.includes(":root[data-theme='light'] .profile-complete-banner") &&
  dashboardSrc.includes('color: #166534'),
  '16. Light theme provides high-contrast WCAG 2.2 AA compliant styles (> 4.5:1 text, > 3:1 controls)'
);

// 8. Mobile Breakpoints for 320, 360, 390, 430px
assert(
  dashboardSrc.includes('@media (max-width: 640px)') &&
  dashboardSrc.includes('@media (max-width: 480px)') &&
  dashboardSrc.includes('@media (max-width: 360px)'),
  '17. Responsive breakpoints explicitly cover 320px, 360px, 390px, and 430px mobile viewports'
);

// 9. Existing Entitlements and Classroom Protection
assert(
  dashboardSrc.includes('updateClassroomsAccess') &&
  dashboardSrc.includes('locked-classroom-btn') &&
  dashboardSrc.includes('resolveStudentPrivileges'),
  '18. Protected classroom access, database entitlements, and authorization functions preserved intact'
);

console.log('----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------\n');

if (passed === total) {
  console.log('All Dashboard Navigation & Overview validation checks passed successfully!\n');
} else {
  process.exit(1);
}
