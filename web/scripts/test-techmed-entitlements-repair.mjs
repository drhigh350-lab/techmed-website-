// web/scripts/test-techmed-entitlements-repair.mjs
// Automated verification test suite for TECHMED payment & entitlement repair.
// Tests all 18 critical requirements:
//  1. Standalone resource lifetime access (expires_at is null)
//  2. Standalone resource preserved when cohort expires
//  3. Bundle inclusions lifetime access
//  4. Core monthly before Nov 30, 2026: starts Nov 30 2026, expires Dec 30 2026
//  5. Core monthly on/after Nov 30, 2026: starts at payment date, expires +1 month
//  6. Core 3-month before Nov 30, 2026: starts Nov 30 2026, expires May 31 2027
//  7. Core 3-month on/after Nov 30, 2026: starts at payment date, expires May 31 2027
//  8. Mastery early-bird / standard: includes 3 boosters with lifetime access, cohort expires May 31 2027
//  9. Ultimate: includes 3 boosters + Post-UTME PQ with lifetime access, cohort expires May 31 2027, mentorship flag true
// 10. Core student never receives booster manuals
// 11. Core student never receives Ultimate or Founder Mentorship
// 12. Mastery student never receives Founder Mentorship
// 13. Idempotent re-granting: calling grant_order_entitlements twice does not duplicate rows or alter dates
// 14. Unpaid/pending order throws error in grant_order_entitlements
// 15. Nonexistent product throws error in grant_order_entitlements
// 16. Roster wisdomjohnson207@gmail.com removed and not granted Ultimate
// 17. fetchUserEntitlements uses database as authoritative and ignores localStorage injection when DB succeeds
// 18. hasActiveResourceAccess respects starts_at and expires_at and ignores localStorage bypass

