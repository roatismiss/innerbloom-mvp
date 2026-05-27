import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  type BloomPostWithAuthor,
  useFeed,
  useHugPost,
  useMyPostInteractions,
  useToggleResonance,
} from '../../lib/queries/feed';
import { useUIStore } from '../../store/ui';

// ─── Design tokens (AGENTS.md canonical spec) ────────────────────────────────
const C = {
  surface:               '#fff8f6',
  surfaceContainerLowest:'#ffffff',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  primary:               '#994531',
  primaryContainer:      '#e8836b',
  onPrimaryContainer:    '#641e0e',
  secondaryContainer:    '#90f2fc',
  secondaryFixed:        '#90f2fc',
  onSecondaryFixed:      '#002022',
  onSecondaryContainer:  '#006f77',
  tertiaryContainer:     '#fa719c',
  outlineVariant:        '#dbc1bb',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  error:                 '#ba1a1a',
} as const;

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ─── Data ────────────────────────────────────────────────────────────────────

interface Circle {
  id: string;
  name: string;
  members: string;
  icon: MciName;
  iconBg: string;
  iconColor: string;
}

// Circles aren't backed by the schema yet — kept as visual placeholder so the
// section doesn't collapse. Replace with `bloom_circles` reads when that
// model lands.
const CIRCLES: Circle[] = [
  { id: 'anxiety',    name: 'Anxiety Support',  members: 'Coming soon', icon: 'leaf',           iconBg: C.primaryContainer,  iconColor: '#ffffff' },
  { id: 'burnout',    name: 'Burnout Recovery', members: 'Coming soon', icon: 'meditation',     iconBg: C.tertiaryContainer, iconColor: '#ffffff' },
  { id: 'mindful',    name: 'Mindfulness',      members: 'Coming soon', icon: 'weather-sunny',  iconBg: C.secondaryContainer, iconColor: C.onSecondaryContainer },
];

// Tab bar height — keep in sync with (main)/_layout.tsx → s.tabBar.height.
const TAB_BAR_H = Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82;

