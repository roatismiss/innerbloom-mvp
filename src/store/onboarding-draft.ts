import { create } from 'zustand';

import type {
  CheckinFrequency,
  EmotionCategory,
  Gender,
} from '../types/database';

// Accumulates onboarding answers across the flow (mood, goals, frequency,
// gender). The `blooming` screen reads the full draft and submits it via
// complete_onboarding RPC, then clears.
//
// Kept in-memory only — no persistence. If the user backgrounds the app
// mid-flow we'd rather re-ask than risk stale partial state.

type OnboardingDraft = {
  mood: EmotionCategory | null;
  goals: string[];
  frequency: CheckinFrequency | null;
  gender: Gender | null;
  setMood: (mood: EmotionCategory) => void;
  setGoals: (goals: string[]) => void;
  setFrequency: (frequency: CheckinFrequency) => void;
  setGender: (gender: Gender | null) => void;
  reset: () => void;
};

const initial = {
  mood: null,
  goals: [] as string[],
  frequency: null,
  gender: null,
};

export const useOnboardingDraft = create<OnboardingDraft>((set) => ({
  ...initial,
  setMood: (mood) => set({ mood }),
  setGoals: (goals) => set({ goals }),
  setFrequency: (frequency) => set({ frequency }),
  setGender: (gender) => set({ gender }),
  reset: () => set(initial),
}));
