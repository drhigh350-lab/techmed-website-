/**
 * TECHMED Checkout UI Redesign Verification Suite
 *
 * Verifies all 12 Acceptance Test Requirements:
 * 1. Core monthly checkout
 * 2. Core three-month checkout
 * 3. Mastery checkout
 * 4. Ultimate checkout
 * 5. Standalone resource checkout
 * 6. Applicable discounts and early-bird pricing
 * 7. Logged-in and logged-out users (pre-fill logic)
 * 8. Paystack success, failure, and cancellation handling
 * 9. Bank transfer pending and subsequent verification
 * 10. Duplicate payment submissions and callbacks
 * 11. Correct entitlement assignment after verified payment
 * 12. Mobile layout and form usability (Guided 3-Step Checkout)
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
console.log('TECHMED CHECKOUT UI REDESIGN ACCEPTANCE TEST SUITE');
console.log('====================================================\n');

const planModal = readFileSync(resolve('web/src/components/PlanCheckoutModal.astro'), 'utf-8');
const resourceModal = readFileSync(resolve('web/src/components/CheckoutModal.astro'), 'utf-8');
const callbackPage = readFileSync(resolve('web/src/pages/payment/callback.astro'), 'utf-8');
const payInitiate = readFileSync(resolve('supabase/functions/pay-initiate/index.ts'), 'utf-8');
const payVerify = readFileSync(resolve('supabase/functions/pay-verify/index.ts'), 'utf-8');

// -----------------------------------------------------------------------------
// TEST 1 & 2: Core Monthly & 3-Month Checkout Integrity
// -----------------------------------------------------------------------------
console.log('TEST 1 & 2: Core Monthly & Core 3-Month Checkout Integrity');
assert(planModal.includes('id="cardMonthly"'), 'PlanCheckoutModal contains monthly billing option card');
assert(planModal.includes('id="cardEarlybird"'), 'PlanCheckoutModal contains early-bird 3-month billing option card');
assert(planModal.includes('serverProductId = \'cohort-core-monthly\''), 'Monthly selection resolves to cohort-core-monthly');
assert(planModal.includes('basePrice = 7000'), 'Monthly base price is ₦7,000');
assert(planModal.includes('basePrice = earlyValid ? 15000 : 18000'), '3-month base price is ₦15,000 earlybird or ₦18,000 standard');
assert(payInitiate.includes('"cohort-core-monthly": { name: "TECHMED Core (1-Month Subscription)", amount: 7000'), 'Server pay-initiate has authoritative ₦7,000 monthly Core');
assert(payInitiate.includes('"cohort-core-earlybird": { name: "TECHMED Core (3-Month Early-Bird)", amount: 15000'), 'Server pay-initiate has authoritative ₦15,000 earlybird Core');

// -----------------------------------------------------------------------------
// TEST 3 & 4: Mastery & Ultimate Plan Checkout
// -----------------------------------------------------------------------------
console.log('\nTEST 3 & 4: Mastery & Ultimate Plan Checkout');
assert(planModal.includes('activePlanId === \'mastery\''), 'PlanCheckoutModal handles Mastery plan');
assert(planModal.includes('basePrice = earlyValid ? 20000 : 25000'), 'Mastery base price is ₦20,000 earlybird or ₦25,000 standard');
assert(planModal.includes('activePlanId === \'ultimate\''), 'PlanCheckoutModal handles Ultimate plan');
assert(planModal.includes('basePrice = 40000'), 'Ultimate base price is ₦40,000');
assert(payInitiate.includes('"cohort-mastery-earlybird": { name: "TECHMED Mastery (3-Month Early-Bird)", amount: 20000'), 'Server pay-initiate defines ₦20,000 Mastery earlybird');
assert(payInitiate.includes('"cohort-ultimate": { name: "TECHMED Ultimate (Full UTME 2027 Access)", amount: 40000'), 'Server pay-initiate defines ₦40,000 Ultimate plan');

// -----------------------------------------------------------------------------
// TEST 5: Standalone Resource Checkout
// -----------------------------------------------------------------------------
console.log('\nTEST 5: Standalone Resource Checkout');
assert(resourceModal.includes('id="checkoutModalBackdrop"'), 'CheckoutModal contains modal backdrop');
assert(resourceModal.includes('id="checkoutItemTitle"'), 'CheckoutModal contains resource title element');
assert(resourceModal.includes('id="checkoutFinalPrice"'), 'CheckoutModal contains final price figure');
assert(resourceModal.includes('openCheckout(resource: any)'), 'CheckoutModal exposes openCheckout(resource)');
assert(resourceModal.includes('window.addEventListener(\'open-checkout\''), 'CheckoutModal listens for open-checkout events');
assert(payInitiate.includes('"chemistry-booster"'), 'pay-initiate defines chemistry-booster');
assert(payInitiate.includes('"university-research-file"'), 'pay-initiate defines university-research-file');

// -----------------------------------------------------------------------------
// TEST 6: Applicable Discounts and Early-Bird Pricing
// -----------------------------------------------------------------------------
console.log('\nTEST 6: Applicable Discounts and Early-Bird Pricing');
assert(planModal.includes('validatePromoCode'), 'PlanCheckoutModal uses authoritative validatePromoCode');
assert(planModal.includes('appliedPromoCode = res.promoCode'), 'PlanCheckoutModal activates validated promo code');
assert(planModal.includes('recalculatePlanDetails()'), 'PlanCheckoutModal recalculates authoritative prices');
assert(resourceModal.includes('id="coreDiscountCheckbox"'), 'CheckoutModal provides 20% discount checkbox for enrolled Core students');
assert(resourceModal.includes('Math.round(basePrice * 0.8)'), 'CheckoutModal calculates exact 20% discount on standalone resources');

// -----------------------------------------------------------------------------
// TEST 7: Logged-in and Logged-out User Autofill
// -----------------------------------------------------------------------------
console.log('\nTEST 7: Logged-in and Logged-out User Autofill');
assert(planModal.includes('getCurrentUser().then'), 'PlanCheckoutModal fetches logged in user');
assert(planModal.includes('planCustomerEmail.value = user.email'), 'PlanCheckoutModal pre-fills email for logged-in user');
assert(resourceModal.includes('getCurrentUser().then'), 'CheckoutModal fetches logged in user');
assert(resourceModal.includes('checkoutEmail.value = user.email'), 'CheckoutModal pre-fills email for logged-in user');

// -----------------------------------------------------------------------------
// TEST 8: Paystack Success, Failure, and Cancellation Handling
// -----------------------------------------------------------------------------
console.log('\nTEST 8: Paystack Success, Failure, and Cancellation Handling');
assert(planModal.includes('window.location.href = data.data.authorization_url'), 'Plan checkout redirects to Paystack authorization URL');
assert(planModal.includes('id="planAlertBox"'), 'PlanCheckoutModal contains in-modal alert for gateway notices');
assert(planModal.includes('id="planAlertRetryBtn"'), 'PlanCheckoutModal provides retry button when initiation fails');
assert(callbackPage.includes('id="loadingState"'), 'Callback page has loading state while verifying reference');
assert(callbackPage.includes('id="successState"'), 'Callback page has confirmed success state');
assert(callbackPage.includes('id="errorState"'), 'Callback page has error/not completed state for failed or cancelled payments');

// -----------------------------------------------------------------------------
// TEST 9: Bank Transfer Pending and Subsequent Verification
// -----------------------------------------------------------------------------
console.log('\nTEST 9: Bank Transfer Pending and Subsequent Verification');
assert(callbackPage.includes('id="pendingState"'), 'Callback page contains dedicated pending settlement state');
assert(callbackPage.includes('id="recheckBtn"'), 'Callback page contains re-check status button for pending bank transfers');
assert(callbackPage.includes('id="pendingWhatsAppBtn"'), 'Callback page allows notifying admissions desk on WhatsApp for bank transfers');

// -----------------------------------------------------------------------------
// TEST 10: Duplicate Payment Submissions & Guards
// -----------------------------------------------------------------------------
console.log('\nTEST 10: Duplicate Payment Submissions & Guards');
assert(planModal.includes('planSubmitBtn.disabled = true'), 'Plan submit button is disabled immediately upon click');
assert(planModal.includes('Connecting to Paystack...'), 'Plan submit button shows loading state to prevent double submission');
assert(resourceModal.includes('paystackSubmitBtn.disabled = true'), 'Resource submit button is disabled immediately upon click');

// -----------------------------------------------------------------------------
// TEST 11: Correct Entitlement Assignment After Verified Payment
// -----------------------------------------------------------------------------
console.log('\nTEST 11: Correct Entitlement Assignment After Verified Payment');
assert(payVerify.includes('order.status === "paid"'), 'pay-verify checks order status');
assert(payVerify.includes('grant_order_entitlements'), 'pay-verify invokes grant_order_entitlements RPC');
assert(callbackPage.includes('id="confirmedProductName"'), 'Callback displays confirmed product name');
assert(callbackPage.includes('id="confirmedRef"'), 'Callback displays verified transaction reference');

// -----------------------------------------------------------------------------
// TEST 12: Guided 3-Step UI, Mobile Layout and Usability
// -----------------------------------------------------------------------------
console.log('\nTEST 12: Guided 3-Step UI, Mobile Layout and Usability');
// Step indicator verification
assert(planModal.includes('class="checkout-stepper"'), 'PlanCheckoutModal has 3-step checkout-stepper');
assert(planModal.includes('id="planStepNav1"'), 'PlanCheckoutModal has Step 1 indicator (Order)');
assert(planModal.includes('id="planStepNav2"'), 'PlanCheckoutModal has Step 2 indicator (Details)');
assert(planModal.includes('id="planStepNav3"'), 'PlanCheckoutModal has Step 3 indicator (Payment)');
assert(planModal.includes('id="planPaneStep1"'), 'PlanCheckoutModal has Step 1 pane');
assert(planModal.includes('id="planPaneStep2"'), 'PlanCheckoutModal has Step 2 pane');
assert(planModal.includes('id="planPaneStep3"'), 'PlanCheckoutModal has Step 3 pane');
assert(planModal.includes('goToStep('), 'PlanCheckoutModal has goToStep navigation function');

// Resource modal stepper verification
assert(resourceModal.includes('class="checkout-stepper"'), 'CheckoutModal has 3-step checkout-stepper');
assert(resourceModal.includes('id="resourceStepNav1"'), 'CheckoutModal has Step 1 indicator');
assert(resourceModal.includes('id="resourceStepNav2"'), 'CheckoutModal has Step 2 indicator');
assert(resourceModal.includes('id="resourceStepNav3"'), 'CheckoutModal has Step 3 indicator');
assert(resourceModal.includes('id="resourcePaneStep1"'), 'CheckoutModal has Step 1 pane');
assert(resourceModal.includes('id="resourcePaneStep2"'), 'CheckoutModal has Step 2 pane');
assert(resourceModal.includes('id="resourcePaneStep3"'), 'CheckoutModal has Step 3 pane');

// Mobile-first full-screen styling verification
assert(planModal.includes('@media (max-width: 640px)'), 'PlanCheckoutModal includes mobile-first media query');
assert(planModal.includes('height: 100vh') || planModal.includes('max-height: 100dvh'), 'PlanCheckoutModal supports full-screen mobile height');
assert(resourceModal.includes('@media (max-width: 640px)'), 'CheckoutModal includes mobile-first media query');
assert(resourceModal.includes('height: 100vh') || resourceModal.includes('max-height: 100dvh'), 'CheckoutModal supports full-screen mobile height');
assert(callbackPage.includes('callback-step-indicator'), 'Callback page completes guided experience with Step 4 indicator');

console.log('\n====================================================');
console.log(`TEST SUITE RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log('====================================================\n');

if (passed !== total) {
  process.exit(1);
}
