import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { ScrollView } from 'react-native';

/**
 * Returns a ref to attach to a ScrollView. Whenever the screen comes into
 * focus (initial mount, tab switch, pop back from a child route), scrolls
 * the view to y=0 immediately. Enforces the project rule that every screen
 * lands at the top when opened, regardless of any preserved tab state.
 */
export function useScrollTopOnFocus() {
  const ref = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      ref.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );
  return ref;
}
