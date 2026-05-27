import type { AudioSource } from 'expo-audio';

import type { ReelAudioKey } from '../../types/database';

// ─── Registry ────────────────────────────────────────────────────────────────
//
// Maps each DB `audio_key` to a bundled mp3 + a UI label. Sources have to be
// static `require()` calls (Metro resolves them at bundle time, not runtime),
// which is why this file is hand-maintained rather than data-driven.
//
// Filenames in assets/audio/ are kept lowercase-no-underscore to match what
// landed on disk — the registry key is the source of truth for the DB, the
// path is just the file location.

export interface ReelAudioTrack {
  label: string;
  source: AudioSource | null;
}

export const REEL_AUDIO_TRACKS: Record<ReelAudioKey, ReelAudioTrack> = {
  ambient: {
    label: 'Ambient Pad',
    source: require('../../../assets/audio/ambient.mp3'),
  },
  rainforest: {
    label: 'Rainforest Rain',
    source: require('../../../assets/audio/rainforest.mp3'),
  },
  fireplace: {
    label: 'Crackling Fireplace',
    source: require('../../../assets/audio/fireplace.mp3'),
  },
  relaxing_guitar: {
    label: 'Relaxing Guitar',
    source: require('../../../assets/audio/relaxinguitar.mp3'),
  },
  relaxing_water: {
    label: 'Relaxing Water',
    source: require('../../../assets/audio/relaxingwater.mp3'),
  },
  asmr_anxiety: {
    label: 'ASMR for Anxiety',
    source: require('../../../assets/audio/asmranxiety.mp3'),
  },
};

// Per-track volume so loud tracks can be tamed without re-mastering the
// asset. 0..1, applied on top of the global mute state. Tweak after hearing
// each loop on a real device — the values below are an educated first pass.
//
//   - guitar tracks have transients → keep lower so they don't pop under text
//   - ASMR is *meant* to be intimate → stays quiet
//   - ambient pad has no rhythm → can sit a little higher
export const REEL_AUDIO_VOLUME: Record<ReelAudioKey, number> = {
  ambient:         0.7,
  rainforest:      0.6,
  fireplace:       0.55,
  relaxing_guitar: 0.5,
  relaxing_water:  0.6,
  asmr_anxiety:    0.5,
};

export function getReelAudio(key: ReelAudioKey | null | undefined): ReelAudioTrack | null {
  if (!key) return null;
  return REEL_AUDIO_TRACKS[key] ?? null;
}

// True once at least one track in the registry has a real source. Used by
// the reels top bar to hide the mute toggle entirely until audio is wired
// up — a dead button is worse than no button.
export const HAS_REEL_AUDIO: boolean =
  Object.values(REEL_AUDIO_TRACKS).some((t) => t.source != null);
