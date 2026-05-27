import { View } from 'react-native';

import { emotions, space, type Emotion } from '@/constants/theme';
import { moodLabel, moodOrder } from '@/lib/mood';

import { Text } from './text';
import { Touchable } from './touchable';
import { useTokens } from './use-scheme';

export interface MoodPickProps {
  selected?: Emotion;
  onSelect?: (emotion: Emotion) => void;
}

const DOT = 36;

// Horizontal row of mood selectors. Each item: a circular wash background
// with the emotion's solid color filling, label below in sans footnote.
// Selected state lifts the filled color to full opacity, others stay washed.
export function MoodPick({ selected, onSelect }: MoodPickProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      {moodOrder.map((emotion) => (
        <MoodItem
          key={emotion}
          emotion={emotion}
          active={selected === emotion}
          onPress={() => onSelect?.(emotion)}
        />
      ))}
    </View>
  );
}

function MoodItem({
  emotion,
  active,
  onPress,
}: {
  emotion: Emotion;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTokens();
  const { from, wash } = emotions[emotion];

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={moodLabel[emotion]}
      accessibilityState={{ selected: active }}
      style={{ alignItems: 'center', width: DOT + 16, gap: space[2] }}
    >
      <View
        style={{
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          backgroundColor: active ? from : wash,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: active ? 0 : 1,
          borderColor: t.hairline,
        }}
      >
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: active ? t.surfaceRaised : from,
          }}
        />
      </View>
      <Text
        variant="footnote"
        ink={active ? 'primary' : 'secondary'}
        style={{ fontWeight: active ? '500' : '400' }}
      >
        {moodLabel[emotion]}
      </Text>
    </Touchable>
  );
}
