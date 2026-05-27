-- Reconcile the live profiles table with the canonical schema.
-- The name screen was removed from onboarding; profiles only carry the
-- anonymous_alias going forward. Older deployments are missing several
-- columns that the RPC reads/writes — add them idempotently.

alter table public.profiles drop  column if exists display_name;
alter table public.profiles add   column if not exists city                    text;
alter table public.profiles add   column if not exists institution_id          uuid;
alter table public.profiles add   column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add   column if not exists created_at              timestamptz not null default now();
alter table public.profiles add   column if not exists updated_at              timestamptz not null default now();

-- Make sure the tables the RPC writes to exist.
create table if not exists public.onboarding_responses (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  baseline_mood        text not null check (baseline_mood in
                         ('anxious','sad','stressed','neutral','happy','hopeful')),
  growth_goals         text[] not null default '{}',
  checkin_frequency    text not null check (checkin_frequency in
                         ('daily','few_per_week','flexible')),
  blooming_focus       text[] not null default '{}',
  notification_opt_in  boolean not null default true,
  completed_at         timestamptz not null default now()
);

create table if not exists public.mood_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null check (category in
                  ('anxious','sad','stressed','neutral','happy','hopeful')),
  color_hex     text not null,
  intensity     int  not null check (intensity between 1 and 5),
  anchor_word   text not null,
  checkin_date  date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create or replace function public.complete_onboarding(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  baseline text;
begin
  if uid is null then
    raise exception 'unauthenticated';
  end if;

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
