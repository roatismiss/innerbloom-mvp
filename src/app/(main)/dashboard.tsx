import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { DEFAULT_MOOD_INTENSITY, greeting, moodColor } from '../../lib/mood';
import { useTodayIntention } from '../../lib/queries/intentions';
import { useMoodHistory, useSubmitMood, useTodayForMe } from '../../lib/queries/mood';
import { useUnreadNotificationsCount } from '../../lib/queries/notifications-inbox';
import { useMyProfile } from '../../lib/queries/profile';
import {
  getRecommendedArticles,
  RESOURCE_CATEGORIES,
  type ResourceArticle,
} from '../../lib/resources-data';
import { useIntentionsStore } from '../../store/intentions';
import { useMoodStore } from '../../store/mood';
import { useUIStore } from '../../store/ui';
import type { EmotionCategory } from '../../types';

// ─── Design tokens (design/home-screen.html is source of truth) ───────────────
const C = {
  surface:               '#fff8f6',
  surfaceContainerLowest:'#ffffff',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  surfaceVariant:        '#fadcd5',
  primary:               '#994531',
  primaryContainer:      '#e8836b',
  primaryFixed:          '#ffdad2',
  onPrimary:             '#ffffff',
  onPrimaryContainer:    '#641e0e',
  secondary:             '#006970',
  secondaryContainer:    '#90f2fc',
  onSecondaryContainer:  '#006f77',
  tertiary:              '#a8315c',
  tertiaryContainer:     '#fa719c',
  onTertiaryContainer:   '#700034',
  error:                 '#ba1a1a',
  errorContainer:        '#ffdad6',
  outline:               '#88726d',
  outlineVariant:        '#dbc1bb',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  online:                '#16a34a',
} as const;

// ─── Mood data ────────────────────────────────────────────────────────────────

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface MoodOption {
  key: EmotionCategory;
  label: string;
  icon: Mci;
}

const MOODS: MoodOption[] = [
  { key: 'happy',    label: 'Radiant', icon: 'emoticon-excited-outline'  },
  { key: 'hopeful',  label: 'Good',    icon: 'emoticon-happy-outline'    },
  { key: 'neutral',  label: 'Steady',  icon: 'emoticon-neutral-outline'  },
  { key: 'sad',      label: 'Tired',   icon: 'emoticon-sad-outline'      },
  { key: 'stressed', label: 'Low',     icon: 'emoticon-cry-outline'      },
];

type TrendTone = 'pastFaint' | 'pastMid' | 'today' | 'future' | 'empty';
type TrendBar = { day: string; heightPct: number; tone: TrendTone };

// Placeholder shown while mood_history is loading. Real data overrides this.
const TREND_PLACEHOLDER: TrendBar[] = Array.from({ length: 7 }, () => ({
  day: '·', heightPct: 5, tone: 'empty' as const,
}));

const PRACTICES: Array<{ icon: Mci; title: string; sub: string; route: string | null }> = [
  { icon: 'weather-windy',    title: 'Box breathing',  sub: '4 minutes to settle the nervous system.', route: '/(main)/breathing' },
  { icon: 'meditation',       title: 'Body scan',       sub: 'Ground yourself from head to toe.',       route: '/(main)/body-scan' },
  { icon: 'notebook-outline', title: 'Three tiny joys', sub: 'Write a brief gratitude reflection.',     route: '/(main)/journal' },
];

const QUICK_CARE: Array<{
  key: string;
  label: string;
  icon: Mci;
  bg: string;
  iconColor: string;
  cardBg?: string;
  cardBorder?: string;
  labelColor?: string;
  emphasis?: boolean;
}> = [
  { key: 'log',      label: 'Log Mood',       icon: 'emoticon-plus-outline', bg: 'rgba(144,242,252,0.30)', iconColor: C.secondary },
  { key: 'journal',  label: 'Start Journal',  icon: 'note-edit-outline',     bg: 'rgba(250,113,156,0.18)', iconColor: C.tertiary },
  { key: 'breathe',  label: 'Breathing',      icon: 'weather-windy',         bg: 'rgba(255,218,210,0.50)', iconColor: C.primary  },
  { key: 'sos',      label: 'Emergency Calm', icon: 'home-heart',
    bg: 'rgba(186,26,26,0.10)', iconColor: C.error,
    cardBg: 'rgba(186,26,26,0.05)', cardBorder: 'rgba(186,26,26,0.10)',
    labelColor: C.error, emphasis: true },
];

