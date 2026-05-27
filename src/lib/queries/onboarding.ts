import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../store/auth';
import type {
  CheckinFrequency,
  CompleteOnboardingArgs,
  CompleteOnboardingResult,
  EmotionCategory,
} from '../../types/database';
import { callRpc, sb } from './client';

export type OnboardingPayload = {
  baseline_mood: EmotionCategory;
  baseline_intensity?: number;
  baseline_color_hex?: string;
  baseline_anchor_word?: string;
  growth_goals?: string[];
  checkin_frequency: CheckinFrequency;
  blooming_focus?: string[];
  notification_opt_in?: boolean;
};

// Read whether the current session user has completed onboarding.
// Hydrates useAuthStore.isOnboarded on success.
export function useOnboardingStatus(userId: string | null | undefined) {
  const setOnboarded = useAuthStore((s) => s.setOnboarded);

  return useQuery({
    queryKey: ['onboarding-status', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (sb().from('profiles') as any)
        .select('onboarding_completed_at')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      const row = data as
        | { onboarding_completed_at: string | null }
        | null;
      setOnboarded(!!row?.onboarding_completed_at);
      return row;
    },
  });
}

// Submit the full onboarding payload in one round trip.
export function useCompleteOnboarding() {
  const qc = useQueryClient();
  const setOnboarded = useAuthStore((s) => s.setOnboarded);

  return useMutation({
    mutationFn: (payload: OnboardingPayload) =>
      callRpc<CompleteOnboardingArgs, CompleteOnboardingResult>(
        'complete_onboarding',
        { payload },
      ),
    onSuccess: () => {
      setOnboarded(true);
      qc.invalidateQueries({ queryKey: ['onboarding-status'] });
      qc.invalidateQueries({ queryKey: ['today-for-me'] });
    },
  });
}
