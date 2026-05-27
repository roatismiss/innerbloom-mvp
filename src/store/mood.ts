import { create } from 'zustand';
import type { EmotionalState } from '../types';

type MoodState = {
  todayMood: EmotionalState | null;
  lastCheckinDate: string | null;
  setTodayMood: (mood: EmotionalState) => void;
};

export const useMoodStore = create<MoodState>((set) => ({
  todayMood: null,
  lastCheckinDate: null,
  setTodayMood: (mood) =>
    set({ todayMood: mood, lastCheckinDate: new Date().toISOString() }),
}));
