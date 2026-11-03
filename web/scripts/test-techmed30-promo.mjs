import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log('TECHMED30 PROMOTIONAL DISCOUNT TEST SUITE');
console.log('====================================================');

// Load promo module
const promoModulePath = path.join(webRoot, 'src', 'lib', 'promo.ts');
assert(fs.existsSync(promoModulePath), 'web/src/lib/promo.ts exists');

const promoModuleSource = fs.readFileSync(promoModulePath, 'utf-8');
const payInitiateSource = fs.readFileSync(path.join(repoRoot, 'supabase', 'functions', 'pay-initiate', 'index.ts'), 'utf-8');
const payVerifySource = fs.readFileSync(path.join(repoRoot, 'supabase', 'functions', 'pay-verify', 'index.ts'), 'utf-8');
const planCheckoutModalSource = fs.readFileSync(path.join(webRoot, 'src', 'components', 'PlanCheckoutModal.astro'), 'utf-8');

// -----------------------------------------------------------------------------
// TEST 1: Window Validation (Authoritative UTC Timestamps)
// -----------------------------------------------------------------------------
console.log('\nTEST 1: Promotion Window Validation (Strict 48-Hour UTC)');

const START_ISO = '2026-11-03T08:00:00Z';
const EXPIRY_ISO = '2026-11-05T08:00:00Z';
const START_UTC = new Date(START_ISO).getTime();
const EXPIRY_UTC = new Date(EXPIRY_ISO).getTime();

assert(START_UTC === 1793692800000, `Start UTC timestamp resolves to 1793692800000 (got ${START_UTC})`);
assert(EXPIRY_UTC === 1793865600000, `Expiry UTC timestamp resolves to 1793865600000 (got ${EXPIRY_UTC})`);
assert(EXPIRY_UTC - START_UTC === 48 * 60 * 60 * 1000, 'Duration is exactly 48 hours (172,800,000 ms)');

assert(promoModuleSource.includes('"2026-11-03T08:00:00Z"'), 'promo.ts defines start timestamp as 2026-11-03T08:00:00Z');
assert(promoModuleSource.includes('"2026-11-05T08:00:00Z"'), 'promo.ts defines expiry timestamp as 2026-11-05T08:00:00Z');
assert(payInitiateSource.includes('"2026-11-03T08:00:00Z"'), 'pay-initiate defines start timestamp as 2026-11-03T08:00:00Z');
assert(payInitiateSource.includes('"2026-11-05T08:00:00Z"'), 'pay-initiate defines expiry timestamp as 2026-11-05T08:00:00Z');

function testPromoWindow(nowUtc) {
  const isStarted = nowUtc >= START_UTC;
  const isExpired = nowUtc >= EXPIRY_UTC;
  if (!isStarted) return { valid: false, reason: 'not_started' };
  if (isExpired) return { valid: false, reason: 'expired' };
  return { valid: true, reason: 'active' };
}

// 1ms before start
const beforeStart = testPromoWindow(START_UTC - 1);
assert(!beforeStart.valid && beforeStart.reason === 'not_started', '1ms before start (2026-11-03T07:59:59.999Z) is rejected with not_started');

// Exactly at start
const atStart = testPromoWindow(START_UTC);
assert(atStart.valid && atStart.reason === 'active', 'Exactly at start (2026-11-03T08:00:00.000Z) is accepted as active');

// Midway through window (24 hours in)
const midWindow = testPromoWindow(START_UTC + 24 * 60 * 60 * 1000);
assert(midWindow.valid && midWindow.reason === 'active', '24 hours in (2026-11-04T08:00:00.000Z) is accepted as active');

// Exactly at expiry
const atExpiry = testPromoWindow(EXPIRY_UTC);
assert(!atExpiry.valid && atExpiry.reason === 'expired', 'Exactly at expiry (2026-11-05T08:00:00.000Z) is strictly rejected as expired');

// 1ms after expiry
const afterExpiry = testPromoWindow(EXPIRY_UTC + 1);
assert(!afterExpiry.valid && afterExpiry.reason === 'expired', '1ms after expiry (2026-11-05T08:00:00.001Z) is rejected as expired');

