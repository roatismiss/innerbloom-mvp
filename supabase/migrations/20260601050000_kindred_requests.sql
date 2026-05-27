-- ============================================================================
-- InnerBloom — Kindred requests + kept conversations (Soul Garden)
-- ============================================================================
-- After a daily Soul Match conversation, either side can send a "kindred
-- request" to keep talking. If the other accepts, the conversation is marked
-- `is_kept` and stays open beyond the daily window. Each user has a cap of
-- KINDRED_CAP kept connections (their "Soul Garden") — forces curation and
-- preserves InnerBloom's "small room" feel.
--
-- Failure modes are silent: declined / ignored / expired requests never
-- surface to the sender. Anti-rejection-anxiety by design.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. conversations: add is_kept flag
-- ---------------------------------------------------------------------------
alter table conversations
  add column if not exists is_kept boolean not null default false;

create index if not exists conversations_kept_a_idx
  on conversations(user_a_id) where is_kept;
create index if not exists conversations_kept_b_idx
  on conversations(user_b_id) where is_kept;

-- ---------------------------------------------------------------------------
-- 2. kindred_requests
-- ---------------------------------------------------------------------------
create table if not exists kindred_requests (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  from_user_id    uuid not null references profiles(id) on delete cascade,
  to_user_id      uuid not null references profiles(id) on delete cascade,
  note            text check (note is null or char_length(note) between 1 and 280),
  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined','expired','cancelled')),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  expires_at      timestamptz not null default (now() + interval '7 days'),
  check (from_user_id <> to_user_id),
  -- one open request per (sender, recipient, conversation) at a time
  unique (conversation_id, from_user_id, to_user_id)
);

create index if not exists kindred_requests_to_user_pending_idx
  on kindred_requests(to_user_id, created_at desc) where status = 'pending';
