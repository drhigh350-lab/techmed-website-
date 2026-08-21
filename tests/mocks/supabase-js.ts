// Stands in for "jsr:@supabase/supabase-js@2" (aliased in vitest.config.ts) so
// supabase/functions/**/index.ts can be imported under Node/Vitest without a
// real Supabase project. Tests set createClient's return value per-case with
// createClient.mockReturnValue(...) after importing this module.
import { vi } from "vitest";

export const createClient = vi.fn();
