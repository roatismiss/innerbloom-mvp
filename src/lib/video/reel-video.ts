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
  // ── Original Bloom Voices (voiceover) ─────────────────────────────────────
  'depression-isnt-laziness': {
    source: require('../../../assets/video/depression-isnt-laziness.mp4'),
    label: 'Bloom Voices · Liezel',
    hasVoiceover: true,
  },
  'addiction': {
    source: require('../../../assets/video/addiction.mp4'),
    label: 'Bloom Voices · Liezel',
    hasVoiceover: true,
  },
  'art-of-saying-no': {
    source: require('../../../assets/video/art-of-saying-no.mp4'),
    label: 'Bloom Voices · Calvin',
    hasVoiceover: true,
  },

  // ── InnerBloom Remotion — Short quotes (15s) ──────────────────────────────
  'Reel01-Bloom':    { source: require('../../../assets/video/Reel01-Bloom.mp4'),    label: 'InnerBloom', hasVoiceover: false },
  'Reel02-Contrast': { source: require('../../../assets/video/Reel02-Contrast.mp4'), label: 'InnerBloom', hasVoiceover: false },
  'Reel03-Heartbeat':{ source: require('../../../assets/video/Reel03-Heartbeat.mp4'),label: 'InnerBloom', hasVoiceover: false },
  'Reel04-WordSize': { source: require('../../../assets/video/Reel04-WordSize.mp4'), label: 'InnerBloom', hasVoiceover: false },
  'Reel05-Seasons':  { source: require('../../../assets/video/Reel05-Seasons.mp4'),  label: 'InnerBloom', hasVoiceover: false },
  'Reel06-Orbit':    { source: require('../../../assets/video/Reel06-Orbit.mp4'),    label: 'InnerBloom', hasVoiceover: false },
  'Reel07-Wave':     { source: require('../../../assets/video/Reel07-Wave.mp4'),     label: 'InnerBloom', hasVoiceover: false },
  'Reel08-Spotlight':{ source: require('../../../assets/video/Reel08-Spotlight.mp4'),label: 'InnerBloom', hasVoiceover: false },
  'Reel09-Slow':     { source: require('../../../assets/video/Reel09-Slow.mp4'),     label: 'InnerBloom', hasVoiceover: false },
  'Reel10-Breath':   { source: require('../../../assets/video/Reel10-Breath.mp4'),   label: 'InnerBloom', hasVoiceover: false },

  // ── InnerBloom Remotion — Adicție (20s) ───────────────────────────────────
  'LF01-Addiction-NotWeak':       { source: require('../../../assets/video/LF01-Addiction-NotWeak.mp4'),       label: 'InnerBloom', hasVoiceover: false },
  'LF02-Addiction-StopCallingIt': { source: require('../../../assets/video/LF02-Addiction-StopCallingIt.mp4'), label: 'InnerBloom', hasVoiceover: false },
  'LF03-Addiction-NotEnemy':      { source: require('../../../assets/video/LF03-Addiction-NotEnemy.mp4'),      label: 'InnerBloom', hasVoiceover: false },
  'LF04-Addiction-First90':       { source: require('../../../assets/video/LF04-Addiction-First90.mp4'),       label: 'InnerBloom', hasVoiceover: false },
  'LF05-Addiction-Grief':         { source: require('../../../assets/video/LF05-Addiction-Grief.mp4'),         label: 'InnerBloom', hasVoiceover: false },

  // ── InnerBloom Remotion — Depresie (20s) ──────────────────────────────────
  'LF06-Depression-NotLazy':    { source: require('../../../assets/video/LF06-Depression-NotLazy.mp4'),    label: 'InnerBloom', hasVoiceover: false },
  'LF07-Depression-NotSadness': { source: require('../../../assets/video/LF07-Depression-NotSadness.mp4'), label: 'InnerBloom', hasVoiceover: false },
  'LF08-Depression-NotGrateful':{ source: require('../../../assets/video/LF08-Depression-NotGrateful.mp4'),label: 'InnerBloom', hasVoiceover: false },
  'LF09-Depression-Shower':     { source: require('../../../assets/video/LF09-Depression-Shower.mp4'),     label: 'InnerBloom', hasVoiceover: false },
  'LF10-Depression-LovedTired': { source: require('../../../assets/video/LF10-Depression-LovedTired.mp4'), label: 'InnerBloom', hasVoiceover: false },

  // ── InnerBloom Remotion — Stres (20s) ─────────────────────────────────────
  'LF11-Stress-Burnout':          { source: require('../../../assets/video/LF11-Stress-Burnout.mp4'),          label: 'InnerBloom', hasVoiceover: false },
  'LF12-Stress-Timeline':         { source: require('../../../assets/video/LF12-Stress-Timeline.mp4'),         label: 'InnerBloom', hasVoiceover: false },
  'LF13-Stress-Trained':          { source: require('../../../assets/video/LF13-Stress-Trained.mp4'),          label: 'InnerBloom', hasVoiceover: false },
  'LF14-Stress-FewerObligations': { source: require('../../../assets/video/LF14-Stress-FewerObligations.mp4'), label: 'InnerBloom', hasVoiceover: false },
  'LF15-Stress-NotSafe':          { source: require('../../../assets/video/LF15-Stress-NotSafe.mp4'),          label: 'InnerBloom', hasVoiceover: false },

  // ── InnerBloom Remotion — A spune nu (20s) ────────────────────────────────
  'LF16-Boundaries-FeelViolent':    { source: require('../../../assets/video/LF16-Boundaries-FeelViolent.mp4'),    label: 'InnerBloom', hasVoiceover: false },
  'LF17-Boundaries-PriceOfSilence': { source: require('../../../assets/video/LF17-Boundaries-PriceOfSilence.mp4'), label: 'InnerBloom', hasVoiceover: false },
  'LF18-Boundaries-LoseSome':       { source: require('../../../assets/video/LF18-Boundaries-LoseSome.mp4'),       label: 'InnerBloom', hasVoiceover: false },
  'LF19-Boundaries-StopExplaining': { source: require('../../../assets/video/LF19-Boundaries-StopExplaining.mp4'), label: 'InnerBloom', hasVoiceover: false },
  'LF20-Boundaries-Guilt':          { source: require('../../../assets/video/LF20-Boundaries-Guilt.mp4'),          label: 'InnerBloom', hasVoiceover: false },

  // ── InnerBloom Remotion — Anxietate (20s) ────────────────────────────────
  'LF21-Anxiety-NotIrrational':  { source: require('../../../assets/video/LF21-Anxiety-NotIrrational.mp4'),  label: 'InnerBloom', hasVoiceover: false },
  'LF22-Anxiety-AroundSomeone':  { source: require('../../../assets/video/LF22-Anxiety-AroundSomeone.mp4'),  label: 'InnerBloom', hasVoiceover: false },
  'LF23-Anxiety-StopCalmDown':   { source: require('../../../assets/video/LF23-Anxiety-StopCalmDown.mp4'),   label: 'InnerBloom', hasVoiceover: false },
  'LF24-Anxiety-LoveCost':       { source: require('../../../assets/video/LF24-Anxiety-LoveCost.mp4'),       label: 'InnerBloom', hasVoiceover: false },
  'LF25-Anxiety-Overthinking':   { source: require('../../../assets/video/LF25-Anxiety-Overthinking.mp4'),   label: 'InnerBloom', hasVoiceover: false },

  // ── InnerBloom Remotion — Motivație (20s) ────────────────────────────────
  'LF26-Motivation-StopWaiting': { source: require('../../../assets/video/LF26-Motivation-StopWaiting.mp4'), label: 'InnerBloom', hasVoiceover: false },
  'LF27-Motivation-Discipline':  { source: require('../../../assets/video/LF27-Motivation-Discipline.mp4'),  label: 'InnerBloom', hasVoiceover: false },
  'LF28-Motivation-NeverReady':  { source: require('../../../assets/video/LF28-Motivation-NeverReady.mp4'),  label: 'InnerBloom', hasVoiceover: false },
  'LF29-Motivation-FiveYears':   { source: require('../../../assets/video/LF29-Motivation-FiveYears.mp4'),   label: 'InnerBloom', hasVoiceover: false },
  'LF30-Motivation-Stakes':      { source: require('../../../assets/video/LF30-Motivation-Stakes.mp4'),      label: 'InnerBloom', hasVoiceover: false },
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
