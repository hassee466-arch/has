-- Jannahu admin control panel: admin role, admin RLS policies, and seed data
-- for partners/challenges. Safe to rerun. Business-table sections are guarded
-- and skipped automatically if mobile-business.sql has not been applied yet.

-- Admin + suspension flags on profiles ---------------------------------------

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists is_suspended boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = (select auth.uid())), false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Core admin policies (tables that always exist) -----------------------------

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read verifications" on public.identity_verifications;
create policy "Admins can read verifications" on public.identity_verifications
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can decide verifications" on public.identity_verifications;
create policy "Admins can decide verifications" on public.identity_verifications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read profile reports" on public.profile_reports;
create policy "Admins can read profile reports" on public.profile_reports
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can read blocks" on public.blocked_profiles;
create policy "Admins can read blocks" on public.blocked_profiles
  for select to authenticated using (public.is_admin());

grant select, update on public.identity_verifications to authenticated;
grant select on public.profile_reports, public.blocked_profiles to authenticated;

-- Business admin policies (skipped if mobile-business.sql not applied) -------

do $$
begin
  if to_regclass('public.partners') is not null then
    execute 'drop policy if exists "Admins can manage partners" on public.partners';
    execute 'create policy "Admins can manage partners" on public.partners for all to authenticated using (public.is_admin()) with check (public.is_admin())';
    execute 'grant insert, update, delete on public.partners to authenticated';
  end if;

  if to_regclass('public.partner_offers') is not null then
    execute 'drop policy if exists "Admins can manage offers" on public.partner_offers';
    execute 'create policy "Admins can manage offers" on public.partner_offers for all to authenticated using (public.is_admin()) with check (public.is_admin())';
    execute 'grant insert, update, delete on public.partner_offers to authenticated';
  end if;

  if to_regclass('public.challenges') is not null then
    execute 'drop policy if exists "Admins can manage challenges" on public.challenges';
    execute 'create policy "Admins can manage challenges" on public.challenges for all to authenticated using (public.is_admin()) with check (public.is_admin())';
    execute 'grant insert, update, delete on public.challenges to authenticated';
  end if;

  if to_regclass('public.challenge_stages') is not null then
    execute 'drop policy if exists "Admins can manage stages" on public.challenge_stages';
    execute 'create policy "Admins can manage stages" on public.challenge_stages for all to authenticated using (public.is_admin()) with check (public.is_admin())';
    execute 'grant insert, update, delete on public.challenge_stages to authenticated';
  end if;

  if to_regclass('public.bookings') is not null then
    execute 'drop policy if exists "Admins can read all bookings" on public.bookings';
    execute 'create policy "Admins can read all bookings" on public.bookings for select to authenticated using (public.is_admin())';
  end if;

  if to_regclass('public.subscriptions') is not null then
    execute 'drop policy if exists "Admins can read all subscriptions" on public.subscriptions';
    execute 'create policy "Admins can read all subscriptions" on public.subscriptions for select to authenticated using (public.is_admin())';
  end if;

  if to_regclass('public.payments') is not null then
    execute 'drop policy if exists "Admins can read all payments" on public.payments';
    execute 'create policy "Admins can read all payments" on public.payments for select to authenticated using (public.is_admin())';
  end if;

  if to_regclass('public.subsidy_ledger') is not null then
    execute 'drop policy if exists "Admins can read all ledger entries" on public.subsidy_ledger';
    execute 'create policy "Admins can read all ledger entries" on public.subsidy_ledger for select to authenticated using (public.is_admin())';
  end if;

  if to_regclass('public.safety_reports') is not null then
    execute 'drop policy if exists "Admins can manage safety reports" on public.safety_reports';
    execute 'create policy "Admins can manage safety reports" on public.safety_reports for all to authenticated using (public.is_admin()) with check (public.is_admin())';
    execute 'grant select, update on public.safety_reports to authenticated';
  end if;
end $$;

-- Seed partners + challenges + stages (mirrors the in-app challenge engine) --

