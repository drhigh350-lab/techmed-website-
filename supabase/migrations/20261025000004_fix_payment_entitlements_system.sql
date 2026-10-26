-- ==============================================================================
-- TECHMED RESOURCE LIBRARY & COHORT ENROLMENT — MIGRATION 20261025000004
-- File: supabase/migrations/20261025000004_fix_payment_entitlements_system.sql
-- ==============================================================================
-- Purpose:
-- 1. Complete and authoritative product catalogue seeding (Core monthly/earlybird/standard,
--    Mastery earlybird/standard, Ultimate, and aliases).
-- 2. Grant the purchased plan ITSELF as an entitlement alongside its bundled resources.
-- 3. Accurate start date and monthly subscription expiry (Nov 30 2026 start date rules).
-- 4. Accurate 3-month cohort plan expiry: explicitly through UTME 2027 completion (2027-05-31).
-- 5. Lifetime access for standalone books and bundled booster inclusions in Mastery & Ultimate.
-- 6. Strict idempotency: retries and duplicate webhooks never create duplicate entitlements
--    or extend subscription durations.
-- 7. Preserve standalone lifetime purchases when cohort plans expire.
-- 8. Account resolution: automatically resolve customer user_id from auth.users via email.
-- 9. Restrict Ultimate benefits & founder mentorship to Ultimate customers only.
-- 10. Data repair for verified order techmed_cohort_core_monthly_1792965066749_e1fe8821.
-- ==============================================================================

