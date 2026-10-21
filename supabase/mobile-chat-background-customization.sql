alter table public.profiles
  add column if not exists chat_panel_pattern text not null default 'plain';

alter table public.profiles
  drop constraint if exists profiles_chat_panel_color_allowed;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_chat_panel_color_hex'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_chat_panel_color_hex
      check (chat_panel_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_chat_panel_pattern_allowed'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_chat_panel_pattern_allowed
      check (chat_panel_pattern in ('plain', 'dots', 'stripes', 'hearts', 'flowers', 'waves'));
  end if;
end
$$;

grant select, update on public.profiles to authenticated;

notify pgrst, 'reload schema';
