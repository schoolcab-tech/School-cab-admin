-- Let platform admins manage the charger catalogue from the admin panel.
-- The caller-bot edge function keeps reading with the service role.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'master_admin')
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

grant select, insert, update, delete on table public.ev_charging_points to authenticated;

drop policy if exists ev_charging_points_admin_manage on public.ev_charging_points;
create policy ev_charging_points_admin_manage
  on public.ev_charging_points
  for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