-- 1. SEED AUTHORITATIVE PRODUCT CATALOGUE WITH ALL COHORT PLANS AND ALIASES
INSERT INTO public.products (
  id, title, subtitle, product_type, price_ngn, requires_university, is_bundle, bundle_item_ids
)
VALUES
  -- Standalone Science Boosters
  ('chemistry-booster', 'Chemistry Booster System', 'High-yield revision for maximum Chemistry score', 'resource', 5000, false, false, '{}'),
  ('biology-booster', 'Biology Booster System', 'Memory aids, recall shortcuts and frequently tested patterns', 'resource', 3000, false, false, '{}'),
  ('physics-booster', 'Physics Booster System', 'Master calculations, solve smart, score high', 'resource', 3000, false, false, '{}'),
  ('booster-bundle', 'All Science Boosters Bundle', 'Chemistry, Biology, and Physics Booster Systems', 'bundle', 9000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']),

  -- Post-UTME Resources & University Research Files
  ('post-utme-pq', 'Post Brainstorming Hub — All Universities', 'Structured system for Post-UTME preparation', 'resource', 3000, true, false, '{}'),
  ('post-utme-brainstorming-hub', 'Post Brainstorming Hub — All Universities', 'Structured system for Post-UTME preparation', 'resource', 3000, true, false, '{}'),
  ('research-file', 'Detailed University Research File', '5-year Post-UTME trends and departmental cut-offs', 'resource', 1000, true, false, '{}'),
  ('university-research-file', 'Detailed University Research File', '5-year Post-UTME trends and departmental cut-offs', 'resource', 1000, true, false, '{}'),

  -- UTME 2027 Core Track Plans (No included boosters; live classes & CBT)
  ('cohort-core-monthly', 'TECHMED Core (1-Month Subscription)', 'Live classes, daily drills, and Kairo CBT (Monthly Renewal)', 'cohort_plan', 7000, false, false, '{}'),
  ('cohort-core-earlybird', 'TECHMED Core (3-Month Early-Bird)', '12-week live classes across 5 science subjects and Kairo CBT', 'cohort_plan', 15000, false, false, '{}'),
  ('cohort-core-standard', 'TECHMED Core (3-Month Standard)', '12-week live classes across 5 science subjects and Kairo CBT', 'cohort_plan', 18000, false, false, '{}'),
  ('cohort-core', 'TECHMED Core (3-Month Early-Bird)', '12-week live classes across 5 science subjects and Kairo CBT', 'cohort_plan', 15000, false, false, '{}'),
  ('core', 'TECHMED Core (3-Month Early-Bird)', '12-week live classes across 5 science subjects and Kairo CBT', 'cohort_plan', 15000, false, false, '{}'),

  -- UTME 2027 Mastery Track Plans (Core + All 3 Science Booster Systems & Formula Manuals)
  ('cohort-mastery-earlybird', 'TECHMED Mastery (3-Month Early-Bird)', 'Complete Core plus 11 science formula workbooks and 3 booster systems', 'cohort_plan', 20000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']),
  ('cohort-mastery-standard', 'TECHMED Mastery (3-Month Standard)', 'Complete Core plus 11 science formula workbooks and 3 booster systems', 'cohort_plan', 25000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']),
  ('cohort-mastery', 'TECHMED Mastery (3-Month Early-Bird)', 'Complete Core plus 11 science formula workbooks and 3 booster systems', 'cohort_plan', 20000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']),
  ('mastery', 'TECHMED Mastery (3-Month Early-Bird)', 'Complete Core plus 11 science formula workbooks and 3 booster systems', 'cohort_plan', 20000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']),

  -- UTME 2027 Ultimate Track Plan (Full Programme through UTME 2027 + Bootcamps + Mentorship)
  ('cohort-ultimate', 'TECHMED Ultimate (Full UTME 2027 Access)', 'Mastery package + 3 Specialist Bootcamps + Post-UTME Brainstorming Hub + Founder Mentorship', 'cohort_plan', 40000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster', 'post-utme-pq']),
  ('ultimate', 'TECHMED Ultimate (Full UTME 2027 Access)', 'Mastery package + 3 Specialist Bootcamps + Post-UTME Brainstorming Hub + Founder Mentorship', 'cohort_plan', 40000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster', 'post-utme-pq'])
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  product_type = EXCLUDED.product_type,
  price_ngn = EXCLUDED.price_ngn,
  requires_university = EXCLUDED.requires_university,
  is_bundle = EXCLUDED.is_bundle,
  bundle_item_ids = EXCLUDED.bundle_item_ids,
  updated_at = timezone('utc'::text, now());

-- 2. ENSURE ORDERS TABLE HAS ALL MODERN COLUMNS
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'paystack';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. ENSURE ENTITLEMENTS TABLE HAS starts_at AND UNIQUE IDEMPOTENCY INDEX
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_order_resource_unique
ON public.entitlements (source_order_reference, resource_id)
WHERE source_order_reference IS NOT NULL;

-- 4. HARDENED, COMPLETE GRANT_ORDER_ENTITLEMENTS FUNCTION
CREATE OR REPLACE FUNCTION public.grant_order_entitlements(p_order_reference TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_product RECORD;
  v_bundled_id TEXT;
  v_user_id UUID;
  v_grants_count INTEGER := 0;
  v_paid_at TIMESTAMPTZ;
  v_starts_at TIMESTAMPTZ;
  v_plan_expiry TIMESTAMPTZ;
  v_is_monthly BOOLEAN;
  v_canonical_plan_id TEXT;
  v_cohort_start_threshold TIMESTAMPTZ := '2026-11-30 00:00:00+01'::timestamptz;
BEGIN
  -- Strict input check
  IF p_order_reference IS NULL OR trim(p_order_reference) = '' THEN
    RAISE EXCEPTION 'Order reference cannot be empty';
  END IF;

  -- 1. Fetch verified order with row-level locking
  SELECT * INTO v_order
  FROM public.orders
  WHERE reference = trim(p_order_reference)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order "%" not found in database', p_order_reference;
  END IF;

  -- 2. Enforce that only paid orders receive entitlements
  IF v_order.status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'Order "%" is not in paid status (current status: "%")', p_order_reference, v_order.status;
  END IF;

  -- 3. Resolve customer account: use user_id on order or link via verified email
  v_user_id := v_order.user_id;
  IF v_user_id IS NULL AND v_order.email IS NOT NULL THEN
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower(trim(v_order.email))
    LIMIT 1;

    -- If a matching Supabase Auth user exists, link it to the order
    IF v_user_id IS NOT NULL THEN
      UPDATE public.orders
      SET user_id = v_user_id, updated_at = timezone('utc'::text, now())
      WHERE reference = p_order_reference;
    END IF;
  END IF;

  -- Determine verified payment timestamp
  v_paid_at := COALESCE(v_order.paid_at, v_order.created_at, timezone('utc'::text, now()));

  -- 4. Backfill order_items if not already present
  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_reference = p_order_reference) THEN
    IF v_order.product_id IS NOT NULL THEN
      INSERT INTO public.order_items (order_reference, product_id, unit_price_ngn, quantity)
      VALUES (p_order_reference, trim(v_order.product_id), COALESCE(v_order.amount, 0), 1)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 5. Process each ordered product and grant entitlements
  FOR v_item IN SELECT * FROM public.order_items WHERE order_reference = p_order_reference LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product "%" referenced in order "%" not found in catalogue', v_item.product_id, p_order_reference;
    END IF;

    -- Determine canonical plan ID for cohort groupings
    v_canonical_plan_id := CASE
      WHEN v_product.id LIKE '%ultimate%' THEN 'cohort-ultimate'
      WHEN v_product.id LIKE '%mastery%' THEN 'cohort-mastery'
      WHEN v_product.id LIKE '%core%' THEN 'cohort-core'
      ELSE v_product.id
    END;

    -- Determine subscription, start date, and expiry rules
    -- Rule A: Standalone resources and bundles are PERMANENT LIFETIME (expires_at IS NULL, starts immediately)
    IF v_product.product_type IN ('resource', 'bundle') THEN
      v_starts_at := v_paid_at;
      v_plan_expiry := NULL;

      -- Grant the resource or bundle item
      IF v_product.product_type = 'resource' THEN
        INSERT INTO public.entitlements (
          user_id,
          customer_email,
          resource_id,
          grant_source,
          source_order_reference,
          plan_id,
          starts_at,
          expires_at,
          is_active
        )
        VALUES (
          v_user_id,
          lower(trim(v_order.email)),
          v_product.id,
          'purchase',
          p_order_reference,
          NULL,
          v_starts_at,
          NULL, -- Permanent Lifetime Access
          true
        )
        ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
        DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, public.entitlements.user_id),
          customer_email = EXCLUDED.customer_email,
          starts_at = EXCLUDED.starts_at,
          is_active = true,
          updated_at = timezone('utc'::text, now());

        v_grants_count := v_grants_count + 1;

      ELSIF v_product.product_type = 'bundle' THEN
        -- Grant the bundle header
        INSERT INTO public.entitlements (
          user_id,
          customer_email,
          resource_id,
          grant_source,
          source_order_reference,
          plan_id,
          starts_at,
          expires_at,
          is_active
        )
        VALUES (
          v_user_id,
          lower(trim(v_order.email)),
          v_product.id,
          'purchase',
          p_order_reference,
          NULL,
          v_starts_at,
          NULL,
          true
        )
        ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
        DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, public.entitlements.user_id),
          customer_email = EXCLUDED.customer_email,
          starts_at = EXCLUDED.starts_at,
          is_active = true,
          updated_at = timezone('utc'::text, now());

        v_grants_count := v_grants_count + 1;

        -- Grant each included resource in the bundle with lifetime access
        FOREACH v_bundled_id IN ARRAY v_product.bundle_item_ids LOOP
          INSERT INTO public.entitlements (
            user_id,
            customer_email,
            resource_id,
            grant_source,
            source_order_reference,
            plan_id,
            starts_at,
            expires_at,
            is_active
          )
          VALUES (
            v_user_id,
            lower(trim(v_order.email)),
            v_bundled_id,
            'bundle_inclusion',
            p_order_reference,
            v_product.id,
            v_starts_at,
            NULL, -- Permanent Lifetime Access
            true
          )
          ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
          DO UPDATE SET
            user_id = COALESCE(EXCLUDED.user_id, public.entitlements.user_id),
            customer_email = EXCLUDED.customer_email,
            starts_at = EXCLUDED.starts_at,
            is_active = true,
            updated_at = timezone('utc'::text, now());

          v_grants_count := v_grants_count + 1;
        END LOOP;
      END IF;

    -- Rule B: Cohort Plans (Core, Mastery, Ultimate)
    ELSIF v_product.product_type = 'cohort_plan' THEN
      v_is_monthly := (v_product.id LIKE '%monthly%');

      -- Start Date & Expiry Date Rules:
      -- Cohort classes officially commence on 30 November 2026 (Africa/Lagos timezone, UTC+1).
      -- Payments completed before Nov 30, 2026:
      --   - starts_at = '2026-11-30 00:00:00+01'
      --   - Core monthly expires 1 month after commencement ('2026-12-30 23:59:59+01')
      --   - 3-month cohort plans expire through UTME 2027 completion ('2027-05-31 23:59:59+01')
      -- Payments completed on or after Nov 30, 2026:
      --   - starts_at = payment date
      --   - Core monthly expires exactly 1 month after payment date
      --   - 3-month cohort plans expire through UTME 2027 completion ('2027-05-31 23:59:59+01')
      IF v_paid_at < v_cohort_start_threshold THEN
        v_starts_at := v_cohort_start_threshold;
        IF v_is_monthly THEN
          v_plan_expiry := '2026-12-30 23:59:59+01'::timestamptz;
        ELSE
          v_plan_expiry := '2027-05-31 23:59:59+01'::timestamptz;
        END IF;
      ELSE
        v_starts_at := v_paid_at;
        IF v_is_monthly THEN
          v_plan_expiry := v_starts_at + INTERVAL '1 month';
        ELSE
          v_plan_expiry := '2027-05-31 23:59:59+01'::timestamptz;
        END IF;
      END IF;

      -- STEP 5A: Grant the Cohort Plan ITSELF as an entitlement
      INSERT INTO public.entitlements (
        user_id,
        customer_email,
        resource_id,
        grant_source,
        source_order_reference,
        plan_id,
        starts_at,
        expires_at,
        is_active,
        metadata
      )
      VALUES (
        v_user_id,
        lower(trim(v_order.email)),
        v_canonical_plan_id,
        'purchase',
        p_order_reference,
        v_canonical_plan_id,
        v_starts_at,
        v_plan_expiry,
        true,
        jsonb_build_object(
          'billing_cycle', CASE WHEN v_is_monthly THEN 'monthly' ELSE 'upfront_3_month' END,
          'product_name', v_product.title,
          'paid_amount_ngn', v_order.amount,
          'has_founder_mentorship', (v_canonical_plan_id = 'cohort-ultimate')
        )
      )
      ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
      DO UPDATE SET
        user_id = COALESCE(EXCLUDED.user_id, public.entitlements.user_id),
        customer_email = EXCLUDED.customer_email,
        starts_at = EXCLUDED.starts_at,
        is_active = true,
        expires_at = EXCLUDED.expires_at,
        metadata = EXCLUDED.metadata,
        updated_at = timezone('utc'::text, now());

      v_grants_count := v_grants_count + 1;

      -- STEP 5B: Grant included resources for Mastery and Ultimate (Core has no free booster inclusions)
      -- Authoritative rule: Included study books and boosters receive LIFETIME access (expires_at = NULL)
      -- and activate immediately (starts_at = v_paid_at) so students can study right away.
      -- The cohort class itself expires at v_plan_expiry.
      FOREACH v_bundled_id IN ARRAY v_product.bundle_item_ids LOOP
        INSERT INTO public.entitlements (
          user_id,
          customer_email,
          resource_id,
          grant_source,
          source_order_reference,
          plan_id,
          starts_at,
          expires_at,
          is_active,
          metadata
        )
        VALUES (
          v_user_id,
          lower(trim(v_order.email)),
          v_bundled_id,
          'plan_inclusion',
          p_order_reference,
          v_canonical_plan_id,
          v_paid_at, -- Immediate start for booster manuals
          NULL, -- Permanent Lifetime Access for study resources included in Mastery & Ultimate
          true,
          jsonb_build_object('included_by_plan', v_canonical_plan_id)
        )
        ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
        DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, public.entitlements.user_id),
          customer_email = EXCLUDED.customer_email,
          starts_at = EXCLUDED.starts_at,
          is_active = true,
          expires_at = EXCLUDED.expires_at,
          updated_at = timezone('utc'::text, now());

        v_grants_count := v_grants_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- 6. Update user_id on entitlements for this reference if newly resolved
  IF v_user_id IS NOT NULL THEN
    UPDATE public.entitlements
    SET user_id = v_user_id
    WHERE source_order_reference = p_order_reference AND user_id IS NULL;
  END IF;

  RETURN v_grants_count;
END;
$$;

-- 5. UPDATE has_active_resource_access FUNCTION WITH starts_at ENFORCEMENT
CREATE OR REPLACE FUNCTION public.has_active_resource_access(
  p_user_id UUID,
  p_email TEXT,
  p_resource_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.entitlements e
    WHERE (
      (p_user_id IS NOT NULL AND e.user_id = p_user_id)
      OR (p_email IS NOT NULL AND lower(e.customer_email) = lower(trim(p_email)))
    )
    AND (
      e.resource_id = p_resource_id
      OR (p_resource_id = 'post-utme-brainstorming-hub' AND e.resource_id = 'post-utme-pq')
      OR (p_resource_id = 'post-utme-pq' AND e.resource_id = 'post-utme-brainstorming-hub')
    )
    AND e.is_active = true
    AND (e.starts_at IS NULL OR e.starts_at <= timezone('utc'::text, now()))
    AND (e.expires_at IS NULL OR e.expires_at > timezone('utc'::text, now()))
  );
END;
$$;

-- 6. UPDATE active_user_entitlements VIEW
CREATE OR REPLACE VIEW public.active_user_entitlements AS
SELECT
  e.id AS entitlement_id,
  e.user_id,
  e.customer_email,
  e.resource_id,
  p.title AS resource_title,
  p.product_type,
  e.grant_source,
  e.plan_id,
  e.starts_at,
  e.granted_at,
  e.expires_at,
  (e.expires_at IS NULL) AS is_lifetime
FROM public.entitlements e
JOIN public.products p ON p.id = e.resource_id
WHERE e.is_active = true
  AND (e.starts_at IS NULL OR e.starts_at <= timezone('utc'::text, now()))
  AND (e.expires_at IS NULL OR e.expires_at > timezone('utc'::text, now()));

-- 7. RE-AFFIRM TRIGGER ON ORDER PAID STATUS
CREATE OR REPLACE FUNCTION public.trigger_on_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.grant_order_entitlements(NEW.reference);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_paid ON public.orders;
CREATE TRIGGER on_order_status_paid
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_on_order_paid();

-- 8. REPAIR EXISTING PRODUCTION ORDER FOR wisdomjohnson207@gmail.com
-- Reference: techmed_cohort_core_monthly_1792965066749_e1fe8821
-- Plan: TECHMED Core (1-Month Subscription)
-- Enforces: Core status only (no Ultimate, no Mastery, no Founder Mentorship)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.orders WHERE reference = 'techmed_cohort_core_monthly_1792965066749_e1fe8821') THEN
    -- Clean up any inaccurate entitlements (such as erroneous Ultimate or booster records)
    DELETE FROM public.entitlements
    WHERE source_order_reference = 'techmed_cohort_core_monthly_1792965066749_e1fe8821'
      AND resource_id <> 'cohort-core';

    DELETE FROM public.entitlements
    WHERE (user_id = '032a4583-f869-432f-9d82-e9da31043891' OR lower(customer_email) = 'wisdomjohnson207@gmail.com')
      AND resource_id = 'cohort-ultimate';

    -- Ensure order has authoritative parameters
    UPDATE public.orders
    SET
      product_id = 'cohort-core-monthly',
      product_name = 'TECHMED Core (1-Month Subscription)',
      amount = 7000,
      status = 'paid',
      user_id = '032a4583-f869-432f-9d82-e9da31043891',
      email = 'wisdomjohnson207@gmail.com',
      paid_at = COALESCE(paid_at, created_at, '2026-10-25 18:00:00+01'::timestamptz),
      updated_at = timezone('utc'::text, now())
    WHERE reference = 'techmed_cohort_core_monthly_1792965066749_e1fe8821';

    -- Grant authoritative entitlement (starts Nov 30 2026, expires Dec 30 2026)
    PERFORM public.grant_order_entitlements('techmed_cohort_core_monthly_1792965066749_e1fe8821');
  END IF;
END;
$$;

-- 9. SECURE FUNCTION GRANTS
GRANT EXECUTE ON FUNCTION public.grant_order_entitlements(TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.claim_order_reference(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_active_resource_access(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT SELECT ON public.products TO anon, authenticated, service_role;
GRANT SELECT ON public.active_user_entitlements TO authenticated, service_role;
