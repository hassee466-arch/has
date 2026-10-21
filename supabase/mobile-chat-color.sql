alter table public.profiles
  add column if not exists chat_color text not null default '#f1d8cc';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_chat_color_allowed'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_chat_color_allowed
      check (chat_color in ('#f1d8cc', '#d4e5f7', '#e7f0d8', '#f5eadf', '#e8e0f0', '#f7e8e8'));
  end if;
end
$$;

grant select, update on public.profiles to authenticated;

notify pgrst, 'reload schema';
