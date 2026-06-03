import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ui as C } from '@/constants/palette';
// Design tokens centralized in src/constants/palette.ts.

const HERO_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBsQ9wjjx58wnl3MMuvbjB6Z0nipcuZU6WdkAYCv1MwY2YDSD4Llcn8ytFUPfcOvj8EI9KVmq1fO5oxUGvLhi-Z8yCzqrPWqLMbHteaGV0_jg4DvPVQhyOsqt5sWKwMCmCCpvo8j9NR05vdXV4klrbYb9Qzogeg9mvuZh1XK46mmRXgzwPnBV1ytB8Rii-4rVdNKdaETL9oyN-MskYm5MbAcb2VBBT0IXsBkLLsRltsKMwQKSxMxvd_QxbE60cok4yY0rssEc5le5rD';

export default function SoulMatchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleStart() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/match/start');
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* bloom-bg: radial-gradient(circle at center, #fff1ed 0%, #fff8f6 100%) */}
      <View style={s.bgGlowCenter} pointerEvents="none" />
      <View style={s.bgGlowBottom}  pointerEvents="none" />

      {/* Main — centered hero + cluster */}
      <View style={[s.main, { paddingBottom: insets.bottom + 24 }]}>
        {/* Hero Illustration — static, no float animation */}
        <View style={s.heroWrap}>
          <View style={s.heroGlow} pointerEvents="none" />
          <Image
            source={{ uri: HERO_IMG }}
            style={s.heroImg}
            contentFit="cover"
            transition={400}
          />
        </View>

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
              <Text style={s.quoteAuthor}>INNERBLOOM</Text>
              <View style={s.quoteLine} />
            </View>
          </Animated.View>

          {/* Action CTA */}
          <Animated.View entering={FadeInDown.delay(240).springify()} style={s.ctaWrap}>
            <TouchableOpacity
              style={s.cta}
              activeOpacity={0.87}
              onPress={handleStart}
              accessibilityRole="button"
              accessibilityLabel="Start discovery"
            >
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
    // Editorial hero — Fraunces gives the Soul Match landing its boutique
    // voice. (Was NunitoSans with a phantom fontWeight:'700' that no-ops on a
    // named font family.)
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,         // headline-xl-mobile
    lineHeight: 40,
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
