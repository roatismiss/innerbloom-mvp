import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BloomCard } from '../bloom-prompt';
import { sb } from './client';

type RawChatMessageRow = {
  id: string;
  session_id: string;
  role: BloomRole;
  content: string;
  cards: unknown;
  created_at: string;
};
type RawSessionRow = {
  id: string;
  started_at: string;
  last_at: string;
  message_count: number;
  title: string | null;
  primary_feeling: string | null;
};

export type BloomRole = 'user' | 'assistant';

export type BloomChatMessage = {
  id: string;
  session_id: string;
  role: BloomRole;
  content: string;
  cards: BloomCard[];
  created_at: string;
};

export type BloomSession = {
  id: string;
  started_at: string;
  last_at: string;
  message_count: number;
  title: string | null;
  primary_feeling: string | null;
};

export type BloomSessionWithMessages = {
  session: BloomSession;
  messages: BloomChatMessage[];
};

const SESSION_GAP_MS = 6 * 60 * 60 * 1000;

// Loads the user's most recent session if it's still within the gap window
// (mirrors SESSION_GAP_HOURS on the server). Returns null when there is no
// active session — the screen should then show a fresh greeting.
export function useBloomActiveSession() {
  return useQuery<BloomSessionWithMessages | null>({
    queryKey: ['bloom', 'active-session'],
    staleTime: 30_000,
    queryFn: async () => {
      const client = sb();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return null;

      const cutoff = new Date(Date.now() - SESSION_GAP_MS).toISOString();

      const { data: sessRaw, error: sessErr } = await client
        .from('bloom_chat_sessions')
        .select('id, started_at, last_at, message_count, title, primary_feeling')
        .eq('user_id', user.id)
        .gte('last_at', cutoff)
        .order('last_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sessErr) throw sessErr;
      if (!sessRaw) return null;
      const sess = sessRaw as unknown as RawSessionRow;

      const { data: msgs, error: msgErr } = await client
        .from('bloom_chat_messages')
        .select('id, session_id, role, content, cards, created_at')
        .eq('session_id', sess.id)
        .order('created_at', { ascending: true });
      if (msgErr) throw msgErr;

      const rows = (msgs ?? []) as unknown as RawChatMessageRow[];
      return {
        session: sess,
        messages: rows.map((m) => ({
          id: m.id,
          session_id: m.session_id,
          role: m.role,
          content: m.content,
          cards: Array.isArray(m.cards) ? (m.cards as BloomCard[]) : [],
          created_at: m.created_at,
        })),
      };
    },
  });
}

export type BloomSendResult = {
  session_id: string;
  user_message_id: string;
  assistant_message_id: string | null;
  reply: string;
  cards: BloomCard[];
};

export function useBloomSend() {
  const qc = useQueryClient();
  return useMutation<BloomSendResult, Error, { message: string }>({
    mutationFn: async ({ message }) => {
      const client = sb();
      // Force-attach the user JWT: when the function is deployed with
      // --no-verify-jwt, supabase-js sometimes drops the auth header,
      // and our function does its own auth.getUser() check inside.
      const { data: { session } } = await client.auth.getSession();
      if (!session?.access_token) throw new Error('not_signed_in');

      const { data, error } = await client.functions.invoke<BloomSendResult>('bloom-chat', {
        body: { message },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (!data?.reply) throw new Error('empty_reply');
      return {
        session_id: data.session_id,
        user_message_id: data.user_message_id,
        assistant_message_id: data.assistant_message_id ?? null,
        reply: data.reply,
        cards: Array.isArray(data.cards) ? data.cards : [],
      };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bloom', 'active-session'] });
      void qc.invalidateQueries({ queryKey: ['bloom', 'history'] });
    },
  });
}

// Browse-past-sessions list for the reflection view (paged by recency).
export function useBloomSessionHistory(limit = 30) {
  return useQuery<BloomSession[]>({
    queryKey: ['bloom', 'history', limit],
    queryFn: async () => {
      const { data, error } = await sb()
        .from('bloom_chat_sessions')
        .select('id, started_at, last_at, message_count, title, primary_feeling')
        .order('last_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as unknown as RawSessionRow[]);
    },
  });
}

export function useBloomSessionMessages(sessionId: string | null | undefined) {
  return useQuery<BloomChatMessage[]>({
    queryKey: ['bloom', 'session', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('bloom_chat_messages')
        .select('id, session_id, role, content, cards, created_at')
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as RawChatMessageRow[];
      return rows.map((m) => ({
        id: m.id,
        session_id: m.session_id,
        role: m.role,
        content: m.content,
        cards: Array.isArray(m.cards) ? (m.cards as BloomCard[]) : [],
        created_at: m.created_at,
      }));
    },
  });
}