do $$
begin
  if to_regclass('public.challenges') is not null then
    insert into public.partners (name, category, city)
    select v.name, v.category, v.city
    from (values
      ('Bröd & Blom', 'Café', 'Stockholm'),
      ('Lera Studio', 'Studio', 'Stockholm'),
      ('Green & Putt', 'Minigolf', 'Stockholm'),
      ('Monteliusvägen', 'Utomhus', 'Stockholm'),
      ('Riddle Room', 'Escape room', 'Stockholm'),
      ('Kaffeverket', 'Café', 'Stockholm'),
      ('City Quest', 'Stadsvandring', 'Stockholm'),
      ('Bowl & Talk', 'Bowling', 'Stockholm'),
      ('Fotografiska', 'Museum', 'Stockholm'),
      ('Waxholmsbolaget', 'Transport', 'Stockholm'),
      ('Kök & Co', 'Matlagningsstudio', 'Stockholm')
    ) as v(name, category, city)
    where not exists (select 1 from public.partners p where p.name = v.name);

    insert into public.challenges (id, title, category, level, duration_minutes, member_price_sek, partner_id, area, description, goal, reward)
    select v.id, v.title, v.category, v.level, v.duration, v.price,
      (select id from public.partners where name = v.partner),
      v.area, v.description, v.goal, v.reward
    from (values
      ('connection-30', '30-minuterskontakten', 'connection', 2, 30, 49, 'Bröd & Blom', 'Södermalm',
        'Ett kafébaserat uppdrag designat för två personer som vill lära känna varandra bortom småprat.',
        'Hitta tre saker ni båda vill utforska tillsammans.', '20 credits var · fika ingår i priset'),
      ('mystery-cafe', 'Den försvunna beställningen', 'mystery', 1, 45, 79, 'Lera Studio', 'Vasastan',
        'En ledtråd gömmer sig i caféet. Tillsammans följer ni spåret till en överraskning som väntar på er.',
        'Lös alla tre ledtrådar innan tiden tar slut.', '25 credits var · överraskning ingår'),
      ('competition-minigolf', 'Minigolf-duellen', 'competition', 1, 60, 99, 'Green & Putt', 'Gärdet',
        'Nio hål, en poängtavla och en vänskapsfråga vid varje hål. Den som förlorar bjuder på eftersnacket.',
        'Spela igenom banan och svara på frågan vid varje hål.', '30 credits till vinnaren · 10 credits var'),
      ('creative-clay', 'Lera för två', 'creative', 2, 75, 149, 'Lera Studio', 'Vasastan',
        'Forma något tillsammans utan att prata om vad det ska bli. Konstverket avslöjar sig i slutet.',
        'Skapa ett gemensamt föremål utan att avslöja planen för varandra.', '50 credits var · ni tar med skapelsen hem'),
      ('adventure-view', 'Vyn över stan', 'adventure', 2, 60, null, 'Monteliusvägen', 'Södermalm',
        'Ett vandringsuppdrag längs Monteliusvägen med tre stationer och en bildskatt att hitta tillsammans.',
        'Besök alla tre stationer och hitta den gömda utsikten.', 'Gratis uppdrag · 15 credits var'),
      ('teamwork-escape', '30 minuter mot klockan', 'teamwork', 3, 30, 189, 'Riddle Room', 'Norrmalm',
        'Ett kompakt escape-uppdrag där ni måste dela upp ledtrådar, lås och beslut för att klara rummet i tid.',
        'Slutför rummet innan klockan når noll.', '60 credits var vid lyckad flykt'),
      ('connection-questions', '36 frågor, en kopp kaffe', 'connection', 1, 45, 39, 'Kaffeverket', 'Sankt Eriksplan',
        'En kuraterad frågeserie som går från lättsamt till personligt, designad för att bygga riktig kontakt.',
        'Svara på alla tre nivåer av frågor, i ert eget tempo.', '15 credits var · espresso ingår'),
      ('mystery-city', 'Stadens hemlighet', 'mystery', 3, 90, 129, 'City Quest', 'Gamla stan',
        'En vandrande mysteriejakt genom Gamla stan där varje svar öppnar nästa del av historien.',
        'Avslöja berättelsen bakom stadens hemlighet tillsammans.', '40 credits var · avslutningsfika ingår'),
      ('competition-bowling', 'Bowlingkvällen', 'competition', 2, 75, 119, 'Bowl & Talk', 'Fridhemsplan',
        'En serie med tre korta serier där varje förlorad serie kostar ett ärligt svar.',
        'Spela tre serier — och svara ärligt när du tappar en.', '35 credits var · dryck ingår'),
      ('creative-photo', 'En timme i färg', 'creative', 1, 60, null, 'Fotografiska', 'Stadsgården',
        'Fotografera varandras syn på samma plats och jämför bilderna i slutet av uppdraget.',
        'Fånga tio bilder var — samma plats, två perspektiv.', 'Gratis uppdrag · 20 credits var'),
      ('adventure-islands', 'Ö-hoppningen', 'adventure', 3, 120, 69, 'Waxholmsbolaget', 'Skärgården',
        'Tre öar, tre små uppdrag och en färjetidtabell att hålla — ett större äventyr för rätt par.',
        'Besök tre öar och slutför ett uppdrag på varje.', '45 credits var · picknickkarta ingår'),
      ('teamwork-cook', 'Middagsuppdraget', 'teamwork', 2, 90, 159, 'Kök & Co', 'Kungsholmen',
        'Laga en trerättersmiddag tillsammans från en hemlig ingredienslåda — menyn avslöjas först på plats.',
        'Servera en komplett middag inom 90 minuter.', '55 credits var · middagen ingår')
    ) as v(id, title, category, level, duration, price, partner, area, description, goal, reward)
    on conflict (id) do update set
      title = excluded.title,
      category = excluded.category,
      level = excluded.level,
      duration_minutes = excluded.duration_minutes,
      member_price_sek = excluded.member_price_sek,
      partner_id = excluded.partner_id,
      area = excluded.area,
      description = excluded.description,
      goal = excluded.goal,
      reward = excluded.reward;

    delete from public.challenge_stages where challenge_id in (
      'connection-30', 'mystery-cafe', 'competition-minigolf', 'creative-clay', 'adventure-view',
      'teamwork-escape', 'connection-questions', 'mystery-city', 'competition-bowling', 'creative-photo',
      'adventure-islands', 'teamwork-cook'
    );

    insert into public.challenge_stages (challenge_id, stage_number, title, description)
    select * from (values
      ('connection-30', 1, 'Första intrycket', 'Var och en väljer tre frågor att ställa till den andra.'),
      ('connection-30', 2, 'Mysteriet', 'Gissa tre saker om varandras intressen utan att fråga rakt ut.'),
      ('connection-30', 3, 'Samarbete', 'Planera tillsammans en drömhelg med en begränsad budget.'),
      ('connection-30', 4, 'Beslutet', 'Bestäm var för sig om ni vill ta ett nytt uppdrag tillsammans.'),
      ('mystery-cafe', 1, 'Första ledtråden', 'Personalen ger er den första ledtråden när ni checkar in.'),
      ('mystery-cafe', 2, 'Samarbete', 'Kombinera era svar för att hitta nästa steg.'),
      ('mystery-cafe', 3, 'Avslöjandet', 'Hitta överraskningen som gömts för er.'),
      ('competition-minigolf', 1, 'Uppvärmning', 'Tre första hålen med en enkel fråga per hål.'),
      ('competition-minigolf', 2, 'Mittpartiet', 'Frågorna blir djupare i takt med spelet.'),
      ('competition-minigolf', 3, 'Finalen', 'Sista hålet avgör duellen — och bjudningen.'),
      ('creative-clay', 1, 'Materialen', 'Välj lera och verktyg utan att diskutera idén.'),
      ('creative-clay', 2, 'Formandet', 'Bygg vidare på varandras drag, i tystnad.'),
      ('creative-clay', 3, 'Avslöjandet', 'Berätta vad ni trodde ni skapade — och vad det blev.'),
      ('adventure-view', 1, 'Startpunkten', 'Möt upp vid Ivar Los park och hämta första kartan.'),
      ('adventure-view', 2, 'Stationerna', 'Lös ett litet uppdrag vid varje utsiktspunkt.'),
      ('adventure-view', 3, 'Målet', 'Hitta den gömda utsikten och dela bilden tillsammans.'),
      ('teamwork-escape', 1, 'Innescanning', 'Fyra minuter att kartlägga rummet tillsammans.'),
      ('teamwork-escape', 2, 'Fördelningen', 'Dela upp gåtorna — ingen får göra allt själv.'),
      ('teamwork-escape', 3, 'Slutspurten', 'Kombinera era lösningar och öppna sista låset.'),
      ('connection-questions', 1, 'Lättsamt', 'Tolv snabba frågor om vardag, favoriter och vanor.'),
      ('connection-questions', 2, 'Personligt', 'Tolv frågor om drömmar, rädslor och stolthet.'),
      ('connection-questions', 3, 'Djupet', 'Tolv frågor som bara passar när samtalet känns tryggt.'),
      ('mystery-city', 1, 'Prologen', 'Få första kapitlet och kartans startpunkt.'),
      ('mystery-city', 2, 'Förföljelsen', 'Följ ledtrådarna genom gränderna, ett kapitel i taget.'),
      ('mystery-city', 3, 'Finalen', 'Lös det sista mysteriet vid vattnet.'),
      ('competition-bowling', 1, 'Första serien', 'Uppvärmning och första frågan till förloraren.'),
      ('competition-bowling', 2, 'Revanschen', 'Den som ligger under får välja nästa fråga.'),
      ('competition-bowling', 3, 'Finalserien', 'Sista serien avgör vem som bjuder på nästa uppdrag.'),
      ('creative-photo', 1, 'Perspektiven', 'Fem bilder var på det ni ser olika.'),
      ('creative-photo', 2, 'Porträttet', 'En bild var av den andra, i deras favoritljus.'),
      ('creative-photo', 3, 'Galleriet', 'Jämför era bilder och välj varandras favorit.'),
      ('adventure-islands', 1, 'Färjan ut', 'Planera rutten tillsammans innan avfärd.'),
      ('adventure-islands', 2, 'Öarna', 'Ett litet uppdrag per ö, från lekfullt till personligt.'),
      ('adventure-islands', 3, 'Hemresan', 'Sammanfatta dagen med var sin höjdpunkt.'),
      ('teamwork-cook', 1, 'Lådan', 'Öppna ingredienslådan och fördela arbetsuppgifterna.'),
      ('teamwork-cook', 2, 'Matlagningen', 'Laga mot klockan, en rätt var i taget.'),
      ('teamwork-cook', 3, 'Serveringen', 'Duka upp och ät det ni skapade tillsammans.')
    ) as s(challenge_id, stage_number, title, description);
  end if;
end $$;

notify pgrst, 'reload schema';

-- Make your own account an admin (replace with your email):
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'din@epost.se');
