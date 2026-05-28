-- ============================================================================
-- InnerBloom — Hybrid identity + Notifications inbox
-- ============================================================================
-- Two concerns bundled because both touch `profiles`:
--
--   1. Hybrid identity — `display_name` + `avatar_url` columns. Both opt-in:
--      a user who sets neither stays purely anonymous (Bloom #1242). Other
--      surfaces (feed, conversation header, garden) prefer `display_name`
--      when present, fall back to alias.
--
--   2. Notifications inbox — no separate notifications table. Instead a
--      `my_notifications()` RPC aggregates hugs, kindred requests, soul
--      matches, and incoming messages on demand. A `notifications_seen_at`
--      column on profiles powers the unread badge.
--
-- STORAGE BUCKET REQUIRED (one-time, manual via Supabase Dashboard):
--
--   Dashboard → Storage → Create bucket:
--     name = avatars
--     public = true
--   Then under Policies → New policy:
--     SELECT: allow all (since public)
--     INSERT: auth.uid() IS NOT NULL AND
--             (storage.foldername(name))[1] = auth.uid()::text
--     UPDATE/DELETE: owner-only with the same check
--
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. profiles: identity columns + notifications cursor
-- ---------------------------------------------------------------------------
alter table profiles
  add column if not exists display_name text
    check (display_name is null or char_length(display_name) between 1 and 32);

alter table profiles
  add column if not exists avatar_url text
    check (avatar_url is null or char_length(avatar_url) between 1 and 1024);

alter table profiles
  add column if not exists notifications_seen_at timestamptz
    not null default '1970-01-01 00:00:00+00';

-- Expose the new identity columns on the public_profiles view so other
-- users see them. display_name/avatar_url are opt-in by design — they're
-- always public when set.
drop view if exists public_profiles;
create view public_profiles as
  select id,
         anonymous_alias,
         display_name,
         avatar_url,
         city,
         institution_id,
         created_at
    from profiles;

grant select on public_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. RPC: set_my_identity  (write display_name / avatar_url)
-- ---------------------------------------------------------------------------
-- Owners can already UPDATE their own row via RLS, but routing through an
-- RPC lets us normalize input + reject bad shapes server-side.
create or replace function public.set_my_identity(
  p_display_name text default null,
  p_avatar_url   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  normalized_name text;
  normalized_avatar text;
  row_out profiles;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  -- Treat empty / whitespace as "clear back to anonymous"
  normalized_name := nullif(trim(p_display_name), '');
  normalized_avatar := nullif(trim(p_avatar_url), '');

  if normalized_name is not null and char_length(normalized_name) > 32 then
    raise exception 'display_name too long (max 32)';
  end if;

  update public.profiles
     set display_name = normalized_name,
         avatar_url   = normalized_avatar
   where id = uid
   returning * into row_out;

  return row_to_json(row_out)::jsonb;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. RPC: mark_notifications_seen
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_seen()
returns timestamptz
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  ts timestamptz := now();
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  update public.profiles
     set notifications_seen_at = ts
   where id = uid;

  return ts;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC: my_notifications  (aggregated activity feed)
-- ---------------------------------------------------------------------------
-- Returns the union of 4 event sources, newest first. Each row carries
-- enough metadata for the client to render an icon + label + deep-link.
--
-- `is_unread` is true when the event is newer than the user's last
-- `notifications_seen_at` stamp.
create or replace function public.my_notifications(p_limit int default 40)
returns table (
  kind             text,        -- 'hug' | 'kindred_request' | 'match_found' | 'message'
  event_id         uuid,
  from_user_id     uuid,
  from_alias       text,
  from_display_name text,
  from_avatar_url  text,
  context_id       uuid,        -- conversation_id / match_id / post_id depending on kind
  preview          text,        -- short preview or note
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
      sm.user_a_id,                       -- initiator is "from"
      p.anonymous_alias,
      p.display_name,
      p.avatar_url,
      sm.id,                              -- context is the match itself
      sm.shared_category,
      sm.created_at,
      (sm.created_at > seen)
    from public.soul_matches sm
    join public.profiles p on p.id = sm.user_a_id
    where sm.user_b_id = uid
      and sm.status = 'connected'

    union all

    -- ── Incoming messages (last per conversation, sender != me) ────────
    -- We don't surface every single message — that would flood the inbox.
    -- Instead, one entry per conversation showing the latest unseen-side msg.
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
        -- Only the most recent inbound message per conversation
        select max(m2.id)
          from public.messages m2
          join public.conversations c2 on c2.id = m2.conversation_id
         where m2.sender_id <> uid
           and (c2.user_a_id = uid or c2.user_b_id = uid)
         group by m2.conversation_id
      )
  )
  order by created_at desc
  limit greatest(p_limit, 1);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: my_unread_notifications_count
-- ---------------------------------------------------------------------------
-- Lightweight count for the bell badge. Doesn't load row payload.
create or replace function public.my_unread_notifications_count()
returns int
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  seen timestamptz;
  total int;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select notifications_seen_at into seen
    from public.profiles where id = uid;

  select coalesce(sum(c), 0)::int into total from (
    select count(*) as c from public.hugs
      where to_user_id = uid and created_at > seen
    union all
    select count(*) as c from public.kindred_requests
      where to_user_id = uid and status = 'pending'
        and expires_at > now() and created_at > seen
    union all
    select count(*) as c from public.soul_matches
      where user_b_id = uid and status = 'connected' and created_at > seen
    union all
    select count(distinct m.conversation_id) as c
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
     where m.sender_id <> uid
       and (c.user_a_id = uid or c.user_b_id = uid)
       and m.created_at > seen
  ) s;

  return total;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Upgrade Soul Garden RPCs to surface display_name + avatar_url
-- ---------------------------------------------------------------------------
-- Drop + recreate because the return signature changes (new columns).

drop function if exists public.my_kindred_garden();
create or replace function public.my_kindred_garden()
returns table (
  conversation_id    uuid,
  other_user_id      uuid,
  other_alias        text,
  other_display_name text,
  other_avatar_url   text,
  shared_category    text,
  kept_since         timestamptz,
  last_message_at    timestamptz,
  last_message_body  text,
  unread_count       int
)
language plpgsql
security definer
set search_path = public, ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  return query
  select
    c.id                                                            as conversation_id,
    case when c.user_a_id = uid then c.user_b_id else c.user_a_id end as other_user_id,
    p.anonymous_alias                                               as other_alias,
    p.display_name                                                  as other_display_name,
    p.avatar_url                                                    as other_avatar_url,
    coalesce(sm.shared_category, 'neutral')                         as shared_category,
    c.created_at                                                    as kept_since,
    last.created_at                                                 as last_message_at,
    last.body                                                       as last_message_body,
    coalesce(unread.cnt, 0)::int                                    as unread_count
  from public.conversations c
  left join public.soul_matches sm on sm.id = c.match_id
  join public.profiles p
    on p.id = case when c.user_a_id = uid then c.user_b_id else c.user_a_id end
  left join lateral (
    select m.created_at, m.body
      from public.messages m
     where m.conversation_id = c.id
     order by m.created_at desc
     limit 1
  ) last on true
  left join lateral (
    select count(*)::int as cnt
      from public.messages m
     where m.conversation_id = c.id
       and m.sender_id <> uid
       and m.read_at is null
  ) unread on true
  where c.is_kept
    and (c.user_a_id = uid or c.user_b_id = uid)
  order by coalesce(last.created_at, c.created_at) desc;
end;
$$;

drop function if exists public.my_pending_kindred_requests();
create or replace function public.my_pending_kindred_requests()
returns table (
  request_id         uuid,
  conversation_id    uuid,
  from_user_id       uuid,
  from_alias         text,
  from_display_name  text,
  from_avatar_url    text,
  shared_category    text,
  note               text,
  created_at         timestamptz,
  expires_at         timestamptz
)
language plpgsql
security definer
set search_path = public, ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  return query
  select
    r.id              as request_id,
    r.conversation_id as conversation_id,
    r.from_user_id    as from_user_id,
    p.anonymous_alias as from_alias,
    p.display_name    as from_display_name,
    p.avatar_url      as from_avatar_url,
    coalesce(sm.shared_category, 'neutral') as shared_category,
    r.note            as note,
    r.created_at      as created_at,
    r.expires_at      as expires_at
  from public.kindred_requests r
  join public.profiles p on p.id = r.from_user_id
  join public.conversations c on c.id = r.conversation_id
  left join public.soul_matches sm on sm.id = c.match_id
  where r.to_user_id = uid
    and r.status     = 'pending'
    and r.expires_at > now()
  order by r.created_at desc;
end;
$$;

commit;
