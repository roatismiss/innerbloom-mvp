import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type {
  EmotionCategory,
  LookingFor,
  SoulMatchRow,
} from '../../types/database';
import { sb } from './client';

export type SoulMatchQuizInput = {
  current_feeling: EmotionCategory;
  looking_for: LookingFor;
  energy_level: number;
  openness_level: number;
  prompt_answer: string;
};

export type FindMatchResult =
  | {
      status: 'matched';
      match_id: string;
      conversation_id: string;
      other_alias: string;
      shared_category: EmotionCategory;
      resonance_score: number;
    }
  | { status: 'waiting'; reason?: string; best_score?: number };

// Upsert today's soul-match quiz (one row per user per day).
export function useSubmitSoulMatchQuiz() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SoulMatchQuizInput) => {
      const {
        data: { user },
      } = await sb().auth.getUser();
      if (!user) throw new Error('unauthenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb().from('soul_match_quiz_responses') as any)
        .upsert(
          { user_id: user.id, ...input },
          { onConflict: 'user_id,quiz_date' },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['soul-match-today'] });
    },
  });
}

// Invokes the Edge Function. Resolves to either a match or 'waiting'.
export function useFindSoulMatch() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await sb().functions.invoke<FindMatchResult>(
        'find-soul-match',
        { method: 'POST', body: {} },
      );
      if (error) throw error;
      if (!data) throw new Error('empty response');
      return data;
    },
  });
}

// While in 'waiting' state, subscribe to Realtime inserts on soul_matches
// where user_b_id = me. Resolves with the matched row when someone else
// initiates a match with us.
export function useWaitForSoulMatch(enabled: boolean) {
  const [match, setMatch] = useState<SoulMatchRow | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let userId: string | null = null;

    const setup = async () => {
      const {
        data: { user },
      } = await sb().auth.getUser();
      if (!user || cancelled) return;
      userId = user.id;

      const channel = sb()
        .channel(`soul-match-watch:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'soul_matches',
            filter: `user_b_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as SoulMatchRow;
            if (row.status === 'connected') setMatch(row);
          },
        )
        .subscribe();

      return () => {
        sb().removeChannel(channel);
      };
    };

    const cleanupPromise = setup();
    return () => {
      cancelled = true;
      void cleanupPromise.then((fn) => fn?.());
      void userId;
    };
  }, [enabled]);

  return match;
}

// Fetch today's accepted match (if any).
export function useTodaySoulMatch() {
  return useQuery({
    queryKey: ['soul-match-today'],
    queryFn: async () => {
      const {
        data: { user },
      } = await sb().auth.getUser();
      if (!user) return null;

      const { data, error } = await sb()
        .from('soul_matches')
        .select('*')
        .eq('match_date', new Date().toISOString().slice(0, 10))
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .eq('status', 'connected')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
