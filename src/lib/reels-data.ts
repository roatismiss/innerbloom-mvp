import type { ReelSchemeKey } from '../components/reels/ReelBackground';
import type { ReelVideoKey } from './video/reel-video';
import type { ReelAudioKey } from '../types/database';

// ─── Shared types (kept here so screens + chat preview can both consume) ─────

export interface ReelTheme {
  bg: string;
  blob1: string;
  blob2: string;
  avatarBg: string;
}

export interface ReelItem {
  id: string;
  quote: string;
  author: string;
  handle: string;
  caption: string;
  music: string;
  // Drives the ambient loop that plays while the reel is on-screen. The
  // `music` field above is the *display label* for the bottom pill (curated
  // copy, can diverge from the actual loop); `audioKey` is the actual sound.
  audioKey: ReelAudioKey | null;
  // When set, renders a full-screen bundled mp4 as the reel background. The
  // video carries its own voiceover so the ambient audio loop is muted for
  // this reel; the centered quote text is also hidden (the avatar speaks it).
  // Other UI (sidebar, caption, daily bloom) keeps rendering on top.
  videoKey?: ReelVideoKey;
  hugs: number;
  dailyBloom?: string;
  bgImage?: string;
  darkBg?: boolean;
  // When set, renders a gradient + SVG art layer background. Overrides
  // `bgImage` and the legacy blob theme. Preferred path for all editorial reels.
  scheme?: ReelSchemeKey;
  theme: ReelTheme;
}

