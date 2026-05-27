-- ============================================================================
-- InnerBloom — Fix auth / onboarding FK gap.
-- ============================================================================
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run any number of times. No DROP TABLE, no data loss.
-- ============================================================================

-- ── 1. Ensure the alias sequence exists (safe if already present) ─────────────
create sequence if not exists public.bloom_alias_seq start with 1000;

-- ── 2. Re-create handle_new_user (verbatim logic from canonical migration) ────
--    Added ON CONFLICT DO NOTHING so a duplicate call never errors.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, ''
as $$
begin
  insert into public.profiles (id, anonymous_alias)
  values (new.id, 'Bloom #' || nextval('public.bloom_alias_seq'))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 3. Re-attach trigger (drop first for idempotency) ────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 4. Backfill: give profiles rows to any auth.users that are missing one ───
insert into public.profiles (id, anonymous_alias)
select u.id, 'Bloom #' || nextval('public.bloom_alias_seq')
  from auth.users u
 where not exists (
   select 1 from public.profiles p where p.id = u.id
 )
on conflict (id) do nothing;

-- ── 5. Rewrite complete_onboarding with a defensive profile-ensure guard ──────
--    If the trigger ever fires late or silently fails, the RPC self-heals.
create or replace function public.complete_onboarding(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid      uuid := auth.uid();
  baseline text;
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

  -- Ensure a profile row exists even if the trigger somehow missed this user.
  insert into public.profiles (id, anonymous_alias)
  values (uid, 'Bloom #' || nextval('public.bloom_alias_seq'))
  on conflict (id) do nothing;

  baseline := payload->>'baseline_mood';

  insert into public.onboarding_responses (
    user_id, baseline_mood, growth_goals, checkin_frequency,
    blooming_focus, notification_opt_in
  ) values (
    uid,
    baseline,
    coalesce((select array(select jsonb_array_elements_text(payload->'growth_goals'))), '{}'),
    payload->>'checkin_frequency',
    coalesce((select array(select jsonb_array_elements_text(payload->'blooming_focus'))), '{}'),
    coalesce((payload->>'notification_opt_in')::boolean, true)
  )
  on conflict (user_id) do update set
    baseline_mood       = excluded.baseline_mood,
    growth_goals        = excluded.growth_goals,
    checkin_frequency   = excluded.checkin_frequency,
    blooming_focus      = excluded.blooming_focus,
    notification_opt_in = excluded.notification_opt_in,
    completed_at        = now();

  update public.profiles
     set onboarding_completed_at = now()
   where id = uid;

  insert into public.mood_checkins (user_id, category, color_hex, intensity, anchor_word)
  values (
    uid,
    baseline,
    coalesce(payload->>'baseline_color_hex', '#A8D5E2'),
    coalesce((payload->>'baseline_intensity')::int, 3),
    coalesce(payload->>'baseline_anchor_word', 'arriving')
  )
  on conflict (user_id, checkin_date) do nothing;

  return jsonb_build_object(
    'onboarded_at', now(),
    'baseline_mood', baseline
  );
end;
$$;
