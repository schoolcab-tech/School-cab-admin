-- One row per Sarvam call attempt. The full webhook body is in raw_payload.

create table if not exists public.driver_hiring_calls (
  id uuid primary key default gen_random_uuid(),
  attempt_id text,
  campaign_id text,
  cohort_id text,
  app_id text,
  app_version integer,
  phone text,
  user_identifier text,
  name text,
  agent_phone_number text,
  connectivity_status text,
  completion_status text,
  failure_reason text,
  next_action_status text,
  duration_sec numeric,
  interaction_id text,
  retry_attempt integer,
  executed_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  interest_type text,
  preferred_hub text,
  visit_datetime_text text,
  has_valid_licence text,
  has_address_proof text,
  deposit_path text,
  lead_score integer,
  lead_tag text,
  callback_datetime_text text,
  not_fit_reason text,
  needs_human_escalation text,
  call_summary text,
  agent_variables jsonb,
  transcript jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint driver_hiring_calls_attempt_id_key unique (attempt_id)
);

create index if not exists idx_driver_hiring_calls_created_at
  on public.driver_hiring_calls (created_at desc)
  where deleted_at is null;

create index if not exists idx_driver_hiring_calls_phone
  on public.driver_hiring_calls (phone)
  where deleted_at is null;

alter table public.driver_hiring_calls enable row level security;

grant select, insert, update, delete on table public.driver_hiring_calls to authenticated;

drop policy if exists driver_hiring_calls_admin_manage on public.driver_hiring_calls;
create policy driver_hiring_calls_admin_manage
  on public.driver_hiring_calls
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
