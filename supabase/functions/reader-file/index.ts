// supabase/functions/reader-file/index.ts
// Protected delivery of TECHMED e-books to the in-site reader.
//
// - The caller must send their Supabase session token (Authorization: Bearer).
// - Access is decided in the database by resource_access_for() — the single
//   TECHMED access rule (purchase, plan/bundle inclusion, admin grant, ...).
// - The ORIGINAL file (PDF, or a ZIP of PDFs for older booster systems) is
//   streamed from the PRIVATE paid-resources bucket. No public or signed URL
//   is ever handed to the browser, and responses are marked no-store.
//
// File location convention (private bucket "paid-resources"):
//   <product-id>.pdf   e.g. organic-chemistry-mastery.pdf, mole-concept-cure.pdf
//   <product-id>.zip   legacy booster systems (zip of PDFs)
//   <product-id>-free-preview.pdf   free preview: served to ANYONE via
//                                   ?mode=preview (never the full book)
// or products.metadata.file_path to point at any other path.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "content-length, x-techmed-file-type, x-techmed-file-version",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Frontend ids/slugs that differ from catalogue ids.
const ALIASES: Record<string, string> = {
  "chemistry-booster-system": "chemistry-booster",
  "biology-booster-system": "biology-booster",
  "physics-booster-system": "physics-booster",
  "post-utme-brainstorming-hub": "post-utme-pq",
  "university-research-file": "research-file",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const rawId = (url.searchParams.get("resource") || "").trim().toLowerCase();
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "check" ? "check" : modeParam === "preview" ? "preview" : "file";
  if (!/^[a-z0-9-]{2,80}$/.test(rawId)) return json({ error: "invalid_resource" }, 400);
  const resourceId = ALIASES[rawId] ?? rawId;

  // Free previews are public marketing copies: no sign-in, fixed file name,
  // and they can never resolve to the full book.
  if (mode === "preview") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const previewName = `${resourceId}-free-preview.pdf`;
    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/authenticated/paid-resources/${encodeURIComponent(previewName)}`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
    );
    if (!res.ok || !res.body) return json({ error: "preview_not_uploaded" }, 404);
    const h = new Headers(corsHeaders);
    h.set("Content-Type", "application/pdf");
    h.set("Cache-Control", "public, max-age=3600");
    h.set("Content-Disposition", "inline");
    const len = res.headers.get("content-length");
    if (len) h.set("Content-Length", len);
    return new Response(res.body, { status: 200, headers: h });
  }

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "sign_in_required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "sign_in_required" }, 401);

  const { data: allowed, error: accessErr } = await admin.rpc("resource_access_for", {
    p_user_id: user.id,
    p_email: user.email ?? null,
    p_resource_id: resourceId,
  });
  if (accessErr) {
    console.error("access check failed", accessErr.message);
    return json({ error: "access_check_failed" }, 500);
  }
  if (allowed !== true) return json({ error: "not_entitled" }, 403);

  // Locate the file.
  const { data: product } = await admin
    .from("products")
    .select("id, metadata")
    .eq("id", resourceId)
    .maybeSingle();
  const configured = typeof product?.metadata?.file_path === "string" ? product.metadata.file_path : null;
  const candidates = [
    ...(configured ? [configured] : []),
    `${resourceId}.pdf`,
    `${resourceId}.zip`,
  ];

  // Find the first candidate that exists (Storage API list, per folder).
  let found: { name: string; updated_at: string; size: number | null } | undefined;
  for (const path of candidates) {
    const slash = path.lastIndexOf("/");
    const dir = slash >= 0 ? path.slice(0, slash) : "";
    const base = slash >= 0 ? path.slice(slash + 1) : path;
    const { data: list } = await admin.storage.from("paid-resources").list(dir, { search: base, limit: 20 });
    const hit = (list ?? []).find((o) => o.name === base);
    if (hit) {
      found = {
        name: path,
        updated_at: hit.updated_at ?? hit.created_at ?? "",
        size: (hit.metadata as { size?: number } | null)?.size ?? null,
      };
      break;
    }
  }

  if (!found) {
    return json({ error: "file_not_uploaded", message: "This book is not available to read yet." }, 404);
  }

  const fileType = found.name.toLowerCase().endsWith(".zip") ? "zip" : "pdf";
  const version = `${found.updated_at}`;

  if (mode === "check") {
    return json({ ok: true, file_type: fileType, version, size: found.size }, 200);
  }

  const upstream = await fetch(
    `${supabaseUrl}/storage/v1/object/authenticated/paid-resources/${found.name.split("/").map(encodeURIComponent).join("/")}`,
    { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
  );
  if (!upstream.ok || !upstream.body) {
    console.error("storage fetch failed", upstream.status, found.name);
    return json({ error: "file_unavailable" }, 502);
  }

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Content-Disposition", "inline");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Techmed-File-Type", fileType);
  headers.set("X-Techmed-File-Version", version);
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  return new Response(upstream.body, { status: 200, headers });
});