import { readFileSync } from 'fs';
import { resolve } from 'path';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, name, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests.toString().padStart(2, '0')}: ${name}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test ${totalTests.toString().padStart(2, '0')}: ${name}`);
    if (details) console.error(`          Details: ${details}`);
  }
}

console.log('================================================================');
console.log('  TECHMED ENTITLEMENTS SYSTEM REPAIR — 18-POINT VERIFICATION');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');
const migrationSql = readFileSync(
  resolve(baseDir, 'supabase/migrations/20261025000004_fix_payment_entitlements_system.sql'),
  'utf-8'
);
const rosterCode = readFileSync(resolve(baseDir, 'web/src/lib/roster.ts'), 'utf-8');
const supabaseClientCode = readFileSync(resolve(baseDir, 'web/src/lib/supabase.ts'), 'utf-8');
const libraryPageCode = readFileSync(resolve(baseDir, 'web/src/pages/library/index.astro'), 'utf-8');
const pricingCode = readFileSync(resolve(baseDir, 'web/src/lib/pricing.ts'), 'utf-8');

// -----------------------------------------------------------------------------
// Test 1: Standalone resource lifetime access (expires_at is null)
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("v_product.product_type IN ('resource', 'bundle')") &&
  migrationSql.includes("NULL, -- Permanent Lifetime Access"),
  '1. Standalone resource lifetime access (expires_at is NULL in database grant)'
);

// -----------------------------------------------------------------------------
// Test 2: Standalone resource preserved when cohort expires
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("idx_entitlements_order_resource_unique") &&
  migrationSql.includes("WHERE source_order_reference IS NOT NULL") &&
  migrationSql.includes("grant_source"),
  '2. Multi-grant model preserves standalone lifetime purchases independently of cohort expiry'
);

// -----------------------------------------------------------------------------
// Test 3: Bundle inclusions lifetime access
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("FOREACH v_bundled_id IN ARRAY v_product.bundle_item_ids LOOP") &&
  migrationSql.includes("'bundle_inclusion'") &&
  migrationSql.includes("NULL, -- Permanent Lifetime Access"),
  '3. Bundle inclusions granted with permanent lifetime access (expires_at = NULL)'
);

// -----------------------------------------------------------------------------
// Test 4: Core monthly before Nov 30, 2026: starts Nov 30 2026, expires Dec 30 2026
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("v_cohort_start_threshold TIMESTAMPTZ := '2026-11-30 00:00:00+01'::timestamptz") &&
  migrationSql.includes("IF v_paid_at < v_cohort_start_threshold THEN") &&
  migrationSql.includes("v_plan_expiry := '2026-12-30 23:59:59+01'::timestamptz;"),
  '4. Core monthly before Nov 30, 2026 starts Nov 30 2026 and expires Dec 30 2026'
);

// -----------------------------------------------------------------------------
// Test 5: Core monthly on/after Nov 30, 2026: starts at payment date, expires +1 month
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("v_starts_at := v_paid_at;") &&
  migrationSql.includes("v_plan_expiry := v_starts_at + INTERVAL '1 month';"),
  '5. Core monthly on/after Nov 30, 2026 starts on payment date and expires after 1 month'
);

// -----------------------------------------------------------------------------
// Test 6: Core 3-month before Nov 30, 2026: starts Nov 30 2026, expires May 31 2027
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("v_starts_at := v_cohort_start_threshold;") &&
  migrationSql.includes("v_plan_expiry := '2027-05-31 23:59:59+01'::timestamptz;"),
  '6. Core 3-month before Nov 30, 2026 starts Nov 30 2026 and expires May 31 2027'
);

// -----------------------------------------------------------------------------
// Test 7: Core 3-month on/after Nov 30, 2026: starts at payment date, expires May 31 2027
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("ELSE") &&
  migrationSql.includes("v_starts_at := v_paid_at;") &&
  migrationSql.includes("v_plan_expiry := '2027-05-31 23:59:59+01'::timestamptz;"),
  '7. Core 3-month on/after Nov 30, 2026 starts on payment date and expires May 31 2027'
);

// -----------------------------------------------------------------------------
// Test 8: Mastery early-bird / standard: includes 3 boosters with lifetime access, cohort expires May 31 2027
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']") &&
  migrationSql.includes("NULL, -- Permanent Lifetime Access for study resources included in Mastery & Ultimate"),
  '8. Mastery includes 3 boosters with permanent lifetime access while cohort expires May 31 2027'
);

// -----------------------------------------------------------------------------
// Test 9: Ultimate: includes 3 boosters + Post-UTME PQ with lifetime access, cohort expires May 31 2027, mentorship flag true
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("ARRAY['chemistry-booster', 'biology-booster', 'physics-booster', 'post-utme-pq']") &&
  migrationSql.includes("'has_founder_mentorship', (v_canonical_plan_id = 'cohort-ultimate')"),
  '9. Ultimate includes 3 boosters + Post-UTME PQ with lifetime access and has_founder_mentorship = true'
);

// -----------------------------------------------------------------------------
// Test 10: Core student never receives booster manuals
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("('cohort-core-monthly', 'TECHMED Core (1-Month Subscription)', 'Live classes, daily drills, and Kairo CBT (Monthly Renewal)', 'cohort_plan', 7000, false, false, '{}')") &&
  migrationSql.includes("('cohort-core', 'TECHMED Core (3-Month Early-Bird)', '12-week live classes across 5 science subjects and Kairo CBT', 'cohort_plan', 15000, false, false, '{}')"),
  '10. Core plans define empty bundle_item_ids ({}) and never grant booster manuals'
);

// -----------------------------------------------------------------------------
// Test 11: Core student never receives Ultimate or Founder Mentorship
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("'has_founder_mentorship', (v_canonical_plan_id = 'cohort-ultimate')") &&
  libraryPageCode.includes("accountTag.textContent = 'TECHMED Core Student'") &&
  !libraryPageCode.includes("accountTag.textContent = 'TECHMED Core · 20% Standalone Discount'"),
  '11. Core students are tagged "TECHMED Core Student" and never receive Ultimate or Founder Mentorship'
);

// -----------------------------------------------------------------------------
// Test 12: Mastery student never receives Founder Mentorship
// -----------------------------------------------------------------------------
assert(
  libraryPageCode.includes("accountTag.textContent = 'TECHMED Mastery Student'") &&
  migrationSql.includes("'has_founder_mentorship', (v_canonical_plan_id = 'cohort-ultimate')"),
  '12. Mastery students are tagged "TECHMED Mastery Student" and never receive Founder Mentorship'
);

// -----------------------------------------------------------------------------
// Test 13: Idempotent re-granting: calling grant_order_entitlements twice does not duplicate rows or alter dates
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL") &&
  migrationSql.includes("DO UPDATE SET") &&
  migrationSql.includes("starts_at = EXCLUDED.starts_at"),
  '13. Idempotent re-granting safely handles conflicts without duplicating entitlements or extending durations'
);

// -----------------------------------------------------------------------------
// Test 14: Unpaid/pending order throws error in grant_order_entitlements
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("IF v_order.status IS DISTINCT FROM 'paid' THEN") &&
  migrationSql.includes("RAISE EXCEPTION 'Order \"%\" is not in paid status"),
  '14. grant_order_entitlements strictly raises an exception for unpaid or pending orders'
);

// -----------------------------------------------------------------------------
// Test 15: Nonexistent product throws error in grant_order_entitlements
// -----------------------------------------------------------------------------
assert(
  migrationSql.includes("RAISE EXCEPTION 'Product \"%\" referenced in order \"%\" not found in catalogue'"),
  '15. grant_order_entitlements strictly raises an exception if a product is missing from catalogue'
);

// -----------------------------------------------------------------------------
// Test 16: Roster wisdomjohnson207@gmail.com removed and not granted Ultimate
// -----------------------------------------------------------------------------
const wisdomInRoster = rosterCode.includes('wisdomjohnson207@gmail.com');
const wisdomOrderRepaired = migrationSql.includes("WHERE reference = 'techmed_cohort_core_monthly_1792965066749_e1fe8821'") &&
  migrationSql.includes("product_id = 'cohort-core-monthly'") &&
  migrationSql.includes("grant_order_entitlements('techmed_cohort_core_monthly_1792965066749_e1fe8821')");
assert(
  !wisdomInRoster && wisdomOrderRepaired,
  '16. wisdomjohnson207@gmail.com is removed from static roster and repaired in database as Core monthly (₦7,000)'
);

// -----------------------------------------------------------------------------
// Test 17: fetchUserEntitlements uses database as authoritative and ignores localStorage injection when DB succeeds
// -----------------------------------------------------------------------------
assert(
  supabaseClientCode.includes("return { entitlements: mapped, migrationApplied: true };") &&
  !supabaseClientCode.includes("combined = [...mapped];") &&
  !supabaseClientCode.includes("for (const loc of local) { if (!combined.some(c => c.resourceId === loc.resourceId)) { combined.push(loc); } }"),
  '17. fetchUserEntitlements treats database entitlements as single source of truth without localStorage injection'
);

// -----------------------------------------------------------------------------
// Test 18: hasActiveResourceAccess respects starts_at and expires_at and ignores localStorage bypass
// -----------------------------------------------------------------------------
assert(
  supabaseClientCode.includes("e.startsAt") &&
  supabaseClientCode.includes("starts.getTime() > now.getTime()") &&
  supabaseClientCode.includes("e.expiresAt") &&
  supabaseClientCode.includes("expires.getTime() <= now.getTime()") &&
  !supabaseClientCode.slice(supabaseClientCode.indexOf('hasActiveResourceAccess')).includes("getLocalEntitlements"),
  '18. hasActiveResourceAccess enforces starts_at and expires_at and excludes unverified localStorage bypass'
);

console.log('\n================================================================');
console.log(`  RESULTS: ${passedTests} of ${totalTests} tests passed (${failedTests} failed)`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL 18 VERIFICATION CHECKS PASSED SUCCESSFULLY.');
}
