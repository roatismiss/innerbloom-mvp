import { View } from 'react-native';

import { emotions, radius, space, type Emotion } from '@/constants/theme';

import { EmotionDot } from './emotion-dot';
import { Text } from './text';
import { useTokens } from './use-scheme';

export interface PillProps {
  label: string;
  emotion?: Emotion;
  count?: number;
}

export function Pill({ label, emotion, count }: PillProps) {
  const t = useTokens();
  const bg = emotion ? emotions[emotion].wash : t.surfaceSunk;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: space[3],
        paddingVertical: space[1],
        borderRadius: radius.pill,
        backgroundColor: bg,
        gap: space[2],
        alignSelf: 'flex-start',
      }}
    >
      {emotion ? <EmotionDot emotion={emotion} size={6} /> : null}
      <Text variant="footnote" ink="secondary">
        {label}
      </Text>
      {count !== undefined ? (
        <Text
          variant="footnote"
          ink="tertiary"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {count}
        </Text>
      ) : null}
    </View>
  );
}
