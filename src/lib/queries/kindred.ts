// ============================================================================
// Kindred (Soul Garden) — React Query hooks
// ============================================================================
// Mechanics live entirely in security-definer RPCs (see
// supabase/migrations/20260601050000_kindred_requests.sql). Clients never
// write to kindred_requests directly.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type {
  KindredGardenRow,
  KindredRequestCancelArgs,
  KindredRequestRespondArgs,
  KindredRequestRow,
  KindredRequestSendArgs,
  KindredReleaseArgs,
  KindredStatus,
  KindredStatusArgs,
  PendingKindredRequestRow,
} from '../../types/database';
import { callRpc, sb } from './client';

// ─── Conversation-level status ────────────────────────────────────────────

export function useKindredStatus(conversationId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['kindred-status', conversationId];

  const query = useQuery<KindredStatus>({
    queryKey: key,
    enabled: !!conversationId,
    queryFn: () =>
      callRpc<KindredStatusArgs, KindredStatus>(
        'my_kindred_status_for_conversation',
        { p_conversation_id: conversationId! },
      ),
  });

  // Subscribe so the accepter's screen updates the moment the sender's
  // request lands, and so the sender sees acceptance live.
  useEffect(() => {
    if (!conversationId) return;

    const channel = sb()
      .channel(`kindred:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kindred_requests',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: key });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: key });
          void qc.invalidateQueries({ queryKey: ['kindred-garden'] });
        },
      )
      .subscribe();

    return () => {
      sb().removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return query;
}

// ─── Send / cancel / respond / release ────────────────────────────────────

export function useSendKindredRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { conversationId: string; note?: string | null }) =>
      callRpc<KindredRequestSendArgs, KindredRequestRow>('kindred_request_send', {
        p_conversation_id: args.conversationId,
        p_note: args.note ?? null,
      }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: ['kindred-status', vars.conversationId],
      });
    },
  });
}

export function useCancelKindredRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      callRpc<KindredRequestCancelArgs, { status: 'cancelled' }>(
        'kindred_request_cancel',
        { p_request_id: requestId },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kindred-status'] });
      void qc.invalidateQueries({ queryKey: ['kindred-pending'] });
    },
  });
}

export function useRespondKindredRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { requestId: string; accept: boolean }) =>
      callRpc<KindredRequestRespondArgs, { status: string; conversation_id?: string }>(
        'kindred_request_respond',
        { p_request_id: args.requestId, p_accept: args.accept },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kindred-status'] });
      void qc.invalidateQueries({ queryKey: ['kindred-pending'] });
      void qc.invalidateQueries({ queryKey: ['kindred-garden'] });
    },
  });
}

export function useReleaseKindred() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      callRpc<KindredReleaseArgs, { status: 'released' }>('kindred_release', {
        p_conversation_id: conversationId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kindred-garden'] });
      void qc.invalidateQueries({ queryKey: ['kindred-status'] });
    },
  });
}

// ─── Garden + inbox ───────────────────────────────────────────────────────

export function useKindredGarden() {
  return useQuery<KindredGardenRow[]>({
    queryKey: ['kindred-garden'],
    queryFn: () => callRpc<undefined, KindredGardenRow[]>('my_kindred_garden'),
  });
}

export function usePendingKindredRequests() {
  const qc = useQueryClient();
  const key = ['kindred-pending'];

  const query = useQuery<PendingKindredRequestRow[]>({
    queryKey: key,
    queryFn: () =>
      callRpc<undefined, PendingKindredRequestRow[]>('my_pending_kindred_requests'),
  });

  // Live inbox: any kindred_requests row that targets me updates the list.
  useEffect(() => {
    let userId: string | null = null;
    let mounted = true;

    const setup = async () => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user || !mounted) return;
      userId = user.id;

      const channel = sb()
        .channel(`kindred-inbox:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'kindred_requests',
            filter: `to_user_id=eq.${user.id}`,
          },
          () => {
            void qc.invalidateQueries({ queryKey: key });
          },
        )
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
