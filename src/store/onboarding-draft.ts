import { create } from 'zustand';

import type {
  CheckinFrequency,
  EmotionCategory,
} from '../types/database';

// Accumulates onboarding answers across the 3-step flow (mood, goals,
// frequency). The `blooming` screen reads the full draft and submits it
// via complete_onboarding RPC, then clears.
//
// Kept in-memory only — no persistence. If the user backgrounds the app
// mid-flow we'd rather re-ask than risk stale partial state.

type OnboardingDraft = {
  mood: EmotionCategory | null;
  goals: string[];
  frequency: CheckinFrequency | null;
  setMood: (mood: EmotionCategory) => void;
  setGoals: (goals: string[]) => void;
  setFrequency: (frequency: CheckinFrequency) => void;
  reset: () => void;
};

const initial = {
  mood: null,
  goals: [] as string[],
  frequency: null,
};

export const useOnboardingDraft = create<OnboardingDraft>((set) => ({
  ...initial,
  setMood: (mood) => set({ mood }),
  setGoals: (goals) => set({ goals }),
  setFrequency: (frequency) => set({ frequency }),
  reset: () => set(initial),
}));
