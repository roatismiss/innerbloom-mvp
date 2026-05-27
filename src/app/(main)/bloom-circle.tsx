import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useKindredGarden,
  usePendingKindredRequests,
  useRespondKindredRequest,
} from '../../lib/queries/kindred';
import type {
  EmotionCategory,
  KindredGardenRow,
  PendingKindredRequestRow,
} from '../../types/database';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  surface:               '#fff8f6',
  surfaceContainerLowest:'#ffffff',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  primary:               '#994531',
  primaryContainer:      '#e8836b',
  onPrimary:             '#ffffff',
  onPrimaryContainer:    '#641e0e',
  secondary:             '#006970',
  secondaryContainer:    '#90f2fc',
  onSecondaryContainer:  '#006f77',
  tertiary:              '#a8315c',
  outlineVariant:        '#dbc1bb',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
} as const;

const KINDRED_CAP = 5;
const HEADER_H   = 64;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Category → avatar tint
const CAT_THEME: Record<EmotionCategory, { bg: string; color: string; icon: Mci }> = {
  happy:   { bg: 'rgba(144,242,252,0.28)', color: C.secondary,    icon: 'emoticon-excited-outline' },
  hopeful: { bg: 'rgba(255,218,210,0.50)', color: C.primary,      icon: 'emoticon-happy-outline'   },
  neutral: { bg: C.surfaceContainerHigh,    color: C.onSurfaceVariant, icon: 'emoticon-neutral-outline' },
  sad:     { bg: 'rgba(255,218,210,0.70)', color: '#641e0e',       icon: 'emoticon-sad-outline'     },
  stressed:{ bg: 'rgba(250,113,156,0.18)', color: C.tertiary,      icon: 'emoticon-cry-outline'     },
  anxious: { bg: C.surfaceContainer,        color: C.onSurfaceVariant, icon: 'emoticon-confused-outline' },
};

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now  = new Date();
  const mins = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1)   return 'now';
  if (mins < 60)  return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7)   return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function BloomCircleScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const garden  = useKindredGarden();
  const pending = usePendingKindredRequests();
  const respond = useRespondKindredRequest();

  const connections  = garden.data  ?? [];
  const requests     = pending.data ?? [];
  const isLoading    = garden.isLoading && pending.isLoading;
  const atCap        = connections.length >= KINDRED_CAP;

  function openConversation(id: string) {
    void Haptics.selectionAsync();
    router.push(`/match/conversation?id=${id}`);
  }

  function startMatch() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/match/start');
  }

  function handleRespond(requestId: string, accept: boolean) {
    void Haptics.selectionAsync();
    respond.mutate({ requestId, accept });
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ─── Top bar ─── */}
      <Animated.View entering={FadeInUp.springify()} style={s.topBar}>
        <View style={s.topLeft}>
          <Text style={s.topTitle}>Bloom Circle</Text>
          <View style={s.capacityPill}>
            <MaterialCommunityIcons name="flower-outline" size={12} color={C.primary} />
            <Text style={s.capacityText}>
              {connections.length} / {KINDRED_CAP}
            </Text>
          </View>
        </View>
        {!atCap && (
          <TouchableOpacity style={s.matchBtn} activeOpacity={0.85} onPress={startMatch}>
            <MaterialCommunityIcons name="yin-yang" size={16} color={C.onPrimaryContainer} />
            <Text style={s.matchBtnText}>Soul Match</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ─── Content ─── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : connections.length === 0 && requests.length === 0 ? (
        <EmptyState onMatch={startMatch} />
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Pending requests */}
          {requests.length > 0 && (
            <Animated.View entering={FadeInDown.delay(40).springify()} style={s.section}>
              <Text style={s.sectionLabel}>WAITING FOR YOU</Text>
              {requests.map((req) => (
                <PendingCard
                  key={req.request_id}
                  req={req}
                  onAccept={() => handleRespond(req.request_id, true)}
                  onDecline={() => handleRespond(req.request_id, false)}
                />
              ))}
            </Animated.View>
          )}

          {/* Connections */}
          {connections.length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).springify()} style={s.section}>
              {requests.length > 0 && (
                <Text style={s.sectionLabel}>YOUR CIRCLE</Text>
              )}
              {connections.map((row, i) => (
                <Animated.View key={row.conversation_id} entering={FadeInDown.delay(80 + i * 40).springify()}>
                  <ConnectionRow
                    row={row}
                    onPress={() => openConversation(row.conversation_id)}
                  />
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {/* Bottom CTA when under cap */}
          {!atCap && connections.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={s.bottomCta}>
              <TouchableOpacity style={s.bottomCtaBtn} activeOpacity={0.85} onPress={startMatch}>
                <MaterialCommunityIcons name="yin-yang" size={18} color={C.onPrimary} />
                <Text style={s.bottomCtaBtnText}>Find today's match</Text>
              </TouchableOpacity>
              <Text style={s.bottomCtaHint}>
                {KINDRED_CAP - connections.length} slot{KINDRED_CAP - connections.length !== 1 ? 's' : ''} remaining in your circle
              </Text>
            </Animated.View>
          )}

          {atCap && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={s.fullBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color={C.secondary} />
              <Text style={s.fullBadgeText}>Your Bloom Circle is full · release a connection to make room</Text>
            </Animated.View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onMatch }: { onMatch: () => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(60).springify()} style={s.empty}>
      <View style={s.emptyIconWrap}>
        <MaterialCommunityIcons name="flower-outline" size={48} color={C.primaryContainer} />
      </View>
      <Text style={s.emptyTitle}>Your circle is quiet</Text>
      <Text style={s.emptySub}>
        When a Soul Match conversation feels special, you can keep it here — up to {KINDRED_CAP} close blooms.
      </Text>
      <TouchableOpacity style={s.emptyBtn} activeOpacity={0.85} onPress={onMatch}>
        <MaterialCommunityIcons name="yin-yang" size={18} color={C.onPrimaryContainer} />
        <Text style={s.emptyBtnText}>Begin Soul Match</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Pending request card ─────────────────────────────────────────────────────

function PendingCard({
  req,
  onAccept,
  onDecline,
}: {
  req: PendingKindredRequestRow;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const theme = CAT_THEME[req.shared_category] ?? CAT_THEME.neutral;
  return (
    <View style={s.pendingCard}>
      <View style={s.pendingTop}>
        <View style={[s.avatar, { backgroundColor: theme.bg }]}>
          <MaterialCommunityIcons name={theme.icon} size={20} color={theme.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.pendingAlias}>{req.from_alias}</Text>
          <Text style={s.pendingLabel}>wants to bloom with you</Text>
        </View>
        <Text style={s.pendingTime}>{relativeTime(req.created_at)}</Text>
      </View>
      {req.note ? (
        <View style={s.pendingNote}>
          <Text style={s.pendingNoteText}>"{req.note}"</Text>
        </View>
      ) : null}
      <View style={s.pendingActions}>
        <TouchableOpacity style={s.declineBtn} activeOpacity={0.8} onPress={onDecline}>
          <Text style={s.declineBtnText}>Not now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.acceptBtn} activeOpacity={0.85} onPress={onAccept}>
          <MaterialCommunityIcons name="flower-outline" size={15} color={C.onPrimaryContainer} />
          <Text style={s.acceptBtnText}>Welcome in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Connection row ───────────────────────────────────────────────────────────

function ConnectionRow({
  row,
  onPress,
}: {
  row: KindredGardenRow;
  onPress: () => void;
}) {
  const theme = CAT_THEME[row.shared_category] ?? CAT_THEME.neutral;
  const initial = row.other_alias.charAt(0).toUpperCase();
  return (
    <TouchableOpacity style={s.row} activeOpacity={0.82} onPress={onPress}>
      {/* Avatar */}
      <View style={[s.avatar, { backgroundColor: theme.bg }]}>
        <Text style={[s.avatarInitial, { color: theme.color }]}>{initial}</Text>
      </View>

      {/* Body */}
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={s.rowAlias} numberOfLines={1}>{row.other_alias}</Text>
          <Text style={s.rowTime}>{relativeTime(row.last_message_at)}</Text>
        </View>
        <View style={s.rowBottom}>
          <Text style={s.rowPreview} numberOfLines={1}>
            {row.last_message_body ?? 'Conversation started'}
          </Text>
          {row.unread_count > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadText}>{row.unread_count}</Text>
            </View>
          )}
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={18} color={C.outlineVariant} />
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.07,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Top bar
  topBar: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainer,
    backgroundColor: C.surface,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  capacityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
  },
  capacityText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.primary,
    letterSpacing: 0.3,
  },
  matchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    shadowColor: C.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  matchBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onPrimaryContainer,
    letterSpacing: 0.3,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 28,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Sections
  section: { gap: 12 },
  sectionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    color: C.outline,
    letterSpacing: 1.4,
    marginBottom: 4,
  },

  // Avatar (shared)
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },

  // Pending card
  pendingCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    gap: 12,
    ...softShadow,
  },
  pendingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingAlias: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurface,
  },
  pendingLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  pendingTime: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 11,
    lineHeight: 14,
    color: C.outline,
  },
  pendingNote: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pendingNoteText: {
    fontFamily: 'NunitoSans_400Regular',
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    height: 40,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  acceptBtn: {
    flex: 2,
    height: 40,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: C.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  acceptBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onPrimaryContainer,
  },

  // Connection row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    ...softShadow,
  },
  rowBody: { flex: 1, gap: 3 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowAlias: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurface,
    flex: 1,
  },
  rowTime: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 11,
    lineHeight: 14,
    color: C.outline,
    marginLeft: 8,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPreview: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    flex: 1,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    color: '#ffffff',
  },

  // Bottom CTA (when has connections but under cap)
  bottomCta: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  bottomCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 9999,
    shadowColor: C.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  bottomCtaBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  bottomCtaHint: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.outline,
    textAlign: 'center',
  },

  // At cap badge
  fullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(144,242,252,0.22)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0,111,119,0.15)',
  },
  fullBadgeText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.secondary,
    letterSpacing: 0.2,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
  },
  emptyTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primaryContainer,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 9999,
    marginTop: 8,
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emptyBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: C.onPrimaryContainer,
    letterSpacing: 0.3,
  },
});
