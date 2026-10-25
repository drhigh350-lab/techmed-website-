-- ==============================================================================
-- TECHMED RESOURCE LIBRARY — PHASE 2B MIGRATION: STORAGE SECURITY & READER PROGRESS
-- Migration Version: 20261023000002
-- File: supabase/migrations/20261023000002_storage_and_reader_access.sql
-- ==============================================================================
-- Purpose:
-- 1. Ensure the private "paid-resources" storage bucket is secured against public access.
-- 2. Define strict storage policies preventing unauthorized download of booster manuals.
-- 3. Create a reading_progress table to sync student study progress, active chapters,
--    and completion milestones across mobile and desktop sessions.
-- 4. Provide a security-definer helper to verify study reader authorization.
-- ==============================================================================

-- 1. SECURE STORAGE BUCKET CONFIGURATION
-- Ensure the paid-resources bucket exists and is marked private
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'paid-resources',
  'paid-resources',
  false, -- Strictly PRIVATE: No public unauthenticated access
  52428800, -- 50MB max file size
  ARRAY['application/pdf', 'application/zip', 'text/html']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'application/zip', 'text/html'];

-- Storage RLS: Ensure RLS is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage Policy A: Service Role and Admin Full Access
DROP POLICY IF EXISTS "Service role full access to paid resources" ON storage.objects;
CREATE POLICY "Service role full access to paid resources"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'paid-resources')
WITH CHECK (bucket_id = 'paid-resources');

-- Storage Policy B: Authenticated Entitled Student Read Access
DROP POLICY IF EXISTS "Entitled students can read paid resources" ON storage.objects;
CREATE POLICY "Entitled students can read paid resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'paid-resources'
  AND (
    -- Caller must hold an active entitlement for the product linked to this file
    EXISTS (
      SELECT 1
      FROM public.entitlements e
      JOIN public.products p ON p.id = e.resource_id
      WHERE e.user_id = auth.uid()
        AND e.is_active = true
        AND (e.expires_at IS NULL OR e.expires_at > timezone('utc'::text, now()))
        AND (p.file_path = storage.objects.name OR storage.objects.name LIKE (p.id || '%'))
    )
    OR
    -- Or user is an administrator
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- ==============================================================================
-- 2. READING PROGRESS TRACKING TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  resource_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  current_chapter INTEGER NOT NULL DEFAULT 1,
  highest_chapter_reached INTEGER NOT NULL DEFAULT 1,
  completed_chapters INTEGER[] NOT NULL DEFAULT '{}'::INTEGER[],
  scroll_percent NUMERIC NOT NULL DEFAULT 0 CHECK (scroll_percent >= 0 AND scroll_percent <= 100),
  is_finished BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_resource_progress UNIQUE (user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON public.reading_progress (user_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_email ON public.reading_progress (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_reading_progress_updated ON public.reading_progress (last_read_at DESC);

-- Enable RLS on reading_progress
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Reading Progress Policies
DROP POLICY IF EXISTS "Students can view their own reading progress" ON public.reading_progress;
CREATE POLICY "Students can view their own reading progress"
ON public.reading_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert their own reading progress" ON public.reading_progress;
CREATE POLICY "Students can insert their own reading progress"
ON public.reading_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update their own reading progress" ON public.reading_progress;
CREATE POLICY "Students can update their own reading progress"
ON public.reading_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all reading progress" ON public.reading_progress;
CREATE POLICY "Admins can view all reading progress"
ON public.reading_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ==============================================================================
-- 3. AUDITABLE READER ACCESS VALIDATION RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_reader_access(p_resource_id TEXT)
RETURNS TABLE (
  has_access BOOLEAN,
  grant_source TEXT,
  expires_at TIMESTAMPTZ,
  is_lifetime BOOLEAN,
  watermark_text TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := COALESCE(auth.jwt() ->> 'email', '');
  v_ent RECORD;
BEGIN
  -- 1. Free resources are globally accessible
  IF p_resource_id IN ('admission-intelligence-guide-2026', 'free-quiz-practice', 'kairo') THEN
    RETURN QUERY SELECT
      true AS has_access,
      'free_asset'::TEXT AS grant_source,
      NULL::TIMESTAMPTZ AS expires_at,
      true AS is_lifetime,
      ('TECHMED Free Academic Resource · ' || COALESCE(NULLIF(v_email, ''), 'Licensed Visitor'))::TEXT AS watermark_text;
    RETURN;
  END IF;

  -- 2. Check active entitlement for user_id or email
  SELECT * INTO v_ent
  FROM public.entitlements
  WHERE (
    (v_user_id IS NOT NULL AND user_id = v_user_id)
    OR (v_email <> '' AND lower(customer_email) = lower(v_email))
  )
  AND resource_id = p_resource_id
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
  ORDER BY (expires_at IS NULL) DESC, granted_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      true AS has_access,
      v_ent.grant_source::TEXT,
      v_ent.expires_at,
      (v_ent.expires_at IS NULL) AS is_lifetime,
      (v_email || ' · TECHMED VERIFIED STUDENT · ' || to_char(timezone('utc'::text, now()), 'YYYY-MM-DD'))::TEXT AS watermark_text;
    RETURN;
  END IF;

  -- 3. No active entitlement: Return sample preview status
  RETURN QUERY SELECT
    false AS has_access,
    'preview_only'::TEXT AS grant_source,
    NULL::TIMESTAMPTZ AS expires_at,
    false AS is_lifetime,
    ('TECHMED Sample Preview · ' || COALESCE(NULLIF(v_email, ''), 'Unlicensed Preview'))::TEXT AS watermark_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_reader_access(TEXT) TO anon, authenticated;
