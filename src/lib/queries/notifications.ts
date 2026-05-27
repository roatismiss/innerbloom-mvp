// ============================================================================
// Push notifications — Expo client integration
// ============================================================================
// Three responsibilities live in this file:
//
//   1. Permission flow + token acquisition (Expo Push API).
//   2. Persisting the token in `user_push_tokens` (one row per device).
//   3. Configuring the foreground/tap handlers so an arriving push either
//      lights up an in-app banner or deep-links the user to the right screen.
//
// REQUIRED INSTALL (one-time):
//   npx expo install expo-notifications
//
// Web is intentionally skipped — Expo's push pipeline targets iOS + Android.
// The web preview app still works, just without OS-level pushes; in-app
// Realtime channels keep state fresh.
// ============================================================================

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '../../store/auth';
import { sb } from './client';

// Show banner + play sound for foreground pushes. Without this, foreground
// notifications are silently dropped on iOS. Skipped on web — the native
// notification subsystem isn't available there and calling this throws.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
      // Legacy aliases for older expo-notifications builds.
      shouldShowAlert:  true,
    } as Notifications.NotificationBehavior),
  });
}

type PushPlatform = 'ios' | 'android' | 'web';

function currentPlatform(): PushPlatform | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return null;
}

// ─── Permission + token acquisition ────────────────────────────────────────

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name:        'InnerBloom',
    importance:  Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor:  '#994531',
  });
}

async function getExpoPushToken(): Promise<string | null> {
  // Physical-device guard. Simulators can't receive pushes.
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;

  // EAS-aware token retrieval. Falls back gracefully in Expo Go.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResult.data ?? null;
  } catch (err) {
    console.warn('[push] getExpoPushTokenAsync failed', err);
    return null;
  }
}

// ─── Persistence ───────────────────────────────────────────────────────────

async function persistTokenToServer(token: string, platform: PushPlatform) {
  const { data: { user } } = await sb().auth.getUser();
  if (!user) return;

  // The unique constraint on `token` means the same physical device that
  // changes accounts moves the row over via upsert.
  const { error } = await sb()
    .from('user_push_tokens')
    .upsert(
      { user_id: user.id, token, platform },
      { onConflict: 'token' },
    );
  if (error) console.warn('[push] persist token failed', error.message);
}

// ─── Tap handler: deep-link into the right screen ─────────────────────────

type PushPayload = {
  type?: string;
  conversation_id?: string;
  request_id?: string;
  match_id?: string;
  context_id?: string;
  context_type?: string;
};

function handleNotificationTap(payload: PushPayload | undefined | null) {
  if (!payload?.type) return;

  switch (payload.type) {
    case 'new_message':
    case 'match_found':
      if (payload.conversation_id) {
        router.push({
          pathname: '/match/conversation',
          params:   { id: payload.conversation_id },
        });
      }
      break;
    case 'kindred_request':
      router.push('/(main)/garden');
      break;
    case 'hug_received':
      // No notification inbox yet — drop them into Community so they can
      // see what landed. Replace with /(main)/inbox once it exists.
      router.push('/(main)/community');
      break;
  }
}

// ─── Public bootstrap hook ─────────────────────────────────────────────────

// Mount once at the top of the tree (after AuthBootstrap). Re-runs token
// registration whenever the signed-in user changes so the row moves with
// account switches on the same device.
export function usePushNotificationsBootstrap() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const lastRegisteredUser = useRef<string | null>(null);

  // 1. Register / re-register on auth change.
  useEffect(() => {
    if (!userId) {
      lastRegisteredUser.current = null;
      return;
    }
    if (lastRegisteredUser.current === userId) return;

    const platform = currentPlatform();
    if (!platform || platform === 'web') {
      lastRegisteredUser.current = userId;
      return;
    }

    (async () => {
      const token = await getExpoPushToken();
      if (!token) return;
      await persistTokenToServer(token, platform);
      lastRegisteredUser.current = userId;
    })();
  }, [userId]);

  // 2. Tap handlers — foreground + background. Skipped on web: neither the
  // listener nor `getLastNotificationResponseAsync` is implemented there,
  // and calling them throws a "method not available on web" runtime error.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as PushPayload;
        handleNotificationTap(data);
      },
    );

    // Handle the cold-start case: user tapped a notification while the app
    // was killed. The response is queued; fetch it on mount.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as PushPayload;
        handleNotificationTap(data);
      }
    });

    return () => {
      responseSub.remove();
    };
  }, []);
}

// ─── Misc ──────────────────────────────────────────────────────────────────

// Unregister this device on sign-out so the user doesn't keep getting
// pushes for an account they left.
export async function unregisterPushTokenForCurrentDevice() {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync();
    const token = tokenResult.data;
    if (!token) return;
    await sb().from('user_push_tokens').delete().eq('token', token);
  } catch {
    // Swallow — sign-out flow shouldn't fail because push unregister failed.
  }
}
