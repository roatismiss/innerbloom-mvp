// ============================================================================
// Notifications inbox — aggregated activity feed (in-app).
// ============================================================================
// Source-of-truth queries live in the my_notifications RPC. This module
// exposes hooks the bell icon + inbox screen use directly.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type {
  MyNotificationsArgs,
  NotificationRow,
} from '../../types/database';
import { callRpc, sb } from './client';

const INBOX_KEY = ['notifications-inbox'] as const;
const UNREAD_KEY = ['notifications-unread'] as const;

// ─── Unread count (bell badge) ────────────────────────────────────────────

export function useUnreadNotificationsCount() {
  return useQuery<number>({
    queryKey: UNREAD_KEY,
    staleTime: 30_000,
    queryFn: () =>
      callRpc<undefined, number>('my_unread_notifications_count'),
  });
}

// Realtime subscription that keeps the badge live by invalidating UNREAD_KEY
// whenever a relevant row lands. Mount ONCE at the top of the tree (see
// _layout.tsx → <NotificationsBadgeBootstrap />).
//
// Why the existence check inside the effect: React StrictMode + Metro
// hot-reload both re-run useEffect (sometimes within the same tick). The
// Supabase client keeps channels in a singleton map keyed by topic, so a
// second .channel(`notif-badge:<uid>`).on(...) call lands on the already-
// subscribed channel and throws "cannot add postgres_changes callbacks
// after subscribe()". Bailing when the topic is already registered makes
// this effect safely idempotent across remounts and HMR.
//
// We intentionally do NOT tear down on cleanup — the subscription is a
// session-long singleton tied to the signed-in user.
export function useNotificationsBadgeSubscription() {
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user || !mounted) return;

      const channelName = `notif-badge:${user.id}`;
      const topic = `realtime:${channelName}`;
      const alreadyOpen = sb().getChannels().some((c) => c.topic === topic);
      if (alreadyOpen) return;

      sb()
        .channel(channelName)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'hugs', filter: `to_user_id=eq.${user.id}` },
          () => { void qc.invalidateQueries({ queryKey: UNREAD_KEY }); })
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'kindred_requests', filter: `to_user_id=eq.${user.id}` },
          () => { void qc.invalidateQueries({ queryKey: UNREAD_KEY }); })
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'soul_matches', filter: `user_b_id=eq.${user.id}` },
          () => { void qc.invalidateQueries({ queryKey: UNREAD_KEY }); })
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => { void qc.invalidateQueries({ queryKey: UNREAD_KEY }); })
        .subscribe();
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── Full inbox (the screen) ──────────────────────────────────────────────

export function useNotificationsInbox(limit = 40) {
  return useQuery<NotificationRow[]>({
    queryKey: [...INBOX_KEY, limit],
    staleTime: 15_000,
    queryFn: () =>
      callRpc<MyNotificationsArgs, NotificationRow[]>('my_notifications', {
        p_limit: limit,
      }),
  });
}

// ─── Mark all as seen (called when inbox opens) ───────────────────────────

export function useMarkNotificationsSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => callRpc<undefined, string>('mark_notifications_seen'),
    onSuccess: () => {
      // Badge instantly drops to 0; inbox refetches to flip is_unread flags.
      qc.setQueryData<number>(UNREAD_KEY, 0);
      void qc.invalidateQueries({ queryKey: INBOX_KEY });
    },
  });
}
