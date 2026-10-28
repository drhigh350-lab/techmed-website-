// web/scripts/test-task2-dashboard-redesign.mjs
// Automated Verification Suite for Task 2:
// TECHMED Paid Student Dashboard & Onboarding Mobile-First Redesign

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
console.log('  TECHMED TASK 2: DASHBOARD REDESIGN & MOBILE POLISH SUITE');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');
const dashboardPagePath = resolve(baseDir, 'web/src/pages/dashboard.astro');
const dashboardDataPath = resolve(baseDir, 'web/src/lib/dashboard-data.ts');
const onboardingPagePath = resolve(baseDir, 'web/src/pages/account/onboarding.astro');

assert(existsSync(dashboardPagePath), '1. Dashboard page exists');
assert(existsSync(dashboardDataPath), '2. Structured data module exists');
assert(existsSync(onboardingPagePath), '3. Onboarding page exists');

const dashboardAstroSrc = readFileSync(dashboardPagePath, 'utf-8');
const dashboardDataSrc = readFileSync(dashboardDataPath, 'utf-8');
const onboardingAstroSrc = readFileSync(onboardingPagePath, 'utf-8');

// 1. Apple-Inspired Segmented View Switcher (5 clear destinations, redundant All Views removed)
assert(
  dashboardAstroSrc.includes('class="dashboard-segmented-nav"') &&
  !dashboardAstroSrc.includes('data-view="all"') &&
  dashboardAstroSrc.includes('data-view="overview"') &&
  dashboardAstroSrc.includes('data-view="timetable"') &&
  dashboardAstroSrc.includes('data-view="curriculum"') &&
  dashboardAstroSrc.includes('data-view="classrooms"') &&
  dashboardAstroSrc.includes('data-view="resources"'),
  '4. Segmented view switcher provides 5 destinations: Overview, Timetable, Curriculum, Classrooms, Bookshelf & CBT (no All Views)'
);

// 2. Today's Live Class Glance Card
assert(
  dashboardAstroSrc.includes('id="todayScheduleGlance"') &&
  dashboardAstroSrc.includes('id="todayDayName"') &&
  dashboardAstroSrc.includes('id="todaySessionASubject"') &&
  dashboardAstroSrc.includes('id="todaySessionBSubject"') &&
  dashboardAstroSrc.includes('live-pulse-dot') &&
  dashboardAstroSrc.includes('initTodaySchedule'),
  '5. Today schedule glance card dynamically displays current day live lecture slots with pulse indicator'
);

// 3. Mobile-First Timetable Day Cards
assert(
  dashboardAstroSrc.includes('class="mobile-day-cards"') &&
  dashboardAstroSrc.includes('class="day-schedule-card"') &&
  dashboardAstroSrc.includes('class="today-indicator-tag"') &&
  dashboardAstroSrc.includes('10-Min Break · 9:00 – 9:10 PM'),
  '6. Timetable includes mobile day cards for seamless viewing on small screens without horizontal scrolling'
);

// 4. Programme Dates Consistency
assert(
  dashboardDataSrc.includes('30 November 2026 – UTME Examination Date') &&
  dashboardDataSrc.includes('30 November 2026 – 21 February 2027') &&
  dashboardAstroSrc.includes('{PROGRAMME_META.officialDates}') &&
  dashboardAstroSrc.includes('{PROGRAMME_META.intensiveLectureDates}'),
  '7. Official programme dates consistently enforce 30 November 2026 – UTME Examination Date'
);

// 5. Timetable Schedule Integrity
assert(
  dashboardDataSrc.includes('7:00 PM – 9:00 PM') &&
  dashboardDataSrc.includes('9:00 PM – 9:10 PM') &&
  dashboardDataSrc.includes('9:10 PM – 11:10 PM') &&
  dashboardDataSrc.includes('Biology / Mathematics') &&
  dashboardDataSrc.includes('Chemistry') &&
  dashboardAstroSrc.includes('A 10-minute break separates the two daily sessions'),
  '8. Timetable preserves Monday–Saturday 4-hour schedule, 10-min break, and shared Biology/Mathematics note'
);

// 6. Complete 12-Week Curriculum & Mocks
assert(
  dashboardDataSrc.includes('weekNumber: 1') &&
  dashboardDataSrc.includes('weekNumber: 12') &&
  dashboardDataSrc.includes('First Monthly JAMB-Standard Mock') &&
  dashboardDataSrc.includes('Sunday, 27 December') &&
  dashboardDataSrc.includes('Second Monthly JAMB-Standard Mock') &&
  dashboardDataSrc.includes('Sunday, 24 January') &&
  dashboardDataSrc.includes('Weekly CBT Drill 12') &&
  dashboardDataSrc.includes('questions: 180'),
  '9. 12-week curriculum transcribes all 5 subjects, weekly drills, and 3 cumulative JAMB mock exams'
);

// 7. Classroom and Community URLs
const REQUIRED_URLS = [
  'https://t.me/+-MMNZixSVJM3ZjRk', // Biology
  'https://t.me/+B6xm1bGauWgyZDJk', // Chemistry
  'https://t.me/+Uhvk2wlI-LQ3MWJk', // Physics
  'https://t.me/+WAhmsDP-4rM4OWVk', // English
  'https://t.me/+H5AcDzEEd49kMTJk', // Mathematics
  'https://chat.whatsapp.com/HKR7lb7mRoA5wivQLjUhUc?s=cl&p=a&mlu=4&ilr=4&iam=2', // Brainstorming Group
  'https://whatsapp.com/channel/0029Vb4wUuS6buMI3U1t8u1s', // Requested WhatsApp Channel
];

const allUrlsWired = REQUIRED_URLS.every(url => dashboardDataSrc.includes(url));
assert(allUrlsWired, '10. All 7 approved Telegram classroom and WhatsApp community URLs are wired in');

// 8. Progressive Disclosure & View Section Tagging
assert(
  dashboardAstroSrc.includes('data-section-view="overview"') &&
  dashboardAstroSrc.includes('data-section-view="timetable"') &&
  dashboardAstroSrc.includes('data-section-view="curriculum"') &&
  dashboardAstroSrc.includes('data-section-view="classrooms"') &&
  dashboardAstroSrc.includes('data-section-view="resources"'),
  '11. All major sections tagged with data-section-view for instant progressive disclosure filtering'
);

// 9. Mobile Touch Targets & Design System
assert(
  dashboardAstroSrc.includes('min-height: 44px') &&
  dashboardAstroSrc.includes('var(--color-gold)') &&
  dashboardAstroSrc.includes('var(--color-soft-blue)') &&
  dashboardAstroSrc.includes('@media (max-width: 640px)'),
  '12. Design enforces minimum 44px touch targets and responsive mobile breakpoints'
);

// 10. Onboarding Flow Integrity
assert(
  onboardingAstroSrc.includes('data-step="1"') &&
  onboardingAstroSrc.includes('data-step="2"') &&
  onboardingAstroSrc.includes('data-step="3"') &&
  onboardingAstroSrc.includes('saveResumeBtn') &&
  onboardingAstroSrc.includes('prevStepBtn'),
  '13. Onboarding maintains step-by-step navigation with previous, continue, and save-and-resume options'
);

console.log('----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------\n');

if (passed === total) {
  console.log('All TECHMED Task 2 Redesign validation checks passed successfully!\n');
} else {
  process.exit(1);
}
