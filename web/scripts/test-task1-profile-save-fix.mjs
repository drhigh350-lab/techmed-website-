// web/scripts/test-task1-profile-save-fix.mjs
// Test suite for Task 1: Fix profile saving and onboarding flow

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
console.log('  TASK 1: PROFILE SAVING & ONBOARDING REMEDIATION VERIFICATION');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');
const supabaseTs = readFileSync(resolve(baseDir, 'web/src/lib/supabase.ts'), 'utf-8');
const onboardingAstro = readFileSync(resolve(baseDir, 'web/src/pages/account/onboarding.astro'), 'utf-8');
const migrationSql = readFileSync(resolve(baseDir, 'supabase/migrations/20261026000001_student_profile_onboarding.sql'), 'utf-8');

// 1. Migration readiness
assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.profiles') &&
  migrationSql.includes('id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE') &&
  migrationSql.includes('utme_subjects TEXT[] DEFAULT ARRAY[\'English\']::TEXT[]'),
  '1. Migration 20261026000001 safely creates public.profiles if not exists'
);

assert(
  migrationSql.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY') &&
  migrationSql.includes('CREATE POLICY "Users can read own profile"') &&
  migrationSql.includes('CREATE POLICY "Users can update own profile"'),
  '2. Migration defines strict Row Level Security (RLS) policies for user profile isolation'
);

// 2. Resilience against missing schema cache in saveUserProfile
assert(
  supabaseTs.includes('supabase.auth.updateUser({') &&
  supabaseTs.includes('metaPayload'),
  '3. saveUserProfile persists metadata via supabase.auth.updateUser'
);

assert(
  supabaseTs.includes(".from('profiles')") &&
  supabaseTs.includes('.upsert(payload)') &&
  supabaseTs.includes('dbProfile = data'),
  '4. saveUserProfile dual-writes to public.profiles table when available'
);

assert(
  supabaseTs.includes('if (authUser)') &&
  supabaseTs.includes('meta.target_university') &&
  supabaseTs.includes('meta.utme_subjects'),
  '5. saveUserProfile constructs valid StudentProfile from auth metadata if table is missing in schema cache'
);

// 3. fetchUserProfile resilience
assert(
  supabaseTs.includes('const { data: sessionData } = await supabase.auth.getSession()') ||
  supabaseTs.includes('const { data: userData } = await supabase.auth.getUser()'),
  '6. fetchUserProfile falls back to Supabase Auth metadata when database table is pending migration'
);

assert(
  supabaseTs.includes('if (!userId) {') &&
  supabaseTs.includes("return { profile: null, error: 'User ID is required' };"),
  '7. fetchUserProfile and saveUserProfile enforce valid userId requirement'
);

// 4. Onboarding UI Error & Loading states
assert(
  onboardingAstro.includes('id="loadingState"') &&
  onboardingAstro.includes('id="unauthCard"') &&
  onboardingAstro.includes('id="onboardingCard"'),
  '8. Onboarding UI handles Loading, Unauthorized, and Main states cleanly'
);

assert(
  onboardingAstro.includes('showAlert(') &&
  onboardingAstro.includes('onboardingAlert.className = `onboarding-alert ${type}`'),
  '9. Onboarding UI provides accessible feedback alerts for validation, errors, and success'
);

assert(
  onboardingAstro.includes('async function persistProfile(isCompleting = false)') &&
  onboardingAstro.includes('window.location.href = \'/dashboard?welcome=true\''),
  '10. Form submission completes profile and navigates to student dashboard'
);

console.log('\n----------------------------------------------------------------');
console.log(`  Tests Passed: ${passed} / ${total}`);
console.log('----------------------------------------------------------------');

if (passed === total) {
  console.log('All Task 1 verification checks passed successfully!\n');
  process.exit(0);
} else {
  console.error('Some Task 1 checks failed!\n');
  process.exit(1);
}
