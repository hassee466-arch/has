alter table public.profiles
  add column if not exists looking_for text not null default 'Seriöst',
  add column if not exists lifestyle jsonb not null default '{}'::jsonb;

grant select, insert, update on public.profiles to authenticated;