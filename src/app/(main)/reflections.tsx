import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BloomCard } from '../../lib/bloom-prompt';
import { BLOOM_CRISIS_RESOURCES_PH } from '../../lib/bloom-prompt';
import {
  useBloomSessionHistory,
  useBloomSessionMessages,
  type BloomSession,
} from '../../lib/queries/bloom';

const C = {
  surface:                '#fff8f6',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow:    '#fff1ed',
  surfaceContainer:       '#ffe9e4',
  surfaceContainerHigh:   '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:                '#994531',
  onPrimary:              '#ffffff',
  primaryContainer:       '#e8836b',
  primaryFixed:           '#ffdad2',
  secondaryFixed:         '#90f2fc',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  onSecondaryFixed:       '#002022',
  tertiary:               '#a8315c',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
  error:                  '#b3261e',
  errorContainer:         '#f9dedc',
  onErrorContainer:       '#410e0b',
} as const;

const HEADER_H = 72;

function formatSessionDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = `${h}:${m.toString().padStart(2, '0')} ${ampm}`;

  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatMessageTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function ReflectionsScreen() {
  const { session: sessionId } = useLocalSearchParams<{ session?: string }>();

  if (sessionId) {
    return <SessionDetail sessionId={sessionId} />;
  }
  return <SessionList />;
}

