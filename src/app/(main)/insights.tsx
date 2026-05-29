// Mood Journey / Insights screen.
//
// Opens from the trend chart on the dashboard. Aggregates the last
// 7 / 30 / 90 days of mood history (plus journal + intention counts) into:
//   1. A donut breaking moods into bright / steady / heavy tone families
//   2. A "Most common" horizontal-bar breakdown by mood category
//   3. Two computed Bloom Insights (heaviest day-of-week + journal correlation)
//   4. A horizontal activity scroll (check-ins, journal entries, honored intentions)
//
// Visual reference: design discussion 2026-05-29 — InnerBloom Material 3 tokens.

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useIntentionsHistory } from '../../lib/queries/intentions';
import { useJournalEntries } from '../../lib/queries/journal';
import { useMoodHistory } from '../../lib/queries/mood';
import type { EmotionCategory, MoodHistoryDay } from '../../types/database';

// ─── Design tokens (1:1 with InnerBloom palette) ─────────────────────────────
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
  tertiaryContainer:      '#fa719c',
  tertiaryFixed:          '#ffd9e1',
  onTertiaryFixedVariant: '#881645',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

const HEADER_H = 64;
const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

// ─── Mood taxonomy — 5 InnerBloom categories grouped into 3 tone families ────
// Tone family maps used by the donut. The 5 mood labels (Radiant/Good/Steady/
// Tired/Low) come from the dashboard's MOODS const — we mirror that vocabulary
// here so the legend/bar labels read identically across screens.

type ToneFamily = 'bright' | 'steady' | 'heavy';

const CATEGORY_TONE: Record<EmotionCategory, ToneFamily> = {
  happy:    'bright',
  hopeful:  'bright',
  neutral:  'steady',
  sad:      'heavy',
  stressed: 'heavy',
  anxious:  'heavy',
};

const CATEGORY_LABEL: Record<EmotionCategory, string> = {
  happy:    'Radiant',
  hopeful:  'Good',
  neutral:  'Steady',
  sad:      'Tired',
  stressed: 'Low',
  anxious:  'Anxious',
};

const TONE_META: Record<ToneFamily, { label: string; color: string; legendDot: string }> = {
  bright: { label: 'Bright', color: C.primaryContainer,        legendDot: C.primaryContainer },
  steady: { label: 'Steady', color: C.secondaryContainer,      legendDot: C.secondaryContainer },
  heavy:  { label: 'Heavy',  color: C.surfaceContainerHighest, legendDot: C.surfaceContainerHighest },
};

const PERIODS = [
  { key: 'week'  as const, label: 'Week',     days: 7  },
  { key: 'month' as const, label: 'Month',    days: 30 },
  { key: '3m'    as const, label: '3 Months', days: 90 },
];

// ─── Aggregation ─────────────────────────────────────────────────────────────

type ToneCount = { tone: ToneFamily; count: number; pct: number };
type CategoryCount = { category: EmotionCategory; label: string; count: number; pct: number };