const CIRCLES = [
  { when: 'Today', time: '18:00', title: 'Solo Living Support',  meta: '12 others are attending', accent: true  },
  { when: 'Sat',   time: '10:30', title: 'Anxiety Breathwork',   meta: 'Weekly Session',         accent: false },
];

const AVATAR_FALLBACK = null; // no hardcoded image — use profile avatar or initials

const HEADER_H = 80;
const FAB_BOTTOM = 28;

// ─── Journey glyphs (inline SVG so we never render emoji in UI) ──────────────

function SproutGlyph({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Path d="M11 47 Q 28 35 45 47 Z" fill="#7A3225" />
      <Path
        d="M14 45.5 Q 28 39 42 45.5"
        stroke="#3d1107"
        strokeWidth={0.6}
        opacity={0.25}
        fill="none"
      />
      <Path
        d="M28 39 C 27.5 32, 28.5 24, 28 18"
        stroke="#6E9C5F"
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
      <Path d="M28 32 C 22 33, 14 30, 10 23 C 14 19, 23 22, 28 30 Z" fill="#9BC58A" />
      <Path
        d="M27 31 L 14 24"
        stroke="#5F8C50"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.55}
        fill="none"
      />
      <Path d="M28 26 C 33 28, 42 22, 46 12 C 42 8, 32 13, 28 24 Z" fill="#B4D9A2" />
      <Path
        d="M28 26 L 44 14"
        stroke="#5F8C50"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.55}
        fill="none"
      />
    </Svg>
  );
}

