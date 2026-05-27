import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { useCompleteOnboarding } from '../../lib/queries/onboarding';
import { useOnboardingDraft } from '../../store/onboarding-draft';

const C = {
  primary:              '#994531',
  primaryContainer:     '#e8836b',
  primaryFixed:         '#ffdad2',
  primaryFixedDim:      '#ffb4a3',
  secondaryFixed:       '#90f2fc',
  tertiaryFixed:        '#ffd9e1',
  surface:              '#fff8f6',
  surfaceContainerHigh: '#ffe2db',
  surfaceVariant:       '#fadcd5',
  onSurface:            '#281814',
  onSurfaceVariant:     '#55433e',
  outline:              '#88726d',
};

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const TOTAL_MS = 4200;

export default function BloomingScreen() {
  // Pull the full draft and submit it via the RPC. The splash animation runs
  // for TOTAL_MS regardless; navigation waits for both the animation AND the
  // network round-trip to complete, so we don't land on an empty home.
  const draft = useOnboardingDraft();
  const completeOnboarding = useCompleteOnboarding();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Animations
  const flower = useRef(new Animated.Value(0)).current;     // breathing 0→1→0
  const mesh = useRef(new Animated.Value(0)).current;       // ambient scale
  const fade = useRef(new Animated.Value(0)).current;       // card + bar fade-in
  const progress = useRef(new Animated.Value(0)).current;   // 0 → 100% over TOTAL_MS

  useEffect(() => {
    // Flower breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(flower, {
          toValue: 1, duration: 2000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(flower, {
          toValue: 0, duration: 2000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    ).start();

    // Mesh ambient
    Animated.loop(
      Animated.sequence([
        Animated.timing(mesh, {
          toValue: 1, duration: 10000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(mesh, {
          toValue: 0, duration: 10000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    ).start();

    // Card fade in (delayed)
    Animated.timing(fade, {
      toValue: 1, duration: 1200, delay: 400,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();

    // Progress bar fill
    Animated.timing(progress, {
      toValue: 1, duration: TOTAL_MS - 400, delay: 400,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [flower, mesh, fade, progress]);

  // Submit the draft once, on mount. Two independent gates control navigation:
  // the animation timer and the RPC promise; we navigate when both have
  // settled successfully. Errors abort and bounce the user back to `name`
  // so they can retry without losing the draft (draft store persists in-memory).
  useEffect(() => {
    // Guard: if a required field is missing, the user came here directly
    // without completing the flow — kick back to step 1.
    if (!draft.mood || !draft.frequency) {
      router.replace('/onboarding/mood');
      return;
    }

    let cancelled = false;
    let animationDone = false;
    let rpcDone = false;

    const tryNavigate = () => {
      if (cancelled) return;
      if (animationDone && rpcDone) {
        useOnboardingDraft.getState().reset();
        router.replace('/(main)/checkin');
      }
    };

    const t = setTimeout(() => {
      animationDone = true;
      tryNavigate();
    }, TOTAL_MS);

    completeOnboarding
      .mutateAsync({
        baseline_mood: draft.mood,
        checkin_frequency: draft.frequency,
        growth_goals: draft.goals,
        notification_opt_in: true,
      })
      .then(() => {
        rpcDone = true;
        tryNavigate();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = (err as any)?.message ?? (err instanceof Error ? err.message : 'Something went wrong.');
        setErrorMsg(msg);
      });

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // Intentionally only run once. The draft is captured at mount; if the
    // user edited it elsewhere, that'd be a routing bug, not our concern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flowerScale = flower.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const flowerTranslateY = flower.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const glowOpacity = flower.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.25] });

  const meshScale = mesh.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  const cardTranslateY = fade.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.root}>
      {/* Mesh gradient background */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transform: [{ scale: meshScale }] }]}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={C.surfaceVariant} stopOpacity={0.4} />
              <Stop offset="0.5" stopColor={C.surface} stopOpacity={0} />
              <Stop offset="1" stopColor={C.secondaryFixed} stopOpacity={0.2} />
            </LinearGradient>
            <LinearGradient id="g2" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={C.primaryContainer} stopOpacity={0.1} />
              <Stop offset="0.5" stopColor={C.surface} stopOpacity={0} />
              <Stop offset="1" stopColor={C.tertiaryFixed} stopOpacity={0.3} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#g1)" />
          <Rect width="100%" height="100%" fill="url(#g2)" />
        </Svg>
      </Animated.View>

      {/* Particles (decorative — 8 fixed positions for stability) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {PARTICLES.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}
      </View>

      {/* Center content */}
      <View style={styles.center}>
        {/* Flower */}
        <Animated.View
          style={[
            styles.flowerWrap,
            { transform: [{ translateY: flowerTranslateY }, { scale: flowerScale }] },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.flowerGlow,
              { opacity: glowOpacity },
            ]}
          />
          <Svg width={148} height={148} viewBox="0 0 200 200">
            <Defs>
              <LinearGradient id="orb" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#E8836B" />
                <Stop offset="1" stopColor="#994531" />
              </LinearGradient>
              <LinearGradient id="petalA" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFDAD2" stopOpacity={1} />
                <Stop offset="1" stopColor="#E8836B" stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="petalB" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FADCD5" stopOpacity={1} />
                <Stop offset="1" stopColor="#994531" stopOpacity={0} />
              </LinearGradient>
            </Defs>

            <Path
              d="M100 20C115 50 145 60 145 100C145 140 115 150 100 180C85 150 55 140 55 100C55 60 85 50 100 20Z"
              fill="url(#petalA)"
              opacity={0.8}
            />
            <Path
              d="M100 20C115 50 145 60 145 100C145 140 115 150 100 180C85 150 55 140 55 100C55 60 85 50 100 20Z"
              fill="url(#petalB)"
              opacity={0.6}
              transform="rotate(45 100 100)"
            />
            <Path
              d="M100 20C115 50 145 60 145 100C145 140 115 150 100 180C85 150 55 140 55 100C55 60 85 50 100 20Z"
              fill="url(#petalA)"
              opacity={0.7}
              transform="rotate(90 100 100)"
            />
            <Path
              d="M100 20C115 50 145 60 145 100C145 140 115 150 100 180C85 150 55 140 55 100C55 60 85 50 100 20Z"
              fill="url(#petalB)"
              opacity={0.5}
              transform="rotate(135 100 100)"
            />
            <Circle cx={100} cy={100} r={28} fill="url(#orb)" />
          </Svg>
        </Animated.View>

        {/* Glass card */}
        <Animated.View
          style={[
            styles.cardWrap,
            { opacity: fade, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
          <BlurView intensity={36} tint="light" style={styles.card}>
            <Text style={styles.cardTitle}>Blooming your profile...</Text>
            <Text style={styles.cardBody}>
              Arranging your sanctuary for a peaceful experience.
            </Text>
          </BlurView>
        </Animated.View>

        {/* Progress bar */}
        <Animated.View style={[styles.progressTrack, { opacity: fade }]}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </Animated.View>

        {/* Quote */}
        <Animated.View
          style={[
            styles.quoteWrap,
            { opacity: fade, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
          <Text style={styles.quote}>
            "Between the surface and the deep — there's a part of you that remembers how to breathe."
          </Text>
        </Animated.View>
      </View>

      {errorMsg && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>We couldn't finish setting up</Text>
            <Text style={styles.errorBody}>{errorMsg}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.errorBtn,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
              onPress={() =>
                errorMsg?.includes('unauthenticated') || errorMsg?.includes('JWT')
                  ? router.replace('/(auth)/login')
                  : router.replace('/onboarding/frequency')
              }
            >
              <Text style={styles.errorBtnLabel}>Try again</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Floating particle ────────────────────────────────────────────────────────

type ParticleProps = {
  left: string;
  top: string;
  size: number;
  delay: number;
  duration: number;
};

const PARTICLES: ParticleProps[] = [
  { left: '8%',  top: '20%', size: 6,  delay: 0,    duration: 14000 },
  { left: '85%', top: '15%', size: 4,  delay: 1500, duration: 18000 },
  { left: '15%', top: '70%', size: 8,  delay: 800,  duration: 12000 },
  { left: '78%', top: '78%', size: 5,  delay: 2400, duration: 16000 },
  { left: '50%', top: '88%', size: 7,  delay: 3000, duration: 20000 },
  { left: '92%', top: '45%', size: 5,  delay: 1200, duration: 15000 },
  { left: '5%',  top: '50%', size: 6,  delay: 2000, duration: 17000 },
  { left: '45%', top: '12%', size: 4,  delay: 3500, duration: 13000 },
];

function FloatingParticle({ left, top, size, delay, duration }: ParticleProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1, duration, delay,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0, duration: 0, useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay, duration]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.4, 0.4, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: left as any,
        top: top as any,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,180,163,0.35)',
        transform: [{ translateY }, { translateX }],
        opacity,
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  center: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },

  // Flower
  flowerWrap: {
    width: 148, height: 148,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  flowerGlow: {
    position: 'absolute',
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: C.primary,
  },

  // Glass card
  cardWrap: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  card: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(255,248,246,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 24,
  },
  cardTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24, lineHeight: 32, letterSpacing: -0.3,
    color: C.onSurface, textAlign: 'center', marginBottom: 6,
  },
  cardBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 22,
    color: C.onSurfaceVariant, textAlign: 'center',
    maxWidth: 240,
  },

  // Progress
  progressTrack: {
    width: 192, height: 4,
    borderRadius: 9999,
    backgroundColor: C.surfaceVariant,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: C.primary,
  },

  // Quote
  quoteWrap: {
    maxWidth: 320,
    paddingHorizontal: 8,
  },
  quote: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 16, lineHeight: 24, letterSpacing: -0.1,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.85,
  },

  // Error overlay
  errorOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,248,246,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#5c4742',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  errorTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28,
    color: C.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 22,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBtn: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 9999,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBtnLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.28,
    color: '#ffffff',
  },
});
