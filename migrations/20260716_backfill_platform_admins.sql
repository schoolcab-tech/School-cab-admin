-- ============================================================================
-- Backfill platform_admins from existing user_roles (admin / master_admin)
-- Safe to run multiple times — skips users already in platform_admins.
--
-- Run AFTER 20260715_platform_admins.sql
-- Apply via: Supabase dashboard SQL Editor, or `supabase db push`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_platform_admins()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  -- Only master admins may trigger a backfill (when called via RPC from the app).
  -- Direct SQL execution in the dashboard bypasses this check.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Only master admins can run platform admin backfill';
  END IF;

  INSERT INTO public.platform_admins (
    user_id,
    contact_person,
    email,
    phone,
    role,
    is_active,
    created_at
  )
  SELECT
    ur.user_id,
    COALESCE(
      NULLIF(trim(au.raw_user_meta_data->>'contact_person'), ''),
      NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''),
      NULLIF(trim(au.raw_user_meta_data->>'name'), ''),
      initcap(replace(split_part(au.email, '@', 1), '.', ' '))
    ) AS contact_person,
    lower(trim(au.email)) AS email,
    COALESCE(
      NULLIF(trim(au.raw_user_meta_data->>'phone'), ''),
      NULLIF(trim(au.phone), ''),
      '0000000000'
    ) AS phone,
    ur.role,
    true AS is_active,
    COALESCE(ur.created_at, au.created_at, NOW()) AS created_at
  FROM public.user_roles ur
  INNER JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.role IN ('admin', 'master_admin')
    AND au.email IS NOT NULL
    AND trim(au.email) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM public.platform_admins pa
      WHERE pa.user_id = ur.user_id
    );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  SELECT COUNT(*) INTO total_count FROM public.platform_admins;

  RETURN json_build_object(
    'success', true,
    'inserted_count', inserted_count,
    'total_platform_admins', total_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_platform_admins() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.backfill_platform_admins() FROM anon, public;

-- One-time backfill on migration apply (idempotent).
SELECT public.backfill_platform_admins();
