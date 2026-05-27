import { useQuery } from '@tanstack/react-query';

import type { BloomReelRow, ReelCategory } from '../../types/database';
import { sb } from './client';
import { useTodayForMe } from './mood';

// Today's mood-driven reel set comes free with today_for_me() — no extra
// round trip. This hook is just a thin selector over that.
export function useTodayReels(): BloomReelRow[] {
  const { data } = useTodayForMe();
  return data?.reels ?? [];
}

// Standalone reels query when you want a specific category (e.g. tapping a
// pill on the reels tab). Otherwise prefer useTodayReels().
export function useReelsByCategory(category: ReelCategory | null, limit = 10) {
  return useQuery({
    queryKey: ['reels', 'category', category, limit],
    enabled: !!category,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await sb()
        .from('bloom_reels')
        .select('*')
        .eq('is_published', true)
        .eq('category', category!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
