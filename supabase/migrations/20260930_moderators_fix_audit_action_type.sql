-- ============================================================================
-- Fix: audit_logs.valid_action_type rejects create_moderator / delete_moderator
-- Run once in Supabase SQL Editor, then retry creating a moderator.
-- ============================================================================

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS valid_action_type;

-- Allow snake_case action types (existing + future RPC/hook names)
ALTER TABLE public.audit_logs ADD CONSTRAINT valid_action_type CHECK (
  char_length(action_type) >= 1
  AND char_length(action_type) <= 128
  AND action_type ~ '^[a-z][a-z0-9_]*$'
);

-- Optional: allow entity_type "moderator" if you have valid_entity_type
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS valid_entity_type;

ALTER TABLE public.audit_logs ADD CONSTRAINT valid_entity_type CHECK (
  char_length(entity_type) >= 1
  AND char_length(entity_type) <= 128
  AND entity_type ~ '^[a-z][a-z0-9_]*$'
);
