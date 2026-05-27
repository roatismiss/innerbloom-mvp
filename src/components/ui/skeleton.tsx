import { useEffect } from 'react';
import { type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { motion } from '@/constants/theme';

import { useTokens } from './use-scheme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  cornerRadius?: number;
}

export function Skeleton({
  width = '100%',
  height = 16,
  cornerRadius = 6,
}: SkeletonProps) {
  const t = useTokens();
  const opacity = useSharedValue(motion.skeleton.shimmerOpacity);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.1, {
        duration: motion.skeleton.shimmerMs / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          backgroundColor: t.ink.primary,
          borderRadius: cornerRadius,
        },
        animated,
      ]}
    />
  );
}
