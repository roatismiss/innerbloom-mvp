import { Stack } from 'expo-router';

// Soul Matching flow lives outside the (main) tab navigator on purpose:
// every step has its own top bar and footer, and the (main) tab bar would
// fight the fixed Continue button on the quiz steps.
//
// Route map (current and planned):
//   /match           → app/match/index.tsx     — Quiz step 1
//   /match/step-2    → app/match/step-2.tsx    — Quiz step 2
//   /match/step-3    → app/match/step-3.tsx    — Quiz step 3
//   /match/step-4    → app/match/step-4.tsx    — Quiz step 4 (final)
//   /match/finding   → app/match/finding.tsx   — Harmonizing loop
//   /match/result    → app/match/result.tsx    — pending

export default function MatchLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#fff8f6' },
      }}
    />
  );
}
