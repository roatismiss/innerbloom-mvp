import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { EmotionalState } from '../types';

// Local-time date key, so the lock rolls over at the user's midnight (not UTC).
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type MoodState = {
  todayMood: EmotionalState | null;
  lastCheckinDate: string | null;
  setTodayMood: (mood: EmotionalState) => void;
  // Clears todayMood if lastCheckinDate is no longer today (called on mount).
  ensureFresh: () => void;
};

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      todayMood: null,
      lastCheckinDate: null,
      setTodayMood: (mood) =>
        set({ todayMood: mood, lastCheckinDate: todayKey() }),
      ensureFresh: () => {
        const { lastCheckinDate } = get();
        if (lastCheckinDate !== null && lastCheckinDate !== todayKey()) {
          set({ todayMood: null, lastCheckinDate: null });
        }
      },
    }),
    {
      name: 'innerbloom.mood.v1',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.lastCheckinDate && state.lastCheckinDate !== todayKey()) {
          state.todayMood = null;
          state.lastCheckinDate = null;
        }
      },
    },
  ),
);
