-- ============================================================================
-- InnerBloom — Push notifications + conversation expiry cron
-- ============================================================================
-- Architecture (best-effort delivery, no queue):
--
--   1. Client registers an Expo Push token in `user_push_tokens`.
--   2. DB triggers on messages / hugs / kindred_requests / soul_matches call
--      `public.send_push_notification(user_id, type, payload)`, which uses
--      pg_net to hit the `send-push` Edge Function asynchronously.
--   3. Edge Function looks up active tokens for the user and POSTs to the
--      Expo Push API.
--
-- Failure mode: a push that doesn't deliver is lost (no retry). For MVP this
-- is fine — pushes are a notification convenience, not the source of truth.
-- Realtime channels + in-app inbox stay authoritative.
--
-- SETUP REQUIRED (one-time, in Supabase Dashboard → SQL Editor):
--
--   -- 1. Enable extensions (Dashboard → Database → Extensions, or:)
--   create extension if not exists pg_cron with schema extensions;
--   create extension if not exists pg_net with schema extensions;
--
--   -- 2. Store the Edge Function URL + service-role key in Vault so triggers
--   --    can reach the function. REPLACE the URL with your project ref.
--   select vault.create_secret(
--     'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push',
--     'edge_send_push_url'
--   );
--   select vault.create_secret(
--     'YOUR_SERVICE_ROLE_KEY_HERE',
--     'edge_service_role_key'
--   );
--
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. user_push_tokens
-- ---------------------------------------------------------------------------
-- Each device the user logs in on gets its own token row. A user can have
-- multiple tokens (phone + tablet). On uninstall / token rotation, the old
-- token will fail at Expo with DeviceNotRegistered → Edge Function deletes it.
create table if not exists user_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios','android','web')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Same physical token should never be tied to two users. If the same
  -- device is re-used by another account, we move the token over.
  unique (token)
);

create index if not exists user_push_tokens_user_idx
  on user_push_tokens(user_id);

alter table user_push_tokens enable row level security;

drop policy if exists user_push_tokens_select_own on user_push_tokens;
create policy user_push_tokens_select_own
  on user_push_tokens for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_push_tokens_modify_own on user_push_tokens;
create policy user_push_tokens_modify_own
  on user_push_tokens for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop trigger if exists user_push_tokens_touch on user_push_tokens;
create trigger user_push_tokens_touch
  before update on user_push_tokens
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. send_push_notification helper
-- ---------------------------------------------------------------------------
-- Non-blocking: pg_net queues the HTTP call, the trigger returns immediately.
-- If Vault secrets aren't set yet (e.g. local dev), the helper is a no-op so
-- the underlying INSERT still succeeds.
create or replace function public.send_push_notification(
  p_user_id uuid,
  p_type    text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  url   text;
  key   text;
  body  jsonb;
begin
  -- If Vault isn't configured, silently drop. Pushes are non-essential.
  begin
    select decrypted_secret into url
      from vault.decrypted_secrets where name = 'edge_send_push_url' limit 1;
    select decrypted_secret into key
      from vault.decrypted_secrets where name = 'edge_service_role_key' limit 1;
  exception when others then
    return;
  end;

  if url is null or key is null then return; end if;

  body := jsonb_build_object(
    'user_id', p_user_id,
    'type',    p_type,
    'payload', p_payload
  );

  begin
    perform net.http_post(
      url     := url,
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || key
                 ),
      body    := body,
      timeout_milliseconds := 3000
    );
  exception when others then
    -- pg_net not installed yet, or transient failure. Swallow.
    return;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Trigger: new message → push the *other* member of the conversation
-- ---------------------------------------------------------------------------
create or replace function public.trg_message_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  preview   text;
begin
  select case when c.user_a_id = new.sender_id then c.user_b_id else c.user_a_id end
    into recipient
    from public.conversations c
   where c.id = new.conversation_id;

  if recipient is null or recipient = new.sender_id then
    return new;
  end if;

  preview := left(new.body, 120);

  perform public.send_push_notification(
    recipient,
    'new_message',
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'message_id',      new.id,
      'preview',         preview
    )
  );

  return new;
