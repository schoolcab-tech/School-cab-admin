-- ============================================================================
-- Moderators — STEP 1 ONLY (run this first, then run 20260930_moderators.sql)
--
-- Supabase SQL Editor: paste this, click Run, wait for success, then run step 2.
-- PostgreSQL requires the new app_role value to be committed before it is used.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'moderator'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'moderator';
  END IF;
END
$$;
