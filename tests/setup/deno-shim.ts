// Minimal shim so supabase/functions/**/index.ts (written for the Deno edge
// runtime) can be loaded under Node/Vitest. Each of those files calls
// `Deno.serve(handler)` once, at module top level, to register its request
// handler. Rather than actually starting a server, we just capture the
// handler function so tests can invoke it directly with a Web-standard
// Request. `Deno.env.get` is backed by process.env, so tests configure
// secrets the same way the real edge runtime would (via env vars).
//
// Usage in a test file:
//   beforeEach(() => { vi.resetModules(); resetHandler(); });
//   it("...", async () => {
//     await import("../../supabase/functions/pay-webhook/index.ts");
//     const handler = getLastHandler();
//     const res = await handler(new Request(...));
//   });

type Handler = (req: Request) => Response | Promise<Response>;

let lastHandler: Handler | null = null;

(globalThis as any).Deno = {
  serve(handler: Handler) {
    lastHandler = handler;
    return { finished: Promise.resolve(undefined), shutdown: async () => {} };
  },
  env: {
    get(key: string): string | undefined {
      return process.env[key];
    },
  },
};

export function getLastHandler(): Handler {
  if (!lastHandler) {
    throw new Error("No Deno.serve handler registered — did the edge function module get imported?");
  }
  return lastHandler;
}

export function resetHandler(): void {
  lastHandler = null;
}
