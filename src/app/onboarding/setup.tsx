import { Redirect } from 'expo-router';

// Setup was a single-screen megalith. The flow is now split into 4 steps:
// mood → goals → frequency → name → blooming → /(main)/checkin.
// Keep this route so deep links don't 404 — send them to the first step.
export default function SetupRedirect() {
  return <Redirect href="/onboarding/mood" />;
}