function aggregateMood(history: MoodHistoryDay[]) {
  const checkins = history.filter((d) => d.category !== null);
  const total = checkins.length;

  // Tone family distribution for the donut.
  const toneCounts: Record<ToneFamily, number> = { bright: 0, steady: 0, heavy: 0 };
  // Per-category counts for the bar breakdown.
  const catCounts: Partial<Record<EmotionCategory, number>> = {};
  // For day-of-week pattern.
  const dowHeavy: number[] = [0, 0, 0, 0, 0, 0, 0];
  const dowTotal: number[] = [0, 0, 0, 0, 0, 0, 0];

  for (const d of checkins) {
    const cat = d.category as EmotionCategory;
    const tone = CATEGORY_TONE[cat];
    toneCounts[tone] += 1;
    catCounts[cat] = (catCounts[cat] ?? 0) + 1;

    const dow = new Date(d.day + 'T00:00:00').getDay(); // 0=Sun … 6=Sat
    dowTotal[dow] += 1;
    if (tone === 'heavy') dowHeavy[dow] += 1;
  }

  const tones: ToneCount[] = (['bright', 'steady', 'heavy'] as ToneFamily[]).map((t) => ({
    tone:  t,
    count: toneCounts[t],
    pct:   total > 0 ? Math.round((toneCounts[t] / total) * 100) : 0,
  }));

  const positivePct = tones[0].pct + tones[1].pct; // bright + steady

  const cats: CategoryCount[] = (Object.keys(catCounts) as EmotionCategory[])
    .map((k) => ({
      category: k,
      label:    CATEGORY_LABEL[k],
      count:    catCounts[k] ?? 0,
      pct:      total > 0 ? (catCounts[k] ?? 0) / total : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Heaviest day-of-week: requires at least 1 heavy day and the dow with the
  // highest heavy/total ratio.
  const dowNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  let heaviestDay: { name: string; ratio: number } | null = null;
  for (let i = 0; i < 7; i++) {
    if (dowTotal[i] >= 2 && dowHeavy[i] > 0) {
      const ratio = dowHeavy[i] / dowTotal[i];
      if (!heaviestDay || ratio > heaviestDay.ratio) {
        heaviestDay = { name: dowNames[i], ratio };
      }
    }
  }

  return { total, tones, positivePct, cats, heaviestDay };
}

// Quick "journal correlation" insight — compare avg intensity on days that
// have a journal entry vs days that don't. Returns null if data is too thin.
function journalCorrelation(
  history: MoodHistoryDay[],
  journalDays: Set<string>,
): { uplift: number } | null {
  const withJ: number[]   = [];
  const withoutJ: number[] = [];
  for (const d of history) {
    if (d.intensity == null) continue;
    if (journalDays.has(d.day)) withJ.push(d.intensity);
    else withoutJ.push(d.intensity);
  }
  if (withJ.length < 3 || withoutJ.length < 3) return null;
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const uplift = ((avg(withJ) - avg(withoutJ)) / 5) * 100;
  if (Math.abs(uplift) < 5) return null;
  return { uplift: Math.round(uplift) };
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
// Three concentric stroke arcs using stroke-dasharray. Same approach as the
// HTML reference — each arc takes its share of the 100-unit ring perimeter.

function MoodDonut({ tones, positivePct, total }: { tones: ToneCount[]; positivePct: number; total: number }) {
  // Build offsets so segments lay end-to-end starting at 12 o'clock.
  let cursor = 0;
  const arcs = tones.map((t) => {
    const arc = { tone: t.tone, dash: t.pct, offset: -cursor };
    cursor += t.pct;
    return arc;
  });

  return (
    <View style={s.donutWrap}>
      <Svg width={192} height={192} viewBox="0 0 36 36" style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track */}
        <Circle cx={18} cy={18} r={16} fill="transparent" stroke={C.surfaceContainer} strokeWidth={3.5} />
        {arcs.map((a) => (
          <Circle
            key={a.tone}
            cx={18}
            cy={18}
            r={16}
            fill="transparent"
            stroke={TONE_META[a.tone].color}
            strokeWidth={3.5}
            strokeDasharray={`${a.dash} 100`}
            strokeDashoffset={a.offset}
            strokeLinecap="round"
          />
        ))}
      </Svg>
      <View style={s.donutCenter} pointerEvents="none">
        <Text style={s.donutValue}>{total > 0 ? `${positivePct}%` : '—'}</Text>
        <Text style={s.donutCaption}>{total > 0 ? 'Positive' : 'No data yet'}</Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

// Carousel card width: exactly two cards fit per viewport, with no peek
// of a third. Third only appears after side-scrolling.
function computeActivityCardWidth(W: number): number {
  const usable = W - 24 - 24 - 14;
  return Math.max(130, Math.min(260, Math.floor(usable / 2)));
}

export default function InsightsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const activityCardWidth = computeActivityCardWidth(winW);
  const [period, setPeriod] = useState<typeof PERIODS[number]['key']>('3m');

  const days = PERIODS.find((p) => p.key === period)!.days;
  const moodHistory   = useMoodHistory(days);
  const journal       = useJournalEntries(500);
  const intentions    = useIntentionsHistory(days);

  // ─── Aggregations ────────────────────────────────────────────────────────
  const agg = useMemo(() => aggregateMood(moodHistory.data ?? []), [moodHistory.data]);

  const journalDays = useMemo(() => {
    const set = new Set<string>();
    for (const e of journal.data ?? []) set.add(e.entry_date);
    return set;
  }, [journal.data]);

  const journalInPeriod = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return (journal.data ?? []).filter((e) => new Date(e.entry_date + 'T00:00:00') >= cutoff).length;
  }, [journal.data, days]);

  const intentionsHonored = useMemo(
    () => (intentions.data ?? []).filter((d) => d.honored === true).length,
    [intentions.data],
  );

  const correlation = useMemo(
    () => journalCorrelation(moodHistory.data ?? [], journalDays),
    [moodHistory.data, journalDays],
  );

  // ─── Bloom insights — derived from real data, fall back to a gentle prompt ─
  const insights = useMemo(() => {
    const out: Array<{
      icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
      tint: 'tertiary' | 'secondary';
      copy: string;
      highlight: string;
    }> = [];
    if (agg.heaviestDay) {
      out.push({
        icon: 'calendar-month-outline',
        tint: 'tertiary',
        highlight: `feel heavier on ${agg.heaviestDay.name}`,
        copy: `You tend to {h}. A 5-minute breath check or a single intention can soften the start.`,
      });
    }
    if (correlation && correlation.uplift > 0) {
      out.push({
        icon: 'note-edit-outline',
        tint: 'secondary',
        highlight: `Days you journaled`,
        copy: `{h} averaged ${correlation.uplift}% higher mood. Worth keeping the rhythm.`,
      });
    } else if (correlation && correlation.uplift < 0) {
      out.push({
        icon: 'note-edit-outline',
        tint: 'secondary',
        highlight: `journaling days`,
        copy: `Your {h} ran lower in mood — sometimes the page holds what the day couldn't. That's its own kind of useful.`,
      });
    }
    return out;
  }, [agg.heaviestDay, correlation]);

  const loading = moodHistory.isLoading || journal.isLoading || intentions.isLoading;

  return (
    <View style={s.root}>
      {/* ─── Top bar ─── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={() => router.back()}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={C.primary} />
          </TouchableOpacity>
          <Text style={s.topTitle}>InnerBloom</Text>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + HEADER_H + 24, paddingBottom: 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header + period toggle ─── */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={{ gap: 16 }}>
          <View>
            <Text style={s.eyebrow}>INSIGHTS</Text>
            <Text style={s.pageTitle}>Mood Journey</Text>
          </View>
          <View style={s.toggleTrack}>
            {PERIODS.map((p) => {
              const active = p.key === period;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[s.toggleTab, active && s.toggleTabActive]}
                  activeOpacity={0.85}
                  onPress={() => setPeriod(p.key)}
                >
                  <Text style={[s.toggleTabText, active && s.toggleTabTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ─── Mood Distribution donut ─── */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={s.card}>
          <Text style={s.cardHeading}>Mood Distribution</Text>
          <MoodDonut tones={agg.tones} positivePct={agg.positivePct} total={agg.total} />
          <View style={s.legendRow}>
            {agg.tones.map((t) => (
              <View key={t.tone} style={s.legendCol}>
                <View style={[s.legendDot, { backgroundColor: TONE_META[t.tone].legendDot }]} />
                <Text style={s.legendLabel}>{TONE_META[t.tone].label}</Text>
                <Text style={s.legendValue}>{t.pct}%</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ─── Most common moods (bars) ─── */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={s.section}>
          <Text style={s.sectionHeading}>Most Common</Text>
          {agg.cats.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Once you've logged a few check-ins, your most common moods land here.</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {agg.cats.map((c, i) => {
                const tone = CATEGORY_TONE[c.category];
                const fillColor =
                  tone === 'bright' ? C.primaryContainer :
                  tone === 'steady' ? C.secondaryContainer :
                                      C.surfaceContainerHighest;
                const widthPct = Math.max(6, Math.round(c.pct * 100));
                return (
                  <View key={c.category} style={{ gap: 4 }}>
                    <View style={s.barRow}>
                      <Text style={s.barLabel}>{c.label}</Text>
                      <Text style={s.barCount}>{c.count} {c.count === 1 ? 'log' : 'logs'}</Text>
                    </View>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.barFill,
                          { width: `${widthPct}%`, backgroundColor: fillColor, opacity: i > 1 ? 0.65 : 1 },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* ─── Bloom Insights ─── */}
        <Animated.View entering={FadeInDown.delay(160).springify()} style={s.section}>
          <View style={s.sectionHeader}>
            <MaterialCommunityIcons name="head-heart" size={22} color={C.tertiary} />
            <Text style={s.sectionHeading}>Bloom Insights</Text>
          </View>
          {insights.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>
                Keep checking in for a few weeks — patterns will start to show up here gently.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {insights.map((ins, i) => {
                const tintBg     = ins.tint === 'tertiary' ? C.tertiaryFixed     : 'rgba(144,242,252,0.30)';
                const tintIcon   = ins.tint === 'tertiary' ? C.onTertiaryFixedVariant : C.onSecondaryContainer;
                const containerBg = ins.tint === 'tertiary' ? C.surfaceContainer : 'rgba(144,242,252,0.18)';
                const highlight   = ins.tint === 'tertiary' ? C.primary : C.secondary;
                const [before, after] = ins.copy.split('{h}');
                return (
                  <View key={i} style={[s.insightCard, { backgroundColor: containerBg }]}>
                    <View style={[s.insightIcon, { backgroundColor: tintBg }]}>
                      <MaterialCommunityIcons name={ins.icon} size={20} color={tintIcon} />
                    </View>
                    <Text style={s.insightCopy}>
                      {before}
                      <Text style={[s.insightHighlight, { color: highlight }]}>{ins.highlight}</Text>
                      {after}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* ─── Activity summary — horizontal scroll ─── */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={s.section}>
          <Text style={s.sectionHeading}>{periodLabel(period)} Activity</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.activityRowScroll}
            contentContainerStyle={s.activityRow}
          >
            <ActivityCard value={agg.total} label="Check-ins" valueColor={C.primary} width={activityCardWidth} />
            <ActivityCard value={journalInPeriod} label="Journal entries" valueColor={C.secondary} width={activityCardWidth} />
            <ActivityCard value={intentionsHonored} label="Intentions honored" valueColor={C.tertiary} width={activityCardWidth} />
          </ScrollView>
        </Animated.View>

        {loading && agg.total === 0 && (
          <View style={s.loadingHint}>
            <Text style={s.loadingHintText}>Gathering your journey…</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActivityCard({ value, label, valueColor, width }: { value: number; label: string; valueColor: string; width: number }) {
  return (
    <View style={[s.activityCard, { width }]}>
      <Text style={[s.activityValue, { color: valueColor }]}>{value}</Text>
      <Text style={s.activityLabel}>{label}</Text>
    </View>
  );
}

function periodLabel(p: typeof PERIODS[number]['key']) {
  return p === 'week' ? '7-Day' : p === 'month' ? '30-Day' : '3-Month';
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Top bar
  topBar: {
    ...Platform.select({
      web:     { position: 'fixed' as 'absolute', top: 0, left: 0, right: 0 },
      default: { position: 'absolute',           top: 0, left: 0, right: 0 },
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
    paddingHorizontal: 12,
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 19, lineHeight: 24,
    color: C.primary, letterSpacing: -0.1,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  // Layout
  scroll: { paddingHorizontal: 24, gap: 32 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Heading
  eyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.primary,
    marginBottom: 4,
  },
  pageTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32, lineHeight: 40,
    color: C.onSurface,
    letterSpacing: -0.32,
  },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28,
    color: C.onSurface,
    letterSpacing: -0.1,
  },

  // Period toggle (tabs)
  toggleTrack: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 9999,
    padding: 6,
    flexDirection: 'row',
  },
  toggleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  toggleTabActive: {
    backgroundColor: C.primaryContainer,
    shadowColor: '#5C4742',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  toggleTabText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 20,
    color: C.onSurfaceVariant,
    letterSpacing: 0.28,
  },
  toggleTabTextActive: {
    color: C.onPrimaryContainer,
    fontFamily: 'NunitoSans_700Bold',
  },

  // Donut card
  card: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    ...softShadow,
  },
  cardHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 26,
    color: C.onSurface,
  },
  donutWrap: {
    width: 192, height: 192,
    alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 32, lineHeight: 40,
    color: C.primary,
    letterSpacing: -0.32,
  },
  donutCaption: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.28,
    marginTop: 2,
  },

  // Donut legend
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  legendCol: { flex: 1, alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurface,
  },
  legendValue: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
  },

  // Bar breakdown
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 20,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  barCount: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.primary,
    letterSpacing: 0.2,
  },
  barTrack: {
    height: 12,
    width: '100%',
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 9999 },

  // Bloom insight cards
  insightCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    padding: 18,
    borderRadius: 20,
    ...softShadow,
  },
  insightIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  insightCopy: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 22,
    color: C.onSurfaceVariant,
  },
  insightHighlight: {
    fontFamily: 'NunitoSans_700Bold',
  },

  // Activity scroll
  // Bleed past parent's 24px padding so cards reach both screen edges.
  activityRowScroll: { marginHorizontal: -24 },
  activityRow: { gap: 14, paddingHorizontal: 24, paddingBottom: 4 },
  activityCard: {
    minWidth: 140,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.3)',
  },
  activityValue: {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 28, lineHeight: 34,
    letterSpacing: -0.2,
  },
  activityLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 4,
  },

  // Empty / loading
  emptyBox: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: 18,
  },
  emptyText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 20,
    color: C.onSurfaceVariant,
  },
  loadingHint: { alignItems: 'center', paddingVertical: 12 },
  loadingHintText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    color: C.outline,
    letterSpacing: 0.4,
  },
});
