create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  member_a uuid not null references public.profiles(id) on delete cascade,
  member_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (member_a <> member_b),
  unique (member_a, member_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Members can read their conversations" on public.conversations;
create policy "Members can read their conversations" on public.conversations
  for select to authenticated using (member_a = (select auth.uid()) or member_b = (select auth.uid()));

drop policy if exists "Members can create their conversations" on public.conversations;
create policy "Members can create their conversations" on public.conversations
  for insert to authenticated with check (member_a = (select auth.uid()) or member_b = (select auth.uid()));

drop policy if exists "Members can read conversation messages" on public.messages;
create policy "Members can read conversation messages" on public.messages
  for select to authenticated using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.member_a = (select auth.uid()) or c.member_b = (select auth.uid()))
  ));

drop policy if exists "Members can send conversation messages" on public.messages;
create policy "Members can send conversation messages" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid()) and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.member_a = (select auth.uid()) or c.member_b = (select auth.uid()))
    )
  );

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end;
$$;

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text not null default '',
  place text not null default '',
  duration text not null default '',
  credits integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_bookings (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  member_a uuid not null references public.profiles(id) on delete cascade,
  member_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (member_a <> member_b)
);

alter table public.challenges enable row level security;
alter table public.challenge_bookings enable row level security;

drop policy if exists "Members can read challenges" on public.challenges;
create policy "Members can read challenges" on public.challenges for select to authenticated using (true);

drop policy if exists "Booking members can read bookings" on public.challenge_bookings;
create policy "Booking members can read bookings" on public.challenge_bookings for select to authenticated using (member_a = (select auth.uid()) or member_b = (select auth.uid()));

drop policy if exists "Members can create bookings" on public.challenge_bookings;
create policy "Members can create bookings" on public.challenge_bookings for insert to authenticated with check (member_a = (select auth.uid()) or member_b = (select auth.uid()));

grant select on public.challenges to authenticated;
grant select, insert on public.challenge_bookings to authenticated;