create or replace function public.can_message_member_pair(member_a uuid, member_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (member_a = auth.uid() or member_b = auth.uid())
    and exists (
      select 1 from public.match_actions outgoing
      where outgoing.actor_id = member_a
        and outgoing.target_id = member_b
        and outgoing.action = 'like'
    )
    and exists (
      select 1 from public.match_actions incoming
      where incoming.actor_id = member_b
        and incoming.target_id = member_a
        and incoming.action = 'like'
    )
    and not exists (
      select 1 from public.blocked_profiles blocked
      where (blocked.blocker_id = member_a and blocked.blocked_id = member_b)
         or (blocked.blocker_id = member_b and blocked.blocked_id = member_a)
    );
$$;

revoke all on function public.can_message_member_pair(uuid, uuid) from public;
grant execute on function public.can_message_member_pair(uuid, uuid) to authenticated;

drop policy if exists "Members can read their match actions" on public.match_actions;
drop policy if exists "Members can read outgoing and incoming likes" on public.match_actions;
create policy "Members can read outgoing and incoming likes"
  on public.match_actions for select to authenticated
  using (
    actor_id = (select auth.uid())
    or (target_id = (select auth.uid()) and action = 'like')
  );

drop policy if exists "Members can read their conversations" on public.conversations;
create policy "Mutual matches can read conversations" on public.conversations
  for select to authenticated
  using (public.can_message_member_pair(member_a, member_b));

drop policy if exists "Members can create their conversations" on public.conversations;
create policy "Mutual matches can create conversations" on public.conversations
  for insert to authenticated
  with check (public.can_message_member_pair(member_a, member_b));

drop policy if exists "Members can read conversation messages" on public.messages;
create policy "Mutual matches can read conversation messages" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations conversation
    where conversation.id = conversation_id
      and public.can_message_member_pair(conversation.member_a, conversation.member_b)
  ));

drop policy if exists "Members can send conversation messages" on public.messages;
create policy "Mutual matches can send conversation messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())gis
    and exists (
      select 1 from public.conversations conversation
      where conversation.id = conversation_id
        and public.can_message_member_pair(conversation.member_a, conversation.member_b)
    )
  );
