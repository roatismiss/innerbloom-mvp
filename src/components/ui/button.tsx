import { radius } from '@/constants/theme';

import { Text } from './text';
import { Touchable } from './touchable';
import { useTokens } from './use-scheme';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  haptic?: 'selection' | 'success' | 'warning';
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  haptic = 'selection',
  disabled = false,
}: ButtonProps) {
  const t = useTokens();
  const isPrimary = variant === 'primary';

  return (
    <Touchable
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        height: 52,
        paddingHorizontal: 24,
        borderRadius: radius.pill,
        backgroundColor: isPrimary ? t.ink.primary : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: disabled ? 0.32 : 1,
      }}
    >
      <Text
        variant="bodyEmphasized"
        color={isPrimary ? t.surface : t.ink.primary}
      >
        {label}
      </Text>
    </Touchable>
  );
}
