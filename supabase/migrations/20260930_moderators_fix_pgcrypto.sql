-- ============================================================================
-- Fix: gen_salt / crypt for create_moderator_user (and school admin RPC)
-- Run once in Supabase SQL Editor if moderator creation fails with
-- "function gen_salt(unknown) does not exist"
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

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
