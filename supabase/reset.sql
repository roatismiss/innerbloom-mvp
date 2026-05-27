-- ============================================================================
-- InnerBloom — Reset script
-- ----------------------------------------------------------------------------
-- Run this ONCE in Supabase Dashboard SQL Editor BEFORE applying the canonical
-- migration when you have an older partial schema lying around.
-- This drops every object the migration creates so the migration starts clean.
--
-- DESTRUCTIVE: deletes all rows. Only use in dev / before launch.
-- ============================================================================

begin;

-- Drop trigger on auth.users first (it owns a function we'll drop next)
drop trigger if exists on_auth_user_created on auth.users;

-- Tables (cascade also drops dependent FKs, indexes, policies, triggers)
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

-- View
drop view if exists public_profiles cascade;

-- Functions
drop function if exists public.handle_new_user()                              cascade;
drop function if exists public.touch_updated_at()                             cascade;
drop function if exists public.update_resonance_count()                       cascade;
drop function if exists public.recompute_mood_streak()                        cascade;
drop function if exists public.complete_onboarding(jsonb)                     cascade;
drop function if exists public.submit_mood_checkin(text, int, text, text)     cascade;
drop function if exists public.today_for_me()                                 cascade;
drop function if exists public.mood_history(int)                              cascade;
drop function if exists public.send_message(uuid, text)                       cascade;
drop function if exists public.reel_category_for_mood(text)                   cascade;
drop function if exists public.feed_categories_for_mood(text)                 cascade;

-- Sequence
drop sequence if exists bloom_alias_seq cascade;

-- Remove tables from realtime publication if present (no error if missing)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime drop table messages;     exception when others then null; end;
    begin alter publication supabase_realtime drop table soul_matches; exception when others then null; end;
  end if;
end $$;

commit;
