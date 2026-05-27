import type { VideoSource } from 'expo-video';

// ─── Registry ────────────────────────────────────────────────────────────────
//
// Bundled mp4 sources for video reels (AI avatar voiceover, real footage from
// advisors, etc.). Same drop-and-go pattern as reel-audio.ts. Keys are derived
// from this object, so adding an entry below is the only step needed to make
// it referenceable from a reel.
//
// To add a video:
//   1. Drop the mp4 in assets/video/<your-name>.mp4
//   2. Add a new entry below with a stable `key` and the require() path
//   3. Reference the key from a reel's `videoKey` field in reels.tsx
//   4. Restart Metro with --clear so require resolution picks it up
//
// Per-video metadata (label, voice attribution) stays here so the UI can
// pull caption / source info without the reel knowing about file paths.

export interface ReelVideoTrack {
  source: VideoSource;
  // Display label for the bottom pill ("Bloom Voices · Liezel", etc.).
  label: string;
  // True when the video has voiceover baked in. We use this to skip the
  // ambient audio loop (you don't want a piano pad fighting with a voice).
  hasVoiceover: boolean;
}

export const REEL_VIDEO_TRACKS = {
  'depression-isnt-laziness': {
    source: require('../../../assets/video/depression-isnt-laziness.mp4'),
    label: 'Bloom Voices · Liezel',
    hasVoiceover: true,
  },
} satisfies Record<string, ReelVideoTrack>;

export type ReelVideoKey = keyof typeof REEL_VIDEO_TRACKS;

export function getReelVideo(key: ReelVideoKey | null | undefined): ReelVideoTrack | null {
  if (!key) return null;
  return REEL_VIDEO_TRACKS[key] ?? null;
}

// True once at least one video is wired. Today this is false (empty registry);
// once a video lands it flips automatically and the conditional render in
// reels.tsx starts producing video reels.
export const HAS_REEL_VIDEO: boolean =
  Object.values(REEL_VIDEO_TRACKS).length > 0;
