import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image as RNImage,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReelBackground, type ReelSchemeKey, isSchemeDark } from '../../components/reels/ReelBackground';
import { ShareReelSheet, type SharedReelPayload } from '../../components/reels/ShareReelSheet';
import { layout } from '../../constants/theme';
import {
  HAS_REEL_AUDIO,
  REEL_AUDIO_VOLUME,
  getReelAudio,
  type ReelAudioTrack,
} from '../../lib/audio/reel-audio';
import { getReelVideo, type ReelVideoKey } from '../../lib/video/reel-video';
import { useAudioPrefs } from '../../store/audio-prefs';
import type { ReelAudioKey } from '../../types/database';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary:              '#994531',
  primaryContainer:     '#e8836b',
  onPrimaryContainer:   '#641e0e',
  surfaceContainerHigh: '#ffe2db',
  onSurface:            '#281814',
  onSurfaceVariant:     '#55443e',
  outline:              '#88726d',
  surfaceContainerLow:  '#fff1ed',
} as const;

// ─── Data ────────────────────────────────────────────────────────────────────

interface ReelTheme {
  bg: string;
  blob1: string;
  blob2: string;
  avatarBg: string;
}

interface ReelItem {
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

// Editorial library — 10 curated quotes, real authors, paired with a unique
// gradient + SVG art scheme. Order is an emotional arc: opens on resilience,
// moves through depression / anxiety / loneliness / addiction / burnout,
// closes on growth.
const REELS: ReelItem[] = [
  {
    id: 'bloom-voices-depression',
    quote: '', // Avatar speaks the message — quote text is hidden for video reels.
    author: 'Bloom Voices · Liezel',
    handle: '@innerbloom_voices',
    caption: 'Depression isn’t laziness — it’s your body in shutdown. The way out starts by telling your body it’s safe. #Depression #Reframe',
    music: 'Bloom Voices · Liezel',
    audioKey: null, // video has voiceover; no ambient under it
    videoKey: 'depression-isnt-laziness',
    hugs: 12480,
    theme: { bg: '#1f1410', blob1: '#3d2820', blob2: '#5c3d2e', avatarBg: '#5c3d2e' },
  },
  {
    id: 'horne-load',
    quote: '“It’s not the load that breaks you down, it’s the way you carry it.”',
    author: 'Lena Horne',
    handle: '@innerbloom_voices',
    caption: 'A reminder for heavy days. The weight is real — but so is your way of holding it. #Resilience #Stress',
    music: 'Tidewater & Strings',
    audioKey: 'relaxing_water',
    hugs: 5219,
    dailyBloom: 'Pause and notice where you are holding tension right now. Soften that one place — just for a breath.',
    scheme: 'ripples-aqua',
    theme: { bg: '#dceef5', blob1: '#a8d5e2', blob2: '#b5d5e0', avatarBg: '#6b9ec2' },
  },
  {
    id: 'solomon-noonday',
    quote: '“If you are chronically down, it is a lifelong fight to keep from sinking.”',
    author: 'Andrew Solomon, The Noonday Demon',
    handle: '@innerbloom_voices',
    caption: 'For anyone in the long fight. You are not lazy. You are not broken. You are tired in a way that needs witnessing. #Depression #Honesty',
    music: 'Cello in Slow Tide',
    audioKey: 'ambient',
    hugs: 8742,
    dailyBloom: 'If today feels heavy, do not negotiate with the heaviness. Just put one foot down, then the next.',
    scheme: 'ripples-graphite',
    theme: { bg: '#2a1d1a', blob1: '#5c4742', blob2: '#7a5e58', avatarBg: '#7a5e58' },
  },
  {
    id: 'wurtzel-prozac',
    quote: '“A human being can survive almost anything, as long as she sees the end in sight. But depression compounds daily — it is impossible to ever see the end.”',
    author: 'Elizabeth Wurtzel, Prozac Nation',
    handle: '@innerbloom_voices',
    caption: 'Naming it is not the cure. But it is the first place where company becomes possible. #Depression #Wurtzel',
    music: 'Rain on Window',
    audioKey: 'rainforest',
    hugs: 6128,
    dailyBloom: 'You don’t have to see the end. You only have to see the next ten minutes.',
    scheme: 'rain-indigo',
    theme: { bg: '#1a1a3e', blob1: '#3d2a6b', blob2: '#5c4778', avatarBg: '#5c4778' },
  },
  {
    id: 'nin-anxiety',
    quote: '“Anxiety is love’s greatest killer. It makes others feel as you might when a drowning man holds on to you.”',
    author: 'Anaïs Nin',
    handle: '@innerbloom_voices',
    caption: 'Anxiety doesn’t just hurt you — it changes how love can reach you. Naming that pattern is the start of softening it. #Anxiety #Nin',
    music: 'Breath & Cello',
    audioKey: 'asmr_anxiety',
    hugs: 4307,
    scheme: 'waves-coral',
    theme: { bg: '#ffd5c5', blob1: '#ffb3a0', blob2: '#ff8c75', avatarBg: '#c46e5a' },
  },
  {
    id: 'tolle-worry',
    quote: '“Worry pretends to be necessary but serves no useful purpose.”',
    author: 'Eckhart Tolle',
    handle: '@innerbloom_voices',
    caption: 'A short sentence to interrupt the spiral. Not advice — a pattern interrupt. #Anxiety #Mindfulness',
    music: 'Soft Bells',
    audioKey: 'ambient',
    hugs: 3621,
    dailyBloom: 'Name one worry you are carrying that has no action attached. Set it down for the next breath.',
    scheme: 'enso-mint',
    theme: { bg: '#eef6ee', blob1: '#a8cbb8', blob2: '#d4ebe0', avatarBg: '#7a9e88' },
  },
  {
    id: 'williams-alone',
    quote: '“The worst thing in life is not ending up alone. It’s ending up with people who make you feel alone.”',
    author: 'Robin Williams',
    handle: '@innerbloom_voices',
    caption: 'For anyone counting the people in the room and still feeling missing. You are allowed to want more than presence. #Loneliness #Williams',
    music: 'Distant Piano',
    audioKey: 'ambient',
    hugs: 9482,
    scheme: 'mountain-dusk',
    theme: { bg: '#1e2540', blob1: '#3a3260', blob2: '#5c4778', avatarBg: '#4a3f6b' },
  },
  {
    id: 'bloom-voices-addiction',
    quote: '', // Avatar speaks the message — quote text is hidden for video reels.
    author: 'Bloom Voices · Liezel',
    handle: '@innerbloom_voices',
    caption: 'Addiction isn’t the moral failure. It’s the answer the body gave when no one asked about the pain underneath. #Addiction #Maté',
    music: 'Bloom Voices · Liezel',
    audioKey: null, // video has voiceover; no ambient under it
    videoKey: 'addiction',
    hugs: 9120,
    theme: { bg: '#1f1410', blob1: '#3d2820', blob2: '#5c3d2e', avatarBg: '#5c3d2e' },
  },
  {
    id: 'hari-connection',
    quote: '“The opposite of addiction is not sobriety. The opposite of addiction is connection.”',
    author: 'Johann Hari, Chasing the Scream',
    handle: '@innerbloom_voices',
    caption: 'Sobriety is a milestone. Connection is the soil. One reaches you. The other holds you. #Addiction #Hari',
    music: 'Hearth & Warm Strings',
    audioKey: 'fireplace',
    hugs: 7240,
    dailyBloom: 'Reach toward one person today — not to be helped, just to be a little less alone in the room.',
    scheme: 'network-amber',
    theme: { bg: '#fff1d4', blob1: '#ffd99b', blob2: '#e8a861', avatarBg: '#c48845' },
  },
  {
    id: 'gungor-burnout',
    quote: '“Burnout is what happens when you try to avoid being human for too long.”',
    author: 'Michael Gungor',
    handle: '@innerbloom_voices',
    caption: 'Not a weakness. A signal. The body asking for the things you postponed. #Burnout #Recovery',
    music: 'Pale Synth at Dusk',
    audioKey: 'ambient',
    hugs: 5816,
    dailyBloom: 'Pick one human thing you’ve been postponing — a meal, a call, a walk — and do it before noon.',
    scheme: 'sun-rose',
    theme: { bg: '#3d1f2e', blob1: '#7a3a4f', blob2: '#c46e7a', avatarBg: '#a85770' },
  },
  {
    id: 'bloom-voices-saying-no',
    quote: '', // Avatar speaks the message — quote text is hidden for video reels.
    author: 'Bloom Voices · Calvin',
    handle: '@innerbloom_voices',
    caption: 'Every yes you give without thinking is a no to something that matters. "No" is a complete sentence. Practice it. #Boundaries #SayNo',
    music: 'Bloom Voices · Calvin',
    audioKey: null, // video has voiceover; no ambient under it
    videoKey: 'art-of-saying-no',
    hugs: 6850,
    theme: { bg: '#1a1f2e', blob1: '#2d3548', blob2: '#4a556b', avatarBg: '#4a556b' },
  },
  {
    id: 'drucker-productive',
    quote: '“Nothing is less productive than to make more efficient what should not be done at all.”',
    author: 'Peter Drucker',
    handle: '@innerbloom_voices',
    caption: 'Motivation isn’t about going faster. It’s about going at the right thing. Audit before you accelerate. #Motivation #Work',
    music: 'Quiet Workshop',
    audioKey: 'fireplace',
    hugs: 2987,
    scheme: 'grid-clay',
    theme: { bg: '#f5d4b8', blob1: '#cf8f6a', blob2: '#8a4a30', avatarBg: '#a8623c' },
  },
  {
    id: 'salk-work',
    quote: '“The reward for work well done is the opportunity to do more.”',
    author: 'Jonas Salk',
    handle: '@innerbloom_voices',
    caption: 'Mastery isn’t a finish line. It’s a permission slip — to be trusted with the next, harder thing. #Work #Growth',
    music: 'Garden at Dawn',
    audioKey: 'rainforest',
    hugs: 4012,
    dailyBloom: 'Look at one thing you finished this week. Let it count — for thirty seconds — before you ask what’s next.',
    scheme: 'sprout-sage',
    theme: { bg: '#eef0d4', blob1: '#c5d6a3', blob2: '#7d9e58', avatarBg: '#7d9e58' },
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

// ─── Screen ──────────────────────────────────────────────────────────────────

// Viewability config + handler need to be stable refs — FlatList throws if
// `onViewableItemsChanged` changes between renders.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 80 };

export default function ReelsScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Full-window reel cards: the floating tab bar (configured per-screen in
  // (main)/_layout.tsx) sits on top of the video instead of stealing height,
  // so reels run edge-to-edge like TikTok / Instagram Reels.
  const reelH = height;
  const [shareTarget, setShareTarget] = useState<SharedReelPayload | null>(null);

  // Visible reel index — drives which card's audio is playing. Init to 0
  // because the first card is on screen before any scroll event fires.
  const [visibleIndex, setVisibleIndex] = useState(0);

  // Pause everything when the user switches to another tab. The FlatList
  // stays mounted in the background, so without this guard the audio would
  // keep playing under the Dashboard / AI screens.
  const isFocused = useIsFocused();

  const reelsMuted = useAudioPrefs((s) => s.reelsMuted);
  const toggleMuted = useAudioPrefs((s) => s.toggleReelsMuted);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === 'number') {
        setVisibleIndex(first.index);
      }
    },
  ).current;

