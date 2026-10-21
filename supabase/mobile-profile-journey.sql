create table if not exists public.profile_personal_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date not null,
  gender text not null,
  interested_in text[] not null default '{}',
  nationality text,
  languages text
);

create or replace function public.enforce_profile_adult()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'Jannahu is only available to people aged 18 or older';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_personal_details_adult on public.profile_personal_details;
create trigger profile_personal_details_adult
before insert or update of date_of_birth on public.profile_personal_details
for each row execute function public.enforce_profile_adult();

create table if not exists public.profile_introductions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  video_url text,
  voice_url text
);

create table if not exists public.profile_personality (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb
);

create table if not exists public.profile_dating_intentions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  goals text[] not null default '{}',
  partner_qualities text[] not null default '{}'
);

create table if not exists public.profile_activity_interests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  activities text[] not null default '{}'
);

create table if not exists public.profile_challenge_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  challenge_types text[] not null default '{}',
  adventure_level smallint not null default 3 check (adventure_level between 1 and 5)
);

create table if not exists public.profile_lifestyle (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  is_public boolean not null default false
);

create table if not exists public.profile_partner_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb
);

create table if not exists public.profile_availability (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available_times text[] not null default '{}',
  budget text
);

create table if not exists public.profile_safety (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  adult_confirmed boolean not null default false,
  guidelines_accepted boolean not null default false,
  profile_visible boolean not null default false
);

alter table public.profile_personal_details enable row level security;
alter table public.profile_introductions enable row level security;
alter table public.profile_personality enable row level security;
alter table public.profile_dating_intentions enable row level security;
alter table public.profile_activity_interests enable row level security;
alter table public.profile_challenge_preferences enable row level security;
alter table public.profile_lifestyle enable row level security;
alter table public.profile_partner_preferences enable row level security;
alter table public.profile_availability enable row level security;
alter table public.profile_safety enable row level security;

drop policy if exists "Members manage their personal details" on public.profile_personal_details;
drop policy if exists "Members manage their introductions" on public.profile_introductions;
drop policy if exists "Members manage their personality" on public.profile_personality;
drop policy if exists "Members manage their dating intentions" on public.profile_dating_intentions;
drop policy if exists "Members manage their activity interests" on public.profile_activity_interests;
drop policy if exists "Members manage their challenge preferences" on public.profile_challenge_preferences;
drop policy if exists "Members manage their lifestyle" on public.profile_lifestyle;
drop policy if exists "Visible lifestyle is readable by members" on public.profile_lifestyle;
drop policy if exists "Members manage their partner preferences" on public.profile_partner_preferences;
drop policy if exists "Members manage their availability" on public.profile_availability;
drop policy if exists "Members manage their safety settings" on public.profile_safety;

create policy "Members manage their personal details" on public.profile_personal_details
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage their introductions" on public.profile_introductions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage their personality" on public.profile_personality
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage their dating intentions" on public.profile_dating_intentions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage their activity interests" on public.profile_activity_interests
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage their challenge preferences" on public.profile_challenge_preferences
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage their lifestyle" on public.profile_lifestyle
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Visible lifestyle is readable by members" on public.profile_lifestyle
  for select to authenticated
  using (is_public and exists (
    select 1 from public.profiles p
    where p.id = profile_lifestyle.user_id and p.is_visible = true
  ));
create policy "Members manage their partner preferences" on public.profile_partner_preferences
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage their availability" on public.profile_availability
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage their safety settings" on public.profile_safety
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.profile_personal_details to authenticated;
grant select, insert, update, delete on public.profile_introductions to authenticated;
grant select, insert, update, delete on public.profile_personality to authenticated;
grant select, insert, update, delete on public.profile_dating_intentions to authenticated;
grant select, insert, update, delete on public.profile_activity_interests to authenticated;
grant select, insert, update, delete on public.profile_challenge_preferences to authenticated;
grant select, insert, update, delete on public.profile_lifestyle to authenticated;
grant select, insert, update, delete on public.profile_partner_preferences to authenticated;
grant select, insert, update, delete on public.profile_availability to authenticated;
grant select, insert, update, delete on public.profile_safety to authenticated;

notify pgrst, 'reload schema';