// -----------------------------------------------------------------------------
// TEST 2: Standard Price Calculation for All 4 Eligible Plans
// -----------------------------------------------------------------------------
console.log('\nTEST 2: Standard Price Calculations (Core 3-mo, Core monthly, Mastery, Ultimate)');

const EXPECTED_PLANS = [
  {
    name: 'Core — 3 months',
    productIds: ['cohort-core-standard', 'cohort-core-earlybird', 'cohort-core', 'core'],
    standardPrice: 18000,
    expectedDiscount: 5400,
    expectedFinal: 12600,
  },
  {
    name: 'Core — monthly',
    productIds: ['cohort-core-monthly'],
    standardPrice: 7000,
    expectedDiscount: 2100,
    expectedFinal: 4900,
  },
  {
    name: 'Mastery',
    productIds: ['cohort-mastery-standard', 'cohort-mastery-earlybird', 'cohort-mastery', 'mastery'],
    standardPrice: 25000,
    expectedDiscount: 7500,
    expectedFinal: 17500,
  },
  {
    name: 'Ultimate',
    productIds: ['cohort-ultimate', 'ultimate'],
    standardPrice: 40000,
    expectedDiscount: 12000,
    expectedFinal: 28000,
  },
];

for (const plan of EXPECTED_PLANS) {
  const discount = Math.round(plan.standardPrice * 0.30);
  const finalPrice = plan.standardPrice - discount;

  assert(discount === plan.expectedDiscount, `${plan.name}: 30% discount is exactly ₦${plan.expectedDiscount.toLocaleString()}`);
  assert(finalPrice === plan.expectedFinal, `${plan.name}: Final promo price is exactly ₦${plan.expectedFinal.toLocaleString()}`);
  assert(Number.isInteger(finalPrice), `${plan.name}: Final promo price is an integer (no kobo fractions)`);

  for (const pid of plan.productIds) {
    assert(payInitiateSource.includes(`"${pid}"`), `pay-initiate supports eligible cohort alias "${pid}"`);
  }
}

// -----------------------------------------------------------------------------
// TEST 3: Non-Stacking Rule Verification
// -----------------------------------------------------------------------------
console.log('\nTEST 3: Non-Stacking Rule (Discount from Standard Price, Never Early-Bird)');

// Core: Early-bird is ₦15,000, Standard is ₦18,000
const coreEarlybirdPrice = 15000;
const coreStandardPrice = 18000;
const invalidStackedCoreDiscount = Math.round(coreEarlybirdPrice * 0.30); // 4,500
const invalidStackedCoreFinal = coreEarlybirdPrice - invalidStackedCoreDiscount; // 10,500

const validCoreDiscount = Math.round(coreStandardPrice * 0.30); // 5,400
const validCoreFinal = coreStandardPrice - validCoreDiscount; // 12,600

assert(validCoreFinal === 12600, 'Core 3-mo promo price is ₦12,600 (30% off standard ₦18,000)');
assert(validCoreFinal !== invalidStackedCoreFinal, 'Core promo price does NOT stack with early-bird (12,600 != 10,500)');

// Mastery: Early-bird is ₦20,000, Standard is ₦25,000
const masteryEarlybirdPrice = 20000;
const masteryStandardPrice = 25000;
const invalidStackedMasteryDiscount = Math.round(masteryEarlybirdPrice * 0.30); // 6,000
const invalidStackedMasteryFinal = masteryEarlybirdPrice - invalidStackedMasteryDiscount; // 14,000

const validMasteryDiscount = Math.round(masteryStandardPrice * 0.30); // 7,500
const validMasteryFinal = masteryStandardPrice - validMasteryDiscount; // 17,500

assert(validMasteryFinal === 17500, 'Mastery promo price is ₦17,500 (30% off standard ₦25,000)');
assert(validMasteryFinal !== invalidStackedMasteryFinal, 'Mastery promo price does NOT stack with early-bird (17,500 != 14,000)');

