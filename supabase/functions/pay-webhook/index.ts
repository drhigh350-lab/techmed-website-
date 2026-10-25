// supabase/functions/pay-webhook/index.ts
// Paystack server-to-server webhook handler.
// Verifies HMAC-SHA512 signature from x-paystack-signature.
// Validates transaction reference, exact amount in kobo, NGN currency, and success status.
// Preserves idempotency: duplicate deliveries for already-paid orders return 200 immediately.
// Triggers reliable entitlement grants for cohort plans and resources.
// Bypasses legacy download emails for cohort purchases while preserving them for standalone resources.

import { createClient } from "jsr:@supabase/supabase-js@2";

// Storage bucket mapping for standalone paid resources
const FILE_PATHS: Record<string, string> = {
  "chemistry-booster": "chemistry-booster.zip",
  "biology-booster": "biology-booster.zip",
  "physics-booster": "physics-booster.zip",
};

const FROM_ADDRESS = "TECHMED <noreply@techmedng.com>";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHex === signature;
}

function resolveFilePath(productId: string, university: string | null): string | null {
  if (productId === "research-file" || productId === "university-research-file") {
    return university ? `research-files/${university}.html` : null;
  }
  return FILE_PATHS[productId] ?? null;
}

async function sendDownloadEmail(opts: {
  resendApiKey: string;
  toEmail: string;
  productName: string;
  downloadUrl: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: opts.toEmail,
      subject: `Your TECHMED download: ${opts.productName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #012748;">
          <h2 style="color: #012748;">Payment confirmed</h2>
          <p>Thanks for your purchase — here's your download for <strong>${opts.productName}</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${opts.downloadUrl}" style="background:#09476E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Download Now</a>
          </p>
          <p style="font-size: 13px; color: #6C87A0;">This link expires in 7 days. If it stops working, reply to this email or reach us on WhatsApp and we'll resend it.</p>
          <p style="font-size: 13px; color: #6C87A0;">— TECHMED</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ received: false }, 405);
  }

  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!paystackSecret) {
    console.error("PAYSTACK_SECRET_KEY is not set in Edge Function secrets");
    return jsonResponse({ received: false }, 500);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  // 1. Verify HMAC-SHA512 Signature
  const isValid = await verifySignature(rawBody, signature, paystackSecret);
  if (!isValid) {
    console.error("Rejected webhook call: invalid or missing Paystack HMAC-SHA512 signature");
    return jsonResponse({ received: false }, 401);
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      status?: string;
      amount?: number;
      currency?: string;
      metadata?: Record<string, unknown>;
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ received: false }, 400);
  }

  // Acknowledge non-charge events immediately
  if (event.event !== "charge.success") {
    return jsonResponse({ received: true });
  }

  const reference = event.data?.reference?.trim();
  if (!reference) {
    return jsonResponse({ received: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Database configuration error in pay-webhook");
    return jsonResponse({ received: false }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 2. Fetch existing order to verify status and amount
  const { data: existingOrder, error: orderFetchError } = await supabase
    .from("orders")
    .select("reference, amount, status, email, product_id, product_name, university")
    .eq("reference", reference)
    .maybeSingle();

  if (orderFetchError || !existingOrder) {
    console.error(`Order ${reference} not found in database during webhook processing`);
    // Return 200 so Paystack does not retry endlessly for an unknown order
    return jsonResponse({ received: true });
  }

  // 3. Preserve Idempotency: if already paid, acknowledge immediately
  if (existingOrder.status === "paid") {
    return jsonResponse({ received: true });
  }

  if (existingOrder.status !== "pending") {
    // If order was already marked failed or mismatched, do not overwrite
    return jsonResponse({ received: true });
  }

  // 4. Validate reference, success status, exact amount in kobo, and currency
  const txData = event.data;
  const isReferenceMatch = txData?.reference === reference;
  const isStatusSuccess = txData?.status === "success";
  const expectedKobo = Math.round(Number(existingOrder.amount) * 100);
  const isAmountMatch = txData?.amount === expectedKobo;
  const isCurrencyNGN = typeof txData?.currency === "string" && txData.currency.toUpperCase() === "NGN";

  if (!isReferenceMatch || !isStatusSuccess || !isAmountMatch || !isCurrencyNGN) {
    const mismatchDetails = [
      !isReferenceMatch ? `Reference mismatch (expected: ${reference}, got: ${txData?.reference})` : null,
      !isStatusSuccess ? `Status not success (${txData?.status})` : null,
      !isAmountMatch ? `Amount mismatch (expected: ${expectedKobo} kobo / ₦${existingOrder.amount}, got: ${txData?.amount} kobo)` : null,
      !isCurrencyNGN ? `Currency mismatch (expected: NGN, got: ${txData?.currency})` : null,
    ].filter(Boolean).join("; ");

    console.error(`Webhook validation failed for ${reference}: ${mismatchDetails}`);

    await supabase
      .from("orders")
      .update({
        status: "mismatched",
        rejection_reason: mismatchDetails,
        paystack_response: txData,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    return jsonResponse({ received: true });
  }

  // 5. Update order to paid
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
    .eq("status", "pending") // Strict atomic state transition
    .select("reference, email, product_id, product_name, university")
    .maybeSingle();

  if (updateError) {
    console.error(`Webhook failed to update order ${reference} to paid:`, updateError);
    return jsonResponse({ received: true });
  }

  if (!updatedOrder) {
    // Concurrent update already handled this order
    return jsonResponse({ received: true });
  }

  // 6. Grant Entitlements Reliably
  try {
    const { error: rpcErr } = await supabase.rpc("grant_order_entitlements", { p_order_reference: reference });
    if (rpcErr) {
      console.error(`Webhook RPC grant_order_entitlements failed for ${reference}:`, rpcErr);
    }
  } catch (rpcErr) {
    console.error(`Webhook RPC exception in grant_order_entitlements for ${reference}:`, rpcErr);
  }

  // 7. Email Delivery: Bypass for cohort purchases, preserve for standalone resources
  const isCohort =
    updatedOrder.product_id.startsWith("cohort-") ||
    ["core", "mastery", "ultimate"].includes(updatedOrder.product_id);

  if (!isCohort) {
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        console.warn("RESEND_API_KEY not configured — skipping standalone resource delivery email for:", reference);
      } else {
        const filePath = resolveFilePath(updatedOrder.product_id, updatedOrder.university);
        if (filePath) {
          const { data: signedUrlData, error: signError } = await supabase.storage
            .from("paid-resources")
            .createSignedUrl(filePath, 60 * 60 * 24 * 7);

          if (!signError && signedUrlData?.signedUrl) {
            await sendDownloadEmail({
              resendApiKey,
              toEmail: updatedOrder.email,
              productName: updatedOrder.product_name,
              downloadUrl: signedUrlData.signedUrl,
            });
          } else {
            console.error("Failed to generate signed download URL for product:", updatedOrder.product_id, signError);
          }
        }
      }
    } catch (emailErr) {
      console.error("Resource delivery email exception for order:", reference, emailErr);
    }
  }

  return jsonResponse({ received: true });
});
