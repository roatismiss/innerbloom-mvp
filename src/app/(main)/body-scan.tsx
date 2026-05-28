import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Design tokens (1:1 design system in AGENTS.md) ─────────────────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  primaryFixed:           '#ffdad2',
  onPrimaryContainer:     '#641e0e',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  error:                  '#ba1a1a',
  errorContainer:         '#ffdad6',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

// Zones positioned on the seated-meditator silhouette (fractions of the
// image frame, top-left origin). The figure has visible head, shoulders, chest,
// hands and lap — no feet — so the scan flows top → lap.
type Zone = {
  label: string;
  cue:   string;
  cx:    number;
  cy:    number;
  size:  number; // diameter in px
};

const ZONES: Zone[] = [
  { label: 'Crown of the Head', cue: 'Notice any sensation, warmth, or tension at the very top of your head.', cx: 0.50, cy: 0.18, size: 170 },
  { label: 'Eyes & Brow',       cue: 'Let your eyelids soften. Release the muscles around your forehead.',    cx: 0.50, cy: 0.27, size: 150 },
  { label: 'Throat',            cue: 'Soften your jaw. Let your throat be open and unguarded.',                cx: 0.50, cy: 0.42, size: 160 },
  { label: 'Heart & Chest',     cue: 'Feel your breath rising and falling. Welcome any feeling that is here.', cx: 0.50, cy: 0.58, size: 210 },
  { label: 'Hands & Lap',       cue: 'Rest your awareness in your hands. Notice their weight and stillness.',  cx: 0.50, cy: 0.82, size: 200 },
];

const ZONE_SECS = 45;
const TOTAL_SECS = ZONES.length * ZONE_SECS;

