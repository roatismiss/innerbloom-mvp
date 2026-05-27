import { View } from 'react-native';

import { space } from '@/constants/theme';

import { Icon } from './icon';
import { Text } from './text';
import { Touchable } from './touchable';
import { useTokens } from './use-scheme';

export interface TopBarProps {
  leftIcon?: string;
  rightIcon?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  wordmark?: string;
}

// Editorial top nav — brand wordmark center, single icon left + right.
// Never use for navigation back (the OS gesture handles that); these icons
// are for global affordances.
export function TopBar({
  leftIcon = 'ion:leaf-outline',
  rightIcon = 'bell',
  onLeftPress,
  onRightPress,
  wordmark = 'InnerBloom',
}: TopBarProps) {
  const t = useTokens();

  return (
    <View
      style={{
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <IconSlot icon={leftIcon} onPress={onLeftPress} color={t.ink.primary} />
      <Text variant="wordmark" ink="primary">
        {wordmark}
      </Text>
      <IconSlot icon={rightIcon} onPress={onRightPress} color={t.ink.primary} />
    </View>
  );
}

function IconSlot({
  icon,
  onPress,
  color,
}: {
  icon: string;
  onPress?: () => void;
  color: string;
}) {
  return (
    <Touchable
      onPress={onPress}
      haptic="selection"
      hitSlop={12}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={20} color={color} />
    </Touchable>
  );
}
