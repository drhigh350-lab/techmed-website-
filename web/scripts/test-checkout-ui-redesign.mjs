/**
 * TECHMED Checkout UI Redesign Verification Suite
 *
 * Verifies the Simplified Two-Step Checkout Experience:
 * 1. Step 1: Order Review (selected plan/resource, order summary, email only, promo input)
 * 2. Step 2: Payment (Paystack gateway presentation, prominent Deep Navy button, duplicate prevention)
 * 3. Email-only checkout: Student Full Name and WhatsApp phone removed from checkout form
 * 4. Promo code section: No permanent TECHMED30 promotional banner; dynamic apply and validation
 * 5. Visual design: Deep Navy (#012748) primary buttons, Professional Blue (#09476E) hover/accents, dark readable prices on white
 * 6. Payment Confirmation (/payment/callback):
 *    - Success state with button to access dashboard
 *    - Pending state explaining bank transfer settlement and re-check action
 *    - Failed state with retry option
 *    - WhatsApp support link: https://wa.me/2347044255045 across confirmation states
 * 7. Mobile-first layout: full-screen modal on <= 640px
 * 8. Backend integration integrity: pay-initiate, pay-verify, entitlements
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('TECHMED SIMPLIFIED TWO-STEP CHECKOUT TEST SUITE');
console.log('====================================================\n');

const planModal = readFileSync(resolve('web/src/components/PlanCheckoutModal.astro'), 'utf-8');
const resourceModal = readFileSync(resolve('web/src/components/CheckoutModal.astro'), 'utf-8');
const callbackPage = readFileSync(resolve('web/src/pages/payment/callback.astro'), 'utf-8');
const payInitiate = readFileSync(resolve('supabase/functions/pay-initiate/index.ts'), 'utf-8');
const payVerify = readFileSync(resolve('supabase/functions/pay-verify/index.ts'), 'utf-8');

// -----------------------------------------------------------------------------
// TEST 1: Two-Step Checkout Flow
// -----------------------------------------------------------------------------
console.log('TEST 1: Two-Step Checkout Flow Structure');
assert(planModal.includes('id="planStepNav1"') && planModal.includes('id="planStepNav2"'), 'PlanCheckoutModal defines Step 1 and Step 2 navigation indicators');
assert(!planModal.includes('id="planStepNav3"'), 'PlanCheckoutModal removes 3rd step, adhering strictly to 2-step checkout');
assert(planModal.includes('Order Review'), 'PlanCheckoutModal Step 1 is labeled Order Review');
assert(planModal.includes('id="planPaneStep1"') && planModal.includes('id="planPaneStep2"'), 'PlanCheckoutModal defines Step 1 and Step 2 panes');
assert(!planModal.includes('id="planPaneStep3"'), 'PlanCheckoutModal has no Step 3 pane');

assert(resourceModal.includes('id="resourceStepNav1"') && resourceModal.includes('id="resourceStepNav2"'), 'CheckoutModal defines Step 1 and Step 2 navigation indicators');
assert(!resourceModal.includes('id="resourceStepNav3"'), 'CheckoutModal removes 3rd step, adhering strictly to 2-step checkout');
assert(resourceModal.includes('id="resourcePaneStep1"') && resourceModal.includes('id="resourcePaneStep2"'), 'CheckoutModal defines Step 1 and Step 2 panes');
assert(!resourceModal.includes('id="resourcePaneStep3"'), 'CheckoutModal has no Step 3 pane');

// -----------------------------------------------------------------------------
// TEST 2: Email-Only Checkout (No Name or Phone in Step 1)
// -----------------------------------------------------------------------------
console.log('\nTEST 2: Email-Only Checkout');
assert(planModal.includes('id="planCustomerEmail"'), 'PlanCheckoutModal contains required email address input');
assert(!planModal.includes('id="planCustomerName"'), 'PlanCheckoutModal removes Student Full Name input from checkout');
assert(!planModal.includes('id="planCustomerPhone"'), 'PlanCheckoutModal removes WhatsApp Phone Number input from checkout');
assert(resourceModal.includes('id="checkoutEmail"'), 'CheckoutModal contains required email address input');
assert(planModal.includes('planCustomerEmail.value = user.email'), 'PlanCheckoutModal pre-fills email for logged-in students');
assert(resourceModal.includes('checkoutEmail.value = user.email'), 'CheckoutModal pre-fills email for logged-in students');

// -----------------------------------------------------------------------------
// TEST 3: Promo Code Section (No Permanent Promotional Banner)
// -----------------------------------------------------------------------------
console.log('\nTEST 3: Promo Code Section Refinement');
assert(planModal.includes('Have a promo code?'), 'PlanCheckoutModal has promo code section');
assert(planModal.includes('id="planPromoInput"'), 'PlanCheckoutModal has promo code input field');
assert(planModal.includes('id="applyPromoBtn"'), 'PlanCheckoutModal has apply promo button');
assert(!planModal.includes('TECHMED30 (30% OFF)'), 'PlanCheckoutModal removes permanent TECHMED30 promotional banner/pill');
assert(planModal.includes('validatePromoCode'), 'PlanCheckoutModal validates promo code dynamically');

// -----------------------------------------------------------------------------
// TEST 4: Visual Design & Active Deep Navy Buttons
// -----------------------------------------------------------------------------
console.log('\nTEST 4: Visual Design & Deep Navy Primary Buttons');
assert(planModal.includes('#012748'), 'PlanCheckoutModal uses Deep Navy (#012748) brand colour');
assert(planModal.includes('#09476E'), 'PlanCheckoutModal uses Professional Blue (#09476E) highlight colour');
assert(planModal.includes('background: #012748 !important'), 'PlanCheckoutModal styles primary buttons with prominent Deep Navy');
assert(resourceModal.includes('background: #012748 !important'), 'CheckoutModal styles primary buttons with prominent Deep Navy');
assert(callbackPage.includes('background: #012748 !important'), 'Payment callback styles action buttons with prominent Deep Navy');
assert(planModal.includes('color: #012748'), 'PlanCheckoutModal renders prices in dark, readable Deep Navy on light surfaces');
assert(resourceModal.includes('color: #012748'), 'CheckoutModal renders prices in dark, readable Deep Navy on light surfaces');

// -----------------------------------------------------------------------------
// TEST 5: Payment Confirmation Page & WhatsApp Support Link
// -----------------------------------------------------------------------------
console.log('\nTEST 5: Payment Confirmation & WhatsApp Support');
assert(callbackPage.includes('Payment Successful'), 'Callback page displays Payment Successful heading');
assert(callbackPage.includes('id="confirmedProductName"'), 'Callback displays confirmed product name');
assert(callbackPage.includes('id="confirmedAmount"'), 'Callback displays confirmed amount paid');
assert(callbackPage.includes('Access Student Dashboard &rarr;') || callbackPage.includes('/dashboard'), 'Callback provides prominent button to access student dashboard');
assert(callbackPage.includes('https://wa.me/2347044255045'), 'Callback provides official WhatsApp support link (wa.me/2347044255045)');
assert(callbackPage.includes('Need help? Chat with us on WhatsApp'), 'Callback displays "Need help? Chat with us on WhatsApp" support label');
assert(callbackPage.includes('id="pendingState"'), 'Callback has dedicated pending settlement state');
assert(callbackPage.includes('id="errorState"'), 'Callback has dedicated error/not completed state');

// -----------------------------------------------------------------------------
// TEST 6: Pricing & Backend Entitlement Integrity
// -----------------------------------------------------------------------------
console.log('\nTEST 6: Pricing & Backend Integrity');
assert(planModal.includes('basePrice = 7000'), 'Core Monthly base price is ₦7,000');
assert(planModal.includes('basePrice = earlyValid ? 15000 : 18000'), 'Core 3-Month price is ₦15,000 earlybird or ₦18,000 standard');
assert(planModal.includes('basePrice = earlyValid ? 20000 : 25000'), 'Mastery price is ₦20,000 earlybird or ₦25,000 standard');
assert(planModal.includes('basePrice = 40000'), 'Ultimate price is ₦40,000');
assert(payInitiate.includes('"cohort-core-monthly": { name: "TECHMED Core (1-Month Subscription)", amount: 7000'), 'Server pay-initiate has authoritative ₦7,000 monthly Core');
assert(payInitiate.includes('"cohort-core-earlybird": { name: "TECHMED Core (3-Month Early-Bird)", amount: 15000'), 'Server pay-initiate has authoritative ₦15,000 earlybird Core');
assert(payVerify.includes('grant_order_entitlements'), 'pay-verify grants entitlements upon verified payment');

// -----------------------------------------------------------------------------
// TEST 7: Mobile-First Layout & Usability
// -----------------------------------------------------------------------------
console.log('\nTEST 7: Mobile-First Full-Screen Layout');
assert(planModal.includes('@media (max-width: 640px)'), 'PlanCheckoutModal includes mobile query');
assert(planModal.includes('max-height: 100dvh') || planModal.includes('height: 100vh'), 'PlanCheckoutModal uses full viewport height on mobile');
assert(resourceModal.includes('@media (max-width: 640px)'), 'CheckoutModal includes mobile query');
assert(resourceModal.includes('max-height: 100dvh') || resourceModal.includes('height: 100vh'), 'CheckoutModal uses full viewport height on mobile');

console.log('\n====================================================');
console.log(`TEST SUITE RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log('====================================================\n');

if (passed !== total) {
  process.exit(1);
}
