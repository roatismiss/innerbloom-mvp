import { type Emotion } from '@/constants/theme';

// UI-facing copy for each schema mood category. The DB stores `Emotion` enum
// values; this is the only place that converts them to human-facing labels.
// Keep these short, evocative, and singular — they show up on small mood pills.
export const moodLabel: Record<Emotion, string> = {
  anxious: 'Tender',
  sad: 'Heavy',
  stressed: 'Tight',
  neutral: 'Steady',
  happy: 'Bright',
  hopeful: 'Hopeful',
};

// Display order for the home mood pick row. Lighter → heavier reads left to
// right, mirroring the way a person scans their state.
export const moodOrder: readonly Emotion[] = [
  'happy',
  'hopeful',
  'neutral',
  'anxious',
  'sad',
  'stressed',
] as const;

// Greeting copy that adapts to time of day. Avoids "Welcome back!" style.
export function greeting(hour: number = new Date().getHours()): string {
  if (hour < 5) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Quiet night';
}

// Color paired with each mood. Sourced from the InnerBloom palette so the
// stored color_hex matches what the UI shows back later (e.g. in the journal
// timeline). Single point of truth — change here, all surfaces follow.
export const moodColor: Record<Emotion, string> = {
  happy:    '#fa719c', // tertiaryContainer
  hopeful:  '#e8836b', // primaryContainer
  neutral:  '#ffe2db', // surfaceContainerHigh
  anxious:  '#c9a0dc', // soft lavender (not a token, but reads "tender")
  sad:      '#90f2fc', // secondaryContainer
  stressed: '#994531', // primary
};

// Default intensity for surfaces that don't expose a slider (dashboard tap,
// checkin tap). The onboarding wizard sets its own. Center value keeps the
// scoring algorithms neutral until the user explicitly dials in.
export const DEFAULT_MOOD_INTENSITY = 3;
