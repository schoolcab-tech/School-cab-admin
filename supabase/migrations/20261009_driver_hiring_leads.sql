-- Driver hiring leads from Sarvam campaign / inbound callbacks

create table if not exists public.driver_hiring_leads (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  name text,
  interest_type text check (
    interest_type is null
    or interest_type in ('full_time', 'office', 'school', 'none')
  ),
  preferred_hub text check (
    preferred_hub is null or preferred_hub in ('chhawla', 'najafgarh')
  ),
  visit_datetime_text text,
  visit_at timestamptz,
  has_valid_licence boolean,
  has_address_proof boolean,
  deposit_path text check (
    deposit_path is null
    or deposit_path in ('full_6000', 'split_3000', 'cannot_pay', 'not_discussed')
  ),
  lead_score integer,
  lead_tag text check (
    lead_tag is null
    or lead_tag in ('hot', 'warm', 'cold', 'objecting', 'not_fit')
  ),
  callback_datetime_text text,
  not_fit_reason text,
  needs_human_escalation boolean not null default false,
  visit_status text not null default 'none' check (
    visit_status in ('none', 'pending', 'visited', 'no_show', 'joined')
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
  constraint driver_hiring_leads_phone_key unique (phone)
);

create index if not exists idx_driver_hiring_leads_deleted_at
  on public.driver_hiring_leads (deleted_at)
  where deleted_at is null;

create index if not exists idx_driver_hiring_leads_lead_tag
  on public.driver_hiring_leads (lead_tag)
  where deleted_at is null;

create index if not exists idx_driver_hiring_leads_visit_status
  on public.driver_hiring_leads (visit_status)
  where deleted_at is null;

create or replace function public.set_driver_hiring_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_driver_hiring_leads_updated_at on public.driver_hiring_leads;
create trigger trg_driver_hiring_leads_updated_at
  before update on public.driver_hiring_leads
  for each row
  execute function public.set_driver_hiring_leads_updated_at();

alter table public.driver_hiring_leads enable row level security;

grant select, insert, update, delete on table public.driver_hiring_leads to authenticated;

drop policy if exists driver_hiring_leads_admin_manage on public.driver_hiring_leads;
create policy driver_hiring_leads_admin_manage
  on public.driver_hiring_leads
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- Webhook uses service role (bypasses RLS).
