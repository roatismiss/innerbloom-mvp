import { useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { DEFAULT_MOOD_INTENSITY, greeting, moodColor } from '../../lib/mood';
import { useTodayIntention } from '../../lib/queries/intentions';
import { useMoodHistory, useSubmitMood, useTodayForMe } from '../../lib/queries/mood';
import { useMyProfile, useProfileStats } from '../../lib/queries/profile';
import { useIntentionsStore } from '../../store/intentions';
import { useMoodStore } from '../../store/mood';
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

const RECOMMENDED = [
  {
    title: 'Gentle Morning Release',
    sub:   'Release tension from your sleep.',
    badge: '10 MIN',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARbUiNgY4rzIBzfPMBckEAuuCAOcZUR4gYLBzCBZf-i3VcHe6L-FVex6ZsRjgYcuAn2mt-dl3jup_p-J9RNuQNAUYyvaHM9Ud7nHMRTqXbmj38xUgINaQ7H1q_D6UxNeDDkYIEsrYru5yuIpcJXdmlaaKHRwYAlQQ998YTu6n7Q_o1RUQAt6K80S_CWv4Nf6d32gibJvdE2yMMZKdWYiLMsXP1GvHhN-5uJ2EXknDtIvdkXcO8N-grDLa2eu9Oztkd6M94PgUW182W',
  },
  {
    title: 'Gratitude Reflections',
    sub:   'Write down three tiny joys.',
    badge: 'PROMPT',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4UvfAnZOOLcCavI22pzP-bnY6Bef_sF6NHxzraqS4O2B1uxp_vnBGHs9UuHivigs-CeD9v2yRhHYntL6jDf_8N2soiyHwZua-PGEwMq4jffGZdx-p18WJ4_TdV9O3PQn5IL1ibg-6OUgj2K9DwhDt7rdJk5v1d2YmdRPoz8lHjcBVczE1rBS-o2KAB9a094zN-6VkmXgsbZF-C2FDjUhpKRlCQC-ZfUnVtF4k5ahQgc_uYuMDQInQ9tFWI838GeCof0YUJt9Sbsvg',
  },
];

const PROFILE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuApSgPTkTEtRCoihcOFOolOJH8DpWq-xWNDquVXQDNU_Ue1pgQrECRouxEatRFVytCZNFSpHYHWs1O6VCd3CE-BMRb8sf568yFdukyR1ckduL8WCBSo9puySCIUTvhgBWouEOsl-NKiQzkhHy2kyRLHs1S6cCUvE3KFfciDl-0hJ9UXcYGclhIF22JyFdJ8QK6Rrmw1jzCAflS5rWLJX48OhSjXc0TCSutYK_T_Y9ChlB8btkRzzwf7by00imVljDM4_a9grOEwB3qV';

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
      <Path
        d="M28 32 C 22 33, 14 30, 10 23 C 14 19, 23 22, 28 30 Z"
        fill="#9BC58A"
      />
      <Path
        d="M27 31 L 14 24"
        stroke="#5F8C50"
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.55}
        fill="none"
      />
      <Path
        d="M28 26 C 33 28, 42 22, 46 12 C 42 8, 32 13, 28 24 Z"
        fill="#B4D9A2"
      />
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

