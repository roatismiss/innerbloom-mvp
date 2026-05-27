import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
      const optimistic: EmotionalState = {
        category: input.category,
        intensity: input.intensity,
        anchorWord: input.anchor_word,
        colorHex: input.color_hex,
      };
      setTodayMood(optimistic);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['today-for-me'] });
      qc.invalidateQueries({ queryKey: ['mood-history'] });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['reels'] });
    },
  });
}