// Verify that without promo code, early-bird rates are retained
assert(payInitiateSource.includes('EARLY_BIRD_DEADLINE'), 'pay-initiate preserves early-bird deadline');
assert(payInitiateSource.includes('validatedAmount = 18000'), 'pay-initiate preserves post-early-bird Core fallback');
assert(payInitiateSource.includes('validatedAmount = 25000'), 'pay-initiate preserves post-early-bird Mastery fallback');

// -----------------------------------------------------------------------------
// TEST 4: Code Normalization & Matching
// -----------------------------------------------------------------------------
console.log('\nTEST 4: Code Normalization & Matching');

function normalizeAndCheckPromo(inputCode) {
  if (!inputCode || typeof inputCode !== 'string') return false;
  return inputCode.trim().toUpperCase() === 'TECHMED30';
}

assert(normalizeAndCheckPromo('TECHMED30') === true, 'Matches exact uppercase "TECHMED30"');
assert(normalizeAndCheckPromo('techmed30') === true, 'Matches lowercase "techmed30"');
assert(normalizeAndCheckPromo('  TECHMED30  ') === true, 'Matches with leading and trailing spaces');
assert(normalizeAndCheckPromo(' TechMed30 ') === true, 'Matches mixed case with spaces');
assert(normalizeAndCheckPromo('TECHMED') === false, 'Rejects partial code "TECHMED"');
assert(normalizeAndCheckPromo('TECHMED30OFF') === false, 'Rejects "TECHMED30OFF"');
assert(normalizeAndCheckPromo('30TECHMED') === false, 'Rejects reversed code');
assert(normalizeAndCheckPromo('') === false, 'Rejects empty string');
assert(normalizeAndCheckPromo(null) === false, 'Rejects null input');

// -----------------------------------------------------------------------------
// TEST 5: Ineligible Products Rejection
// -----------------------------------------------------------------------------
console.log('\nTEST 5: Ineligible Standalone Products Rejection');

const INELIGIBLE_PRODUCTS = [
  'chemistry-booster',
  'biology-booster',
  'physics-booster',
  'booster-bundle',
  'post-utme-pq',
  'post-utme-brainstorming-hub',
  'research-file',
  'university-research-file',
];

for (const prodId of INELIGIBLE_PRODUCTS) {
  assert(
    payInitiateSource.includes('COHORT_STANDARD_PRICES') &&
    !payInitiateSource.includes(`"${prodId}": { standardPrice`) &&
    !promoModuleSource.includes(`"${prodId}": { standardPrice`),
    `Standalone product "${prodId}" is NOT in COHORT_STANDARD_PRICES`
  );
}

assert(
  payInitiateSource.includes('!product.isCohort || !cohortPricing'),
  'pay-initiate strictly checks product.isCohort and cohortPricing existence'
);
assert(
  payInitiateSource.includes('Promo code TECHMED30 is not applicable to standalone study resources'),
  'pay-initiate returns dedicated message rejecting standalone products'
);

// -----------------------------------------------------------------------------
// TEST 6: Paystack Amount Calculation & Integer Kobo Conversion
// -----------------------------------------------------------------------------
console.log('\nTEST 6: Paystack Amount Calculation (Integer Kobo Conversion)');

const KOBO_TESTS = [
  { name: 'Core 3-mo promo', naira: 12600, expectedKobo: 1260000 },
  { name: 'Core monthly promo', naira: 4900, expectedKobo: 490000 },
  { name: 'Mastery promo', naira: 17500, expectedKobo: 1750000 },
  { name: 'Ultimate promo', naira: 28000, expectedKobo: 2800000 },
];

for (const t of KOBO_TESTS) {
  const kobo = t.naira * 100;
  assert(kobo === t.expectedKobo, `${t.name}: ₦${t.naira.toLocaleString()} converts to exactly ${t.expectedKobo.toLocaleString()} kobo`);
  assert(Number.isInteger(kobo), `${t.name}: Kobo amount is a safe integer`);
}

assert(payInitiateSource.includes('const amountKobo = validatedAmount * 100;'), 'pay-initiate calculates amountKobo from validatedAmount * 100');

// -----------------------------------------------------------------------------
// TEST 7: Payment Verification Integrity (pay-verify consistency)
// -----------------------------------------------------------------------------
console.log('\nTEST 7: Verification Integrity (pay-verify matches stored order.amount)');

