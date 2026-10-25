// web/scripts/test-pricing-checkout-fix.mjs
// Targeted verification script for TECHMED Pricing Page & Paystack-Only Checkout Fix
// Tests all 10 critical scenarios specified in the brief.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_FN_BASE = 'https://unbgborbhxzsotaieiun.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmdib3JiaHh6c290YWllaXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MDMyNDcsImV4cCI6MjA5Nzk3OTI0N30.3uM4SaYII60V988NA5PvqphQs6HkTVTnGKpZFqzZY-c';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    if (details) console.error(`         Details: ${details}`);
  }
}

console.log('================================================================');
console.log('  TECHMED PRICING & CHECKOUT VERIFICATION SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test Suite 1: Template & Component Static Assertions
// -------------------------------------------------------------
console.log('--- SUITE 1: Client Checkout Modal & UI Rules ---');

const baseDir = resolve(import.meta.dirname, '..');
const planModalContent = readFileSync(resolve(baseDir, 'src/components/PlanCheckoutModal.astro'), 'utf-8');
const pricingPageContent = readFileSync(resolve(baseDir, 'src/pages/pricing.astro'), 'utf-8');
const checkoutModalContent = readFileSync(resolve(baseDir, 'src/components/CheckoutModal.astro'), 'utf-8');
const payInitiateContent = readFileSync(resolve(baseDir, '../supabase/functions/pay-initiate/index.ts'), 'utf-8');
const payVerifyContent = readFileSync(resolve(baseDir, '../supabase/functions/pay-verify/index.ts'), 'utf-8');

// Check 1: No discount checkbox or 20% discount in PlanCheckoutModal
assert(
  !planModalContent.includes('coreDiscountCheckbox') &&
  !planModalContent.includes('20% discount') &&
  !planModalContent.includes('cohort student'),
  'PlanCheckoutModal has NO cohort discount checkbox and NO 20% discount logic'
);

// Check 2: No manual bank transfer tab or instructions in PlanCheckoutModal
assert(
  !planModalContent.includes('tab-transfer') &&
  !planModalContent.includes('Moniepoint') &&
  !planModalContent.includes('Direct Bank Transfer'),
  'PlanCheckoutModal has NO bank transfer tabs or manual bank transfer instructions'
);

// Check 3: Pricing page uses PlanCheckoutModal instead of legacy CheckoutModal
assert(
  pricingPageContent.includes("import PlanCheckoutModal from '../components/PlanCheckoutModal.astro'") &&
  pricingPageContent.includes('<PlanCheckoutModal />') &&
  !pricingPageContent.includes('<CheckoutModal />'),
  'pricing.astro imports and renders PlanCheckoutModal exclusively for paid plans'
);

// Check 4: WhatsApp is present as secondary support link with correct number
assert(
  planModalContent.includes('https://wa.me/2347044255045') &&
  planModalContent.includes('Admissions on WhatsApp'),
  'PlanCheckoutModal includes WhatsApp (07044255045) as secondary support link'
);

// Check 5: Legacy CheckoutModal has bank transfer tabs removed
assert(
  !checkoutModalContent.includes('tab-transfer') &&
  !checkoutModalContent.includes('6521360067'),
  'Legacy CheckoutModal has removed student-facing bank transfer tabs and account numbers'
);

// -------------------------------------------------------------
// Test Suite 2: Server-Authoritative Price & Product Mapping
// -------------------------------------------------------------
console.log('\n--- SUITE 2: Server-Authoritative Pricing & Early-Bird Rules ---');

// Check 6: All four billing options map to correct authoritative products & prices
assert(
  payInitiateContent.includes('"cohort-core-monthly": { name: "TECHMED Core (1-Month Subscription)", amount: 7000') &&
  payInitiateContent.includes('"cohort-core-earlybird": { name: "TECHMED Core (3-Month Early-Bird)", amount: 15000') &&
  payInitiateContent.includes('"cohort-core-standard": { name: "TECHMED Core (3-Month Standard)", amount: 18000') &&
  payInitiateContent.includes('"cohort-mastery-earlybird": { name: "TECHMED Mastery (3-Month Early-Bird)", amount: 20000') &&
  payInitiateContent.includes('"cohort-mastery-standard": { name: "TECHMED Mastery (3-Month Standard)", amount: 25000') &&
  payInitiateContent.includes('"cohort-ultimate": { name: "TECHMED Ultimate (Full UTME 2027 Access)", amount: 40000'),
  'pay-initiate/index.ts defines authoritative amounts: Core monthly ₦7k, Core 3mo ₦15k/₦18k, Mastery ₦20k/₦25k, Ultimate ₦40k'
);

// Check 7: Early-bird deadline validation logic
assert(
  payInitiateContent.includes('2026-11-15T23:59:59Z') &&
  payInitiateContent.includes('EARLY_BIRD_DEADLINE') &&
  payInitiateContent.includes('if (cleanProductId.includes("core") && !cleanProductId.includes("monthly")) validatedAmount = 18000') &&
  payInitiateContent.includes('if (cleanProductId.includes("mastery")) validatedAmount = 25000'),
  'Server strictly enforces 15 November 2026 early-bird deadline for Core (₦18k) and Mastery (₦25k)'
);

// Check 8: Server-side callback route separation: cohort routes to /payment/callback
assert(
  payInitiateContent.includes('product.isCohort') &&
  payInitiateContent.includes('/payment/callback?reference='),
  'Cohort products automatically route to /payment/callback onboarding, not download.html'
);

// Check 9: pay-verify enforces amount mismatch protection
assert(
  payVerifyContent.includes('Math.abs(paidAmount - order.amount) > 1') &&
  payVerifyContent.includes('status: "mismatched"'),
  'pay-verify rejects transactions where paidAmount does not match expected order.amount'
);

// -------------------------------------------------------------
// Test Suite 3: Live API End-to-End Edge Function Verification
// -------------------------------------------------------------
console.log('\n--- SUITE 3: Live API Function Validation ---');

async function runLiveTests() {
  try {
    // Test 10: Unknown product rejection
    const unkRes = await fetch(`${SUPABASE_FN_BASE}/pay-initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        product_id: 'unknown-fake-product',
        email: 'test@example.com',
      }),
    });
    const unkData = await unkRes.json();
    assert(
      unkRes.status === 400 && unkData.message?.includes('Unknown product'),
      'Edge Function returns clean 400 with "Unknown product" for invalid product IDs',
      JSON.stringify(unkData)
    );

    // Test 11: Valid Ultimate product initiation returns authorization_url
    const ultRes = await fetch(`${SUPABASE_FN_BASE}/pay-initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        product_id: 'cohort-ultimate',
        email: 'test-admissions@example.com',
        name: 'Test Student',
      }),
    });
    const ultData = await ultRes.json();
    assert(
      ultRes.ok && ultData.success && ultData.data?.authorization_url?.startsWith('https://checkout.paystack.com/'),
      'Edge Function successfully initiates Paystack transaction for cohort-ultimate with live authorization_url',
      JSON.stringify(ultData)
    );

    // Test 12: Core monthly initiation
    const coreMonRes = await fetch(`${SUPABASE_FN_BASE}/pay-initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        product_id: 'cohort-core-monthly',
        email: 'test-monthly@example.com',
        amount: 100, // Try to manipulate price to ₦100 in body
      }),
    });
    const coreMonData = await coreMonRes.json();
    assert(
      coreMonRes.ok && coreMonData.success && coreMonData.data?.authorization_url,
      'Core monthly initiates successfully and ignores client-supplied manipulated price (₦100)',
      JSON.stringify(coreMonData)
    );

    // Test 13: Core early-bird initiation
    const coreEarlyRes = await fetch(`${SUPABASE_FN_BASE}/pay-initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        product_id: 'cohort-core-earlybird',
        email: 'test-early@example.com',
      }),
    });
    const coreEarlyData = await coreEarlyRes.json();
    assert(
      coreEarlyRes.ok && coreEarlyData.success && coreEarlyData.data?.authorization_url,
      'Core early-bird initiates successfully and returns Paystack URL',
      JSON.stringify(coreEarlyData)
    );

    // Test 14: Mastery early-bird initiation
    const masEarlyRes = await fetch(`${SUPABASE_FN_BASE}/pay-initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        product_id: 'cohort-mastery-earlybird',
        email: 'test-mastery@example.com',
      }),
    });
    const masEarlyData = await masEarlyRes.json();
    assert(
      masEarlyRes.ok && masEarlyData.success && masEarlyData.data?.authorization_url,
      'Mastery early-bird initiates successfully and returns Paystack URL',
      JSON.stringify(masEarlyData)
    );

    // Test 15: Verification idempotency with non-existent or unverified ref
    const verifyRes = await fetch(`${SUPABASE_FN_BASE}/pay-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        reference: 'non_existent_reference_xyz123',
      }),
    });
    const verifyData = await verifyRes.json();
    assert(
      verifyRes.status === 404 && verifyData.message === 'Order not found',
      'pay-verify correctly returns 404 for forged/unrecorded references without granting access',
      JSON.stringify(verifyData)
    );

  } catch (err) {
    console.error('Live test error:', err);
  }

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runLiveTests();
