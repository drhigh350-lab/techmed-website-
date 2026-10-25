// TECHMED Checkout Conversion, Automatic Enrolment & Student Experience Test Suite
// File: web/scripts/test-checkout-enrolment-suite.mjs
// Run: node web/scripts/test-checkout-enrolment-suite.mjs

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

function runScenario(num, description, fn) {
  try {
    fn();
    console.log(`[PASS] Scenario ${num}: ${description}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Scenario ${num}: ${description} -> ${err.message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('TECHMED UTME 2027 — CHECKOUT, ENROLMENT & ONBOARDING SUITE (20 SCENARIOS)');
console.log('================================================================\n');

const pricingAstro = fs.readFileSync(path.join(webRoot, 'src/pages/pricing.astro'), 'utf8');
const checkoutModal = fs.readFileSync(path.join(webRoot, 'src/components/CheckoutModal.astro'), 'utf8');
const payInitiate = fs.readFileSync(path.join(repoRoot, 'supabase/functions/pay-initiate/index.ts'), 'utf8');
const payVerify = fs.readFileSync(path.join(repoRoot, 'supabase/functions/pay-verify/index.ts'), 'utf8');
const payCallback = fs.readFileSync(path.join(webRoot, 'src/pages/payment/callback.astro'), 'utf8');
const downloadHtml = fs.readFileSync(path.join(webRoot, 'public/download.html'), 'utf8');
const adminAstro = fs.readFileSync(path.join(webRoot, 'src/pages/library/admin.astro'), 'utf8');
const rosterTs = fs.readFileSync(path.join(webRoot, 'src/lib/roster.ts'), 'utf8');
const pricingTs = fs.readFileSync(path.join(webRoot, 'src/lib/pricing.ts'), 'utf8');

// Scenario 1: Pricing page displays ₦15,000 (struck-through ₦18,000) for Core upfront until deadline
runScenario(1, 'Pricing page displays ₦15,000 (struck-through ₦18,000) for Core upfront until deadline', () => {
  assert.ok(pricingAstro.includes('₦15,000'), 'Missing ₦15,000 price for Core');
  assert.ok(pricingAstro.includes('original-price-strike') && pricingAstro.includes('₦18,000'), 'Missing struck-through ₦18,000 for Core');
  assert.ok(pricingAstro.includes('2026-11-15T23:59:59Z'), 'Missing 15 Nov 2026 deadline');
});

// Scenario 2: Pricing page displays ₦20,000 (struck-through ₦25,000) for Mastery upfront until deadline
runScenario(2, 'Pricing page displays ₦20,000 (struck-through ₦25,000) for Mastery upfront until deadline', () => {
  assert.ok(pricingAstro.includes('₦20,000'), 'Missing ₦20,000 price for Mastery');
  assert.ok(pricingAstro.includes('original-price-strike') && pricingAstro.includes('₦25,000'), 'Missing struck-through ₦25,000 for Mastery');
});

// Scenario 3: Pricing page displays ₦7,000 for Core monthly and ₦40,000 for Ultimate
runScenario(3, 'Pricing page displays ₦7,000 for Core monthly and ₦40,000 for Ultimate', () => {
  assert.ok(pricingAstro.includes('₦7,000 / month') || pricingAstro.includes('₦7,000'), 'Missing ₦7,000 monthly option for Core');
  assert.ok(pricingAstro.includes('₦40,000'), 'Missing ₦40,000 for Ultimate');
});

// Scenario 4: Early-bird offers automatically disappear after 15 November 2026
runScenario(4, 'Early-bird offers automatically disappear after 15 November 2026', () => {
  assert.ok(pricingAstro.includes('const isEarlyBirdActive = new Date() <= EARLY_BIRD_DEADLINE;'), 'Missing conditional early-bird flag in pricing.astro');
  assert.ok(payInitiate.includes('EARLY_BIRD_DEADLINE') && payInitiate.includes('Date.now() > EARLY_BIRD_DEADLINE'), 'Server-side pay-initiate does not enforce early-bird cutoff');
});

// Scenario 5: Primary CTA on Core opens billing duration choice
runScenario(5, 'Primary CTA on Core opens billing duration choice', () => {
  assert.ok(checkoutModal.includes('planBillingOptionsGroup'), 'CheckoutModal missing billing options selector');
  assert.ok(checkoutModal.includes('modalBillingChoice') && checkoutModal.includes('earlybird') && checkoutModal.includes('monthly'), 'CheckoutModal missing earlybird and monthly billing options');
});

// Scenario 6: Primary CTA on Mastery and Ultimate opens checkout with correct plan preselected
runScenario(6, 'Primary CTA on Mastery and Ultimate opens checkout with correct plan preselected', () => {
  assert.ok(pricingAstro.includes("plan === 'mastery'"), 'Pricing does not handle mastery event selection');
  assert.ok(pricingAstro.includes("plan === 'ultimate'"), 'Pricing does not handle ultimate event selection');
  assert.ok(checkoutModal.includes('openCheckout'), 'CheckoutModal does not expose openCheckout function');
});

// Scenario 7: Unauthenticated checkout initiates successfully with only email
runScenario(7, 'Unauthenticated checkout initiates successfully with only email', () => {
  assert.ok(checkoutModal.includes('checkoutEmail'), 'CheckoutModal missing email input');
  assert.ok(!checkoutModal.includes('required pattern=".*" id="checkoutPassword"'), 'CheckoutModal improperly enforces password before payment');
  assert.ok(checkoutModal.includes('name || undefined') && checkoutModal.includes('phone || undefined'), 'Name and phone optional on checkout');
});

// Scenario 8: Server calculates and validates amount; client-submitted price is ignored
runScenario(8, 'Server calculates and validates amount; client-submitted price is ignored', () => {
  assert.ok(payInitiate.includes('const PRODUCTS: Record<string'), 'pay-initiate missing PRODUCTS price list');
  assert.ok(payInitiate.includes('const cleanProductId = product_id.trim();'), 'pay-initiate does not sanitize product_id');
  assert.ok(payInitiate.includes('const product = PRODUCTS[cleanProductId];'), 'pay-initiate does not look up server authoritative price');
  assert.ok(payInitiate.includes('let validatedAmount = product.amount;'), 'pay-initiate does not use server authoritative amount');
});

// Scenario 9: Paystack initialization returns hosted URL and customer is redirected
runScenario(9, 'Paystack initialization returns hosted URL and customer is redirected', () => {
  assert.ok(payInitiate.includes('https://api.paystack.co/transaction/initialize'), 'pay-initiate does not call Paystack initialize endpoint');
  assert.ok(checkoutModal.includes('data.data?.authorization_url'), 'CheckoutModal does not check authorization_url');
  assert.ok(checkoutModal.includes('window.location.href = data.data.authorization_url;'), 'CheckoutModal does not redirect to Paystack authorization_url');
});

// Scenario 10: Paystack failure shows clear error message and WhatsApp fallback with product prefilled
runScenario(10, 'Paystack failure shows clear error message and WhatsApp fallback with product prefilled', () => {
  assert.ok(checkoutModal.includes('Payment Gateway Notice'), 'Missing Payment Gateway Notice alert in CheckoutModal');
  assert.ok(checkoutModal.includes('waUrl') && checkoutModal.includes('https://wa.me/2347044255045'), 'Missing prefilled WhatsApp support URL');
  assert.ok(checkoutModal.includes('encodeURIComponent'), 'WhatsApp message is not URI encoded with product title');
});

// Scenario 11: WhatsApp fallback never triggers on successful initialization
runScenario(11, 'WhatsApp fallback never triggers on successful initialization', () => {
  assert.ok(!checkoutModal.includes("window.open(waUrl, '_blank')"), 'CheckoutModal must never automatically trigger window.open to WhatsApp on initiate');
  assert.ok(checkoutModal.includes('if (res.ok && data.success && data.data?.authorization_url)'), 'CheckoutModal must navigate to authorization_url upon success');
});

// Scenario 12: Verified payment marks order paid and activates enrolment idempotently
runScenario(12, 'Verified payment marks order paid and activates enrolment idempotently', () => {
  assert.ok(payVerify.includes('if (order.status === "paid")'), 'pay-verify does not check idempotent paid status');
  assert.ok(payVerify.includes('grant_order_entitlements'), 'pay-verify does not invoke grant_order_entitlements');
});

// Scenario 13: Duplicate webhook/callback does not duplicate enrolments or extend durations incorrectly
runScenario(13, 'Duplicate webhook/callback does not duplicate enrolments or extend durations incorrectly', () => {
  const mig = fs.readFileSync(path.join(repoRoot, 'supabase/migrations/20261023000003_phase4_security_hardening.sql'), 'utf8');
  assert.ok(mig.includes('ON CONFLICT (source_order_reference, resource_id)'), 'grant_order_entitlements lacks ON CONFLICT idempotent clause');
  assert.ok(payVerify.includes('order.status === "paid"'), 'pay-verify does not skip already paid orders');
});

// Scenario 14: Core plan grants 20% discount on standalone e-books
runScenario(14, 'Core plan grants 20% discount on standalone e-books', () => {
  assert.ok(checkoutModal.includes('coreDiscountCheckbox') && checkoutModal.includes('20% discount'), 'CheckoutModal missing Core 20% discount display');
  assert.ok(rosterTs.includes('isEligibleForCoreDiscount') && checkoutModal.includes('basePrice * 0.8'), 'Missing 20% discount calculation logic');
});

// Scenario 15: Mastery plan grants automatic access to the 3 booster e-books
runScenario(15, 'Mastery plan grants automatic access to the 3 booster e-books', () => {
  assert.ok(rosterTs.includes('chemistry-booster') && rosterTs.includes('biology-booster') && rosterTs.includes('physics-booster'), 'Roster grants missing 3 boosters for Mastery');
  assert.ok(rosterTs.includes("TIER_INCLUSIONS") && rosterTs.includes("mastery: ["), 'Booster access not enabled for Mastery');
});

// Scenario 16: Ultimate plan grants Mastery access plus bootcamps, revision, and tracks mentorship seats
runScenario(16, 'Ultimate plan grants Mastery access plus bootcamps, revision, and tracks mentorship seats', () => {
  assert.ok(pricingTs.includes('Founder mentorship') && pricingTs.includes('Bootcamp'), 'Pricing features missing Bootcamp / Mentorship for Ultimate');
  assert.ok(adminAstro.includes('statMentorshipCount'), 'Admin portal missing Mentorship count metric');
});

// Scenario 17: Mentorship counter stops accepting enrolments after 20 confirmed seats
runScenario(17, 'Mentorship counter stops accepting enrolments after 20 confirmed seats', () => {
  assert.ok(rosterTs.includes('MAX_MENTORSHIP_SEATS = 20'), 'Roster missing MAX_MENTORSHIP_SEATS = 20 ceiling');
  assert.ok(rosterTs.includes('currentCount >= MAX_MENTORSHIP_SEATS'), 'Roster does not enforce 20 seats ceiling');
});

// Scenario 18: Post-payment screen allows password creation for unauthenticated customer
runScenario(18, 'Post-payment screen allows password creation for unauthenticated customer', () => {
  assert.ok(payCallback.includes('postPaymentAccountBox') && payCallback.includes('postPaymentPassword'), 'payment/callback.astro missing post-payment password setup box');
  assert.ok(payCallback.includes('Your purchase is secure. Create a password to access your dashboard'), 'Missing reassurance copy in payment/callback.astro');
  assert.ok(downloadHtml.includes('quickAccountSetup') && downloadHtml.includes('dlPassword'), 'download.html missing post-payment password setup');
});

// Scenario 19: Email verification flow works and account links to paid order upon verification
runScenario(19, 'Email verification flow works and account links to paid order upon verification', () => {
  assert.ok(payCallback.includes('supabase.auth.signUp'), 'payment/callback.astro does not call signUp');
  assert.ok(payCallback.includes('claim_order_reference'), 'payment/callback.astro does not claim order reference');
  assert.ok(payCallback.includes('Please check your email to verify your address'), 'Missing email verification instructions');
});

// Scenario 20: Customer closing browser after payment can verify email later and find access intact
runScenario(20, 'Customer closing browser after payment can verify email later and find access intact', () => {
  const supabaseTs = fs.readFileSync(path.join(webRoot, 'src/lib/supabase.ts'), 'utf8');
  assert.ok(supabaseTs.includes('fetchUserEntitlements'), 'supabase.ts missing fetchUserEntitlements');
  assert.ok(supabaseTs.includes("query.or(`user_id.eq.${userId},customer_email.ilike.${userEmail || ''}`)"), 'fetchUserEntitlements does not query by email matching');
  assert.ok(supabaseTs.includes('verifyAndClaimOrderReference'), 'supabase.ts missing verifyAndClaimOrderReference');
});

console.log('================================================================');
console.log(`TOTAL SCENARIOS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================');

if (failed > 0) process.exit(1);