// Editorial library — three Bloom Voices video reels (real human voiceover
// over a dark frame). The named-author quote reels were removed in favour of
// the InnerBloom Remotion library below, which carries the editorial weight
// now and ships as actual videos with motion.
export const REELS: ReelItem[] = [
  {
    id: 'bloom-voices-depression',
    quote: '', // Avatar speaks the message — quote text is hidden for video reels.
    author: 'Bloom Voices · Liezel',
    handle: '@innerbloom_voices',
    caption: 'Depression isn’t laziness — it’s your body in shutdown. The way out starts by telling your body it’s safe. #Depression #Reframe',
    music: 'Bloom Voices · Liezel',
    audioKey: null,
    videoKey: 'depression-isnt-laziness',
    hugs: 12480,
    theme: { bg: '#1f1410', blob1: '#3d2820', blob2: '#5c3d2e', avatarBg: '#5c3d2e' },
  },
  {
    id: 'bloom-voices-addiction',
    quote: '',
    author: 'Bloom Voices · Liezel',
    handle: '@innerbloom_voices',
    caption: 'Addiction isn’t the moral failure. It’s the answer the body gave when no one asked about the pain underneath. #Addiction #Maté',
    music: 'Bloom Voices · Liezel',
    audioKey: null,
    videoKey: 'addiction',
    hugs: 9120,
    theme: { bg: '#1f1410', blob1: '#3d2820', blob2: '#5c3d2e', avatarBg: '#5c3d2e' },
  },
  {
    id: 'bloom-voices-saying-no',
    quote: '',
    author: 'Bloom Voices · Calvin',
    handle: '@innerbloom_voices',
    caption: 'Every yes you give without thinking is a no to something that matters. "No" is a complete sentence. Practice it. #Boundaries #SayNo',
    music: 'Bloom Voices · Calvin',
    audioKey: null,
    videoKey: 'art-of-saying-no',
    hugs: 6850,
    theme: { bg: '#1a1f2e', blob1: '#2d3548', blob2: '#4a556b', avatarBg: '#4a556b' },
  },

  // ── InnerBloom Remotion — Short quotes (15s) ─────────────────────────────
  { id: 'ib-reel01', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You don't have to bloom on schedule. #Growth #SelfCompassion", music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'Reel01-Bloom',    hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#90f2fc', avatarBg: '#e8836b' } },
  { id: 'ib-reel02', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Soft is not the opposite of strong. #Strength #Mindset',                  music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'Reel02-Contrast',  hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#90f2fc', avatarBg: '#e8836b' } },
  { id: 'ib-reel03', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Your nervous system is not a project. #Burnout #Rest',                     music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'Reel03-Heartbeat', hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-reel04', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Feel it the size it actually is. #Emotions #Awareness',                   music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'Reel04-WordSize',  hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#90f2fc', avatarBg: '#e8836b' } },
  { id: 'ib-reel05', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Rest is not a reward. It is a season. #Rest #Burnout',                     music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'Reel05-Seasons',   hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-reel06', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'You can be tender and still have limits. #Boundaries #SelfCare',           music: 'Hearth', audioKey: 'fireplace', videoKey: 'Reel06-Orbit',    hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-reel07', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Healing is not linear. Neither is light. #Healing #Depression',            music: 'Tidal Pad', audioKey: 'ambient', videoKey: 'Reel07-Wave',     hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffe2db', avatarBg: '#55433e' } },
  { id: 'ib-reel08', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Notice what you reach for when no one is watching. #SelfAwareness',        music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'Reel08-Spotlight', hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#90f2fc', avatarBg: '#e8836b' } },
  { id: 'ib-reel09', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Slow is a kind of intelligence. #Mindfulness #Pace',                       music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'Reel09-Slow',     hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-reel10', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "The version of you that's tired still counts. #SelfCompassion",            music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'Reel10-Breath',   hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },

  // ── InnerBloom Remotion — Adicție (20s) ──────────────────────────────────
  { id: 'ib-lf01', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'If you keep going back, you are not weak. #Addiction #Recovery',                                        music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF01-Addiction-NotWeak',       hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-lf02', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Stop calling it self-care when it's pain management. #Addiction #Honesty",                              music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF02-Addiction-StopCallingIt', hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-lf03', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Your addiction is not your enemy — it's a strategy that kept you here. #Recovery",                     music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF03-Addiction-NotEnemy',      hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-lf04', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "The first 90 days are about meeting yourself sober for the first time. #Sobriety",                     music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF04-Addiction-First90',       hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-lf05', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Sobriety feels like grief — and that's the actual work. #Recovery #Grief",                             music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF05-Addiction-Grief',         hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },

  // ── InnerBloom Remotion — Depresie (20s) ─────────────────────────────────
  { id: 'ib-lf06', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You're not lazy. You're carrying something nobody can see. #Depression #MentalHealth",                 music: 'Tidal Pad', audioKey: 'ambient', videoKey: 'LF06-Depression-NotLazy',     hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffe2db', avatarBg: '#55433e' } },
  { id: 'ib-lf07', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Depression is the absence of access to yourself — not sadness. #Depression',                           music: 'Tidal Pad', audioKey: 'ambient', videoKey: 'LF07-Depression-NotSadness',   hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffe2db', avatarBg: '#55433e' } },
  { id: 'ib-lf08', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You don't have to feel grateful to be healing. #Healing #Depression",                                  music: 'Tidal Pad', audioKey: 'ambient', videoKey: 'LF08-Depression-NotGrateful',  hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffe2db', avatarBg: '#55433e' } },
  { id: 'ib-lf09', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Showering when you have no energy is an act of war against what tells you nothing matters. #Depression', music: 'Tidal Pad', audioKey: 'ambient', videoKey: 'LF09-Depression-Shower',      hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffe2db', avatarBg: '#55433e' } },
  { id: 'ib-lf10', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Some people loved you tired. Get better anyway. #Depression #Healing',                                 music: 'Tidal Pad', audioKey: 'ambient', videoKey: 'LF10-Depression-LovedTired',   hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffe2db', avatarBg: '#55433e' } },

  // ── InnerBloom Remotion — Stres (20s) ────────────────────────────────────
  { id: 'ib-lf11', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Burnout isn't from working too hard — it's from working on the wrong things. #Burnout",               music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'LF11-Stress-Burnout',          hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-lf12', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You're not behind. You're on someone else's timeline. Get off it. #Stress #Comparison",               music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'LF12-Stress-Timeline',         hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-lf13', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'If rest feels like guilt, you were trained to earn your right to exist softly. #Rest #Stress',         music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'LF13-Stress-Trained',          hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-lf14', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You don't need a better morning routine. You need fewer obligations. #Stress #Productivity",           music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'LF14-Stress-FewerObligations', hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-lf15', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You can't relax because your body hasn't heard that it's safe to stop. #Burnout #NervousSystem",      music: 'Still Guitar', audioKey: 'relaxing_guitar', videoKey: 'LF15-Stress-NotSafe',          hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },

  // ── InnerBloom Remotion — Boundaries (20s) ───────────────────────────────
  { id: 'ib-lf16', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Saying no will feel violent at first. That's not guilt — it's the unfamiliar feeling of choosing yourself. #Boundaries", music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF16-Boundaries-FeelViolent',    hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-lf17', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'If saying no cost you the relationship, the relationship was the price of your silence. #Boundaries',              music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF17-Boundaries-PriceOfSilence', hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-lf18', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'You will lose people when you start choosing yourself. That is the data, not the tragedy. #Boundaries',            music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF18-Boundaries-LoseSome',       hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-lf19', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Stop explaining yourself to people committed to misunderstanding you. #Boundaries #SelfRespect',                   music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF19-Boundaries-StopExplaining', hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },
  { id: 'ib-lf20', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Guilt is not always a sign you did something wrong. Sometimes it means a rule is breaking. #Boundaries',           music: 'Hearth', audioKey: 'fireplace', videoKey: 'LF20-Boundaries-Guilt',          hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#a8315c' } },

  // ── InnerBloom Remotion — Anxietate (20s) ────────────────────────────────
  { id: 'ib-lf21', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Your anxiety is not irrational — it's answering a question nobody is asking out loud. #Anxiety",               music: 'ASMR Still', audioKey: 'asmr_anxiety', videoKey: 'LF21-Anxiety-NotIrrational',  hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffdad2', avatarBg: '#994531' } },
  { id: 'ib-lf22', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'If you feel anxious around someone, your body knows something your brain is ignoring. Trust it. #Anxiety',       music: 'ASMR Still', audioKey: 'asmr_anxiety', videoKey: 'LF22-Anxiety-AroundSomeone',  hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffdad2', avatarBg: '#994531' } },
  { id: 'ib-lf23', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Stop trying to calm down. Start asking what you're not safe to feel. #Anxiety #NervousSystem",                  music: 'ASMR Still', audioKey: 'asmr_anxiety', videoKey: 'LF23-Anxiety-StopCalmDown',   hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffdad2', avatarBg: '#994531' } },
  { id: 'ib-lf24', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You don't have anxiety. You have a nervous system that learned love came with conditions. #Anxiety #Healing",    music: 'ASMR Still', audioKey: 'asmr_anxiety', videoKey: 'LF24-Anxiety-LoveCost',       hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffdad2', avatarBg: '#994531' } },
  { id: 'ib-lf25', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Overthinking is a survival skill from a time when getting it wrong was dangerous. You're safe now. #Anxiety",   music: 'ASMR Still', audioKey: 'asmr_anxiety', videoKey: 'LF25-Anxiety-Overthinking',   hugs: 0, theme: { bg: '#fff8f6', blob1: '#90f2fc', blob2: '#ffdad2', avatarBg: '#994531' } },

  // ── InnerBloom Remotion — Motivație (20s) ────────────────────────────────
  { id: 'ib-lf26', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "Stop waiting to feel ready. Ready is a decision, not a feeling. #Motivation #StartNow",              music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'LF26-Motivation-StopWaiting', hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-lf27', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'Discipline is self-love in advance. Every no to comfort is a yes to who you are becoming. #Discipline', music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'LF27-Motivation-Discipline',  hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-lf28', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You will never be more ready than now. Start ugly. Refine later. #Motivation #Action",                 music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'LF28-Motivation-NeverReady',  hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-lf29', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: 'The version of you in 5 years is begging you to start today. Not Monday. Today. #Motivation',          music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'LF29-Motivation-FiveYears',   hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
  { id: 'ib-lf30', quote: '', author: 'InnerBloom', handle: '@innerbloom', caption: "You don't lack motivation. You lack stakes. Count what hesitation is costing you. #Motivation",        music: 'Gentle Flow', audioKey: 'relaxing_water', videoKey: 'LF30-Motivation-Stakes',      hugs: 0, theme: { bg: '#fff8f6', blob1: '#ffdad2', blob2: '#ffe2db', avatarBg: '#e8836b' } },
];

export function getReelById(id: string): ReelItem | undefined {
  return REELS.find((r) => r.id === id);
}

export function getReelIndexById(id: string): number {
  return REELS.findIndex((r) => r.id === id);
}
