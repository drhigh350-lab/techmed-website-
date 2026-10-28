import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let total = 0;

function assert(condition, name, details = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] Test ${String(total).padStart(2, '0')}: ${name}`);
  } else {
    console.error(`  [FAIL] Test ${String(total).padStart(2, '0')}: ${name}`);
    if (details) console.error(`         ${details}`);
  }
}

console.log('================================================================');
console.log('  TECHMED: DASHBOARD LIGHT/DARK THEME & MOBILE AUTH AUDIT SUITE');
console.log('================================================================\n');

const basePath = existsSync(resolve(process.cwd(), 'web/src'))
  ? resolve(process.cwd(), 'web')
  : process.cwd();

const navbarPath = resolve(basePath, 'src/components/Navbar.astro');
const dashboardPath = resolve(basePath, 'src/pages/dashboard.astro');
const loginPath = resolve(basePath, 'src/pages/login.astro');
const tokensPath = resolve(basePath, 'src/styles/tokens.css');

assert(existsSync(navbarPath), '1. Navbar.astro exists');
assert(existsSync(dashboardPath), '2. dashboard.astro exists');
assert(existsSync(loginPath), '3. login.astro exists');
assert(existsSync(tokensPath), '4. tokens.css exists');

const navbarSrc = readFileSync(navbarPath, 'utf-8');
const dashboardSrc = readFileSync(dashboardPath, 'utf-8');
const loginSrc = readFileSync(loginPath, 'utf-8');
const tokensSrc = readFileSync(tokensPath, 'utf-8');

// 1. Mobile Quick Header Auth Option
assert(
  navbarSrc.includes('id="mobileHeaderLoginBtn"') &&
  navbarSrc.includes('class="mobile-header-auth-btn"') &&
  navbarSrc.includes('href="/login"'),
  '5. Mobile header bar renders direct quick Log In button on mobile screens'
);

assert(
  navbarSrc.includes('id="mobileHeaderAvatarLink"') &&
  navbarSrc.includes('id="mobileHeaderAvatarInitials"') &&
  navbarSrc.includes('href="/dashboard"'),
  '6. Mobile header bar renders direct student initials avatar link when authenticated'
);

assert(
  navbarSrc.includes('.mobile-header-auth-btn,\n  .mobile-header-avatar-link {\n    display: none !important;') &&
  navbarSrc.includes('.mobile-header-auth-btn {\n      display: inline-flex !important;'),
  '7. Mobile header auth buttons are hidden on desktop and visible on mobile (<= 860px)'
);

// 2. Mobile Drawer Student Portal Clarity
assert(
  navbarSrc.includes('class="mobile-account-eyebrow"') &&
  navbarSrc.includes('STUDENT PORTAL · UTME 2027') &&
  navbarSrc.includes('class="mobile-auth-intro"'),
  '8. Mobile menu drawer features prominent Student Portal branding and helpful onboarding copy'
);

assert(
  navbarSrc.includes('class="mobile-auth-btn mobile-login-btn"') &&
  navbarSrc.includes('class="mobile-auth-btn mobile-signup-btn"') &&
  navbarSrc.includes('href="/login?redirect=/dashboard"') &&
  navbarSrc.includes('href="/register?redirect=/dashboard"'),
  '9. Mobile menu drawer provides clear dual Log In and Create Account actions'
);

assert(
  navbarSrc.includes('min-height: 44px') &&
  navbarSrc.includes('.mobile-auth-btn {'),
  '10. Mobile drawer auth buttons enforce >= 44px touch targets for mobile usability'
);

// 3. Navbar Dynamic State Updates
assert(
  navbarSrc.includes('mobileHeaderLoginBtn') &&
  navbarSrc.includes('mobileHeaderAvatarLink') &&
  navbarSrc.includes('mobileHeaderAvatarInitials') &&
  navbarSrc.includes('updateNavbarAuth(user: any)'),
  '11. updateNavbarAuth synchronizes both mobile header and drawer auth states'
);

// 4. Dashboard Unauthenticated Card
assert(
  dashboardSrc.includes('id="unauthCard"') &&
  dashboardSrc.includes('class="unauth-eyebrow"') &&
  dashboardSrc.includes('class="unauth-heading"') &&
  dashboardSrc.includes('class="unauth-actions-group"'),
  '12. Dashboard unauthenticated state features clear heading, context, and action group'
);

assert(
  dashboardSrc.includes('class="auth-btn-primary"') &&
  dashboardSrc.includes('class="auth-btn-secondary"') &&
  dashboardSrc.includes('/login?redirect=/dashboard') &&
  dashboardSrc.includes('/register?redirect=/dashboard'),
  '13. Dashboard unauthenticated card provides both Log In and Create Student Account options'
);

assert(
  dashboardSrc.includes('unauth-help-note') &&
  dashboardSrc.includes('Already enrolled in Mastery, Core, or Ultimate?'),
  '14. Dashboard unauthenticated card includes student email matching guidance'
);

// 5. Dashboard Light Theme UI/UX Consistency
assert(
  dashboardSrc.includes(":root[data-theme='light'] .dashboard-page") &&
  dashboardSrc.includes(":root[data-theme='light'] .dashboard-card"),
  '15. Dashboard page and main cards have explicit light theme styling'
);

// 6. Mobile Timetable Light Theme Contrast Fix
assert(
  !dashboardSrc.includes('.day-name {\n    font-family: var(--font-display);\n    font-size: 1.05rem;\n    font-weight: 800;\n    color: var(--color-white);') &&
  dashboardSrc.includes('.day-name {\n    font-family: var(--font-display);\n    font-size: 1.05rem;\n    font-weight: 800;\n    color: var(--text);') &&
  dashboardSrc.includes(":root[data-theme='light'] .day-schedule-card") &&
  dashboardSrc.includes(":root[data-theme='light'] .day-session-box"),
  '16. Mobile day timetable cards use semantic tokens and explicit light theme overrides, eliminating invisible white text'
);

// 7. Desktop Timetable Light Theme Polish
assert(
  dashboardSrc.includes(":root[data-theme='light'] .table-scroll-wrap") &&
  dashboardSrc.includes(":root[data-theme='light'] .timetable-table thead th") &&
  dashboardSrc.includes(":root[data-theme='light'] .sunday-assessment-box"),
  '17. Desktop timetable table, header cells, and Sunday assessment box have clean light theme contrast'
);

// 8. Curriculum Light Theme Polish
assert(
  dashboardSrc.includes(":root[data-theme='light'] .sub-filter-btn") &&
  dashboardSrc.includes(":root[data-theme='light'] .week-tab-btn") &&
  dashboardSrc.includes(":root[data-theme='light'] .week-card") &&
  dashboardSrc.includes(":root[data-theme='light'] .curriculum-subject-col"),
  '18. Curriculum subject filter, week tabs, week cards, and subject columns adapt cleanly to light theme'
);

// 9. Classrooms Light Theme Polish
assert(
  dashboardSrc.includes(":root[data-theme='light'] .classroom-box") &&
  dashboardSrc.includes(":root[data-theme='light'] .locked-classroom-btn") &&
  dashboardSrc.includes(":root[data-theme='light'] .access-pill.unlocked") &&
  dashboardSrc.includes(":root[data-theme='light'] .access-pill.locked"),
  '19. Classroom cards, lock pills, and enrolment action buttons have strong light theme contrast'
);

// 10. Bookshelf & CBT Light Theme Polish
assert(
  dashboardSrc.includes(":root[data-theme='light'] .cbt-schedule-card") &&
  dashboardSrc.includes(":root[data-theme='light'] .cbt-feature-box") &&
  dashboardSrc.includes(":root[data-theme='light'] .filter-tab") &&
  dashboardSrc.includes(":root[data-theme='light'] .resource-card") &&
  dashboardSrc.includes(":root[data-theme='light'] .benefits-list-box"),
  '20. Bookshelf, CBT cards, filter tabs, and benefits list adapt cleanly to light theme'
);

// 11. Login Page Light Theme Polish
assert(
  loginSrc.includes(":root[data-theme='light'] .auth-card") &&
  loginSrc.includes(":root[data-theme='light'] .account-notice-box"),
  '21. Login page adapts cleanly to light theme with high-contrast surfaces'
);

console.log('\n================================================================');
console.log(`  AUDIT RESULT: ${passed} / ${total} CHECKS PASSED`);
console.log('================================================================\n');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