  const handleMutePress = useCallback(() => {
    Haptics.selectionAsync();
    toggleMuted();
  }, [toggleMuted]);

  return (
    <View style={s.root}>
      {/* Full-screen snap feed */}
      <FlatList
        data={REELS}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <ReelCard
            reel={item}
            width={width}
            height={reelH}
            isPlaying={index === visibleIndex && isFocused}
            muted={reelsMuted}
            onShare={() =>
              setShareTarget({
                id: item.id,
                quote: item.quote,
                author: item.author,
                dailyBloom: item.dailyBloom,
              })
            }
          />
        )}
        pagingEnabled
        snapToInterval={reelH}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: reelH,
          offset: reelH * index,
          index,
        })}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={onViewableItemsChanged}
      />

      {/* Floating top bar — absolute, sits above all reels */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { top: insets.top }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={s.topBarBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="menu" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.topBarWordmark}>InnerBloom</Text>
        <View style={s.topBarRight}>
          {HAS_REEL_AUDIO && (
            <TouchableOpacity
              style={s.topBarBtn}
              activeOpacity={0.7}
              onPress={handleMutePress}
              accessibilityRole="button"
              accessibilityLabel={reelsMuted ? 'Unmute reels' : 'Mute reels'}
            >
              <MaterialCommunityIcons
                name={reelsMuted ? 'volume-off' : 'volume-high'}
                size={24}
                color={C.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.topBarBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ShareReelSheet
        reel={shareTarget}
        visible={!!shareTarget}
        onClose={() => setShareTarget(null)}
      />
    </View>
  );
}

// ─── Reel card ────────────────────────────────────────────────────────────────

function ReelCard({
  reel,
  width,
  height,
  isPlaying,
  muted,
  onShare,
}: {
  reel: ReelItem;
  width: number;
  height: number;
  isPlaying: boolean;
  muted: boolean;
  onShare: () => void;
}) {
  const [hugged, setHugged] = useState(false);
  const [hugCount, setHugCount] = useState(reel.hugs);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);
  const audioTrack = getReelAudio(reel.audioKey);
  const videoTrack = getReelVideo(reel.videoKey);
  // Video reels carry their own voiceover; the ambient pad would just fight
  // with it. We also hide the centered quote (the avatar speaks the message)
  // and the Daily Bloom card (too much overlap with a talking head).
  const isVideoReel = !!videoTrack;
  const playAmbient =
    !isVideoReel ||
    (videoTrack !== null && !videoTrack.hasVoiceover);

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 400) {
      if (!hugged) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setHugged(true);
        setHugCount((c) => c + 1);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 900);
      }
    }
    lastTap.current = now;
  }

  function handleHugPress() {
    Haptics.selectionAsync();
    setHugged((prev) => !prev);
    setHugCount((c) => (hugged ? c - 1 : c + 1));
  }

  const { bg, blob1, blob2, avatarBg } = reel.theme;
  // darkBg is derived from the scheme when present; falls back to the manual
  // flag for any legacy bgImage-based reels.
  const darkBg = reel.scheme ? isSchemeDark(reel.scheme) : !!reel.darkBg;
  const hasArtBg = !!reel.scheme || !!reel.bgImage;

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[s.reel, { width, height }]}
      onPress={handleDoubleTap}
    >
      {/* Ambient audio loop — silently mounted; only present when the track
          actually has a bundled source AND this reel isn't a video reel with
          baked-in voiceover (see lib/audio/reel-audio.ts). */}
      {playAmbient && reel.audioKey && audioTrack?.source != null && (
        <ReelAudio
          source={audioTrack.source}
          volume={REEL_AUDIO_VOLUME[reel.audioKey]}
          isPlaying={isPlaying}
          muted={muted}
        />
      )}

      {/* Background — video (mp4 + voiceover) > scheme (gradient + SVG art) >
          bgImage > legacy color blobs. Video covers everything below it. */}
      {videoTrack ? (
        <ReelVideo
          source={videoTrack.source}
          isPlaying={isPlaying}
          muted={muted}
        />
      ) : reel.scheme ? (
        <ReelBackground scheme={reel.scheme} />
      ) : reel.bgImage ? (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
          <Image
            source={{ uri: reel.bgImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}>
          <View style={[s.blob, {
            width: width * 0.85, height: width * 0.85,
            borderRadius: width * 0.425,
            backgroundColor: blob2,
            top: -width * 0.2, left: -width * 0.25, opacity: 0.55,
          }]} />
          <View style={[s.blob, {
            width: width * 0.65, height: width * 0.65,
            borderRadius: width * 0.325,
            backgroundColor: blob1,
            bottom: -width * 0.15, right: -width * 0.2, opacity: 0.45,
          }]} />
        </View>
      )}

      {/* Gradient-style overlay at top for header readability */}
      <View style={s.gradientTop} />
      {/* Gradient-style overlay at bottom for caption readability — stronger when over an illustrated bg */}
      <View style={[s.gradientBottom, hasArtBg && s.gradientBottomOnImage]} />
      {/* Soft center scrim — light tint to lift dark text on light schemes,
          dark tint to anchor light text on dark schemes. */}
      {hasArtBg && (
        <View style={darkBg ? s.centerVignetteOnDark : s.centerVignetteOnLight} pointerEvents="none" />
      )}

      {/* Center: Quote — hidden for video reels (the avatar speaks it). */}
      {!isVideoReel && (
        <View style={s.centerContent}>
          <Animated.View entering={FadeIn.delay(100).springify()} style={s.quoteBlock}>
            <Text
              style={[
                s.quoteText,
                hasArtBg && !darkBg && s.quoteTextOnLightImage,
                darkBg && s.quoteTextOnDark,
              ]}
            >
              {reel.quote}
            </Text>
            <Text style={[s.quoteAuthor, darkBg && s.quoteAuthorOnDark]}>— {reel.author}</Text>
          </Animated.View>
        </View>
      )}

      {/* Daily Bloom — absolutely positioned bottom-left so it stays clear of
          the right-side action column and sits just above the caption. Hidden
          on video reels (too much overlap with a talking head). */}
      {!isVideoReel && reel.dailyBloom && (
        <Animated.View
          entering={FadeIn.delay(200).springify()}
          style={s.dailyCardWrap}
        >
          <View style={s.dailyCardBlurWrap}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={50} tint="light" style={s.dailyCardInner}>
                <DailyBloomContent text={reel.dailyBloom} />
              </BlurView>
            ) : (
              <View style={[s.dailyCardInner, { backgroundColor: 'rgba(255,241,237,0.85)' }]}>
                <DailyBloomContent text={reel.dailyBloom} />
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Right sidebar */}
      <View style={s.sidebar}>
        {/* Avatar */}
        <View style={s.sidebarAvatarWrap}>
          <View style={[s.sidebarAvatar, { backgroundColor: avatarBg }]}>
            <MaterialCommunityIcons name="account" size={22} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={s.followBadge}>
            <MaterialCommunityIcons name="plus" size={10} color="#ffffff" />
          </View>
        </View>

        <SidebarBtn
          icon={hugged ? 'heart' : 'heart-outline'}
          label={formatCount(hugCount)}
          iconColor={hugged ? '#e8836b' : C.primary}
          onPress={handleHugPress}
        />
        <SidebarBtn icon="book-open-outline" label="Journal" onPress={() => {}} />
        <SidebarBtn
          icon="share-variant-outline"
          onPress={() => {
            Haptics.selectionAsync();
            onShare();
          }}
        />
      </View>

      {/* Bottom caption — video reels surface the voiceover attribution
          in the music pill (with a microphone icon) instead of the loop
          label, since there's no ambient pad playing. */}
      <View style={s.caption}>
        <Text style={[s.captionHandle, (darkBg || isVideoReel) && s.captionHandleOnDark]}>{reel.handle}</Text>
        <Text style={[s.captionText, (darkBg || isVideoReel) && s.captionTextOnDark]} numberOfLines={2}>{reel.caption}</Text>
        <View style={s.musicTagWrap}>
          <View style={s.musicTagBlurWrap}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={40} tint="light" style={s.musicTag}>
                <MaterialCommunityIcons
                  name={isVideoReel ? 'microphone' : 'music'}
                  size={13}
                  color={C.primary}
                />
                <Text style={s.musicText}>{videoTrack ? videoTrack.label : reel.music}</Text>
              </BlurView>
            ) : (
              <View style={[s.musicTag, { backgroundColor: 'rgba(255,226,219,0.7)' }]}>
                <MaterialCommunityIcons
                  name={isVideoReel ? 'microphone' : 'music'}
                  size={13}
                  color={C.primary}
                />
                <Text style={s.musicText}>{videoTrack ? videoTrack.label : reel.music}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Double-tap heart burst */}
      {showHeart && (
        <Animated.View
          entering={ZoomIn.duration(300)}
          style={s.heartBurst}
          pointerEvents="none"
        >
          <MaterialCommunityIcons name="heart" size={80} color="#e8836b" />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Full-screen video background. Two implementations because the right
// behaviour differs sharply between native (expo-video does it well) and
// iOS Safari (expo-video's web build does NOT set `playsinline` on the
// underlying <video> element, which makes iOS hijack the first tap and
// open the fullscreen native player). On web we drop down to a raw HTML5
// <video> with the exact attributes iOS needs.
function ReelVideo(props: {
  source: VideoSource;
  isPlaying: boolean;
  muted: boolean;
}) {
  if (Platform.OS === 'web') {
    return <WebReelVideo {...props} />;
  }
  return <NativeReelVideo {...props} />;
}

function NativeReelVideo({
  source,
  isPlaying,
  muted,
}: {
  source: VideoSource;
  isPlaying: boolean;
  muted: boolean;
}) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (isPlaying) player.play();
    else player.pause();
  }, [player, isPlaying]);

  // `contain` keeps the 9:16 source intact — on a phone taller than 9:16
  // (iPhone 14 Pro Max ≈ 9:19.5) you get thin dark bars top/bottom instead
  // of cropping the avatar. Backdrop is black to match TikTok-style
  // letterboxing when a clip doesn't exactly fit the device aspect.
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

// Web-only: raw HTML5 <video> with every iOS Safari attribute spelled out.
// `playsinline` + `webkit-playsinline` together prevent the native fullscreen
// takeover even on older iOS builds; `autoplay` + `muted` are the magic combo
// that lets Safari start the video without a user gesture (we honour the
// user's mute preference reactively below). `object-fit: contain` keeps the
// 9:16 source intact instead of cropping it to whatever shape the viewport is.
function WebReelVideo({
  source,
  isPlaying,
  muted,
}: {
  source: VideoSource;
  isPlaying: boolean;
  muted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // `source` is the result of require('…mp4'). On web Metro typically returns
  // either a URL string or an object with `uri`. resolveAssetSource normalises
  // every shape (number / string / { uri }) to a URL string.
  const src = useMemo(() => {
    if (!source) return '';
    if (typeof source === 'string') return source;
    if (typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
      return source.uri;
    }
    const resolved = RNImage.resolveAssetSource(source as never);
    return resolved?.uri ?? '';
  }, [source]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      const playResult = v.play();
      if (playResult && typeof playResult.catch === 'function') {
        // Autoplay can be blocked by the browser — silent fail, the user
        // can tap the reel and we'll retry on the next isPlaying flip.
        playResult.catch(() => {});
      }
    } else {
      v.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
      {createElement('video', {
        ref: videoRef,
        src,
        loop: true,
        autoPlay: true,
        muted,
        playsInline: true,
        'webkit-playsinline': 'true',
        controls: false,
        disablePictureInPicture: true,
        controlsList: 'nodownload nofullscreen noremoteplayback',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          display: 'block',
          background: '#000',
        },
      })}
    </View>
  );
}

// Mounted only when the reel actually has a playable source. Looping is set
// once; play/pause flips with visibility; mute flips with the user pref
// without restarting the loop (so unmuting drops back into the same beat).
function ReelAudio({
  source,
  volume,
  isPlaying,
  muted,
}: {
  source: NonNullable<ReelAudioTrack['source']>;
  volume: number;
  isPlaying: boolean;
  muted: boolean;
}) {
  const player = useAudioPlayer(source);

  useEffect(() => {
    player.loop = true;
    player.volume = volume;
  }, [player, volume]);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isPlaying]);

  return null;
}

