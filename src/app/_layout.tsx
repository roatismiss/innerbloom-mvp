import {
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    useFonts,
} from '@expo-google-fonts/nunito-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { setAudioModeAsync } from 'expo-audio';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { tokens } from '../constants/theme';
import { useAnalyticsScreenTracking } from '../lib/analytics';
import { AuthBootstrap } from '../lib/queries/auth';
import { usePushNotificationsBootstrap } from '../lib/queries/notifications';
import { useNotificationsBadgeSubscription } from '../lib/queries/notifications-inbox';
import { queryClient } from '../lib/queries/query-client';
import { initSentry, Sentry } from '../lib/sentry';

// Initialise crash reporting as early as possible (no-op without a DSN).
initSentry();

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  // useFonts returns [loaded, error]. The fonts are bundled assets, but native
  // font registration can still fail on some Android OEM/WebView builds. If we
  // gate the whole tree on `loaded` alone and ignore `error`, a registration
  // failure leaves the app stuck on the splash forever. So we also release on
  // `fontError` and let the app render with the system fallback font.
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Reels ambient loops should:
  //   - play even when the iOS silent switch is on (this is intentional —
  //     ambient audio IS the experience, same as Calm / Headspace / Spotify)
  //   - stop when the user backgrounds the app (battery; also they're done
  //     listening when they leave)
  //   - mix with other audio (so a user playing their own music keeps it)
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {
      // Non-fatal: worst case the reels play with default audio session.
    });
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <AuthBootstrap />
            <NotificationsBootstrap />
            <NotificationsBadgeBootstrap />
            <AnalyticsBootstrap />
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
            <View style={{ flex: 1, backgroundColor: tokens.light.surface }}>
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="age-gate" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(main)" />
                <Stack.Screen name="legal" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="match" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </View>
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Mounts push-token registration + tap deep-linking. Lives as a tiny sibling
// so it has access to the auth store (set up by <AuthBootstrap />) without
// adding noise to the main RootLayout body.
function NotificationsBootstrap() {
  usePushNotificationsBootstrap();
  return null;
}

// Single global Realtime subscription that keeps the unread-notifications
// badge fresh. Lives here (not in screen components) because multiple screens
// render the badge — mounting the subscription in each would collide on the
// channel name and crash on the second mount.
function NotificationsBadgeBootstrap() {
  useNotificationsBadgeSubscription();
  return null;
}

// Fires a PostHog screen view on every route change. Lives here (inside the
// expo-router context) so usePathname() resolves the active route.
function AnalyticsBootstrap() {
  useAnalyticsScreenTracking();
  return null;
}

// Sentry.wrap enables native crash + performance instrumentation on the root.
// It's a passthrough when Sentry isn't initialised (no DSN), so this is safe
// to keep wired in all environments.
export default Sentry.wrap(RootLayout);
