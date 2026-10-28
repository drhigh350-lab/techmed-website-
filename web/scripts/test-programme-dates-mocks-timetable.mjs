// web/scripts/test-programme-dates-mocks-timetable.mjs
// Verification suite for:
// 1. Programme-date messaging (preparation towards UTME date, no fixed February programme end)
// 2. Mock-examination scheduling (3 JAMB mocks on fourth Sundays: Dec 27, Jan 24, Feb 28)
// 3. Timetable & syllabus wording (no subject topic descriptions, parallel stream note exclusively for Bio/Math, official JAMB syllabus)
// 4. Bookshelf & CBT simplification (only Study Tools & Quick Links retained on dashboard, /library authoritative)

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let total = 0;

function assert(cond, name, details = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`  [PASS] Test ${total.toString().padStart(2, '0')}: ${name}`);
  } else {
    console.error(`  [FAIL] Test ${total.toString().padStart(2, '0')}: ${name}`);
    if (details) console.error(`         ${details}`);
  }
}

console.log('================================================================');
console.log('  TECHMED: PROGRAMME DATES, MOCKS, TIMETABLE & BOOKSHELF AUDIT');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');
const dashboardDataPath = resolve(baseDir, 'web/src/lib/dashboard-data.ts');
const dashboardAstroPath = resolve(baseDir, 'web/src/pages/dashboard.astro');
const libraryPagePath = resolve(baseDir, 'web/src/pages/library/index.astro');
const toolsPagePath = resolve(baseDir, 'web/src/pages/tools.astro');

assert(existsSync(dashboardDataPath), '1. dashboard-data.ts exists');
assert(existsSync(dashboardAstroPath), '2. dashboard.astro exists');
assert(existsSync(libraryPagePath), '3. Authoritative library.astro exists and was preserved');
assert(existsSync(toolsPagePath), '4. Authoritative CBT tools.astro exists and was preserved');

const dataSrc = readFileSync(dashboardDataPath, 'utf-8');
const astroSrc = readFileSync(dashboardAstroPath, 'utf-8');

// Section 1: Programme Date Messaging
assert(
  !dataSrc.includes("officialDates: '30 November 2026 – 28 February 2027'") &&
  !astroSrc.includes('8 Drills · 4 JAMB Mocks') &&
  (dataSrc.includes('UTME Examination Date') || dataSrc.includes('towards UTME')),
  '5. Programme end date does not fixate on 28 February 2027 for overall preparation, pointing towards UTME examination date'
);

// Section 2: Mock-Examination Scheduling (3 Mocks, 4th Sundays)
assert(
  dataSrc.includes('THREE_MONTHLY_MOCKS') &&
  dataSrc.includes('Sunday, 27 December 2026') && // 4th Sunday Dec 2026
  dataSrc.includes('Sunday, 24 January 2027') &&  // 4th Sunday Jan 2027
  dataSrc.includes('Sunday, 28 February 2027') && // 4th Sunday Feb 2027
  dataSrc.includes('Weekly CBT Drill 9') &&        // Week 9 (5th Sunday Jan) is a drill
  dataSrc.includes('Weekly CBT Drill 12'),        // Week 12 (3rd Sunday Feb) is a drill
  '6. Exactly 3 JAMB-standard mocks scheduled on the 4th Sunday of each month (Dec 27, Jan 24, Feb 28), weeks 9 & 12 are drills'
);

assert(
  astroSrc.includes('Weekly Drills · 3 Monthly JAMB Mocks') &&
  !astroSrc.includes('4 Full JAMB-Standard Mocks'),
  '7. Dashboard overview displays "Weekly Drills · 3 Monthly JAMB Mocks"'
);

// Section 3: Timetable & Syllabus Wording
assert(
  !dataSrc.includes('Full cohort intensive lecture & calculation breakdown') &&
  !dataSrc.includes('Formula derivation, mechanics & problem walkthroughs') &&
  !dataSrc.includes('Equilibrium, kinetics, organic chemistry & question practice') &&
  !dataSrc.includes('Acids, bases, salts, qualitative analysis & synthesis') &&
  !dataSrc.includes('Modern physics, atomic models & weekly problem consolidation'),
  '8. Timetable subjects have no topic descriptions beneath individual subjects'
);

assert(
  dataSrc.includes('Parallel streams run concurrently; candidates attend their registered subject (Biology or Mathematics).') &&
  astroSrc.includes('Biology and Mathematics classes run in parallel so students offering either subject can attend their respective stream.'),
  '9. Parallel stream explanation is retained exclusively for Biology/Mathematics'
);

assert(
  !astroSrc.includes('official TECHMED syllabus standards') &&
  astroSrc.includes('official JAMB syllabus standards') &&
  dataSrc.includes('official JAMB syllabus and schedule specifications'),
  '10. Syllabus attribution properly references "official JAMB syllabus standards"'
);

// Section 4: Bookshelf & CBT Simplification
assert(
  !astroSrc.includes('id="cbtSection"') &&
  !astroSrc.includes('id="benefitsSection"') &&
  !astroSrc.includes('class="cbt-schedule-card"') &&
  !astroSrc.includes('class="benefits-section"'),
  '11. Redundant CBT schedule card and Student Resources & Bookshelf card removed from dashboard'
);

assert(
  astroSrc.includes('class="dashboard-card quick-access-card dashboard-view-section" data-section-view="resources"') &&
  astroSrc.includes('Study Tools &amp; Quick Links') &&
  astroSrc.includes('href="/library"') &&
  astroSrc.includes('Student Bookshelf') &&
  astroSrc.includes('href="/tools"') &&
  astroSrc.includes('Kairo CBT Speed Drills'),
  '12. Bookshelf & CBT section retains Study Tools & Quick Links directing to authoritative Library and CBT'
);

console.log(`\nResults: ${passed} of ${total} tests passed.\n`);
if (passed === total) {
  console.log('✓ ALL SPECIFICATIONS VERIFIED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('✗ Some tests failed.');
  process.exit(1);
}
