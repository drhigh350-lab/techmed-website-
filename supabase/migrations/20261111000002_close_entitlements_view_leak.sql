-- ==============================================================================
-- Close a pre-existing leak + tighten function grants (Nov 2026)
-- ==============================================================================
-- public.active_user_entitlements was a SECURITY DEFINER view, so it ignored
-- RLS: anyone with the public anon key could list every active entitlement,
-- including customer emails. With security_invoker it obeys the entitlements
-- RLS policies (students see only their own rows; admins see all).
ALTER VIEW public.active_user_entitlements SET (security_invoker = true);
REVOKE ALL ON public.active_user_entitlements FROM anon;

-- These are for logged-in students only (they already return nothing for
-- anonymous callers, but should not be callable by anon at all).
REVOKE EXECUTE ON FUNCTION public.has_resource_access(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_library() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_access(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_access(UUID, TEXT) FROM anon;
-- Trigger-only function: nobody needs to call it directly.
REVOKE EXECUTE ON FUNCTION public.trg_products_sync_inclusions() FROM PUBLIC, anon, authenticated;
