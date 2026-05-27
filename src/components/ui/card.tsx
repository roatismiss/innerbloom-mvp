import { View, type ViewProps } from 'react-native';

import {
  elevation,
  emotions,
  layout,
  radius,
  type Emotion,
} from '@/constants/theme';

import { useTokens } from './use-scheme';

export interface CardProps extends ViewProps {
  variant?: 'elevated' | 'flat' | 'sunk';
  accent?: Emotion;
  padding?: number;
}

export function Card({
  variant = 'elevated',
  accent,
  padding = layout.cardPadding,
  style,
  children,
  ...rest
}: CardProps) {
  const t = useTokens();
  const surface = variant === 'sunk' ? t.surfaceSunk : t.surfaceRaised;
  const elev = variant === 'elevated' ? elevation.resting : elevation.flat;

  return (
    <View
      style={[
        {
          backgroundColor: surface,
          borderRadius: radius.card,
          padding,
          overflow: 'hidden',
        },
        elev,
        variant === 'flat' && { borderColor: t.hairline },
        style,
      ]}
      {...rest}
    >
      {accent ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            backgroundColor: emotions[accent].from,
          }}
        />
      ) : null}
      {children}
    </View>
  );
}
