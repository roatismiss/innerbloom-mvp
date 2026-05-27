import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

type Haptic = 'selection' | 'success' | 'warning' | 'none';

export interface TouchableProps extends Omit<PressableProps, 'children'> {
  haptic?: Haptic;
  children?: ReactNode;
  pressedOpacity?: number;
}

export function Touchable({
  haptic = 'selection',
  onPress,
  style,
  children,
  pressedOpacity = 0.6,
  disabled,
  ...rest
}: TouchableProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={(event) => {
        if (!disabled && haptic !== 'none') fire(haptic);
        onPress?.(event);
      }}
      style={(state) => [
        { opacity: state.pressed ? pressedOpacity : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

function fire(kind: Exclude<Haptic, 'none'>) {
  if (kind === 'selection') void Haptics.selectionAsync();
  else if (kind === 'success')
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