export default function BodyScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);

  const done    = elapsed >= TOTAL_SECS;
  const safe    = Math.min(elapsed, TOTAL_SECS);
  const zoneIdx = Math.min(Math.floor(safe / ZONE_SECS), ZONES.length - 1);
  const inZone  = safe % ZONE_SECS;
  const remaining = done ? 0 : ZONE_SECS - inZone;
  const zone    = ZONES[zoneIdx];

  // ── Tick ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (paused || done) return;
    const id = setInterval(() => {
      setElapsed((t) => Math.min(t + 1, TOTAL_SECS));
    }, 1000);
    return () => clearInterval(id);
  }, [paused, done]);

  // ── Glow position drifts between zones ──────────────────────────────────
  const glowX    = useSharedValue(ZONES[0].cx);
  const glowY    = useSharedValue(ZONES[0].cy);
  const glowSize = useSharedValue(ZONES[0].size);

  useEffect(() => {
    const z = ZONES[zoneIdx];
    const cfg = { duration: 1400, easing: Easing.inOut(Easing.cubic) };
    glowX.value    = withTiming(z.cx,   cfg);
    glowY.value    = withTiming(z.cy,   cfg);
    glowSize.value = withTiming(z.size, cfg);
  }, [zoneIdx, glowX, glowY, glowSize]);

  // ── Gentle breath-paced pulse ───────────────────────────────────────────
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.00, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const glowOuterStyle = useAnimatedStyle(() => {
    const d = glowSize.value * pulse.value * 1.35;
    return {
      left:  `${glowX.value * 100}%`,
      top:   `${glowY.value * 100}%`,
      width: d,
      height: d,
      marginLeft: -d / 2,
      marginTop:  -d / 2,
      borderRadius: d / 2,
    };
  });

  const glowMidStyle = useAnimatedStyle(() => {
    const d = glowSize.value * pulse.value;
    return {
      left:  `${glowX.value * 100}%`,
      top:   `${glowY.value * 100}%`,
      width: d,
      height: d,
      marginLeft: -d / 2,
      marginTop:  -d / 2,
      borderRadius: d / 2,
    };
  });

  const glowCoreStyle = useAnimatedStyle(() => {
    const d = glowSize.value * pulse.value * 0.55;
    return {
      left:  `${glowX.value * 100}%`,
      top:   `${glowY.value * 100}%`,
      width: d,
      height: d,
      marginLeft: -d / 2,
      marginTop:  -d / 2,
      borderRadius: d / 2,
    };
  });

  // ── Display helpers ─────────────────────────────────────────────────────
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const progressPct = (safe / TOTAL_SECS) * 100;

  return (
    <View style={s.root}>
      {/* Ambient background */}
      <View style={s.bgTop} />
      <View style={s.bgBottom} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={s.iconBtn}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="close" size={22} color={C.onSurface} />
        </Pressable>

        <View style={s.headerCenter}>
          <Text style={s.headerKicker}>Practice Presence</Text>
          <Text style={s.headerTitle}>Body Scan</Text>
        </View>

        <View style={s.iconBtn} />
      </View>

      {/* Stage: silhouette + drifting glow */}
      <View style={s.stage}>
        <View style={s.silhouetteFrame}>
          <Animated.View style={[s.glowOuter, glowOuterStyle]} />
          <Animated.View style={[s.glowMid,   glowMidStyle]} />
          <Animated.View style={[s.glowCore,  glowCoreStyle]} />
          <Image
            source={require('../../../assets/images/practice-presence.jpg')}
            style={s.silhouette}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Focus block */}
      <View style={s.focusBlock}>
        <Text style={s.zoneEyebrow}>Focus · {zone.label}</Text>
        <Text style={s.timer}>{mins}:{secs}</Text>
        <Text style={s.cue}>{done ? 'You are present. Rest here as long as you wish.' : zone.cue}</Text>
      </View>

      {/* Controls */}
      <View style={[s.controls, { paddingBottom: insets.bottom + 24 }]}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <View style={s.zoneDots}>
          {ZONES.map((_, i) => (
            <View
              key={i}
              style={[s.zoneDot, i === zoneIdx && s.zoneDotActive]}
            />
          ))}
        </View>
        <View style={s.buttons}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPaused((p) => !p);
            }}
            style={[s.btn, paused ? s.btnResume : s.btnPause]}
          >
            <MaterialCommunityIcons
              name={paused ? 'play' : 'pause'}
              size={20}
              color={paused ? C.onPrimaryContainer : C.onSecondaryContainer}
            />
            <Text
              style={[
                s.btnLabel,
                { color: paused ? C.onPrimaryContainer : C.onSecondaryContainer },
              ]}
            >
              {paused ? 'Resume' : 'Pause'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
            style={[s.btn, s.btnEnd]}
          >
            <MaterialCommunityIcons name="stop" size={20} color={C.onSurfaceVariant} />
            <Text style={[s.btnLabel, { color: C.onSurfaceVariant }]}>End Session</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
  },
  bgTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '55%',
    backgroundColor: C.surfaceContainer,
    opacity: 0.42,
  },
  bgBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '40%',
    backgroundColor: C.primaryFixed,
    opacity: 0.18,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerKicker: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    color: C.onSurface,
    letterSpacing: 0.2,
  },

  // Stage
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  silhouetteFrame: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 0.56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouette: {
    width: '100%',
    height: '100%',
  },
  glowOuter: {
    position: 'absolute',
    backgroundColor: C.primaryFixed,
    opacity: 0.45,
  },
  glowMid: {
    position: 'absolute',
    backgroundColor: C.primaryContainer,
    opacity: 0.32,
  },
  glowCore: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    opacity: 0.65,
    shadowColor: C.primaryContainer,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  // Focus block
  focusBlock: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 6,
  },
  zoneEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.primary,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  timer: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 38,
    lineHeight: 46,
    color: C.onSurface,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  cue: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 23,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 4,
  },

  // Controls
  controls: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 3,
  },
  zoneDots: {
    flexDirection: 'row',
    gap: 8,
  },
  zoneDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.outlineVariant,
  },
  zoneDotActive: {
    width: 28,
    backgroundColor: C.primary,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 360,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 16,
    shadowColor: '#5C4742',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  btnPause: {
    backgroundColor: C.secondaryContainer,
  },
  btnResume: {
    backgroundColor: C.primaryContainer,
  },
  btnEnd: {
    backgroundColor: C.surfaceContainerHighest,
  },
  btnLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
