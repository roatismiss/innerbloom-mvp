import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Canonical InnerBloom tokens (per AGENTS.md). Mirrored locally so this
// screen stays self-contained and matches the HTML reference exactly.
const C = {
  surface:               '#fff8f6',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainerHigh:  '#ffe2db',
  secondaryContainer:    '#90f2fc',
  onSecondaryContainer:  '#006f77',
  primary:               '#994531',
  tertiaryFixedDim:      '#ffb1c4',
  primaryFixed:          '#ffdad2',
  secondaryFixed:        '#90f2fc',
  tertiaryFixed:         '#ffd9e1',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
};

const REDIRECT_AFTER_MS = 1800;

export default function Splash() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/onboarding'), REDIRECT_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.root}>
      {/* Three soft organic blobs — opacity alone gives the diffused look */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobCenter]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      <View style={styles.content}>
        <LogoBadge />

        <Text style={styles.brand}>InnerBloom</Text>
        <Text style={styles.tagline}>Safe Place for the Human Mind</Text>

        <View style={styles.loaderStack}>
          <PulseDots />
          <Text style={styles.loaderLabel}>HARMONIZING</Text>
        </View>
      </View>
    </View>
  );
}

function LogoBadge() {
  return (
    <View style={styles.badge}>
      <View style={styles.badgeWash}>
        <MaterialCommunityIcons
          name="head-heart-outline"
          size={64}
          color={C.onSecondaryContainer}
        />
      </View>
    </View>
  );
}

function PulseDots() {
  return (
    <View style={styles.dotsRow}>
      <PulseDot color={C.primary} delay={0} />
      <PulseDot color={C.secondaryContainer} delay={200} />
      <PulseDot color={C.tertiaryFixedDim} delay={400} />
    </View>
  );
}

function PulseDot({ color, delay }: { color: string; delay: number }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.55,
  },
  blobTopLeft: {
    width: 400,
    height: 400,
    top: -80,
    left: -80,
    backgroundColor: C.secondaryFixed,
  },
  blobCenter: {
    width: 500,
    height: 500,
    top: '50%',
    left: '50%',
    marginLeft: -250,
    marginTop: -250,
    backgroundColor: C.surfaceContainerHigh,
    opacity: 0.45,
  },
  blobBottomRight: {
    width: 360,
    height: 360,
    bottom: -40,
    right: -60,
    backgroundColor: C.tertiaryFixed,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    maxWidth: 600,
    zIndex: 1,
  },
  badge: {
    width: 144,
    height: 144,
    borderRadius: 32,
    backgroundColor: C.surfaceContainerLow,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#5c4742',
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    }),
  },
  badgeWash: {
    flex: 1,
    backgroundColor: 'rgba(144,242,252,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: C.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
    maxWidth: 280,
    textAlign: 'center',
  },
  loaderStack: {
    marginTop: 48,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 9999,
  },
  loaderLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2.5,
    color: C.outline,
    marginTop: 16,
  },
});
