-- ============================================================================
-- School Admins feature — additive migration
-- Apply via: Supabase dashboard SQL Editor, or `supabase db push`, or MCP.
-- ============================================================================

-- STEP 1: Add 'school_admin' value to app_role enum.
-- Must be committed before the new value can be used in subsequent statements.
-- Run this in its own transaction first.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'school_admin'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'school_admin';
  END IF;
END
$$;

-- ============================================================================
-- STEP 2 ONWARDS: After committing step 1, run the rest below.
-- (If applying via Supabase dashboard, run STEP 1 first, then everything below.)
-- ============================================================================

-- school_admins table
CREATE TABLE IF NOT EXISTS public.school_admins (
  school_admin_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id BIGINT NOT NULL REFERENCES public.schools(school_id) ON DELETE RESTRICT,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT school_admins_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_school_admins_user_id ON public.school_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_school_id ON public.school_admins(school_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_school_admins_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_school_admins_updated_at ON public.school_admins;
CREATE TRIGGER trg_school_admins_updated_at
BEFORE UPDATE ON public.school_admins
FOR EACH ROW EXECUTE FUNCTION public.update_school_admins_updated_at();

-- RLS
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_admins_own_select ON public.school_admins;
CREATE POLICY school_admins_own_select ON public.school_admins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS school_admins_admin_all ON public.school_admins;
CREATE POLICY school_admins_admin_all ON public.school_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'master_admin')
    )
  );

-- ============================================================================
-- RPC: create_school_admin_user
-- Atomically creates the auth user + school_admins row + user_roles update.
-- Modelled on create_fleet_owner_user with the empty-string token fix already
-- in place (NULL tokens cause gotrue scan errors during login).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_school_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_school_id BIGINT,
  p_contact_person TEXT,
  p_phone TEXT,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  new_school_admin_id BIGINT;
  result JSON;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change, phone_change,
    phone_change_token, reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('contact_person', p_contact_person, 'school_id', p_school_id),
    NOW(), NOW(),
    '', '', '', '', '', '', '', ''
  )
  RETURNING id INTO new_user_id;

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_user_id::text, new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', p_email),
    'email', NOW(), NOW(), NOW()
  );

  INSERT INTO public.school_admins (
    user_id, school_id, contact_person, email, phone, is_active
  ) VALUES (
    new_user_id, p_school_id, p_contact_person, p_email, p_phone, true
  )
  RETURNING school_admin_id INTO new_school_admin_id;

  -- handle_new_user trigger creates user_roles row with role='user'; promote it
  UPDATE public.user_roles
  SET role = 'school_admin', updated_at = NOW()
  WHERE user_id = new_user_id;

  IF p_admin_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      admin_user_id, admin_role, action_type, entity_type, entity_id,
      new_value, created_at
    ) VALUES (
      p_admin_user_id, 'master_admin', 'create_school_admin', 'school_admin',
      new_school_admin_id,
      jsonb_build_object(
        'school_id', p_school_id, 'contact_person', p_contact_person,
        'email', p_email, 'phone', p_phone
      ),
      NOW()
    );
  END IF;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'school_admin_id', new_school_admin_id,
    'email', p_email
  );
  RETURN result;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating school admin: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_school_admin_user(TEXT, TEXT, BIGINT, TEXT, TEXT, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_school_admin_user(TEXT, TEXT, BIGINT, TEXT, TEXT, UUID) FROM anon, public;

-- ============================================================================
-- RPC: delete_school_admin_user
-- Removes the school_admins row + cascades to auth user.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_school_admin_user(
  p_school_admin_id BIGINT,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  result JSON;
BEGIN
  SELECT user_id INTO target_user_id
  FROM public.school_admins
  WHERE school_admin_id = p_school_admin_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'School admin not found';
  END IF;

  -- Cascade-delete the auth user — school_admins row, identities, user_roles
  -- all reference auth.users with ON DELETE CASCADE.
  DELETE FROM auth.users WHERE id = target_user_id;

  IF p_admin_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      admin_user_id, admin_role, action_type, entity_type, entity_id, created_at
    ) VALUES (
      p_admin_user_id, 'master_admin', 'delete_school_admin', 'school_admin',
      p_school_admin_id, NOW()
    );
  END IF;

  result := json_build_object('success', true, 'school_admin_id', p_school_admin_id);
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_school_admin_user(BIGINT, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_school_admin_user(BIGINT, UUID) FROM anon, public;
