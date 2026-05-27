import { useColorScheme } from 'react-native';

import { tokens, type Scheme } from '@/constants/theme';

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTokens() {
  return tokens[useScheme()];
}
