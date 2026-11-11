// supabase/functions/pay-initiate/index.ts
// Validates product and price against the server-side catalogue,
// creates and confirms a pending order record FIRST in the database,
// initializes the transaction with Paystack, and returns the checkout URL.
// If order creation fails, checkout initialization is never reported as successful.
//
// Nov 2026 update (built on the deployed v36, not the older repo copy):
// - Standalone resources and bundles take their price from public.products
//   (the authoritative catalogue); PRODUCTS below is only a fallback.
// - Think Smart Series e-books (organic-chemistry-mastery, mole-concept-cure).
// - TECHMED plan discount: 20% off standalone resources for students with an
//   active Core, Mastery or Ultimate plan ("Everything in Core" includes it).
// - Students who already own a resource (purchase, plan, bundle or admin
//   grant) are told so instead of being charged. Ownership is checked per
//   resource with resource_access_for(), so Mastery/Ultimate students can
//   still buy items their plan does NOT include.

import { createClient } from "jsr:@supabase/supabase-js@2";

type CatalogueItem = { name: string; amount: number; requiresUniversity: boolean; isCohort?: boolean };

// Fallback names/prices. Cohort plans are priced here (early-bird logic below);
// resources/bundles prefer public.products.
const PRODUCTS: Record<string, CatalogueItem> = {
  // Think Smart Series e-books (₦5,000 standard, ₦3,000 early bird; no end date set)
  "organic-chemistry-mastery": { name: "Organic Chemistry Mastery", amount: 3000, requiresUniversity: false },
  "mole-concept-cure": { name: "The Mole Concept Cure", amount: 3000, requiresUniversity: false },

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

// Frontend slugs that differ from catalogue ids.
const PRODUCT_ALIASES: Record<string, string> = {
  "chemistry-booster-system": "chemistry-booster",
  "biology-booster-system": "biology-booster",
  "physics-booster-system": "physics-booster",
  "all-science-boosters-bundle": "booster-bundle",
};

const PLAN_DISCOUNT_PERCENT = 0.20;

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

// Early-Bird Deadline (cohort plans): 15 November 2026 23:59:59 UTC
const EARLY_BIRD_DEADLINE = new Date("2026-11-15T23:59:59Z").getTime();

// TECHMED30 Promotional Campaign
// 30% discount strictly on original standard prices of UTME 2027 cohort plans (Core, Mastery, Ultimate).
// Does NOT stack with early-bird discounts.
const PROMO_CODE = "TECHMED30";
const PROMO_DISCOUNT_PERCENT = 0.30;
const PROMO_START_UTC = new Date("2026-11-03T08:00:00Z").getTime();
const PROMO_EXPIRY_UTC = new Date("2026-11-05T08:00:00Z").getTime();

const COHORT_STANDARD_PRICES: Record<string, { standardPrice: number; name: string }> = {
  "cohort-core-standard": { standardPrice: 18000, name: "TECHMED Core (3-Month Upfront)" },
  "cohort-core-earlybird": { standardPrice: 18000, name: "TECHMED Core (3-Month Upfront)" },
  "cohort-core": { standardPrice: 18000, name: "TECHMED Core (3-Month Upfront)" },
  "core": { standardPrice: 18000, name: "TECHMED Core (3-Month Upfront)" },
  "cohort-core-monthly": { standardPrice: 7000, name: "TECHMED Core (1-Month Subscription)" },
  "cohort-mastery-standard": { standardPrice: 25000, name: "TECHMED Mastery (3-Month Upfront)" },
  "cohort-mastery-earlybird": { standardPrice: 25000, name: "TECHMED Mastery (3-Month Upfront)" },
  "cohort-mastery": { standardPrice: 25000, name: "TECHMED Mastery (3-Month Upfront)" },
  "mastery": { standardPrice: 25000, name: "TECHMED Mastery (3-Month Upfront)" },
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
    billing_option?: string | null;
    duration?: string | null;
    billing_cycle?: string | null;
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

  const cleanEmail = email.trim().toLowerCase();
  let cleanProductId = product_id.trim();
  cleanProductId = PRODUCT_ALIASES[cleanProductId] ?? cleanProductId;
  const rawDuration = (body.billing_option || body.duration || body.billing_cycle || "").trim().toLowerCase();

  if (
    (cleanProductId === "core" || cleanProductId === "cohort-core" || cleanProductId === "cohort-core-standard" || cleanProductId === "cohort-core-earlybird") &&
    (rawDuration === "monthly" || rawDuration === "1month" || rawDuration === "month")
  ) {
    cleanProductId = "cohort-core-monthly";
  }

  if (
    cleanProductId === "cohort-core-monthly" &&
    (rawDuration === "earlybird" || rawDuration === "3months" || rawDuration === "upfront")
  ) {
    cleanProductId = Date.now() <= EARLY_BIRD_DEADLINE ? "cohort-core-earlybird" : "cohort-core-standard";
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

  // Resolve product: cohort plans from PRODUCTS; resources/bundles from public.products.
  let product: CatalogueItem | undefined = PRODUCTS[cleanProductId];
  if (!product?.isCohort) {
    const { data: row, error: rowErr } = await supabase
      .from("products")
      .select("id, title, price_ngn, product_type, requires_university, is_active")
      .eq("id", cleanProductId)
      .maybeSingle();
    if (rowErr) console.warn("Catalogue lookup failed; using fallback list:", rowErr.message);
    if (row && row.is_active && (row.product_type === "resource" || row.product_type === "bundle") && Number(row.price_ngn) > 0) {
      product = {
        name: row.title,
        amount: Number(row.price_ngn),
        requiresUniversity: !!row.requires_university,
      };
    } else if (row && !row.is_active) {
      return jsonResponse({ success: false, message: "This resource is not currently available for purchase." }, 400);
    }
  }

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
  let planDiscountApplied = false;
  let planDiscountAmount = 0;

  if (promo_code !== undefined && promo_code !== null && typeof promo_code === "string" && promo_code.trim().length > 0) {
    const cleanPromo = promo_code.trim().toUpperCase();

    if (cleanPromo !== PROMO_CODE) {
      return jsonResponse({ success: false, message: "Invalid promo code. Please enter a valid promotional code." }, 400);
    }

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

    const cohortPricing = COHORT_STANDARD_PRICES[cleanProductId];
    if (!product.isCohort || !cohortPricing) {
      return jsonResponse({
        success: false,
        message: "Promo code TECHMED30 is not applicable to standalone study resources. It is exclusively valid for UTME 2027 Cohort preparation plans (Core, Mastery, and Ultimate).",
      }, 400);
    }

    promoStandardPrice = cohortPricing.standardPrice;
    promoDiscountAmount = Math.round(promoStandardPrice * PROMO_DISCOUNT_PERCENT);
    validatedAmount = promoStandardPrice - promoDiscountAmount;
    promoApplied = true;
  } else if (product.isCohort) {
    // Preserve existing standard and early-bird cohort pricing
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
  } else {
    // ---------------------------------------------------------------------
    // STANDALONE RESOURCE / BUNDLE: ownership check + TECHMED plan discount.
    // The order email is the beneficiary, so eligibility follows that email.
    // ---------------------------------------------------------------------
    try {
      const { data: owns, error: ownsErr } = await supabase.rpc("resource_access_for", {
        p_user_id: null,
        p_email: cleanEmail,
        p_resource_id: cleanProductId,
      });
      if (ownsErr) {
        console.warn("Ownership check unavailable:", ownsErr.message);
      } else if (owns === true) {
        return jsonResponse({
          success: false,
          already_owned: true,
          message: "You already have access to this resource. Open it from your TECHMED library.",
        }, 400);
      }

      const nowIso = new Date().toISOString();
      const { data: plans, error: plansErr } = await supabase
        .from("entitlements")
        .select("resource_id, expires_at")
        .eq("customer_email", cleanEmail)
        .in("resource_id", ["cohort-core", "cohort-mastery", "cohort-ultimate"])
        .eq("is_active", true)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
      if (plansErr) console.warn("Plan lookup failed:", plansErr.message);

      if ((plans ?? []).length > 0) {
        planDiscountApplied = true;
        planDiscountAmount = Math.round(product.amount * PLAN_DISCOUNT_PERCENT);
        validatedAmount = product.amount - planDiscountAmount;
      }
    } catch (err) {
      console.warn("Standalone eligibility checks failed (charging standard price):", err);
    }
  }

  const amountKobo = validatedAmount * 100;
  const reference = `techmed_${cleanProductId.replace(/-/g, "_")}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  // STEP 1: CREATE AND CONFIRM PENDING ORDER IN DATABASE FIRST
  const { error: dbError } = await supabase.from("orders").insert({
    reference,
    product_id: cleanProductId,
    product_name: product.name,
    amount: validatedAmount,
    email: cleanEmail,
    customer_name: name ?? "TECHMED Student",
    university: university ?? null,
    status: "pending",
  });

  if (dbError) {
    console.error("Failed to create pending order record:", dbError, "reference:", reference);
    return jsonResponse({
      success: false,
      message: "Could not create pending order record. Please try again or contact admissions on WhatsApp.",
    }, 500);
  }

  // STEP 2: INITIALIZE TRANSACTION WITH PAYSTACK
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://techmedng.com";
  const defaultCallback = product.isCohort
    ? `${siteUrl}/payment/callback?reference=${reference}`
    : `${siteUrl}/download.html?reference=${reference}`;

  const resolvedCallback = callback_url
    ? (callback_url.includes("?") ? `${callback_url}&reference=${reference}` : `${callback_url}?reference=${reference}`)
    : defaultCallback;

  const totalDiscount = promoApplied ? promoDiscountAmount : planDiscountAmount;
  const originalPrice = promoApplied ? promoStandardPrice : product.amount;

  let paystackData: { authorization_url?: string; access_code?: string; reference?: string };

  try {
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: cleanEmail,
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
          is_core_discount: planDiscountApplied,
          discount_amount: totalDiscount,
          original_price: originalPrice,
          promo_description: promoApplied
            ? "TECHMED30 30% Promotional Discount"
            : planDiscountApplied ? "TECHMED plan student 20% e-book discount" : null,
        },
      }),
    });

    const paystackJson = await paystackRes.json();

    if (!paystackRes.ok || !paystackJson.status || !paystackJson.data?.authorization_url) {
      console.error("Paystack initialize rejected:", paystackJson, "reference:", reference);
      await supabase.from("orders").update({
        status: "failed",
        rejection_reason: paystackJson.message ?? "Paystack initialization failed",
        paystack_response: paystackJson,
        updated_at: new Date().toISOString(),
      }).eq("reference", reference);

      return jsonResponse({ success: false, message: paystackJson.message ?? "Could not initiate payment session." }, 502);
    }

    paystackData = paystackJson.data;
  } catch (err) {
    console.error("Paystack network/request exception:", err, "reference:", reference);
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

  // STEP 3: RETURN CONFIRMED AUTHORIZATION URL
  return jsonResponse({
    success: true,
    data: {
      authorization_url: paystackData.authorization_url,
      reference,
      product_name: product.name,
      amount: validatedAmount,
      promo_code: promoApplied ? PROMO_CODE : null,
      is_core_discount: planDiscountApplied,
      discount_amount: totalDiscount,
      original_price: totalDiscount > 0 ? originalPrice : null,
    },
  });
});
