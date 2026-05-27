import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useKindredGarden,
  usePendingKindredRequests,
  useRespondKindredRequest,
} from '../../lib/queries/kindred';
import type {
  KindredGardenRow,
  PendingKindredRequestRow,
} from '../../types/database';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:                '#994531',
  primaryContainer:       '#e8836b',
  primaryFixed:           '#ffdad2',
  onPrimaryContainer:     '#641e0e',
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  tertiary:               '#a8315c',
  tertiaryFixed:          '#ffd9e1',
  onTertiaryFixedVariant: '#881645',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

const SOFT_SHADOW = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

const CAP = 5;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function GardenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const garden = useKindredGarden();
  const pending = usePendingKindredRequests();

  const gardenRows = garden.data ?? [];
  const pendingRows = pending.data ?? [];

  const onRefresh = () => {
    void garden.refetch();
    void pending.refetch();
  };

  return (
    <View style={s.root}>
      <View style={[s.blob, s.blobTop]} />
      <View style={[s.blob, s.blobBottom]} />

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={garden.isRefetching || pending.isRefetching}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.headerRow}>
          <TouchableOpacity
            style={s.backBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.primary} />
          </TouchableOpacity>
          <View style={s.headerTextWrap}>
            <Text style={s.eyebrow}>YOUR PEOPLE</Text>
            <Text style={s.headline}>Soul Garden</Text>
          </View>
          <View style={s.capChip}>
            <MaterialCommunityIcons name="flower-tulip" size={14} color={C.onPrimaryContainer} />
            <Text style={s.capChipText}>{gardenRows.length} / {CAP}</Text>
          </View>
        </View>

        <Text style={s.subhead}>
          Kindred you&apos;ve chosen to keep. Each garden holds up to {CAP} — small
          enough to stay real.
        </Text>

        {/* ── Pending inbox ── */}
        {pendingRows.length > 0 ? (
          <Animated.View entering={FadeIn} style={s.pendingSection}>
            <Text style={s.sectionLabel}>
              {pendingRows.length === 1
                ? 'A request is waiting for you'
                : `${pendingRows.length} requests are waiting for you`}
            </Text>
            <View style={{ gap: 12 }}>
              {pendingRows.map((row) => (
                <PendingRequestCard key={row.request_id} row={row} />
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Garden list ── */}
        <View style={s.gardenSection}>
          {garden.isLoading ? (
            <View style={s.loading}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : gardenRows.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={{ gap: 14 }}>
              {gardenRows.map((row, i) => (
                <KindredCard
                  key={row.conversation_id}
                  row={row}
                  index={i}
                  onOpen={() => {
                    void Haptics.selectionAsync();
                    router.push({
                      pathname: '/match/conversation',
                      params: { id: row.conversation_id },
                    });
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <MaterialCommunityIcons name="flower-outline" size={36} color={C.primary} />
      </View>
      <Text style={s.emptyTitle}>Your garden is still soil</Text>
      <Text style={s.emptyBody}>
        After a Soul Match conversation, either of you can ask to bloom again. If
        both agree, the kindred takes root here.
      </Text>
    </View>
  );
}

// ─── Pending request card ────────────────────────────────────────────────────

function PendingRequestCard({ row }: { row: PendingKindredRequestRow }) {
  const respond = useRespondKindredRequest();
  const router = useRouter();

  const accept = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    respond.mutate(
      { requestId: row.request_id, accept: true },
      {
        onSuccess: () => {
          // Land them in the now-kept conversation
          router.push({
            pathname: '/match/conversation',
            params: { id: row.conversation_id },
          });
        },
      },
    );
  };

  const decline = () => {
    void Haptics.selectionAsync();
    respond.mutate({ requestId: row.request_id, accept: false });
  };

  return (
    <View style={s.pendingCard}>
      <View style={s.pendingHead}>
        <View style={s.pendingBadge}>
          <MaterialCommunityIcons name="flower" size={16} color={C.tertiary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.pendingAlias}>{row.from_alias}</Text>
          <Text style={s.pendingSub}>wants to keep blooming with you</Text>
        </View>
      </View>

      {row.note ? (
        <Text style={s.pendingNote}>&ldquo;{row.note}&rdquo;</Text>
      ) : null}

      <View style={s.pendingActions}>
        <TouchableOpacity
          style={[s.pendingBtn, s.pendingBtnGhost]}
          activeOpacity={0.75}
          onPress={decline}
          disabled={respond.isPending}
        >
          <Text style={s.pendingBtnGhostText}>Not now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.pendingBtn, s.pendingBtnFilled]}
          activeOpacity={0.85}
          onPress={accept}
          disabled={respond.isPending}
        >
          <Text style={s.pendingBtnFilledText}>Keep blooming</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Garden card ─────────────────────────────────────────────────────────────

function KindredCard({
  row,
  index,
  onOpen,
}: {
  row: KindredGardenRow;
  index: number;
  onOpen: () => void;
}) {
  const lastLine = row.last_message_body
    ? truncate(row.last_message_body, 92)
    : 'No messages yet · open to begin';
  const lastWhen = row.last_message_at
    ? relative(row.last_message_at)
    : relative(row.kept_since);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable style={s.card} onPress={onOpen} android_ripple={{ color: C.surfaceContainer }}>
        <View style={s.cardAvatar}>
          <MaterialCommunityIcons name="flower-tulip" size={24} color={C.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={s.cardTopRow}>
            <Text style={s.cardAlias} numberOfLines={1}>{row.other_alias}</Text>
            <Text style={s.cardWhen}>{lastWhen}</Text>
          </View>
          <Text style={s.cardSnippet} numberOfLines={2}>{lastLine}</Text>
        </View>
        {row.unread_count > 0 ? (
          <View style={s.unreadDot}>
            <Text style={s.unreadText}>{Math.min(row.unread_count, 99)}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function truncate(t: string, n: number) {
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

function relative(iso: string) {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  blob: { position: 'absolute', borderRadius: 9999, opacity: 0.55 },
  blobTop: {
    top: -120, right: -80,
    width: 320, height: 320,
    backgroundColor: C.secondaryContainer,
    opacity: 0.25,
  },
  blobBottom: {
    bottom: -160, left: -100,
    width: 360, height: 360,
    backgroundColor: C.primaryFixed,
    opacity: 0.45,
  },

  scroll: { paddingHorizontal: 20, gap: 24 },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  headerTextWrap: { flex: 1 },
  eyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, color: C.primary,
    letterSpacing: 1.6, textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28, lineHeight: 34, color: C.onSurface,
    letterSpacing: -0.3, marginTop: 2,
  },
  capChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primaryFixed,
    paddingHorizontal: 12, height: 32, borderRadius: 9999,
  },
  capChipText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.onPrimaryContainer,
  },

  subhead: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 15, lineHeight: 22,
    color: C.onSurfaceVariant, marginTop: -8,
  },

  // Sections
  sectionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, color: C.tertiary,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 10,
  },
  pendingSection: { gap: 8 },
  gardenSection: { gap: 12 },

  // Pending request card
  pendingCard: {
    backgroundColor: 'rgba(255,217,225,0.50)',
    borderWidth: 1, borderColor: 'rgba(255,177,196,0.60)',
    borderRadius: 24, padding: 18, gap: 12,
  },
  pendingHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.tertiaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  pendingAlias: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16, color: C.onSurface,
  },
  pendingSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, color: C.onSurfaceVariant, marginTop: 1,
  },
  pendingNote: {
    fontFamily: 'Fraunces_400Regular',
    fontStyle: 'italic',
    fontSize: 14, lineHeight: 21,
    color: C.onSurfaceVariant,
  },
  pendingActions: { flexDirection: 'row', gap: 10 },
  pendingBtn: {
    flex: 1, height: 44, borderRadius: 9999,
    alignItems: 'center', justifyContent: 'center',
  },
  pendingBtnGhost: {
    borderWidth: 1, borderColor: C.outlineVariant,
  },
  pendingBtnGhostText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onSurfaceVariant,
  },
  pendingBtnFilled: { backgroundColor: C.primaryContainer },
  pendingBtnFilledText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, color: C.onPrimaryContainer,
    letterSpacing: 0.4,
  },

  // Garden card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24, padding: 16,
    borderWidth: 1, borderColor: C.surfaceContainerHigh,
    ...SOFT_SHADOW,
  },
  cardAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  cardAlias: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15, color: C.onSurface,
  },
  cardWhen: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 11, color: C.outline,
  },
  cardSnippet: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 19, color: C.onSurfaceVariant,
  },
  unreadDot: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, color: '#fff',
  },

  // Empty
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
    fontSize: 20, lineHeight: 26, color: C.onSurface,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 22, color: C.onSurfaceVariant,
    textAlign: 'center', maxWidth: 320,
  },
});
