import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { typography } from '@/constants/theme';

import { useTokens } from './use-scheme';

type Variant = keyof typeof typography;
type Ink = 'primary' | 'secondary' | 'tertiary';

export interface TextProps extends RNTextProps {
  variant?: Variant;
  ink?: Ink;
  color?: string;
}

export function Text({
  variant = 'body',
  ink = 'primary',
  color,
  style,
  ...rest
}: TextProps) {
  const t = useTokens();
  return (
    <RNText
      style={[typography[variant], { color: color ?? t.ink[ink] }, style]}
      {...rest}
    />
  );
}