function QuestGlyph({ size = 44 }: { size?: number }) {
  const outerAngles = [0, 60, 120, 180, 240, 300];
  const innerAngles = [30, 90, 150, 210, 270, 330];
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <Circle cx={28} cy={28} r={22} fill="#fa719c" opacity={0.10} />
      {outerAngles.map((a) => (
        <Path
          key={`o-${a}`}
          d="M28 28 C 31 22, 31 12, 28 4 C 25 12, 25 22, 28 28 Z"
          fill="#f47ca4"
          opacity={0.9}
          transform={`rotate(${a} 28 28)`}
        />
      ))}
      {innerAngles.map((a) => (
        <Path
          key={`i-${a}`}
          d="M28 28 C 29.8 24, 29.8 16, 28 10 C 26.2 16, 26.2 24, 28 28 Z"
          fill="#a8315c"
          transform={`rotate(${a} 28 28)`}
        />
      ))}
      <Circle cx={28} cy={28} r={4.5} fill="#700034" />
      <Circle cx={28} cy={28} r={1.8} fill="#ffd4e1" />
    </Svg>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useMyProfile();
  const displayName = profile.data?.display_name || profile.data?.anonymous_alias?.replace(/^Bloom #/, '') || 'there';
  const avatarUri = profile.data?.avatar_url ?? null;
  // Mood: Zustand is the optimistic cache (set by useSubmitMood.onMutate),
  // persisted to AsyncStorage so the lock survives reloads. Server query is
  // the source of truth on a fresh device. Prefer local if present.
  const localMood = useMoodStore((s) => s.todayMood);
  const moodHydrated = useMoodStore((s) => s.hasHydrated);
  const ensureFreshMood = useMoodStore((s) => s.ensureFresh);
  useEffect(() => { ensureFreshMood(); }, [ensureFreshMood]);
  const todayForMe = useTodayForMe();
  const moodHistory = useMoodHistory(7);
  const submitMood = useSubmitMood();
  const unreadCount = useUnreadNotificationsCount().data;

  // Mood truth-source: optimistic local cache first, server query as fallback.
  // Must be declared before any hook below that reads it — JS temporal-dead-zone
  // means the useMemo closure would throw if this were declared later.
  const todayMood = localMood ?? (todayForMe.data?.mood
    ? {
        // DB row types `category` as raw `string`; narrow to EmotionCategory
        // since the DB CHECK constraint guarantees the value is one of the
        // 6 emotion keys.
        category: todayForMe.data.mood.category as EmotionCategory,
        intensity: todayForMe.data.mood.intensity,
        anchorWord: todayForMe.data.mood.anchor_word,
        colorHex: todayForMe.data.mood.color_hex,
      }
    : null);

  // 4 mood-targeted article picks for the "Recommended for you today" rail.
  // Stays stable through the day for the same mood (see getRecommendedArticles).
  const recommendedArticles = useMemo<ResourceArticle[]>(
    () => getRecommendedArticles(todayMood?.category, 4),
    [todayMood?.category],
  );

  function openArticle(id: string) {
    void Haptics.selectionAsync();
    router.push({ pathname: '/(main)/article', params: { id } });
  }
  const greetingText = greeting();

  // Current streak comes from today_for_me().streak (kept fresh by the DB
  // trigger T4). Falls back to 0 when the user has never checked in.
  const streakDays = todayForMe.data?.streak?.current_streak ?? 0;

  // Caption tells the truth about the trend rather than always being chirpy.
  const trendCaption = useMemo(() => {
    const data = moodHistory.data ?? [];
    const filled = data.filter((r) => r.intensity != null);
    if (filled.length === 0) {
      return 'Tap a mood above to begin shaping your week.';
    }
    if (filled.length < 3) {
      return 'A few check-ins in — your shape is starting to show.';
    }
    const half = Math.floor(filled.length / 2);
    const earlyAvg = filled.slice(0, half).reduce((s, r) => s + (r.intensity ?? 0), 0) / half;
    const lateAvg  = filled.slice(half).reduce((s, r) => s + (r.intensity ?? 0), 0) / (filled.length - half);
    if (lateAvg > earlyAvg + 0.4) {
      return 'Your mood has been brightening across the week.';
    }
    if (earlyAvg > lateAvg + 0.4) {
      return 'A heavier stretch. Be gentle with yourself — we are here.';
    }
    return 'A steady week. Steadiness is its own kind of bloom.';
  }, [moodHistory.data]);

  // 7-day trend, derived from server. Today is the last column.
  const trend = useMemo<TrendBar[]>(() => {
    if (!moodHistory.data || moodHistory.data.length === 0) return TREND_PLACEHOLDER;
    const todayISO = new Date().toISOString().slice(0, 10);
    return moodHistory.data.map((row) => {
      const dt = new Date(row.day + 'T00:00:00');
      const dayLetter = dt.toLocaleDateString('en-US', { weekday: 'narrow' });
      const isToday = row.day === todayISO;
      if (isToday) {
        return {
          day: dayLetter,
          heightPct: row.intensity != null ? row.intensity * 20 : 30,
          tone: 'today' as const,
        };
      }
      if (row.intensity != null) {
        return {
          day: dayLetter,
          heightPct: row.intensity * 20,
          tone: (row.intensity >= 3 ? 'pastMid' : 'pastFaint') as TrendTone,
        };
      }
      return { day: dayLetter, heightPct: 6, tone: 'empty' as const };
    });
  }, [moodHistory.data]);

  // Surface today's saved intention as the focus card title so it's the first
  // thing the user reads. Falls back to the default copy when none is set.
  const intention = useIntentionsStore((s) => s.today.primary);
  const ensureFreshIntention = useIntentionsStore((s) => s.ensureFresh);
  const hydrateIntention = useIntentionsStore((s) => s.hydrateFromServer);
  const openDrawer = useUIStore((s) => s.openDrawer);

  // Pull today's intention from Supabase so the focus card shows it even on
  // a fresh device / post-reinstall (where AsyncStorage is empty).
  const serverIntention = useTodayIntention();
  useEffect(() => {
    ensureFreshIntention();
  }, [ensureFreshIntention]);
  useEffect(() => {
    if (serverIntention.data) {
      hydrateIntention({
        primary_text: serverIntention.data.primary_text,
        tasks: serverIntention.data.tasks,
        honored: serverIntention.data.honored,
      });
    }
  }, [serverIntention.data, hydrateIntention]);

  const focusEyebrow = intention.trim() ? "TODAY'S INTENTION" : "TODAY'S FOCUS";

  // Quest progress from today's intentions — prefer server tasks, fall back to
  // the local store so the count is meaningful before the user opens the screen.
  const localTasks = useIntentionsStore((s) => s.today.tasks);
  const questTasks = serverIntention.data?.tasks?.length ? serverIntention.data.tasks : localTasks;
  const questDone = questTasks.filter((t) => t.done).length;
  const questTotal = questTasks.length;
  const questValue = questTotal > 0 ? `${questDone} / ${questTotal}` : 'Begin';
  const questLabel = questTotal > 0 ? "TODAY'S QUESTS" : 'SET YOUR INTENTION';
  const focusTitle   = intention.trim() ? intention : 'Setting Kind Intentions';
  const focusCtaLabel = intention.trim() ? 'Open' : 'Start';

  function openIntentions() {
    void Haptics.selectionAsync();
    router.push('/(main)/intentions');
  }

  // Treat the picker as locked while we still don't know if today's mood is
  // set: AsyncStorage hydration or the today_for_me() query may still be in
  // flight. Without this gate, the relogged-in user sees an interactive picker
  // for ~500ms after login and may tap a mood that's already saved.
  const moodResolving = !moodHydrated || todayForMe.isPending;
  const locked = moodResolving || todayMood !== null;

  function handleMoodSelect(mood: MoodOption) {
    if (locked) return;
    void Haptics.selectionAsync();
    submitMood.mutate({
      category: mood.key,
      intensity: DEFAULT_MOOD_INTENSITY,
      anchor_word: mood.label,
      color_hex: moodColor[mood.key],
    });
  }

  return (
    <View style={s.root}>
      {/* ─── Fixed Top App Bar ─── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={openDrawer}>
              <MaterialCommunityIcons name="menu" size={24} color={C.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(main)/profile')}
            >
              <View style={s.avatarRing}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatarImg} contentFit="cover" />
                ) : (
                  <View style={[s.avatarImg, s.avatarInitials]}>
                    <Text style={s.avatarInitialsText}>
                      {(profile.data?.display_name || profile.data?.anonymous_alias || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={s.onlineDot} />
              </View>
            </TouchableOpacity>
            <View>
              <Text style={s.brand}>InnerBloom</Text>
              <Text style={s.brandSub}>Premium Member</Text>
            </View>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity
              style={s.iconBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/(main)/notifications')}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color={C.onSurfaceVariant} />
              {(unreadCount ?? 0) > 0 ? <View style={s.notifDot} /> : null}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ─── Scrollable content ─── */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + HEADER_H + 16, paddingBottom: 160 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.section}>
          <Text style={s.greeting}>{greetingText}, {displayName}</Text>
          <View style={s.greetingSubRow}>
            <MaterialCommunityIcons name="white-balance-sunny" size={18} color={C.onSurfaceVariant} />
            <Text style={s.greetingSub}>A clear sky and a calm mind await you today.</Text>
          </View>
        </Animated.View>

        {/* Today's Focus — tap anywhere to open the Daily Intentions screen */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <TouchableOpacity
            style={s.focusCard}
            activeOpacity={0.9}
            onPress={openIntentions}
          >
            <View style={s.focusIcon}>
              <MaterialCommunityIcons name="target" size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.focusEyebrow}>{focusEyebrow}</Text>
              <Text style={s.focusTitle} numberOfLines={2}>{focusTitle}</Text>
            </View>
            <TouchableOpacity
              style={s.focusCta}
              activeOpacity={0.85}
              onPress={openIntentions}
            >
              <Text style={s.focusCtaText}>{focusCtaLabel}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>

        {/* Mood + Trend */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.moodCard}>
          <Text style={s.moodHeading}>How are you blooming?</Text>

          <View style={s.moodRow} pointerEvents={locked ? 'none' : 'auto'}>
            {MOODS.map((m) => {
              const active = todayMood?.category === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[s.moodItem, locked && !active && { opacity: 0.35 }]}
                  onPress={() => handleMoodSelect(m)}
                  activeOpacity={locked ? 1 : 0.75}
                  disabled={locked}
                >
                  {active && <View style={s.moodRing} />}
                  <View style={[s.moodCircle, active && s.moodCircleActive]}>
                    <MaterialCommunityIcons
                      name={m.icon}
                      size={active ? 26 : 22}
                      color={active ? C.onPrimaryContainer : C.onSurfaceVariant}
                    />
                  </View>
                  <Text style={[s.moodLabel, active && s.moodLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {locked && (
            <View style={s.moodLockedBadge}>
              <MaterialCommunityIcons name="check-circle-outline" size={13} color={C.primary} />
              <Text style={s.moodLockedText}>Checked in · unlocks tomorrow</Text>
            </View>
          )}

          {/* Trend chart */}
          <View style={s.trendWrap}>
            <View style={s.trendBars}>
              {trend.map((d, i) => {
                const isToday = d.tone === 'today';
                const isEmpty = d.tone === 'empty';
                const barColor =
                  d.tone === 'today'      ? 'rgba(153,69,49,0.60)' :
                  d.tone === 'pastMid'    ? 'rgba(153,69,49,0.40)' :
                  d.tone === 'pastFaint'  ? 'rgba(153,69,49,0.20)' :
                  C.surfaceContainer;
                return (
                  <View key={i} style={s.trendCol}>
                    <View style={s.trendBarShell}>
                      <View
                        style={[
                          s.trendBar,
                          { height: `${d.heightPct}%`, backgroundColor: barColor },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        s.trendLabel,
                        isToday && { color: C.primary },
                        isEmpty && { opacity: 0.3 },
                      ]}
                    >
                      {d.day}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.trendCaption}>{trendCaption}</Text>
          </View>
        </Animated.View>

        {/* Today's gentle practices */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={s.section}>
          <Text style={s.sectionHeading}>Today's gentle practices</Text>
          <View style={{ gap: 10 }}>
            {PRACTICES.map((p) => (
              <TouchableOpacity
                key={p.title}
                style={s.practiceRow}
                activeOpacity={0.85}
                onPress={() => {
                  void Haptics.selectionAsync();
                  if (p.route) router.push(p.route as any);
                }}
              >
                <View style={s.practiceIcon}>
                  <MaterialCommunityIcons name={p.icon} size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.practiceTitle}>{p.title}</Text>
                  <Text style={s.practiceSub}>{p.sub}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Quick Care */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={s.section}>
          <Text style={s.sectionHeading}>Quick Care</Text>
          <View style={s.quickGrid}>
            {QUICK_CARE.map((q) => (
              <TouchableOpacity
                key={q.key}
                style={[
                  s.quickCard,
                  q.cardBg && { backgroundColor: q.cardBg },
                  q.cardBorder && { borderColor: q.cardBorder },
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  void Haptics.selectionAsync();
                  if (q.key === 'journal')  router.push('/(main)/journal');
                  if (q.key === 'breathe')  router.push('/(main)/breathing');
                }}
              >
                <View style={[s.quickIcon, { backgroundColor: q.bg }]}>
                  <MaterialCommunityIcons name={q.icon} size={22} color={q.iconColor} />
                </View>
                <Text
                  style={[
                    s.quickLabel,
                    q.labelColor && { color: q.labelColor },
                    q.emphasis && { fontFamily: 'NunitoSans_600SemiBold' },
                  ]}
                >
                  {q.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Bloom AI Insight — tap to open AI Companion chat */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            void Haptics.selectionAsync();
            router.push('/(main)/ai-companion');
          }}
        >
          <Animated.View entering={FadeInDown.delay(180).springify()} style={s.insightCard}>
            <View style={s.insightGlow} />
            <View style={s.insightContent}>
              <MaterialCommunityIcons
                name="auto-fix"
                size={28}
                color={C.primary}
                style={{ marginBottom: 12 }}
              />
              <Text style={s.insightQuote}>
                "You are doing a wonderful job navigating your emotions today. Remember that your growth is not linear, but every small petal counts."
              </Text>
              <View style={s.insightAttrib}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.insightAvatar} contentFit="cover" />
                ) : (
                  <View style={[s.insightAvatar, s.avatarInitials]}>
                    <Text style={[s.avatarInitialsText, { fontSize: 10 }]}>
                      {(profile.data?.display_name || profile.data?.anonymous_alias || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={s.insightAttribText}>Insight from Bloom AI  →</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* Your Journey */}
        <Animated.View entering={FadeInDown.delay(220).springify()} style={s.section}>
          <Text style={s.sectionHeading}>Your Journey</Text>
          <View style={s.journeyGrid}>
            <TouchableOpacity
              style={s.journeyCard}
              activeOpacity={0.85}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push('/(main)/profile');
              }}
            >
              <View style={s.journeyGlyph}>
                <SproutGlyph size={48} />
              </View>
              <Text style={[s.journeyValue, { color: C.primary }]}>
                {streakDays === 1 ? '1 Day' : `${streakDays} Days`}
              </Text>
              <Text style={s.journeyLabel}>CURRENT STREAK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.journeyCard}
              activeOpacity={0.85}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push('/(main)/intentions');
              }}
            >
              <View style={s.journeyGlyph}>
                <QuestGlyph size={44} />
              </View>
              <Text style={[s.journeyValue, { color: C.tertiary }]}>{questValue}</Text>
              <Text style={s.journeyLabel}>{questLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Upcoming Circles */}
        <Animated.View entering={FadeInDown.delay(260).springify()} style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeading}>Upcoming Circles</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.sectionLink}>Join Queue</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 12 }}>
            {CIRCLES.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[s.circleRow, !c.accent && { opacity: 0.7 }]}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    s.circleDate,
                    c.accent
                      ? { backgroundColor: C.secondaryContainer }
                      : { backgroundColor: C.surfaceContainer },
                  ]}
                >
                  <Text
                    style={[
                      s.circleDateWhen,
                      c.accent ? { color: C.onSecondaryContainer } : { color: C.onSurfaceVariant },
                    ]}
                  >
                    {c.when}
                  </Text>
                  <Text
                    style={[
                      s.circleDateTime,
                      c.accent ? { color: C.onSecondaryContainer } : { color: C.onSurfaceVariant },
                    ]}
                  >
                    {c.time}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.circleTitle}>{c.title}</Text>
                  <Text style={s.circleMeta}>{c.meta}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={C.onSurfaceVariant} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Recommended for you today — mood-targeted article picks */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeading}>Recommended for today</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(main)/resources')}>
              <Text style={s.sectionLink}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.recRow}
          >
            {recommendedArticles.map((article) => {
              const cat = RESOURCE_CATEGORIES.find((c) => c.key === article.category);
              return (
                <TouchableOpacity
                  key={article.id}
                  style={s.recCard}
                  activeOpacity={0.85}
                  onPress={() => openArticle(article.id)}
                >
                  <View
                    style={[
                      s.recImageWrap,
                      { backgroundColor: cat?.bgColor ?? C.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={(cat?.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']) ?? 'book-open-variant'}
                      size={40}
                      color={cat?.iconColor ?? C.primary}
                    />
                    <View style={s.recBadge}>
                      <Text style={s.recBadgeText}>{article.minutes} MIN</Text>
                    </View>
                  </View>
                  <View style={s.recBody}>
                    <Text style={s.recTitle} numberOfLines={2}>{article.title}</Text>
                    <Text style={s.recSub} numberOfLines={2}>{article.excerpt}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </ScrollView>

    </View>
  );
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

  // Top app bar
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
    paddingHorizontal: 24,
  },
  topBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8  },

  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(153,69,49,0.20)',
    padding: 2,
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  avatarInitials: {
    backgroundColor: '#e8836b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: '#641e0e',
    lineHeight: 18,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.online,
    borderWidth: 2,
    borderColor: C.surface,
  },
  brand: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
    color: C.primary,
    letterSpacing: -0.1,
  },
  brandSub: {
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.error,
    borderWidth: 1,
    borderColor: C.surface,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 24,
    gap: 32,
  },

  // Sections
  section: { gap: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
  },
  sectionLink: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.28,
    color: C.primary,
  },

  // Greeting
  greeting: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    color: C.onSurface,
    letterSpacing: -0.32,
  },
  greetingSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    opacity: 0.85,
  },
  greetingSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurfaceVariant,
    flex: 1,
  },

  // Today's focus
  focusCard: {
    backgroundColor: 'rgba(153,69,49,0.05)',
    borderColor: 'rgba(153,69,49,0.10)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  focusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(153,69,49,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.primary,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  focusTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 24,
    color: C.onSurface,
  },
  focusCta: {
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  focusCtaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onPrimary,
    letterSpacing: 0.28,
  },

  // Mood card
  moodCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    ...softShadow,
  },
  moodHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 19,
    lineHeight: 26,
    color: C.onSurface,
    marginBottom: 24,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  moodItem: { alignItems: 'center', gap: 8, position: 'relative' },
  moodRing: {
    position: 'absolute',
    top: -4,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232,131,107,0.30)',
  },
  moodCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceContainer,
  },
  moodCircleActive: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primaryContainer,
  },
  moodLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  moodLabelActive: {
    color: C.primary,
  },
  moodLockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 20,
    alignSelf: 'center',
  },
  moodLockedText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.primary,
    letterSpacing: 0.3,
  },

  // Trend
  trendWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(219,193,187,0.30)',
    paddingTop: 20,
  },
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 64,
    gap: 12,
    paddingHorizontal: 4,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    height: '100%',
  },
  trendBarShell: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 3,
  },
  trendLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 12,
    color: C.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  trendCaption: {
    fontFamily: 'NunitoSans_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 14,
  },

  // Quick Care
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    flexBasis: '47.5%',
    flexGrow: 1,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
    ...softShadow,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurface,
    letterSpacing: 0.28,
  },

  // Bloom AI insight
  insightCard: {
    backgroundColor: 'rgba(250,220,213,0.55)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    ...softShadow,
  },
  insightGlow: {
    position: 'absolute',
    right: -48,
    bottom: -48,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(153,69,49,0.08)',
  },
  insightContent: {
    alignItems: 'center',
  },
  insightQuote: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 28,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  insightAttrib: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    marginTop: 22,
  },
  insightAvatar: { width: 22, height: 22, borderRadius: 11 },
  insightAttribText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },

  // Your Journey
  journeyGrid: { flexDirection: 'row', gap: 16 },
  journeyCard: {
    flex: 1,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    ...softShadow,
  },
  journeyGlyph: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  journeyValue: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: C.onSurface,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  journeyLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    color: C.onSurfaceVariant,
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  // Upcoming Circles
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    borderRadius: 16,
    padding: 14,
    ...softShadow,
  },
  circleDate: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDateWhen: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  circleDateTime: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
    lineHeight: 19,
    marginTop: 2,
  },
  circleTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  circleMeta: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // Recommended
  recRow: {
    gap: 14,
    paddingRight: 24,
    paddingBottom: 4,
  },
  recCard: {
    width: 252,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    ...softShadow,
  },
  recImageWrap: {
    height: 132,
    width: '100%',
    backgroundColor: C.surfaceContainer,
    position: 'relative',
  },
  recImage: { width: '100%', height: '100%' },
  recBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  recBadgeText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    color: C.onSurface,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recBody: { padding: 16, gap: 4 },
  recTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  recSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },

  // Gentle practices
  practiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    ...softShadow,
  },
  practiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(153,69,49,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  practiceSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5C4742',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 40,
  },
});
