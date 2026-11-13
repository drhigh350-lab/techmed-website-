-- TECHMED notification emails: welcome on sign-up + daily renewal reminders.
-- The notify-email edge function only accepts calls carrying this secret.
INSERT INTO public.app_secrets (name, value)
VALUES ('notify_hook_secret', encode(extensions.gen_random_bytes(24), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_email(payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s text;
BEGIN
  SELECT value INTO s FROM public.app_secrets WHERE name = 'notify_hook_secret';
  IF s IS NULL THEN RETURN NULL; END IF;
  RETURN net.http_post(
    url := 'https://unbgborbhxzsotaieiun.supabase.co/functions/v1/notify-email',
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-techmed-notify', s),
    timeout_milliseconds := 20000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.notify_email(jsonb) FROM PUBLIC, anon, authenticated;

-- Push notifications (notify-push edge function, OneSignal).
CREATE TABLE IF NOT EXISTS public.notify_log (
  key TEXT PRIMARY KEY,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notify_log ENABLE ROW LEVEL SECURITY; -- service role only

CREATE OR REPLACE FUNCTION public.notify_push(payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  s text;
BEGIN
  SELECT value INTO s FROM public.app_secrets WHERE name = 'notify_hook_secret';
  IF s IS NULL THEN RETURN NULL; END IF;
  RETURN net.http_post(
    url := 'https://unbgborbhxzsotaieiun.supabase.co/functions/v1/notify-push',
    body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-techmed-notify', s),
    timeout_milliseconds := 30000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.notify_push(jsonb) FROM PUBLIC, anon, authenticated;

-- Welcome email for every new account (never blocks sign-up).
CREATE OR REPLACE FUNCTION public.on_auth_user_created_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    BEGIN
      PERFORM public.notify_email(jsonb_build_object(
        'type', 'welcome',
        'email', NEW.email,
        'name', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
      ));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'welcome email not queued: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.on_auth_user_created_welcome() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS techmed_welcome_email ON auth.users;
CREATE TRIGGER techmed_welcome_email
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.on_auth_user_created_welcome();

-- Daily renewal reminders at 08:07 Lagos time (07:07 UTC).
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'techmed-renewal-emails';
SELECT cron.schedule('techmed-renewal-emails', '7 7 * * *', $$SELECT public.notify_email('{"type":"renewals"}'::jsonb)$$);

-- TECHMED receipt (with the next step) whenever an order becomes paid.
CREATE OR REPLACE FUNCTION public.on_order_paid_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    BEGIN
      PERFORM public.notify_email(jsonb_build_object('type', 'receipt', 'reference', NEW.reference));
      IF NEW.user_id IS NOT NULL THEN
        PERFORM public.notify_push(jsonb_build_object('action', 'payment', 'user_id', NEW.user_id::text, 'reference', NEW.reference));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'receipt email not queued: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.on_order_paid_receipt() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS techmed_receipt_email ON public.orders;
CREATE TRIGGER techmed_receipt_email
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_paid_receipt();

-- Push schedules (Lagos = UTC+1): every 5 min; 12:07 daily; 20:07 daily.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('techmed-push-tick', 'techmed-push-midday', 'techmed-push-evening');
SELECT cron.schedule('techmed-push-tick', '*/5 * * * *', $$SELECT public.notify_push('{"action":"tick"}'::jsonb)$$);
SELECT cron.schedule('techmed-push-midday', '7 11 * * *', $$SELECT public.notify_push('{"action":"midday"}'::jsonb)$$);
SELECT cron.schedule('techmed-push-evening', '7 19 * * *', $$SELECT public.notify_push('{"action":"evening"}'::jsonb)$$);
