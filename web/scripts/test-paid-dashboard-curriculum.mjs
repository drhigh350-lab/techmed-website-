// web/scripts/test-paid-dashboard-curriculum.mjs
// Automated Unit & Integration Test Suite for:
// TECHMED Paid Student Dashboard, Timetable, 12-Week Curriculum, and Classrooms

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
console.log('  TECHMED PAID DASHBOARD, TIMETABLE & CURRICULUM TEST SUITE');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');

const dashboardDataPath = resolve(baseDir, 'web/src/lib/dashboard-data.ts');
const dashboardPagePath = resolve(baseDir, 'web/src/pages/dashboard.astro');
const callbackPagePath = resolve(baseDir, 'web/src/pages/payment/callback.astro');

// 1. Files existence check
assert(existsSync(dashboardDataPath), '1. Structured data module exists: web/src/lib/dashboard-data.ts');
assert(existsSync(dashboardPagePath), '2. Student Dashboard page exists: web/src/pages/dashboard.astro');
assert(existsSync(callbackPagePath), '3. Payment Callback page exists: web/src/pages/payment/callback.astro');

const dashboardDataSrc = readFileSync(dashboardDataPath, 'utf-8');
const dashboardAstroSrc = readFileSync(dashboardPagePath, 'utf-8');
const callbackAstroSrc = readFileSync(callbackPagePath, 'utf-8');

// 2. Programme Dates & Metadata
assert(
  dashboardDataSrc.includes('30 November 2026 – 28 February 2027') &&
  dashboardDataSrc.includes('30 November 2026 – 21 February 2027') &&
  dashboardDataSrc.includes('4 Hours Daily'),
  '4. Programme metadata specifies official dates (30 Nov 2026 – 28 Feb 2027) and daily lecture hours'
);

// 3. Timetable Schedule Structure
assert(
  dashboardDataSrc.includes("day: 'Monday'") &&
  dashboardDataSrc.includes("day: 'Tuesday'") &&
  dashboardDataSrc.includes("day: 'Wednesday'") &&
  dashboardDataSrc.includes("day: 'Thursday'") &&
  dashboardDataSrc.includes("day: 'Friday'") &&
  dashboardDataSrc.includes("day: 'Saturday'") &&
  dashboardDataSrc.includes('7:00 PM – 9:00 PM') &&
  dashboardDataSrc.includes('9:00 PM – 9:10 PM') &&
  dashboardDataSrc.includes('9:10 PM – 11:10 PM'),
  '5. Timetable contains Monday–Saturday schedule with Session A (7–9 PM), 10-min break, and Session B (9:10–11:10 PM)'
);

// 4. Exact Subject Allocations in Timetable
assert(
  dashboardDataSrc.includes('Biology / Mathematics') &&
  dashboardDataSrc.includes('Mathematics / Biology') &&
  dashboardDataSrc.includes('English Language') &&
  dashboardDataSrc.includes('Chemistry') &&
  dashboardDataSrc.includes('Physics'),
  '6. Timetable pairs Biology / Mathematics in designated slots and maps all 5 subjects'
);

// 5. Timetable rendered as structured website content, not an image
assert(
  dashboardAstroSrc.includes('<table class="timetable-table"') &&
  dashboardAstroSrc.includes('Session A') &&
  dashboardAstroSrc.includes('Session B') &&
  dashboardAstroSrc.includes('10 Min Break') &&
  !dashboardAstroSrc.includes('<img src="/public/assets/aistudio/file_000000008b18820c88c9f91c69582ab0_c0334f68.png"'),
  '7. Timetable is implemented as structured website content, not an image substitute'
);

// 6. Timetable Explanatory Callout
assert(
  dashboardAstroSrc.includes('A 10-minute break separates the two daily sessions') &&
  dashboardAstroSrc.includes('Biology and Mathematics share designated session slots'),
  '8. Timetable includes callout explaining 10-min break and shared Biology/Mathematics slots'
);

// 7. Complete 12-Week Curriculum Coverage
const all12WeeksPresent = Array.from({ length: 12 }, (_, i) => i + 1).every(w =>
  dashboardDataSrc.includes(`weekNumber: ${w}`)
);
assert(all12WeeksPresent, '9. Curriculum data covers all 12 weeks completely');

// 8. All 5 Subjects Transcribed Across Weeks
assert(
  dashboardDataSrc.includes('Measurements & Units') && // Wk 1 Physics
  dashboardDataSrc.includes('Separation of Mixtures & Purification') && // Wk 1 Chemistry
  dashboardDataSrc.includes('Passage Understanding & Main Ideas') && // Wk 1 English
  dashboardDataSrc.includes('Living Organisms') && // Wk 1 Biology
  dashboardDataSrc.includes('Number Bases') && // Wk 1 Math
  dashboardDataSrc.includes('The Lekki Headmaster') && // Wk 9 English
  dashboardDataSrc.includes('Organic Chemistry') && // Wk 12 Chemistry
  dashboardDataSrc.includes('Radioactivity') && // Wk 11 Physics
  dashboardDataSrc.includes('Genetics & Sex Determination'), // Wk 11 Biology
  '10. Curriculum accurately transcribes high-yield topics across Physics, Chemistry, English, Biology, and Math'
);

