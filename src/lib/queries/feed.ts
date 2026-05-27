// ============================================================================
// Community feed — React Query hooks for bloom_posts + resonances + hugs.
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type {
  BloomPostRow,
  EmotionCategory,
  HugRow,
  ResonanceRow,
} from '../../types/database';
import { sb } from './client';
import { useTodayForMe } from './mood';

// ─── Read: feed posts (mood-filtered) ──────────────────────────────────────

export type BloomPostWithAuthor = BloomPostRow & { author_alias: string };

// Feed posts filtered by today's mood-driven categories.
// Categories come from today_for_me() — never hardcoded client-side.
// Each row is decorated with the author's anonymous alias (Bloom #1242) so
// the feed reads as anonymous-but-attributed.
export function useFeed(limit = 30) {
  const { data: today } = useTodayForMe();
  const categories: EmotionCategory[] | undefined = today?.feed_categories;
  const qc = useQueryClient();
  const key = ['feed', categories?.join(',') ?? 'all', limit];

  const query = useQuery<BloomPostWithAuthor[]>({
    queryKey: key,
    // We can fetch even without a mood (categories falsy) — server returns
    // recent-from-everywhere. The `enabled: !!today` gate was making the
    // empty-mood case never resolve.
    staleTime: 30_000,
    queryFn: async () => {
      let q = sb()
        .from('bloom_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (categories && categories.length > 0) {
        q = q.in('category', categories);
      }

      const { data, error } = await q;
      if (error) throw error;
      const posts = (data ?? []) as BloomPostRow[];

      // Resolve aliases for all unique authors in a single round-trip.
      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
      if (userIds.length === 0) return [];

      const { data: authors } = await sb()
        .from('public_profiles')
        .select('id, anonymous_alias')
        .in('id', userIds);

      const aliasById = new Map<string, string>(
        (authors as { id: string; anonymous_alias: string }[] | null)?.map(
          (a) => [a.id, a.anonymous_alias],
        ) ?? [],
      );

      return posts.map((p) => ({
        ...p,
        author_alias: aliasById.get(p.user_id) ?? 'Anonymous Bloom',
      }));
    },
  });

  // Live updates: any insert into bloom_posts → invalidate so the new post
  // surfaces without pull-to-refresh. Filter at SQL level would be cleaner
  // but a single invalidate is cheap and avoids race conditions with the
  // mood-derived category list shifting.
  useEffect(() => {
    const channel = sb()
      .channel('feed-bloom-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bloom_posts' },
        () => {
          void qc.invalidateQueries({ queryKey: ['feed'] });
        },
      )
      .subscribe();
    return () => {
      sb().removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
}

// ─── Read: my reactions ────────────────────────────────────────────────────
// Single small query that tells the feed which posts I've already resonated
// with / hugged. Both are bounded (~hundreds of rows for an active user).

export type MyPostInteractions = {
  resonated: Set<string>; // post_id
  hugged: Set<string>;    // post_id (where context_type='post')
};

export function useMyPostInteractions() {
  return useQuery<MyPostInteractions>({
    queryKey: ['my-post-interactions'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) return { resonated: new Set(), hugged: new Set() };

      const [res, hug] = await Promise.all([
        sb()
          .from('resonances')
          .select('post_id')
          .eq('user_id', user.id),
        sb()
          .from('hugs')
          .select('context_id')
          .eq('from_user_id', user.id)
          .eq('context_type', 'post'),
      ]);

      const resonated = new Set<string>(
        (res.data as Pick<ResonanceRow, 'post_id'>[] | null)?.map((r) => r.post_id) ?? [],
      );
      const hugged = new Set<string>(
        (hug.data as Pick<HugRow, 'context_id'>[] | null)?.map((h) => h.context_id) ?? [],
      );
      return { resonated, hugged };
    },
  });
}

// ─── Write: create a post ──────────────────────────────────────────────────

export type CreatePostInput = {
  sentence: string;
  category: EmotionCategory;
  anchor_word: string;
  color_hex: string;
};

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) throw new Error('unauthenticated');

      const { data, error } = await sb()
        .from('bloom_posts')
        .insert({
          user_id: user.id,
          sentence: input.sentence.trim(),
          category: input.category,
          anchor_word: input.anchor_word.trim(),
          color_hex: input.color_hex,
        })
        .select()
        .single();
      if (error) throw error;
      return data as BloomPostRow;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// ─── Write: toggle resonance ("I felt this") ───────────────────────────────

