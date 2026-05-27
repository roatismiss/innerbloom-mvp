-- ============================================================================
-- Bloom AI chat — persisted sessions + messages.
-- ============================================================================
-- A session = a contiguous conversation with Bloom. A new session is started
-- when the gap since last message exceeds BLOOM_SESSION_GAP_HOURS (server-side
-- constant in the edge function). Sessions are user-private. Messages carry
-- the assistant's optional UI "cards" payload (breathing / reflection /
-- mood_picker / crisis_resources) in a jsonb column so the client can re-
-- render past turns identically.
-- ============================================================================

begin;

create table if not exists bloom_chat_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  started_at      timestamptz not null default now(),
  last_at         timestamptz not null default now(),
  message_count   int not null default 0,
  title           text,
  primary_feeling text
);

create index if not exists bloom_chat_sessions_user_started_idx
  on bloom_chat_sessions(user_id, started_at desc);

create index if not exists bloom_chat_sessions_user_last_idx
  on bloom_chat_sessions(user_id, last_at desc);

alter table bloom_chat_sessions enable row level security;

drop policy if exists bloom_chat_sessions_select_own on bloom_chat_sessions;
create policy bloom_chat_sessions_select_own
  on bloom_chat_sessions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists bloom_chat_sessions_modify_own on bloom_chat_sessions;
create policy bloom_chat_sessions_modify_own
  on bloom_chat_sessions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists bloom_chat_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references bloom_chat_sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  cards        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists bloom_chat_messages_session_idx
  on bloom_chat_messages(session_id, created_at);

create index if not exists bloom_chat_messages_user_idx
  on bloom_chat_messages(user_id, created_at desc);

alter table bloom_chat_messages enable row level security;

drop policy if exists bloom_chat_messages_select_own on bloom_chat_messages;
create policy bloom_chat_messages_select_own
  on bloom_chat_messages for select to authenticated
  using (user_id = auth.uid());

-- Inserts are done by the edge function with service-role, so no insert
-- policy is needed for clients. Keeping the table closed to client writes
-- enforces "only Bloom can grow the conversation."

commit;
