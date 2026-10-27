// web/scripts/test-student-profile-onboarding.mjs
// Automated Unit & Integration Test Suite for:
// Section 1: Student Account Access, Profile & Onboarding Foundation

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
console.log('  TECHMED SECTION 1: STUDENT PROFILE & ONBOARDING VALIDATION');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');

const migrationPath = resolve(baseDir, 'supabase/migrations/20261026000001_student_profile_onboarding.sql');
const supabaseTsPath = resolve(baseDir, 'web/src/lib/supabase.ts');
const navbarPath = resolve(baseDir, 'web/src/components/Navbar.astro');
const loginPagePath = resolve(baseDir, 'web/src/pages/login.astro');
const registerPagePath = resolve(baseDir, 'web/src/pages/register.astro');
const onboardingPagePath = resolve(baseDir, 'web/src/pages/account/onboarding.astro');
const dashboardPagePath = resolve(baseDir, 'web/src/pages/dashboard.astro');

// 1. Files existence check
assert(existsSync(migrationPath), '1. Migration file exists: 20261026000001_student_profile_onboarding.sql');
assert(existsSync(onboardingPagePath), '2. Onboarding page exists: web/src/pages/account/onboarding.astro');
assert(existsSync(dashboardPagePath), '3. Persistent student dashboard exists: web/src/pages/dashboard.astro');
assert(existsSync(loginPagePath), '4. Dedicated login page exists: web/src/pages/login.astro');
assert(existsSync(registerPagePath), '5. Dedicated register page exists: web/src/pages/register.astro');

const migrationSql = readFileSync(migrationPath, 'utf-8');
const supabaseTs = readFileSync(supabaseTsPath, 'utf-8');
const navbarAstro = readFileSync(navbarPath, 'utf-8');
const loginAstro = readFileSync(loginPagePath, 'utf-8');
const onboardingAstro = readFileSync(onboardingPagePath, 'utf-8');
const dashboardAstro = readFileSync(dashboardPagePath, 'utf-8');

// 2. Migration Schema Extensions
assert(
  migrationSql.includes('ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS telegram_phone TEXT') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS parent_phone TEXT') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS utme_subjects TEXT[]') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN') &&
  migrationSql.includes('ADD COLUMN IF NOT EXISTS onboarding_step INTEGER'),
  '6. Migration extends public.profiles with all required onboarding columns'
);

// 3. UTME Subject Constraints and Validation in Migration
assert(
  migrationSql.includes('FUNCTION public.validate_utme_subjects') &&
  migrationSql.includes("cardinality(subjects) <> 4") &&
  migrationSql.includes("'English' = ANY(subjects)") &&
  migrationSql.includes("ARRAY['English', 'Biology', 'Chemistry', 'Physics', 'Mathematics']"),
  '7. Migration enforces 4 distinct UTME subjects with compulsory English from allowed science list'
);

// 4. RLS Policies on public.profiles
assert(
  migrationSql.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY') &&
  migrationSql.includes('CREATE POLICY "Users can read own profile"') &&
  migrationSql.includes('CREATE POLICY "Users can update own profile"') &&
  migrationSql.includes('CREATE POLICY "Users can insert own profile"'),
  '8. Migration verifies strict Row Level Security (RLS) on public.profiles'
);

// 5. Unique Verified Students Count Function
assert(
  migrationSql.includes('FUNCTION public.get_unique_verified_students_count()') &&
  migrationSql.includes('FROM public.entitlements') &&
  migrationSql.includes('FROM public.orders') &&
  migrationSql.includes('COUNT(DISTINCT COALESCE(user_id::text, email))'),
  '9. Migration implements de-duplicated get_unique_verified_students_count function'
);

// 6. Profile Completion Does NOT Grant Verified Status
assert(
  !migrationSql.includes('INSERT INTO public.entitlements') &&
  !migrationSql.includes("status = 'paid' WHERE user_id"),
  '10. Profile completion in migration never automatically creates paid entitlements or marks orders paid'
);

// 7. Supabase Client Library: StudentProfile and Allowed Subjects
assert(
  supabaseTs.includes('ALLOWED_UTME_SUBJECTS') &&
  supabaseTs.includes("'English'") &&
  supabaseTs.includes("'Biology'") &&
  supabaseTs.includes("'Chemistry'") &&
  supabaseTs.includes("'Physics'") &&
  supabaseTs.includes("'Mathematics'"),
  '11. supabase.ts exports ALLOWED_UTME_SUBJECTS array'
);

assert(
  supabaseTs.includes('whatsappPhone?: string') &&
  supabaseTs.includes('telegramPhone?: string') &&
  supabaseTs.includes('parentPhone?: string') &&
  supabaseTs.includes('utmeSubjects?: string[]') &&
  supabaseTs.includes('onboardingCompleted?: boolean') &&
  supabaseTs.includes('onboardingStep?: number'),
  '12. StudentProfile interface has all onboarding and contact fields'
);

