import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design tokens (1:1 design/breathi-in-exercise.html) ─────────────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:                '#994531',
  onPrimary:              '#ffffff',
  primaryContainer:       '#e8836b',
  onPrimaryContainer:     '#641e0e',
  secondaryFixed:         '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiaryFixedDim:       '#ffb1c4',
  error:                  '#ba1a1a',
  errorContainer:         '#ffdad6',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

// 4 phases of box breathing, each 4 seconds
type Phase = 'in' | 'hold-in' | 'out' | 'hold-out';
const PHASES: Phase[] = ['in', 'hold-in', 'out', 'hold-out'];
const PHASE_DURATION_MS = 4000;
const PHASE_LABELS: Record<Phase, string> = {
  'in':       'Breathe In',
  'hold-in':  'Hold',
  'out':      'Breathe Out',
  'hold-out': 'Hold',
};

const PHASE_DOTS = 4;

// Inner circle sizes: small when contracted, large when expanded
const INNER_MIN = 120;
const INNER_MAX = 192;

export default function BreathingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('in');
  const [elapsed, setElapsed] = useState(0); // seconds remaining label: "02:45"
  const totalSecs = useRef(165); // 2:45 total

  // Reanimated shared value for the inner circle scale
  const innerSize = useSharedValue(INNER_MIN);

  // ── Breathing cycle ──────────────────────────────────────────────────────
  useEffect(() => {
    let phaseIdx = 0;

    function runPhase() {
      const current = PHASES[phaseIdx % PHASES.length];
      setPhase(current);

      const targetSize = (current === 'in' || current === 'hold-in') ? INNER_MAX : INNER_MIN;
      innerSize.value = withTiming(targetSize, {
        duration: current === 'hold-in' || current === 'hold-out' ? 0 : PHASE_DURATION_MS,
        easing: Easing.inOut(Easing.quad),
      });

      phaseIdx++;
    }

    runPhase();
    const interval = setInterval(runPhase, PHASE_DURATION_MS);
    return () => clearInterval(interval);
  }, [innerSize]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      totalSecs.current = Math.max(0, totalSecs.current - 1);
      setElapsed(totalSecs.current);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  const timeLabel = `${mins}:${secs} remaining`;

  // ── Animated inner circle ────────────────────────────────────────────────
  const innerStyle = useAnimatedStyle(() => ({
    width: innerSize.value,
    height: innerSize.value,
    borderRadius: innerSize.value / 2,
  }));

  // ── Pulsing blob ─────────────────────────────────────────────────────────
  const blobScale = useSharedValue(1);
  useEffect(() => {
    blobScale.value = withSequence(
      withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      withTiming(1,   { duration: 2000, easing: Easing.inOut(Easing.quad) }),
    );
    const id = setInterval(() => {
      blobScale.value = withSequence(
        withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1,   { duration: 2000, easing: Easing.inOut(Easing.quad) }),
      );
    }, 4000);
    return () => clearInterval(id);
  }, [blobScale]);
  const blobStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blobScale.value }],
  }));

  const phaseIdx = PHASES.indexOf(phase);

  return (
    <View style={s.root}>
      {/* ── Gradient-ish background (from-surface-container-low to secondary-fixed) ── */}
      <View style={s.bgBottom} />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.glassBtn}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="close" size={22} color={C.onSurface} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={s.sessionTitle}>Box Breathing</Text>
          <Text style={s.sessionTimer}>{timeLabel}</Text>
        </View>

        <TouchableOpacity style={s.glassBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons name="volume-high" size={22} color={C.onSurface} />
        </TouchableOpacity>
      </View>

      {/* ── Central breathing stage ── */}
      <View style={s.stage}>
        {/* Pulsing background blob */}
        <Animated.View style={[s.blob, blobStyle]} />

        {/* Outer border ring */}
        <View style={s.outerRing}>
          {/* Inner animated circle */}
          <Animated.View style={[s.innerCircle, innerStyle]}>
            <Text style={s.phaseLabel}>{PHASE_LABELS[phase]}</Text>
          </Animated.View>
        </View>

        {/* Phase indicator dots */}
        <View style={s.dots}>
          {Array.from({ length: PHASE_DOTS }).map((_, i) => (
            <View
              key={i}
              style={[s.dot, i === phaseIdx && s.dotActive]}
            />
          ))}
        </View>
      </View>

      {/* ── Quote ── */}
      <View style={s.quoteWrap}>
        <Text style={s.quote}>
          "Feel the air filling your lungs, expanding your chest with warmth."
        </Text>
      </View>

      {/* ── Controls ── */}
      <View style={[s.controls, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity
          style={s.controlBtn}
          activeOpacity={0.85}
          onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
        >
          <View style={s.controlCircle}>
            <MaterialCommunityIcons name="pause" size={32} color={C.primary} />
          </View>
          <Text style={s.controlLabel}>Pause</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.controlBtn}
          activeOpacity={0.85}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.back();
          }}
        >
          <View style={[s.controlCircle, { backgroundColor: C.errorContainer }]}>
            <MaterialCommunityIcons name="stop" size={32} color={C.error} />
          </View>
          <Text style={s.controlLabel}>End Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '40%',
    backgroundColor: C.secondaryFixed,
    opacity: 0.35,
  },

  // Header
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  glassBtn: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.40)',
    alignItems: 'center', justifyContent: 'center',
  },
  sessionTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sessionTimer: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // Stage
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
  },
  blob: {
    position: 'absolute',
    width: 288, height: 288,
    borderRadius: 144,
    backgroundColor: C.tertiaryFixedDim,
    opacity: 0.2,
  },
  outerRing: {
    width: 256, height: 256,
    borderRadius: 128,
    borderWidth: 12,
    borderColor: 'rgba(153,69,49,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  innerCircle: {
    backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  phaseLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.onPrimaryContainer,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 40,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.outlineVariant,
  },
  dotActive: {
    backgroundColor: C.primary,
  },

  // Quote
  quoteWrap: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    maxWidth: 400,
  },
  quote: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 26,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },

  // Controls
  controls: {
    flexDirection: 'row',
    gap: 48,
    alignItems: 'center',
    paddingTop: 8,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 8,
  },
  controlCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.surfaceContainerHighest,
    alignItems: 'center', justifyContent: 'center',
  },
  controlLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
});