end;
$$;

drop trigger if exists messages_push_recipient on messages;
create trigger messages_push_recipient
  after insert on messages
  for each row execute function public.trg_message_push();

-- ---------------------------------------------------------------------------
-- 4. Trigger: hug received → push to to_user_id
-- ---------------------------------------------------------------------------
create or replace function public.trg_hug_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.send_push_notification(
    new.to_user_id,
    'hug_received',
    jsonb_build_object(
      'context_type', new.context_type,
      'context_id',   new.context_id
    )
  );
  return new;
end;
$$;

drop trigger if exists hugs_push_recipient on hugs;
create trigger hugs_push_recipient
  after insert on hugs
  for each row execute function public.trg_hug_push();

-- ---------------------------------------------------------------------------
-- 5. Trigger: kindred request → push to to_user_id (only on initial create)
-- ---------------------------------------------------------------------------
create or replace function public.trg_kindred_request_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire on freshly created pending requests, not on status updates.
  if (tg_op = 'INSERT' and new.status = 'pending')
  or (tg_op = 'UPDATE' and new.status = 'pending' and old.status <> 'pending') then
    perform public.send_push_notification(
      new.to_user_id,
      'kindred_request',
      jsonb_build_object(
        'request_id',      new.id,
        'conversation_id', new.conversation_id,
        'note',            new.note
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists kindred_requests_push_recipient on kindred_requests;
create trigger kindred_requests_push_recipient
  after insert or update on kindred_requests
  for each row execute function public.trg_kindred_request_push();

-- ---------------------------------------------------------------------------
-- 6. Trigger: soul match connected → push to user_b (the awaited side)
-- ---------------------------------------------------------------------------
-- find-soul-match inserts two directional rows. We push the one where the
-- receiving user is `user_b_id` to avoid double-notifying the initiator.
create or replace function public.trg_soul_match_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  if new.status <> 'connected' then return new; end if;

  -- Look up the conversation linked to this match (find-soul-match creates
  -- exactly one conversation per match pair, linked to the user_a-initiated
  -- row).
  select id into conv_id
    from public.conversations
   where match_id = new.id
   limit 1;

  perform public.send_push_notification(
    new.user_b_id,
    'match_found',
    jsonb_build_object(
      'match_id',        new.id,
      'conversation_id', conv_id,
      'shared_category', new.shared_category,
      'resonance_score', new.resonance_score
    )
  );

  return new;
end;
$$;

drop trigger if exists soul_matches_push_recipient on soul_matches;
create trigger soul_matches_push_recipient
  after insert on soul_matches
  for each row execute function public.trg_soul_match_push();

-- ---------------------------------------------------------------------------
-- 7. Conversation expiry — close non-kept conversations from prior days
-- ---------------------------------------------------------------------------
-- Runs once per hour. Closes any conversation whose creation date is older
-- than today's UTC date and which hasn't been promoted to a kept kindred.
-- 'Asia/Manila' tz is fine for the PH pilot — UTC midnight ≈ 8am PH, which
-- is gentle (no one mid-conversation at that hour).
create or replace function public.close_expired_conversations()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  closed_count int;
begin
  with closed as (
    update public.conversations
       set closed_at = now()
     where closed_at is null
       and is_kept = false
       and created_at::date < current_date
    returning id
  )
  select count(*) into closed_count from closed;
  return closed_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. pg_cron schedule for expiry
-- ---------------------------------------------------------------------------
-- Only schedule if pg_cron is installed. If not, leave the function defined
-- so an admin can call it manually until the extension is enabled.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Avoid duplicate-job errors on re-run by unscheduling existing first.
    perform cron.unschedule('innerbloom-close-expired-conversations')
      where exists (
        select 1 from cron.job
         where jobname = 'innerbloom-close-expired-conversations'
      );

    perform cron.schedule(
      'innerbloom-close-expired-conversations',
      '15 * * * *',  -- every hour at :15
      $job$ select public.close_expired_conversations(); $job$
    );
  end if;
end $$;

commit;
