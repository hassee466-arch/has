create table if not exists public.blocked_profiles (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 2 and 500),
  created_at timestamptz not null default now()
);

alter table public.blocked_profiles enable row level security;
alter table public.profile_reports enable row level security;

drop policy if exists "Members can manage their blocks" on public.blocked_profiles;
create policy "Members can manage their blocks" on public.blocked_profiles
  for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

drop policy if exists "Members can report profiles" on public.profile_reports;
create policy "Members can report profiles" on public.profile_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

grant select, insert, update, delete on public.blocked_profiles to authenticated;
grant insert on public.profile_reports to authenticated;