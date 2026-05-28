import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  surface:             '#fff8f6',
  surfaceContainerLow: '#fff1ed',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh:'#ffe2db',
  surfaceVariant:      '#fadcd5',
  primaryFixed:        '#ffdad2',
  primary:             '#994531',
  primaryContainer:    '#e8836b',
  onPrimaryContainer:  '#641e0e',
  onSurface:           '#281814',
  onSurfaceVariant:    '#55433e',
  outlineVariant:      '#dbc1bb',
  outline:             '#88726d',
} as const;

const HERO_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBsQ9wjjx58wnl3MMuvbjB6Z0nipcuZU6WdkAYCv1MwY2YDSD4Llcn8ytFUPfcOvj8EI9KVmq1fO5oxUGvLhi-Z8yCzqrPWqLMbHteaGV0_jg4DvPVQhyOsqt5sWKwMCmCCpvo8j9NR05vdXV4klrbYb9Qzogeg9mvuZh1ytB8Rii-4rVdNKdaETL9oyN-MskYm5MbAcb2VBBT0IXsBkLLsRltsKMwQKSxMxvd_QxbE60cok4yY0rssEc5le5rD';

export default function SoulMatchStartScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();

  function handleStart() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/match');
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ─── Main content ─── */}
      <View style={[s.content, { paddingBottom: insets.bottom + 32 }]}>

        {/* Static hero illustration */}
        <View style={s.heroWrap}>
          <Image
            source={{ uri: HERO_IMG }}
            style={s.heroImg}
            contentFit="cover"
            transition={400}
          />
        </View>

        {/* Text cluster */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={s.textCluster}>
          <Text style={s.title}>Soul Match</Text>
          <Text style={s.subtitle}>
            Discover a sanctuary where hearts find resonance and spirits align.
          </Text>
        </Animated.View>

        {/* Quote card */}
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

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(240).springify()} style={{ width: '100%' }}>
          <TouchableOpacity style={s.cta} activeOpacity={0.87} onPress={handleStart}>
            <Text style={s.ctaText}>Start Discovery</Text>
            <MaterialCommunityIcons name="auto-fix" size={20} color={C.onPrimaryContainer} />
          </TouchableOpacity>
        </Animated.View>

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

  // Main content — vertically centered
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },

  // Hero
  heroWrap: {
    width: 280,
    height: 280,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImg: {
    width: 280,
    height: 280,
    borderRadius: 32,
    shadowColor: '#5C4742',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },

  // Text cluster
  textCluster: {
    alignItems: 'center',
    gap: 10,
    maxWidth: 340,
  },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: C.primary,
    letterSpacing: -0.32,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 25,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Quote card
  quoteCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.30)',
    width: '100%',
    gap: 16,
    shadowColor: '#5C4742',
    shadowOpacity: 0.07,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  quoteText: {
    fontFamily: 'NunitoSans_400Regular',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 24,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  quoteAttrib: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  quoteLine: {
    width: 28,
    height: 1,
    backgroundColor: C.outlineVariant,
  },
  quoteAuthor: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.primary,
    letterSpacing: 2,
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 56,
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
    fontSize: 16,
    lineHeight: 22,
    color: C.onPrimaryContainer,
    letterSpacing: 0.3,
  },
});
