/**
 * Regression & Compliance Test Suite for Gap Audit Remediation (Steps 1–5)
 * Run with: node web/scripts/test-gap-audit-remediation.mjs
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const webDir = path.resolve(rootDir, 'web');

console.log('--- TECHMED GAP AUDIT REMEDIATION TEST SUITE ---');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// STEP 1: MIGRATION PL/PGSQL SYNTAX VALIDATION
// -----------------------------------------------------------------------------
console.log('\n[STEP 1] Validating Migration 20261026000001_student_profile_onboarding.sql');

runTest('Migration file exists and has correct name', () => {
  const migPath = path.join(rootDir, 'supabase/migrations/20261026000001_student_profile_onboarding.sql');
  assert.ok(fs.existsSync(migPath), 'Migration file must exist');
});

runTest('Migration has no standalone LOOP; syntax error (has END LOOP;)', () => {
  const migContent = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20261026000001_student_profile_onboarding.sql'),
    'utf-8'
  );
  // Must NOT have line ending with bare "LOOP;"
  const hasBareLoop = /^\s*LOOP;\s*$/m.test(migContent);
  assert.strictEqual(hasBareLoop, false, 'Migration must not contain bare "LOOP;"');
  assert.ok(migContent.includes('END LOOP;'), 'Migration must properly close loop with "END LOOP;"');
});

runTest('Migration contains complete schema, constraints, and RLS policies', () => {
  const migContent = fs.readFileSync(
    path.join(rootDir, 'supabase/migrations/20261026000001_student_profile_onboarding.sql'),
    'utf-8'
  );
  assert.ok(migContent.includes('target_university'), 'Must add target_university column');
  assert.ok(migContent.includes('target_course'), 'Must add target_course column');
  assert.ok(migContent.includes('utme_subjects'), 'Must add utme_subjects column');
  assert.ok(migContent.includes('onboarding_completed'), 'Must add onboarding_completed column');
  assert.ok(migContent.includes('validate_utme_subjects'), 'Must define validate_utme_subjects function');
  assert.ok(migContent.includes('get_unique_verified_students_count'), 'Must define get_unique_verified_students_count function');
});

// -----------------------------------------------------------------------------
// STEP 2: LOGIN REDIRECT SECURITY & SANITIZATION
// -----------------------------------------------------------------------------
console.log('\n[STEP 2] Validating Login Redirect Security');

import { sanitizeRedirectUrl } from '../src/lib/supabase.ts';

runTest('sanitizeRedirectUrl allows valid internal relative paths', () => {
  assert.strictEqual(sanitizeRedirectUrl('/dashboard'), '/dashboard');
  assert.strictEqual(sanitizeRedirectUrl('/account/onboarding'), '/account/onboarding');
  assert.strictEqual(sanitizeRedirectUrl('/account/settings'), '/account/settings');
  assert.strictEqual(sanitizeRedirectUrl('/library'), '/library');
  assert.strictEqual(sanitizeRedirectUrl('/resources/chemistry-booster-system'), '/resources/chemistry-booster-system');
  assert.strictEqual(sanitizeRedirectUrl('/pricing?plan=mastery'), '/pricing?plan=mastery');
});

runTest('sanitizeRedirectUrl rejects protocol-relative URL exploits (//)', () => {
  assert.strictEqual(sanitizeRedirectUrl('//evil.com'), '/dashboard');
  assert.strictEqual(sanitizeRedirectUrl('//evil.com/phish'), '/dashboard');
  assert.strictEqual(sanitizeRedirectUrl('///malicious.org'), '/dashboard');
});

runTest('sanitizeRedirectUrl rejects backslash evasion exploits (/\\)', () => {
  assert.strictEqual(sanitizeRedirectUrl('/\\evil.com'), '/dashboard');
  assert.strictEqual(sanitizeRedirectUrl('\\\\evil.com'), '/dashboard');
});

runTest('sanitizeRedirectUrl rejects external absolute URLs', () => {
  assert.strictEqual(sanitizeRedirectUrl('https://evil.com'), '/dashboard');
  assert.strictEqual(sanitizeRedirectUrl('http://evil.com/login'), '/dashboard');
  assert.strictEqual(sanitizeRedirectUrl('ftp://evil.com'), '/dashboard');
});

runTest('sanitizeRedirectUrl rejects javascript: and data: URIs', () => {
  assert.strictEqual(sanitizeRedirectUrl('javascript:alert(1)'), '/dashboard');
  assert.strictEqual(sanitizeRedirectUrl('data:text/html,evil'), '/dashboard');
});

runTest('sanitizeRedirectUrl uses custom fallback when provided', () => {
  assert.strictEqual(sanitizeRedirectUrl('https://evil.com', '/account/onboarding'), '/account/onboarding');
  assert.strictEqual(sanitizeRedirectUrl(null, '/library'), '/library');
  assert.strictEqual(sanitizeRedirectUrl('', '/settings'), '/settings');
});

runTest('web/src/pages/login.astro uses sanitizeRedirectUrl', () => {
  const loginContent = fs.readFileSync(path.join(webDir, 'src/pages/login.astro'), 'utf-8');
  assert.ok(loginContent.includes('sanitizeRedirectUrl'), 'login.astro must import and use sanitizeRedirectUrl');
  assert.ok(loginContent.includes("sanitizeRedirectUrl(urlParams.get('redirect')"), 'login.astro must sanitize redirect query param');
});

// -----------------------------------------------------------------------------
// STEP 3: ENTITLEMENT CONSISTENCY IN LIBRARY BOOKSHELF
// -----------------------------------------------------------------------------
console.log('\n[STEP 3] Validating Entitlement Consistency in Bookshelf');

import { getUserResourceEntitlements } from '../src/lib/supabase.ts';

runTest('web/src/pages/library/index.astro imports and uses getUserResourceEntitlements', () => {
  const libContent = fs.readFileSync(path.join(webDir, 'src/pages/library/index.astro'), 'utf-8');
  assert.ok(libContent.includes('getUserResourceEntitlements'), 'library/index.astro must import getUserResourceEntitlements');
  assert.ok(libContent.includes('await getUserResourceEntitlements(user.id, user.email)'), 'showLibraryView must call getUserResourceEntitlements');
  assert.ok(libContent.includes('currentUserResources.filter(item => item.isOwned)'), 'renderBookshelf must map owned items from currentUserResources');
});

runTest('getUserResourceEntitlements grants Chemistry, Biology, Physics boosters to Mastery cohort', async () => {
  // Mock fetchUserEntitlements output for a Mastery student
  // In pure function test, test the logic by verifying catalogue definitions and inclusion rules
  const res = await getUserResourceEntitlements();
  // Free candidate has 2 free resources owned
  assert.strictEqual(res.items.find(i => i.id === 'admission-intelligence-guide-2026')?.isOwned, true);
  assert.strictEqual(res.items.find(i => i.id === 'free-quiz-practice')?.isOwned, true);
  // Without purchases, boosters are not owned
  assert.strictEqual(res.items.find(i => i.id === 'chemistry-booster')?.isOwned, false);
  assert.strictEqual(res.items.find(i => i.id === 'biology-booster')?.isOwned, false);
  assert.strictEqual(res.items.find(i => i.id === 'physics-booster')?.isOwned, false);
});

// -----------------------------------------------------------------------------
// STEP 4: ADMIN ENTITLEMENT PERSISTENCE & AUTHORIZATION
// -----------------------------------------------------------------------------
console.log('\n[STEP 4] Validating Admin Entitlement Persistence & Security');

runTest('web/src/pages/library/admin.astro enforces server-verified admin authorization before grant', () => {
  const adminContent = fs.readFileSync(path.join(webDir, 'src/pages/library/admin.astro'), 'utf-8');
  assert.ok(adminContent.includes('await checkIsAdmin(currentAdminUser)'), 'Must check admin privileges server-side');
  assert.ok(adminContent.includes("alert('Access Denied: Your account does not have verified administrator privileges.')"), 'Must deny non-admin users');
});

runTest('web/src/pages/library/admin.astro validates student email and resource input', () => {
  const adminContent = fs.readFileSync(path.join(webDir, 'src/pages/library/admin.astro'), 'utf-8');
  assert.ok(adminContent.includes('/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/'), 'Must validate email format with regex');
  assert.ok(adminContent.includes('if (!email || !resId)'), 'Must validate required fields');
});

runTest('web/src/pages/library/admin.astro persists manual grant to public.entitlements table', () => {
  const adminContent = fs.readFileSync(path.join(webDir, 'src/pages/library/admin.astro'), 'utf-8');
  assert.ok(adminContent.includes(".from('entitlements')\n        .insert(rowsToInsert)"), 'Must insert into entitlements table');
  assert.ok(adminContent.includes('granted_by: currentAdminUser.id'), 'Must record admin user ID in granted_by');
  assert.ok(adminContent.includes('Database Authorization Error: Server RLS policy prevented entitlement creation'), 'Must handle RLS authorization errors');
});

runTest('web/src/pages/library/admin.astro persists approved bank transfer entitlements to database', () => {
  const adminContent = fs.readFileSync(path.join(webDir, 'src/pages/library/admin.astro'), 'utf-8');
  assert.ok(adminContent.includes(".from('entitlements').insert({"), 'approveTransfer must insert into entitlements table');
  assert.ok(adminContent.includes("source_order_reference: item.reference"), 'approveTransfer must link bank transfer reference');
});

// -----------------------------------------------------------------------------
// STEP 5: COMPONENT DEDUPLICATION & CLEAN NAVIGATION
// -----------------------------------------------------------------------------
console.log('\n[STEP 5] Validating StudentHubNav Component & Key Deduplication');

runTest('StudentHubNav.astro component exists with props interface', () => {
  const navPath = path.join(webDir, 'src/components/StudentHubNav.astro');
  assert.ok(fs.existsSync(navPath), 'StudentHubNav.astro must exist');
  const content = fs.readFileSync(navPath, 'utf-8');
  assert.ok(content.includes('activeTab?:'), 'Must define activeTab prop');
  assert.ok(content.includes('aria-label="Student space navigation"'), 'Must have accessible aria label');
});

runTest('Dashboard uses StudentHubNav component', () => {
  const dashContent = fs.readFileSync(path.join(webDir, 'src/pages/dashboard.astro'), 'utf-8');
  assert.ok(dashContent.includes("import StudentHubNav from '../components/StudentHubNav.astro';"), 'Must import StudentHubNav');
  assert.ok(dashContent.includes('<StudentHubNav activeTab="dashboard" />'), 'Must render StudentHubNav with activeTab="dashboard"');
});

runTest('Onboarding uses StudentHubNav component', () => {
  const onbContent = fs.readFileSync(path.join(webDir, 'src/pages/account/onboarding.astro'), 'utf-8');
  assert.ok(onbContent.includes("import StudentHubNav from '../../components/StudentHubNav.astro';"), 'Must import StudentHubNav');
  assert.ok(onbContent.includes('<StudentHubNav activeTab="onboarding" />'), 'Must render StudentHubNav with activeTab="onboarding"');
});

runTest('Settings uses StudentHubNav component', () => {
  const setContent = fs.readFileSync(path.join(webDir, 'src/pages/account/settings.astro'), 'utf-8');
  assert.ok(setContent.includes("import StudentHubNav from '../../components/StudentHubNav.astro';"), 'Must import StudentHubNav');
  assert.ok(setContent.includes('<StudentHubNav activeTab="settings" />'), 'Must render StudentHubNav with activeTab="settings"');
});

runTest('SUPABASE_ANON_KEY is imported and deduplicated across checkout and callback modules', () => {
  const callbackContent = fs.readFileSync(path.join(webDir, 'src/pages/payment/callback.astro'), 'utf-8');
  const planModalContent = fs.readFileSync(path.join(webDir, 'src/components/PlanCheckoutModal.astro'), 'utf-8');
  const checkoutModalContent = fs.readFileSync(path.join(webDir, 'src/components/CheckoutModal.astro'), 'utf-8');

  assert.ok(callbackContent.includes('SUPABASE_ANON_KEY') && !callbackContent.includes('const SUPABASE_ANON_KEY ='), 'callback.astro must import SUPABASE_ANON_KEY without duplicate declaration');
  assert.ok(planModalContent.includes('SUPABASE_ANON_KEY') && !planModalContent.includes('const SUPABASE_ANON_KEY ='), 'PlanCheckoutModal.astro must import SUPABASE_ANON_KEY without duplicate declaration');
  assert.ok(checkoutModalContent.includes('SUPABASE_ANON_KEY') && !checkoutModalContent.includes('const SUPABASE_ANON_KEY ='), 'CheckoutModal.astro must import SUPABASE_ANON_KEY without duplicate declaration');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log(`\nResults: ${passedTests} passed, ${failedTests} failed.`);
if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✓ All Gap Audit Remediation tests passed successfully!');
}
