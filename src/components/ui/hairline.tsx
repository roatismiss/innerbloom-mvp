import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTokens } from './use-scheme';

export interface HairlineProps {
  vertical?: boolean;
  color?: string;
  inset?: number;
}

export function Hairline({ vertical = false, color, inset = 0 }: HairlineProps) {
  const t = useTokens();
  const style: ViewStyle = vertical
    ? { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: inset }
    : { height: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: inset };
  return <View style={[style, { backgroundColor: color ?? t.hairline }]} />;
}
