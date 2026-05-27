import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type {
  ConversationRow,
  MessageRow,
  SendMessageArgs,
  SendMessageResult,
} from '../../types/database';
import { callRpc, sb } from './client';

export type ConversationWithOther = ConversationRow & {
  other_user_id: string;
  other_alias: string;
  other_display_name: string | null;
  other_avatar_url:   string | null;
};

export function useConversation(conversationId: string | null | undefined) {
  return useQuery<ConversationRow | null>({
    queryKey: ['conversation', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('conversations')
        .select('*')
        .eq('id', conversationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Fetches a conversation plus the other member's anonymous alias.
// Conversation screen uses this so the header doesn't have to chain queries.
export function useConversationWithOther(conversationId: string | null | undefined) {
  return useQuery<ConversationWithOther | null>({
    queryKey: ['conversation-with-other', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) return null;

      const { data: conv, error } = await sb()
        .from('conversations')
        .select('*')
        .eq('id', conversationId!)
        .maybeSingle();
      if (error) throw error;
      if (!conv) return null;

      const otherId =
        conv.user_a_id === user.id ? conv.user_b_id : conv.user_a_id;

      const { data: other } = await sb()
        .from('public_profiles')
        .select('anonymous_alias, display_name, avatar_url')
        .eq('id', otherId)
        .maybeSingle();

      const o = other as {
        anonymous_alias: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;

      return {
        ...conv,
        other_user_id:      otherId,
        other_alias:        o?.anonymous_alias ?? 'Bloom',
        other_display_name: o?.display_name ?? null,
        other_avatar_url:   o?.avatar_url ?? null,
      };
    },
  });
}

// Resolves today's active (connected) conversation, if any. Used by the
// conversation screen when invoked without an explicit id (e.g. directly
// after the finding screen).
export function useTodayActiveConversation() {
  return useQuery<{ conversation_id: string } | null>({
    queryKey: ['today-active-conversation'],
    queryFn: async () => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) return null;

      const today = new Date().toISOString().slice(0, 10);

      const { data: match } = await sb()
        .from('soul_matches')
        .select('id')
        .eq('match_date', today)
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .eq('status', 'connected')
        .maybeSingle();

      if (!match) return null;

      const { data: conv } = await sb()
        .from('conversations')
        .select('id')
        .eq('match_id', match.id)
        .maybeSingle();

      return conv ? { conversation_id: conv.id } : null;
    },
  });
}

// Loads the full message history once, then keeps it warm via Realtime.
// react-query cache holds the authoritative ordered list; the channel
// callback patches inserts in.
export function useMessages(conversationId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['messages', conversationId];

  const query = useQuery<MessageRow[]>({
    queryKey: key,
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = sb()
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          qc.setQueryData<MessageRow[]>(key, (prev) => {
            if (!prev) return [row];
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        },
      )
      .subscribe();

    return () => {
      sb().removeChannel(channel);
    };
    // key intentionally derived from conversationId; including the array
    // would cause endless re-subscriptions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return query;
}

// Send a message via send_message RPC (server-side membership check).
// Optimistically appends, then reconciles when Realtime echo arrives.
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const key = ['messages', conversationId];

  return useMutation({
    mutationFn: (body: string) =>
      callRpc<SendMessageArgs, SendMessageResult>('send_message', {
        p_conversation_id: conversationId,
        p_body: body,
      }),
    onMutate: async (body) => {
      const {
        data: { user },
      } = await sb().auth.getUser();
      if (!user) return;

      const optimistic: MessageRow = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user.id,
        body,
        created_at: new Date().toISOString(),
        read_at: null,
      };

      qc.setQueryData<MessageRow[]>(key, (prev) =>
        prev ? [...prev, optimistic] : [optimistic],
      );
      return { optimisticId: optimistic.id };
    },
    onSuccess: (real, _body, ctx) => {
      qc.setQueryData<MessageRow[]>(key, (prev) => {
        if (!prev) return [real];
        // If Realtime echo beat us, drop the optimistic row and keep the
        // already-stored real one. Otherwise swap in place.
        const realAlreadyHere = prev.some((m) => m.id === real.id);
        return prev
          .filter((m) => m.id !== ctx?.optimisticId || !realAlreadyHere)
          .map((m) => (m.id === ctx?.optimisticId ? real : m));
      });
    },
    onError: (_err, _body, ctx) => {
      qc.setQueryData<MessageRow[]>(key, (prev) =>
        prev ? prev.filter((m) => m.id !== ctx?.optimisticId) : prev,
      );
    },
  });
}
