// supabase/functions/pay-initiate/index.ts
// Validates product and price against server-side authoritative list,
// creates and confirms a pending order record FIRST in the database,
// initializes transaction with Paystack, and returns the checkout URL.
// If order creation fails, checkout initialization is never reported as successful.

import { createClient } from "jsr:@supabase/supabase-js@2";

// Source of truth for product names and prices in naira.
// Authoritative prices for science boosters, university files, and UTME 2027 cohort plans.
const PRODUCTS: Record<string, { name: string; amount: number; requiresUniversity: boolean; isCohort?: boolean }> = {
  // Standalone Science Boosters
  "chemistry-booster": { name: "Chemistry Booster System", amount: 5000, requiresUniversity: false },
  "biology-booster": { name: "Biology Booster System", amount: 3000, requiresUniversity: false },
  "physics-booster": { name: "Physics Booster System", amount: 3000, requiresUniversity: false },
  "booster-bundle": { name: "All Science Boosters Bundle", amount: 9000, requiresUniversity: false },

  // Post-UTME Resources & University Research Files (supporting aliases)
  "post-utme-pq": { name: "Post Brainstorming Hub — All Universities", amount: 3000, requiresUniversity: true },
  "post-utme-brainstorming-hub": { name: "Post Brainstorming Hub — All Universities", amount: 3000, requiresUniversity: true },
  "research-file": { name: "Detailed University Research File", amount: 1000, requiresUniversity: true },
  "university-research-file": { name: "Detailed University Research File", amount: 1000, requiresUniversity: true },

  // UTME 2027 Cohort Plans
  "cohort-core-monthly": { name: "TECHMED Core (1-Month Subscription)", amount: 7000, requiresUniversity: false, isCohort: true },
  "cohort-core-earlybird": { name: "TECHMED Core (3-Month Early-Bird)", amount: 15000, requiresUniversity: false, isCohort: true },
  "cohort-core-standard": { name: "TECHMED Core (3-Month Standard)", amount: 18000, requiresUniversity: false, isCohort: true },
  "cohort-core": { name: "TECHMED Core (3-Month Early-Bird)", amount: 15000, requiresUniversity: false, isCohort: true },

  "cohort-mastery-earlybird": { name: "TECHMED Mastery (3-Month Early-Bird)", amount: 20000, requiresUniversity: false, isCohort: true },
  "cohort-mastery-standard": { name: "TECHMED Mastery (3-Month Standard)", amount: 25000, requiresUniversity: false, isCohort: true },
  "cohort-mastery": { name: "TECHMED Mastery (3-Month Early-Bird)", amount: 20000, requiresUniversity: false, isCohort: true },

  "cohort-ultimate": { name: "TECHMED Ultimate (Full UTME 2027 Access)", amount: 40000, requiresUniversity: false, isCohort: true },

  // Short aliases for checkout triggers
  "core": { name: "TECHMED Core (3-Month Early-Bird)", amount: 15000, requiresUniversity: false, isCohort: true },
  "mastery": { name: "TECHMED Mastery (3-Month Early-Bird)", amount: 20000, requiresUniversity: false, isCohort: true },
  "ultimate": { name: "TECHMED Ultimate (Full UTME 2027 Access)", amount: 40000, requiresUniversity: false, isCohort: true },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Early-Bird Deadline: 15 November 2026 23:59:59 UTC
const EARLY_BIRD_DEADLINE = new Date("2026-11-15T23:59:59Z").getTime();

// TECHMED30 Promotional Campaign
// 30% discount strictly on original standard prices of UTME 2027 cohort plans (Core, Mastery, Ultimate).
// Does NOT stack with early-bird discounts.
const PROMO_CODE = "TECHMED30";
const PROMO_DISCOUNT_PERCENT = 0.30;
const PROMO_START_UTC = new Date("2026-11-03T08:00:00Z").getTime();
const PROMO_EXPIRY_UTC = new Date("2026-11-05T08:00:00Z").getTime();

// Authoritative standard prices for cohort plans (source of truth for 30% discount calculation)
const COHORT_STANDARD_PRICES: Record<string, { standardPrice: number; name: string }> = {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  let body: {
    product_id?: string;
    email?: string;
    name?: string;
    phone?: string;
    university?: string | null;
    callback_url?: string;
    promo_code?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, message: "Invalid JSON body" }, 400);
  }

  const { product_id, email, name, phone, university, callback_url, promo_code } = body;

  if (!product_id || !email || !email.includes("@")) {
    return jsonResponse({ success: false, message: "A valid product_id and email are required" }, 400);
  }

  const cleanProductId = product_id.trim();
  const product = PRODUCTS[cleanProductId];
  if (!product) {
    return jsonResponse({ success: false, message: `Unknown product: "${cleanProductId}"` }, 400);
  }

  if (product.requiresUniversity && !university) {
    return jsonResponse({ success: false, message: "Please select your target university" }, 400);
  }

  let validatedAmount = product.amount;
  let promoApplied = false;
  let promoDiscountAmount = 0;
  let promoStandardPrice = 0;

  if (promo_code !== undefined && promo_code !== null && typeof promo_code === "string" && promo_code.trim().length > 0) {
    const cleanPromo = promo_code.trim().toUpperCase();

    // 1. Validate promo code match (case-insensitive, trimmed)
    if (cleanPromo !== PROMO_CODE) {
      return jsonResponse({
        success: false,
        message: "Invalid promo code. Please enter a valid promotional code.",
      }, 400);
    }

    // 2. Validate UTC time window (strict 48-hour UTC comparison)
    const nowUtc = Date.now();
    if (nowUtc < PROMO_START_UTC) {
      return jsonResponse({
        success: false,
        message: "Promotion has not started yet. The TECHMED30 promotion begins on Tuesday, 3 November 2026 at 08:00 UTC (9:00 AM WAT).",
      }, 400);
    }

    if (nowUtc >= PROMO_EXPIRY_UTC) {
      return jsonResponse({
        success: false,
        message: "Promo code has expired. The TECHMED30 48-hour promotional period ended on Thursday, 5 November 2026 at 08:00 UTC (9:00 AM WAT).",
      }, 400);
    }

    // 3. Verify product eligibility (cohort plans only; standalone resources are ineligible)
    const cohortPricing = COHORT_STANDARD_PRICES[cleanProductId];
    if (!product.isCohort || !cohortPricing) {
      return jsonResponse({
        success: false,
        message: "Promo code TECHMED30 is not applicable to standalone study resources. It is exclusively valid for UTME 2027 Cohort preparation plans (Core, Mastery, and Ultimate).",
      }, 400);
    }

    // 4. Calculate 30% discount strictly from original standard price (NON-STACKING with early-bird)
    promoStandardPrice = cohortPricing.standardPrice;
    promoDiscountAmount = Math.round(promoStandardPrice * PROMO_DISCOUNT_PERCENT);
    validatedAmount = promoStandardPrice - promoDiscountAmount;
    promoApplied = true;
  } else {
    // When promo is NOT applied, preserve existing standard and early-bird pricing
    if (
      cleanProductId.includes("earlybird") ||
      cleanProductId === "cohort-core" ||
      cleanProductId === "cohort-mastery" ||
      cleanProductId === "core" ||
      cleanProductId === "mastery"
    ) {
      if (Date.now() > EARLY_BIRD_DEADLINE) {
        if (cleanProductId.includes("core") && !cleanProductId.includes("monthly")) validatedAmount = 18000;
        if (cleanProductId.includes("mastery")) validatedAmount = 25000;
      }
    }
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!paystackSecret) {
    console.error("PAYSTACK_SECRET_KEY is not set in Edge Function secrets");
    return jsonResponse({
      success: false,
      message: "Online payment gateway is undergoing maintenance. Please contact our admissions desk on WhatsApp (07044255045) for assistance.",
    }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured");
    return jsonResponse({
      success: false,
      message: "Database service configuration error. Please contact admissions on WhatsApp.",
    }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Paystack requires amount in kobo (naira x 100)
  const amountKobo = validatedAmount * 100;
  const reference = `techmed_${cleanProductId.replace(/-/g, '_')}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  // ---------------------------------------------------------------------------
  // STEP 1: CREATE AND CONFIRM PENDING ORDER IN DATABASE FIRST
  // Order must exist in database BEFORE any usable Paystack checkout is generated.
  // If database insertion fails, do NOT proceed to Paystack, and report failure.
  // ---------------------------------------------------------------------------
  const orderMetadata = {
    promo_code: promoApplied ? PROMO_CODE : null,
    discount_amount: promoApplied ? promoDiscountAmount : 0,
    original_price: promoApplied ? promoStandardPrice : validatedAmount,
    is_cohort: !!product.isCohort,
  };

  const { error: dbError } = await supabase.from("orders").insert({
    reference,
    product_id: cleanProductId,
    product_name: product.name,
    amount: validatedAmount,
    email: email.trim().toLowerCase(),
    customer_name: name ?? "TECHMED Student",
    phone: phone ?? null,
    university: university ?? null,
    status: "pending",
    discount_amount: promoApplied ? promoDiscountAmount : 0,
    metadata: orderMetadata,
  });

  if (dbError) {
    console.error("Failed to create pending order record:", dbError, "reference:", reference);
    return jsonResponse({
      success: false,
      message: "Could not create pending order record. Please try again or contact admissions on WhatsApp.",
    }, 500);
  }

  // ---------------------------------------------------------------------------
  // STEP 2: INITIALIZE TRANSACTION WITH PAYSTACK
  // If initialization fails or throws, safely mark the pending order as "failed"
  // so an unbacked pending record is not left open.
  // ---------------------------------------------------------------------------
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://techmedng.com";
  const defaultCallback = product.isCohort
    ? `${siteUrl}/payment/callback?reference=${reference}`
    : `${siteUrl}/download.html?reference=${reference}`;

  const resolvedCallback = callback_url
    ? (callback_url.includes("?") ? `${callback_url}&reference=${reference}` : `${callback_url}?reference=${reference}`)
    : defaultCallback;

  let paystackData: { authorization_url?: string; access_code?: string; reference?: string };

  try {
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        amount: amountKobo,
        reference,
        callback_url: resolvedCallback,
        metadata: {
          product_id: cleanProductId,
          product_name: product.name,
          customer_name: name ?? "TECHMED Student",
          phone: phone ?? null,
          university: university ?? null,
          is_cohort: !!product.isCohort,
          promo_code: promoApplied ? PROMO_CODE : null,
          discount_amount: promoApplied ? promoDiscountAmount : 0,
          original_price: promoApplied ? promoStandardPrice : validatedAmount,
          promo_description: promoApplied ? "TECHMED30 30% Promotional Discount" : null,
        },
      }),
    });

    const paystackJson = await paystackRes.json();

    if (!paystackRes.ok || !paystackJson.status || !paystackJson.data?.authorization_url) {
      console.error("Paystack initialize rejected:", paystackJson, "reference:", reference);
      // Safely update the pending order so it does not remain pending indefinitely
      await supabase.from("orders").update({
        status: "failed",
        rejection_reason: paystackJson.message ?? "Paystack initialization failed",
        paystack_response: paystackJson,
        updated_at: new Date().toISOString(),
      }).eq("reference", reference);

      return jsonResponse({
        success: false,
        message: paystackJson.message ?? "Could not initiate payment session.",
      }, 502);
    }

    paystackData = paystackJson.data;
  } catch (err) {
    console.error("Paystack network/request exception:", err, "reference:", reference);
    // Safely update the pending order on network error
    await supabase.from("orders").update({
      status: "failed",
      rejection_reason: "Network error reaching Paystack gateway",
      updated_at: new Date().toISOString(),
    }).eq("reference", reference);

    return jsonResponse({
      success: false,
      message: "Could not reach Paystack payment gateway. Please try again or contact support on WhatsApp.",
    }, 502);
  }

  // ---------------------------------------------------------------------------
  // STEP 3: RETURN CONFIRMED AUTHORIZATION URL
  // Only reached when BOTH the order is saved in the database AND Paystack initialized.
  // ---------------------------------------------------------------------------
  return jsonResponse({
    success: true,
    data: {
      authorization_url: paystackData.authorization_url,
      reference,
      product_name: product.name,
      amount: validatedAmount,
      promo_code: promoApplied ? PROMO_CODE : null,
      discount_amount: promoApplied ? promoDiscountAmount : 0,
      original_price: promoApplied ? promoStandardPrice : null,
    },
  });
});
