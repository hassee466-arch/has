-- Jannahu business architecture: partners, offers, bookings, subscriptions, wallets,
-- subsidy ledger, QR redemptions, reviews, reports. Builds on existing profiles/match_actions/
-- conversations/messages/blocked_profiles/profile_reports and the challenge engine content.

-- Idempotent reset: remove earlier drafts of these business objects so reruns are clean.
-- Safe because these tables are new and hold no production data yet.
drop function if exists public.redeem_booking(uuid, uuid, uuid);
drop function if exists public.confirm_booking(uuid);
drop function if exists public.propose_booking(text, uuid, timestamptz);
drop function if exists public.wallet_for(uuid);
drop function if exists public.current_support_period();
drop type if exists public.support_period cascade;
drop table if exists public.qr_redemptions cascade;
drop table if exists public.subsidy_ledger cascade;
drop table if exists public.reviews cascade;
drop table if exists public.safety_reports cascade;
drop table if exists public.payments cascade;
drop table if exists public.bookings cascade;
drop table if exists public.challenge_wallets cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.partner_offers cascade;
drop table if exists public.challenge_stages cascade;
drop table if exists public.challenges cascade;
drop table if exists public.partners cascade;

-- Challenges and their stages (drives the mission engine)
create table if not exists public.challenges (
  id text primary key,
  title text not null,
  category text not null check (category in ('mystery', 'competition', 'creative', 'adventure', 'connection', 'teamwork')),
  level smallint not null default 1 check (level between 1 and 3),
  duration_minutes integer not null check (duration_minutes > 0),
  member_price_sek integer,
  partner_id uuid,
  area text,
  description text not null,
  goal text,
  reward text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_stages (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.challenges(id) on delete cascade,
  stage_number smallint not null,
  title text not null,
  description text not null,
  unique (challenge_id, stage_number)
);

-- Partner companies and their offers
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  city text,
  contact_email text,
  status text not null default 'active' check (status in ('active', 'paused', 'pending')),
  commission_rate numeric(4,3) not null default 0.10 check (commission_rate >= 0 and commission_rate <= 1),
  created_at timestamptz not null default now()
);

alter table public.challenges
  drop constraint if exists challenges_partner_id_fkey,
  add constraint challenges_partner_id_fkey foreign key (partner_id) references public.partners(id) on delete set null;

create table if not exists public.partner_offers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  challenge_id text references public.challenges(id) on delete set null,
  title text not null,
  list_price_sek integer not null check (list_price_sek >= 0),
  partner_price_sek integer not null check (partner_price_sek >= 0),
  member_price_sek integer not null check (member_price_sek >= 0),
  max_subsidy_sek integer not null default 0 check (max_subsidy_sek >= 0),
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (member_price_sek <= partner_price_sek and partner_price_sek <= list_price_sek)
);

-- Membership subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('free', 'plus', 'premium', 'adventure')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due', 'trialing')),
  monthly_support_budget_sek integer not null default 0 check (monthly_support_budget_sek >= 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- Payment transactions (provider references, never card numbers)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null default 'swish',
  provider_reference text,
  amount_sek integer not null check (amount_sek > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  kind text not null check (kind in ('booking', 'subscription', 'refund')),
  created_at timestamptz not null default now()
);

-- Challenge wallets: available date-support balance per member
create table if not exists public.challenge_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance_sek integer not null default 0 check (balance_sek >= 0),
  monthly_limit_sek integer not null default 0 check (monthly_limit_sek >= 0),
  period_start date,
  period_end date,
  updated_at timestamptz not null default now()
);

-- Bookings connect members, challenges, partners, and payments
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.challenges(id) on delete restrict,
  member_a uuid not null references public.profiles(id),
  member_b uuid references public.profiles(id),
  partner_id uuid references public.partners(id) on delete set null,
  offer_id uuid references public.partner_offers(id) on delete set null,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'paid', 'completed', 'cancelled', 'no_show')),
  scheduled_for timestamptz,
  member_paid_sek integer not null default 0 check (member_paid_sek >= 0),
  subsidy_sek integer not null default 0 check (subsidy_sek >= 0),
  partner_payout_sek integer not null default 0 check (partner_payout_sek >= 0),
  commission_sek integer not null default 0 check (commission_sek >= 0),
  qr_token uuid not null default gen_random_uuid(),
  qr_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (member_b is null or member_a <> member_b)
);

alter table public.payments
  drop constraint if exists payments_booking_id_fkey,
  add constraint payments_booking_id_fkey foreign key (booking_id) references public.bookings(id) on delete set null;

