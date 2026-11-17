-- Team flag on a parent-calling lead. The webhook does not write this column.

alter table public.parent_calling_leads
  add column if not exists lead_status text not null default 'new';

alter table public.parent_calling_leads
  drop constraint if exists parent_calling_leads_lead_status_check;

alter table public.parent_calling_leads
  add constraint parent_calling_leads_lead_status_check
  check (
    lead_status in (
      'new',
      'interested',
      'price_objection',
      'callback',
      'not_interested',
      'flagged',
      'do_not_call'
    )
  );

create index if not exists idx_parent_calling_leads_lead_status
  on public.parent_calling_leads (lead_status)
  where deleted_at is null;
