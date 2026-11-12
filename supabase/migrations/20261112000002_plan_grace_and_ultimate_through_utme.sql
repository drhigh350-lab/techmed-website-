-- ==============================================================================
-- Plans: 3-day grace period, and Ultimate runs through UTME 2027 (Nov 2026)
-- ==============================================================================
-- 1. Grace period. When a Core / Mastery / Ultimate plan ends, the student keeps
--    plan access (paid quizzes, classes) for 3 more days, then loses it until
--    they renew. A renewal always starts counting from the day they pay
--    (grant_order_entitlements already does this).
-- 2. Ultimate is "through UTME 2027". JAMB has not announced the date, so
--    Ultimate plan access has no end date for now. When the date is known:
--      UPDATE public.entitlements SET expires_at = '<UTME date> 23:59:59+01'
--      WHERE resource_id = 'cohort-ultimate' AND expires_at IS NULL;
--    and set ULTIMATE_END below in grant_order_entitlements.
-- Books included with plans are lifetime and are not affected by either rule.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.plan_grace_interval()
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT interval '3 days' $$;

-- Effective end of access for an entitlement row: plans get the grace period.
CREATE OR REPLACE FUNCTION public.entitlement_access_end(p_resource_id TEXT, p_expires_at TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_expires_at IS NULL THEN NULL
    WHEN public.canonical_product_id(p_resource_id) IN ('cohort-core', 'cohort-mastery', 'cohort-ultimate')
      THEN p_expires_at + public.plan_grace_interval()
    ELSE p_expires_at
  END;
$$;

-- Same access rule as before, with the grace period applied to plan rows.
CREATE OR REPLACE FUNCTION public.resource_access_for(p_user_id UUID, p_email TEXT, p_resource_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT e.*
    FROM public.entitlements e
    WHERE e.is_active = true
      AND e.revoked_at IS NULL
      AND (e.starts_at IS NULL OR e.starts_at <= now())
      AND (public.entitlement_access_end(e.resource_id, e.expires_at) IS NULL
           OR public.entitlement_access_end(e.resource_id, e.expires_at) > now())
      AND (
        (p_user_id IS NOT NULL AND e.user_id = p_user_id)
        OR (coalesce(p_email, '') <> '' AND lower(e.customer_email) = lower(p_email))
      )
  )
  SELECT EXISTS (
    SELECT 1 FROM me
    WHERE public.canonical_product_id(me.resource_id) = public.canonical_product_id(p_resource_id)
  )
  OR EXISTS (
    SELECT 1
    FROM me
    JOIN public.products p ON public.canonical_product_id(p.id) = public.canonical_product_id(me.resource_id)
    WHERE p.product_type IN ('bundle', 'cohort_plan')
      AND public.canonical_product_id(p_resource_id) = ANY (
        SELECT public.canonical_product_id(x) FROM unnest(p.bundle_item_ids) AS x
      )
  );
$$;
REVOKE ALL ON FUNCTION public.resource_access_for(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resource_access_for(UUID, TEXT, TEXT) TO service_role;

-- The student's current plan level, for quizzes and classes.
-- Higher plans include lower ones: Ultimate (3) ⊇ Mastery (2) ⊇ Core (1).
-- Returns the plan, its coverage end, and whether they are in the grace period.
CREATE OR REPLACE FUNCTION public.plan_status_for(p_user_id UUID, p_email TEXT)
RETURNS TABLE (plan TEXT, plan_level INTEGER, coverage_ends_at TIMESTAMPTZ, access_ends_at TIMESTAMPTZ, in_grace BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.resource_id,
    CASE e.resource_id WHEN 'cohort-ultimate' THEN 3 WHEN 'cohort-mastery' THEN 2 ELSE 1 END,
    e.expires_at,
    public.entitlement_access_end(e.resource_id, e.expires_at),
    (e.expires_at IS NOT NULL AND e.expires_at <= now())
  FROM public.entitlements e
  WHERE e.resource_id IN ('cohort-core', 'cohort-mastery', 'cohort-ultimate')
    AND e.is_active AND e.revoked_at IS NULL
    AND (e.starts_at IS NULL OR e.starts_at <= now())
    AND (public.entitlement_access_end(e.resource_id, e.expires_at) IS NULL
         OR public.entitlement_access_end(e.resource_id, e.expires_at) > now())
    AND ((p_user_id IS NOT NULL AND e.user_id = p_user_id)
         OR (coalesce(p_email, '') <> '' AND lower(e.customer_email) = lower(p_email)))
  ORDER BY 2 DESC, (e.expires_at IS NULL) DESC, e.expires_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.plan_status_for(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plan_status_for(UUID, TEXT) TO service_role;

-- For the signed-in student (identity from the session, never from input).
CREATE OR REPLACE FUNCTION public.my_plan_status()
RETURNS TABLE (plan TEXT, plan_level INTEGER, coverage_ends_at TIMESTAMPTZ, access_ends_at TIMESTAMPTZ, in_grace BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.plan_status_for(auth.uid(), auth.jwt() ->> 'email') WHERE auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.my_plan_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_plan_status() TO authenticated;

-- Ultimate: no end date until JAMB announces UTME 2027.
UPDATE public.entitlements
SET expires_at = NULL,
    updated_at = now(),
    metadata = metadata || jsonb_build_object('coverage', 'through_utme_2027', 'previous_expires_at', expires_at)
WHERE resource_id = 'cohort-ultimate' AND expires_at IS NOT NULL;

-- New purchases: identical to the production grant_order_entitlements except
-- that Ultimate plans get no end date ("through UTME 2027").
CREATE OR REPLACE FUNCTION public.grant_order_entitlements(p_order_reference text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_user_id uuid;
  v_product public.products%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_resource_id text;
  v_count integer := 0;
  v_plan_id text;
  v_plan_starts_at timestamptz;
  v_plan_expires_at timestamptz;
  v_is_monthly boolean;
BEGIN
  IF p_order_reference IS NULL OR btrim(p_order_reference) = '' THEN
    RAISE EXCEPTION 'Order reference cannot be empty';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE reference = btrim(p_order_reference)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_reference;
  END IF;
  IF v_order.status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'Order % is not paid (status: %)', p_order_reference, v_order.status;
  END IF;

  v_user_id := v_order.user_id;
  IF v_user_id IS NULL THEN
    SELECT u.id INTO v_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(btrim(v_order.email))
    ORDER BY u.created_at DESC
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      UPDATE public.orders
      SET user_id = v_user_id, updated_at = now()
      WHERE reference = v_order.reference AND user_id IS NULL;
    END IF;
  END IF;

  INSERT INTO public.order_items(order_reference, product_id, unit_price_ngn, quantity)
  VALUES (v_order.reference, v_order.product_id, v_order.amount, 1)
  ON CONFLICT (order_reference, product_id) DO NOTHING;

  FOR v_item IN
    SELECT * FROM public.order_items WHERE order_reference = v_order.reference
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % for order % is missing from catalogue',
        v_item.product_id, v_order.reference;
    END IF;

    IF v_product.product_type = 'cohort_plan' THEN
      v_plan_id := CASE
        WHEN v_product.id LIKE '%ultimate%' OR v_product.id = 'ultimate' THEN 'cohort-ultimate'
        WHEN v_product.id LIKE '%mastery%' OR v_product.id = 'mastery' THEN 'cohort-mastery'
        WHEN v_product.id LIKE '%core%' OR v_product.id = 'core' THEN 'cohort-core'
        ELSE v_product.id
      END;

      v_is_monthly := (v_product.id = 'cohort-core-monthly');

      -- Coverage counts from the day they pay (or class start, if earlier).
      v_plan_starts_at := GREATEST(
        COALESCE(v_order.paid_at, v_order.created_at, now()),
        '2026-11-30 00:00:00+00'::timestamptz
      );

      IF v_plan_id = 'cohort-ultimate' THEN
        v_plan_expires_at := NULL; -- through UTME 2027 (date not yet announced)
      ELSIF v_is_monthly THEN
        v_plan_expires_at := v_plan_starts_at + interval '1 month';
      ELSE
        v_plan_expires_at := v_plan_starts_at + interval '90 days';
      END IF;

      INSERT INTO public.entitlements(
        user_id, customer_email, resource_id, grant_source,
        source_order_reference, plan_id, starts_at, expires_at, is_active, metadata
      )
      VALUES (
        v_user_id, lower(btrim(v_order.email)), v_plan_id, 'purchase',
        v_order.reference, v_plan_id, v_plan_starts_at, v_plan_expires_at, true,
        jsonb_build_object(
          'billing_cycle', CASE WHEN v_is_monthly THEN 'monthly' WHEN v_plan_id = 'cohort-ultimate' THEN 'through_utme_2027' ELSE 'cohort_90_days' END,
          'product_name', v_product.title,
          'paid_amount_ngn', v_order.amount,
          'has_founder_mentorship', (v_plan_id = 'cohort-ultimate')
        )
      )
      ON CONFLICT (source_order_reference, resource_id)
        WHERE source_order_reference IS NOT NULL
      DO NOTHING;
      v_count := v_count + 1;

      IF v_product.bundle_item_ids IS NOT NULL THEN
        FOREACH v_resource_id IN ARRAY v_product.bundle_item_ids LOOP
          INSERT INTO public.entitlements(
            user_id, customer_email, resource_id, grant_source,
            source_order_reference, plan_id, starts_at, expires_at, is_active, metadata
          )
          VALUES (
            v_user_id, lower(btrim(v_order.email)), v_resource_id, 'plan_inclusion',
            v_order.reference, v_plan_id,
            COALESCE(v_order.paid_at, v_order.created_at, now()),
            NULL, true,
            jsonb_build_object('included_by_plan', v_plan_id, 'lifetime_access', true)
          )
          ON CONFLICT (source_order_reference, resource_id)
            WHERE source_order_reference IS NOT NULL
          DO NOTHING;
          v_count := v_count + 1;
        END LOOP;
      END IF;

    ELSIF v_product.product_type = 'resource' THEN
      INSERT INTO public.entitlements(
        user_id, customer_email, resource_id, grant_source,
        source_order_reference, plan_id, starts_at, expires_at, is_active, metadata
      )
      VALUES (
        v_user_id, lower(btrim(v_order.email)), v_product.id, 'purchase',
        v_order.reference, NULL, COALESCE(v_order.paid_at, v_order.created_at, now()),
        NULL, true, jsonb_build_object('lifetime_access', true)
      )
      ON CONFLICT (source_order_reference, resource_id)
        WHERE source_order_reference IS NOT NULL
      DO NOTHING;
      v_count := v_count + 1;

    ELSIF v_product.product_type = 'bundle' THEN
      INSERT INTO public.entitlements(
        user_id, customer_email, resource_id, grant_source,
        source_order_reference, plan_id, starts_at, expires_at, is_active, metadata
      )
      VALUES (
        v_user_id, lower(btrim(v_order.email)), v_product.id, 'purchase',
        v_order.reference, NULL, COALESCE(v_order.paid_at, v_order.created_at, now()),
        NULL, true, jsonb_build_object('lifetime_access', true)
      )
      ON CONFLICT (source_order_reference, resource_id)
        WHERE source_order_reference IS NOT NULL
      DO NOTHING;
      v_count := v_count + 1;

      IF v_product.bundle_item_ids IS NOT NULL THEN
        FOREACH v_resource_id IN ARRAY v_product.bundle_item_ids LOOP
          INSERT INTO public.entitlements(
            user_id, customer_email, resource_id, grant_source,
            source_order_reference, plan_id, starts_at, expires_at, is_active, metadata
          )
          VALUES (
            v_user_id, lower(btrim(v_order.email)), v_resource_id, 'bundle_inclusion',
            v_order.reference, v_product.id, COALESCE(v_order.paid_at, v_order.created_at, now()),
            NULL, true, jsonb_build_object('lifetime_access', true)
          )
          ON CONFLICT (source_order_reference, resource_id)
            WHERE source_order_reference IS NOT NULL
          DO NOTHING;
          v_count := v_count + 1;
        END LOOP;
      END IF;
    ELSE
      RAISE EXCEPTION 'Unsupported product type % for product %',
        v_product.product_type, v_product.id;
    END IF;
  END LOOP;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.entitlements
    SET user_id = v_user_id, updated_at = now()
    WHERE source_order_reference = v_order.reference AND user_id IS NULL;
  END IF;

  RETURN v_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.grant_order_entitlements(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_order_entitlements(text) TO service_role;
