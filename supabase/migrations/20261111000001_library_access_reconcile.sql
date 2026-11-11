-- ==============================================================================
-- TECHMED LIBRARY — PRODUCTION RECONCILIATION (Nov 2026)
-- Migration: 20261111000001_library_access_reconcile.sql
-- ==============================================================================
-- Context: the earlier repo migrations (20261023…–20261102…) were never
-- applied to production. Production instead has its own working payment
-- engine (products, orders, order_items, entitlements and
-- grant_order_entitlements). This migration is written AGAINST PRODUCTION
-- AS IT IS and only ADDS what is missing. It does not replace
-- grant_order_entitlements and does not touch any non-TECHMED tables.
--
-- What it does:
--  1. Closes a privacy leak: orders were readable by anyone holding the
--     public anon key. Students now only see their own orders; anonymous
--     receipt pages use get_order_status(reference), which returns no PII.
--  2. Admin role (admin_users table + is_admin()), used by RLS and RPCs.
--  3. One server-side access rule: resource_access_for() / has_resource_access()
--     / my_library(). Every page asks the same question.
--  4. Bundles and plans: adding an item to a bundle/plan's bundle_item_ids
--     automatically grants it to existing holders (lifetime rows), so future
--     items (e.g. audiobooks) need a data change only, never code.
--  5. Manual access grants / revokes for admins, recorded and auditable.
--  6. reading_progress table (resume reading across devices).
--  7. Catalogue: compare-at price column; the two Think Smart e-books;
--     Mastery and Ultimate include them (as listed on the pricing page).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADMIN ROLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- No policies: only service role / SQL editor can manage admins.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. ORDERS PRIVACY
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "anon can check order status by reference" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.reference = order_items.order_reference
        AND (o.user_id = auth.uid()
             OR lower(o.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
             OR public.is_admin())
    )
  );

-- Receipt pages (download.html, payment callback) know the reference from the
-- Paystack redirect. They get status + product only — never email or name.
CREATE OR REPLACE FUNCTION public.get_order_status(p_reference TEXT)
RETURNS TABLE (reference TEXT, status TEXT, product_id TEXT, product_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.reference, o.status, o.product_id, o.product_name
  FROM public.orders o
  WHERE o.reference = btrim(p_reference)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_order_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_status(TEXT) TO anon, authenticated;

-- Social-proof counter used on the public site (count only, no PII).
CREATE OR REPLACE FUNCTION public.get_unique_verified_students_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT lower(email))::INTEGER FROM public.orders WHERE status = 'paid';
$$;
REVOKE ALL ON FUNCTION public.get_unique_verified_students_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unique_verified_students_count() TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. ENTITLEMENTS: admin management policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all entitlements" ON public.entitlements;
CREATE POLICY "Admins can view all entitlements" ON public.entitlements
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert entitlements" ON public.entitlements;
CREATE POLICY "Admins can insert entitlements" ON public.entitlements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update entitlements" ON public.entitlements;
CREATE POLICY "Admins can update entitlements" ON public.entitlements
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_entitlements_user_resource ON public.entitlements (user_id, resource_id);

-- ------------------------------------------------------------------------------
-- 4. CATALOGUE
-- ------------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS compare_at_price_ngn NUMERIC
  CHECK (compare_at_price_ngn IS NULL OR compare_at_price_ngn >= 0);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Maps checkout aliases / plan variants to the id stored on entitlements.
CREATE OR REPLACE FUNCTION public.canonical_product_id(p_id TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_id IS NULL THEN NULL
    WHEN p_id IN ('ultimate') OR p_id LIKE 'cohort-ultimate%' THEN 'cohort-ultimate'
    WHEN p_id IN ('mastery') OR p_id LIKE 'cohort-mastery%' THEN 'cohort-mastery'
    WHEN p_id IN ('core') OR p_id LIKE 'cohort-core%' THEN 'cohort-core'
    WHEN p_id = 'post-utme-brainstorming-hub' THEN 'post-utme-pq'
    WHEN p_id = 'university-research-file' THEN 'research-file'
    WHEN p_id = 'all-science-boosters-bundle' THEN 'booster-bundle'
    ELSE p_id
  END;
$$;

-- ------------------------------------------------------------------------------
-- 5. ONE ACCESS RULE
-- ------------------------------------------------------------------------------
-- A student can read resource X when ANY of these is true:
--   a) an active entitlement row exists for X (purchase, plan/bundle
--      inclusion, admin grant, scholarship, trial), started and not expired;
--   b) they hold an active bundle/plan entitlement whose product lists X
--      (safety net if an inclusion row was never written).
-- Plan inclusion rows are written with expires_at = NULL, so books from a
-- plan remain owned after the plan itself expires (lifetime ownership).
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
      AND (e.expires_at IS NULL OR e.expires_at > now())
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

