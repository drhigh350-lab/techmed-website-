// RETIRED (Nov 2026). One-time helper used to push the first booster files
// into the private paid-resources bucket. Upload new books through the
// Supabase dashboard (Storage > paid-resources) instead. Kept as an inert
// endpoint until it is deleted in the dashboard.
Deno.serve(() => new Response("This endpoint has been retired.", { status: 410 }));
