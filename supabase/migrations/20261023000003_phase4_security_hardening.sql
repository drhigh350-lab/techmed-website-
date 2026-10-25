-- ==============================================================================
-- TECHMED RESOURCE LIBRARY — PHASE 4: SECURITY HARDENING & AUDIT INTEGRITY
-- Migration Version: 20261023000003
-- File: supabase/migrations/20261023000003_phase4_security_hardening.sql
-- ==============================================================================
-- Purpose:
-- 1. Enforce strict idempotency on entitlements table via unique constraint.
-- 2. Prevent privilege escalation on public.profiles (block non-admins from changing role).
-- 3. Enhance verify_bank_transfer RPC with atomic concurrency checks and audit trail.
-- 4. Create claim_order_reference RPC with strict email matching to prevent reference hijacking.
-- 5. Harden security-definer search_path across all functions.
-- ==============================================================================

-- 1. IDEMPOTENT ENTITLEMENTS UNIQUE INDEX
-- Prevents duplicate entitlements for the same order and resource, even on concurrent webhook retries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_order_resource_unique
ON public.entitlements (source_order_reference, resource_id)
WHERE source_order_reference IS NOT NULL;

-- 2. HARDENED GRANT_ORDER_ENTITLEMENTS (Strictly Idempotent)
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
  -- Fetch the verified order with exclusive lock to prevent concurrent races
  SELECT * INTO v_order
  FROM public.orders
  WHERE reference = p_order_reference AND status = 'paid'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found or not in paid status', p_order_reference;
  END IF;

  -- 1. Ensure order items exist; backfill from product_id if legacy order
  IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_reference = p_order_reference) THEN
    IF v_order.product_id IS NOT NULL THEN
      INSERT INTO public.order_items (order_reference, product_id, unit_price_ngn, quantity)
      VALUES (p_order_reference, v_order.product_id, COALESCE(v_order.amount, 0), 1)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- 2. Grant entitlements for each order item with ON CONFLICT DO NOTHING
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
          NULL, -- Permanent Lifetime
          true
        )
        ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
        DO UPDATE SET is_active = true, updated_at = timezone('utc'::text, now());
        
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
            NULL, -- Permanent Lifetime
            true
          )
          ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
          DO UPDATE SET is_active = true, updated_at = timezone('utc'::text, now());

          v_grants_count := v_grants_count + 1;
        END LOOP;

      -- Case C: Cohort Plan (Time-bound inclusion through UTME 2027)
      ELSIF v_product.product_type = 'cohort_plan' THEN
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
          )
          ON CONFLICT (source_order_reference, resource_id) WHERE source_order_reference IS NOT NULL
          DO UPDATE SET is_active = true, expires_at = v_plan_expiry, updated_at = timezone('utc'::text, now());

          v_grants_count := v_grants_count + 1;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  RETURN v_grants_count;
END;
$$;

-- 3. PROFILES ROLE ESCALATION PROTECTION TRIGGER
-- Prevents users from updating their own profile role to 'admin'
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Privilege escalation blocked: only administrators can change user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_role_update();

-- 4. HARDENED BANK TRANSFER VERIFICATION RPC
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
  v_order RECORD;
BEGIN
  -- Enforce that admin exists and has verified admin role
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only verified administrators can verify bank transfers';
  END IF;

  IF p_new_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
  END IF;

  -- Lock transfer record FOR UPDATE to prevent race conditions & double-approvals
  SELECT * INTO v_transfer FROM public.bank_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transfer record % not found', p_transfer_id;
  END IF;

  IF v_transfer.verification_status != 'pending' THEN
    RAISE EXCEPTION 'Bank transfer % is already finalized with status %', p_transfer_id, v_transfer.verification_status;
  END IF;

  -- Verify order exists and lock it
  SELECT * INTO v_order FROM public.orders WHERE reference = v_transfer.order_reference FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated order % not found', v_transfer.order_reference;
  END IF;

  -- Update bank transfer audit record
  UPDATE public.bank_transfers
  SET verification_status = p_new_status,
      verified_at = timezone('utc'::text, now()),
      verified_by = p_admin_id,
      verification_notes = COALESCE(p_notes, 'Manual verification by admin ' || p_admin_id),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_transfer_id;

  IF p_new_status = 'approved' THEN
    -- Mark corresponding order as paid atomically
    UPDATE public.orders
    SET status = 'paid',
        paid_at = timezone('utc'::text, now()),
        verified_at = timezone('utc'::text, now()),
        verified_by = p_admin_id,
        updated_at = timezone('utc'::text, now())
    WHERE reference = v_transfer.order_reference;

    -- Grant entitlements
    PERFORM public.grant_order_entitlements(v_transfer.order_reference);

    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'order_reference', v_transfer.order_reference,
      'verified_by', p_admin_id,
      'verified_at', timezone('utc'::text, now())
    );
  ELSIF p_new_status = 'rejected' THEN
    -- Mark order as rejected/failed
    UPDATE public.orders
    SET status = 'failed',
        rejection_reason = p_notes,
        updated_at = timezone('utc'::text, now())
    WHERE reference = v_transfer.order_reference;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'order_reference', v_transfer.order_reference,
      'verified_by', p_admin_id,
      'verified_at', timezone('utc'::text, now())
    );
  END IF;
END;
$$;

-- 5. SECURE ORDER CLAIM RPC (Strict Email Ownership Check)
-- Eliminates reference hijacking by validating that the claimant email matches the order customer email
CREATE OR REPLACE FUNCTION public.claim_order_reference(
  p_reference TEXT,
  p_claimant_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_user_id UUID := auth.uid();
  v_clean_ref TEXT := trim(p_reference);
  v_clean_email TEXT := lower(trim(p_claimant_email));
BEGIN
  IF v_clean_ref = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transaction reference cannot be empty.');
  END IF;

  IF v_clean_email = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Claimant email address is required.');
  END IF;

  -- Look up order
  SELECT * INTO v_order
  FROM public.orders
  WHERE reference = v_clean_ref;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No order found with reference "' || v_clean_ref || '". Check spelling or contact TECHMED on WhatsApp.'
    );
  END IF;

  -- CRITICAL SECURITY CHECK: Prevent reference hijacking across accounts
  IF lower(trim(v_order.email)) <> v_clean_email THEN
    -- If user is signed in, check if user_id matches
    IF v_user_id IS NULL OR v_order.user_id IS NULL OR v_order.user_id <> v_user_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Access denied: This payment reference is registered to a different customer account.'
      );
    END IF;
  END IF;

  -- Check status
  IF v_order.status <> 'paid' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', v_order.status,
      'message', 'Order status is currently "' || v_order.status || '". Once payment is verified, your access will be activated.'
    );
  END IF;

  -- Ensure order is linked to current authenticated user if not yet assigned
  IF v_user_id IS NOT NULL AND v_order.user_id IS NULL THEN
    UPDATE public.orders
    SET user_id = v_user_id, updated_at = timezone('utc'::text, now())
    WHERE reference = v_clean_ref;
  END IF;

  -- Ensure entitlements are active
  PERFORM public.grant_order_entitlements(v_clean_ref);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment reference verified! Access to ' || v_order.product_name || ' is now active on your bookshelf.',
    'product_id', v_order.product_id,
    'product_name', v_order.product_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_order_reference(TEXT, TEXT) TO anon, authenticated;
