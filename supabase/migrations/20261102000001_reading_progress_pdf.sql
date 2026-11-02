-- ==============================================================================
-- TECHMED RESOURCE LIBRARY — PHASE 4: PERSISTENT READING PROGRESS & RESUME READING
-- Migration Version: 20261102000001
-- File: supabase/migrations/20261102000001_reading_progress_pdf.sql
-- ==============================================================================
-- Purpose:
-- 1. Extend existing public.reading_progress table to natively support page-level PDF progress
--    (current_page, total_pages, reading_percent, document_key).
-- 2. Preserve all existing columns (current_chapter, scroll_percent, completed_chapters) for
--    backwards compatibility with existing records.
-- 3. Support independent progress tracking for multi-document bundles and ZIP archives
--    via document_key.
-- 4. Enforce strict student data isolation via Row Level Security (RLS).
-- ==============================================================================

-- 1. EXTEND EXISTING READING_PROGRESS TABLE WITH PDF COLUMNS (NON-DESTRUCTIVE)
DO $$
BEGIN
  -- Add current_page if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reading_progress' AND column_name = 'current_page'
  ) THEN
    ALTER TABLE public.reading_progress ADD COLUMN current_page INTEGER NOT NULL DEFAULT 1;
  END IF;

  -- Add total_pages if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reading_progress' AND column_name = 'total_pages'
  ) THEN
    ALTER TABLE public.reading_progress ADD COLUMN total_pages INTEGER NOT NULL DEFAULT 1;
  END IF;

  -- Add reading_percent if it does not exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reading_progress' AND column_name = 'reading_percent'
  ) THEN
    ALTER TABLE public.reading_progress ADD COLUMN reading_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (reading_percent >= 0 AND reading_percent <= 100);
  END IF;

  -- Add document_key if it does not exist (for sub-documents in bundles or zip archives)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reading_progress' AND column_name = 'document_key'
  ) THEN
    ALTER TABLE public.reading_progress ADD COLUMN document_key TEXT NOT NULL DEFAULT '';
  END IF;

  -- Ensure is_finished exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reading_progress' AND column_name = 'is_finished'
  ) THEN
    ALTER TABLE public.reading_progress ADD COLUMN is_finished BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Relax customer_email NOT NULL constraint to allow graceful auth user tracking
  ALTER TABLE public.reading_progress ALTER COLUMN customer_email DROP NOT NULL;
END $$;

-- 2. UPDATE UNIQUE CONSTRAINT TO INCLUDE DOCUMENT_KEY FOR BUNDLE DOCUMENTS
-- Allows independent page-level tracking for each constituent document in a bundle
DO $$
BEGIN
  -- Drop older unique constraint if present
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_resource_progress'
  ) THEN
    ALTER TABLE public.reading_progress DROP CONSTRAINT unique_user_resource_progress;
  END IF;

  -- Add composite unique constraint covering user_id, resource_id, and document_key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_resource_document_progress'
  ) THEN
    ALTER TABLE public.reading_progress
    ADD CONSTRAINT unique_user_resource_document_progress
    UNIQUE (user_id, resource_id, document_key);
  END IF;
END $$;

-- 3. OPTIMIZED INDEXES FOR HIGH-CONCURRENCY LOOKUPS
CREATE INDEX IF NOT EXISTS idx_reading_progress_composite
ON public.reading_progress (user_id, resource_id, document_key);

CREATE INDEX IF NOT EXISTS idx_reading_progress_last_read
ON public.reading_progress (user_id, last_read_at DESC);

-- 4. HARDEN ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Select policy: Students can only view their own records
DROP POLICY IF EXISTS "Students can view their own reading progress" ON public.reading_progress;
CREATE POLICY "Students can view their own reading progress"
ON public.reading_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Insert policy: Students can only insert their own records
DROP POLICY IF EXISTS "Students can insert their own reading progress" ON public.reading_progress;
CREATE POLICY "Students can insert their own reading progress"
ON public.reading_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update policy: Students can only update their own records
DROP POLICY IF EXISTS "Students can update their own reading progress" ON public.reading_progress;
CREATE POLICY "Students can update their own reading progress"
ON public.reading_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete policy: Students can delete their own records
DROP POLICY IF EXISTS "Students can delete their own reading progress" ON public.reading_progress;
CREATE POLICY "Students can delete their own reading progress"
ON public.reading_progress
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
