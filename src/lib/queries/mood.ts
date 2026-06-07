import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { track } from '../analytics';
import { useMoodStore } from '../../store/mood';
import type {
  EmotionalState,
} from '../../types';
import type {
  EmotionCategory,
  MoodHistoryDay,
  SubmitMoodCheckinArgs,
  SubmitMoodCheckinResult,
  TodayForMe,
} from '../../types/database';
import { callRpc } from './client';

// today_for_me() — single round trip that drives the home dashboard,
// today's quote, the reels feed, and the post feed filter.
export function useTodayForMe(enabled = true) {
  return useQuery<TodayForMe>({
    queryKey: ['today-for-me'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: () => callRpc<undefined, TodayForMe>('today_for_me'),
  });
}

// 30-day mood history (gap-filled with null days). Drives dashboard chart.
export function useMoodHistory(days = 30) {
  return useQuery({
    queryKey: ['mood-history', days],
    staleTime: 60_000,
    queryFn: async () => {
      const rows = await callRpc<{ days: number }, MoodHistoryDay[] | null>(
        'mood_history',
        { days },
      );
      return rows ?? [];
    },
  });
}

// submit_mood_checkin — upsert today's mood. Invalidates everything that
// depends on it: today-for-me, mood-history, feed, reels.
export function useSubmitMood() {
  const qc = useQueryClient();
  const setTodayMood = useMoodStore((s) => s.setTodayMood);

  return useMutation({
    mutationFn: (input: {
      category: EmotionCategory;
      intensity: number;
      anchor_word: string;
      color_hex: string;
    }) =>
      callRpc<SubmitMoodCheckinArgs, SubmitMoodCheckinResult>(
        'submit_mood_checkin',
        {
          p_category: input.category,
          p_intensity: input.intensity,
          p_anchor_word: input.anchor_word,
          p_color_hex: input.color_hex,
        },
      ),
    onMutate: async (input) => {
      // Snapshot the current store so we can roll back if the network write
      // fails — otherwise the optimistic value sticks, the picker stays locked
      // (dashboard reads `todayMood !== null` as "already checked in"), and the
      // user's mood is silently lost with no way to retry today.
      const prev = {
        todayMood: useMoodStore.getState().todayMood,
        lastCheckinDate: useMoodStore.getState().lastCheckinDate,
      };
      const optimistic: EmotionalState = {
        category: input.category,
        intensity: input.intensity,
        anchorWord: input.anchor_word,
        colorHex: input.color_hex,
      };
      setTodayMood(optimistic);
      return { prev };
    },
    onError: (_err, _input, context) => {
      // Restore the pre-optimistic state so the picker unlocks and the user can
      // try again. The screen surfaces the mutation's isError separately.
      if (context?.prev) {
        useMoodStore.setState({
          todayMood: context.prev.todayMood,
          lastCheckinDate: context.prev.lastCheckinDate,
        });
      }
    },
    onSuccess: (_data, input) => {
      // Health-adjacent but coarse: category + 1–5 intensity only, never the
      // free-text anchor word. Drives the core "are people checking in?" metric.
      track('mood_logged', {
        category: input.category,
        intensity: input.intensity,
      });
      qc.invalidateQueries({ queryKey: ['today-for-me'] });
      qc.invalidateQueries({ queryKey: ['mood-history'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['reels'] });
    },
  });
}
