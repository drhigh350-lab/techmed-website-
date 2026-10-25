// TECHMED Critical Checkout Fix: Unknown Product & Paystack-Only Verification
// File: web/scripts/test-paystack-checkout-fix.mjs
// Run: node web/scripts/test-paystack-checkout-fix.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..');

let passed = 0;
let failed = 0;

function runTest(id, name, fn) {
  try {
    fn();
    console.log(`[PASS] Test ${id}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${id}: ${name} -> ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(id, name, fn) {
  try {
    await fn();
    console.log(`[PASS] Test ${id}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${id}: ${name} -> ${err.message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('TECHMED — PAYSTACK-ONLY & PRODUCT MAPPING TARGETED TEST SUITE');
console.log('================================================================\n');

const payInitiateSrc = fs.readFileSync(path.join(repoRoot, 'supabase/functions/pay-initiate/index.ts'), 'utf8');
const payVerifySrc = fs.readFileSync(path.join(repoRoot, 'supabase/functions/pay-verify/index.ts'), 'utf8');
const checkoutModalSrc = fs.readFileSync(path.join(webRoot, 'src/components/CheckoutModal.astro'), 'utf8');
const pricingAstroSrc = fs.readFileSync(path.join(webRoot, 'src/pages/pricing.astro'), 'utf8');

// 1. Each of the four billing options maps to the correct product
runTest(1, 'Each of the four billing options maps to the correct product in pay-initiate catalog', () => {
  // Option A: Core monthly -> ₦7,000
  assert.ok(payInitiateSrc.includes('"cohort-core-monthly": { name: "TECHMED Core (1-Month Subscription)", amount: 7000'), 'Missing cohort-core-monthly mapping');
  // Option B: Core 3 months upfront -> ₦15,000 (early-bird) / ₦18,000 (standard)
  assert.ok(payInitiateSrc.includes('"cohort-core-earlybird": { name: "TECHMED Core (3-Month Early-Bird)", amount: 15000'), 'Missing cohort-core-earlybird mapping');
  assert.ok(payInitiateSrc.includes('"cohort-core-standard": { name: "TECHMED Core (3-Month Standard)", amount: 18000'), 'Missing cohort-core-standard mapping');
  // Option C: Mastery 3 months upfront -> ₦20,000 (early-bird) / ₦25,000 (standard)
  assert.ok(payInitiateSrc.includes('"cohort-mastery-earlybird": { name: "TECHMED Mastery (3-Month Early-Bird)", amount: 20000'), 'Missing cohort-mastery-earlybird mapping');
  assert.ok(payInitiateSrc.includes('"cohort-mastery-standard": { name: "TECHMED Mastery (3-Month Standard)", amount: 25000'), 'Missing cohort-mastery-standard mapping');
  // Option D: Ultimate -> ₦40,000
  assert.ok(payInitiateSrc.includes('"cohort-ultimate": { name: "TECHMED Ultimate (Full UTME 2027 Access)", amount: 40000'), 'Missing cohort-ultimate mapping');

  // Verify CheckoutModal maps selected billing options to these exact products
  assert.ok(checkoutModalSrc.includes("currentResource.id = 'cohort-core-monthly'"), 'CheckoutModal does not set cohort-core-monthly for monthly selection');
  assert.ok(checkoutModalSrc.includes("cohort-core-earlybird"), 'CheckoutModal does not set cohort-core-earlybird');
  assert.ok(checkoutModalSrc.includes("cohort-mastery-earlybird"), 'CheckoutModal does not set cohort-mastery-earlybird');
  assert.ok(checkoutModalSrc.includes("cohort-ultimate"), 'CheckoutModal does not set cohort-ultimate');
});

// 2. Server-side price validation rejects manipulated prices
runTest(2, 'Server-side price validation ignores client-submitted prices and enforces early-bird deadline', () => {
  assert.ok(payInitiateSrc.includes('const product = PRODUCTS[cleanProductId];'), 'pay-initiate must look up authoritative product definition');
  assert.ok(payInitiateSrc.includes('let validatedAmount = product.amount;'), 'pay-initiate must use server authoritative amount');
  assert.ok(payInitiateSrc.includes('EARLY_BIRD_DEADLINE'), 'pay-initiate must declare early-bird deadline');
  assert.ok(payInitiateSrc.includes('Date.now() > EARLY_BIRD_DEADLINE'), 'pay-initiate must validate early-bird expiry server-side');
  assert.ok(payInitiateSrc.includes('if (cleanProductId.includes("core")) validatedAmount = 18000;'), 'pay-initiate must raise Core to ₦18,000 after deadline');
  assert.ok(payInitiateSrc.includes('if (cleanProductId.includes("mastery")) validatedAmount = 25000;'), 'pay-initiate must raise Mastery to ₦25,000 after deadline');
});

// 3. Missing or invalid configuration produces a clear diagnostic
runTest(3, 'Missing Paystack credentials produces a clear diagnostic message without exposing secrets', () => {
  assert.ok(payInitiateSrc.includes('const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");'), 'pay-initiate must query PAYSTACK_SECRET_KEY');
  assert.ok(payInitiateSrc.includes('PAYSTACK_SECRET_KEY is not set in Edge Function secrets'), 'Missing server diagnostic log for missing PAYSTACK_SECRET_KEY');
  assert.ok(!payInitiateSrc.includes('console.log(paystackSecret)'), 'pay-initiate must never print or log secret keys');
  assert.ok(!checkoutModalSrc.includes('sk_live') && !checkoutModalSrc.includes('sk_test'), 'Frontend must never contain secret keys');
});

// 4. Valid Paystack initiation returns a usable authorisation URL
await runAsyncTest(4, 'Valid Paystack initiation returns a usable authorization URL against live gateway', async () => {
  const url = 'https://unbgborbhxzsotaieiun.supabase.co/functions/v1/pay-initiate';
  const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmdib3JiaHh6c290YWllaXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDMyNDcsImV4cCI6MjA5Nzk3OTI0N30.3uM4SaYII60V988NA5PvqphQs6HkTVTnGKpZFqzZY-c';
  
  // Test with active standalone booster to verify live Paystack gateway credentials
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anon,
      'Authorization': `Bearer ${anon}`,
    },
    body: JSON.stringify({
      product_id: 'chemistry-booster',
      email: 'verification.test@techmedng.com',
    }),
  });

  assert.equal(res.status, 200, `Expected 200 from live gateway, got ${res.status}`);
  const data = await res.json();
  assert.ok(data.success, 'Expected success: true');
  assert.ok(data.data?.authorization_url, 'Expected authorization_url');
  assert.ok(data.data.authorization_url.startsWith('https://checkout.paystack.com/'), `Expected hosted Paystack checkout URL, got: ${data.data.authorization_url}`);
  assert.ok(data.data.reference.startsWith('techmed_'), 'Expected valid techmed transaction reference');
});

// 5. Failed initiation does not mark an order as paid
runTest(5, 'Failed initiation creates orders only as pending and never grants paid access', () => {
  assert.ok(payInitiateSrc.includes('status: "pending"'), 'pay-initiate must insert initial order with status: "pending"');
  assert.ok(!payInitiateSrc.includes('status: "paid"'), 'pay-initiate must never insert order as paid');
  assert.ok(payVerifySrc.includes('status === "success"') && payVerifySrc.includes('status: "paid"'), 'pay-verify only marks paid upon verified success');
});

// 6. Successful verified payment records the correct plan
runTest(6, 'Successful verified payment transitions status to paid and invokes grant_order_entitlements', () => {
  assert.ok(payVerifySrc.includes('status: "paid"'), 'pay-verify must transition order status to paid');
  assert.ok(payVerifySrc.includes('grant_order_entitlements'), 'pay-verify must invoke grant_order_entitlements RPC');
  assert.ok(payVerifySrc.includes('paidAmount'), 'pay-verify must capture verified paid amount');
});

// 7. Duplicate callbacks do not duplicate enrolments
runTest(7, 'Duplicate callbacks or retries are idempotent and do not duplicate entitlements', () => {
  assert.ok(payVerifySrc.includes('if (order.status === "paid")'), 'pay-verify must short-circuit if order is already paid');
  const mig = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig.includes('ON CONFLICT (source_order_reference, resource_id)'), 'Entitlements must have idempotent ON CONFLICT clause');
});

