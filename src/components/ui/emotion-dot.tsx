import { View } from 'react-native';

import { emotions, type Emotion } from '@/constants/theme';

export interface EmotionDotProps {
  emotion: Emotion;
  size?: number;
}

export function EmotionDot({ emotion, size = 8 }: EmotionDotProps) {
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: emotions[emotion].from,
      }}
    />
  );
}
