import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { queryClient } from '../lib/queries/query-client';
import { reportError } from '../lib/sentry';

// ============================================================================
// Global error boundary.
// ============================================================================
// React unmounts the entire tree on the first uncaught render-phase throw. In a
// production build with no boundary that means a permanent blank/white screen
// with no way out except force-killing the app. This boundary catches that
// throw and shows a calm "something went wrong — try again" screen with a real
// recovery path (reset the boundary + drop the query cache so the retry refetches
// clean). Wrap the root navigator with it.
//
// Caught crashes are reported via reportError() (src/lib/sentry.ts), which
// forwards to Sentry once EXPO_PUBLIC_SENTRY_DSN is set and is a no-op until
// then. They're also console.error'd for dev/device-log visibility.
// ============================================================================

const C = {
  surface:          '#fff8f6',
  surfaceRaised:    '#ffffff',
  primary:          '#994531',
  primaryContainer: '#e8836b',
  onPrimaryCont:    '#641e0e',
  onSurface:        '#281814',
  onSurfaceVariant: '#55433e',
  outlineVariant:   '#dbc1bb',
} as const;

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Fan the crash out to Sentry (no-op until a DSN is configured) and also
    // log it so it's visible in dev / device logs.
    reportError(error, { componentStack: info?.componentStack ?? null });
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] uncaught render error', error, info?.componentStack);
  }

  handleReset = () => {
    // Drop cached data so the re-render refetches from scratch instead of
    // re-throwing on the same poisoned cache entry, then clear the boundary.
    try {
      queryClient.clear();
    } catch {
      /* ignore */
    }
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={s.root}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <MaterialCommunityIcons name="flower-tulip-outline" size={40} color={C.primary} />
          </View>
          <Text style={s.title}>Let&apos;s take a breath</Text>
          <Text style={s.body}>
            Something went wrong on our side. Your data is safe — tap below to
            return to a fresh start.
          </Text>
          <Pressable
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
          >
            <Text style={s.btnText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.surfaceRaised,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#5c4742',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 9999,
    backgroundColor: 'rgba(153,69,49,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 28,
  },
  btn: {
    height: 56,
    paddingHorizontal: 40,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#994531',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  btnPressed: { opacity: 0.85 },
  btnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.8,
    color: C.onPrimaryCont,
  },
});
