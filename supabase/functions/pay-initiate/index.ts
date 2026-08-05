// pay-initiate
// Called by resources.html's buyBackend(). Validates the product and price
// against a server-side price list (never trusts the price sent by the
// browser), creates a pending order row, then asks Paystack to start a
// transaction and returns the checkout URL for the browser to redirect to.

import { createClient } from "jsr:@supabase/supabase-js@2";

// Source of truth for product names and prices in kobo-equivalent naira.
// Keep this in sync with the onclick="openBuyModal(...)" values in
// resources.html. The frontend price is only ever used for display —
// this list is what actually gets charged.
const PRODUCTS: Record<string, { name: string; amount: number; requiresUniversity: boolean }> = {
  "post-utme-pq": { name: "Post Brainstorming Hub — All Universities", amount: 3000, requiresUniversity: true },
  "research-file": { name: "Detailed University Research File", amount: 1000, requiresUniversity: true },
  "chemistry-booster": { name: "Chemistry Booster System", amount: 5000, requiresUniversity: false },
  "biology-booster": { name: "Biology Booster System", amount: 3000, requiresUniversity: false },
  "physics-booster": { name: "Physics Booster System", amount: 3000, requiresUniversity: false },
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
    university?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, message: "Invalid JSON body" }, 400);
  }

  const { product_id, email, name, university } = body;

  if (!product_id || !email || !email.includes("@")) {
    return jsonResponse({ success: false, message: "A valid product_id and email are required" }, 400);
  }

  const product = PRODUCTS[product_id];
  if (!product) {
    return jsonResponse({ success: false, message: "Unknown product" }, 400);
  }

  if (product.requiresUniversity && !university) {
    return jsonResponse({ success: false, message: "Please select your university" }, 400);
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!paystackSecret) {
    console.error("PAYSTACK_SECRET_KEY is not set in Edge Function secrets");
    return jsonResponse({ success: false, message: "Payment is not configured yet. Please use WhatsApp instead." }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Paystack requires amount in kobo (naira x 100)
  const amountKobo = product.amount * 100;
  const reference = `techmed_${product_id}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

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
        email,
        amount: amountKobo,
        reference,
        callback_url: `${siteUrl}/download.html?reference=${reference}`,
        metadata: {
          product_id,
          product_name: product.name,
          customer_name: name ?? "TECHMED Customer",
          university: university ?? null,
        },
      }),
    });

    const paystackJson = await paystackRes.json();

    if (!paystackRes.ok || !paystackJson.status) {
      console.error("Paystack initialize failed:", paystackJson);
      return jsonResponse({ success: false, message: paystackJson.message ?? "Could not start payment" }, 502);
    }

    paystackData = paystackJson.data;
  } catch (err) {
    console.error("Paystack request error:", err);
    return jsonResponse({ success: false, message: "Could not reach Paystack. Please try again or use WhatsApp." }, 502);
  }

  const { error: dbError } = await supabase.from("orders").insert({
    reference,
    product_id,
    product_name: product.name,
    amount: product.amount,
    email,
    customer_name: name ?? "TECHMED Customer",
    university: university ?? null,
    status: "pending",
  });

  if (dbError) {
    // The Paystack transaction was already created at this point. Log the
    // failure but still let the customer pay — the webhook will simply have
    // no matching order to update, which is why this is logged loudly for
    // manual reconciliation rather than silently swallowed.
    console.error("Failed to save pending order:", dbError, "reference:", reference);
  }

  return jsonResponse({
    success: true,
    data: {
      authorization_url: paystackData.authorization_url,
      reference,
    },
  });
});