create unique index if not exists payments_booking_completed_unique
  on public.payments (booking_id)
  where booking_id is not null and status = 'completed';

-- Subsidy ledger: every economic movement is recorded once
create table if not exists public.subsidy_ledger (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  entry_type text not null check (entry_type in ('member_payment', 'subsidy_grant', 'partner_commission', 'partner_payout', 'refund', 'adjustment')),
  amount_sek integer not null,
  created_at timestamptz not null default now(),
  unique (booking_id, entry_type)
);

-- QR redemptions: one redemption per booking
create table if not exists public.qr_redemptions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  redeemed_by uuid references public.partners(id) on delete set null,
  redeemed_at timestamptz not null default now()
);

-- Reviews and safety reports
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid references public.profiles(id),
  partner_id uuid references public.partners(id),
  rating smallint check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  booking_id uuid references public.bookings(id) on delete set null,
  reported_id uuid references public.profiles(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 2 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

-- Business functions ---------------------------------------------------------

create type public.support_period as (period_start date, period_end date);

create or replace function public.current_support_period()
returns public.support_period
language sql
stable
as $$
  select date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
$$;

create or replace function public.wallet_for(p_user uuid)
returns public.challenge_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet public.challenge_wallets;
  period record;
begin
  select * into period from public.current_support_period();
  insert into public.challenge_wallets (user_id, balance_sek, monthly_limit_sek, period_start, period_end)
  select p_user, coalesce(s.monthly_support_budget_sek, 0), coalesce(s.monthly_support_budget_sek, 0), period.period_start, period.period_end
  from public.subscriptions s
  where s.user_id = p_user
  on conflict (user_id) do nothing;

  select * into wallet from public.challenge_wallets where user_id = p_user;
  if wallet is null then
    insert into public.challenge_wallets (user_id, balance_sek, monthly_limit_sek, period_start, period_end)
    values (p_user, 0, 0, period.period_start, period.period_end)
    returning * into wallet;
  end if;
  return wallet;
end;
$$;

create or replace function public.propose_booking(p_challenge_id text, p_member_b uuid, p_scheduled_for timestamptz)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge public.challenges;
  offer public.partner_offers;
  booking public.bookings;
  member_a uuid := (select auth.uid());
begin
  if member_a is null then raise exception 'not authenticated'; end if;
  if member_b = member_a then raise exception 'a booking needs two different members'; end if;
  select * into challenge from public.challenges where id = p_challenge_id and is_active;
  if challenge is null then raise exception 'challenge not found'; end if;
  select * into offer from public.partner_offers
    where challenge_id = p_challenge_id and is_active
      and (valid_from is null or valid_from <= now())
      and (valid_until is null or valid_until > now())
    order by member_price_sek asc limit 1;
  insert into public.bookings (challenge_id, member_a, member_b, partner_id, offer_id, status, scheduled_for, qr_expires_at)
  values (p_challenge_id, member_a, member_b, coalesce(offer.partner_id, challenge.partner_id), offer.id, 'proposed', p_scheduled_for, p_scheduled_for + interval '2 hours')
  returning * into booking;
  return booking;
end;
$$;

create or replace function public.confirm_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking public.bookings;
begin
  update public.bookings set status = 'confirmed'
    where id = p_booking_id and status = 'proposed' and member_b = (select auth.uid())
    returning * into booking;
  if booking is null then raise exception 'booking not found or not yours to confirm'; end if;
  return booking;
end;
$$;

create or replace function public.redeem_booking(p_booking_id uuid, p_qr_token uuid, p_partner uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  booking public.bookings;
  offer public.partner_offers;
  partner public.partners;
  commission integer;
begin
  select * into booking from public.bookings where id = p_booking_id and status in ('confirmed', 'paid') for update;
  if booking is null then raise exception 'booking not found or already completed'; end if;
  if booking.qr_token <> p_qr_token then raise exception 'invalid qr token'; end if;
  if booking.qr_expires_at is not null and booking.qr_expires_at < now() then raise exception 'qr token expired'; end if;
  select * into partner from public.partners where id = p_partner and status = 'active';
  if partner is null then raise exception 'partner not found'; end if;
  select * into offer from public.partner_offers where id = booking.offer_id;
  commission := coalesce(round(coalesce(offer.partner_price_sek, 0) * partner.commission_rate), 0);

  insert into public.qr_redemptions (booking_id, redeemed_by) values (p_booking_id, p_partner);

  update public.bookings set
    status = 'completed',
    completed_at = now(),
    partner_payout_sek = coalesce(offer.partner_price_sek, 0) - commission,
    commission_sek = commission
  where id = p_booking_id
  returning * into booking;

  insert into public.subsidy_ledger (booking_id, entry_type, amount_sek) values
    (p_booking_id, 'member_payment', booking.member_paid_sek),
    (p_booking_id, 'subsidy_grant', booking.subsidy_sek),
    (p_booking_id, 'partner_commission', commission),
    (p_booking_id, 'partner_payout', booking.partner_payout_sek)
  on conflict (booking_id, entry_type) do nothing;

  return booking;
end;
$$;

-- Row level security ---------------------------------------------------------

alter table public.challenges enable row level security;
alter table public.challenge_stages enable row level security;
alter table public.partners enable row level security;
alter table public.partner_offers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.challenge_wallets enable row level security;
alter table public.bookings enable row level security;
alter table public.subsidy_ledger enable row level security;
alter table public.qr_redemptions enable row level security;
alter table public.reviews enable row level security;
alter table public.safety_reports enable row level security;

drop policy if exists "Members can read active challenges" on public.challenges;
create policy "Members can read active challenges" on public.challenges
  for select to authenticated using (is_active = true);

drop policy if exists "Members can read challenge stages" on public.challenge_stages;
create policy "Members can read challenge stages" on public.challenge_stages
  for select to authenticated using (exists (select 1 from public.challenges c where c.id = challenge_stages.challenge_id and c.is_active));

drop policy if exists "Members can read active partners" on public.partners;
create policy "Members can read active partners" on public.partners
  for select to authenticated using (status = 'active');

drop policy if exists "Members can read active offers" on public.partner_offers;
create policy "Members can read active offers" on public.partner_offers
  for select to authenticated using (is_active = true);

drop policy if exists "Members can read their own subscription" on public.subscriptions;
create policy "Members can read their own subscription" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Members can read their own payments" on public.payments;
create policy "Members can read their own payments" on public.payments
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Members can read their own wallet" on public.challenge_wallets;
create policy "Members can read their own wallet" on public.challenge_wallets
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Members can read their own bookings" on public.bookings;
create policy "Members can read their own bookings" on public.bookings
  for select to authenticated using (member_a = (select auth.uid()) or member_b = (select auth.uid()));

drop policy if exists "Members can read their own ledger" on public.subsidy_ledger;
create policy "Members can read their own ledger" on public.subsidy_ledger
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = subsidy_ledger.booking_id
        and (b.member_a = (select auth.uid()) or b.member_b = (select auth.uid()))
    )
  );

