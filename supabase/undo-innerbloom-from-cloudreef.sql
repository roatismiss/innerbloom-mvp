-- ============================================================================
-- EMERGENCY RECOVERY — Undo InnerBloom from cloudreef-platform
-- ----------------------------------------------------------------------------
-- Run ONCE in Supabase Dashboard SQL Editor on the cloudreef-platform project.
-- ONE shot — does everything in a single transaction:
--   1. Drops every InnerBloom object that was accidentally installed
--   2. Recreates cloudreef's `conversations` + `messages` tables (correct schema)
--   3. Restores cloudreef's RLS + tenant_isolation policies
--   4. Recreates the 5 cloudreef triggers (voucher/gift/tasks/suppliers/work_orders)
--      that lost their function reference when touch_updated_at was dropped
--
-- DATA LOSS: rows in conversations + messages (guest messaging history) are
-- gone unless a backup exists. Schema is fully restored.
-- ============================================================================

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Remove InnerBloom artifacts that don't belong in cloudreef
-- ────────────────────────────────────────────────────────────────────────────

-- Trigger on auth.users (cloudreef doesn't have its own)
drop trigger if exists on_auth_user_created on auth.users;

-- All InnerBloom tables (includes the wrong conversations/messages with
-- InnerBloom schema currently sitting in cloudreef DB)
drop table if exists hugs                       cascade;
drop table if exists messages                   cascade;
drop table if exists conversations              cascade;
drop table if exists soul_matches               cascade;
drop table if exists soul_match_quiz_responses  cascade;
drop table if exists resonances                 cascade;
drop table if exists bloom_posts                cascade;
drop table if exists bloom_quotes               cascade;
drop table if exists mood_streaks               cascade;
drop table if exists mood_checkins              cascade;
drop table if exists onboarding_responses       cascade;
drop table if exists bloom_reels                cascade;
drop table if exists profiles                   cascade;
drop table if exists institutions               cascade;

-- InnerBloom view
drop view if exists public_profiles cascade;

-- InnerBloom-specific functions.
-- NOTE: touch_updated_at() is INTENTIONALLY KEPT — cloudreef uses it.
-- The InnerBloom migration created an identical version, so it's effectively
-- still cloudreef's (function bodies match exactly).
drop function if exists public.handle_new_user()                              cascade;
drop function if exists public.update_resonance_count()                       cascade;
drop function if exists public.recompute_mood_streak()                        cascade;
drop function if exists public.complete_onboarding(jsonb)                     cascade;
drop function if exists public.submit_mood_checkin(text, int, text, text)     cascade;
drop function if exists public.today_for_me()                                 cascade;
drop function if exists public.mood_history(int)                              cascade;
drop function if exists public.send_message(uuid, text)                       cascade;
drop function if exists public.reel_category_for_mood(text)                   cascade;
drop function if exists public.feed_categories_for_mood(text)                 cascade;

-- InnerBloom sequence
drop sequence if exists bloom_alias_seq cascade;

-- Realtime publication cleanup (InnerBloom added these; they're gone with
-- the tables anyway, but be explicit and idempotent)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime drop table messages;     exception when others then null; end;
    begin alter publication supabase_realtime drop table soul_matches; exception when others then null; end;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Re-create touch_updated_at (defensive — should still exist, but safe)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Re-create cloudreef's conversations + messages tables
--    (matches cloudreef-platform/supabase/migrations/001_initial_schema.sql)
-- ────────────────────────────────────────────────────────────────────────────

-- message_sender enum should still exist (types aren't cascade-dropped by
-- table drops). Recreate defensively.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_sender') then
    create type message_sender as enum ('guest', 'staff', 'system');
  end if;
end $$;

create table if not exists conversations (
  id               uuid primary key default gen_random_uuid(),
  resort_id        uuid not null references resort_settings(id) on delete cascade,
  guest_id         uuid not null references guests(id)          on delete cascade,
  booking_id       uuid references bookings(id) on delete set null,
  subject          text,
  is_open          boolean not null default true,
  assigned_to      uuid references users(id) on delete set null,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_conversations_resort on conversations(resort_id);
create index if not exists idx_conversations_guest  on conversations(guest_id);

create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender           message_sender not null,
  sender_id        uuid,
  body             text not null,
  read_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Restore RLS + tenant_isolation policies for conversations + messages
--    (matches the state from 018_restore_rls.sql — staff-only, no anon)
--    Uses public.current_resort_id() which already exists in cloudreef.
-- ────────────────────────────────────────────────────────────────────────────

alter table conversations enable row level security;
alter table messages      enable row level security;

drop policy if exists tenant_isolation on conversations;
create policy tenant_isolation on conversations
  for all to authenticated
  using      (resort_id = public.current_resort_id())
  with check (resort_id = public.current_resort_id());

drop policy if exists tenant_isolation on messages;
-- messages has no resort_id directly; scope through the parent conversation.
create policy tenant_isolation on messages
  for all to authenticated
  using (
    conversation_id in (
      select id from conversations where resort_id = public.current_resort_id()
    )
  )
  with check (
    conversation_id in (
      select id from conversations where resort_id = public.current_resort_id()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Re-create the 5 cloudreef triggers that were dropped when
--    touch_updated_at() was cascade-dropped.
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_voucher_templates_updated_at') then
    create trigger trg_voucher_templates_updated_at
      before update on voucher_templates
      for each row execute function touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_gift_vouchers_updated_at') then
    create trigger trg_gift_vouchers_updated_at
      before update on gift_vouchers
      for each row execute function touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_tasks_updated_at') then
    create trigger trg_tasks_updated_at
      before update on tasks
      for each row execute function touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_suppliers_updated_at') then
    create trigger trg_suppliers_updated_at
      before update on suppliers
      for each row execute function touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_work_orders_updated_at') then
    create trigger trg_work_orders_updated_at
      before update on work_orders
      for each row execute function touch_updated_at();
  end if;
end $$;

commit;

-- ============================================================================
-- DONE. Verify with these queries in the SQL Editor:
--
--   select count(*) from conversations;  -- should be 0 (table exists, no rows)
--   select count(*) from messages;       -- should be 0
--   select count(*) from voucher_templates; -- should be your original count
--   select tgname from pg_trigger where tgname like 'trg_%_updated_at';
--     -- should list all 5 triggers
-- ============================================================================