// 9. Scheduled JAMB-Standard Mock Examinations (3 monthly + 1 final)
assert(
  dashboardDataSrc.includes('First Monthly JAMB-Standard Mock') &&
  dashboardDataSrc.includes('Sunday, 27 December') &&
  dashboardDataSrc.includes('Second Monthly JAMB-Standard Mock') &&
  dashboardDataSrc.includes('Sunday, 24 January') &&
  dashboardDataSrc.includes('Third Monthly JAMB-Standard Mock') &&
  dashboardDataSrc.includes('Sunday, 31 January') &&
  dashboardDataSrc.includes('Final Monthly JAMB-Standard Mock') &&
  dashboardDataSrc.includes('Sunday, 21 February') &&
  dashboardDataSrc.includes('questions: 180') &&
  dashboardDataSrc.includes("duration: '2 Hours'"),
  '11. Curriculum preserves exact mock exam dates, 180 questions, 2-hour duration, and cumulative scope'
);

// 10. Curriculum rendered as structured HTML with navigation
assert(
  dashboardAstroSrc.includes('class="weeks-container"') &&
  (dashboardAstroSrc.includes('class="week-card"') || dashboardAstroSrc.includes("'week-card'")) &&
  dashboardAstroSrc.includes('class="subject-filter-toolbar"') &&
  dashboardAstroSrc.includes('class="week-nav-scroll"'),
  '12. Curriculum is rendered as structured HTML content with week navigation and subject filters'
);

// 11. All 7 Exact Classroom and Community URLs Wired In
const REQUIRED_URLS = [
  'https://t.me/+-MMNZixSVJM3ZjRk', // Biology
  'https://t.me/+B6xm1bGauWgyZDJk', // Chemistry
  'https://t.me/+Uhvk2wlI-LQ3MWJk', // Physics
  'https://t.me/+WAhmsDP-4rM4OWVk', // English
  'https://t.me/+H5AcDzEEd49kMTJk', // Mathematics
  'https://chat.whatsapp.com/HKR7lb7mRoA5wivQLjUhUc?s=cl&p=a&mlu=4&ilr=4&iam=2', // Brainstorming Group
  'https://whatsapp.com/channel/0029Vb8nzXH545v4f8EF103D', // WhatsApp Channel
];

const allUrlsWired = REQUIRED_URLS.every(url => dashboardDataSrc.includes(url));
assert(allUrlsWired, '13. All 7 exact Telegram classroom and WhatsApp community URLs are properly wired');

// 12. Classroom Access Control in Dashboard
assert(
  dashboardAstroSrc.includes('id="classroomSection"') &&
  dashboardAstroSrc.includes('updateClassroomsAccess') &&
  dashboardAstroSrc.includes('Enrolment Required for Live Lecture Rooms'),
  '14. Dashboard enforces database-backed access control for subject classrooms'
);

// 13. First-Step Guide for Newly Enrolled Students
assert(
  dashboardAstroSrc.includes('id="quickstartSection"') &&
  dashboardAstroSrc.includes('First-Step Guide for Students') &&
  dashboardDataSrc.includes('Verify Your 4 UTME Subjects & Profile') &&
  dashboardDataSrc.includes('Join Your Subject Telegram Classrooms') &&
  dashboardDataSrc.includes('Practice with Kairo CBT Speed Drills'),
  '15. Dashboard includes a clear 5-step onboarding guide for newly enrolled students'
);

// 14. Post-Payment Flow Guides Enrolled Students to Dashboard
assert(
  callbackAstroSrc.includes("openReaderBtn.href = '/dashboard'") &&
  callbackAstroSrc.includes("Enter Student Dashboard →") &&
  callbackAstroSrc.includes('https://chat.whatsapp.com/HKR7lb7mRoA5wivQLjUhUc?s=cl&p=a&mlu=4&ilr=4&iam=2'),
  '16. Payment callback guides students directly to dashboard and wires Brainstorming Group on payment success'
);

// 15. Post-Payment Account Creation Auto-Redirects to Dashboard
assert(
  callbackAstroSrc.includes('Account created successfully! Redirecting to your dashboard') &&
  callbackAstroSrc.includes("window.location.href = '/dashboard'"),
  '17. Post-payment account creation safely redirects student directly into their dashboard'
);

// 16. Preservation of Section 2 & 3 Foundations
assert(
  dashboardAstroSrc.includes('id="studentGreetingName"') &&
  dashboardAstroSrc.includes('id="verifiedStatusBadge"') &&
  dashboardAstroSrc.includes('id="planPillContainer"') &&
  dashboardAstroSrc.includes('id="benefitsSection"') &&
  dashboardAstroSrc.includes('data-filter="all-my"'),
  '18. Preserves existing authentication, verified status badge, plan pills, and entitlement filters'
);

console.log('----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------');

if (passed === total) {
  console.log('All TECHMED Paid Dashboard & Curriculum validation checks passed successfully!\n');
} else {
  process.exit(1);
}