export default function FeedHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayMood: localMood, hasHydrated } = useMoodStore();
  const submitMood = useSubmitMood();
  const serverData = useTodayForMe();

  const todayMood = localMood ?? (serverData.data?.mood
    ? {
        category:   serverData.data.mood.category as EmotionCategory,
        intensity:  serverData.data.mood.intensity,
        anchorWord: serverData.data.mood.anchor_word,
        colorHex:   serverData.data.mood.color_hex,
      }
    : null);

  const moodResolving = !hasHydrated || serverData.isPending;
  const moodLocked    = moodResolving || todayMood !== null;
  const greetingText = greeting();
  const profile = useMyProfile();
  const displayName = profile.data?.display_name || profile.data?.anonymous_alias?.replace('Bloom #', '') || 'there';

  // ─── Your Journey: live data ─────────────────────────────────────────────
  // Streak comes from `mood_streaks` (server-truth, updated by trigger on each
  // mood check-in). Falls back to 0 while loading.
  const stats = useProfileStats();
  const streakDays = stats.data?.currentStreak ?? 0;
  const streakLabel = `${streakDays} ${streakDays === 1 ? 'Day' : 'Days'}`;

  // Quest progress: today's intentions — prefer server snapshot, fall back to
  // the local store so the count shows even before the user opens the screen.
  const intentionQ = useTodayIntention();
  const localTasks = useIntentionsStore((s) => s.today.tasks);
  const tasks = intentionQ.data?.tasks?.length ? intentionQ.data.tasks : localTasks;
  const taskDone = tasks.filter((t) => t.done).length;
  const taskTotal = tasks.length;
  const questValue = taskTotal > 0 ? `${taskDone} / ${taskTotal}` : 'Begin';
  const questLabel = taskTotal > 0 ? "TODAY'S QUESTS" : 'SET YOUR INTENTION';

  // ─── Mood trend chart: live 7-day history ────────────────────────────────
  const moodHistoryQ = useMoodHistory(7);
  const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
  const trendBars = useMemo(() => {
    const rows = (moodHistoryQ.data ?? [])
      .slice()
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-7);
    // Pad to 7 slots from the left if fewer days available
    const padded = Array.from({ length: 7 }, (_, i) => rows[i - (7 - rows.length)] ?? null);
    const todayStr = new Date().toISOString().slice(0, 10);
    return padded.map((d, i) => {
      const hasData = d !== null && d.intensity !== null;
      const isToday = d?.day === todayStr;
      const heightPct = hasData ? Math.max(10, Math.round((d!.intensity! / 5) * 100)) : 5;
      const dayLabel = d ? DAY_INITIALS[new Date(d.day + 'T12:00:00').getDay()] : DAY_INITIALS[i];
      let tone: 'today' | 'pastMid' | 'pastFaint' | 'future';
      if (!hasData) tone = 'future';
      else if (isToday) tone = 'today';
      else if (i >= 4) tone = 'pastMid';
      else tone = 'pastFaint';
      return { day: dayLabel, heightPct, tone };
    });
  }, [moodHistoryQ.data]);

  function handleMoodSelect(mood: MoodOption) {
    if (moodLocked) return;
    void Haptics.selectionAsync();
    submitMood.mutate({
      category:    mood.key,
      intensity:   DEFAULT_MOOD_INTENSITY,
      anchor_word: mood.label,
      color_hex:   moodColor[mood.key],
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
            <View style={s.avatarRing}>
              <Image source={{ uri: PROFILE_IMG }} style={s.avatarImg} contentFit="cover" />
              <View style={s.onlineDot} />
            </View>
            <View>
              <Text style={s.brand}>InnerBloom</Text>
              <Text style={s.brandSub}>Premium Member</Text>
            </View>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={C.onSurfaceVariant} />
              <View style={s.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={C.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ─── Scrollable content ─── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + HEADER_H + 16, paddingBottom: 32 },
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

        {/* Today's Focus */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={s.focusCard}>
          <View style={s.focusIcon}>
            <MaterialCommunityIcons name="target" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.focusEyebrow}>TODAY'S FOCUS</Text>
            <Text style={s.focusTitle}>Setting Kind Intentions</Text>
          </View>
          <TouchableOpacity style={s.focusCta} activeOpacity={0.85}>
            <Text style={s.focusCtaText}>Start</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Mood + Trend */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.moodCard}>
          <Text style={s.moodHeading}>How are you blooming?</Text>

          <View style={s.moodRow}>
            {MOODS.map((m) => {
              const active = todayMood?.category === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[s.moodItem, moodLocked && !active && { opacity: 0.45 }]}
                  onPress={() => handleMoodSelect(m)}
                  disabled={moodLocked}
                  activeOpacity={0.75}
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

          {moodLocked && !moodResolving && (
            <Text style={s.moodLockedHint}>Checked in today · unlocks tomorrow</Text>
          )}

          {/* Trend chart */}
          <View style={s.trendWrap}>
            <View style={s.trendBars}>
              {trendBars.map((d, i) => {
                const isToday = d.tone === 'today';
                const isFuture = d.tone === 'future';
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
                        isToday  && { color: C.primary },
                        isFuture && { opacity: 0.3 },
                      ]}
                    >
                      {d.day}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.trendCaption}>
              Your mood has been improving consistently this week.
            </Text>
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

        {/* Bloom AI Insight — tap to open Bloom AI chat */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            void Haptics.selectionAsync();
            router.push('/(main)/bloom');
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
                <Image source={{ uri: PROFILE_IMG }} style={s.insightAvatar} contentFit="cover" />
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
              <Text style={[s.journeyValue, { color: C.primary }]}>{streakLabel}</Text>
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

        {/* Recommended */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionHeading}>Recommended</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.sectionLink}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.recRowScroll}
            contentContainerStyle={s.recRow}
          >
            {RECOMMENDED.map((r) => (
              <TouchableOpacity key={r.title} style={s.recCard} activeOpacity={0.85}>
                <View style={s.recImageWrap}>
                  <Image source={{ uri: r.image }} style={s.recImage} contentFit="cover" />
                  <View style={s.recBadge}>
                    <Text style={s.recBadgeText}>{r.badge}</Text>
                  </View>
                </View>
                <View style={s.recBody}>
                  <Text style={s.recTitle}>{r.title}</Text>
                  <Text style={s.recSub}>{r.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
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
    ...Platform.select({
      web: { position: 'fixed' as 'absolute', top: 0, left: 0, right: 0 },
      default: { position: 'absolute', top: 0, left: 0, right: 0 },
    }),
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
  moodLockedHint: {
    fontSize: 12,
    fontFamily: 'NunitoSans_400Regular',
    color: C.outline,
    textAlign: 'center',
    marginTop: 8,
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
  // Bleeds past parent's 24px horizontal padding so cards touch both screen
  // edges instead of clipping with a peach gutter.
  recRowScroll: { marginHorizontal: -24 },
  recRow: {
    gap: 14,
    paddingHorizontal: 24,
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
