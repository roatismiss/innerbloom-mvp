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
  // Flips to true once AsyncStorage has been read. Screens use this to avoid
  // showing the mood picker as "interactive" during the hydration window —
  // otherwise a relogged-in user briefly sees an unlocked picker before the
  // persisted value is restored, and may tap a mood that's already set.
  hasHydrated: boolean;
  setTodayMood: (mood: EmotionalState) => void;
  // Clears todayMood if lastCheckinDate is no longer today (called on mount).
  ensureFresh: () => void;
  // Hard-clear on sign out. Prevents cross-user leakage on shared devices —
  // without this, the next user logged into this device would see the
  // previous user's mood as locked-in for today.
  reset: () => void;
};

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      todayMood: null,
      lastCheckinDate: null,
      hasHydrated: false,
      setTodayMood: (mood) =>
        set({ todayMood: mood, lastCheckinDate: todayKey() }),
      ensureFresh: () => {
        const { lastCheckinDate } = get();
        if (lastCheckinDate !== null && lastCheckinDate !== todayKey()) {
          set({ todayMood: null, lastCheckinDate: null });
        }
      },
      reset: () => set({ todayMood: null, lastCheckinDate: null }),
    }),
    {
      name: 'innerbloom.mood.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the actual mood + date — hasHydrated is a runtime flag
      // and must always start as `false` on each app launch.
      partialize: (state) => ({
        todayMood: state.todayMood,
        lastCheckinDate: state.lastCheckinDate,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.lastCheckinDate && state.lastCheckinDate !== todayKey()) {
            state.todayMood = null;
            state.lastCheckinDate = null;
          }
          state.hasHydrated = true;
        }
      },
    },
  ),
);