drop policy if exists "Members can read their own redemptions" on public.qr_redemptions;
create policy "Members can read their own redemptions" on public.qr_redemptions
  for select to authenticated using (
    exists (
      select 1 from public.bookings b
      where b.id = qr_redemptions.booking_id
        and (b.member_a = (select auth.uid()) or b.member_b = (select auth.uid()))
    )
  );

drop policy if exists "Members can read their own reviews" on public.reviews;
create policy "Members can read their own reviews" on public.reviews
  for select to authenticated using (reviewer_id = (select auth.uid()) or reviewee_id = (select auth.uid()));

drop policy if exists "Members can write reviews for their bookings" on public.reviews;
create policy "Members can write reviews for their bookings" on public.reviews
  for insert to authenticated with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and (b.member_a = (select auth.uid()) or b.member_b = (select auth.uid()))
    )
  );

drop policy if exists "Members can file safety reports" on public.safety_reports;
create policy "Members can file safety reports" on public.safety_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

drop policy if exists "Members can read their own reports" on public.safety_reports;
create policy "Members can read their own reports" on public.safety_reports
  for select to authenticated using (reporter_id = (select auth.uid()));

-- Grants: writes go through the security-definer functions; direct inserts are blocked by RLS.
grant select on public.challenges, public.challenge_stages, public.partners, public.partner_offers to authenticated;
grant select on public.subscriptions, public.payments, public.challenge_wallets, public.bookings, public.subsidy_ledger, public.qr_redemptions, public.reviews, public.safety_reports to authenticated;
grant insert on public.reviews, public.safety_reports to authenticated;
grant execute on function public.wallet_for(uuid) to authenticated;
grant execute on function public.propose_booking(text, uuid, timestamptz) to authenticated;
grant execute on function public.confirm_booking(uuid) to authenticated;

-- redeem_booking is partner-facing: only partners (linked by contact) call it. Members never do.
revoke execute on function public.redeem_booking(uuid, uuid, uuid) from public;

notify pgrst, 'reload schema';
