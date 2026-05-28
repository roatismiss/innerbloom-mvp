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

const CDN = 'https://ruccrssggpnawsyitphc.supabase.co/storage/v1/object/public/reels';

export const REEL_VIDEO_TRACKS = {
  // ── Original Bloom Voices (voiceover) — bundled locally ───────────────────
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

  // ── InnerBloom Remotion — Short quotes (15s) — Supabase Storage ───────────
  'Reel01-Bloom':    { source: { uri: `${CDN}/Reel01-Bloom.mp4` },    label: 'InnerBloom', hasVoiceover: true },
  'Reel02-Contrast': { source: { uri: `${CDN}/Reel02-Contrast.mp4` }, label: 'InnerBloom', hasVoiceover: true },
  'Reel03-Heartbeat':{ source: { uri: `${CDN}/Reel03-Heartbeat.mp4` },label: 'InnerBloom', hasVoiceover: true },
  'Reel04-WordSize': { source: { uri: `${CDN}/Reel04-WordSize.mp4` }, label: 'InnerBloom', hasVoiceover: true },
  'Reel05-Seasons':  { source: { uri: `${CDN}/Reel05-Seasons.mp4` },  label: 'InnerBloom', hasVoiceover: true },
  'Reel06-Orbit':    { source: { uri: `${CDN}/Reel06-Orbit.mp4` },    label: 'InnerBloom', hasVoiceover: true },
  'Reel07-Wave':     { source: { uri: `${CDN}/Reel07-Wave.mp4` },     label: 'InnerBloom', hasVoiceover: true },
  'Reel08-Spotlight':{ source: { uri: `${CDN}/Reel08-Spotlight.mp4` },label: 'InnerBloom', hasVoiceover: true },
  'Reel09-Slow':     { source: { uri: `${CDN}/Reel09-Slow.mp4` },     label: 'InnerBloom', hasVoiceover: true },
  'Reel10-Breath':   { source: { uri: `${CDN}/Reel10-Breath.mp4` },   label: 'InnerBloom', hasVoiceover: true },

  // ── InnerBloom Remotion — Adicție (20s) ───────────────────────────────────
  'LF01-Addiction-NotWeak':       { source: { uri: `${CDN}/LF01-Addiction-NotWeak.mp4` },       label: 'InnerBloom', hasVoiceover: true },
  'LF02-Addiction-StopCallingIt': { source: { uri: `${CDN}/LF02-Addiction-StopCallingIt.mp4` }, label: 'InnerBloom', hasVoiceover: true },
  'LF03-Addiction-NotEnemy':      { source: { uri: `${CDN}/LF03-Addiction-NotEnemy.mp4` },      label: 'InnerBloom', hasVoiceover: true },
  'LF04-Addiction-First90':       { source: { uri: `${CDN}/LF04-Addiction-First90.mp4` },       label: 'InnerBloom', hasVoiceover: true },
  'LF05-Addiction-Grief':         { source: { uri: `${CDN}/LF05-Addiction-Grief.mp4` },         label: 'InnerBloom', hasVoiceover: true },

  // ── InnerBloom Remotion — Depresie (20s) ──────────────────────────────────
  'LF06-Depression-NotLazy':    { source: { uri: `${CDN}/LF06-Depression-NotLazy.mp4` },    label: 'InnerBloom', hasVoiceover: true },
  'LF07-Depression-NotSadness': { source: { uri: `${CDN}/LF07-Depression-NotSadness.mp4` }, label: 'InnerBloom', hasVoiceover: true },
  'LF08-Depression-NotGrateful':{ source: { uri: `${CDN}/LF08-Depression-NotGrateful.mp4` },label: 'InnerBloom', hasVoiceover: true },
  'LF09-Depression-Shower':     { source: { uri: `${CDN}/LF09-Depression-Shower.mp4` },     label: 'InnerBloom', hasVoiceover: true },
  'LF10-Depression-LovedTired': { source: { uri: `${CDN}/LF10-Depression-LovedTired.mp4` }, label: 'InnerBloom', hasVoiceover: true },

  // ── InnerBloom Remotion — Stres (20s) ─────────────────────────────────────
  'LF11-Stress-Burnout':          { source: { uri: `${CDN}/LF11-Stress-Burnout.mp4` },          label: 'InnerBloom', hasVoiceover: true },
  'LF12-Stress-Timeline':         { source: { uri: `${CDN}/LF12-Stress-Timeline.mp4` },         label: 'InnerBloom', hasVoiceover: true },
  'LF13-Stress-Trained':          { source: { uri: `${CDN}/LF13-Stress-Trained.mp4` },          label: 'InnerBloom', hasVoiceover: true },
  'LF14-Stress-FewerObligations': { source: { uri: `${CDN}/LF14-Stress-FewerObligations.mp4` }, label: 'InnerBloom', hasVoiceover: true },
  'LF15-Stress-NotSafe':          { source: { uri: `${CDN}/LF15-Stress-NotSafe.mp4` },          label: 'InnerBloom', hasVoiceover: true },

  // ── InnerBloom Remotion — A spune nu (20s) ────────────────────────────────
  'LF16-Boundaries-FeelViolent':    { source: { uri: `${CDN}/LF16-Boundaries-FeelViolent.mp4` },    label: 'InnerBloom', hasVoiceover: true },
  'LF17-Boundaries-PriceOfSilence': { source: { uri: `${CDN}/LF17-Boundaries-PriceOfSilence.mp4` }, label: 'InnerBloom', hasVoiceover: true },
  'LF18-Boundaries-LoseSome':       { source: { uri: `${CDN}/LF18-Boundaries-LoseSome.mp4` },       label: 'InnerBloom', hasVoiceover: true },
  'LF19-Boundaries-StopExplaining': { source: { uri: `${CDN}/LF19-Boundaries-StopExplaining.mp4` }, label: 'InnerBloom', hasVoiceover: true },
  'LF20-Boundaries-Guilt':          { source: { uri: `${CDN}/LF20-Boundaries-Guilt.mp4` },          label: 'InnerBloom', hasVoiceover: true },

  // ── InnerBloom Remotion — Anxietate (20s) ────────────────────────────────
  'LF21-Anxiety-NotIrrational':  { source: { uri: `${CDN}/LF21-Anxiety-NotIrrational.mp4` },  label: 'InnerBloom', hasVoiceover: true },
  'LF22-Anxiety-AroundSomeone':  { source: { uri: `${CDN}/LF22-Anxiety-AroundSomeone.mp4` },  label: 'InnerBloom', hasVoiceover: true },
  'LF23-Anxiety-StopCalmDown':   { source: { uri: `${CDN}/LF23-Anxiety-StopCalmDown.mp4` },   label: 'InnerBloom', hasVoiceover: true },
  'LF24-Anxiety-LoveCost':       { source: { uri: `${CDN}/LF24-Anxiety-LoveCost.mp4` },       label: 'InnerBloom', hasVoiceover: true },
  'LF25-Anxiety-Overthinking':   { source: { uri: `${CDN}/LF25-Anxiety-Overthinking.mp4` },   label: 'InnerBloom', hasVoiceover: true },

  // ── InnerBloom Remotion — Motivație (20s) ────────────────────────────────
  'LF26-Motivation-StopWaiting': { source: { uri: `${CDN}/LF26-Motivation-StopWaiting.mp4` }, label: 'InnerBloom', hasVoiceover: true },
  'LF27-Motivation-Discipline':  { source: { uri: `${CDN}/LF27-Motivation-Discipline.mp4` },  label: 'InnerBloom', hasVoiceover: true },
  'LF28-Motivation-NeverReady':  { source: { uri: `${CDN}/LF28-Motivation-NeverReady.mp4` },  label: 'InnerBloom', hasVoiceover: true },
  'LF29-Motivation-FiveYears':   { source: { uri: `${CDN}/LF29-Motivation-FiveYears.mp4` },   label: 'InnerBloom', hasVoiceover: true },
  'LF30-Motivation-Stakes':      { source: { uri: `${CDN}/LF30-Motivation-Stakes.mp4` },      label: 'InnerBloom', hasVoiceover: true },
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
