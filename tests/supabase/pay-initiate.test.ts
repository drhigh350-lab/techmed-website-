import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../mocks/supabase-js";
import { getLastHandler, resetHandler } from "../setup/deno-shim";

function makeRequest(body: unknown, { method = "POST" }: { method?: string } = {}) {
  return new Request("https://example.com/pay-initiate", {
    method,
    body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
}

function makeSupabaseClient({ insertResult = { error: null } }: { insertResult?: { error: unknown } } = {}) {
  const insert = vi.fn(async () => insertResult);
  const client = { from: vi.fn(() => ({ insert })) };
  return { client, insert };
}

function paystackOk(overrides: Partial<{ authorization_url: string; access_code: string; reference: string }> = {}) {
  return {
    ok: true,
    json: async () => ({
      status: true,
      data: {
        authorization_url: "https://checkout.paystack.com/abc123",
        access_code: "abc123",
        reference: "paystack-side-reference",
        ...overrides,
      },
    }),
  };
}

// The edge function module calls Deno.serve(handler) exactly once, as a
// module-load side effect, and the handler calls createClient(...) fresh on
// every invocation — so the module only needs to be imported once per test
// file; each test just reconfigures createClient's and fetch's behavior.
let handlerPromise: Promise<ReturnType<typeof getLastHandler>> | null = null;

async function importHandler() {
  if (!handlerPromise) {
    resetHandler();
    handlerPromise = import("../../supabase/functions/pay-initiate/index.ts").then(() => getLastHandler());
  }
  return handlerPromise;
}

describe("supabase/functions/pay-initiate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    createClient.mockReset();
    process.env.PAYSTACK_SECRET_KEY = "sk_test_123";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    delete process.env.SITE_URL;
  });

  it("answers CORS preflight requests", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest(undefined, { method: "OPTIONS" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("rejects methods other than POST/OPTIONS", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest(undefined, { method: "GET" }));
    expect(res.status).toBe(405);
  });

  it("rejects an invalid JSON body", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest("{not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/Invalid JSON/);
  });

  it("requires a product_id and a valid email", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ product_id: "biology-booster", email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/valid product_id and email/);
  });

  it("rejects an unknown product_id", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ product_id: "not-a-real-product", email: "buyer@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("Unknown product");
  });

  it("requires a university for products that need one", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ product_id: "research-file", email: "buyer@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/select your university/);
  });

  it("returns 500 when PAYSTACK_SECRET_KEY is not configured", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    const handler = await importHandler();

    const res = await handler(makeRequest({ product_id: "biology-booster", email: "buyer@example.com" }));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toMatch(/not configured/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("charges the server-side price, ignoring any amount the client sends", async () => {
    const { client, insert } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    (globalThis.fetch as any).mockResolvedValueOnce(paystackOk());
    const handler = await importHandler();

    // chemistry-booster is priced at 5000 in the server-side PRODUCTS table.
    // A malicious or buggy client sending its own `amount` must be ignored —
    // the handler doesn't even read an amount field off the request body.
    const res = await handler(
      makeRequest({ product_id: "chemistry-booster", email: "buyer@example.com", amount: 1 }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.authorization_url).toBe("https://checkout.paystack.com/abc123");
    // The reference returned to the client is the server-generated one, not
    // whatever Paystack's response happened to echo back.
    expect(json.data.reference).toMatch(/^techmed_chemistry-booster_/);
    expect(json.data.reference).not.toBe("paystack-side-reference");

    const [, paystackOpts] = (fetch as any).mock.calls[0];
    const paystackBody = JSON.parse(paystackOpts.body);
    expect(paystackBody.amount).toBe(500000); // 5000 naira -> 500000 kobo, not attacker-supplied

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: "chemistry-booster", amount: 5000, status: "pending" }),
    );
  });

  it("passes product_id/email/university through as Paystack metadata", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    (globalThis.fetch as any).mockResolvedValueOnce(paystackOk());
    const handler = await importHandler();

    await handler(
      makeRequest({
        product_id: "research-file",
        email: "buyer@example.com",
        name: "Ada Lovelace",
        university: "UNILAG",
      }),
    );

    const [, paystackOpts] = (fetch as any).mock.calls[0];
    const paystackBody = JSON.parse(paystackOpts.body);
    expect(paystackBody.metadata).toEqual(
      expect.objectContaining({
        product_id: "research-file",
        customer_name: "Ada Lovelace",
        university: "UNILAG",
      }),
    );
    expect(paystackBody.amount).toBe(100000); // research-file is 1000 naira
  });

  it("returns 502 when Paystack declines to initialize the transaction", async () => {
    const { client, insert } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: false, message: "Invalid email address" }),
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = await importHandler();

    const res = await handler(makeRequest({ product_id: "biology-booster", email: "buyer@example.com" }));
    expect(res.status).toBe(502);
    expect((await res.json()).message).toBe("Invalid email address");
    expect(insert).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns 502 when Paystack can't be reached", async () => {
    const { client } = makeSupabaseClient();
    createClient.mockReturnValue(client);
    (globalThis.fetch as any).mockRejectedValueOnce(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = await importHandler();

    const res = await handler(makeRequest({ product_id: "biology-booster", email: "buyer@example.com" }));
    expect(res.status).toBe(502);
    expect((await res.json()).message).toMatch(/Could not reach Paystack/);
    errorSpy.mockRestore();
  });

  it("still lets the customer pay even if saving the pending order to the database fails", async () => {
    // The Paystack transaction is already created by this point in the flow,
    // so a DB error here must be logged, not surfaced as a failed checkout —
    // the webhook will just have no matching order to reconcile later.
    const { client, insert } = makeSupabaseClient({ insertResult: { error: { message: "db down" } } });
    createClient.mockReturnValue(client);
    (globalThis.fetch as any).mockResolvedValueOnce(paystackOk());
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = await importHandler();

    const res = await handler(makeRequest({ product_id: "biology-booster", email: "buyer@example.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(insert).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
