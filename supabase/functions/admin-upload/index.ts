// TEMPORARY UTILITY — admin-upload
// One-time-use helper to push files into the paid-resources bucket using
// the service-role key that's automatically available inside every Edge
// Function (never exposed to the browser). Guarded by a shared secret so
// it can't be abused by a stranger who finds the URL.
//
// This function should be deleted once the initial file upload is done —
// it is not part of the normal payment flow.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const uploadSecret = Deno.env.get("ADMIN_UPLOAD_SECRET");
  const providedSecret = req.headers.get("x-upload-secret");

  if (!uploadSecret || providedSecret !== uploadSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const path = req.headers.get("x-file-path");
  if (!path) {
    return new Response("Missing x-file-path header", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.arrayBuffer();

  const { error } = await supabase.storage
    .from("paid-resources")
    .upload(path, body, {
      contentType: req.headers.get("content-type") ?? "application/octet-stream",
      upsert: true,
    });

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, path }), { status: 200 });
});
