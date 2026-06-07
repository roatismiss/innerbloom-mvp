import { QueryClient } from '@tanstack/react-query';

// Single shared QueryClient for the whole app.
//
// It lives here (not inline in _layout.tsx) so that non-React call sites —
// most importantly the sign-out handlers — can `queryClient.clear()` the
// cache. Without that, query keys like ['my-profile'] / ['feed'] are global
// (not scoped by user id), so the next account logged in on a shared device
// would briefly see the previous user's data.
//
// Defaults:
//   • retry: 1            — one network retry, then surface the error to a
//                           visible `isError` state (screens render a retry).
//   • staleTime: 60s      — matches the previous inline config.
//   • refetchOnWindowFocus: false — this ships as a PWA; with it left at the
//                           default `true`, every tab-switch back to the app
//                           refetches every stale mounted query. Across 1000
//                           pilot users foregrounding the PWA all day that is a
//                           large, pointless multiplier on the backend. We rely
//                           on Realtime subscriptions + pull-to-refresh instead.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
