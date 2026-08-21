import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The Supabase edge functions (supabase/functions/**) run on Deno and import
// the Supabase client via a "jsr:" specifier, which Node/Vite can't resolve.
// We alias that exact specifier to a local mock so those files can be
// imported directly in tests (see tests/mocks/supabase-js.ts and
// tests/setup/deno-shim.ts for the rest of the Deno-on-Node shim).
export default defineConfig({
  resolve: {
    alias: {
      "jsr:@supabase/supabase-js@2": path.resolve(__dirname, "tests/mocks/supabase-js.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{js,ts}"],
  },
});
