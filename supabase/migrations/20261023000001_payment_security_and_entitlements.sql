-- ==============================================================================
-- TECHMED RESOURCE LIBRARY & PAYMENT SECURITY FOUNDATION MIGRATION
-- Migration Version: 20261023000001
-- File: supabase/migrations/20261023000001_payment_security_and_entitlements.sql
-- ==============================================================================
-- Purpose:
-- 1. Preserve full compatibility with existing orders (no destructive DROP).
-- 2. Establish Supabase Auth-linked user profiles with role-based access.
-- 3. Create authoritative server-side product catalogue with immutable pricing.
-- 4. Enable multi-grant independent entitlements (standalone purchases vs plan inclusions).
-- 5. Guarantee that expired cohort plans cannot revoke separately purchased resources.
-- 6. Add auditable bank-transfer verification with administrative controls.
-- 7. Deploy secure RPC get_order_status to isolate customer PII from client code.
-- 8. Enforce strict Row Level Security (RLS) across all tables.
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USER PROFILES TABLE (Linked to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'instructor')),
  target_university TEXT,
  target_course TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Case-insensitive search index on email
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Automatic profile creation trigger on auth.users sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'TECHMED Student'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 2. AUTHORITATIVE PRODUCT CATALOGUE TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY, -- Slug matching pay-initiate and frontend identifiers
  title TEXT NOT NULL,
  subtitle TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('resource', 'bundle', 'cohort_plan', 'service')),
  price_ngn NUMERIC NOT NULL CHECK (price_ngn >= 0),
  compare_at_price_ngn NUMERIC CHECK (compare_at_price_ngn IS NULL OR compare_at_price_ngn >= price_ngn),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_bundle BOOLEAN NOT NULL DEFAULT false,
  bundle_item_ids TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  requires_university BOOLEAN NOT NULL DEFAULT false,
  file_path TEXT, -- Storage path in private paid-resources bucket
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products (product_type);