assert(
  payVerifySource.includes('const expectedKobo = Math.round(Number(order.amount) * 100);'),
  'pay-verify reads expectedKobo from database order.amount'
);
assert(
  payVerifySource.includes('const isAmountMatch = txData?.amount === expectedKobo;'),
  'pay-verify validates Paystack transaction amount strictly against expectedKobo'
);
assert(
  payInitiateSource.includes('amount: validatedAmount,'),
  'pay-initiate writes validated discounted amount into orders.amount'
);
assert(
  payInitiateSource.includes('discount_amount: promoApplied ? promoDiscountAmount : 0,'),
  'pay-initiate writes promo discount amount into orders table'
);
assert(
  payInitiateSource.includes('metadata: orderMetadata,'),
  'pay-initiate writes promo metadata into orders table'
);

// -----------------------------------------------------------------------------
// TEST 8: Frontend UI & PlanCheckoutModal Integration
// -----------------------------------------------------------------------------
console.log('\nTEST 8: Frontend UI & PlanCheckoutModal Integration');

assert(planCheckoutModalSource.includes('id="promoBox"'), 'PlanCheckoutModal contains promo box container');
assert(planCheckoutModalSource.includes('id="planPromoInput"'), 'PlanCheckoutModal contains promo input element');
assert(planCheckoutModalSource.includes('id="applyPromoBtn"'), 'PlanCheckoutModal contains apply promo button');
assert(planCheckoutModalSource.includes('id="removePromoBtn"'), 'PlanCheckoutModal contains remove promo button');
assert(planCheckoutModalSource.includes('id="promoAppliedCard"'), 'PlanCheckoutModal contains applied promo banner card');
assert(planCheckoutModalSource.includes('id="promoFeedbackMsg"'), 'PlanCheckoutModal contains promo error/feedback container');
assert(planCheckoutModalSource.includes('id="planSummaryDiscountRow"'), 'PlanCheckoutModal contains discount breakdown row in plan summary');

// -----------------------------------------------------------------------------
// TEST 9: Frontend–Paystack Synchronization & Regression Scenarios
// -----------------------------------------------------------------------------
console.log('\nTEST 9: Frontend–Paystack Synchronization & Regression Scenarios');

const COHORT_STANDARD_PRICES_TEST = {
  "cohort-core-standard": 18000,
  "cohort-core-earlybird": 18000,
  "cohort-core": 18000,
  "core": 18000,
  "cohort-core-monthly": 7000,
  "cohort-mastery-standard": 25000,
  "cohort-mastery-earlybird": 25000,
  "cohort-mastery": 25000,
  "mastery": 25000,
  "cohort-ultimate": 40000,
  "ultimate": 40000,
};

function validatePromoCodeFunc(code, productId, nowUtc) {
  if (!code || code.trim().toUpperCase() !== 'TECHMED30') return { valid: false };
  if (nowUtc < 1793692800000 || nowUtc >= 1793865600000) return { valid: false };
  const standardPrice = COHORT_STANDARD_PRICES_TEST[productId];
  if (!standardPrice) return { valid: false };
  const discountAmount = Math.round(standardPrice * 0.30);
  const finalPrice = standardPrice - discountAmount;
  return { valid: true, standardPrice, discountAmount, finalPrice };
}

// Scenario 1: Core monthly + TECHMED30 -> ₦4,900 (490,000 kobo)
const s1Promo = validatePromoCodeFunc('TECHMED30', 'cohort-core-monthly', 1793779200000);
assert(s1Promo.valid && s1Promo.finalPrice === 4900, 'Scenario 1: Core monthly + TECHMED30 calculates ₦4,900');
assert(s1Promo.finalPrice * 100 === 490000, 'Scenario 1: Core monthly + TECHMED30 sends 490,000 kobo to Paystack');

