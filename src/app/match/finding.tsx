import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { sb } from '../../lib/queries/client';
import { useFindSoulMatch, useWaitForSoulMatch } from '../../lib/queries/match';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  Ellipse,
  FeGaussianBlur,
  Filter,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

// ─── Design tokens (1:1 with design/soul-matching-finding.html — v2) ─────────
const C = {
  surface:                 '#fff8f6',
  surfaceContainerLowest:  '#ffffff',
  surfaceContainer:        '#ffe9e4',
  surfaceContainerHighest: '#fadcd5',
  primary:                 '#994531',
  primaryContainer:        '#e8836b',
  primaryFixed:            '#ffdad2',
  secondary:               '#006970',
  secondaryContainer:      '#90f2fc',
  tertiaryContainer:       '#fa719c',
  onSurface:               '#281814',
  onSurfaceVariant:        '#55433e',
  outline:                 '#88726d',
} as const;

const STAGE_SIZE = 288; // w-72 h-72 in the HTML
const ORB_SIZE = 96;    // w-24 h-24
const SUB_HINT_CYCLE_MS = 1500;
const SUB_HINT_FADE_MS = 300;

// Hints rotate beneath the progress bar, swapped by phase so the user always
// has a sense of what's actually happening.
const HINTS_SEARCHING = [
  'Scanning deep values and communication styles...',
  'Listening for souls who share your tide...',
  'Tracing threads of shared empathy...',
  'Your kindred spirits are gathering near...',
] as const;

const HINTS_WAITING = [
  'No one resonant just yet — staying with you...',
  'A few kindred souls are still arriving today.',
  'Quietly listening for someone who matches your tide.',
  'Stillness is part of finding the right person.',
] as const;

type Phase = 'searching' | 'waiting' | 'matched' | 'no_match';

// How long to keep watching the realtime channel before we give up.
const WAIT_TIMEOUT_MS = 90_000;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FindingKindredSpiritsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <MeshBackground />
      <CornerBlobs />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 32,
            paddingBottom: Math.max(insets.bottom, 16) + 32,
          },
        ]}
      >
        <View style={styles.resonanceStage}>
          <PulseRing
            baseScale={1.25}
            durationMs={4000}
            initialPhaseMs={0}
            borderWidth={2}
            borderColor="rgba(153,69,49,0.10)" // primary/10
          />
          <PulseRing
            baseScale={1.5}
            durationMs={6000}
            initialPhaseMs={1000} // matches HTML's "-1s" delay (1s into cycle)
            borderWidth={1}
            borderColor="rgba(0,105,112,0.20)" // secondary/20
          />
          <ResonanceField />
          <CenterOrb />
        </View>

        <View style={styles.typography}>
          <Text style={styles.headline}>Finding your kindred spirits</Text>
          <Text style={styles.subtitle}>
            We&apos;re analyzing your emotional resonance to find the perfect harmony.
          </Text>
        </View>

        <ProgressSection />
      </View>
    </View>
  );
}

// ─── Mesh background (4 corner radial gradients on warm surface) ─────────────

function MeshBackground() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: C.surface }]}
    >
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="meshTl" cx="0%" cy="0%" r="55%" fx="0%" fy="0%">
            <Stop offset="0%"   stopColor="rgb(232,131,107)" stopOpacity={0.15} />
            <Stop offset="100%" stopColor="rgb(232,131,107)" stopOpacity={0}    />
          </RadialGradient>
          <RadialGradient id="meshTr" cx="100%" cy="0%" r="55%" fx="100%" fy="0%">
            <Stop offset="0%"   stopColor="rgb(144,242,252)" stopOpacity={0.15} />
            <Stop offset="100%" stopColor="rgb(144,242,252)" stopOpacity={0}    />
          </RadialGradient>
          <RadialGradient id="meshBr" cx="100%" cy="100%" r="55%" fx="100%" fy="100%">
            <Stop offset="0%"   stopColor="rgb(250,113,156)" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="rgb(250,113,156)" stopOpacity={0}    />
          </RadialGradient>
          <RadialGradient id="meshBl" cx="0%" cy="100%" r="55%" fx="0%" fy="100%">
            <Stop offset="0%"   stopColor="rgb(255,218,210)" stopOpacity={0.20} />
            <Stop offset="100%" stopColor="rgb(255,218,210)" stopOpacity={0}    />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#meshTl)" />
        <Rect width="100%" height="100%" fill="url(#meshTr)" />
        <Rect width="100%" height="100%" fill="url(#meshBr)" />
        <Rect width="100%" height="100%" fill="url(#meshBl)" />
      </Svg>
    </View>
  );
}

