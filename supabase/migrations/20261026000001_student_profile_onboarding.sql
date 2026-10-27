-- ==============================================================================
-- TECHMED STUDENT PROFILE, ONBOARDING & VERIFIED STATUS FOUNDATION
-- Migration Version: 20261026000001
-- File: supabase/migrations/20261026000001_student_profile_onboarding.sql
-- ==============================================================================
-- Purpose:
-- 1. Extend public.profiles with onboarding fields:
--    - whatsapp_phone, telegram_phone, parent_phone
--    - utme_subjects (exactly 4 distinct subjects, always including English)
--    - onboarding_completed (boolean) and onboarding_step (integer)
-- 2. Enforce UTME subject constraints and valid subject list.
-- 3. Maintain strict Row Level Security (RLS) on public.profiles.
-- 4. Create authoritative public.get_unique_verified_students_count() function
--    that de-duplicates verified students across multiple orders/cohorts.
-- 5. Guarantee that completing a profile does NOT grant verified student status
--    or paid entitlements.
-- ==============================================================================

-- 1. ENSURE PROFILES TABLE EXISTS AND EXTEND WITH ONBOARDING FIELDS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'instructor')),
  target_university TEXT,
  target_course TEXT,
  whatsapp_phone TEXT,
  telegram_phone TEXT,
  parent_phone TEXT,
  utme_subjects TEXT[] DEFAULT ARRAY['English']::TEXT[],
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  onboarding_step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utme_subjects TEXT[] DEFAULT ARRAY['English']::TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 1;

-- 2. VALIDATION FUNCTION FOR UTME SUBJECTS
-- Allowed subjects: English, Biology, Chemistry, Physics, Mathematics.
-- When onboarding_completed = true:
--   - Exactly 4 subjects
--   - English must be included
--   - All subjects must be from allowed list
--   - No duplicate subjects
CREATE OR REPLACE FUNCTION public.validate_utme_subjects(subjects TEXT[], completed BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  allowed_subjects CONSTANT TEXT[] := ARRAY['English', 'Biology', 'Chemistry', 'Physics', 'Mathematics'];
  sub TEXT;
  distinct_count INTEGER;
BEGIN
  -- If onboarding is not completed yet, allow partial drafts (at least empty or subset)
  IF NOT completed THEN
    IF subjects IS NULL THEN
      RETURN true;
    END IF;
    -- Ensure any entered subjects belong to allowed list
    FOREACH sub IN ARRAY subjects
    LOOP
      IF NOT (sub = ANY(allowed_subjects)) THEN
        RETURN false;
      END IF;
    END LOOP;
    RETURN true;
  END IF;

  -- If onboarding is completed, must strictly validate:
  -- 1. Must not be null
  IF subjects IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Must contain exactly 4 subjects
  IF cardinality(subjects) <> 4 THEN
    RETURN false;
  END IF;

  -- 3. English must be present
  IF NOT ('English' = ANY(subjects)) THEN
    RETURN false;
  END IF;

  -- 4. All subjects must be from the allowed list
  FOREACH sub IN ARRAY subjects
  LOOP
    IF NOT (sub = ANY(allowed_subjects)) THEN
      RETURN false;
    END IF;
  END LOOP;

  -- 5. No duplicates: distinct count must equal 4
  SELECT COUNT(DISTINCT s) INTO distinct_count FROM unnest(subjects) AS s;
  IF distinct_count <> 4 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Add check constraint for UTME subjects validation
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_utme_subjects;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_utme_subjects
  CHECK (public.validate_utme_subjects(utme_subjects, onboarding_completed));

-- 3. UPDATE HANDLE_NEW_USER TRIGGER FUNCTION
-- Preserve existing user metadata handling and initialize onboarding fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    whatsapp_phone,
    telegram_phone,
    parent_phone,
    target_university,
    target_course,
    utme_subjects,
    onboarding_completed,
    onboarding_step
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'TECHMED Student'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'whatsapp_phone',
    NEW.raw_user_meta_data->>'telegram_phone',
    NEW.raw_user_meta_data->>'parent_phone',
    NEW.raw_user_meta_data->>'target_university',
    NEW.raw_user_meta_data->>'target_course',
    ARRAY['English']::TEXT[],
    false,
    1
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- 4. VERIFY AND HARDEN ROW LEVEL SECURITY ON PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

-- 5. AUTHORITATIVE UNIQUE VERIFIED STUDENTS COUNT FUNCTION
-- Counts unique verified students who have either:
--   a) An active, non-expired, started entitlement in public.entitlements
--   b) A paid order in public.orders
-- De-duplicates by user_id or normalized email to prevent double-counting students
-- who purchase multiple resources or join a cohort.
-- Note: A completed profile alone does NOT count as a verified student.
CREATE OR REPLACE FUNCTION public.get_unique_verified_students_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH verified_records AS (
    -- From active entitlements
    SELECT
      user_id,
      lower(customer_email) AS email
    FROM public.entitlements
    WHERE is_active = true
      AND (starts_at IS NULL OR starts_at <= timezone('utc'::text, now()))
      AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()))
    
    UNION
    
    -- From paid orders
    SELECT
      user_id,
      lower(email) AS email
    FROM public.orders
    WHERE status = 'paid'
  )
  SELECT COUNT(DISTINCT COALESCE(user_id::text, email))::INTEGER
  FROM verified_records
  WHERE user_id IS NOT NULL OR (email IS NOT NULL AND email <> '');
$$;

GRANT EXECUTE ON FUNCTION public.get_unique_verified_students_count() TO anon, authenticated;