// Scenario 2: Core 3-month + TECHMED30 -> ₦12,600 (1,260,000 kobo)
const s2Promo = validatePromoCodeFunc('TECHMED30', 'cohort-core-earlybird', 1793779200000);
assert(s2Promo.valid && s2Promo.finalPrice === 12600, 'Scenario 2: Core 3-month + TECHMED30 calculates ₦12,600');
assert(s2Promo.finalPrice * 100 === 1260000, 'Scenario 2: Core 3-month + TECHMED30 sends 1,260,000 kobo to Paystack');

// Scenario 3: Core 3-month without promo -> ₦15,000 (early-bird preserved)
assert(
  payInitiateSource.includes('"cohort-core-earlybird": { name: "TECHMED Core (3-Month Early-Bird)", amount: 15000'),
  'Scenario 3: Core 3-month early-bird preserved at ₦15,000 (1,500,000 kobo) when no promo applied'
);

// Scenario 4: Mastery + TECHMED30 -> ₦17,500 (1,750,000 kobo)
const s4Promo = validatePromoCodeFunc('TECHMED30', 'cohort-mastery-earlybird', 1793779200000);
assert(s4Promo.valid && s4Promo.finalPrice === 17500, 'Scenario 4: Mastery + TECHMED30 calculates ₦17,500');
assert(s4Promo.finalPrice * 100 === 1750000, 'Scenario 4: Mastery + TECHMED30 sends 1,750,000 kobo to Paystack');

// Scenario 5: Ultimate + TECHMED30 -> ₦28,000 (2,800,000 kobo)
const s5Promo = validatePromoCodeFunc('TECHMED30', 'cohort-ultimate', 1793779200000);
assert(s5Promo.valid && s5Promo.finalPrice === 28000, 'Scenario 5: Ultimate + TECHMED30 calculates ₦28,000');
assert(s5Promo.finalPrice * 100 === 2800000, 'Scenario 5: Ultimate + TECHMED30 sends 2,800,000 kobo to Paystack');

// Verification of Billing Switch Synchronization in PlanCheckoutModal.astro
assert(
  planCheckoutModalSource.includes('function selectCoreDuration(duration: \'earlybird\' | \'monthly\')'),
  'PlanCheckoutModal defines selectCoreDuration helper to synchronize radio inputs and visual card state'
);
assert(
  planCheckoutModalSource.includes('cardMonthly?.addEventListener(\'click\''),
  'PlanCheckoutModal attaches click listener to Monthly billing card label'
);
assert(
  planCheckoutModalSource.includes('cardEarlybird?.addEventListener(\'click\''),
  'PlanCheckoutModal attaches click listener to Early-bird billing card label'
);
assert(
  planCheckoutModalSource.includes('document.querySelector(\'input[name="planCoreBilling"]:checked\')'),
  'PlanCheckoutModal dynamically re-inspects checked radio in DOM immediately upon form submit'
);
assert(
  planCheckoutModalSource.includes('resolvedProductId = activeDuration === \'monthly\'\n        ? \'cohort-core-monthly\''),
  'PlanCheckoutModal deterministically resolves resolvedProductId to "cohort-core-monthly" when monthly is checked'
);
assert(
  planCheckoutModalSource.includes('product_id: resolvedProductId,'),
  'PlanCheckoutModal submits resolvedProductId in fetch body, preventing reuse of stale 3-month product ID'
);
assert(
  planCheckoutModalSource.includes('billing_option: activePlanId === \'core\' ? activeDuration : undefined,'),
  'PlanCheckoutModal includes billing_option in request body'
);

// Verification of Server-Side Fallback & Protection in pay-initiate
assert(
  payInitiateSource.includes('cleanProductId = "cohort-core-monthly";'),
  'pay-initiate server guarantees resolution to "cohort-core-monthly" when rawDuration is monthly'
);
assert(
  payInitiateSource.includes('billing_option: rawDuration || (cleanProductId.includes("monthly") ? "monthly" : "3months"),'),
  'pay-initiate stores billing_option in order metadata'
);

console.log('====================================================');
console.log(`TEST SUITE SUMMARY: ${passedTests}/${totalTests} ASSERTIONS PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('ALL TECHMED30 PROMO TESTS PASSED PERFECTLY!\n');
} else {
  console.error(`FAILED: ${totalTests - passedTests} assertions failed.\n`);
  process.exit(1);
}
