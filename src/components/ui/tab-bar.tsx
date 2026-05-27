import { View } from 'react-native';

import { emotions, space, type Emotion } from '@/constants/theme';

import { Icon } from './icon';
import { Text } from './text';
import { Touchable } from './touchable';
import { useTokens } from './use-scheme';

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
  symbol?: string;
}

export interface TabBarProps {
  items: TabItem[];
  activeKey: string;
  /** The center tab gets a filled accent circle — emotion-driven. */
  accent: Emotion;
  centerKey?: string;
  onChange?: (key: string) => void;
}

const BAR_HEIGHT = 64;

// Custom bottom tab bar. One tab (centerKey) renders as a solid filled
// circle in the user's current emotion accent; the rest are monochrome
// line icons with sans captions. Sits flat against the surface — never
// on a translucent blur, never on its own card.
export function TabBar({
  items,
  activeKey,
  accent,
  centerKey,
  onChange,
}: TabBarProps) {
  const t = useTokens();

  return (
    <View
      style={{
        height: BAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: space[2],
        paddingHorizontal: space[2],
        backgroundColor: t.surface,
        borderTopWidth: 0.5,
        borderTopColor: t.hairline,
      }}
    >
      {items.map((item) => (
        <TabSlot
          key={item.key}
          item={item}
          active={item.key === activeKey}
          center={item.key === centerKey}
          accent={accent}
          onPress={() => onChange?.(item.key)}
        />
      ))}
    </View>
  );
}

function TabSlot({
  item,
  active,
  center,
  accent,
  onPress,
}: {
  item: TabItem;
  active: boolean;
  center: boolean;
  accent: Emotion;
  onPress: () => void;
}) {
  const t = useTokens();
  const { from } = emotions[accent];
  const iconName = item.icon ?? item.symbol ?? item.key;

  if (center) {
    return (
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        style={{ alignItems: 'center', width: 64 }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: from,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -6,
          }}
        >
          <Icon name={iconName} size={22} color={t.surfaceRaised} />
        </View>
      </Touchable>
    );
  }

  const tint = active ? t.ink.primary : t.ink.tertiary;

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={{ alignItems: 'center', width: 56, gap: 3 }}
    >
      <Icon name={iconName} size={20} color={tint} />
      <Text
        color={tint}
        style={{
          fontFamily: 'NunitoSans_500Medium',
          fontSize: 10,
          lineHeight: 12,
          letterSpacing: 0.2,
        }}
      >
        {item.label}
      </Text>
    </Touchable>
  );
}
