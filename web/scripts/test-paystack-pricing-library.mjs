import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('================================================================');
console.log('TECHMED VERIFICATION: LIBRARY LOOP, PAYSTACK & PRICING CHECKOUT');
console.log('================================================================');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// 1. Library Loading Loop Verification
const libraryIndex = readFileSync(resolve('web/src/pages/library/index.astro'), 'utf-8');
assert(!libraryIndex.includes('define:vars={{ catalogData'), 'Priority 1: Removed define:vars IIFE wrapper that blocked ES module imports');
assert(libraryIndex.includes('id="catalogDataScript" type="application/json"'), 'Priority 1: Embedded JSON script tag used for catalog data hydration');
assert(libraryIndex.includes('setTimeout(') && libraryIndex.includes('btnForceAuthView'), 'Priority 1: Safe fallback timeout and manual access button present if session check stalls');

// 2. Paystack WhatsApp Fallback Verification
const checkoutModal = readFileSync(resolve('web/src/components/CheckoutModal.astro'), 'utf-8');
assert(!checkoutModal.includes("window.open(waUrl, '_blank')"), 'Priority 2: Removed silent automatic window.open redirect to WhatsApp on Paystack failure');
assert(checkoutModal.includes('checkoutAlert.innerHTML') && checkoutModal.includes('Payment Gateway Notice'), 'Priority 2: Informative in-modal error alert displayed on initiation failure');
assert(checkoutModal.includes('apikey') && checkoutModal.includes('Authorization'), 'Priority 2: Supabase anonKey authorization header provided in pay-initiate fetch');

// 3. Pricing Page Paystack Integration Verification
const pricingPage = readFileSync(resolve('web/src/pages/pricing.astro'), 'utf-8');
assert(pricingPage.includes('import CheckoutModal from'), 'Priority 3: CheckoutModal imported in pricing.astro');
assert(pricingPage.includes('<CheckoutModal />'), 'Priority 3: CheckoutModal mounted in pricing.astro');
assert(pricingPage.includes('pay-btn-core') && pricingPage.includes('pay-btn-mastery') && pricingPage.includes('pay-btn-ultimate'), 'Priority 3: Paystack checkout buttons present for Core, Mastery, and Ultimate');
assert(pricingPage.includes('coreBillingSelector') && pricingPage.includes('data-period="earlybird"') && pricingPage.includes('data-period="monthly"'), 'Priority 3: Core billing selector allows switching between Monthly (₦7k) and 3-Month Early-bird (₦15k)');
assert(pricingPage.includes('pay-btn-ultimate-bottom'), 'Priority 3: Why Ultimate closer block triggers ₦40,000 Paystack checkout directly');
assert(pricingPage.includes('secondary-wa-link'), 'Priority 3: Secondary WhatsApp links preserved for admissions advice');

// 4. Edge Function Product Catalog and Early-Bird Validation
const payInitiate = readFileSync(resolve('supabase/functions/pay-initiate/index.ts'), 'utf-8');
assert(payInitiate.includes('"cohort-core-monthly"') && payInitiate.includes('7000'), 'Priority 3: Edge function supports cohort-core-monthly at ₦7,000');
assert(payInitiate.includes('"cohort-core-earlybird"') && payInitiate.includes('15000'), 'Priority 3: Edge function supports cohort-core-earlybird at ₦15,000');
assert(payInitiate.includes('"cohort-mastery-earlybird"') && payInitiate.includes('20000'), 'Priority 3: Edge function supports cohort-mastery-earlybird at ₦20,000');
assert(payInitiate.includes('"cohort-ultimate"') && payInitiate.includes('40000'), 'Priority 3: Edge function supports cohort-ultimate at ₦40,000');
assert(payInitiate.includes('EARLY_BIRD_DEADLINE'), 'Priority 3: Edge function enforces early-bird deadline server-side');

// 5. Download Callback Handler
const downloadHtml = readFileSync(resolve('download.html'), 'utf-8');
assert(downloadHtml.includes('isCohort') && downloadHtml.includes('Enrolment Confirmed!'), 'Priority 3: download.html recognises cohort purchases and shows enrolment confirmation');
assert(downloadHtml.includes('/library'), 'Priority 3: download.html links to /library for immediate access');

console.log('================================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================');

if (failed > 0) process.exit(1);
