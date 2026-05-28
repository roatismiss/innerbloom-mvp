-- ============================================================================
-- Reel sharing in conversations.
-- Adds an optional reel_id column to messages so a shared reel can be
-- identified and rendered as a preview card in the conversation screen.
-- send_message is updated to accept an optional p_reel_id parameter.
-- ============================================================================

begin;

alter table public.messages
  add column if not exists reel_id text;

-- Replace send_message to accept the optional reel reference.
create or replace function public.send_message(
  p_conversation_id uuid,
  p_body            text,
  p_reel_id         text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, ''
as $$
declare
  uid      uuid := auth.uid();
  is_member boolean;
  msg_row  messages;
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

  insert into public.messages (conversation_id, sender_id, body, reel_id)
  values (p_conversation_id, uid, p_body, p_reel_id)
  returning * into msg_row;

  return row_to_json(msg_row)::jsonb;
end;
$$;

commit;