// ─── List view ────────────────────────────────────────────────────────────────
function SessionList() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: sessions, isLoading } = useBloomSessionHistory(50);

  const grouped = useMemo(() => groupByDateLabel(sessions ?? []), [sessions]);

  return (
    <View style={s.root}>
      <View style={[s.blob, s.blobTopRight]} />
      <View style={[s.blob, s.blobBottomLeft]} />

      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={C.primary} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Reflections</Text>
          <View style={s.iconBtn} />
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + HEADER_H + 24,
          paddingHorizontal: 20,
          paddingBottom: 32,
          gap: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={C.primary} />
          </View>
        )}

        {!isLoading && (sessions?.length ?? 0) === 0 && (
          <View style={s.emptyState}>
            <MaterialCommunityIcons name="leaf" size={36} color={C.primary} />
            <Text style={s.emptyTitle}>Nothing to look back on yet.</Text>
            <Text style={s.emptySub}>Your conversations with Bloom will collect here, ready to be revisited whenever you want.</Text>
          </View>
        )}

        {grouped.map((group, gi) => (
          <View key={group.label} style={{ gap: 12 }}>
            <Text style={s.groupLabel}>{group.label}</Text>
            <View style={{ gap: 10 }}>
              {group.sessions.map((sess, idx) => (
                <Animated.View
                  key={sess.id}
                  entering={FadeInDown.delay(Math.min(gi * 60 + idx * 30, 240)).springify()}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={s.sessionRow}
                    onPress={() => router.push({ pathname: '/(main)/reflections', params: { session: sess.id } })}
                  >
                    <View style={s.sessionLeft}>
                      <Text style={s.sessionTime}>{formatSessionDate(sess.started_at)}</Text>
                      <Text style={s.sessionTitle} numberOfLines={1}>
                        {sess.title ?? defaultTitle(sess)}
                      </Text>
                      <Text style={s.sessionMeta}>{sess.message_count} message{sess.message_count === 1 ? '' : 's'}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={C.outline} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function defaultTitle(sess: BloomSession) {
  if (sess.primary_feeling) return `A conversation about feeling ${sess.primary_feeling}.`;
  return 'A conversation with Bloom.';
}

function groupByDateLabel(sessions: BloomSession[]) {
  const groups: { label: string; sessions: BloomSession[] }[] = [];
  const labelFor = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (sameDay(d, now)) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameDay(d, yesterday)) return 'Yesterday';
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays < 7) return 'Earlier this week';
    if (diffDays < 30) return 'Earlier this month';
    return 'Older';
  };
  for (const s of sessions) {
    const label = labelFor(s.started_at);
    let g = groups.find((x) => x.label === label);
    if (!g) {
      g = { label, sessions: [] };
      groups.push(g);
    }
    g.sessions.push(s);
  }
  return groups;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Detail view ─────────────────────────────────────────────────────────────
function SessionDetail({ sessionId }: { sessionId: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: messages, isLoading } = useBloomSessionMessages(sessionId);

  return (
    <View style={s.root}>
      <View style={[s.blob, s.blobTopRight]} />
      <View style={[s.blob, s.blobBottomLeft]} />

      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/reflections')}
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color={C.primary} />
          </TouchableOpacity>
          <Text style={s.topTitle}>A past reflection</Text>
          <View style={s.iconBtn} />
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + HEADER_H + 24,
          paddingHorizontal: 20,
          paddingBottom: 32,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <ActivityIndicator color={C.primary} />
          </View>
        )}

        {(messages ?? []).map((m, idx) => {
          const delay = Math.min(idx * 30, 240);
          if (m.role === 'user') {
            return (
              <Animated.View key={m.id} entering={FadeInDown.delay(delay).springify()} style={s.msgRowRight}>
                <View style={s.bubbleUser}>
                  <Text style={s.bubbleUserText}>{m.content}</Text>
                </View>
                <Text style={[s.timestamp, { marginRight: 8 }]}>{formatMessageTime(m.created_at)}</Text>
              </Animated.View>
            );
          }
          return (
            <View key={m.id} style={{ gap: 12 }}>
              <Animated.View entering={FadeInDown.delay(delay).springify()} style={s.msgRowLeft}>
                <View style={s.bubbleAI}>
                  <Text style={s.bubbleAIText}>{m.content}</Text>
                </View>
                <Text style={[s.timestamp, { marginLeft: 8 }]}>{formatMessageTime(m.created_at)}</Text>
              </Animated.View>
              {m.cards.map((card, ci) => (
                <View key={`${m.id}-c-${ci}`}>
                  <CardReadonly card={card} />
                </View>
              ))}
            </View>
          );
        })}

        {!isLoading && (messages?.length ?? 0) === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyTitle}>This reflection is empty.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CardReadonly({ card }: { card: BloomCard }) {
  if (card.type === 'breathing') {
    const mins = Math.round(card.duration_sec / 60);
    return (
      <View style={s.readonlyCard}>
        <MaterialCommunityIcons name="weather-windy" size={22} color={C.onSecondaryContainer} />
        <View style={{ flex: 1 }}>
          <Text style={s.readonlyTitle}>{card.name}</Text>
          <Text style={s.readonlySub}>Breathing exercise · {mins} min</Text>
        </View>
      </View>
    );
  }
  if (card.type === 'reflection') {
    return (
      <View style={s.reflectionBubble}>
        <Text style={s.reflectionText}>“{card.prompt}”</Text>
      </View>
    );
  }
  if (card.type === 'mood_picker') {
    return (
      <View style={s.readonlyCard}>
        <MaterialCommunityIcons name="emoticon-outline" size={22} color={C.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.readonlyTitle}>Mood prompt</Text>
          <Text style={s.readonlySub}>{card.options.join(' · ')}</Text>
        </View>
      </View>
    );
  }
  if (card.type === 'crisis_resources') {
    return (
      <View style={s.crisisCard}>
        <View style={s.crisisHeader}>
          <MaterialCommunityIcons name="heart-pulse" size={20} color={C.error} />
          <Text style={s.crisisTitle}>Crisis support shown</Text>
        </View>
        <View style={{ gap: 8, marginTop: 6 }}>
          {BLOOM_CRISIS_RESOURCES_PH.map((r) => (
            <View key={r.name}>
              <Text style={s.crisisName}>{r.name}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {r.numbers.map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => Linking.openURL(`tel:${n.replace(/[^0-9+]/g, '')}`)}
                    style={s.crisisPill}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="phone" size={12} color={C.onErrorContainer} />
                    <Text style={s.crisisPillText}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return null;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.3,
  },
  blobTopRight: {
    top: 120,
    right: -80,
    width: 260,
    height: 260,
    backgroundColor: C.surfaceContainerHighest,
  },
  blobBottomLeft: {
    bottom: 100,
    left: -100,
    width: 320,
    height: 320,
    backgroundColor: C.secondaryFixed,
    opacity: 0.22,
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(255,248,246,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceContainer,
  },
  topBarInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: C.primary,
  },

  groupLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginLeft: 4,
  },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    ...softShadow,
  },
  sessionLeft: { flex: 1, gap: 4 },
  sessionTime: {
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 11,
    lineHeight: 15,
    color: C.tertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sessionTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  sessionMeta: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.outline,
  },

  emptyState: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptySub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },

  // Detail view bubbles
  msgRowLeft: { alignItems: 'flex-start', maxWidth: '85%' },
  msgRowRight: { alignItems: 'flex-end', alignSelf: 'flex-end', maxWidth: '85%' },
  bubbleAI: {
    backgroundColor: C.surfaceContainerLowest,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...softShadow,
  },
  bubbleAIText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurface,
  },
  bubbleUser: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...softShadow,
  },
  bubbleUserText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.onPrimary,
  },
  timestamp: {
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 10,
    lineHeight: 14,
    color: C.outline,
    marginTop: 6,
    letterSpacing: 0.2,
  },

  readonlyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
  },
  readonlyTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: C.onSurface,
  },
  readonlySub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
  },

  reflectionBubble: {
    backgroundColor: C.surfaceContainerLowest,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: C.tertiary,
    ...softShadow,
  },
  reflectionText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurface,
  },

  crisisCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.errorContainer,
    borderLeftWidth: 4,
    borderLeftColor: C.error,
  },
  crisisHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  crisisTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: C.onSurface,
  },
  crisisName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  crisisPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.errorContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  crisisPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 14,
    color: C.onErrorContainer,
  },
});