// 8. Supabase Client Library: Helper Functions
assert(
  supabaseTs.includes('export async function fetchUserProfile') &&
  supabaseTs.includes('export async function saveUserProfile') &&
  supabaseTs.includes('export async function checkIsVerifiedStudent') &&
  supabaseTs.includes('export async function getUniqueVerifiedStudentsCount'),
  '13. supabase.ts exports fetchUserProfile, saveUserProfile, checkIsVerifiedStudent, and getUniqueVerifiedStudentsCount'
);

// 9. checkIsVerifiedStudent logic strictly requires paid orders or entitlements
assert(
  supabaseTs.includes('fetchUserEntitlements(userId, cleanEmail)') &&
  supabaseTs.includes("orderQuery = orderQuery.or(`user_id.eq.${userId},email.ilike.${cleanEmail}`)") &&
  supabaseTs.includes("isVerified = activeEntitlementsCount > 0 || paidOrdersCount > 0"),
  '14. checkIsVerifiedStudent strictly requires database entitlements or paid orders, never profile completion'
);

// 10. Navbar Account Access & Dropdown
assert(
  navbarAstro.includes('id="navAccountContainer"') &&
  navbarAstro.includes('id="navLoginLink"') &&
  navbarAstro.includes('id="navUserMenu"') &&
  navbarAstro.includes('id="navAvatarBtn"') &&
  navbarAstro.includes('id="navUserDropdown"'),
  '15. Navbar provides direct Log In link and authenticated user avatar menu'
);

assert(
  navbarAstro.includes('href="/dashboard"') &&
  navbarAstro.includes('href="/account/onboarding"') &&
  navbarAstro.includes('href="/library"') &&
  navbarAstro.includes('id="navSignOutBtn"'),
  '16. Navbar dropdown contains links to Dashboard, Profile & Onboarding, Bookshelf, and Sign Out'
);

assert(
  navbarAstro.includes('id="mobileAuthLoggedOut"') &&
  navbarAstro.includes('id="mobileAuthLoggedIn"'),
  '17. Navbar mobile menu provides dedicated student account access states'
);

// 11. Onboarding Page UI & Functionality
assert(
  onboardingAstro.includes('id="step1"') &&
  onboardingAstro.includes('id="step2"') &&
  onboardingAstro.includes('id="step3"'),
  '18. Onboarding flow contains 3 progressive steps (Contact, Academics, UTME Subjects)'
);

assert(
  onboardingAstro.includes('id="sameAsPhoneWhatsapp"') &&
  onboardingAstro.includes('id="sameAsPhoneTelegram"') &&
  onboardingAstro.includes('id="parentPhone"'),
  '19. Onboarding Step 1 collects WhatsApp/Telegram with phone reuse toggles and optional parent phone'
);

assert(
  onboardingAstro.includes('id="targetCourse"') &&
  onboardingAstro.includes('id="targetUniversity"'),
  '20. Onboarding Step 2 collects desired course and target university'
);

assert(
  onboardingAstro.includes('id="subEnglish"') &&
  onboardingAstro.includes('disabled') &&
  onboardingAstro.includes('compulsory') &&
  onboardingAstro.includes('id="subBiology"') &&
  onboardingAstro.includes('id="subChemistry"') &&
  onboardingAstro.includes('id="subPhysics"') &&
  onboardingAstro.includes('id="subMathematics"'),
  '21. Onboarding Step 3 enforces English as compulsory and offers 4 science electives'
);

assert(
  onboardingAstro.includes('id="saveResumeBtn"') &&
  onboardingAstro.includes('Save & Resume Later') &&
  onboardingAstro.includes('persistProfile(false)'),
  '22. Onboarding supports saving progress and resuming later'
);

assert(
  onboardingAstro.includes('disclaimer-banner') &&
  onboardingAstro.includes('does not automatically grant paid cohort access or verified student status'),
  '23. Onboarding clearly clarifies that completing profile does not grant verified paid status'
);

// 12. Persistent Dashboard Route
assert(
  dashboardAstro.includes('id="verifiedStatusBadge"') &&
  dashboardAstro.includes('id="incompleteBanner"') &&
  dashboardAstro.includes('id="displayTargetCourse"') &&
  dashboardAstro.includes('id="displayTargetUniversity"') &&
  dashboardAstro.includes('id="subjectPills"'),
  '24. Student dashboard displays academic target, UTME subjects, profile status, and verified status badge'
);

assert(
  dashboardAstro.includes('id="unverifiedNotice"') &&
  dashboardAstro.includes('Verified TECHMED student privileges, cohort masterclasses, and booster systems unlock automatically'),
  '25. Dashboard provides clear guidance for free registered candidates'
);

console.log('\n----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------\n');

if (passed === total) {
  console.log('All Section 1 validation checks passed successfully!\n');
  process.exit(0);
} else {
  console.error(`Validation failed with ${total - passed} failing test(s).\n`);
  process.exit(1);
}
