# InnerBloom — Launch Hardening Checklist

Status of the pre-launch audit fixes for the 1000-user pilot. Generated from a
full multi-agent audit (10 dimensions, each finding adversarially verified
against real code) + deterministic checks (`tsc`, `expo-doctor`, `npm audit`).

`tsc --noEmit` is **green**. `expo-doctor` is **20/21** (only cosmetic patch-version
drift remains).

---

## ✅ Done in code (this branch)

| # | Fix | Files |
|---|-----|-------|
| 1 | **Global ErrorBoundary** — a render crash now shows a recover screen instead of a permanent white screen | `src/components/ErrorBoundary.tsx`, `src/app/_layout.tsx` |
| 2 | **Auth guard on `(main)`** — a logged-out PWA hard-refresh/deep-link redirects to login instead of an empty authed screen | `src/app/(main)/_layout.tsx` |
| 3 | **AuthBootstrap can't hang the splash** — `try/catch/finally` always settles `isLoading`; 6s hard fallback in the splash | `src/lib/queries/auth.ts`, `src/app/index.tsx` |
| 4 | **Mood check-in no longer lost** — `onError` rolls back the optimistic write so the picker unlocks and the user can retry | `src/lib/queries/mood.ts` |
| 5 | **iOS photo-picker crash fixed** — `expo-image-picker` registered as a config plugin (injects `NSPhotoLibraryUsageDescription`) | `app.json` |
| 6 | **Reels memory** — `windowSize` 5→3 + video player only mounts for the visible reel ±1 (max ~3 decoders vs ~5) | `src/app/(main)/reels.tsx` |
| 7 | **Font-load failure no longer freezes app** — releases on `fontError`, app renders with system fallback | `src/app/_layout.tsx` |
| 8 | **No cross-user data leak on sign-out** — `queryClient.clear()` in both sign-out handlers | `src/components/SideMenu.tsx`, `src/app/(main)/profile.tsx`, `src/lib/queries/query-client.ts` |
| 9 | **Login double-submit guard** — synchronous ref blocks a second submit before React commits `disabled` | `src/app/(auth)/login.tsx` |
| 10 | **Stale DB types fixed** — `display_name`/`avatar_url`/`notifications_seen_at` re-added to `profiles` + `public_profiles`; `tsc` green | `src/types/database.ts` |
| 11 | **Inbox error ≠ empty** — a failed load shows a retry state, not "you have no notifications" | `src/app/(main)/notifications.tsx` |
| 12 | **Daily intention sync-failure surfaced** — "saved on this device but not synced, tap to retry" banner | `src/app/(main)/intentions.tsx` |
| 13 | **Unloaded `NunitoSans_700Bold` removed** → `600SemiBold` (no system-font fallback) | `insights.tsx`, `today.tsx`, `onboarding/goals.tsx` |
| 14 | **AI clinical disclaimer** under the Bloom composer ("not a substitute for professional care; crisis 1553/911") | `src/app/(main)/ai-companion.tsx` |
| 15 | **Crisis SOS button added to Grief & Burnout circles** (were missing it; depression/recovery/generic already had it) | `circle-grief.tsx`, `circle-burnout.tsx` |
| 16 | **`refetchOnWindowFocus: false`** on the PWA — no focus-storm backend amplification | `src/lib/queries/query-client.ts` |
| 17 | **`env.local` untracked** + added to `.gitignore` | `.gitignore` |
| 18 | **`async-storage` pinned to SDK-aligned 2.2.0** + missing peer dep **`expo-asset`** installed | `package.json` |
| 19 | **`RECORD_AUDIO`/`MODIFY_AUDIO_SETTINGS`/`FOREGROUND_SERVICE*` removed** (no recording code → Play Store friction) | `app.json` |
| 20 | **`expo-notifications` registered as a config plugin** (iOS push entitlement / Android setup) | `app.json` |
| 21 | **Real bundle id** `com.innerbloom.app` (was `com.anonymous.*`) | `app.json` |

### Backend — migration **APPLIED to production** ✅
`supabase/migrations/20260603000000_launch_hardening.sql` (`supabase db push` ran successfully against project `ruccrssggpnawsyitphc`):
- **`messages` UPDATE hole closed** — column-grant limits writes to `read_at` only + RLS only allows marking *others'* messages read. (Verified the app never `.update()`s messages, so this breaks nothing.)
- **`my_notifications` latest-message fix** — now `DISTINCT ON … ORDER BY created_at DESC`.
- **`avatars` bucket policies made idempotent.**
- **`delete_my_account()` RPC** — erases the caller's account + all data (cascade).

### Edge functions — **DEPLOYED to production** ✅
`supabase functions deploy` ran for both:
- `bloom-chat`: per-user rate limit (15 msgs/60s → `429`).
- `find-soul-match`: no longer leaks raw Postgres error messages.

### Privacy / legal / crash reporting — **wired in code** ✅
- **Settings & Privacy screen** (`src/app/(main)/settings.tsx`) — analytics opt-out toggle + sign out + delete account.
- **Privacy Policy + Terms** (`src/app/legal.tsx`, public route) — app-specific draft aligned to the PH Data Privacy Act.
- **Consent step at sign-up** — must accept Terms + Privacy before account creation (`src/app/(auth)/login.tsx`).
- **Account deletion** — Settings → Delete my account → `delete_my_account()` RPC → sign-out.
- **Sentry crash reporting** wired (`src/lib/sentry.ts`, `Sentry.wrap` on root, `reportError` in ErrorBoundary). No-op until the DSN is set.
- **DB types regenerated** from the live schema (`supabase gen types`) + custom domain aliases preserved. `tsc` green.

---

## ⛔ Remaining before flipping to 1000 users (only things WE can't do for you)

1. **Set the Sentry DSN.** Create a Sentry project, then set `EXPO_PUBLIC_SENTRY_DSN` in `.env` (local) + Vercel/EAS env. The code is already wired; this just turns it on.
2. **Have a lawyer review the Privacy Policy + Terms** in `src/app/legal.tsx`, and set the real **effective date** + **contact email** (currently placeholders) before launch.
3. **Build a real EAS binary and test on TestFlight / internal track** — the `app.json` plugin/permission changes only take effect in a *new native build*, not Expo Go:
   ```
   npx eas-cli build --profile preview --platform all     # internal test build
   # smoke test on device: cold-start session restore, iOS "set profile photo",
   # a real push notification, reels scrolling on a low-end Android, delete-account.
   npx eas-cli build --profile production --platform all   # store build
   ```
4. **Confirm Vercel env vars** for the web/PWA build: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_SENTRY_DSN`.

## 🟡 Recommended (not blocking)
- Add `supabase/config.toml` pinning `verify_jwt` per function (keep `send-push` authenticated).
- `find-soul-match`: unique guard on the unordered match pair+date (avoid duplicate conversation on simultaneous mutual match).
- `community.tsx`: convert the 50-item `.map` feed to a `FlatList`.
- Email-confirmation: disable it for the pilot, or add the `exchangeCodeForSession` callback route.
- `npx expo install --check` to align the remaining cosmetic patch versions.

---

## Ramp plan
Launch **50 → 200 → 1000** with crash reporting on from the first cohort. Watch
Sentry crash-free rate and PostHog funnel between steps.