create index if not exists kindred_requests_from_user_idx
  on kindred_requests(from_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Soul Garden cap
-- ---------------------------------------------------------------------------
-- 5 is the agreed cap. Keep it as a function so it's tweakable without a
-- migration touching every RPC.
create or replace function public.kindred_cap()
returns int language sql immutable as $$ select 5 $$;

-- ---------------------------------------------------------------------------
-- 4. RPC: kindred_request_send
-- ---------------------------------------------------------------------------
create or replace function public.kindred_request_send(
  p_conversation_id uuid,
  p_note            text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid          uuid := auth.uid();
  conv         conversations;
  recipient    uuid;
  existing     kindred_requests;
  result_row   kindred_requests;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  if p_note is not null and char_length(trim(p_note)) = 0 then
    p_note := null;
  end if;

  select * into conv from public.conversations
    where id = p_conversation_id
      and (user_a_id = uid or user_b_id = uid);

  if not found then
    raise exception 'not a member of this conversation';
  end if;

  recipient := case when conv.user_a_id = uid then conv.user_b_id else conv.user_a_id end;

  -- Already kept → no request needed
  if conv.is_kept then
    raise exception 'already kindred';
  end if;

  -- Reuse an existing pending row if present (resend with updated note)
  select * into existing from public.kindred_requests
    where conversation_id = p_conversation_id
      and from_user_id    = uid
      and to_user_id      = recipient;

  if found then
    if existing.status = 'pending' then
      update public.kindred_requests
         set note       = p_note,
             expires_at = now() + interval '7 days'
       where id = existing.id
       returning * into result_row;
    elsif existing.status in ('declined','expired','cancelled') then
      -- silently overwrite a stale row; sender never knows it was declined
      update public.kindred_requests
         set status       = 'pending',
             note         = p_note,
             created_at   = now(),
             responded_at = null,
             expires_at   = now() + interval '7 days'
       where id = existing.id
       returning * into result_row;
    else  -- 'accepted' — shouldn't reach (conv.is_kept would be true)
      result_row := existing;
    end if;
  else
    insert into public.kindred_requests (conversation_id, from_user_id, to_user_id, note)
    values (p_conversation_id, uid, recipient, p_note)
    returning * into result_row;
  end if;

  return row_to_json(result_row)::jsonb;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC: kindred_request_respond
-- ---------------------------------------------------------------------------
create or replace function public.kindred_request_respond(
  p_request_id uuid,
  p_accept     boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid       uuid := auth.uid();
  req       kindred_requests;
  conv      conversations;
  my_kept   int;
  cap       int := public.kindred_cap();
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select * into req from public.kindred_requests
    where id = p_request_id and to_user_id = uid
    for update;

  if not found then
    raise exception 'request not found';
  end if;

  if req.status <> 'pending' then
    raise exception 'request already resolved';
  end if;

  if req.expires_at < now() then
    update public.kindred_requests
       set status = 'expired', responded_at = now()
     where id = req.id;
    raise exception 'request expired';
  end if;

  if not p_accept then
    update public.kindred_requests
       set status = 'declined', responded_at = now()
     where id = req.id;
    return jsonb_build_object('status','declined');
  end if;

  -- Accepting: enforce cap on the accepter side
  select count(*)::int into my_kept
    from public.conversations
   where is_kept and (user_a_id = uid or user_b_id = uid);

  if my_kept >= cap then
    raise exception 'kindred garden full';
  end if;

  select * into conv from public.conversations
    where id = req.conversation_id
    for update;

  if not found then
    raise exception 'conversation gone';
  end if;

  -- Also enforce cap on the sender — accepting should not push them over.
  select count(*)::int into my_kept
    from public.conversations c
   where c.is_kept
     and (c.user_a_id = req.from_user_id or c.user_b_id = req.from_user_id);

  if my_kept >= cap then
    -- Sender's garden filled up since they asked. Tell accepter silently;
    -- mark expired so the sender can re-ask once they free a slot.
    update public.kindred_requests
       set status = 'expired', responded_at = now()
     where id = req.id;
    raise exception 'sender garden full';
  end if;

  update public.conversations
     set is_kept   = true,
         closed_at = null
   where id = conv.id;

  update public.kindred_requests
     set status = 'accepted', responded_at = now()
   where id = req.id;

  return jsonb_build_object(
    'status','accepted',
    'conversation_id', conv.id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: kindred_request_cancel  (sender takes it back)
-- ---------------------------------------------------------------------------
create or replace function public.kindred_request_cancel(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  req kindred_requests;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select * into req from public.kindred_requests
    where id = p_request_id and from_user_id = uid;

  if not found then
    raise exception 'request not found';
  end if;

  if req.status <> 'pending' then
    raise exception 'request already resolved';
  end if;

  update public.kindred_requests
     set status = 'cancelled', responded_at = now()
   where id = req.id;

  return jsonb_build_object('status','cancelled');
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. RPC: kindred_release  (either side ends a kept connection)
-- ---------------------------------------------------------------------------
-- Closes the conversation silently. The other side just sees it stop —
-- no breakup notification.
create or replace function public.kindred_release(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  conv conversations;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select * into conv from public.conversations
    where id = p_conversation_id
      and (user_a_id = uid or user_b_id = uid)
      and is_kept
    for update;

  if not found then
    raise exception 'kindred not found';
  end if;

  update public.conversations
     set is_kept   = false,
         closed_at = now()
   where id = conv.id;

  return jsonb_build_object('status','released');
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. RPC: my_kindred_garden  (kept connections + last message preview)
-- ---------------------------------------------------------------------------
create or replace function public.my_kindred_garden()
returns table (
  conversation_id    uuid,
  other_user_id      uuid,
  other_alias        text,
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

-- ---------------------------------------------------------------------------
-- 9. RPC: my_pending_kindred_requests  (incoming, for inbox)
-- ---------------------------------------------------------------------------
create or replace function public.my_pending_kindred_requests()
returns table (
  request_id        uuid,
  conversation_id   uuid,
  from_user_id      uuid,
  from_alias        text,
  shared_category   text,
  note              text,
  created_at        timestamptz,
  expires_at        timestamptz
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

-- ---------------------------------------------------------------------------
-- 10. RPC: my_kindred_status_for_conversation
-- ---------------------------------------------------------------------------
-- Conversation screen calls this to decide which CTA to show:
--   - 'none'      → "Ask to bloom again" button
--   - 'sent'      → "Request sent · waiting" pill (with cancel)
--   - 'incoming'  → "They want to keep blooming with you" accept/decline
--   - 'kept'      → no CTA, conversation is already kindred
create or replace function public.my_kindred_status_for_conversation(p_conversation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid   uuid := auth.uid();
  conv  conversations;
  outgoing kindred_requests;
  incoming kindred_requests;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select * into conv from public.conversations
    where id = p_conversation_id
      and (user_a_id = uid or user_b_id = uid);
  if not found then
    raise exception 'not a member';
  end if;

  if conv.is_kept then
    return jsonb_build_object('state','kept');
  end if;

  select * into outgoing from public.kindred_requests
    where conversation_id = p_conversation_id
      and from_user_id    = uid
      and status          = 'pending'
      and expires_at      > now()
    limit 1;
  if found then
    return jsonb_build_object(
      'state','sent',
      'request_id', outgoing.id,
      'sent_at', outgoing.created_at
    );
  end if;

  select * into incoming from public.kindred_requests
    where conversation_id = p_conversation_id
      and to_user_id      = uid
      and status          = 'pending'
      and expires_at      > now()
    limit 1;
  if found then
    return jsonb_build_object(
      'state','incoming',
      'request_id', incoming.id,
      'note',       incoming.note
    );
  end if;

  return jsonb_build_object('state','none');
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. RLS — kindred_requests
-- ---------------------------------------------------------------------------
alter table kindred_requests enable row level security;

-- Either side of a request may see it
drop policy if exists kindred_requests_select_involved on kindred_requests;
create policy kindred_requests_select_involved
  on kindred_requests for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- All writes go through RPCs (security definer); no direct INSERT/UPDATE
-- from clients. That keeps cap-enforcement and silent-failure invariants
-- in one place.

-- ---------------------------------------------------------------------------
-- 12. Realtime publication — kindred_requests
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table kindred_requests;
    exception when duplicate_object then null;
    end;
    begin
      -- Allow conversation rows (is_kept flips) to broadcast too
      alter publication supabase_realtime add table conversations;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

commit;