-- For the logged-in student (identity taken from the JWT, never from input).
CREATE OR REPLACE FUNCTION public.has_resource_access(p_resource_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE public.resource_access_for(auth.uid(), auth.jwt() ->> 'email', p_resource_id)
  END;
$$;
REVOKE ALL ON FUNCTION public.has_resource_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_resource_access(TEXT) TO authenticated;

-- Every resource-type product the logged-in student can open, with how.
CREATE OR REPLACE FUNCTION public.my_library()
RETURNS TABLE (resource_id TEXT, title TEXT, grant_source TEXT, granted_at TIMESTAMPTZ, expires_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.title,
         (SELECT e.grant_source FROM public.entitlements e
           WHERE public.canonical_product_id(e.resource_id) = public.canonical_product_id(p.id)
             AND (e.user_id = auth.uid() OR lower(e.customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
             AND e.is_active AND e.revoked_at IS NULL
           ORDER BY (e.expires_at IS NULL) DESC, e.granted_at LIMIT 1),
         (SELECT min(e.granted_at) FROM public.entitlements e
           WHERE public.canonical_product_id(e.resource_id) = public.canonical_product_id(p.id)
             AND (e.user_id = auth.uid() OR lower(e.customer_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
             AND e.is_active AND e.revoked_at IS NULL),
         NULL::TIMESTAMPTZ
  FROM public.products p
  WHERE auth.uid() IS NOT NULL
    AND p.product_type = 'resource'
    AND p.id = public.canonical_product_id(p.id)
    AND public.resource_access_for(auth.uid(), auth.jwt() ->> 'email', p.id);
$$;
REVOKE ALL ON FUNCTION public.my_library() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_library() TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. BUNDLES/PLANS: new items reach existing holders automatically
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_bundle_inclusions(p_product_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_canonical TEXT;
  v_source TEXT;
  v_count INTEGER := 0;
  v_n INTEGER;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND OR v_product.product_type NOT IN ('bundle', 'cohort_plan')
     OR coalesce(array_length(v_product.bundle_item_ids, 1), 0) = 0 THEN
    RETURN 0;
  END IF;

  v_canonical := public.canonical_product_id(v_product.id);
  v_source := CASE WHEN v_product.product_type = 'bundle' THEN 'bundle_inclusion' ELSE 'plan_inclusion' END;

  -- Holders: bundle owners (lifetime) and CURRENTLY ACTIVE plan holders.
  INSERT INTO public.entitlements (
    user_id, customer_email, resource_id, grant_source, source_order_reference,
    plan_id, starts_at, expires_at, is_active, metadata
  )
  SELECT DISTINCT ON (lower(h.customer_email), item.id)
    h.user_id, lower(h.customer_email), item.id, v_source, h.source_order_reference,
    v_canonical, now(), NULL, true,
    jsonb_build_object('included_by', v_canonical, 'lifetime_access', true, 'added_by_sync', true)
  FROM public.entitlements h
  CROSS JOIN LATERAL unnest(v_product.bundle_item_ids) AS item(id)
  WHERE h.resource_id = v_canonical
    AND h.is_active AND h.revoked_at IS NULL
    AND (h.expires_at IS NULL OR h.expires_at > now())
    AND EXISTS (SELECT 1 FROM public.products ip WHERE ip.id = item.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.entitlements x
      WHERE lower(x.customer_email) = lower(h.customer_email)
        AND x.resource_id = item.id
        AND x.is_active AND x.revoked_at IS NULL
        AND (x.expires_at IS NULL OR x.expires_at > now())
    )
  ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
  DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_count := v_count + v_n;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_bundle_inclusions(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_products_sync_inclusions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bundle_item_ids IS DISTINCT FROM OLD.bundle_item_ids THEN
    PERFORM public.sync_bundle_inclusions(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sync_inclusions ON public.products;
CREATE TRIGGER products_sync_inclusions
  AFTER UPDATE OF bundle_item_ids ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.trg_products_sync_inclusions();

-- ------------------------------------------------------------------------------
-- 7. MANUAL GRANTS (competition prizes, scholarships, promos)
-- ------------------------------------------------------------------------------
-- Works even if the student hasn't registered yet: access attaches to the
-- email and is picked up the moment they sign in with it. Never overwrites
-- other entitlements; each grant is its own auditable row.
CREATE OR REPLACE FUNCTION public.admin_grant_access(
  p_email TEXT,
  p_product_id TEXT,
  p_reason TEXT DEFAULT NULL,
  p_grant_source TEXT DEFAULT 'admin_grant',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(btrim(p_email));
  v_product public.products%ROWTYPE;
  v_user_id UUID;
  v_id UUID;
  v_item TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only TECHMED administrators can grant access' USING ERRCODE = '42501';
  END IF;
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Enter a valid student email address';
  END IF;
  IF p_grant_source NOT IN ('admin_grant', 'scholarship', 'trial') THEN
    RAISE EXCEPTION 'Grant type must be admin_grant, scholarship or trial';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = public.canonical_product_id(p_product_id) OR id = p_product_id
  ORDER BY (id = p_product_id) DESC LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown product: %', p_product_id;
  END IF;

  SELECT u.id INTO v_user_id FROM auth.users u WHERE lower(u.email) = v_email ORDER BY u.created_at LIMIT 1;

  IF public.resource_access_for(v_user_id, v_email, v_product.id) AND p_expires_at IS NULL
     AND v_product.product_type = 'resource' THEN
    RETURN jsonb_build_object('success', true, 'already_had_access', true,
      'message', v_email || ' already has access to ' || v_product.title);
  END IF;

  INSERT INTO public.entitlements (
    user_id, customer_email, resource_id, grant_source, plan_id,
    starts_at, expires_at, is_active, granted_by, metadata
  ) VALUES (
    v_user_id, v_email, public.canonical_product_id(v_product.id), p_grant_source, NULL,
    now(), p_expires_at, true, auth.uid(),
    jsonb_build_object('reason', p_reason, 'product_title', v_product.title, 'granted_via', 'admin_grant_access')
  ) RETURNING id INTO v_id;

  -- Granting a bundle grants its items too (lifetime unless an expiry was given).
  IF v_product.product_type = 'bundle' THEN
    FOREACH v_item IN ARRAY v_product.bundle_item_ids LOOP
      INSERT INTO public.entitlements (
        user_id, customer_email, resource_id, grant_source, plan_id,
        starts_at, expires_at, is_active, granted_by, metadata
      ) VALUES (
        v_user_id, v_email, v_item, 'bundle_inclusion', v_product.id,
        now(), p_expires_at, true, auth.uid(),
        jsonb_build_object('reason', p_reason, 'granted_via', 'admin_grant_access', 'parent_grant', v_id)
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'entitlement_id', v_id,
    'account_exists', v_user_id IS NOT NULL,
    'message', 'Access to ' || v_product.title || ' granted to ' || v_email);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_grant_access(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_access(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_access(p_entitlement_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only TECHMED administrators can revoke access' USING ERRCODE = '42501';
  END IF;
  IF coalesce(btrim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'A reason is required to revoke access';
  END IF;
  UPDATE public.entitlements
  SET is_active = false, revoked_at = now(), revocation_reason = p_reason, updated_at = now(),
      metadata = metadata || jsonb_build_object('revoked_by', auth.uid())
  WHERE id = p_entitlement_id AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entitlement not found or already revoked';
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_revoke_access(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_access(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. READING PROGRESS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT,
  resource_id TEXT NOT NULL,
  document_key TEXT NOT NULL DEFAULT '',
  current_page INTEGER NOT NULL DEFAULT 1 CHECK (current_page >= 1),
  total_pages INTEGER NOT NULL DEFAULT 1 CHECK (total_pages >= 1),
  reading_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (reading_percent >= 0 AND reading_percent <= 100),
  is_finished BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reading_progress_user_resource_doc_key UNIQUE (user_id, resource_id, document_key)
);
CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read ON public.reading_progress (user_id, last_read_at DESC);
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own reading progress" ON public.reading_progress;
CREATE POLICY "Students manage own reading progress" ON public.reading_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view reading progress" ON public.reading_progress;
CREATE POLICY "Admins can view reading progress" ON public.reading_progress
  FOR SELECT TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. THINK SMART SERIES E-BOOKS + PLAN INCLUSIONS
-- ------------------------------------------------------------------------------
-- Prices confirmed by TECHMED (Nov 2026): ₦5,000 standard, ₦3,000 early bird.
INSERT INTO public.products (id, title, subtitle, product_type, price_ngn, compare_at_price_ngn, is_active, is_bundle, bundle_item_ids, requires_university, metadata)
VALUES
  ('organic-chemistry-mastery', 'Organic Chemistry Mastery',
   'Understand the Structures. Master the Reactions. Conquer the Questions.',
   'resource', 3000, 5000, true, false, '{}', false,
   jsonb_build_object('series', 'Think Smart Series', 'edition', 'First Edition 2027', 'format', 'ebook')),
  ('mole-concept-cure', 'The Mole Concept Cure',
   'Understand the Mole. Master the Calculations. Conquer the Questions.',
   'resource', 3000, 5000, true, false, '{}', false,
   jsonb_build_object('series', 'Think Smart Series', 'edition', 'Second Edition 2027', 'format', 'ebook'))
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  price_ngn = EXCLUDED.price_ngn,
  compare_at_price_ngn = EXCLUDED.compare_at_price_ngn,
  metadata = public.products.metadata || EXCLUDED.metadata,
  updated_at = now();

-- Mastery and Ultimate include both e-books (pricing page). Updating
-- bundle_item_ids fires the sync trigger, so current Mastery and Ultimate
-- students receive lifetime access immediately.
UPDATE public.products
SET bundle_item_ids = (
      SELECT array_agg(DISTINCT x ORDER BY x)
      FROM unnest(bundle_item_ids || ARRAY['organic-chemistry-mastery', 'mole-concept-cure']) AS x
    ),
    updated_at = now()
WHERE id IN ('cohort-mastery', 'cohort-mastery-earlybird', 'cohort-mastery-standard', 'mastery',
             'cohort-ultimate', 'ultimate');
