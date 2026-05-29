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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setAudioModeAsync } from 'expo-audio';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

import { tokens } from '../constants/theme';
import { AuthBootstrap } from '../lib/queries/auth';
import { usePushNotificationsBootstrap } from '../lib/queries/notifications';
import { useNotificationsBadgeSubscription } from '../lib/queries/notifications-inbox';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 1 },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

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

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap />
          <NotificationsBootstrap />
          <NotificationsBadgeBootstrap />
          <StatusBar barStyle="dark-content" backgroundColor={tokens.light.surface} />
          <View style={{ flex: 1, backgroundColor: tokens.light.surface }}>
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(main)" />
              <Stack.Screen name="match" options={{ animation: 'slide_from_right' }} />
            </Stack>
          </View>
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
