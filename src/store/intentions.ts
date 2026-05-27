import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Daily intentions feature:
//   • Morning  → user writes a primary intention + ticks the To-Be List items.
//   • Evening  → user toggles "I honored my intention today" (yes / no / null).
//   • Tomorrow → everything resets and the To-Be List is reseeded from DEFAULT_TASKS.
//
// The dashboard "Today's Focus" card reads `primary` and shows it as the title
// when the user has set one, so the intention is the first thing they see.

const DEFAULT_TASKS = [
  '5-minute morning stretch',
  'No phone during lunch',
  'Practice gratitude',
] as const;

export type IntentionTask = {
  id: string;
  label: string;
  done: boolean;
};

export type DailyIntentions = {
  // ISO date key in local time, e.g. "2026-05-26". Used to detect a day rollover.
  date: string;
  primary: string;
  tasks: IntentionTask[];
  honored: boolean | null;
};

type IntentionsState = {
  today: DailyIntentions;
  ensureFresh: () => void;
  setPrimary: (text: string) => void;
  toggleTask: (id: string) => void;
  addTask: (label: string) => void;
  removeTask: (id: string) => void;
  setHonored: (value: boolean | null) => void;
  // Replaces the in-memory `today` with a server-authoritative snapshot.
  // The screen calls this after `useTodayIntention` resolves with a row, so
  // the user always sees what the server has for today (handles fresh installs
  // on a second device, recovering after cache wipe, etc.).
  hydrateFromServer: (row: {
    primary_text: string;
    tasks: IntentionTask[];
    honored: boolean | null;
  }) => void;
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function freshDay(): DailyIntentions {
  return {
    date: todayKey(),
    primary: '',
    tasks: DEFAULT_TASKS.map((label, i) => ({
      id: `seed-${i}-${Date.now()}`,
      label,
      done: false,
    })),
    honored: null,
  };
}

export const useIntentionsStore = create<IntentionsState>()(
  persist(
    (set, get) => ({
      today: freshDay(),
      ensureFresh: () => {
        const current = get().today;
        if (current.date !== todayKey()) {
          set({ today: freshDay() });
        }
      },
      setPrimary: (text) =>
        set((s) => ({ today: { ...s.today, primary: text.trim() } })),
      toggleTask: (id) =>
        set((s) => ({
          today: {
            ...s.today,
            tasks: s.today.tasks.map((t) =>
              t.id === id ? { ...t, done: !t.done } : t,
            ),
          },
        })),
      addTask: (label) =>
        set((s) => ({
          today: {
            ...s.today,
            tasks: [
              ...s.today.tasks,
              { id: `user-${Date.now()}`, label: label.trim(), done: false },
            ],
          },
        })),
      removeTask: (id) =>
        set((s) => ({
          today: { ...s.today, tasks: s.today.tasks.filter((t) => t.id !== id) },
        })),
      setHonored: (value) =>
        set((s) => ({ today: { ...s.today, honored: value } })),
      hydrateFromServer: (row) =>
        set(() => ({
          today: {
            date: todayKey(),
            primary: row.primary_text,
            // If the server has no tasks yet (very first hydration with empty
            // upsert), keep the seeded defaults so the To-Be List isn't empty.
            tasks: row.tasks.length > 0 ? row.tasks : freshDay().tasks,
            honored: row.honored,
          },
        })),
    }),
    {
      name: 'innerbloom.intentions.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // After hydration, check whether the saved day is stale and reset if so.
      onRehydrateStorage: () => (state) => {
        if (state && state.today.date !== todayKey()) {
          state.today = freshDay();
        }
      },
    },
  ),
);
