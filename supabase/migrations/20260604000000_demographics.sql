-- ============================================================================
-- InnerBloom — Demographics (optional gender + derived age band).
-- ============================================================================
-- Idempotent. Paste into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run. No DROP TABLE, no data loss.
--
-- WHAT THIS ADDS
--   • profiles.gender   — optional, self-declared in onboarding (about-you step).
--   • profiles.age_band — coarse band DERIVED on the client from the age-gate DOB
--                         (we never store the raw date of birth server-side; DPA).
--   Both are surfaced to PostHog as PERSON properties via identify() (see
--   src/lib/queries/auth.ts) so users — not events — can be segmented.
-- ============================================================================

-- ── 1. Columns (idempotent) ──────────────────────────────────────────────────
alter table public.profiles add column if not exists gender   text;
alter table public.profiles add column if not exists age_band text;

-- ── 2. Value constraints (guarded so re-runs don't error) ─────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_gender_check') then
    alter table public.profiles
      add constraint profiles_gender_check
      check (gender is null or gender in ('male','female','non_binary','prefer_not_to_say'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_age_band_check') then
    alter table public.profiles
      add constraint profiles_age_band_check
      check (age_band is null or age_band in ('16-17','18-24','25-34','35-44','45+'));
  end if;
end $$;

-- ── 3. complete_onboarding — persist demographics onto the profile ────────────
--    Same body as 20260601030000_fix_auth_onboarding.sql, plus the gender /
--    age_band writes. coalesce() means omitting either field never wipes it.
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
     set onboarding_completed_at = now(),
         gender   = coalesce(payload->>'gender', gender),
         age_band = coalesce(payload->>'age_band', age_band)
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