// Responsive card width: two cards fit cleanly side-by-side, with a small
// "peek" of the third card showing the row is scrollable.
function computeCircleCardWidth(W: number): number {
  const minBound = 150;
  const maxBound = 220;
  const usable = W - 24 - 24 - 14 - 40; // two cards + gap + peek
  return Math.max(minBound, Math.min(maxBound, Math.floor(usable / 2)));
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const cardWidth = computeCircleCardWidth(winW);
  const openDrawer = useUIStore((s) => s.openDrawer);

  const feed = useFeed(50);
  const interactions = useMyPostInteractions();

  const posts = feed.data ?? [];

  // Count hugs I've sent this week (across all contexts) — quick derivation
  // from the same interactions cache. Reframes the hugsPill to something true.
  const myHugCount = interactions.data?.hugged.size ?? 0;
  const hugCopy = myHugCount === 0
    ? "Send a hug — it's small, it lands."
    : myHugCount === 1
      ? "You've sent 1 hug so far."
      : `You've sent ${myHugCount} hugs so far.`;

  function openComposer() {
    void Haptics.selectionAsync();
    router.push('/(main)/post-composer');
  }

  function onRefresh() {
    void feed.refetch();
    void interactions.refetch();
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <Animated.View entering={FadeInUp.springify()} style={s.topBar}>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={openDrawer}>
          <MaterialCommunityIcons name="menu" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.wordmark}>InnerBloom</Text>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={C.primary} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        {/* Hugs summary */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.hugsRow}>
          <View style={s.hugsPill}>
            <MaterialCommunityIcons name="hand-heart" size={16} color={C.onSecondaryFixed} />
            <Text style={s.hugsText}>{hugCopy}</Text>
          </View>
        </Animated.View>

        {/* Featured Circles — visual placeholder; not yet backed by schema */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeading}>Featured Circles</Text>
            <Text style={s.soonLabel}>Soon</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.circlesRow}
          >
            {CIRCLES.map((circle) => (
              <CircleCard key={circle.id} circle={circle} width={cardWidth} />
            ))}
          </ScrollView>
        </Animated.View>

        {/* Recent Updates — real bloom_posts feed */}
        <Animated.View entering={FadeInDown.delay(160).springify()} style={s.section}>
          <Text style={[s.sectionHeading, s.sectionHeadingInline]}>Recent Updates</Text>

          {feed.isLoading ? (
            <View style={s.loading}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : feed.isError ? (
            <View style={s.errorBox}>
              <MaterialCommunityIcons name="cloud-off-outline" size={24} color={C.outline} />
              <Text style={s.errorTitle}>Couldn&apos;t load the feed</Text>
              <Text style={s.errorBody}>Pull down to try again.</Text>
            </View>
          ) : posts.length === 0 ? (
            <EmptyFeedCard onCompose={openComposer} />
          ) : (
            <View style={s.postsStack}>
              {posts.map((post, i) => (
                <PostCard
                  key={post.id}
                  post={post}
                  hasResonated={interactions.data?.resonated.has(post.id) ?? false}
                  hasHugged={interactions.data?.hugged.has(post.id) ?? false}
                  delay={200 + i * 60}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* FAB — composer */}
      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + TAB_BAR_H + 16 }]}
        activeOpacity={0.85}
        onPress={openComposer}
      >
        <MaterialCommunityIcons name="pencil-plus-outline" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Circle card (placeholder, no longer interactive) ────────────────────────

function CircleCard({ circle, width }: { circle: Circle; width: number }) {
  return (
    <View style={[s.circleCard, { width }]}>
      <View style={[s.circleIcon, { backgroundColor: circle.iconBg }]}>
        <MaterialCommunityIcons name={circle.icon} size={26} color={circle.iconColor} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={s.circleName} numberOfLines={1}>{circle.name}</Text>
        <Text style={s.circleMembers}>{circle.members}</Text>
      </View>
    </View>
  );
}

// ─── Empty feed ─────────────────────────────────────────────────────────────

function EmptyFeedCard({ onCompose }: { onCompose: () => void }) {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIcon}>
        <MaterialCommunityIcons name="flower-outline" size={32} color={C.primary} />
      </View>
      <Text style={s.emptyTitle}>The garden is quiet</Text>
      <Text style={s.emptyBody}>
        Be the first to share a moment today. One sentence is enough.
      </Text>
      <TouchableOpacity style={s.emptyCta} activeOpacity={0.85} onPress={onCompose}>
        <MaterialCommunityIcons name="pencil-plus-outline" size={16} color="#ffffff" />
        <Text style={s.emptyCtaText}>Share a moment</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Post card — wired ──────────────────────────────────────────────────────

function PostCard({
  post,
  hasResonated,
  hasHugged,
  delay,
}: {
  post: BloomPostWithAuthor;
  hasResonated: boolean;
  hasHugged: boolean;
  delay: number;
}) {
  const toggleResonance = useToggleResonance();
  const hugPost = useHugPost();

  const when = useMemo(() => relativeTime(post.created_at), [post.created_at]);

  function handleHug() {
    if (hasHugged) {
      // Already hugged — gentle haptic acknowledgement, no double-send.
      void Haptics.selectionAsync();
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hugPost.mutate({ postId: post.id, toUserId: post.user_id });
  }

  function handleResonate() {
    void Haptics.selectionAsync();
    toggleResonance.mutate({ postId: post.id, hasResonated });
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={s.postCard}>
      {/* Header — always anonymous; alias preserved server-side via author */}
      <View style={s.postHeader}>
        <View style={[s.postAvatar, { backgroundColor: post.color_hex }]}>
          <MaterialCommunityIcons name="flower-tulip" size={20} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.postAuthor}>{post.author_alias}</Text>
          <Text style={s.postWhen}>
            {when} · {post.anchor_word}
          </Text>
        </View>
        <View style={s.anonChip}>
          <MaterialCommunityIcons name="incognito" size={12} color={C.onSurfaceVariant} />
          <Text style={s.anonChipText}>Anonymous</Text>
        </View>
      </View>

      {/* Body */}
      <Text style={s.postBody}>{post.sentence}</Text>

      {/* Actions */}
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.actionBtn, hasResonated && s.actionBtnActive]}
          activeOpacity={0.8}
          onPress={handleResonate}
          disabled={toggleResonance.isPending}
        >
          <MaterialCommunityIcons
            name={hasResonated ? 'heart' : 'heart-outline'}
            size={16}
            color={hasResonated ? C.primary : C.onSurfaceVariant}
          />
          <Text style={[s.actionLabel, hasResonated && { color: C.primary }]}>
            {post.resonance_count} {hasResonated ? 'Felt this' : 'I felt this'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnTrailing, hasHugged && s.actionBtnActive]}
          activeOpacity={0.8}
          onPress={handleHug}
          disabled={hugPost.isPending}
        >
          <MaterialCommunityIcons
            name="hand-heart"
            size={16}
            color={hasHugged ? C.tertiaryContainer : C.onSurfaceVariant}
          />
          <Text style={[s.actionLabel, hasHugged && { color: C.tertiaryContainer }]}>
            {hasHugged ? 'Hugged' : 'Send a hug'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Top bar
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: C.surface,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.primary,
    letterSpacing: -0.2,
  },

  scroll: {
    paddingBottom: 140,
    gap: 28,
  },

  // Sections
  section: { gap: 14 },
  sectionHeader: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeadingInline: { paddingHorizontal: 24 },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  soonLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    color: C.outline,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Hugs summary
  hugsRow: {
    paddingHorizontal: 24,
    paddingTop: 8,
    flexDirection: 'row',
  },
  hugsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.secondaryFixed,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  hugsText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    color: C.onSecondaryFixed,
    letterSpacing: 0.1,
  },

  // Circle cards
  circlesRow: {
    paddingHorizontal: 24,
    gap: 14,
  },
  circleCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 28,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.25)',
    opacity: 0.7,
    ...softShadow,
  },
  circleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  circleMembers: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
  },

  // Posts
  postsStack: { paddingHorizontal: 24, gap: 16 },
  postCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 28,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.15)',
    shadowColor: '#5C4742',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAuthor: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: C.onSurface,
  },
  postWhen: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  anonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
  },
  anonChipText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    color: C.onSurfaceVariant,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  postBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 23,
    color: C.onSurface,
    letterSpacing: -0.05,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerLow,
  },
  actionBtnActive: {
    backgroundColor: C.surfaceContainerHigh,
  },
  actionBtnTrailing: {
    marginLeft: 'auto',
  },
  actionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.1,
  },

  // Loading / error / empty
  loading: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorBox: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 24,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    gap: 8,
  },
  errorTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15, color: C.onSurface,
  },
  errorBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, color: C.onSurfaceVariant,
  },

  emptyCard: {
    marginHorizontal: 24,
    padding: 28,
    borderRadius: 28,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.25)',
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,218,210,0.45)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20, lineHeight: 26, color: C.onSurface,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 21, color: C.onSurfaceVariant,
    textAlign: 'center', maxWidth: 280,
  },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 9999,
    marginTop: 8,
  },
  emptyCtaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: '#ffffff',
    letterSpacing: 0.3,
  },

  // FAB — `bottom` is injected inline using insets + tab bar height.
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
