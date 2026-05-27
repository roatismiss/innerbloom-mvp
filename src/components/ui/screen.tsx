import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { layout, space } from '@/constants/theme';

import { useTokens } from './use-scheme';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  /** Horizontal padding override. Defaults to layout.screenPaddingH (20pt). */
  paddingH?: number;
}

const DEFAULT_EDGES: Edge[] = ['top', 'left', 'right'];

export function Screen({
  children,
  scroll = false,
  edges = DEFAULT_EDGES,
  paddingH = layout.screenPaddingH,
}: ScreenProps) {
  const t = useTokens();

  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: t.surface }}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: paddingH,
            paddingBottom: space[8],
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: paddingH }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
