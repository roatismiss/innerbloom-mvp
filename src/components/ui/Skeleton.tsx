import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ui } from '@/constants/palette';

// Soft shimmer placeholder used while content loads — replaces the default
// ActivityIndicator spinners (which read as web-like). Honors the OS
// "Reduce Motion" setting: when on, it renders a static tint with no pulse.
//
// Shimmer timing matches the design system intent (≈1200ms, very low opacity
// delta) so it whispers rather than flashes — the way Calm / Headspace load.

export function Skeleton({
  width,
  height,
  radius = 12,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.6 : 0.45 + progress.value * 0.4,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: radius,
          backgroundColor: ui.surfaceContainerHigh,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Convenience: a stacked card skeleton matching the feed/list rhythm.
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        backgroundColor: ui.surfaceContainerLowest,
        borderRadius: 28,
        padding: 20,
        gap: 14,
        borderWidth: 1,
        borderColor: 'rgba(219,193,187,0.15)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="55%" height={12} radius={6} />
          <Skeleton width="35%" height={10} radius={5} />
        </View>
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '70%' : '100%'} height={12} radius={6} />
      ))}
    </View>
  );
}
