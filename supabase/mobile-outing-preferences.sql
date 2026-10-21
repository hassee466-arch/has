alter table public.profile_availability
  add column if not exists food_preferences text[] not null default '{}',
  add column if not exists venue_preferences text[] not null default '{}',
  add column if not exists try_new_activities text,
  add column if not exists first_date_setting text;

alter table public.profile_challenge_preferences
  add column if not exists interested boolean not null default true;

alter table public.profile_availability
  drop constraint if exists profile_availability_try_new_activities_allowed,
  add constraint profile_availability_try_new_activities_allowed
    check (try_new_activities is null or try_new_activities in (
      'Gärna något nytt',
      'Ibland, med rätt person',
      'Helst bekanta aktiviteter'
    )),
  drop constraint if exists profile_availability_first_date_setting_allowed,
  add constraint profile_availability_first_date_setting_allowed
    check (first_date_setting is null or first_date_setting in (
      'Kafé eller fika',
      'Promenad utomhus',
      'En aktivitet tillsammans',
      'Lunch eller middag',
      'Offentlig plats med mycket folk',
      'Digitalt först'
    ));

grant select, insert, update, delete on public.profile_availability to authenticated;
grant select, insert, update, delete on public.profile_challenge_preferences to authenticated;

notify pgrst, 'reload schema';
