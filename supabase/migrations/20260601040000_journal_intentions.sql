-- ============================================================================
-- Journal entries + Daily Intentions — user-owned, RLS-protected.
-- ============================================================================
-- Two features that need to survive PWA reloads + reinstalls + device swaps:
--
--   1. journal_entries — free-form entries created via the compose modal.
--      One row per save. No daily uniqueness — users can log many times.
--
--   2. daily_intentions — one row per user per local date, holding the
--      morning intention, the To-Be checklist (jsonb), and the evening
--      reflection answer. Upsert on (user_id, intention_date).
--
-- Both tables are user-private and protected with the same RLS pattern as
-- bloom_chat_sessions: owner-only SELECT/INSERT/UPDATE/DELETE.
-- ============================================================================

begin;

-- ─── journal_entries ────────────────────────────────────────────────────────
create table if not exists journal_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 8000),
  -- The local date the user was writing on; lets the dashboard query
  -- "entries written today" without timezone math.
  entry_date   date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists journal_entries_user_created_idx
  on journal_entries(user_id, created_at desc);

create index if not exists journal_entries_user_date_idx
  on journal_entries(user_id, entry_date desc);

alter table journal_entries enable row level security;

drop policy if exists journal_entries_select_own on journal_entries;
create policy journal_entries_select_own
  on journal_entries for select to authenticated
  using (user_id = auth.uid());

drop policy if exists journal_entries_modify_own on journal_entries;
create policy journal_entries_modify_own
  on journal_entries for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── daily_intentions ───────────────────────────────────────────────────────
-- `tasks` is a jsonb array of { id: text, label: text, done: boolean }.
-- `honored` is the evening-reflection answer; null = not yet answered.
create table if not exists daily_intentions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  intention_date  date not null default current_date,
  primary_text    text not null default '' check (char_length(primary_text) <= 240),
  tasks           jsonb not null default '[]'::jsonb,
  honored         boolean,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, intention_date)
);

create index if not exists daily_intentions_user_date_idx
  on daily_intentions(user_id, intention_date desc);

alter table daily_intentions enable row level security;

drop policy if exists daily_intentions_select_own on daily_intentions;
create policy daily_intentions_select_own
  on daily_intentions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists daily_intentions_modify_own on daily_intentions;
create policy daily_intentions_modify_own
  on daily_intentions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── updated_at triggers ────────────────────────────────────────────────────
-- Reuses the touch_updated_at() function from the initial migration if it
-- exists; falls back to a local clone if not.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists journal_entries_touch on journal_entries;
create trigger journal_entries_touch
  before update on journal_entries
  for each row execute function touch_updated_at();

drop trigger if exists daily_intentions_touch on daily_intentions;
create trigger daily_intentions_touch
  before update on daily_intentions
  for each row execute function touch_updated_at();

-- ─── Convenience RPC: intentions_history ────────────────────────────────────
-- Returns the last N days, gap-filled with nulls. Drives the "you honored
-- your intention 23 of 30 days" stat on the dashboard or profile.
create or replace function intentions_history(p_days int default 30)
returns table (
  intention_date date,
  primary_text   text,
  honored        boolean,
  task_total     int,
  task_done      int
)
language sql stable security definer
set search_path = public
as $$
  with days as (
    select (current_date - g)::date as d
    from   generate_series(0, greatest(p_days, 1) - 1) g
  )
  select
    d.d as intention_date,
    di.primary_text,
    di.honored,
    coalesce(jsonb_array_length(di.tasks), 0)::int as task_total,
    coalesce((
      select count(*)::int
      from   jsonb_array_elements(di.tasks) t
      where  (t->>'done')::boolean is true
    ), 0) as task_done
  from   days d
  left   join daily_intentions di
         on di.user_id = auth.uid()
        and di.intention_date = d.d
  order  by d.d desc;
$$;

grant execute on function intentions_history(int) to authenticated;

commit;
