import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUIStore } from '../../store/ui';

// ─── Design tokens (1:1 with the HTML reference) ─────────────────────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh:   '#ffe2db',
  surfaceVariant:         '#fadcd5',
  primaryFixed:           '#ffdad2',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  onPrimaryContainer:     '#641e0e',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
  outlineVariant:         '#dbc1bb',
  outline:                '#88726d',
} as const;

const HERO_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBsQ9wjjx58wnl3MMuvbjB6Z0nipcuZU6WdkAYCv1MwY2YDSD4Llcn8ytFUPfcOvj8EI9KVmq1fO5oxUGvLhi-Z8yCzqrPWqLMbHteaGV0_jg4DvPVQhyOsqt5sWKwMCmCCpvo8j9NR05vdXV4klrbYb9Qzogeg9mvuZh1XK46mmRXgzwPnBV1ytB8Rii-4rVdNKdaETL9oyN-MskYm5MbAcb2VBBT0IXsBkLLsRltsKMwQKSxMxvd_QxbE60cok4yY0rssEc5le5rD';
const AVATAR_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCFbhQWcboFUaa1WTBk88tOXoQtIuL2nniGilc4MI_p7bEas5LX2qs53Dc1Da95BJ5Ok2AtlIrTElhrlGjrTIetRUujTuMGVWQsnTE7nQCkJpuPzBFNzgoAvjvlyBw6xMz1CScL_quu1hvvpBO9_bemalIpN_ARsBWs-TMvxQ9ztHcWbk0rwQHP6n72eAJiDpDqHDlnt1RlpKhU_rL-nRs0e8ThLSufghSyoLQuF3jOCSjZE6UDzHIq_X1qrBNXPRmRPPf-6PN46nD0';

