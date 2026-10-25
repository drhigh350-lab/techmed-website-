// pay-initiate
// Validates the product and price against a server-side price list
// (never trusts the price sent by the browser), creates a pending order row,
// then asks Paystack to start a transaction and returns the checkout URL.

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
  };

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, message: "Invalid JSON body" }, 400);
  }

  const { product_id, email, name, phone, university } = body;

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

  // Validate early-bird server-side
  let validatedAmount = product.amount;
  if (cleanProductId.includes("earlybird") || cleanProductId === "cohort-core" || cleanProductId === "cohort-mastery") {
    if (Date.now() > EARLY_BIRD_DEADLINE) {
      if (cleanProductId.includes("core")) validatedAmount = 18000;
      if (cleanProductId.includes("mastery")) validatedAmount = 25000;
    }
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!paystackSecret) {
    console.error("PAYSTACK_SECRET_KEY is not set in Edge Function secrets");
    return jsonResponse({
      success: false,
      message: "Online payment gateway is undergoing maintenance. Please complete registration via WhatsApp or Bank Transfer.",
    }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Paystack requires amount in kobo (naira x 100)
  const amountKobo = validatedAmount * 100;
  const reference = `techmed_${cleanProductId.replace(/-/g, '_')}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  const siteUrl = Deno.env.get("SITE_URL") ?? "https://techmedng.com";

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
        callback_url: `${siteUrl}/download.html?reference=${reference}`,
        metadata: {
          product_id: cleanProductId,
          product_name: product.name,
          customer_name: name ?? "TECHMED Student",
          phone: phone ?? null,
          university: university ?? null,
          is_cohort: !!product.isCohort,
        },
      }),
    });

    const paystackJson = await paystackRes.json();

    if (!paystackRes.ok || !paystackJson.status) {
      console.error("Paystack initialize failed:", paystackJson);
      return jsonResponse({ success: false, message: paystackJson.message ?? "Could not initiate payment" }, 502);
    }

    paystackData = paystackJson.data;
  } catch (err) {
    console.error("Paystack request error:", err);
    return jsonResponse({ success: false, message: "Could not reach Paystack. Please try again or use direct bank transfer." }, 502);
  }

  // Record pending order
  const { error: dbError } = await supabase.from("orders").insert({
    reference,
    product_id: cleanProductId,
    product_name: product.name,
    amount: validatedAmount,
    email: email.trim().toLowerCase(),
    customer_name: name ?? "TECHMED Student",
    university: university ?? null,
    status: "pending",
  });

  if (dbError) {
    console.error("Failed to save pending order:", dbError, "reference:", reference);
  }

  return jsonResponse({
    success: true,
    data: {
      authorization_url: paystackData.authorization_url,
      reference,
      product_name: product.name,
      amount: validatedAmount,
    },
  });
});
