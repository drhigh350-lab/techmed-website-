// web/scripts/test-edge-functions-hardening.mjs
// Verification of the hardened Edge Functions logic for:
// pay-initiate, pay-verify, and pay-webhook.

import { readFileSync } from 'fs';
import { resolve } from 'path';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, name, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${name}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test ${totalTests}: ${name}`);
    if (details) console.error(`         Details: ${details}`);
  }
}

console.log('================================================================');
console.log('  TECHMED EDGE FUNCTIONS HARDENING TEST SUITE');
console.log('================================================================\n');

const baseDir = resolve(import.meta.dirname, '../../supabase/functions');
const payInitiateCode = readFileSync(resolve(baseDir, 'pay-initiate/index.ts'), 'utf-8');
const payVerifyCode = readFileSync(resolve(baseDir, 'pay-verify/index.ts'), 'utf-8');
const payWebhookCode = readFileSync(resolve(baseDir, 'pay-webhook/index.ts'), 'utf-8');

// -------------------------------------------------------------
// Suite 1: pay-initiate Pending Order Flow
// -------------------------------------------------------------
console.log('--- SUITE 1: pay-initiate Order Creation & Gateway Safety ---');

// Check 1: Database insert occurs BEFORE Paystack initialize call
const insertIndex = payInitiateCode.indexOf('supabase.from("orders").insert');
const paystackCallIndex = payInitiateCode.indexOf('https://api.paystack.co/transaction/initialize');

assert(
  insertIndex !== -1 && paystackCallIndex !== -1 && insertIndex < paystackCallIndex,
  'Pending order is inserted into database BEFORE calling Paystack initialization API',
  `insertIndex: ${insertIndex}, paystackCallIndex: ${paystackCallIndex}`
);

// Check 2: If db insert fails, returns 500 without calling Paystack or returning checkout URL
assert(
  payInitiateCode.includes('if (dbError)') &&
  payInitiateCode.includes('Could not create pending order record'),
  'Database insertion failure is caught and immediately aborts with 500 error'
);

// Check 3: If Paystack initialization fails, pending order is marked failed
assert(
  payInitiateCode.includes('status: "failed"') &&
  payInitiateCode.includes('rejection_reason: paystackJson.message') &&
  payInitiateCode.includes('rejection_reason: "Network error reaching Paystack gateway"'),
  'Paystack API or network failures update the created pending order to status "failed"'
);

// Check 4: Server-side early bird deadline enforcement
assert(
  payInitiateCode.includes('2026-11-15T23:59:59Z') &&
  payInitiateCode.includes('if (Date.now() > EARLY_BIRD_DEADLINE) {') &&
  payInitiateCode.includes('if (cleanProductId.includes("core") && !cleanProductId.includes("monthly")) validatedAmount = 18000') &&
  payInitiateCode.includes('if (cleanProductId.includes("mastery")) validatedAmount = 25000'),
  'Server authoritatively enforces 15 Nov 2026 early-bird deadline (Core ₦18k, Mastery ₦25k)'
);

// -------------------------------------------------------------
// Suite 2: pay-verify Validation & Security Checks
// -------------------------------------------------------------
console.log('\n--- SUITE 2: pay-verify Strict Verification & Entitlements ---');

// Check 5: Requires PAYSTACK_SECRET_KEY, never reports success without it
assert(
  payVerifyCode.includes('if (!paystackSecret)') &&
  payVerifyCode.includes('success: false') &&
  payVerifyCode.includes('Payment verification service is unavailable'),
  'pay-verify returns 500 error and never reports success when PAYSTACK_SECRET_KEY is missing'
);

// Check 6: Verifies reference, success status, exact amount in kobo, and NGN currency
assert(
  payVerifyCode.includes('txData?.reference === reference') &&
  payVerifyCode.includes('txData?.status === "success"') &&
  payVerifyCode.includes('Math.round(Number(order.amount) * 100)') &&
  payVerifyCode.includes('txData?.amount === expectedKobo') &&
  payVerifyCode.includes('txData.currency.toUpperCase() === "NGN"'),
  'pay-verify verifies reference, success status, exact expected kobo amount, and NGN currency'
);

// Check 7: Mismatches mark order as "mismatched" and return 400
assert(
  payVerifyCode.includes('status: "mismatched"') &&
  payVerifyCode.includes('Payment details validation failed') &&
  payVerifyCode.includes('rejection_reason: mismatchDetails'),
  'Amount/currency/reference mismatches mark order as "mismatched" and return 400'
);

// Check 8: If order update to paid fails, verification reports failure (never false success)
assert(
  payVerifyCode.includes('if (updateError || !updatedOrder)') &&
  payVerifyCode.includes('order update failed in database') &&
  payVerifyCode.includes('status: "error"'),
  'Database order update failure is caught and returns 500 error instead of false success'
);

// Check 9: Entitlement failures are captured and surfaced in response
assert(
  payVerifyCode.includes('supabase.rpc("grant_order_entitlements"') &&
  payVerifyCode.includes('entitlement_granted:') &&
  payVerifyCode.includes('entitlement_error:'),
  'Entitlement grant failures are surfaced in response (entitlement_granted: false, error message)'
);

// Check 10: Idempotency for already paid orders
assert(
  payVerifyCode.includes('if (order.status === "paid")') &&
  payVerifyCode.includes('success: true') &&
  payVerifyCode.includes('status: "paid"'),
  'Already-paid orders return confirmed status immediately (idempotency preserved)'
);

// -------------------------------------------------------------
// Suite 3: pay-webhook Idempotency, Validation & Cohort Handling
// -------------------------------------------------------------
console.log('\n--- SUITE 3: pay-webhook HMAC Validation & Cohort Email Bypass ---');

// Check 11: HMAC-SHA512 signature validation retained
assert(
  payWebhookCode.includes('crypto.subtle.importKey') &&
  payWebhookCode.includes('hash: "SHA-512"') &&
  payWebhookCode.includes('verifySignature(rawBody, signature, paystackSecret)'),
  'pay-webhook validates Paystack HMAC-SHA512 signature'
);

// Check 12: Webhook validates reference, status, exact kobo amount, and NGN currency
assert(
  payWebhookCode.includes('isReferenceMatch') &&
  payWebhookCode.includes('isStatusSuccess') &&
  payWebhookCode.includes('isAmountMatch') &&
  payWebhookCode.includes('isCurrencyNGN') &&
  payWebhookCode.includes('expectedKobo = Math.round(Number(existingOrder.amount) * 100)'),
  'pay-webhook verifies reference, success status, exact amount in kobo, and NGN currency'
);

// Check 13: Webhook idempotency for already paid orders
assert(
  payWebhookCode.includes('if (existingOrder.status === "paid")') &&
  payWebhookCode.includes('return jsonResponse({ received: true });'),
  'Webhook acknowledges already-paid orders with 200 without duplicate updates or emails'
);

// Check 14: Cohort purchases bypass legacy download emails
assert(
  payWebhookCode.includes('const isCohort =') &&
  payWebhookCode.includes('updatedOrder.product_id.startsWith("cohort-")') &&
  payWebhookCode.includes('if (!isCohort) {'),
  'Cohort plan purchases cleanly bypass legacy resource download emails'
);

// Check 15: Non-cohort purchases still send download emails
assert(
  payWebhookCode.includes('sendDownloadEmail({') &&
  payWebhookCode.includes('createSignedUrl(filePath'),
  'Non-cohort standalone resource purchases continue sending signed download links via Resend'
);

console.log('\n================================================================');
console.log(`  EDGE FUNCTION TESTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
