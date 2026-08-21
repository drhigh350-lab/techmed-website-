import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../mocks/supabase-js";
import { getLastHandler, resetHandler } from "../setup/deno-shim";

const SECRET = "whsec_test_secret";

function sign(rawBody: string, secret = SECRET): string {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
}

function makeRequest(body: unknown, { method = "POST", signature }: { method?: string; signature?: string | null } = {}) {
  const rawBody = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = {};
  if (signature !== null) {
    headers["x-paystack-signature"] = signature ?? sign(rawBody);
  }
  return new Request("https://example.com/pay-webhook", { method, headers, body: method === "POST" ? rawBody : undefined });
}

function makeOrdersChain(result: { data: unknown; error: unknown }) {
  const chain: any = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => result);
  return chain;
}

function makeSupabaseClient({
  updateResult = { data: null, error: null },
  signedUrlResult = { data: { signedUrl: "https://example.com/signed/file.zip" }, error: null },
}: {
  updateResult?: { data: unknown; error: unknown };
  signedUrlResult?: { data: unknown; error: unknown };
} = {}) {
  const ordersChain = makeOrdersChain(updateResult);
  const storageBucket = { createSignedUrl: vi.fn(async () => signedUrlResult) };
  const client = {
    from: vi.fn((table: string) => {
      if (table !== "orders") throw new Error(`Unexpected table: ${table}`);
      return ordersChain;
    }),
    storage: { from: vi.fn(() => storageBucket) },
  };
  return { client, ordersChain, storageBucket };
}

// The edge function module calls Deno.serve(handler) exactly once, as a
// module-load side effect, and the handler itself calls createClient(...)
// fresh on every invocation — so the module only needs to be imported once
// per test file; each test just reconfigures createClient's return value.
let handlerPromise: Promise<ReturnType<typeof getLastHandler>> | null = null;

async function importHandler() {
  if (!handlerPromise) {
    resetHandler();
    handlerPromise = import("../../supabase/functions/pay-webhook/index.ts").then(() => getLastHandler());
  }
  return handlerPromise;
}

describe("supabase/functions/pay-webhook", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    createClient.mockReset();
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.RESEND_API_KEY = "resend-key";
  });

  it("rejects non-POST requests with 405", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({}, { method: "GET" }));
    expect(res.status).toBe(405);
    expect(await res.json()).toEqual({ received: false });
  });

  it("returns 500 when PAYSTACK_SECRET_KEY is not configured", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.success", data: { reference: "ref_1" } }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ received: false });
  });

  it("rejects a request with a missing signature header", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.success", data: { reference: "ref_1" } }, { signature: null }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ received: false });
  });

  it("rejects a request with an incorrect signature", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(
      makeRequest({ event: "charge.success", data: { reference: "ref_1" } }, { signature: "deadbeef" }),
    );
    expect(res.status).toBe(401);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("acknowledges non charge.success events without touching the database", async () => {
    const { client, ordersChain } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.failed", data: { reference: "ref_1" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(ordersChain.update).not.toHaveBeenCalled();
  });

  it("acknowledges charge.success events with no reference without touching the database", async () => {
    const { client, ordersChain } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.success", data: {} }));
    expect(res.status).toBe(200);
    expect(ordersChain.update).not.toHaveBeenCalled();
  });

  it("marks a pending order paid and emails the buyer a signed download link", async () => {
    const { client, ordersChain, storageBucket } = makeSupabaseClient({
      updateResult: {
        data: {
          email: "buyer@example.com",
          product_id: "chemistry-booster",
          product_name: "Chemistry Booster System",
          university: null,
        },
        error: null,
      },
    });
    createClient.mockReturnValue(client);
    (globalThis.fetch as any).mockResolvedValue({ ok: true });
    const handler = await importHandler();

    const reference = "techmed_chemistry-booster_123";
    const eventData = { reference, status: "success" };
    const res = await handler(makeRequest({ event: "charge.success", data: eventData }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    // Only ever moves pending -> paid; never re-marks an already-paid order.
    expect(ordersChain.eq).toHaveBeenNthCalledWith(1, "reference", reference);
    expect(ordersChain.eq).toHaveBeenNthCalledWith(2, "status", "pending");
    expect(ordersChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid", paystack_response: eventData }),
    );

    expect(storageBucket.createSignedUrl).toHaveBeenCalledWith("chemistry-booster.zip", 60 * 60 * 24 * 7);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer resend-key" }),
      }),
    );
    const emailBody = JSON.parse((fetch as any).mock.calls[0][1].body);
    expect(emailBody.to).toBe("buyer@example.com");
    expect(emailBody.html).toContain("https://example.com/signed/file.zip");
  });

  it("resolves a per-university research-file path", async () => {
    const { client, storageBucket } = makeSupabaseClient({
      updateResult: {
        data: {
          email: "buyer@example.com",
          product_id: "research-file",
          product_name: "Detailed University Research File",
          university: "UNILAG",
        },
        error: null,
      },
    });
    createClient.mockReturnValue(client);
    (globalThis.fetch as any).mockResolvedValue({ ok: true });
    const handler = await importHandler();

    await handler(makeRequest({ event: "charge.success", data: { reference: "ref_uni" } }));

    expect(storageBucket.createSignedUrl).toHaveBeenCalledWith("research-files/UNILAG.html", expect.any(Number));
  });

  it("is idempotent: a webhook retry for an already-paid order sends no second email", async () => {
    // maybeSingle returns null when .eq('status', 'pending') no longer matches
    // (e.g. Paystack retries the same event after the order is already paid).
    const { client, ordersChain } = makeSupabaseClient({ updateResult: { data: null, error: null } });
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.success", data: { reference: "ref_dup" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(ordersChain.update).toHaveBeenCalled(); // update was attempted
    expect(fetch).not.toHaveBeenCalled(); // but no email was sent
  });

  it("still returns 200 when the database update itself errors (logged for manual reconciliation)", async () => {
    const { client } = makeSupabaseClient({ updateResult: { data: null, error: { message: "db down" } } });
    createClient.mockReturnValue(client);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.success", data: { reference: "ref_err" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(fetch).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("never fails the request when the delivery email fails to send (payment stays marked paid)", async () => {
    const { client } = makeSupabaseClient({
      updateResult: {
        data: {
          email: "buyer@example.com",
          product_id: "biology-booster",
          product_name: "Biology Booster System",
          university: null,
        },
        error: null,
      },
    });
    createClient.mockReturnValue(client);
    (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 422, text: async () => "invalid recipient" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.success", data: { reference: "ref_email_fail" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    errorSpy.mockRestore();
  });

  it("skips the email (but still confirms payment) when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const { client } = makeSupabaseClient({
      updateResult: {
        data: {
          email: "buyer@example.com",
          product_id: "physics-booster",
          product_name: "Physics Booster System",
          university: null,
        },
        error: null,
      },
    });
    createClient.mockReturnValue(client);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.success", data: { reference: "ref_no_key" } }));
    expect(res.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("skips the email for a product with no configured file path", async () => {
    const { client } = makeSupabaseClient({
      updateResult: {
        data: {
          email: "buyer@example.com",
          product_id: "post-utme-pq", // commented out of FILE_PATHS (TODO in source)
          product_name: "Post Brainstorming Hub — All Universities",
          university: null,
        },
        error: null,
      },
    });
    createClient.mockReturnValue(client);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = await importHandler();

    const res = await handler(makeRequest({ event: "charge.success", data: { reference: "ref_no_path" } }));
    expect(res.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
