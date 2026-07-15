-- ============================================================================
-- Platform Admins — master_admin / admin accounts managed from the UI
-- Apply via: Supabase dashboard SQL Editor, or `supabase db push`.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_admins (
  platform_admin_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role public.app_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_admins_role_check CHECK (role IN ('admin', 'master_admin')),
  CONSTRAINT platform_admins_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON public.platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON public.platform_admins(role);

CREATE OR REPLACE FUNCTION public.update_platform_admins_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER trg_platform_admins_updated_at
BEFORE UPDATE ON public.platform_admins
FOR EACH ROW EXECUTE FUNCTION public.update_platform_admins_updated_at();

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admins_own_select ON public.platform_admins;
CREATE POLICY platform_admins_own_select ON public.platform_admins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS platform_admins_master_all ON public.platform_admins;
CREATE POLICY platform_admins_master_all ON public.platform_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'master_admin'
    )
  );

-- ============================================================================
-- RPC: create_platform_admin_user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_platform_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_contact_person TEXT,
  p_phone TEXT,
  p_role public.app_role,
  p_admin_user_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID;
  new_platform_admin_id BIGINT;
  result JSON;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'master_admin'
  ) THEN
    RAISE EXCEPTION 'Only master admins can create platform admin accounts';
  END IF;

  IF p_role NOT IN ('admin', 'master_admin') THEN
    RAISE EXCEPTION 'Platform admin role must be admin or master_admin';
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
    crypt(p_password, gen_salt('bf')), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('contact_person', p_contact_person, 'platform_role', p_role),
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

  INSERT INTO public.platform_admins (
    user_id, contact_person, email, phone, role, is_active
  ) VALUES (
    new_user_id, p_contact_person, p_email, p_phone, p_role, true
  )
  RETURNING platform_admin_id INTO new_platform_admin_id;

  UPDATE public.user_roles
  SET role = p_role, updated_at = NOW()
  WHERE user_id = new_user_id;

  IF p_admin_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      admin_user_id, admin_role, action_type, entity_type, entity_id,
      new_value, created_at
    ) VALUES (
      p_admin_user_id, 'master_admin', 'create_platform_admin', 'platform_admin',
      new_platform_admin_id,
      jsonb_build_object(
        'contact_person', p_contact_person,
        'email', p_email,
        'phone', p_phone,
        'role', p_role
      ),
      NOW()
    );
  END IF;

  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'platform_admin_id', new_platform_admin_id,
    'email', p_email,
    'role', p_role
  );
  RETURN result;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating platform admin: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_platform_admin_user(TEXT, TEXT, TEXT, TEXT, public.app_role, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_platform_admin_user(TEXT, TEXT, TEXT, TEXT, public.app_role, UUID) FROM anon, public;

-- ============================================================================
-- RPC: delete_platform_admin_user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_platform_admin_user(
  p_platform_admin_id BIGINT,
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
    RAISE EXCEPTION 'Only master admins can delete platform admin accounts';
  END IF;

  SELECT user_id INTO target_user_id
  FROM public.platform_admins
  WHERE platform_admin_id = p_platform_admin_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Platform admin not found';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;

  IF p_admin_user_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      admin_user_id, admin_role, action_type, entity_type, entity_id, created_at
    ) VALUES (
      p_admin_user_id, 'master_admin', 'delete_platform_admin', 'platform_admin',
      p_platform_admin_id, NOW()
    );
  END IF;

  result := json_build_object('success', true, 'platform_admin_id', p_platform_admin_id);
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_platform_admin_user(BIGINT, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_platform_admin_user(BIGINT, UUID) FROM anon, public;
