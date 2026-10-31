-- ==============================================================================
-- BERYL — Supabase Profile Trigger, Grants & Realtime Configuration
-- ==============================================================================

-- 1. Automatic Profile Creation on Signup Trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

-- Drop and recreate the trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Schema Grants & Privileges (ensures service_role, authenticated & anon access)
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to anon, authenticated, service_role;


-- 3. Supabase Realtime Publication
-- Enables live websocket subscriptions for dashboard, audit log & approval alerts
do $$
begin
  alter publication supabase_realtime add table public.mandates;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.payment_requests;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.decisions;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.approvals;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.audit_events;
exception when others then null;
end $$;
