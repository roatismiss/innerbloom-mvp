import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useMarkNotificationsSeen,
  useNotificationsInbox,
} from '../../lib/queries/notifications-inbox';
import type {
  NotificationKind,
  NotificationRow,
} from '../../types/database';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  primaryFixed:           '#ffdad2',
  onPrimaryContainer:     '#641e0e',
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiary:               '#a8315c',
  tertiaryContainer:      '#fa719c',
  tertiaryFixed:          '#ffd9e1',
  onTertiaryFixedVariant: '#881645',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Per-kind copy + visuals. Keeps the inbox readable when the user has lots
// of mixed events.
const KIND_META: Record<NotificationKind, { icon: Mci; tint: string; bg: string; verb: string }> = {
  hug:             { icon: 'hand-heart',       tint: C.tertiary,            bg: C.tertiaryFixed,           verb: 'sent you a hug'              },
  kindred_request: { icon: 'flower',           tint: C.primary,             bg: C.primaryFixed,            verb: 'wants to keep blooming'      },
  match_found:     { icon: 'yin-yang',         tint: C.onSecondaryContainer, bg: C.secondaryContainer,     verb: 'is your soul match today'    },
  message:         { icon: 'message-text',     tint: C.primary,             bg: C.primaryFixed,            verb: 'sent you a reflection'       },
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const inbox = useNotificationsInbox(50);
  const markSeen = useMarkNotificationsSeen();

  // Flip everything to "seen" the moment the screen mounts. The cached
  // `is_unread` flags stay until refetch, so the user still sees which were
  // new when they walked in.
  useEffect(() => {
    markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = inbox.data ?? [];
  const unreadCount = useMemo(
    () => rows.filter((r) => r.is_unread).length,
    [rows],
  );

  function openNotification(row: NotificationRow) {
    void Haptics.selectionAsync();

    switch (row.kind) {
      case 'message':
      case 'match_found':
        router.push({
          pathname: '/match/conversation',
          params:   { id: row.context_id },
        });
        break;
      case 'kindred_request':
        router.push('/(main)/garden');
        break;
      case 'hug':
        // No dedicated post-detail screen yet — drop them in Community for
        // now. Replace with /(main)/post/[id] once that exists.
        router.push('/(main)/community');
        break;
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(main)/dashboard');
  }

  return (
    <View style={s.root}>
      <View style={[s.blob, s.blobTop]} />

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={inbox.isRefetching}
            onRefresh={() => void inbox.refetch()}
            tintColor={C.primary}
          />
        }
      >
        {/* Header */}
        <View style={s.headerRow}>
          <Pressable style={s.backBtn} onPress={goBack} hitSlop={8}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.primary} />
          </Pressable>
          <View style={s.headerText}>
            <Text style={s.eyebrow}>INBOX</Text>
            <Text style={s.headline}>Recent moments</Text>
          </View>
          {unreadCount > 0 ? (
            <View style={s.unreadChip}>
              <Text style={s.unreadChipText}>{unreadCount} new</Text>
            </View>
          ) : null}
        </View>

        <Text style={s.subhead}>
          Everything that landed for you — hugs, matches, kindred requests,
          messages. Tap any to open.
        </Text>

        {/* Inbox */}
        {inbox.isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : rows.length === 0 ? (
          <EmptyInbox />
        ) : (
          <View style={s.list}>
            {rows.map((row, i) => (
              <NotificationCard
                key={`${row.kind}:${row.event_id}`}
                row={row}
                index={i}
                onPress={() => openNotification(row)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Notification card ──────────────────────────────────────────────────────

function NotificationCard({
  row,
  index,
  onPress,
}: {
  row: NotificationRow;
  index: number;
  onPress: () => void;
}) {
  const meta = KIND_META[row.kind] ?? KIND_META.hug;
  const name = row.from_display_name?.trim() || row.from_alias;
  const when = relativeTime(row.created_at);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Pressable
        style={[s.card, row.is_unread && s.cardUnread]}
        onPress={onPress}
        android_ripple={{ color: C.surfaceContainer }}
      >
        {/* Sender avatar (or fallback icon tinted by kind) */}
        {row.from_avatar_url ? (
          <Image source={{ uri: row.from_avatar_url }} style={s.avatarImg} contentFit="cover" />
        ) : (
          <View style={[s.avatarFallback, { backgroundColor: meta.bg }]}>
            <MaterialCommunityIcons name="flower-tulip" size={20} color={meta.tint} />
          </View>
        )}

        {/* Body */}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={s.topLineRow}>
            <Text style={s.titleLine} numberOfLines={1}>
              <Text style={s.fromName}>{name}</Text>
              <Text style={s.verb}> {meta.verb}</Text>
            </Text>
            <Text style={s.when}>{when}</Text>
          </View>
          {row.preview && row.kind !== 'hug' ? (
            <Text style={s.preview} numberOfLines={2}>
              {row.kind === 'kindred_request' && row.preview
                ? `"${row.preview}"`
                : row.preview}
            </Text>
          ) : null}
        </View>

        {/* Kind icon chip on the right */}
        <View style={[s.kindBadge, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={14} color={meta.tint} />
        </View>

        {row.is_unread ? <View style={s.unreadDot} /> : null}
      </Pressable>
    </Animated.View>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyInbox() {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <MaterialCommunityIcons name="email-outline" size={32} color={C.primary} />
      </View>
      <Text style={s.emptyTitle}>Your inbox is still</Text>
      <Text style={s.emptyBody}>
        When someone sends you a hug, matches with you, or asks to keep
        blooming, you&apos;ll see it here.
      </Text>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const SOFT_SHADOW = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  blob: { position: 'absolute', borderRadius: 9999, opacity: 0.4 },
  blobTop: {
    top: -120, right: -100,
    width: 300, height: 300,
    backgroundColor: C.secondaryContainer,
    opacity: 0.25,
  },

  scroll: { paddingHorizontal: 20, gap: 18 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, color: C.primary,
    letterSpacing: 1.6, textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 26, lineHeight: 32, color: C.onSurface,
    letterSpacing: -0.3, marginTop: 2,
  },
  unreadChip: {
    backgroundColor: C.primary,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 9999,
  },
  unreadChipText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, color: '#fff',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },

  subhead: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 14, lineHeight: 21,
    color: C.onSurfaceVariant,
    marginTop: -8,
  },

  list: { gap: 12 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20, padding: 14, paddingRight: 18,
    borderWidth: 1, borderColor: C.surfaceContainerHigh,
    position: 'relative',
    ...SOFT_SHADOW,
  },
  cardUnread: {
    borderColor: C.primaryContainer,
    backgroundColor: '#fff',
  },
  avatarImg: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.surfaceContainerHigh,
  },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  topLineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  titleLine: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 19,
    color: C.onSurface,
  },
  fromName: {
    fontFamily: 'NunitoSans_600SemiBold',
    color: C.onSurface,
  },
  verb: { color: C.onSurfaceVariant },
  when: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 11, color: C.outline,
  },
  preview: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 13, lineHeight: 19,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  kindBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 12, right: 12,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.primary,
  },

  loading: { paddingVertical: 48, alignItems: 'center' },

  empty: {
    alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20, color: C.onSurface,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 22, color: C.onSurfaceVariant,
    textAlign: 'center', maxWidth: 320,
  },
});
