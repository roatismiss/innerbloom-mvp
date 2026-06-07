import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { PostHog, type PostHogCustomStorage } from 'posthog-react-native';

// ─── PostHog product analytics ──────────────────────────────────────────────
//
// One thin wrapper over PostHog so the rest of the app never touches the SDK
// directly. Call `track(...)` / `identify(...)` / `resetAnalytics()` from
// anywhere (components, mutations, stores). Swapping analytics vendors later
// means editing only this file.
//
// PRIVACY — this is a mental-health app (PH Data Privacy Act, GDPR-like).
//   • NEVER pass free-text the user authored: journal entries, chat messages,
//     mood "anchor words", profile bios. Track THAT an action happened, not its
//     content (e.g. `journal_entry_created`, not the entry text).
//   • Mood category/intensity ARE health-adjacent. We send them because product
//     decisions need them, but they're coarse (category + 1–5), never the note.
//   • Distinct ID is the Supabase user id; the human-facing name is the app's
//     anonymous alias, so PostHog never sees a real name.
//   • `optOutAnalytics()` is wired and ready for a consent toggle in settings.
//
// Web/PWA note: we deliberately did NOT install `expo-file-system` (it breaks
// React Native Web). Persistence runs on AsyncStorage, which works identically
// on native and web (localStorage under the hood).

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
// Must match the cloud your PostHog project lives on. This project is on US
// cloud (us.posthog.com); override with EXPO_PUBLIC_POSTHOG_HOST for EU
// (https://eu.i.posthog.com) or a self-hosted instance.
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// AsyncStorage already satisfies PostHogCustomStorage, but wrapping it keeps the
// types exact and sidesteps PostHog's expo-file-system auto-detection entirely.
const customStorage: PostHogCustomStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

// PostHog's constructor synchronously reads persisted state through
// `customStorage.getItem` → AsyncStorage, whose web build dereferences
// `window.localStorage`. During Expo's static web export the route modules run
// in Node, where `window` is undefined, so instantiating here throws
// "window is not defined" and fails the build (`expo export --platform web`).
// React Native and the browser client both define `window`; only the Node
// static render doesn't — and that render must not emit analytics anyway. So we
// skip instantiation there and let every wrapper below no-op.
const isStaticRender = typeof window === 'undefined';

// `null` when no key is configured (local dev, CI) or during the static render
// — every wrapper below then no-ops, so the app runs fine without analytics.
// No crashes, no warnings spam.
export const posthog: PostHog | null = apiKey && !isStaticRender
  ? new PostHog(apiKey, {
      host,
      customStorage,
      // "Application Opened/Backgrounded/Installed/Updated" — powers retention
      // and DAU/WAU out of the box.
      captureAppLifecycleEvents: true,
      // Flush quickly while we verify the pipe (default is 20). Drop or raise
      // once events are confirmed flowing.
      flushAt: 1,
      // We capture screen views manually from expo-router (see
      // useAnalyticsScreenTracking) — expo-router doesn't support PostHog's
      // automatic screen autocapture.
    })
  : null;

// Dev-only diagnostics: tells you in the console whether the SDK is live and
// logs every capture + network flush. Remove once events are confirmed.
if (__DEV__) {
  if (posthog) {
    posthog.debug();
    // eslint-disable-next-line no-console
    console.log(`[analytics] PostHog LIVE → ${host} (key ${apiKey!.slice(0, 8)}…)`);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[analytics] DISABLED — EXPO_PUBLIC_POSTHOG_KEY is empty at build time. ' +
        'Set it in .env and FULLY restart `npx expo start -c`.',
    );
  }
}

// ─── Event taxonomy ─────────────────────────────────────────────────────────
// Keep this list as the single source of truth. A closed union means a typo
// like `track('reel_view')` fails to compile, so the funnels in PostHog stay
// clean instead of fragmenting across `reel_viewed` / `reel-view` / `view_reel`.
export type AnalyticsEvent =
  // Reels
  | 'reel_viewed'
  | 'reel_dwell'
  | 'reel_hugged'
  | 'reel_saved'
  | 'reel_shared'
  | 'reels_muted_toggled'
  | 'reels_shuffled'
  | 'reels_saved_viewed'
  // Onboarding funnel
  | 'onboarding_started'
  | 'onboarding_get_started'
  | 'onboarding_skipped'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  // Mood
  | 'mood_logged';

// PostHog property values must be JSON-serializable. We allow null (use it for
// "absent") but not undefined — undefined isn't valid JSON and trips the SDK's
// types. Callers should pass `x ?? null`, never `x ?? undefined`.
type Properties = Record<string, string | number | boolean | null>;

/** Capture a product event. No-ops when analytics is unconfigured. */
export function track(event: AnalyticsEvent, properties?: Properties): void {
  posthog?.capture(event, properties);
}

/**
 * Tie subsequent events to a user. Call on login/session-restore.
 * Pass only non-identifying traits (anonymous alias, coarse city) — never PII.
 */
export function identify(distinctId: string, properties?: Properties): void {
  posthog?.identify(distinctId, properties);
}

/** Clear the identified user. Call on logout so the next user starts clean. */
export function resetAnalytics(): void {
  posthog?.reset();
}

/** Manual screen view. Wired through useAnalyticsScreenTracking below. */
export function trackScreen(name: string, properties?: Properties): void {
  void posthog?.screen(name, properties);
}

/** Consent controls — wire these to a settings toggle when consent UI ships. */
export function optInAnalytics(): void {
  void posthog?.optIn();
}
export function optOutAnalytics(): void {
  void posthog?.optOut();
}

// ─── Screen tracking ────────────────────────────────────────────────────────
// Mount once in the root layout. Fires a `$screen` event on every route change
// using expo-router's pathname (group segments like "(main)" are already
// stripped, so screens read as "/feed", "/reels", "/onboarding/mood").
export function useAnalyticsScreenTracking(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) trackScreen(pathname);
  }, [pathname]);
}