// ─── Corner blur blobs (decorative atmosphere) ───────────────────────────────

function CornerBlobs() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.cornerBlob,
          {
            top: 48,
            left: 48,
            width: 128,
            height: 128,
            backgroundColor: 'rgba(144,242,252,0.20)', // secondary-container/20
          },
        ]}
      />
      <View
        style={[
          styles.cornerBlob,
          {
            bottom: 96,
            right: 48,
            width: 192,
            height: 192,
            backgroundColor: 'rgba(250,113,156,0.10)', // tertiary-container/10
          },
        ]}
      />
    </View>
  );
}

// ─── Pulse ring (scale 0.8 ↔ 1.1, opacity 0.3 ↔ 0.1) ─────────────────────────

function PulseRing({
  baseScale,
  durationMs,
  initialPhaseMs,
  borderWidth,
  borderColor,
}: {
  baseScale: number;
  durationMs: number;
  initialPhaseMs: number;
  borderWidth: number;
  borderColor: string;
}) {
  // The pulse-ring CSS keyframe maps 0% → scale 0.8 / opacity 0.3 →
  // 50% → 1.1 / 0.1 → 100% → 0.8 / 0.3.
  const minS = baseScale * 0.8;
  const maxS = baseScale * 1.1;

  const scale = useSharedValue(minS);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const half = durationMs / 2;
    scale.value = withDelay(
      initialPhaseMs,
      withRepeat(
        withSequence(
          withTiming(maxS, { duration: half, easing: Easing.inOut(Easing.ease) }),
          withTiming(minS, { duration: half, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      initialPhaseMs,
      withRepeat(
        withSequence(
          withTiming(0.1, { duration: half, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: half, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [durationMs, initialPhaseMs, minS, maxS, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        { borderWidth, borderColor },
        animStyle,
      ]}
    />
  );
}

// ─── Resonance field (peach→pink→cyan blurred organic shape, 12s loop) ──────

function ResonanceField() {
  const rotation = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    // Approximate the CSS border-radius morph via opposing axis scale.
    scaleX.value = withRepeat(
      withTiming(1.1, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    scaleY.value = withRepeat(
      withTiming(0.9, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [rotation, scaleX, scaleY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.resonanceField, animStyle]}>
      <Svg width={STAGE_SIZE} height={STAGE_SIZE}>
        <Defs>
          <LinearGradient id="resGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%"   stopColor="#ffdad2" />
            <Stop offset="50%"  stopColor="#fa719c" />
            <Stop offset="100%" stopColor="#90f2fc" />
          </LinearGradient>
          {/* CSS filter: blur(40px) — approximate with feGaussianBlur.
              stdDeviation ≈ blur radius / √2 ≈ 28. */}
          <Filter id="resBlur" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation="28" />
          </Filter>
        </Defs>
        <Ellipse
          cx={STAGE_SIZE / 2}
          cy={STAGE_SIZE / 2}
          rx={110}
          ry={110}
          fill="url(#resGrad)"
          filter="url(#resBlur)"
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Center identity orb (96×96 white circle, filled heart icon) ─────────────

function CenterOrb() {
  return (
    <View style={styles.centerOrb}>
      <MaterialCommunityIcons name="heart" size={48} color={C.primary} />
    </View>
  );
}

// ─── Progress section (% Harmonized + glow bar + cycling sub-hint) ───────────

function ProgressSection() {
  const router = useRouter();
  const findMatch = useFindSoulMatch();
  const [phase, setPhase] = useState<Phase>('searching');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigated = useRef(false);
  const inflight = useRef(false);

  // Watch realtime for incoming matches once we're in 'waiting' state.
  const waitMatch = useWaitForSoulMatch(phase === 'waiting');

  // Animated values
  const progressPct = useSharedValue(0);
  const iconOpacity = useSharedValue(0.4);
  const [pctLabel, setPctLabel] = useState(0);

  // Drive the % label off the shared value so the text stays in sync.
  useEffect(() => {
    iconOpacity.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [iconOpacity]);

  // Snap progress to the right target whenever phase shifts.
  useEffect(() => {
    const target = phase === 'matched' ? 100
                 : phase === 'waiting' ? 72
                 : phase === 'no_match' ? 40
                 : 65; // searching
    progressPct.value = withTiming(
      target,
      { duration: phase === 'matched' ? 800 : 1400, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setPctLabel)(target);
      },
    );
  }, [phase, progressPct]);

  // Kick off the actual matching call once on mount.
  useEffect(() => {
    if (inflight.current) return;
    inflight.current = true;

    void findMatch.mutateAsync()
      .then((result) => {
        if (result.status === 'matched' && result.conversation_id) {
          setPhase('matched');
          if (!navigated.current) {
            navigated.current = true;
            setTimeout(() => {
              router.replace({
                pathname: '/match/conversation',
                params: { id: result.conversation_id },
              });
            }, 900);
          }
        } else {
          setPhase('waiting');
        }
      })
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : '';
        const msg = raw.includes('send a request') || raw === ''
          ? 'Connection issue — please check your signal and try again.'
          : raw;
        setErrorMsg(msg);
        setPhase('no_match');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When realtime delivers a match for us, fetch the conversation id and go.
  useEffect(() => {
    if (phase !== 'waiting' || !waitMatch) return;
    if (navigated.current) return;
    navigated.current = true;

    (async () => {
      const { data: conv } = await sb()
        .from('conversations')
        .select('id')
        .eq('match_id', waitMatch.id)
        .maybeSingle();

      if (!conv?.id) {
        // Match row exists but conversation isn't readable yet — give it a tick.
        setTimeout(async () => {
          const { data: retry } = await sb()
            .from('conversations')
            .select('id')
            .eq('match_id', waitMatch.id)
            .maybeSingle();
          if (retry?.id) {
            setPhase('matched');
            router.replace({
              pathname: '/match/conversation',
              params: { id: retry.id },
            });
          }
        }, 800);
        return;
      }

      setPhase('matched');
      router.replace({
        pathname: '/match/conversation',
        params: { id: conv.id },
      });
    })();
  }, [waitMatch, phase, router]);

  // Give up on waiting after the timeout — show retry CTA.
  useEffect(() => {
    if (phase !== 'waiting') return;
    const t = setTimeout(() => {
      if (!navigated.current) setPhase('no_match');
    }, WAIT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progressPct.value}%` }));
  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value }));

  const headerLabel =
    phase === 'matched'  ? '100% HARMONIZED'
    : phase === 'no_match' ? 'NO RESONANCE YET'
    : `${Math.floor(pctLabel)}% HARMONIZED`;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>{headerLabel}</Text>
        <Animated.View style={iconStyle}>
          <MaterialCommunityIcons
            name={phase === 'no_match' ? 'weather-cloudy' : 'sync'}
            size={20}
            color={C.secondary}
          />
        </Animated.View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, fillStyle]} />
      </View>

      <CyclingSubHint phase={phase} errorMsg={errorMsg} />

      {phase === 'no_match' ? (
        <View style={styles.retryRow}>
          <TouchableOpacity
            style={styles.retryGhost}
            activeOpacity={0.75}
            onPress={() => {
              navigated.current = true;
              router.replace('/(main)/dashboard');
            }}
          >
            <Text style={styles.retryGhostText}>Try later today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.retryFilled}
            activeOpacity={0.85}
            onPress={() => {
              // Reset + try matching again — quiz is already submitted.
              setErrorMsg(null);
              navigated.current = false;
              inflight.current = false;
              setPhase('searching');
              void findMatch.mutateAsync()
                .then((result) => {
                  if (result.status === 'matched' && result.conversation_id) {
                    setPhase('matched');
                    router.replace({
                      pathname: '/match/conversation',
                      params: { id: result.conversation_id },
                    });
                  } else {
                    setPhase('waiting');
                  }
                })
                .catch((err: unknown) => {
                    const raw = err instanceof Error ? err.message : '';
                    const msg = raw.includes('send a request') || raw === ''
                      ? 'Connection issue — please check your signal and try again.'
                      : raw;
                    setErrorMsg(msg);
                    setPhase('no_match');
                  });
            }}
          >
            <Text style={styles.retryFilledText}>Listen again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function CyclingSubHint({
  phase,
  errorMsg,
}: {
  phase: Phase;
  errorMsg: string | null;
}) {
  const hints = phase === 'waiting' ? HINTS_WAITING : HINTS_SEARCHING;
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(1);

  // Reset to first hint each time the hint-set changes so we re-anchor on
  // phase transitions.
  useEffect(() => {
    setIndex(0);
  }, [phase]);

  useEffect(() => {
    if (phase === 'matched' || phase === 'no_match') return;

    const advance = () =>
      setIndex((prev) => (prev + 1) % hints.length);

    const interval = setInterval(() => {
      opacity.value = withTiming(
        0,
        { duration: SUB_HINT_FADE_MS, easing: Easing.in(Easing.ease) },
        (finished) => {
          if (!finished) return;
          runOnJS(advance)();
          opacity.value = withTiming(1, {
            duration: SUB_HINT_FADE_MS,
            easing: Easing.out(Easing.ease),
          });
        },
      );
    }, SUB_HINT_CYCLE_MS);

    return () => clearInterval(interval);
  }, [opacity, phase, hints.length]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const text =
    phase === 'matched'
      ? 'Your kindred is here. Opening the conversation…'
      : phase === 'no_match'
        ? errorMsg ?? 'No one tuned to your frequency right now. Try again in a while.'
        : hints[index];

  return (
    <Animated.Text style={[styles.subHint, animStyle]} numberOfLines={3}>
      {text}
    </Animated.Text>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },

  cornerBlob: {
    position: 'absolute',
    borderRadius: 9999,
  },

  // Resonance stage (288×288 container)
  resonanceStage: {
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    borderRadius: STAGE_SIZE / 2,
  },
  resonanceField: {
    position: 'absolute',
    width: STAGE_SIZE,
    height: STAGE_SIZE,
    opacity: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOrb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: C.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#5c4742',
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 4 },
    }),
  },

  // Typography cluster
  typography: {
    alignItems: 'center',
    gap: 8,
  },
  headline: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: C.primary,
    fontWeight: '700',
    letterSpacing: -0.32,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 18,
    lineHeight: 29,
    color: C.onSurfaceVariant,
    opacity: 0.8,
    maxWidth: 400,
    textAlign: 'center',
  },

  // Progress section
  progressContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  progressLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
    letterSpacing: 1.4, // tracking-widest at 14px ≈ 0.1em
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 12,
    width: '100%',
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerHighest,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    ...Platform.select({
      ios: {
        shadowColor: '#e8836b',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 4 },
    }),
  },
  subHint: {
    fontFamily: 'NunitoSans_400Regular',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 21,
    color: C.outline,
    textAlign: 'center',
    minHeight: 21, // reserve line so cycling doesn't reflow surrounding content
  },

  // No-match retry row
  retryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  retryGhost: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryGhostText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    color: C.onSurfaceVariant,
  },
  retryFilled: {
    flex: 1,
    height: 48,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#994531',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 3 },
    }),
  },
  retryFilledText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    color: '#641e0e',
    letterSpacing: 0.4,
  },
});
