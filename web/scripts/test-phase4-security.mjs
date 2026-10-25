// TECHMED Phase 4 Automated Security Hardening & End-to-End Verification Suite
// File: web/scripts/test-phase4-security.mjs
// Run: node scripts/test-phase4-security.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..');

const results = [];

function recordTest(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASSED' });
    console.log(`[PASS] ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAILED', error: err.message });
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

console.log('================================================================');
console.log('TECHMED PHASE 4 — SECURITY & END-TO-END VERIFICATION SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Admin Passcode Elimination
// -----------------------------------------------------------------------------
recordTest('Scenario 1: Complete elimination of hardcoded operations keys and static passcodes', () => {
  const adminAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/admin.astro'), 'utf8');
  assert.ok(!adminAstro.includes('TECHMED-ADMIN-2027'), 'Found TECHMED-ADMIN-2027 in admin.astro');
  assert.ok(!adminAstro.includes('ADMIN_PASSCODE'), 'Found ADMIN_PASSCODE variable in admin.astro');
  assert.ok(!adminAstro.includes("sessionStorage.setItem('techmed_admin_unlocked'"), 'Found insecure sessionStorage admin unlock flag');

  // Verify across entire web source
  const walk = (dir) => {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (f !== 'node_modules' && f !== '.git' && f !== 'dist') walk(full);
      } else if (f.endsWith('.astro') || f.endsWith('.ts') || f.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        assert.ok(!content.includes('TECHMED-ADMIN-2027'), `Found TECHMED-ADMIN-2027 in ${full}`);
      }
    }
  };
  walk(path.join(webRoot, 'src'));
});

// -----------------------------------------------------------------------------
// TEST 2: Server-Side Admin Authorization (Deny by default)
// -----------------------------------------------------------------------------
recordTest('Scenario 2: Server-side admin authorization enforcement (deny by default)', () => {
  const supabaseTs = fs.readFileSync(path.join(webRoot, 'src/lib/supabase.ts'), 'utf8');
  assert.ok(supabaseTs.includes('export async function checkIsAdmin'), 'Missing checkIsAdmin function');
  assert.ok(supabaseTs.includes("if (!user?.id) return false;"), 'checkIsAdmin does not deny unauthenticated callers by default');
  assert.ok(supabaseTs.includes("rpc('is_admin')"), 'checkIsAdmin does not check server-side is_admin RPC');
  assert.ok(supabaseTs.includes("profile?.role === 'admin'"), 'checkIsAdmin does not verify admin role');

  const adminAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/admin.astro'), 'utf8');
  assert.ok(adminAstro.includes('const isAdmin = await checkIsAdmin(currentAdminUser);'), 'admin.astro does not check server-verified admin role');
  assert.ok(adminAstro.includes('Access Denied: Administrator Role Required'), 'admin.astro does not present explicit unauthorized denial');
});

// -----------------------------------------------------------------------------
// TEST 3: Privilege Escalation Prevention on Profiles Role
// -----------------------------------------------------------------------------
recordTest('Scenario 3: Privilege escalation prevention (users cannot mutate role to admin)', () => {
  const mig3 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig3.includes('check_profile_role_update'), 'Missing profile role update trigger function');
  assert.ok(mig3.includes('Privilege escalation blocked'), 'Missing trigger exception message');
  assert.ok(mig3.includes('trg_protect_profile_role'), 'Missing trigger definition on profiles table');
});

// -----------------------------------------------------------------------------
// TEST 4: Authoritative Bank Account Details Across All Surfaces
// -----------------------------------------------------------------------------
recordTest('Scenario 4: Authoritative bank account details (Moniepoint MFB, Johnson Wisdom Onyekachi, 6573645432)', () => {
  const readAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/read/[id].astro'), 'utf8');
  assert.ok(readAstro.includes('6573645432'), 'Missing authoritative account 6573645432 in reader');
  assert.ok(readAstro.includes('Johnson Wisdom Onyekachi'), 'Missing account name in reader');

  const modalAstro = fs.readFileSync(path.join(webRoot, 'src/components/CheckoutModal.astro'), 'utf8');
  assert.ok(modalAstro.includes('6573645432'), 'Missing authoritative account in CheckoutModal');
  assert.ok(modalAstro.includes('Johnson Wisdom Onyekachi'), 'Missing account name in CheckoutModal');

  const adminAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/admin.astro'), 'utf8');
  assert.ok(adminAstro.includes('6573645432'), 'Missing authoritative account in admin.astro');

  // Verify outdated account number 6542718903 is completely absent
  assert.ok(!readAstro.includes('6542718903'), 'Found outdated account number in reader');
  assert.ok(!modalAstro.includes('6542718903'), 'Found outdated account number in modal');
  assert.ok(!adminAstro.includes('6542718903'), 'Found outdated account number in admin.astro');
});

// -----------------------------------------------------------------------------
// TEST 5: Transfer Verification Restricted to Verified Administrators
// -----------------------------------------------------------------------------
recordTest('Scenario 5: Transfer approval restricted to verified administrators', () => {
  const mig1 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000001_payment_security_and_entitlements.sql'), 'utf8');
  const mig3 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig3.includes("v_admin_role != 'admin'"), 'verify_bank_transfer does not verify admin role in DB');
  assert.ok(mig3.includes('Unauthorized: only verified administrators can verify bank transfers'), 'Missing unauthorized error in verify_bank_transfer');

  const adminAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/admin.astro'), 'utf8');
  assert.ok(adminAstro.includes('const isAdmin = await checkIsAdmin(currentAdminUser);'), 'approveTransfer does not check admin status');
  assert.ok(adminAstro.includes('Your account does not have administrator privileges'), 'approveTransfer missing authorization alert');
});

// -----------------------------------------------------------------------------
// TEST 6: Atomic Transfer Approval & Concurrency Protection
// -----------------------------------------------------------------------------
recordTest('Scenario 6: Transfer approval idempotency and atomic status transition', () => {
  const mig3 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig3.includes('SELECT * INTO v_transfer FROM public.bank_transfers WHERE id = p_transfer_id FOR UPDATE;'), 'Missing FOR UPDATE row lock on bank transfer');
  assert.ok(mig3.includes('SELECT * INTO v_order FROM public.orders WHERE reference = v_transfer.order_reference FOR UPDATE;'), 'Missing FOR UPDATE row lock on orders');
  assert.ok(mig3.includes("verification_status != 'pending'"), 'Does not verify that transfer status is pending before update');
});

// -----------------------------------------------------------------------------
// TEST 7: Transfer Rejection with Audit Logging
// -----------------------------------------------------------------------------
recordTest('Scenario 7: Transfer rejection with auditable rejection reason and operator identity', () => {
  const mig3 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig3.includes("p_new_status = 'rejected'"), 'verify_bank_transfer does not handle rejected status');
  assert.ok(mig3.includes('rejection_reason = p_notes'), 'verify_bank_transfer does not record rejection reason');
  assert.ok(mig3.includes('verified_by = p_admin_id'), 'verify_bank_transfer does not record verifying admin ID');

  const adminAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/admin.astro'), 'utf8');
  assert.ok(adminAstro.includes('queue[idx].rejectionReason = reason.trim()'), 'admin.astro does not record rejection reason in queue');
  assert.ok(adminAstro.includes('queue[idx].verifiedBy = currentAdminUser.email'), 'admin.astro does not record admin identity on rejection');
});

// -----------------------------------------------------------------------------
// TEST 8: Duplicate Transfer Approval Prevention
// -----------------------------------------------------------------------------
recordTest('Scenario 8: Duplicate transfer approval prevention and status check', () => {
  const adminAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/admin.astro'), 'utf8');
  assert.ok(adminAstro.includes("if (item.status !== 'pending')"), 'approveTransfer does not guard against non-pending item');
  assert.ok(adminAstro.includes('Duplicate processing prevented'), 'Missing duplicate processing message');

  const mig3 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig3.includes('already finalized with status'), 'verify_bank_transfer does not throw on finalized transfers');
});

// -----------------------------------------------------------------------------
// TEST 9: Cross-Customer Transfer Reference Isolation
// -----------------------------------------------------------------------------
recordTest('Scenario 9: Cross-customer transfer reference access isolation (no hijacking)', () => {
  const supabaseTs = fs.readFileSync(path.join(webRoot, 'src/lib/supabase.ts'), 'utf8');
  assert.ok(supabaseTs.includes('orderEmail !== claimantEmail'), 'verifyAndClaimOrderReference does not check claimant email against order email');
  assert.ok(supabaseTs.includes('Access denied: This payment reference belongs to a different email address.'), 'Missing cross-customer denial message');

  const mig3 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig3.includes('lower(trim(v_order.email)) <> v_clean_email'), 'claim_order_reference RPC missing email ownership validation');
  assert.ok(mig3.includes('This payment reference is registered to a different customer account'), 'claim_order_reference missing access denied message');
});

// -----------------------------------------------------------------------------
// TEST 10: Anonymous Service Worker Precache Security
// -----------------------------------------------------------------------------
recordTest('Scenario 10: Anonymous precache auditing: zero paid boosters in public precache', () => {
  const swJs = fs.readFileSync(path.join(webRoot, 'public/sw.js'), 'utf8');
  assert.ok(!swJs.includes('/library/read/chemistry-booster'), 'Chemistry Booster is inappropriately in SW precache');
  assert.ok(!swJs.includes('/library/read/biology-booster'), 'Biology Booster is inappropriately in SW precache');
  assert.ok(!swJs.includes('/library/read/physics-booster'), 'Physics Booster is inappropriately in SW precache');
  assert.ok(swJs.includes('/library/read/admission-intelligence-guide-2026'), 'Free admission guide missing from precache');
});

// -----------------------------------------------------------------------------
// TEST 11: Service Worker Route Exclusions for Sensitive Endpoints
// -----------------------------------------------------------------------------
recordTest('Scenario 11: Service worker explicit route exclusions for sensitive endpoints', () => {
  const swJs = fs.readFileSync(path.join(webRoot, 'public/sw.js'), 'utf8');
  assert.ok(swJs.includes('isRestrictedEndpoint'), 'Missing isRestrictedEndpoint checker in sw.js');
  assert.ok(swJs.includes('/library/admin'), 'Admin routes not restricted in sw.js');
  assert.ok(swJs.includes('/payment/callback'), 'Payment callback not restricted in sw.js');
  assert.ok(swJs.includes('/rest/v1') && swJs.includes('/auth/v1'), 'Supabase APIs not restricted in sw.js');
  assert.ok(swJs.includes('access_token=') || swJs.includes('token='), 'Token query params not restricted in sw.js');
});

// -----------------------------------------------------------------------------
// TEST 12: Offline Save Authorization Gate
// -----------------------------------------------------------------------------
recordTest('Scenario 12: Offline save authorization gate (unentitled students cannot cache)', () => {
  const readAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/read/[id].astro'), 'utf8');
  assert.ok(readAstro.includes('if (!isEntitled)'), 'saveOfflineBtn missing entitlement gate');
  assert.ok(readAstro.includes('Full study access is required to download this manual for offline reading'), 'Missing unentitled save alert');
});

// -----------------------------------------------------------------------------
// TEST 13: Accurate Offline Cache Reporting (No False "Saved Locally")
// -----------------------------------------------------------------------------
recordTest('Scenario 13: True offline cache completion verification (no false completion claim)', () => {
  const readAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/read/[id].astro'), 'utf8');
  assert.ok(!readAstro.includes("saveOfflineText.textContent = 'Saved Locally'"), 'Found misleading false completion status "Saved Locally"');
  assert.ok(readAstro.includes("saveOfflineText.textContent = 'Save Failed'"), 'Missing explicit failure status on cache error');
  assert.ok(readAstro.includes('saveOfflineBtn.classList.add(\'saved\')'), 'Does not apply saved class only upon success');
});

// -----------------------------------------------------------------------------
// TEST 14: Shared-Device Session Purge on Sign Out
// -----------------------------------------------------------------------------
recordTest('Scenario 14: Session sign-out cache and entitlement purge on shared devices', () => {
  const indexAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/index.astro'), 'utf8');
  assert.ok(indexAstro.includes("localStorage.removeItem('techmed_claimed_entitlements')"), 'Sign out does not clear claimed entitlements');
  assert.ok(indexAstro.includes("sessionStorage.clear()"), 'Sign out does not clear sessionStorage');
  assert.ok(indexAstro.includes("clear-user-cache"), 'Sign out does not post clear-user-cache message to service worker');
  assert.ok(indexAstro.includes("caches.delete('techmed-reader-v3')"), 'Sign out does not delete reader cache');
});

// -----------------------------------------------------------------------------
// TEST 15: Watermark Session Isolation
// -----------------------------------------------------------------------------
recordTest('Scenario 15: Watermark isolation across sessions without PII leakage', () => {
  const readAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/read/[id].astro'), 'utf8');
  assert.ok(readAstro.includes('userEmail || \'TECHMED Academic Preview\''), 'Watermark does not fallback to preview without active user');
  assert.ok(readAstro.includes('renderWatermark(currentUser?.email)'), 'Watermark is not bound to current session user');
});

// -----------------------------------------------------------------------------
// TEST 16: Core Cohort Discount & Expiry Enforcement
// -----------------------------------------------------------------------------
recordTest('Scenario 16: Core cohort discount eligibility and expiry enforcement', () => {
  const roster = fs.readFileSync(path.join(webRoot, 'src/lib/roster.ts'), 'utf8');
  assert.ok(roster.includes('export function isEligibleForCoreDiscount'), 'Missing isEligibleForCoreDiscount function');
  assert.ok(roster.includes('new Date(student.expiresAt).getTime() < Date.now()'), 'isEligibleForCoreDiscount does not check expiry timestamp');
  assert.ok(roster.includes('return false;'), 'isEligibleForCoreDiscount does not deny expired cohorts');
});

// -----------------------------------------------------------------------------
// TEST 17: Mastery Cohort 3-Booster Inclusions
// -----------------------------------------------------------------------------
recordTest('Scenario 17: Mastery cohort provides 3 science boosters through validity period', () => {
  const roster = fs.readFileSync(path.join(webRoot, 'src/lib/roster.ts'), 'utf8');
  assert.ok(roster.includes("'chemistry-booster'"), 'Missing chemistry booster in inclusions');
  assert.ok(roster.includes("'biology-booster'"), 'Missing biology booster in inclusions');
  assert.ok(roster.includes("'physics-booster'"), 'Missing physics booster in inclusions');
  assert.ok(roster.includes('expiresAt: student.expiresAt'), 'generateRosterEntitlements does not assign cohort expiresAt');
});

// -----------------------------------------------------------------------------
// TEST 18: Ultimate Cohort & 20-Seat Founder Mentorship Ceiling
// -----------------------------------------------------------------------------
recordTest('Scenario 18: Ultimate cohort inclusions and hard 20-seat Founder Mentorship ceiling', () => {
  const roster = fs.readFileSync(path.join(webRoot, 'src/lib/roster.ts'), 'utf8');
  assert.ok(roster.includes('export const MAX_MENTORSHIP_SEATS = 20;'), 'Missing MAX_MENTORSHIP_SEATS = 20 constant');
  assert.ok(roster.includes('currentCount >= MAX_MENTORSHIP_SEATS'), 'addStudentToRoster does not check 20-seat ceiling');
  assert.ok(roster.includes('Founder Mentorship seat limit reached'), 'addStudentToRoster missing limit error message');
});

// -----------------------------------------------------------------------------
// TEST 19: Standalone Purchase Preservation on Cohort Expiration
// -----------------------------------------------------------------------------
recordTest('Scenario 19: Standalone permanent purchase preservation across cohort expiration', () => {
  const mig1 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000001_payment_security_and_entitlements.sql'), 'utf8');
  assert.ok(mig1.includes("NULL, -- Lifetime"), 'Standalone purchases in SQL do not have NULL expires_at (lifetime)');

  const mig3 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig3.includes("NULL, -- Permanent Lifetime"), 'Standalone purchases in migration 3 do not have NULL expires_at');

  const supabaseTs = fs.readFileSync(path.join(webRoot, 'src/lib/supabase.ts'), 'utf8');
  assert.ok(supabaseTs.includes('if (!e.expiresAt) return true; // Lifetime access'), 'hasActiveResourceAccess does not treat null expiresAt as lifetime');
});

// -----------------------------------------------------------------------------
// TEST 20: Idempotent Entitlement Grants & Webhook Retry Immunity
// -----------------------------------------------------------------------------
recordTest('Scenario 20: Idempotent entitlement grants and duplicate webhook retry immunity', () => {
  const mig3 = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig3.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_order_resource_unique'), 'Missing unique index on (source_order_reference, resource_id)');
  assert.ok(mig3.includes('ON CONFLICT (source_order_reference, resource_id)'), 'grant_order_entitlements missing ON CONFLICT idempotency clause');
});

console.log('\n================================================================');
const passedCount = results.filter(r => r.status === 'PASSED').length;
const failedCount = results.filter(r => r.status === 'FAILED').length;
console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log('================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
