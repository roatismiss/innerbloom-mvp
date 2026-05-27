import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Cross-session audio preferences. Today it's just the reels mute flag, but
// kept as a generic store so we can drop in (e.g.) breathing-track or
// background-music toggles without a second store.
//
// Default unmuted: the whole point of ambient under a calm-mind reel is that
// the user feels it. Anyone who wants silence flips the speaker once and we
// remember it forever.

type AudioPrefsState = {
  reelsMuted: boolean;
  toggleReelsMuted: () => void;
  setReelsMuted: (muted: boolean) => void;
};

export const useAudioPrefs = create<AudioPrefsState>()(
  persist(
    (set) => ({
      reelsMuted: false,
      toggleReelsMuted: () => set((s) => ({ reelsMuted: !s.reelsMuted })),
      setReelsMuted: (muted) => set({ reelsMuted: muted }),
    }),
    {
      name: 'innerbloom.audio-prefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
