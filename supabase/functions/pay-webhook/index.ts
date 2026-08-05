// pay-webhook
// Paystack calls this URL directly (server to server) after a transaction
// completes. It is NOT called by the browser. Every request must be
// verified using the HMAC-SHA512 signature Paystack sends in the
// x-paystack-signature header — without this check, anyone who finds this
// URL could fake a "payment succeeded" event for free.
//
// After confirming payment, this also emails the buyer a time-limited
// download link (via Resend) for their specific product. Email sending
// happens AFTER the order is marked paid and never blocks or reverts that
// update — a failed email should never make a real payment look unpaid.

import { createClient } from "jsr:@supabase/supabase-js@2";

// Maps each product_id to its path inside the private "paid-resources"
// Storage bucket. Research files are keyed by university on top of the
// product_id since that product varies per school.
// Keep in sync with the PRODUCTS list in pay-initiate/index.ts.
const FILE_PATHS: Record<string, string> = {
  "chemistry-booster": "chemistry-booster.zip",
  "biology-booster": "biology-booster.zip",
  "physics-booster": "physics-booster.zip",
  // "post-utme-pq": "post-utme-pq.zip",              // TODO: upload and uncomment
  // research-file paths are resolved per-university below, not here
};

const FROM_ADDRESS = "TECHMED <noreply@techmedng.com>"; // verified sending domain in Resend

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
  if (productId === "research-file") {
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

  const isValid = await verifySignature(rawBody, signature, paystackSecret);
  if (!isValid) {
    console.error("Rejected webhook call with invalid or missing Paystack signature");
    return jsonResponse({ received: false }, 401);
  }

  let event: {
    event?: string;
    data?: { reference?: string; status?: string; metadata?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ received: false }, 400);
  }

  // Acknowledge immediately for any event type we don't act on, so Paystack
  // doesn't keep retrying — we only care about successful charges.
  if (event.event !== "charge.success") {
    return jsonResponse({ received: true });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return jsonResponse({ received: true });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: updatedOrder, error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      paystack_response: event.data,
    })
    .eq("reference", reference)
    .eq("status", "pending") // never downgrade or overwrite an already-paid order
    .select("email, product_id, product_name, university")
    .maybeSingle();

  if (error) {
    console.error("Failed to mark order paid:", error, "reference:", reference);
    // Still return 200 — Paystack will retry on non-2xx, and retries would
    // not fix a genuine DB error. This is logged for manual reconciliation.
    return jsonResponse({ received: true });
  }

  // updatedOrder is null if this reference didn't match a pending order —
  // e.g. a duplicate webhook retry for an already-paid order. That's fine,
  // nothing further to do (and we must not send a second email).
  if (!updatedOrder) {
    return jsonResponse({ received: true });
  }

  // ---- Email delivery (best-effort — never affects payment status) ----
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set — skipping delivery email for reference:", reference);
    } else {
      const filePath = resolveFilePath(updatedOrder.product_id, updatedOrder.university);

      if (!filePath) {
        console.error("No file path configured for product:", updatedOrder.product_id, "reference:", reference);
      } else {
        const { data: signedUrlData, error: signError } = await supabase.storage
          .from("paid-resources")
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

        if (signError || !signedUrlData) {
          console.error("Failed to create signed URL:", signError, "path:", filePath, "reference:", reference);
        } else {
          await sendDownloadEmail({
            resendApiKey,
            toEmail: updatedOrder.email,
            productName: updatedOrder.product_name,
            downloadUrl: signedUrlData.signedUrl,
          });
        }
      }
    }
  } catch (emailErr) {
    // Logged only — a broken email must never make this endpoint fail or
    // retry, since the payment itself already succeeded and is recorded.
    console.error("Delivery email failed for reference:", reference, emailErr);
  }

  return jsonResponse({ received: true });
});
