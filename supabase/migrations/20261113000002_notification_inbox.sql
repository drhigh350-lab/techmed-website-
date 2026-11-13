-- TECHMED notification bell: every push the system sends is also kept here,
-- so students can see past notifications on the website.
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '/dashboard',
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'free', 'paid', 'user')),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY; -- read only through my_notifications()

-- The signed-in student's notifications from the last 30 days (newest first).
CREATE OR REPLACE FUNCTION public.my_notifications()
RETURNS TABLE (id BIGINT, title TEXT, body TEXT, url TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  lvl INT := 0;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT COALESCE(p.plan_level, 0) INTO lvl
  FROM public.plan_status_for(uid, (SELECT email FROM auth.users WHERE auth.users.id = uid)) p
  LIMIT 1;
  lvl := COALESCE(lvl, 0);
  RETURN QUERY
  SELECT n.id, n.title, n.body, n.url, n.created_at
  FROM public.notifications n
  WHERE n.created_at > now() - interval '30 days'
    AND (
      n.audience = 'all'
      OR (n.audience = 'free' AND lvl = 0)
      OR (n.audience = 'paid' AND lvl >= 1)
      OR (n.audience = 'user' AND n.user_id = uid)
    )
  ORDER BY n.created_at DESC
  LIMIT 50;
END;
$$;
REVOKE ALL ON FUNCTION public.my_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_notifications() TO authenticated;
