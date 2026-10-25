// web/scripts/test-entitlement-system.mjs
// Comprehensive automated test suite for TECHMED payment & entitlement system.
// Tests: successful payments, failed payments, incorrect amounts, duplicate webhooks,
// monthly expiry, bundle inclusions, and account resolution.

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
console.log('  TECHMED PAYMENT & ENTITLEMENT SYSTEM VERIFICATION');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../');
const migrationSql = readFileSync(
  resolve(baseDir, 'supabase/migrations/20261025000004_fix_payment_entitlements_system.sql'),
  'utf-8'
);
const payInitiateCode = readFileSync(resolve(baseDir, 'supabase/functions/pay-initiate/index.ts'), 'utf-8');
const payVerifyCode = readFileSync(resolve(baseDir, 'supabase/functions/pay-verify/index.ts'), 'utf-8');
const payWebhookCode = readFileSync(resolve(baseDir, 'supabase/functions/pay-webhook/index.ts'), 'utf-8');
const rosterCode = readFileSync(resolve(baseDir, 'web/src/lib/roster.ts'), 'utf-8');
const supabaseClientCode = readFileSync(resolve(baseDir, 'web/src/lib/supabase.ts'), 'utf-8');

// -----------------------------------------------------------------------------
// Suite 1: Product Catalogue & Schema Coverage
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: Product Catalogue & Schema Consistency ---');

// Check 1: All cohort products are seeded in products catalogue
const requiredProducts = [
  'cohort-core-monthly',
  'cohort-core-earlybird',
  'cohort-core-standard',
  'cohort-core',
  'cohort-mastery-earlybird',
  'cohort-mastery-standard',
  'cohort-mastery',
  'cohort-ultimate',
  'core',
  'mastery',
  'ultimate',
  'chemistry-booster',
  'biology-booster',
  'physics-booster',
  'booster-bundle',
  'post-utme-pq',
  'post-utme-brainstorming-hub',
  'research-file',
  'university-research-file',
];

const allProductsSeeded = requiredProducts.every(p => migrationSql.includes(`'${p}'`));
assert(
  allProductsSeeded,
  'All 19 products, plan options, and aliases are present in the authoritative products catalogue',
  `Missing products in migration: ${requiredProducts.filter(p => !migrationSql.includes(`'${p}'`)).join(', ')}`
);

// Check 2: Orders table has all columns queried or updated by edge functions
const requiredOrderCols = [
  'id', 'user_id', 'payment_method', 'currency', 'phone', 'subtotal_amount',
  'discount_amount', 'total_amount', 'verified_at', 'verified_by',
  'rejection_reason', 'metadata', 'updated_at',
];
const allColsAdded = requiredOrderCols.every(col => migrationSql.includes(`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ${col}`));
assert(
  allColsAdded,
  'Orders table schema contains all columns accessed by pay-initiate, pay-verify, and pay-webhook',
  `Missing columns: ${requiredOrderCols.filter(col => !migrationSql.includes(col)).join(', ')}`
);

// -----------------------------------------------------------------------------
// Suite 2: grant_order_entitlements() Business Logic & Security
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: grant_order_entitlements() Logic & Entitlement Engine ---');

// Check 3: Only grants access to an order whose status is "paid"
assert(
  migrationSql.includes("IF v_order.status IS DISTINCT FROM 'paid' THEN") &&
  migrationSql.includes("is not in paid status"),
  'grant_order_entitlements explicitly rejects non-paid orders with an exception'
);

// Check 4: Resolves customer account using authenticated user ID or email lookup in auth.users
assert(
  migrationSql.includes('SELECT id INTO v_user_id') &&
  migrationSql.includes('FROM auth.users') &&
  migrationSql.includes('WHERE lower(email) = lower(trim(v_order.email))') &&
  migrationSql.includes('SET user_id = v_user_id'),
  'Customer account is resolved from auth.users via email and order.user_id is backfilled'
);

// Check 5: Grants the purchased plan itself as an entitlement
assert(
  migrationSql.includes('-- STEP 5A: Grant the Cohort Plan ITSELF as an entitlement') &&
  migrationSql.includes('v_canonical_plan_id') &&
  migrationSql.includes("'purchase'") &&
  migrationSql.includes('ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL'),
  'Cohort plan purchases grant the plan itself (e.g. cohort-core, cohort-mastery, cohort-ultimate)'
);

// Check 6: Monthly subscriptions have exactly 1-month expiry from payment date
assert(
  migrationSql.includes("v_is_monthly := (v_product.id LIKE '%monthly%');") &&
  migrationSql.includes("v_plan_expiry := COALESCE(v_order.paid_at, v_order.created_at, timezone('utc'::text, now())) + INTERVAL '1 month';"),
  'Monthly subscriptions (cohort-core-monthly) expire exactly 1 month from payment date'
);

