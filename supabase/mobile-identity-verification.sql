-- Jannahu identity verification
-- Provider processes documents; this table stores only the result, never document images or passport data.

create table if not exists public.identity_verifications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'sumsub',
  applicant_id text unique,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'needs_retry', 'manual_review', 'rejected')),
  review_answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz
);

alter table public.identity_verifications enable row level security;

drop policy if exists "Users can view their own verification" on public.identity_verifications;
create policy "Users can view their own verification" on public.identity_verifications
  for select to authenticated
  using (user_id = (select auth.uid()));
-- No insert/update/delete policies: only the server (service role) writes verification results.

grant select on public.identity_verifications to authenticated;

create or replace function public.is_identity_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.identity_verifications
    where user_id = (select auth.uid())
      and status = 'verified'
  );
$$;

revoke all on function public.is_identity_verified() from public;
grant execute on function public.is_identity_verified() to authenticated;

-- Gate dating features on verified identity. Existing members' policies are replaced with verified-only versions.
drop policy if exists "Profiles are visible to members" on public.profiles;
drop policy if exists "Members can update their own profile" on public.profiles;
drop policy if exists "Members can insert their own profile" on public.profiles;

create policy "Verified members can see visible profiles" on public.profiles
  for select to authenticated
  using (is_visible = true and public.is_identity_verified());

create policy "Verified members can manage their own profile" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()) and public.is_identity_verified())
  with check (id = (select auth.uid()) and public.is_identity_verified());

drop policy if exists "Members can record match actions" on public.match_actions;
create policy "Verified members can record match actions" on public.match_actions
  for all to authenticated
  using (actor_id = (select auth.uid()) and public.is_identity_verified())
  with check (actor_id = (select auth.uid()) and public.is_identity_verified());

drop policy if exists "Members can read conversations they belong to" on public.conversations;
create policy "Verified members can read their conversations" on public.conversations
  for select to authenticated
  using (
    (member_a = (select auth.uid()) or member_b = (select auth.uid()))
    and public.is_identity_verified()
  );

drop policy if exists "Members can read their conversations messages" on public.messages;
create policy "Verified members can read their messages" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.member_a = (select auth.uid()) or c.member_b = (select auth.uid()))
    )
    and public.is_identity_verified()
  );

drop policy if exists "Members can send messages in their conversations" on public.messages;
create policy "Verified members can send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_identity_verified()
  );

notify pgrst, 'reload schema';
