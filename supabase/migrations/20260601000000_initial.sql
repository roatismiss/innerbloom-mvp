-- ============================================================================
-- InnerBloom — Canonical schema (single source of truth).
-- ============================================================================
-- Replaces all prior schema. Idempotent. Runs in one transaction.
-- ============================================================================

begin;

create extension if not exists "pgcrypto";

-- Public alias generator: "Bloom #1234".
create sequence if not exists bloom_alias_seq start with 1000;

-- ============================================================================
-- A1. institutions
-- ============================================================================
create table if not exists institutions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('bpo','university')),
  city       text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- A2. profiles  (1:1 with auth.users)
-- display_name is private. We expose a public_profiles view that omits it,
-- and a SELECT policy on profiles that only matches the owner's own row.
-- Other-user reads go through the view.
-- ============================================================================
create table if not exists profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  anonymous_alias          text unique not null,
  city                     text,
  institution_id           uuid references institutions(id) on delete set null,
  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists profiles_city_idx        on profiles(city);
create index if not exists profiles_institution_idx on profiles(institution_id);

create or replace view public_profiles as
  select id, anonymous_alias, city, institution_id, created_at
  from   profiles;

-- ============================================================================
-- A3. onboarding_responses  (one row per user)
-- ============================================================================
create table if not exists onboarding_responses (
  user_id              uuid primary key references profiles(id) on delete cascade,
  baseline_mood        text not null check (baseline_mood in
                         ('anxious','sad','stressed','neutral','happy','hopeful')),
  growth_goals         text[] not null default '{}',
  checkin_frequency    text not null check (checkin_frequency in
                         ('daily','few_per_week','flexible')),
  blooming_focus       text[] not null default '{}',
  notification_opt_in  boolean not null default true,
  completed_at         timestamptz not null default now()
);

-- ============================================================================
-- A4. mood_checkins  (one per user per day; user can refine same-day entry)
-- ============================================================================
create table if not exists mood_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  category      text not null check (category in
                  ('anxious','sad','stressed','neutral','happy','hopeful')),
  color_hex     text not null,
  intensity     int  not null check (intensity between 1 and 5),
  anchor_word   text not null,
  checkin_date  date not null default current_date,
  created_at    timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create index if not exists mood_checkins_user_date_idx
  on mood_checkins(user_id, checkin_date desc);
create index if not exists mood_checkins_match_idx
  on mood_checkins(checkin_date, category, intensity);

-- ============================================================================
-- A5. mood_streaks  (denormalized; updated by trigger T4)
-- ============================================================================
create table if not exists mood_streaks (
  user_id            uuid primary key references profiles(id) on delete cascade,
  current_streak     int  not null default 0,
  longest_streak     int  not null default 0,
  last_checkin_date  date,
  updated_at         timestamptz not null default now()
);

