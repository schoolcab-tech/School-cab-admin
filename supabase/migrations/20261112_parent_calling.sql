-- Parent calling calls and leads from the Sarvam campaign / inbound callbacks.
-- One call row per attempt. One lead row per phone. The team sets follow_up_status.

create table if not exists public.parent_calling_calls (
  id uuid primary key default gen_random_uuid(),
  attempt_id text,
  campaign_id text,
  cohort_id text,
  app_id text,
  app_version integer,
  phone text,
  user_identifier text,
  parent_name text,
  child_name text,
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
  whatsapp_number text,
  child_class text,
  child_count integer,
  school_name text,
  pickup_area text,
  direction text,
  current_mode text,
  main_pain text,
  route_status text,
  distance_km numeric,
  fee_quoted numeric,
  prebook_explained text,
  link_agreed text,
  objection_codes text,
  unanswered_questions text,
  callback_time text,
  lead_score integer,
  outcome_tag text,
  needs_human text,
  call_summary text,
  agent_variables jsonb,
  transcript jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint parent_calling_calls_attempt_id_key unique (attempt_id)
);

create index if not exists idx_parent_calling_calls_created_at
  on public.parent_calling_calls (created_at desc)
  where deleted_at is null;

create index if not exists idx_parent_calling_calls_phone
  on public.parent_calling_calls (phone)
  where deleted_at is null;

create index if not exists idx_parent_calling_calls_outcome
  on public.parent_calling_calls (outcome_tag)
  where deleted_at is null;

alter table public.parent_calling_calls enable row level security;

grant select, insert, update, delete on table public.parent_calling_calls to authenticated;

drop policy if exists parent_calling_calls_admin_manage on public.parent_calling_calls;
create policy parent_calling_calls_admin_manage
  on public.parent_calling_calls
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create table if not exists public.parent_calling_leads (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  parent_name text,
  child_name text,
  whatsapp_number text,
  child_class text,
  child_count integer,
  school_name text,
  pickup_area text,
  direction text check (
    direction is null or direction in ('both', 'one_way')
  ),
  current_mode text check (
    current_mode is null or current_mode in ('bus', 'van', 'self', 'new', 'other')
  ),
  main_pain text check (
    main_pain is null or main_pain in ('time', 'waiting', 'safety', 'routine', 'price')
  ),
  route_status text check (
    route_status is null or route_status in ('unknown', 'seats', 'full', 'not_covered')
  ),
  distance_km numeric,
  fee_quoted numeric,
  prebook_explained boolean,
  link_agreed boolean,
  objection_codes text,
  unanswered_questions text,
  callback_time text,
  lead_score integer,
  outcome_tag text check (
    outcome_tag is null or outcome_tag in (
      'hot_link_sent',
      'warm',
      'callback',
      'human_callback',
      'not_serviceable',
      'cold',
      'invalid',
      'do_not_call'
    )
  ),
  needs_human boolean not null default false,
  follow_up_status text not null default 'open' check (
    follow_up_status in ('open', 'link_sent', 'reminded', 'converted', 'closed')
  ),
  lead_status text not null default 'new' check (
    lead_status in (
      'new',
      'interested',
      'price_objection',
      'callback',
      'not_interested',
      'flagged',
      'do_not_call'
    )
  ),
  sarvam_attempt_id text,
  sarvam_campaign_id text,
  sarvam_interaction_id text,
  connectivity_status text,
  call_duration_sec numeric,
  call_summary text,
  transcript jsonb,
  last_called_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz default null,
  constraint parent_calling_leads_phone_key unique (phone)
);

create index if not exists idx_parent_calling_leads_deleted_at
  on public.parent_calling_leads (deleted_at)
  where deleted_at is null;

create index if not exists idx_parent_calling_leads_outcome
  on public.parent_calling_leads (outcome_tag)
  where deleted_at is null;

create index if not exists idx_parent_calling_leads_follow_up
  on public.parent_calling_leads (follow_up_status)
  where deleted_at is null;

create or replace function public.set_parent_calling_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_parent_calling_leads_updated_at on public.parent_calling_leads;
create trigger trg_parent_calling_leads_updated_at
  before update on public.parent_calling_leads
  for each row
  execute function public.set_parent_calling_leads_updated_at();

alter table public.parent_calling_leads enable row level security;

grant select, insert, update, delete on table public.parent_calling_leads to authenticated;

drop policy if exists parent_calling_leads_admin_manage on public.parent_calling_leads;
create policy parent_calling_leads_admin_manage
  on public.parent_calling_leads
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Webhook uses the service role and bypasses RLS.
-- follow_up_status and lead_status are team-owned. The webhook does not write
-- them, so a new phone starts at 'open' / 'new' and later calls do not reset
-- a status the team set.
