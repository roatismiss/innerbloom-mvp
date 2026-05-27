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
  const qc = useQueryClient();

  const query = useQuery<number>({
    queryKey: UNREAD_KEY,
    staleTime: 30_000,
    queryFn: () =>
      callRpc<undefined, number>('my_unread_notifications_count'),
  });

  // Keep the badge live: invalidate on any change to the source tables.
  // Cheaper than re-fetching the full inbox.
  useEffect(() => {
    let mounted = true;
    let userId: string | null = null;

    const setup = async () => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user || !mounted) return;
      userId = user.id;

      const channel = sb()
        .channel(`notif-badge:${user.id}`)
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

      return () => sb().removeChannel(channel);
    };

    const cleanup = setup();
    return () => {
      mounted = false;
      void cleanup.then((fn) => fn?.());
      void userId;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
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