-- Seed authoritative catalogue records matching live pricing
INSERT INTO public.products (id, title, subtitle, product_type, price_ngn, requires_university, is_bundle, bundle_item_ids)
VALUES
  ('chemistry-booster', 'Chemistry Booster System', 'High-yield revision for maximum Chemistry score', 'resource', 5000, false, false, '{}'),
  ('biology-booster', 'Biology Booster System', 'Memory aids, recall shortcuts and frequently tested patterns', 'resource', 3000, false, false, '{}'),
  ('physics-booster', 'Physics Booster System', 'Master calculations, solve smart, score high', 'resource', 3000, false, false, '{}'),
  ('post-utme-pq', 'Post Brainstorming Hub — All Universities', 'Structured system for Post-UTME preparation', 'resource', 3000, true, false, '{}'),
  ('research-file', 'Detailed University Research File', '5-year Post-UTME trends and departmental cut-offs', 'resource', 1000, true, false, '{}'),
  ('booster-bundle', 'All Science Boosters Bundle', 'Chemistry, Biology, and Physics Booster Systems', 'bundle', 9000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']),
  ('cohort-core', 'TECHMED Core (UTME 2027 3-Month)', 'Structured live classes, 12-week curriculum & Kairo CBT', 'cohort_plan', 18000, false, false, '{}'),
  ('cohort-mastery', 'TECHMED Mastery (UTME 2027 3-Month)', 'Complete Core + formula workbooks & booster systems', 'cohort_plan', 25000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster']),
  ('cohort-ultimate', 'TECHMED Ultimate (UTME 2027)', 'Mastery package + Bootcamps & final revision through UTME 2027', 'cohort_plan', 40000, false, true, ARRAY['chemistry-booster', 'biology-booster', 'physics-booster', 'post-utme-pq'])
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

-- ==============================================================================
-- 3. ORDERS TABLE (Non-destructive extension of existing table)
-- ==============================================================================
-- Ensure base table exists with legacy schema if running on empty test database
CREATE TABLE IF NOT EXISTS public.orders (
  reference TEXT PRIMARY KEY,
  product_id TEXT,
  product_name TEXT,
  amount NUMERIC,
  email TEXT,
  customer_name TEXT,
  university TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  paystack_response JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Safely add modern columns without dropping or modifying existing data
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

-- Backfill total_amount from amount for legacy records if needed
UPDATE public.orders
SET total_amount = amount
WHERE total_amount IS NULL AND amount IS NOT NULL;

-- Indexes for performance and lookup
CREATE INDEX IF NOT EXISTS idx_orders_email_lower ON public.orders (lower(email));
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders (payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- ==============================================================================
-- 4. ORDER ITEMS TABLE (Normalized multi-item support)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference TEXT NOT NULL REFERENCES public.orders(reference) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id),
  unit_price_ngn NUMERIC NOT NULL CHECK (unit_price_ngn >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_reference ON public.order_items (order_reference);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items (product_id);

-- ==============================================================================
-- 5. ENTITLEMENTS TABLE (Multi-grant independent entitlement model)
-- ==============================================================================
-- Crucial Architecture Rule:
-- A user may hold MULTIPLE entitlements for the same resource from different sources.
-- Example:
--  - Grant 1: Standalone purchase (grant_source = 'purchase', expires_at = NULL)
--  - Grant 2: Cohort inclusion (grant_source = 'plan_inclusion', expires_at = '2027-02-21')
-- When Grant 2 reaches its expiration date, Grant 1 remains valid and active.
-- Expiring a plan NEVER revokes or disables a separately purchased standalone resource.
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  resource_id TEXT NOT NULL REFERENCES public.products(id),
  grant_source TEXT NOT NULL CHECK (grant_source IN ('purchase', 'bundle_inclusion', 'plan_inclusion', 'admin_grant', 'scholarship', 'trial')),
  source_order_reference TEXT REFERENCES public.orders(reference) ON DELETE SET NULL,
  plan_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ, -- NULL denotes permanent lifetime access
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_entitlements_lookup_user ON public.entitlements (user_id, resource_id, is_active);
CREATE INDEX IF NOT EXISTS idx_entitlements_lookup_email ON public.entitlements (lower(customer_email), resource_id, is_active);
CREATE INDEX IF NOT EXISTS idx_entitlements_expires_at ON public.entitlements (expires_at);
CREATE INDEX IF NOT EXISTS idx_entitlements_plan_id ON public.entitlements (plan_id);

-- Helper function to evaluate active access for a student & resource
-- An entitlement is active if is_active is TRUE AND (expires_at IS NULL OR expires_at > now())
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
      OR (p_email IS NOT NULL AND lower(e.customer_email) = lower(p_email))
    )
    AND e.resource_id = p_resource_id
    AND e.is_active = true
    AND (e.expires_at IS NULL OR e.expires_at > timezone('utc'::text, now()))
  );
END;
$$;

-- View for easy querying of currently active entitlements
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
  e.granted_at,
  e.expires_at,
  (e.expires_at IS NULL) AS is_lifetime
FROM public.entitlements e
JOIN public.products p ON p.id = e.resource_id
WHERE e.is_active = true
  AND (e.expires_at IS NULL OR e.expires_at > timezone('utc'::text, now()));

-- ==============================================================================
-- 6. BANK TRANSFERS TABLE (Auditable offline payments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference TEXT NOT NULL REFERENCES public.orders(reference) ON DELETE CASCADE,
  payer_name TEXT NOT NULL,
  payer_bank TEXT,
  payer_account_number TEXT,
  amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_order_ref ON public.bank_transfers (order_reference);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_status ON public.bank_transfers (verification_status);

-- ==============================================================================
-- 7. AUDIT & ENTITLEMENT GRANT ENGINE (Functions & Triggers)
-- ==============================================================================

-- Function to grant entitlements upon confirmed payment
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
  v_grants_count INTEGER := 0;
  v_plan_expiry TIMESTAMPTZ;
BEGIN
  -- Fetch the verified order
  SELECT * INTO v_order
  FROM public.orders
  WHERE reference = p_order_reference AND status = 'paid';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found or not in paid status', p_order_reference;
  END IF;

  -- 1. Check if order has normalized order_items; if not, backfill from product_id
  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_reference = p_order_reference) THEN
    IF v_order.product_id IS NOT NULL THEN
      INSERT INTO public.order_items (order_reference, product_id, unit_price_ngn, quantity)
      VALUES (p_order_reference, v_order.product_id, COALESCE(v_order.amount, 0), 1)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 2. Process each item in the order
  FOR v_item IN SELECT * FROM public.order_items WHERE order_reference = p_order_reference LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id;

    IF FOUND THEN
      -- Case A: Standalone Resource (Lifetime access)
      IF v_product.product_type = 'resource' THEN
        INSERT INTO public.entitlements (
          user_id,
          customer_email,
          resource_id,
          grant_source,
          source_order_reference,
          plan_id,
          expires_at,
          is_active
        )
        VALUES (
          v_order.user_id,
          v_order.email,
          v_product.id,
          'purchase',
          p_order_reference,
          NULL,
          NULL, -- Lifetime
          true
        );
        v_grants_count := v_grants_count + 1;

      -- Case B: Bundle of Resources (Lifetime access to all items in bundle)
      ELSIF v_product.product_type = 'bundle' THEN
        FOREACH v_bundled_id IN ARRAY v_product.bundle_item_ids LOOP
          INSERT INTO public.entitlements (
            user_id,
            customer_email,
            resource_id,
            grant_source,
            source_order_reference,
            plan_id,
            expires_at,
            is_active
          )
          VALUES (
            v_order.user_id,
            v_order.email,
            v_bundled_id,
            'bundle_inclusion',
            p_order_reference,
            v_product.id,
            NULL, -- Lifetime
            true
          );
          v_grants_count := v_grants_count + 1;
        END LOOP;

      -- Case C: Cohort Plan (Mastery / Ultimate inclusions with time-bound or exam-cycle access)
      ELSIF v_product.product_type = 'cohort_plan' THEN
        -- Default cohort validity: through UTME 2027 completion (e.g. 31 May 2027)
        v_plan_expiry := timezone('utc'::text, '2027-05-31 23:59:59+00'::timestamptz);

        FOREACH v_bundled_id IN ARRAY v_product.bundle_item_ids LOOP
          INSERT INTO public.entitlements (
            user_id,
            customer_email,
            resource_id,
            grant_source,
            source_order_reference,
            plan_id,
            expires_at,
            is_active
          )
          VALUES (
            v_order.user_id,
            v_order.email,
            v_bundled_id,
            'plan_inclusion',
            p_order_reference,
            v_product.id,
            v_plan_expiry,
            true
          );
          v_grants_count := v_grants_count + 1;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  RETURN v_grants_count;
END;
$$;

-- Trigger to automatically grant entitlements whenever an order transitions to 'paid'
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

-- Admin Bank Transfer Verification RPC
CREATE OR REPLACE FUNCTION public.verify_bank_transfer(
  p_transfer_id UUID,
  p_admin_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
  v_admin_role TEXT;
BEGIN
  -- Verify caller is admin
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only administrators can verify bank transfers';
  END IF;

  IF p_new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
  END IF;

  SELECT * INTO v_transfer FROM public.bank_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer record % not found', p_transfer_id;
  END IF;

  IF v_transfer.verification_status != 'pending' THEN
    RAISE EXCEPTION 'Bank transfer already finalized with status %', v_transfer.verification_status;
  END IF;

  -- Update bank transfer audit record
  UPDATE public.bank_transfers
  SET verification_status = p_new_status,
      verified_at = timezone('utc'::text, now()),
      verified_by = p_admin_id,
      verification_notes = p_notes,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_transfer_id;

  IF p_new_status = 'approved' THEN
    -- Mark corresponding order as paid
    UPDATE public.orders
    SET status = 'paid',
        paid_at = timezone('utc'::text, now()),
        verified_at = timezone('utc'::text, now()),
        verified_by = p_admin_id,
        updated_at = timezone('utc'::text, now())
    WHERE reference = v_transfer.order_reference;

    RETURN jsonb_build_object('success', true, 'status', 'approved', 'order_reference', v_transfer.order_reference);
  ELSE
    -- Mark order as rejected
    UPDATE public.orders
    SET status = 'failed',
        rejection_reason = p_notes,
        updated_at = timezone('utc'::text, now())
    WHERE reference = v_transfer.order_reference;

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'order_reference', v_transfer.order_reference);
  END IF;
END;
$$;

-- ==============================================================================
-- 8. SECURE PUBLIC RPC: get_order_status
-- ==============================================================================
-- Eliminates customer PII leakage from download.html.
-- Returns ONLY status, product_id, and product_name for a given reference.
-- Never exposes emails, customer names, phone numbers, or Paystack response payloads.
CREATE OR REPLACE FUNCTION public.get_order_status(p_reference TEXT)
RETURNS TABLE (
  status TEXT,
  product_id TEXT,
  product_name TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.status,
    o.product_id,
    o.product_name,
    true AS is_valid
  FROM public.orders o
  WHERE o.reference = p_reference
  LIMIT 1;

  -- Return empty if reference not found
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- Grant EXECUTE on get_order_status to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_order_status(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;

-- Helper to check if current session user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Products Policies
-- Active products are publicly readable by everyone (anon + authenticated)
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Only admins can modify products" ON public.products;
CREATE POLICY "Only admins can modify products" ON public.products
  FOR ALL USING (public.is_admin());

-- Orders Policies
-- CRITICAL SECURITY FIX: Direct table SELECT is revoked from public/anon.
-- Users can only select their own orders (matching auth.uid or auth email).
-- Admins can view all orders.
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.jwt() ->> 'email' IS NOT NULL AND lower(email) = lower(auth.jwt() ->> 'email'))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Only service role and admins can insert/update orders directly" ON public.orders;
CREATE POLICY "Only service role and admins can insert/update orders directly" ON public.orders
  FOR ALL USING (public.is_admin());

-- Order Items Policies
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.reference = order_items.order_reference
        AND (
          (auth.uid() IS NOT NULL AND auth.uid() = o.user_id)
          OR (auth.jwt() ->> 'email' IS NOT NULL AND lower(o.email) = lower(auth.jwt() ->> 'email'))
          OR public.is_admin()
        )
    )
  );

-- Entitlements Policies
-- Users can only view their own active entitlements.
DROP POLICY IF EXISTS "Users can view own entitlements" ON public.entitlements;
CREATE POLICY "Users can view own entitlements" ON public.entitlements
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.jwt() ->> 'email' IS NOT NULL AND lower(customer_email) = lower(auth.jwt() ->> 'email'))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Only admins can modify entitlements" ON public.entitlements;
CREATE POLICY "Only admins can modify entitlements" ON public.entitlements
  FOR ALL USING (public.is_admin());

-- Bank Transfers Policies
DROP POLICY IF EXISTS "Users can view own bank transfers" ON public.bank_transfers;
CREATE POLICY "Users can view own bank transfers" ON public.bank_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.reference = bank_transfers.order_reference
        AND (
          (auth.uid() IS NOT NULL AND auth.uid() = o.user_id)
          OR (auth.jwt() ->> 'email' IS NOT NULL AND lower(o.email) = lower(auth.jwt() ->> 'email'))
          OR public.is_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Only admins can update bank transfers" ON public.bank_transfers;
CREATE POLICY "Only admins can update bank transfers" ON public.bank_transfers
  FOR UPDATE USING (public.is_admin());

-- Revoke direct table SELECT on public.orders from anon role to prevent data exfiltration
REVOKE SELECT ON TABLE public.orders FROM anon;
-- Grant SELECT on active_user_entitlements to authenticated users
GRANT SELECT ON public.active_user_entitlements TO authenticated;