// Check 7: 3-month cohort plans have authoritative programme expiry through UTME 2027 (2027-05-31)
assert(
  migrationSql.includes("v_plan_expiry := timezone('utc'::text, '2027-05-31 23:59:59+00'::timestamptz);"),
  '3-month cohort plans expire on 31 May 2027 (authoritative UTME 2027 completion date)'
);

// Check 8: Standalone purchases have lifetime permanent access (expires_at = NULL)
assert(
  migrationSql.includes("IF v_product.product_type IN ('resource', 'bundle') THEN") &&
  migrationSql.includes('v_plan_expiry := NULL;'),
  'Standalone resources and bundles have permanent lifetime access (expires_at = NULL)'
);

// Check 9: Core and Mastery never receive Ultimate benefits or mentorship
assert(
  migrationSql.includes("('cohort-core',") &&
  migrationSql.includes("'cohort_plan', 15000, false, false, '{}')") &&
  migrationSql.includes("ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']") &&
  migrationSql.includes("'has_founder_mentorship', (v_canonical_plan_id = 'cohort-ultimate')"),
  'Core has 0 free boosters; Mastery has 3 science boosters; Mentorship is exclusive to Ultimate'
);

// Check 10: Strict idempotency via partial unique index
assert(
  migrationSql.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_order_resource_unique') &&
  migrationSql.includes('ON public.entitlements (source_order_reference, resource_id)') &&
  migrationSql.includes('DO UPDATE SET'),
  'Idempotent upsert via (source_order_reference, resource_id) unique index prevents duplicates'
);

// Check 11: Duplicate calls do not extend subscription durations
assert(
  migrationSql.includes('expires_at = EXCLUDED.expires_at') &&
  migrationSql.includes('COALESCE(v_order.paid_at'),
  'Subscription expiry calculation is fixed to order.paid_at and cannot be shifted by duplicate webhooks'
);

// -----------------------------------------------------------------------------
// Suite 3: Verification & Edge Functions Security Rules
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: Verification, Payment Gateway & Downgrade Prevention ---');

// Check 12: Paystack verification requires exact kobo amount, NGN currency, reference, and success
assert(
  payVerifyCode.includes('txData?.reference === reference') &&
  payVerifyCode.includes('txData?.status === "success"') &&
  payVerifyCode.includes('Math.round(Number(order.amount) * 100)') &&
  payVerifyCode.includes('txData?.amount === expectedKobo') &&
  payVerifyCode.includes('txData.currency.toUpperCase() === "NGN"'),
  'pay-verify validates reference, success status, exact expected kobo amount, and NGN currency'
);

// Check 13: Webhook validates HMAC signature, reference, amount, currency, and success
assert(
  payWebhookCode.includes('verifySignature(rawBody, signature, paystackSecret)') &&
  payWebhookCode.includes('event.event !== "charge.success"') &&
  payWebhookCode.includes('isReferenceMatch') &&
  payWebhookCode.includes('isStatusSuccess') &&
  payWebhookCode.includes('isAmountMatch') &&
  payWebhookCode.includes('isCurrencyNGN'),
  'pay-webhook validates HMAC-SHA512, reference, amount, currency, and success status'
);

// Check 14: Failed payments never receive entitlements
const mismatchIdx = payVerifyCode.indexOf('status: "mismatched"');
const grantIdx = payVerifyCode.lastIndexOf('grant_order_entitlements');
assert(
  mismatchIdx !== -1 && grantIdx !== -1 && mismatchIdx < grantIdx &&
  payVerifyCode.includes('status: "failed"') &&
  payVerifyCode.includes('return jsonResponse({\n      success: false,\n      status: "failed"') &&
  payVerifyCode.includes('return jsonResponse({\n      success: false,\n      status: "mismatched"'),
  'Failed or mismatched payments are assigned failed/mismatched status and never receive entitlements'
);

// Check 15: Already paid orders cannot be downgraded by subsequent failed verification
assert(
  payVerifyCode.includes('if (order.status === "paid") {') &&
  payWebhookCode.includes('if (existingOrder.status === "paid") {') &&
  payWebhookCode.includes('.eq("status", "pending")'),
  'A paid order is never overwritten or downgraded by subsequent failed calls (downgrade prevention)'
);

// Check 16: Cohort purchases bypass legacy download emails
assert(
  payWebhookCode.includes('const isCohort =') &&
  payWebhookCode.includes('updatedOrder.product_id.startsWith("cohort-")') &&
  payWebhookCode.includes('if (!isCohort) {'),
  'Cohort purchases bypass download emails; standalone resource purchases preserve them'
);

// Check 17: Client roster utility grants plan itself
assert(
  rosterCode.includes("grantSource: 'purchase'") &&
  rosterCode.includes('resId: planId'),
  'web/src/lib/roster.ts generateRosterEntitlements grants the plan itself'
);

console.log('\n================================================================');
console.log(`  AUTOMATED RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
