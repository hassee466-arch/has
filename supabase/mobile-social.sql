create table if not exists public.match_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('like', 'pass')),
  created_at timestamptz not null default now(),
  unique (actor_id, target_id)
);

alter table public.match_actions enable row level security;

drop policy if exists "Members can read their match actions" on public.match_actions;
create policy "Members can read their match actions"
  on public.match_actions for select to authenticated
  using (actor_id = (select auth.uid()));

drop policy if exists "Members can create their match actions" on public.match_actions;
create policy "Members can create their match actions"
  on public.match_actions for insert to authenticated
  with check (actor_id = (select auth.uid()));

drop policy if exists "Members can update their match actions" on public.match_actions;
create policy "Members can update their match actions"
  on public.match_actions for update to authenticated
  using (actor_id = (select auth.uid()))
  with check (actor_id = (select auth.uid()));

grant select, insert, update on public.match_actions to authenticated;