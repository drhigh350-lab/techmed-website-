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
    return jsonResponse({ success: false, message: "Database configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Fetch order from database
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("reference, product_id, product_name, amount, email, customer_name, status, paid_at, user_id, university")
    .eq("reference", reference)
    .maybeSingle();

  if (orderError) {
    console.error("Database query failed:", orderError);
    return jsonResponse({ success: false, message: "Database error querying order" }, 500);
  }

  if (!order) {
    return jsonResponse({ success: false, message: "Order not found" }, 404);
  }

  // 2. If already paid, return confirmed status immediately (idempotent)
  if (order.status === "paid") {
    return jsonResponse({
      success: true,
      status: "paid",
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

  // 3. If pending, query Paystack API directly using PAYSTACK_SECRET_KEY
  if (!paystackSecret) {
    console.warn("PAYSTACK_SECRET_KEY not set in Edge Function; returning current DB status");
    return jsonResponse({
      success: true,
      status: order.status,
      order,
    });
  }

  try {
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
      },
    });

    const paystackData = await paystackRes.json();

    if (paystackRes.ok && paystackData.status && paystackData.data?.status === "success") {
      const paidAmount = paystackData.data.amount / 100; // kobo to NGN

      // Validate amount paid matches expected order amount
      if (order.amount && Math.abs(paidAmount - order.amount) > 1) {
        console.warn(`Amount mismatch for ${reference}: expected ${order.amount}, got ${paidAmount}`);
      }

      const nowIso = new Date().toISOString();

      // Update order to paid
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: nowIso,
          verified_at: nowIso,
          paystack_response: paystackData.data,
          updated_at: nowIso,
        })
        .eq("reference", reference);

      if (updateError) {
        console.error("Failed to update order to paid:", updateError);
      }

      // Automatically trigger entitlement grants
      try {
        await supabase.rpc("grant_order_entitlements", { p_order_reference: reference });
      } catch (rpcErr) {
        console.warn("RPC grant_order_entitlements error (may have been granted by trigger):", rpcErr);
      }

      return jsonResponse({
        success: true,
        status: "paid",
        order: {
          reference: order.reference,
          product_id: order.product_id,
          product_name: order.product_name,
          amount: paidAmount,
          email: order.email,
          customer_name: order.customer_name,
          paid_at: nowIso,
          status: "paid",
        },
      });
    } else if (paystackData.data?.status === "failed" || paystackData.data?.status === "abandoned") {
      await supabase
        .from("orders")
        .update({ status: "failed", rejection_reason: paystackData.data?.gateway_response || "Transaction abandoned or declined" })
        .eq("reference", reference);

      return jsonResponse({
        success: true,
        status: "failed",
        message: paystackData.data?.gateway_response || "Payment was not completed.",
        order: { ...order, status: "failed" },
      });
    }

    return jsonResponse({
      success: true,
      status: "pending",
      order,
    });
  } catch (err: any) {
    console.error("Paystack verification error:", err);
    return jsonResponse({
      success: true,
      status: order.status,
      order,
    });
  }
});
