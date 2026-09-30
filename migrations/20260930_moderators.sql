-- ============================================================================
-- Moderators — STEP 2 (run AFTER 20260930_moderators_step1_app_role.sql succeeds)
-- Apply via: Supabase dashboard SQL Editor, or `supabase db push` (both files in order).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- moderators table
CREATE TABLE IF NOT EXISTS public.moderators (
  moderator_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT moderators_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_moderators_user_id ON public.moderators(user_id);

CREATE OR REPLACE FUNCTION public.update_moderators_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_moderators_updated_at ON public.moderators;
CREATE TRIGGER trg_moderators_updated_at
BEFORE UPDATE ON public.moderators
FOR EACH ROW EXECUTE FUNCTION public.update_moderators_updated_at();

-- schools.moderator_id
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS moderator_id BIGINT REFERENCES public.moderators(moderator_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schools_moderator_id ON public.schools(moderator_id);

-- Helper: current user's moderator_id (null if not a moderator)
CREATE OR REPLACE FUNCTION public.current_moderator_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.moderator_id
  FROM public.moderators m
  INNER JOIN public.user_roles ur ON ur.user_id = m.user_id
  WHERE m.user_id = auth.uid()
    AND ur.role::text = 'moderator'
    AND m.is_active = true
  LIMIT 1;
$$;

-- schools ownership trigger for moderators
CREATE OR REPLACE FUNCTION public.enforce_school_moderator_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mod_id BIGINT;
BEGIN
  v_mod_id := public.current_moderator_id();
  IF v_mod_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.moderator_id := v_mod_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.moderator_id IS DISTINCT FROM v_mod_id THEN
      RAISE EXCEPTION 'Moderator cannot update a school they do not own';
    END IF;
    IF NEW.moderator_id IS DISTINCT FROM OLD.moderator_id THEN
      RAISE EXCEPTION 'Moderator cannot change school ownership';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schools_moderator_ownership ON public.schools;
CREATE TRIGGER trg_schools_moderator_ownership
BEFORE INSERT OR UPDATE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.enforce_school_moderator_ownership();

-- RLS moderators
ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moderators_own_select ON public.moderators;
CREATE POLICY moderators_own_select ON public.moderators
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS moderators_master_all ON public.moderators;
CREATE POLICY moderators_master_all ON public.moderators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_admin'
    )
  );

-- Extend school_admins RLS for moderators (select/update on rows for owned schools)
DROP POLICY IF EXISTS school_admins_moderator_select ON public.school_admins;
CREATE POLICY school_admins_moderator_select ON public.school_admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.school_id = school_admins.school_id
        AND s.moderator_id = public.current_moderator_id()
    )
  );

DROP POLICY IF EXISTS school_admins_moderator_update ON public.school_admins;
CREATE POLICY school_admins_moderator_update ON public.school_admins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.school_id = school_admins.school_id
        AND s.moderator_id = public.current_moderator_id()
    )
  );

-- ============================================================================
-- RPC: create_moderator_user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_moderator_user(
  p_email TEXT,
  p_password TEXT,
  p_contact_person TEXT,
  p_phone TEXT,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  new_user_id UUID;
  new_moderator_id BIGINT;
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Only master admins can create moderator accounts';
  END IF;

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
    extensions.crypt(p_password, extensions.gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('contact_person', p_contact_person),
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

  INSERT INTO public.moderators (
    user_id, contact_person, email, phone, is_active
  ) VALUES (
    new_user_id, p_contact_person, p_email, p_phone, true
  )
  RETURNING moderator_id INTO new_moderator_id;

  UPDATE public.user_roles
  SET role = 'moderator'::public.app_role, updated_at = NOW()
  WHERE user_id = new_user_id;

  IF p_admin_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.audit_logs (
        admin_user_id, admin_role, action_type, entity_type, entity_id,
        new_value, created_at
      ) VALUES (
        p_admin_user_id, 'master_admin', 'create_moderator', 'moderator',
        new_moderator_id,
        jsonb_build_object(
          'contact_person', p_contact_person,
          'email', p_email,
          'phone', p_phone
        ),
        NOW()
      );
    EXCEPTION
      WHEN check_violation THEN
        RAISE WARNING 'audit_logs skipped for create_moderator: %', SQLERRM;
    END;
  END IF;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'moderator_id', new_moderator_id,
    'email', p_email
  );
  RETURN result;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating moderator: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_moderator_user(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_moderator_user(TEXT, TEXT, TEXT, TEXT, UUID) FROM anon, public;

-- ============================================================================
-- RPC: delete_moderator_user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_moderator_user(
  p_moderator_id BIGINT,
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
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Only master admins can delete moderator accounts';
  END IF;

  SELECT user_id INTO target_user_id
  FROM public.moderators
  WHERE moderator_id = p_moderator_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Moderator not found';
  END IF;

  UPDATE public.schools SET moderator_id = NULL WHERE moderator_id = p_moderator_id;

  DELETE FROM auth.users WHERE id = target_user_id;

  IF p_admin_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.audit_logs (
        admin_user_id, admin_role, action_type, entity_type, entity_id, created_at
      ) VALUES (
        p_admin_user_id, 'master_admin', 'delete_moderator', 'moderator',
        p_moderator_id, NOW()
      );
    EXCEPTION
      WHEN check_violation THEN
        RAISE WARNING 'audit_logs skipped for delete_moderator: %', SQLERRM;
    END;
  END IF;

  result := json_build_object('success', true, 'moderator_id', p_moderator_id);
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_moderator_user(BIGINT, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_moderator_user(BIGINT, UUID) FROM anon, public;

-- ============================================================================
-- Replace create_school_admin_user with moderator ownership check
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
SET search_path = public, extensions, auth
AS $$
DECLARE
  new_user_id UUID;
  new_school_admin_id BIGINT;
  v_mod_id BIGINT;
  result JSON;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'master_admin')
  ) THEN
    NULL;
  ELSIF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text = 'moderator'
  ) THEN
    v_mod_id := public.current_moderator_id();
    IF v_mod_id IS NULL THEN
      RAISE EXCEPTION 'Moderator account is inactive or invalid';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.school_id = p_school_id
        AND s.moderator_id = v_mod_id
    ) THEN
      RAISE EXCEPTION 'Moderator cannot create school admin for a school they do not own';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorized to create school admin accounts';
  END IF;

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
    extensions.crypt(p_password, extensions.gen_salt('bf')), NOW(),
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

  UPDATE public.user_roles
  SET role = 'school_admin', updated_at = NOW()
  WHERE user_id = new_user_id;

  IF p_admin_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      admin_user_id, admin_role, action_type, entity_type, entity_id,
      new_value, created_at
    ) VALUES (
      p_admin_user_id,
      COALESCE(
        (SELECT role::text FROM public.user_roles WHERE user_id = p_admin_user_id),
        'master_admin'
      )::public.app_role,
      'create_school_admin', 'school_admin',
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