// 8. The checkout contains no Direct Bank Transfer tab or manual bank-payment instructions
runTest(8, 'The checkout modal contains no Direct Bank Transfer tab or manual payment instructions', () => {
  assert.ok(!checkoutModalSrc.includes('id="tabTransfer"'), 'Found tabTransfer in CheckoutModal.astro');
  assert.ok(!checkoutModalSrc.includes('Direct Bank Transfer'), 'Found "Direct Bank Transfer" text in CheckoutModal.astro');
  assert.ok(!checkoutModalSrc.includes('Moniepoint Microfinance Bank'), 'Found student-facing Moniepoint instructions in CheckoutModal.astro');
  assert.ok(!checkoutModalSrc.includes('id="modalAccNo"'), 'Found modalAccNo in CheckoutModal.astro');
  assert.ok(!checkoutModalSrc.includes('id="transferPane"'), 'Found transferPane in CheckoutModal.astro');
  assert.ok(!checkoutModalSrc.includes('transferWhatsAppBtn'), 'Found transferWhatsAppBtn in CheckoutModal.astro');
  assert.ok(!checkoutModalSrc.includes('mini-copy-btn'), 'Found mini-copy-btn in CheckoutModal.astro');
  assert.ok(!checkoutModalSrc.includes('channel-tabs'), 'Found channel-tabs in CheckoutModal.astro');
});

// 9. WhatsApp remains available for support without becoming the default payment route
runTest(9, 'WhatsApp remains available as secondary support without being the default route', () => {
  assert.ok(checkoutModalSrc.includes('https://wa.me/2347044255045'), 'WhatsApp support link missing in CheckoutModal.astro');
  assert.ok(!checkoutModalSrc.includes("window.location.href = waUrl") && !checkoutModalSrc.includes("window.open(waUrl"), 'CheckoutModal must never automatically navigate to WhatsApp');
  assert.ok(checkoutModalSrc.includes('window.location.href = data.data.authorization_url;'), 'Paystack hosted checkout must be the sole automatic navigation route');
  assert.ok(checkoutModalSrc.includes('Contact Admissions on WhatsApp'), 'WhatsApp available as assistance option on failure');
});

console.log('================================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================');

if (failed > 0) process.exit(1);
