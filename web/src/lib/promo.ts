// web/src/lib/promo.ts
// TECHMED Promotional Campaign Definition: TECHMED30
// Authoritative promotional discount constants and validation rules.

export const PROMO_CODE = "TECHMED30";
export const PROMO_DISCOUNT_PERCENT = 0.30;

// Authoritative UTC Timestamps:
// Start: Tuesday, 3 November 2026, 9:00 a.m. WAT (08:00:00 UTC)
// Expiry: Thursday, 5 November 2026, 9:00 a.m. WAT (08:00:00 UTC)
// Duration: Exactly 48 hours.
export const PROMO_START_UTC = new Date("2026-11-03T08:00:00Z").getTime();
export const PROMO_EXPIRY_UTC = new Date("2026-11-05T08:00:00Z").getTime();

// Standard prices for eligible cohort plans.
// 30% discount is ALWAYS calculated from the original standard price, NEVER early-bird.
export const COHORT_STANDARD_PRICES: Record<string, { standardPrice: number; name: string }> = {
  // Core — 3 months: Standard ₦18,000 | 30% discount ₦5,400 | Final promo ₦12,600
  "cohort-core-standard": { standardPrice: 18000, name: "TECHMED Core (3-Month Upfront)" },
  "cohort-core-earlybird": { standardPrice: 18000, name: "TECHMED Core (3-Month Upfront)" },
  "cohort-core": { standardPrice: 18000, name: "TECHMED Core (3-Month Upfront)" },
  "core": { standardPrice: 18000, name: "TECHMED Core (3-Month Upfront)" },

  // Core — monthly: Standard ₦7,000 | 30% discount ₦2,100 | Final promo ₦4,900
  "cohort-core-monthly": { standardPrice: 7000, name: "TECHMED Core (1-Month Subscription)" },

  // Mastery: Standard ₦25,000 | 30% discount ₦7,500 | Final promo ₦17,500
  "cohort-mastery-standard": { standardPrice: 25000, name: "TECHMED Mastery (3-Month Upfront)" },
  "cohort-mastery-earlybird": { standardPrice: 25000, name: "TECHMED Mastery (3-Month Upfront)" },
  "cohort-mastery": { standardPrice: 25000, name: "TECHMED Mastery (3-Month Upfront)" },
  "mastery": { standardPrice: 25000, name: "TECHMED Mastery (3-Month Upfront)" },

  // Ultimate: Standard ₦40,000 | 30% discount ₦12,000 | Final promo ₦28,000
  "cohort-ultimate": { standardPrice: 40000, name: "TECHMED Ultimate (Full UTME 2027 Access)" },
  "ultimate": { standardPrice: 40000, name: "TECHMED Ultimate (Full UTME 2027 Access)" },
};

export interface PromoValidationResult {
  valid: boolean;
  status: "active" | "not_started" | "expired" | "invalid_code" | "ineligible_product";
  error?: string;
  promoCode?: string;
  standardPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  discountNote?: string;
}

export function isPromoWindowActive(nowUtc: number = Date.now()): boolean {
  return nowUtc >= PROMO_START_UTC && nowUtc < PROMO_EXPIRY_UTC;
}

export function validatePromoCode(
  inputCode: string | null | undefined,
  productId: string,
  nowUtc: number = Date.now()
): PromoValidationResult {
  if (!inputCode) {
    return { valid: false, status: "invalid_code", error: "Please enter a promotional code." };
  }

  const cleanCode = inputCode.trim().toUpperCase();
  if (cleanCode !== PROMO_CODE) {
    return { valid: false, status: "invalid_code", error: "Invalid promo code. Please check and try again." };
  }

  if (nowUtc < PROMO_START_UTC) {
    return {
      valid: false,
      status: "not_started",
      error: "Promotion has not started yet. The TECHMED30 30% discount begins Tuesday, 3 Nov 2026 at 08:00 UTC (9:00 AM WAT).",
    };
  }

  if (nowUtc >= PROMO_EXPIRY_UTC) {
    return {
      valid: false,
      status: "expired",
      error: "Promo code has expired. The TECHMED30 48-hour promotional period ended Thursday, 5 Nov 2026 at 08:00 UTC (9:00 AM WAT).",
    };
  }

  const cleanProduct = (productId || "").trim().toLowerCase();
  const cohortConfig = COHORT_STANDARD_PRICES[cleanProduct];
  if (!cohortConfig) {
    return {
      valid: false,
      status: "ineligible_product",
      error: "Promo code TECHMED30 is not applicable to standalone study resources. It is exclusively valid for UTME 2027 Cohort preparation plans (Core, Mastery, and Ultimate).",
    };
  }

  const standardPrice = cohortConfig.standardPrice;
  const discountAmount = Math.round(standardPrice * PROMO_DISCOUNT_PERCENT);
  const finalPrice = standardPrice - discountAmount;

  const isEarlyBirdEligible =
    (cleanProduct.includes("core") && !cleanProduct.includes("monthly")) ||
    cleanProduct.includes("mastery");

  const discountNote = isEarlyBirdEligible
    ? `30% discount applied to standard price (₦${standardPrice.toLocaleString()}), replacing early-bird rate.`
    : `30% discount applied to standard price (₦${standardPrice.toLocaleString()}): -₦${discountAmount.toLocaleString()}.`;

  return {
    valid: true,
    status: "active",
    promoCode: PROMO_CODE,
    standardPrice,
    discountAmount,
    finalPrice,
    discountNote,
  };
}