export function useToggleResonance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      hasResonated,
    }: {
      postId: string;
      hasResonated: boolean;
    }) => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) throw new Error('unauthenticated');

      if (hasResonated) {
        const { error } = await sb()
          .from('resonances')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        if (error) throw error;
        return { postId, hasResonated: false };
      }

      const { error } = await sb()
        .from('resonances')
        .insert({ user_id: user.id, post_id: postId });
      if (error) throw error;
      return { postId, hasResonated: true };
    },
    onMutate: async ({ postId, hasResonated }) => {
      // Optimistically flip the in-memory interaction set + bump count.
      const prevSets = qc.getQueryData<MyPostInteractions>(['my-post-interactions']);
      if (prevSets) {
        const next: MyPostInteractions = {
          resonated: new Set(prevSets.resonated),
          hugged: prevSets.hugged,
        };
        if (hasResonated) next.resonated.delete(postId);
        else next.resonated.add(postId);
        qc.setQueryData<MyPostInteractions>(['my-post-interactions'], next);
      }

      // Bump resonance_count in any cached feed list.
      const feedCaches = qc.getQueriesData<BloomPostWithAuthor[]>({ queryKey: ['feed'] });
      feedCaches.forEach(([key, posts]) => {
        if (!posts) return;
        qc.setQueryData<BloomPostWithAuthor[]>(key, posts.map((p) =>
          p.id === postId
            ? { ...p, resonance_count: Math.max(0, p.resonance_count + (hasResonated ? -1 : 1)) }
            : p,
        ));
      });

      return { prevSets, feedCaches };
    },
    onError: (_err, _vars, ctx) => {
      // Roll back interaction set + counts.
      if (ctx?.prevSets) {
        qc.setQueryData(['my-post-interactions'], ctx.prevSets);
      }
      ctx?.feedCaches?.forEach(([key, posts]) => {
        if (posts) qc.setQueryData(key, posts);
      });
    },
    onSuccess: () => {
      // Server trigger may have nudged resonance_count more than we did.
      // Quietly resync the feed (no spinner, staleTime keeps it cheap).
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// ─── Write: send a hug to a post ───────────────────────────────────────────
// One-way action by design (anti-anxiety). The schema's unique constraint on
// (from_user_id, context_type, context_id) silently prevents double-hugs;
// we surface that as a no-op so the UI doesn't error.

// Send a hug attached to a Soul Match conversation (context_type='match').
// Idempotent thanks to the unique (from_user_id, context_type, context_id)
// constraint — re-tapping silently re-confirms without erroring.
export function useHugInConversation() {
  return useMutation({
    mutationFn: async ({
      matchId,
      toUserId,
    }: {
      matchId: string;
      toUserId: string;
    }) => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) throw new Error('unauthenticated');
      if (user.id === toUserId) {
        throw new Error('cannot hug yourself');
      }

      const { error } = await sb()
        .from('hugs')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          context_type: 'match',
          context_id: matchId,
        });
      if (error && !/duplicate|unique/i.test(error.message)) throw error;
      return { matchId };
    },
  });
}

export function useHugPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      toUserId,
    }: {
      postId: string;
      toUserId: string;
    }) => {
      const { data: { user } } = await sb().auth.getUser();
      if (!user) throw new Error('unauthenticated');
      if (user.id === toUserId) {
        throw new Error('cannot hug your own post');
      }

      const { error } = await sb()
        .from('hugs')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          context_type: 'post',
          context_id: postId,
        });
      // Duplicate hug (uniqueness violation) — treat as success no-op.
      if (error && !/duplicate|unique/i.test(error.message)) throw error;
      return { postId };
    },
    onMutate: async ({ postId }) => {
      const prev = qc.getQueryData<MyPostInteractions>(['my-post-interactions']);
      if (prev) {
        const next: MyPostInteractions = {
          resonated: prev.resonated,
          hugged: new Set(prev.hugged),
        };
        next.hugged.add(postId);
        qc.setQueryData<MyPostInteractions>(['my-post-interactions'], next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['my-post-interactions'], ctx.prev);
    },
  });
}
