-- ============================================================================
-- Fix: invalid input value for enum app_role: "moderator"
-- Run this ONCE in Supabase SQL Editor (by itself, then Run again on fix_pgcrypto if needed).
-- PostgreSQL: run ONLY this block first; do not combine with create_moderator_user in one run.
-- ============================================================================

-- Postgres 12+ / Supabase: ADD VALUE IF NOT EXISTS (safe to re-run)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- Confirm (must include a row "moderator")
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'app_role'
  AND t.typnamespace = 'public'::regnamespace
ORDER BY e.enumsortorder;
