-- ============================================================================
-- Launch hardening — security & correctness fixes surfaced by the pre-launch
-- audit. Safe to re-run (idempotent).
-- ============================================================================
begin;

-- ----------------------------------------------------------------------------
-- 1. messages: stop either party from editing the OTHER person's message.
-- ----------------------------------------------------------------------------
-- The old `messages_update_read` policy allowed any conversation member to
-- UPDATE any message in the conversation, with no WITH CHECK and no column
-- restriction — so user B could PATCH the body of a message user A sent.
--
-- Fix has two layers:
--   (a) column-level grant: authenticated may only ever write `read_at`
--       (the read receipt), never `body`/`sender_id`/anything else;
--   (b) RLS: you may only mark messages you did NOT send, and only within a
--       conversation you belong to (USING + WITH CHECK both enforced).
revoke update on public.messages from authenticated;
grant  update (read_at) on public.messages to authenticated;

drop policy if exists messages_update_read on public.messages;
drop policy if exists messages_mark_read  on public.messages;
create policy messages_mark_read
  on public.messages for update to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
       where c.id = messages.conversation_id
         and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 2. my_notifications: surface the LATEST inbound message per conversation by
--    time, not the lexicographically-greatest UUID.
-- ----------------------------------------------------------------------------
-- `messages.id` is a random uuid (gen_random_uuid), so the previous
-- `max(m2.id)` returned an arbitrary message — the inbox could show an old
-- reply as "the latest". Switch to DISTINCT ON (conversation) ordered by
-- created_at desc. Everything else in the function is unchanged.
create or replace function public.my_notifications(p_limit int default 40)
returns table (
  kind             text,
  event_id         uuid,
  from_user_id     uuid,
  from_alias       text,
  from_display_name text,
  from_avatar_url  text,
  context_id       uuid,
  preview          text,
  created_at       timestamptz,
  is_unread        boolean
)
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  seen timestamptz;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select notifications_seen_at into seen
    from public.profiles where id = uid;

  return query
  (
    -- ── Hugs received ──────────────────────────────────────────────────
    select
      'hug'::text                                                 as kind,
      h.id                                                        as event_id,
      h.from_user_id                                              as from_user_id,
      p.anonymous_alias                                           as from_alias,
      p.display_name                                              as from_display_name,
      p.avatar_url                                                as from_avatar_url,
      h.context_id                                                as context_id,
      h.context_type                                              as preview,
      h.created_at                                                as created_at,
      (h.created_at > seen)                                       as is_unread
    from public.hugs h
    join public.profiles p on p.id = h.from_user_id
    where h.to_user_id = uid

    union all

    -- ── Kindred requests received (pending only) ───────────────────────
    select
      'kindred_request'::text,
      r.id,
      r.from_user_id,
      p.anonymous_alias,
      p.display_name,
      p.avatar_url,
      r.conversation_id,
      r.note,
      r.created_at,
      (r.created_at > seen)
    from public.kindred_requests r
    join public.profiles p on p.id = r.from_user_id
    where r.to_user_id = uid
      and r.status = 'pending'
      and r.expires_at > now()

    union all

    -- ── Matches found (only the receiving side) ────────────────────────
    select
      'match_found'::text,
      sm.id,
      sm.user_a_id,
      p.anonymous_alias,
      p.display_name,
      p.avatar_url,
      sm.id,
      sm.shared_category,
      sm.created_at,
      (sm.created_at > seen)
    from public.soul_matches sm
    join public.profiles p on p.id = sm.user_a_id
    where sm.user_b_id = uid
      and sm.status = 'connected'

    union all

    -- ── Incoming messages (latest inbound per conversation, sender != me) ──
    select
      'message'::text,
      m.id,
      m.sender_id,
      p.anonymous_alias,
      p.display_name,
      p.avatar_url,
      m.conversation_id,
      left(m.body, 120),
      m.created_at,
      (m.created_at > seen)
    from public.messages m
    join public.profiles p on p.id = m.sender_id
    join public.conversations c on c.id = m.conversation_id
    where m.sender_id <> uid
      and (c.user_a_id = uid or c.user_b_id = uid)
      and m.id in (
        -- Most recent inbound message per conversation, by time (not by uuid).
        select distinct on (m2.conversation_id) m2.id
          from public.messages m2
          join public.conversations c2 on c2.id = m2.conversation_id
         where m2.sender_id <> uid
           and (c2.user_a_id = uid or c2.user_b_id = uid)
         order by m2.conversation_id, m2.created_at desc, m2.id desc
      )
  )
  order by created_at desc
  limit greatest(p_limit, 1);
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. avatars bucket policies: make idempotent (the original migration used bare
--    `create policy`, so a replay aborted with "policy already exists").
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_owner_insert"  on storage.objects;
drop policy if exists "avatars_owner_update"  on storage.objects;
drop policy if exists "avatars_owner_delete"  on storage.objects;

create policy "avatars_public_read"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ----------------------------------------------------------------------------
-- 4. Account deletion (GDPR / PH Data Privacy Act — right to erasure).
-- ----------------------------------------------------------------------------
-- Deleting the row from auth.users cascades to public.profiles
-- (profiles.id references auth.users on delete cascade), which in turn cascades
-- to every user-owned table (all reference profiles(id) on delete cascade).
-- SECURITY DEFINER so the function (owned by the migration role) is allowed to
-- touch auth.users; it only ever deletes the *caller's own* account.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all     on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;

commit;