function DailyBloomContent({ text }: { text: string }) {
  return (
    <>
      <View style={s.dailyBadge}>
        <MaterialCommunityIcons name="shimmer" size={16} color={C.primary} />
        <Text style={s.dailyBadgeText}>Daily Bloom</Text>
      </View>
      <Text style={s.dailyText}>{text}</Text>
    </>
  );
}

function SidebarBtn({
  icon,
  label,
  iconColor = C.primary,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label?: string;
  iconColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.sidebarItem} onPress={onPress} activeOpacity={0.75}>
      <View style={s.sidebarBtnBlurWrap}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={30} tint="light" style={s.sidebarBtnInner}>
            <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
          </BlurView>
        ) : (
          <View style={[s.sidebarBtnInner, { backgroundColor: 'rgba(255,226,219,0.65)' }]}>
            <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
          </View>
        )}
      </View>
      {label && <Text style={s.sidebarLabel}>{label}</Text>}
    </TouchableOpacity>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fadcd5' },

  // Top bar
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 50,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topBarWordmark: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    color: C.primary,
    letterSpacing: -0.1,
  },

  // Reel
  reel: { position: 'relative', overflow: 'hidden' },
  blob: { position: 'absolute' },
  gradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 140,
    backgroundColor: 'rgba(28,14,8,0.12)',
    zIndex: 2,
  },
  gradientBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
    backgroundColor: 'rgba(28,14,8,0.28)',
    zIndex: 2,
  },
  gradientBottomOnImage: {
    backgroundColor: 'rgba(28,14,8,0.5)',
    height: 340,
  },
  centerVignetteOnDark: {
    position: 'absolute',
    top: '20%', left: 0, right: 0, height: '50%',
    backgroundColor: 'rgba(28,14,8,0.28)',
    zIndex: 2,
  },
  centerVignetteOnLight: {
    position: 'absolute',
    top: '20%', left: 0, right: 0, height: '50%',
    backgroundColor: 'rgba(255,248,246,0.22)',
    zIndex: 2,
  },

  // Center quote
  centerContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 10,
  },
  quoteBlock: { alignItems: 'center', gap: 10, maxWidth: 340 },
  quoteText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 32,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  quoteAuthor: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
    fontStyle: 'italic',
    opacity: 0.85,
  },
  quoteTextOnDark: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  quoteTextOnLightImage: {
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  quoteAuthorOnDark: {
    color: '#ffdad2',
    opacity: 0.95,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captionHandleOnDark: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captionTextOnDark: {
    color: '#f5e6e0',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Daily bloom card — anchored bottom-left, clear of the right action column
  // (sidebar lives at right:16 with width ~48, so we keep right:96 of breathing
  // room) and stacked above the caption block at the bottom. tabBarHeight is
  // added because the reel now extends edge-to-edge under the floating tab bar.
  dailyCardWrap: {
    position: 'absolute',
    left: 24,
    right: 96,
    bottom: 140 + layout.tabBarHeight,
    zIndex: 15,
    maxWidth: 320,
  },
  dailyCardBlurWrap: { borderRadius: 20, overflow: 'hidden' },
  dailyCardInner: {
    padding: 18,
    gap: 8,
  },
  dailyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dailyBadgeText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  dailyText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurface,
  },

  // Sidebar — bottom offset includes tabBarHeight because the reel runs under
  // the floating tab bar (TikTok / Instagram Reels behavior).
  sidebar: {
    position: 'absolute',
    right: 16,
    bottom: 120 + layout.tabBarHeight,
    zIndex: 20,
    alignItems: 'center',
    gap: 20,
  },
  sidebarAvatarWrap: { position: 'relative', marginBottom: 4 },
  sidebarAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  followBadge: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarItem: { alignItems: 'center', gap: 4 },
  sidebarBtnBlurWrap: { borderRadius: 24, overflow: 'hidden' },
  sidebarBtnInner: {
    width: 48, height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurface,
  },

  // Caption — bottom offset includes tabBarHeight so it sits just above the
  // floating tab bar instead of being hidden behind it.
  caption: {
    position: 'absolute',
    bottom: 24 + layout.tabBarHeight,
    left: 0,
    right: 72,
    paddingHorizontal: 24,
    zIndex: 20,
    gap: 6,
  },
  captionHandle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurface,
  },
  captionText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
  },
  musicTagWrap: {},
  musicTagBlurWrap: { borderRadius: 9999, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 4 },
  musicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  musicText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    color: C.onSurfaceVariant,
  },

  // Double-tap heart
  heartBurst: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -40,
    zIndex: 99,
  },
});
