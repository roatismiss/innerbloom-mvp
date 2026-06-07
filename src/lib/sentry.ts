import * as Sentry from '@sentry/react-native';

// ============================================================================
// Crash reporting (Sentry).
// ============================================================================
// Init is a no-op until EXPO_PUBLIC_SENTRY_DSN is set, so dev/CI without a DSN
// runs cleanly. To turn it on for the pilot:
//   1. Create a project at sentry.io and copy its DSN.
//   2. Set EXPO_PUBLIC_SENTRY_DSN in .env (local) and in the Vercel/EAS env.
//   3. Rebuild. From then on, every uncaught crash (caught by ErrorBoundary)
//      and any manual captureException() lands in Sentry with a stack trace.
//
// PRIVACY — this is a mental-health app. We deliberately:
//   • disable sendDefaultPii (no IP / no device identifiers beyond the basics);
//   • never attach journal text, chat messages, or mood notes to events.
// Keep it that way: report THAT something failed, never the user's content.
// ============================================================================

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isSentryEnabled = Boolean(dsn);

export function initSentry() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    // Lower trace sampling — we want crashes, not a firehose of perf spans.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // Tag the environment so pilot crashes are easy to filter.
    environment: process.env.EXPO_PUBLIC_ENV ?? 'production',
  });
}

// Thin wrapper so call sites (ErrorBoundary) don't import Sentry directly and
// don't have to guard on whether it's configured.
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
