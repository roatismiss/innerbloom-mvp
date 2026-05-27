import { View } from 'react-native';

import { space } from '@/constants/theme';

import { Text } from './text';
import { useTokens } from './use-scheme';

export interface QuoteBlockProps {
  children: string;
}

// Editorial quote moment — large faded opening mark, then italic serif body.
// One per screen, never more. Center-aligned only here; never in cards.
export function QuoteBlock({ children }: QuoteBlockProps) {
  const t = useTokens();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: space[4] }}>
      <Text
        variant="display1"
        color={t.ink.tertiary}
        style={{ fontSize: 72, lineHeight: 64, opacity: 0.35 }}
      >
        “
      </Text>
      <Text
        variant="quote"
        ink="secondary"
        style={{ textAlign: 'center', marginTop: space[1] }}
      >
        {children}
      </Text>
    </View>
  );
}
