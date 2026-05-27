import { useEffect } from 'react';

import { useAuthStore } from '../../store/auth';
import type { User } from '../../types';
import { sb } from './client';

// Bootstraps the auth session: loads the current session, fetches the
// matching profile row (alias, institution, onboarding flag), hydrates
// useAuthStore, and subscribes to auth changes. Mount once in the root
// layout, inside QueryClientProvider.
export function useSessionBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);

  useEffect(() => {
    let mounted = true;

    async function hydrateFromSession(sessionUserId: string | null) {
      if (!sessionUserId) {
        setUser(null);
        setOnboarded(false);
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (sb().from('profiles') as any)
        .select(
          'id, anonymous_alias, city, institution_id, onboarding_completed_at, created_at',
        )
        .eq('id', sessionUserId)
        .maybeSingle();

      if (!mounted) return;

      const row = profile as
        | {
            id: string;
            anonymous_alias: string;
            city: string | null;
            institution_id: string | null;
            onboarding_completed_at: string | null;
            created_at: string;
          }
        | null;

      const user: User | null = row
        ? {
            id: row.id,
            anonymousAlias: row.anonymous_alias,
            city: row.city ?? undefined,
            createdAt: row.created_at,
          }
        : null;

      setUser(user);
      setOnboarded(!!row?.onboarding_completed_at);
      setLoading(false);
    }

    (async () => {
      const { data } = await sb().auth.getSession();
      await hydrateFromSession(data.session?.user.id ?? null);
    })();

    const { data: sub } = sb().auth.onAuthStateChange((_event, session) => {
      void hydrateFromSession(session?.user.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setLoading, setOnboarded, setUser]);
}

export function AuthBootstrap() {
  useSessionBootstrap();
  return null;
}
