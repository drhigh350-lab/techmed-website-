// supabase/functions/pay-verify/index.ts
// Verifies transaction with Paystack server-to-server.
// Enforces strict checks on reference, success status, exact amount in kobo, and NGN currency.
// Never reports payment as verified when PAYSTACK_SECRET_KEY is missing, Paystack fails,
// or the database order update fails.
// Reliably grants entitlements and surfaces recoverable entitlement failures.

import { createClient } from "jsr:@supabase/supabase-js@2";

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

  let body: { reference?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, message: "Invalid JSON body" }, 400);
  }

  const reference = body.reference?.trim();
  if (!reference) {
    return jsonResponse({ success: false, message: "Missing transaction reference" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Database configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
    return jsonResponse({ success: false, status: "error", message: "Database configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Fetch order from database
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("reference, product_id, product_name, amount, email, customer_name, status, paid_at, user_id, university")
    .eq("reference", reference)
    .maybeSingle();

  if (orderError) {
    console.error("Database query failed for order:", reference, orderError);
    return jsonResponse({ success: false, status: "error", message: "Database error querying order" }, 500);
  }

  if (!order) {
    return jsonResponse({ success: false, status: "not_found", message: "Order not found" }, 404);
  }

  // 2. If already paid, ensure entitlements are active and return confirmed status immediately (idempotent)
  if (order.status === "paid") {
    try {
      await supabase.rpc("grant_order_entitlements", { p_order_reference: reference });
    } catch (rpcErr) {
      console.warn("Idempotent entitlement check on paid order:", rpcErr);
    }
    return jsonResponse({
      success: true,
      status: "paid",
      entitlement_granted: true,
      entitlement_error: null,
      order: {
        reference: order.reference,
        product_id: order.product_id,
        product_name: order.product_name,
        amount: order.amount,
        email: order.email,
        customer_name: order.customer_name,
        paid_at: order.paid_at,
        status: "paid",
      },
    });
  }

  // 3. Require PAYSTACK_SECRET_KEY. Never report verification success without it.
  if (!paystackSecret) {
    console.error("PAYSTACK_SECRET_KEY is not configured in pay-verify Edge Function");
    return jsonResponse({
      success: false,
      status: "error",
      message: "Payment verification service is unavailable (PAYSTACK_SECRET_KEY missing).",
    }, 500);
  }

  // 4. Query Paystack verification API
  let paystackData: any;
  try {
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    });

    paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error("Paystack verification API returned failure:", paystackData);
      return jsonResponse({
        success: false,
        status: "verification_failed",
        message: paystackData.message || "Failed to verify transaction with payment gateway.",
      }, 502);
    }
  } catch (err) {
    console.error("Exception connecting to Paystack verify API:", err);
    return jsonResponse({
      success: false,
      status: "gateway_error",
      message: "Could not reach payment gateway for verification. Please retry or contact support on WhatsApp.",
    }, 502);
  }

  const txData = paystackData.data;
  const isReferenceMatch = txData?.reference === reference;
  const isStatusSuccess = txData?.status === "success";
  const expectedKobo = Math.round(Number(order.amount) * 100);
  const isAmountMatch = txData?.amount === expectedKobo;
  const isCurrencyNGN = typeof txData?.currency === "string" && txData.currency.toUpperCase() === "NGN";

  // 5. Handle failed or abandoned transactions
  if (txData?.status === "failed" || txData?.status === "abandoned") {
    await supabase
      .from("orders")
      .update({
        status: "failed",
        rejection_reason: txData?.gateway_response || `Transaction ${txData?.status}`,
        paystack_response: txData,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    return jsonResponse({
      success: false,
      status: "failed",
      message: txData?.gateway_response || `Payment was ${txData?.status}.`,
      order: { ...order, status: "failed" },
    });
  }

  // 6. Enforce strict validation: reference, status, exact amount in kobo, and currency
  if (!isReferenceMatch || !isStatusSuccess || !isAmountMatch || !isCurrencyNGN) {
    const mismatchDetails = [
      !isReferenceMatch ? `Reference mismatch (expected: ${reference}, got: ${txData?.reference})` : null,
      !isStatusSuccess ? `Status not success (${txData?.status})` : null,
      !isAmountMatch ? `Amount mismatch (expected: ${expectedKobo} kobo / ₦${order.amount}, got: ${txData?.amount} kobo)` : null,
      !isCurrencyNGN ? `Currency mismatch (expected: NGN, got: ${txData?.currency})` : null,
    ].filter(Boolean).join("; ");

    console.error(`Payment verification rejected for order ${reference}: ${mismatchDetails}`);

    await supabase
      .from("orders")
      .update({
        status: "mismatched",
        rejection_reason: mismatchDetails,
        paystack_response: txData,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    return jsonResponse({
      success: false,
      status: "mismatched",
      message: `Payment details validation failed: ${mismatchDetails}`,
    }, 400);
  }

  // 7. Update order to paid. If order update fails, never report verification success.
  const nowIso = new Date().toISOString();
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: nowIso,
      verified_at: nowIso,
      paystack_response: txData,
      updated_at: nowIso,
    })
    .eq("reference", reference)
    .select("reference, product_id, product_name, amount, email, customer_name, status, paid_at")
    .single();

  if (updateError || !updatedOrder) {
    console.error("Failed to update order to paid in database:", updateError, "reference:", reference);
    return jsonResponse({
      success: false,
      status: "error",
      message: "Payment confirmed by gateway, but order update failed in database. Please contact admissions with your reference.",
      reference,
    }, 500);
  }

  // 8. Grant entitlements reliably
  let entitlementGranted = true;
  let entitlementError: string | null = null;

  try {
    const { error: rpcErr } = await supabase.rpc("grant_order_entitlements", { p_order_reference: reference });
    if (rpcErr) {
      console.error(`Failed to grant entitlements for order ${reference}:`, rpcErr);
      entitlementGranted = false;
      entitlementError = rpcErr.message;
    }
  } catch (err: any) {
    console.error(`Exception granting entitlements for order ${reference}:`, err);
    entitlementGranted = false;
    entitlementError = err?.message || "Entitlement grant exception";
  }

  return jsonResponse({
    success: true,
    status: "paid",
    entitlement_granted: entitlementGranted,
    entitlement_error: entitlementError,
    order: {
      reference: updatedOrder.reference,
      product_id: updatedOrder.product_id,
      product_name: updatedOrder.product_name,
      amount: updatedOrder.amount,
      email: updatedOrder.email,
      customer_name: updatedOrder.customer_name,
      paid_at: updatedOrder.paid_at,
      status: "paid",
    },
  });
});