-- ============================================================================
-- A6. bloom_quotes  (curated, mood-targeted)
-- ============================================================================
create table if not exists bloom_quotes (
  id            uuid primary key default gen_random_uuid(),
  body          text not null check (char_length(body) between 1 and 240),
  author        text,
  categories    text[] not null check (
                  categories <@ array['anxious','sad','stressed','neutral','happy','hopeful']
                  and array_length(categories, 1) >= 1
                ),
  tone          text not null check (tone in
                  ('soothing','energizing','grounding','reflective')),
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists bloom_quotes_categories_idx on bloom_quotes using gin (categories);
create index if not exists bloom_quotes_tone_idx       on bloom_quotes(tone) where is_published;

-- ============================================================================
-- A7. bloom_posts  (anonymous feed moments)
-- ============================================================================
create table if not exists bloom_posts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  sentence        text not null check (char_length(sentence) between 1 and 280),
  color_hex       text not null,
  anchor_word     text not null,
  category        text not null check (category in
                    ('anxious','sad','stressed','neutral','happy','hopeful')),
  resonance_count int  not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists bloom_posts_feed_idx     on bloom_posts(created_at desc);
create index if not exists bloom_posts_category_idx on bloom_posts(category, created_at desc);

-- ============================================================================
-- A8. resonances  ("felt this")
-- ============================================================================
create table if not exists resonances (
  user_id    uuid not null references profiles(id) on delete cascade,
  post_id    uuid not null references bloom_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists resonances_post_idx on resonances(post_id);

-- ============================================================================
-- A9. bloom_reels  (curated text reels)
-- ============================================================================
create table if not exists bloom_reels (
  id            uuid primary key default gen_random_uuid(),
  content       text not null,
  category      text not null check (category in (
                  'anxiety_stillness','depression_hope','motivation_direction',
                  'financial_clarity','breaking_patterns','rest_recovery'
                )),
  color_hex     text not null,
  duration_ms   int  not null default 9000,
  author_alias  text not null,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists bloom_reels_published_idx on bloom_reels(is_published, created_at desc);
create index if not exists bloom_reels_category_idx  on bloom_reels(category);

-- ============================================================================
-- A10. soul_match_quiz_responses
-- ============================================================================
create table if not exists soul_match_quiz_responses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  quiz_date        date not null default current_date,
  current_feeling  text not null check (current_feeling in
                     ('anxious','sad','stressed','neutral','happy','hopeful')),
  looking_for      text not null check (looking_for in
                     ('listener','similar_story','perspective','just_presence')),
  energy_level     int  not null check (energy_level   between 1 and 5),
  openness_level   int  not null check (openness_level between 1 and 5),
  prompt_answer    text not null check (char_length(prompt_answer) between 1 and 500),
  created_at       timestamptz not null default now(),
  unique (user_id, quiz_date)
);

create index if not exists smqr_pool_idx
  on soul_match_quiz_responses(quiz_date, current_feeling, energy_level);

-- ============================================================================
-- A11. soul_matches  (directional — one per (user_a, match_date))
-- ============================================================================
create table if not exists soul_matches (
  id                uuid primary key default gen_random_uuid(),
  user_a_id         uuid not null references profiles(id) on delete cascade,
  user_b_id         uuid not null references profiles(id) on delete cascade,
  shared_category   text not null,
  resonance_score   int  not null check (resonance_score between 0 and 100),
  status            text not null default 'pending'
                    check (status in ('pending','connected','passed')),
  match_date        date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (user_a_id <> user_b_id),
  unique (user_a_id, match_date)
);

create index if not exists soul_matches_user_a_idx on soul_matches(user_a_id, match_date desc);
create index if not exists soul_matches_user_b_idx on soul_matches(user_b_id, match_date desc);

-- ============================================================================
-- A12. conversations
-- ============================================================================
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid unique references soul_matches(id) on delete cascade,
  user_a_id   uuid not null references profiles(id) on delete cascade,
  user_b_id   uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  check (user_a_id <> user_b_id)
);

create index if not exists conversations_a_idx on conversations(user_a_id);
create index if not exists conversations_b_idx on conversations(user_b_id);

-- ============================================================================
-- A13. messages
-- ============================================================================
create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender_id        uuid not null references profiles(id) on delete cascade,
  body             text not null check (char_length(body) between 1 and 2000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);

create index if not exists messages_conv_idx on messages(conversation_id, created_at);

-- ============================================================================
-- A14. hugs
-- ============================================================================
create table if not exists hugs (
  id              uuid primary key default gen_random_uuid(),
  from_user_id    uuid not null references profiles(id) on delete cascade,
  to_user_id      uuid not null references profiles(id) on delete cascade,
  context_type    text not null check (context_type in ('reel','match','post')),
  context_id      uuid not null,
  created_at      timestamptz not null default now(),
  check (from_user_id <> to_user_id),
  unique (from_user_id, context_type, context_id)
);

create index if not exists hugs_to_user_idx   on hugs(to_user_id,   created_at desc);
create index if not exists hugs_from_user_idx on hugs(from_user_id, created_at desc);

-- ============================================================================
-- T1. handle_new_user — auto-create profile on auth.users insert
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, ''
as $$
begin
  insert into public.profiles (id, anonymous_alias)
  values (new.id, 'Bloom #' || nextval('public.bloom_alias_seq'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- T2. touch_updated_at
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on profiles;
create trigger profiles_touch_updated_at
  before update on profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists soul_matches_touch_updated_at on soul_matches;
create trigger soul_matches_touch_updated_at
  before update on soul_matches
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- T3. update_resonance_count
-- ============================================================================
create or replace function public.update_resonance_count()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    update bloom_posts set resonance_count = resonance_count + 1
      where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update bloom_posts set resonance_count = greatest(resonance_count - 1, 0)
      where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists resonance_count_insert on resonances;
create trigger resonance_count_insert
  after insert on resonances
  for each row execute function public.update_resonance_count();

drop trigger if exists resonance_count_delete on resonances;
create trigger resonance_count_delete
  after delete on resonances
  for each row execute function public.update_resonance_count();

-- ============================================================================
-- T4. recompute_mood_streak
-- ============================================================================
create or replace function public.recompute_mood_streak()
returns trigger
language plpgsql
as $$
declare
  prev_last  date;
  prev_curr  int;
  prev_long  int;
  new_curr   int;
  new_long   int;
begin
  select last_checkin_date, current_streak, longest_streak
    into prev_last, prev_curr, prev_long
    from mood_streaks
   where user_id = new.user_id
   for update;

  if not found then
    insert into mood_streaks (user_id, current_streak, longest_streak,
                              last_checkin_date, updated_at)
    values (new.user_id, 1, 1, new.checkin_date, now());
    return new;
  end if;

  if new.checkin_date = prev_last then
    -- Refining today's mood. No streak change.
    return new;
  elsif new.checkin_date = prev_last + 1 then
    new_curr := prev_curr + 1;
  else
    new_curr := 1;
  end if;

  new_long := greatest(prev_long, new_curr);

  update mood_streaks
     set current_streak    = new_curr,
         longest_streak    = new_long,
         last_checkin_date = new.checkin_date,
         updated_at        = now()
   where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists mood_checkin_streak on mood_checkins;
create trigger mood_checkin_streak
  after insert or update of category, intensity, checkin_date on mood_checkins
  for each row execute function public.recompute_mood_streak();

-- ============================================================================
-- R1. complete_onboarding(payload jsonb)
-- ============================================================================
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

-- ============================================================================
-- R2. submit_mood_checkin
-- ============================================================================
create or replace function public.submit_mood_checkin(
  p_category    text,
  p_intensity   int,
  p_anchor_word text,
  p_color_hex   text
)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  mood_row mood_checkins;
  streak_row mood_streaks;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  insert into public.mood_checkins (user_id, category, color_hex, intensity, anchor_word)
  values (uid, p_category, p_color_hex, p_intensity, p_anchor_word)
  on conflict (user_id, checkin_date) do update set
    category    = excluded.category,
    color_hex   = excluded.color_hex,
    intensity   = excluded.intensity,
    anchor_word = excluded.anchor_word
  returning * into mood_row;

  select * into streak_row from public.mood_streaks where user_id = uid;

  return jsonb_build_object('mood', row_to_json(mood_row), 'streak', row_to_json(streak_row));
end;
$$;

-- ============================================================================
-- Helper: mood category → reel category
-- ============================================================================
create or replace function public.reel_category_for_mood(p_category text)
returns text
language sql
immutable
as $$
  select case p_category
    when 'anxious'  then 'anxiety_stillness'
    when 'sad'      then 'depression_hope'
    when 'stressed' then 'rest_recovery'
    when 'neutral'  then 'motivation_direction'
    when 'happy'    then 'breaking_patterns'
    when 'hopeful'  then 'motivation_direction'
    else                 'motivation_direction'
  end;
$$;

-- Helper: mood → adjacent feed categories
create or replace function public.feed_categories_for_mood(p_category text)
returns text[]
language sql
immutable
as $$
  select case p_category
    when 'anxious'  then array['anxious','stressed','hopeful']
    when 'stressed' then array['stressed','anxious','hopeful']
    when 'sad'      then array['sad','hopeful','neutral']
    when 'hopeful'  then array['hopeful','happy','neutral']
    when 'happy'    then array['happy','hopeful','neutral']
    when 'neutral'  then array['neutral','hopeful','happy']
    else                 array['anxious','sad','stressed','neutral','happy','hopeful']
  end;
$$;

-- ============================================================================
-- R3. today_for_me
-- ============================================================================
create or replace function public.today_for_me()
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  today_mood   mood_checkins;
  streak_row   mood_streaks;
  quote_row    bloom_quotes;
  reel_rows    jsonb;
  feed_cats    text[];
  reel_cat     text;
  target_mood  text;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select * into today_mood
    from public.mood_checkins
   where user_id = uid and checkin_date = current_date;

  select * into streak_row from public.mood_streaks where user_id = uid;

  target_mood := coalesce(today_mood.category, 'neutral');
  reel_cat    := public.reel_category_for_mood(target_mood);
  feed_cats   := public.feed_categories_for_mood(today_mood.category);

  -- Quote: prefer mood-matching, biased by intensity-derived tone.
  select * into quote_row
    from public.bloom_quotes
   where is_published
     and (today_mood.category is null or categories @> array[today_mood.category])
     and tone = any (case
       when today_mood.intensity is null then array['grounding','soothing']
       when today_mood.intensity <= 2    then array['soothing','grounding']
       when today_mood.intensity >= 4    then array['energizing','reflective']
       else                                    array['soothing','grounding','reflective','energizing']
     end)
   order by random()
   limit 1;

  -- Fallback if no quote matched
  if quote_row.id is null then
    select * into quote_row
      from public.bloom_quotes
     where is_published and tone = 'grounding'
     order by random()
     limit 1;
  end if;

  select coalesce(jsonb_agg(row_to_json(r) order by r.created_at desc), '[]'::jsonb)
    into reel_rows
    from (
      select *
        from public.bloom_reels
       where is_published and category = reel_cat
       order by random()
       limit 5
    ) r;

  return jsonb_build_object(
    'mood',             row_to_json(today_mood),
    'streak',           coalesce(row_to_json(streak_row),
                                 jsonb_build_object(
                                   'user_id', uid,
                                   'current_streak', 0,
                                   'longest_streak', 0,
                                   'last_checkin_date', null
                                 )),
    'quote',            row_to_json(quote_row),
    'reels',            reel_rows,
    'feed_categories',  feed_cats
  );
end;
$$;

-- ============================================================================
-- R4. mood_history(days)
-- ============================================================================
create or replace function public.mood_history(days int default 30)
returns table (
  day          date,
  category     text,
  intensity    int,
  color_hex    text,
  anchor_word  text
)
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  return query
  select d::date as day,
         m.category, m.intensity, m.color_hex, m.anchor_word
    from generate_series(current_date - (days - 1), current_date, interval '1 day') d
    left join public.mood_checkins m
           on m.user_id = uid and m.checkin_date = d::date
   order by d asc;
end;
$$;

-- ============================================================================
-- R5. send_message
-- ============================================================================
create or replace function public.send_message(p_conversation_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid uuid := auth.uid();
  is_member boolean;
  msg_row messages;
begin
  if uid is null then raise exception 'unauthenticated'; end if;

  select exists(
    select 1 from public.conversations
     where id = p_conversation_id
       and (user_a_id = uid or user_b_id = uid)
       and closed_at is null
  ) into is_member;

  if not is_member then
    raise exception 'not a member of this conversation';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, uid, p_body)
  returning * into msg_row;

  return row_to_json(msg_row)::jsonb;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table institutions               enable row level security;
alter table profiles                   enable row level security;
alter table onboarding_responses       enable row level security;
alter table mood_checkins              enable row level security;
alter table mood_streaks               enable row level security;
alter table bloom_quotes               enable row level security;
alter table bloom_posts                enable row level security;
alter table resonances                 enable row level security;
alter table bloom_reels                enable row level security;
alter table soul_match_quiz_responses  enable row level security;
alter table soul_matches               enable row level security;
alter table conversations              enable row level security;
alter table messages                   enable row level security;
alter table hugs                       enable row level security;

-- public_profiles view inherits the underlying profiles policies, so it's
-- safe — non-owners get no display_name because the column doesn't exist
-- in the view's SELECT list.
grant select on public_profiles to authenticated;

-- institutions: read-only catalog
drop policy if exists institutions_select_all on institutions;
create policy institutions_select_all
  on institutions for select to authenticated using (true);

-- profiles: owner sees everything; others get only their own row.
-- Other-user reads must go through public_profiles view (display_name omitted).
drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own
  on profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own
  on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- onboarding_responses: strictly private
drop policy if exists onboarding_select_own on onboarding_responses;
create policy onboarding_select_own
  on onboarding_responses for select to authenticated using (auth.uid() = user_id);
drop policy if exists onboarding_write_own on onboarding_responses;
create policy onboarding_write_own
  on onboarding_responses for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists onboarding_update_own on onboarding_responses;
create policy onboarding_update_own
  on onboarding_responses for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mood_checkins: strictly private
drop policy if exists mood_checkins_select_own on mood_checkins;
create policy mood_checkins_select_own
  on mood_checkins for select to authenticated using (auth.uid() = user_id);
drop policy if exists mood_checkins_insert_own on mood_checkins;
create policy mood_checkins_insert_own
  on mood_checkins for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists mood_checkins_update_own on mood_checkins;
create policy mood_checkins_update_own
  on mood_checkins for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists mood_checkins_delete_own on mood_checkins;
create policy mood_checkins_delete_own
  on mood_checkins for delete to authenticated using (auth.uid() = user_id);

-- mood_streaks: read own only; writes happen via trigger (service-internal)
drop policy if exists mood_streaks_select_own on mood_streaks;
create policy mood_streaks_select_own
  on mood_streaks for select to authenticated using (auth.uid() = user_id);

-- bloom_quotes: public read of published; writes via service_role
drop policy if exists bloom_quotes_select_published on bloom_quotes;
create policy bloom_quotes_select_published
  on bloom_quotes for select to authenticated using (is_published);

-- bloom_posts: read all, write own
drop policy if exists bloom_posts_select_all on bloom_posts;
create policy bloom_posts_select_all
  on bloom_posts for select to authenticated using (true);
drop policy if exists bloom_posts_insert_own on bloom_posts;
create policy bloom_posts_insert_own
  on bloom_posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists bloom_posts_delete_own on bloom_posts;
create policy bloom_posts_delete_own
  on bloom_posts for delete to authenticated using (auth.uid() = user_id);

-- resonances: own only (private "I felt this")
drop policy if exists resonances_select_own on resonances;
create policy resonances_select_own
  on resonances for select to authenticated using (auth.uid() = user_id);
drop policy if exists resonances_insert_own on resonances;
create policy resonances_insert_own
  on resonances for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists resonances_delete_own on resonances;
create policy resonances_delete_own
  on resonances for delete to authenticated using (auth.uid() = user_id);

-- bloom_reels: read published; writes via service_role
drop policy if exists bloom_reels_select_published on bloom_reels;
create policy bloom_reels_select_published
  on bloom_reels for select to authenticated using (is_published);

-- soul_match_quiz_responses: own only
drop policy if exists smqr_select_own on soul_match_quiz_responses;
create policy smqr_select_own
  on soul_match_quiz_responses for select to authenticated using (auth.uid() = user_id);
drop policy if exists smqr_insert_own on soul_match_quiz_responses;
create policy smqr_insert_own
  on soul_match_quiz_responses for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists smqr_update_own on soul_match_quiz_responses;
create policy smqr_update_own
  on soul_match_quiz_responses for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- soul_matches: read if involved, update own directional action,
-- INSERT restricted to service_role (Edge Function)
drop policy if exists soul_matches_select_involved on soul_matches;
create policy soul_matches_select_involved
  on soul_matches for select to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);
drop policy if exists soul_matches_update_own on soul_matches;
create policy soul_matches_update_own
  on soul_matches for update to authenticated
  using (auth.uid() = user_a_id) with check (auth.uid() = user_a_id);

-- conversations: read if involved; INSERT via service_role
drop policy if exists conversations_select_involved on conversations;
create policy conversations_select_involved
  on conversations for select to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- messages: read/write if member of parent conversation
drop policy if exists messages_select_member on messages;
create policy messages_select_member
  on messages for select to authenticated
  using (exists (
    select 1 from conversations c
     where c.id = messages.conversation_id
       and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  ));
drop policy if exists messages_insert_member on messages;
create policy messages_insert_member
  on messages for insert to authenticated
  with check (
    sender_id = auth.uid() and exists (
      select 1 from conversations c
       where c.id = conversation_id
         and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
         and c.closed_at is null
    )
  );
drop policy if exists messages_update_read on messages;
create policy messages_update_read
  on messages for update to authenticated
  using (exists (
    select 1 from conversations c
     where c.id = messages.conversation_id
       and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
  ));

-- hugs: read if involved, insert as self
drop policy if exists hugs_select_involved on hugs;
create policy hugs_select_involved
  on hugs for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
drop policy if exists hugs_insert_own on hugs;
create policy hugs_insert_own
  on hugs for insert to authenticated with check (auth.uid() = from_user_id);

-- ============================================================================
-- Realtime publication: messages + soul_matches
-- ============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table messages;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table soul_matches;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

commit;
