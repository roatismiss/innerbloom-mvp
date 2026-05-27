import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { IntentionTask } from '../../store/intentions';
import { callRpc, sb } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────
export type DailyIntentionRow = {
  intention_date: string;
  primary_text: string;
  tasks: IntentionTask[];
  honored: boolean | null;
};

type RawIntentionRow = {
  intention_date: string;
  primary_text: string;
  tasks: unknown;
  honored: boolean | null;
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeTasks(raw: unknown): IntentionTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((t) => ({
      id: String(t.id ?? ''),
      label: String(t.label ?? ''),
      done: Boolean(t.done),
    }))
    .filter((t) => t.id && t.label);
}

// ─── Today's intention (single row, read-on-mount) ───────────────────────────
export function useTodayIntention() {
  return useQuery<DailyIntentionRow | null>({
    queryKey: ['intentions', 'today'],
    staleTime: 60_000,
    queryFn: async () => {
      const client = sb();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return null;

      const { data, error } = await client
        .from('daily_intentions')
        .select('intention_date, primary_text, tasks, honored')
        .eq('user_id', user.id)
        .eq('intention_date', todayKey())
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as RawIntentionRow;
      return {
        intention_date: row.intention_date,
        primary_text: row.primary_text,
        tasks: normalizeTasks(row.tasks),
        honored: row.honored,
      };
    },
  });
}

// ─── Upsert today's intention (single round-trip) ────────────────────────────
// The intentions screen drives this on every meaningful change (primary
// commit, task toggle, evening reflection). One row per local date, so we
// rely on the (user_id, intention_date) unique index.
export function useUpsertIntention() {
  const qc = useQueryClient();
  return useMutation<
    DailyIntentionRow,
    Error,
    { primary_text: string; tasks: IntentionTask[]; honored: boolean | null }
  >({
    mutationFn: async ({ primary_text, tasks, honored }) => {
      const client = sb();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('not_signed_in');

      const { data, error } = await client
        .from('daily_intentions')
        .upsert(
          {
            user_id: user.id,
            intention_date: todayKey(),
            primary_text,
            tasks,
            honored,
          },
          { onConflict: 'user_id,intention_date' },
        )
        .select('intention_date, primary_text, tasks, honored')
        .single();
      if (error) throw error;

      const row = data as unknown as RawIntentionRow;
      return {
        intention_date: row.intention_date,
        primary_text: row.primary_text,
        tasks: normalizeTasks(row.tasks),
        honored: row.honored,
      };
    },
    onSuccess: (row) => {
      qc.setQueryData(['intentions', 'today'], row);
      void qc.invalidateQueries({ queryKey: ['intentions', 'history'] });
    },
  });
}

// ─── 30-day history (gap-filled by the SQL function) ─────────────────────────
export type IntentionsHistoryDay = {
  intention_date: string;
  primary_text: string | null;
  honored: boolean | null;
  task_total: number;
  task_done: number;
};

export function useIntentionsHistory(days = 30) {
  return useQuery<IntentionsHistoryDay[]>({
    queryKey: ['intentions', 'history', days],
    staleTime: 60_000,
    queryFn: async () => {
      const rows = await callRpc<{ p_days: number }, IntentionsHistoryDay[] | null>(
        'intentions_history',
        { p_days: days },
      );
      return rows ?? [];
    },
  });
}
