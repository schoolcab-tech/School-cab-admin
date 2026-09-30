-- ============================================================================
-- Moderators — STEP 1 ONLY
-- Run this ALONE in Supabase SQL Editor. Wait for success before step 2 / fix scripts.
-- If you see "moderator" in the verification query below, step 1 is done.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'moderator'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
  END IF;
END
$$;

-- Verification (should return one row: moderator)
SELECT e.enumlabel AS app_role_value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'app_role'
  AND t.typnamespace = 'public'::regnamespace
ORDER BY e.enumsortorder;