export default function SoulMatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openDrawer = useUIStore((s) => s.openDrawer);

  // animate-float — 6s ease-in-out infinite, translateY 0 ↔ -10
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,   { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [floatY]);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  function handleStart() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/match/start');
  }

  function handleMenu() {
    void Haptics.selectionAsync();
    openDrawer();
  }

  function handleCircle() {
    void Haptics.selectionAsync();
    router.push('/(main)/bloom-circle');
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* bloom-bg: radial-gradient(circle at center, #fff1ed 0%, #fff8f6 100%) */}
      <View style={s.bgGlowCenter} pointerEvents="none" />
      <View style={s.bgGlowBottom}  pointerEvents="none" />

      {/* TopAppBar — fixed top */}
      <Animated.View entering={FadeInUp.springify()} style={s.topBar}>
        <View style={s.topLeft}>
          <TouchableOpacity onPress={handleMenu} activeOpacity={0.7} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Soul Match</Text>
        </View>
        <View style={s.topRight}>
          <TouchableOpacity activeOpacity={0.85} style={s.circlePill} onPress={handleCircle}>
            <MaterialCommunityIcons name="flower-outline" size={16} color={C.onPrimaryContainer} />
            <Text style={s.circlePillText}>Bloom Circle</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={s.avatarRing} onPress={() => router.push('/(main)/profile')}>
            <Image source={{ uri: AVATAR_IMG }} style={s.avatarImg} contentFit="cover" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Main — centered hero + cluster */}
      <View style={[s.main, { paddingBottom: insets.bottom + 24 }]}>
        {/* Hero Illustration with float + soft glow */}
        <Animated.View style={[s.heroWrap, floatStyle]}>
          <View style={s.heroGlow} pointerEvents="none" />
          <Image
            source={{ uri: HERO_IMG }}
            style={s.heroImg}
            contentFit="cover"
            transition={400}
          />
        </Animated.View>

        {/* Content Cluster */}
        <View style={s.cluster}>
          <Animated.View entering={FadeInDown.delay(80).springify()} style={s.titleStack}>
            <Text style={s.title}>Soul Match</Text>
            <Text style={s.subtitle}>
              Discover a sanctuary where hearts find resonance and spirits align.
            </Text>
          </Animated.View>

          {/* Quote Card */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={s.quoteCard}>
            <Text style={s.quoteText}>
              "Your soul knows the way. Every connection is a new blooming."
            </Text>
            <View style={s.quoteAttrib}>
              <View style={s.quoteLine} />
              <Text style={s.quoteAuthor}>WILLOW REED</Text>
              <View style={s.quoteLine} />
            </View>
          </Animated.View>

          {/* Action CTA */}
          <Animated.View entering={FadeInDown.delay(240).springify()} style={s.ctaWrap}>
            <TouchableOpacity style={s.cta} activeOpacity={0.87} onPress={handleStart}>
              <Text style={s.ctaText}>Start Discovery</Text>
              <MaterialCommunityIcons name="auto-fix" size={22} color={C.onPrimaryContainer} />
            </TouchableOpacity>
          </Animated.View>
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
    overflow: 'hidden',
  },

  // bloom-bg: soft radial wash + warm bottom glow
  bgGlowCenter: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    marginLeft: -260,
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: C.surfaceContainerLow,
    opacity: 0.9,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -240,
    width: 480,
    height: 360,
    borderRadius: 240,
    backgroundColor: C.primaryFixed,
    opacity: 0.28,
  },

  // TopAppBar — px-container-padding(24), py-stack-gap-sm(8)
  topBar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,  // stack-gap-md
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24,         // headline-md
    lineHeight: 32,
    color: C.primary,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  circlePillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onPrimaryContainer,
    letterSpacing: 0.2,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: C.surfaceVariant,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },

  // Main — flex-1 centered
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Hero — max-w-[320px] mb-stack-gap-lg(32), animate-float
  heroWrap: {
    width: 320,
    maxWidth: '100%',
    aspectRatio: 1,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 9999,
    backgroundColor: C.primaryFixed,
    opacity: 0.20,
  },
  heroImg: {
    width: '100%',
    height: '100%',
    borderRadius: 32, // rounded-lg = 2rem
    shadowColor: '#5C4742',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },

  // Content Cluster — text-center max-w-[480px] space-y-stack-gap-md(16)
  cluster: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },

  // Title + subtitle stack — space-y-stack-gap-sm(8)
  titleStack: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,         // headline-xl-mobile
    lineHeight: 40,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: -0.6,  // tracking-tight
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 18,         // body-lg
    lineHeight: 29,       // 1.6
    color: C.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Quote Card — bg-surface-container-lowest p-stack-gap-lg rounded-lg border
  // mt-stack-gap-lg(32) replicated as marginTop
  quoteCard: {
    marginTop: 32,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 32,     // rounded-lg = 2rem
    padding: 32,          // p-stack-gap-lg
    borderWidth: 1,
    borderColor: 'rgba(250,220,213,0.30)',  // surface-variant/30
    width: '100%',
    shadowColor: '#5C4742',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  quoteText: {
    fontFamily: 'NunitoSans_400Regular',
    fontStyle: 'italic',
    fontSize: 16,         // body-md
    lineHeight: 26,       // 1.6
    color: C.onSurface,
    textAlign: 'center',
    marginBottom: 8,      // mb-stack-gap-sm
  },
  quoteAttrib: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quoteLine: {
    width: 32,            // w-8
    height: 1,
    backgroundColor: C.outlineVariant,
  },
  quoteAuthor: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,         // label-md
    lineHeight: 20,
    color: C.primary,
    letterSpacing: 2.4,   // tracking-widest
    textTransform: 'uppercase',
  },

  // CTA wrapper — pt-stack-gap-lg(32)
  ctaWrap: {
    width: '100%',
    paddingTop: 32,
  },
  // CTA — py-4 px-stack-gap-lg, bg-primary-container, rounded-full
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    shadowColor: C.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ctaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,         // headline-sm
    lineHeight: 28,
    color: C.onPrimaryContainer,
    fontWeight: '600',
  },
});
