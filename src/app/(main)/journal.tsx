import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useCreateJournalEntry,
  useJournalEntries,
  type JournalEntry,
} from '../../lib/queries/journal';
import { useUIStore } from '../../store/ui';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

// ─── Design tokens (1:1 design/emotional-journal.html) ───────────────────────
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
  onPrimaryContainer:     '#641e0e',
  secondary:              '#006970',
  secondaryContainer:     '#90f2fc',
  onSecondaryContainer:   '#006f77',
  outline:                '#88726d',
  outlineVariant:         '#dbc1bb',
  onSurface:              '#281814',
  onSurfaceVariant:       '#55433e',
} as const;

const HEADER_H = 64;

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

// ─── Mood Calendar data ───────────────────────────────────────────────────────
// intensity: 0 = empty, 1 = faint, 2 = light, 3 = mid, 4 = strong, 5 = full, -1 = today
type DayTile = { intensity: number; isToday?: boolean };

const CALENDAR_DAYS = 'M T W T F S S'.split(' ');
const CAL_DATA: DayTile[] = [
  { intensity: 0 }, { intensity: 0 }, { intensity: 1 }, { intensity: 3 }, { intensity: 4 },
  { intensity: 1 }, { intensity: 2 }, { intensity: 2 }, { intensity: 5 }, { intensity: 3 },
  { intensity: 4 }, { intensity: 2 }, { intensity: 1 }, { intensity: 2 },
  { intensity: 3, isToday: true }, { intensity: 0 }, { intensity: 0 }, { intensity: 0 },
  { intensity: 0 }, { intensity: 0 }, { intensity: 0 },
];

function calColor(d: DayTile): string {
  if (d.isToday) return 'rgba(232,131,107,0.80)';
  switch (d.intensity) {
    case 0: return C.surfaceContainerLow;
    case 1: return 'rgba(232,131,107,0.20)';
    case 2: return 'rgba(232,131,107,0.40)';
    case 3: return 'rgba(232,131,107,0.60)';
    case 4: return 'rgba(153,69,49,0.70)';
    case 5: return C.primary;
    default: return C.surfaceContainerLow;
  }
}

// ─── Mood Trends SVG ─────────────────────────────────────────────────────────
function MoodTrendChart() {
  const W = 320;
  const H = 120;
  const path = 'M0,100 Q50,40 100,70 T200,30 T300,90 T320,50';
  const area = `${path} V${H} H0 Z`;

  return (
    <View style={{ height: H, width: '100%' }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={C.primaryContainer} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={C.primaryContainer} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#chartGrad)" />
        <Path
          d={path}
          fill="none"
          stroke={C.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={100} cy={70} r={4} fill="white" stroke={C.primary} strokeWidth={2} />
        <Circle cx={200} cy={30} r={4} fill="white" stroke={C.primary} strokeWidth={2} />
        <Circle cx={300} cy={90} r={4} fill="white" stroke={C.primary} strokeWidth={2} />
      </Svg>
      {/* "Peak Today" tooltip */}
      <View style={s.peakTooltip}>
        <Text style={s.peakTooltipText}>Peak Today</Text>
      </View>
    </View>
  );
}

// ─── Entry display helpers ───────────────────────────────────────────────────
// Visual styling rotates per entry so the list doesn't look monochrome until
// we ship per-entry mood tagging. Keeps the editorial look while honest about
// the schema: we only persist body + timestamp.
const ENTRY_VARIANTS = [
  { moodBg: '#90f2fc',                moodColor: '#006f77', moodIcon: 'emoticon-happy-outline'   as const },
  { moodBg: '#fadcd5',                moodColor: '#55433e', moodIcon: 'emoticon-neutral-outline' as const },
  { moodBg: 'rgba(232,131,107,0.20)', moodColor: '#994531', moodIcon: 'emoticon-excited-outline' as const },
];

const DAY_PARTS = ['Late Night', 'Early Morning', 'Morning', 'Midday', 'Afternoon', 'Evening', 'Night'];

function partOfDay(hour: number): string {
  if (hour < 5)  return DAY_PARTS[0];
  if (hour < 9)  return DAY_PARTS[1];
  if (hour < 12) return DAY_PARTS[2];
  if (hour < 14) return DAY_PARTS[3];
  if (hour < 18) return DAY_PARTS[4];
  if (hour < 22) return DAY_PARTS[5];
  return DAY_PARTS[6];
}

function formatEntryDate(iso: string): { date: string; time: string; dayLabel: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const time = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  const weekday = d.toLocaleDateString('en-PH', { weekday: 'long' });
  const dayLabel = `${weekday} ${partOfDay(h)}`;
  return { date, time, dayLabel };
}

function excerptOf(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 140) return `"${trimmed}"`;
  return `"${trimmed.slice(0, 137).trimEnd()}…"`;
}

// Tab bar height — keep in sync with (main)/_layout.tsx → s.tabBar.height.
const TAB_BAR_H = Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82;

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [periodTab, setPeriodTab] = useState<'month' | 'week'>('month');
  const [showCompose, setShowCompose] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const openDrawer = useUIStore((s) => s.openDrawer);

  const entriesQuery = useJournalEntries();
  const createEntry = useCreateJournalEntry();

  const entries: JournalEntry[] = entriesQuery.data ?? [];
  const totalEntries = entries.length;

  function onNewEntry() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaveError(null);
    setShowCompose(true);
  }

  function closeCompose() {
    setShowCompose(false);
    setEntryText('');
    setSaveError(null);
  }

  function saveEntry() {
    const trimmed = entryText.trim();
    if (!trimmed || createEntry.isPending) return;
    createEntry.mutate(
      { body: trimmed },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          closeCompose();
          router.navigate('/(main)/dashboard');
        },
        onError: (err) => {
          // eslint-disable-next-line no-console
          console.error('[journal-save]', err);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setSaveError(err.message ?? 'Could not save. Try again.');
        },
      },
    );
  }

  return (
    <View style={s.root}>
      {/* ── Top Bar ── */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { paddingTop: insets.top, height: insets.top + HEADER_H }]}
      >
        <View style={s.topBarInner}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} onPress={openDrawer}>
            <MaterialCommunityIcons name="menu" size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={s.topBrand}>InnerBloom</Text>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + HEADER_H + 16, paddingBottom: 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.headerRow}>
          <View>
            <Text style={s.heroTitle}>Your journal</Text>
            <Text style={s.heroSub}>Reflection is the path to growth.</Text>
          </View>
          {/* Month / Week toggle */}
          <View style={s.toggleTrack}>
            {(['month', 'week'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[s.toggleBtn, periodTab === p && s.toggleBtnActive]}
                activeOpacity={0.8}
                onPress={() => setPeriodTab(p)}
              >
                <Text style={[s.toggleText, periodTab === p && s.toggleTextActive]}>
                  {p === 'month' ? 'Month' : 'Week'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Weekly Insight */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={s.insightCard}>
          <View style={s.insightIcon}>
            <MaterialCommunityIcons name="auto-fix" size={20} color={C.onPrimaryContainer} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.insightLabel}>Weekly Insight</Text>
            <Text style={s.insightBody}>
              You've expressed{' '}
              <Text style={s.insightBold}>gratitude</Text>
              {' '}in 4 of your last 5 entries. This consistency is strengthening your resilience. Keep blooming!
            </Text>
          </View>
        </Animated.View>

        {/* Mood Calendar */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardHeading}>Mood Calendar</Text>
            <Text style={s.cardAccent}>September</Text>
          </View>

          {/* Day labels */}
          <View style={s.calGrid}>
            {CALENDAR_DAYS.map((d, i) => (
              <View key={i} style={s.calCell}>
                <Text style={s.calDayLabel}>{d}</Text>
              </View>
            ))}
            {/* Tiles */}
            {CAL_DATA.map((d, i) => (
              <View
                key={i}
                style={[
                  s.calTile,
                  { backgroundColor: calColor(d) },
                  d.isToday && { borderWidth: 2, borderColor: C.primary },
                ]}
              />
            ))}
          </View>

          {/* Legend */}
          <View style={s.legendRow}>
            <View style={s.legendLeft}>
              <Text style={s.legendLabel}>Low</Text>
              {[C.surfaceContainerLow, 'rgba(232,131,107,0.40)', 'rgba(153,69,49,0.60)', C.primary].map((bg, i) => (
                <View key={i} style={[s.legendDot, { backgroundColor: bg }]} />
              ))}
              <Text style={s.legendLabel}>High</Text>
            </View>
            <TouchableOpacity style={s.detailsBtn} activeOpacity={0.7}>
              <Text style={s.detailsBtnText}>Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={C.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Mood Trends */}
        <Animated.View entering={FadeInDown.delay(130).springify()} style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardHeading}>Mood Trends</Text>
            <Text style={s.cardSubLabel}>LAST 7 DAYS</Text>
          </View>
          <View style={s.chartWrap}>
            <MoodTrendChart />
          </View>
        </Animated.View>

        {/* Recent Entries */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Recent Entries</Text>
            {totalEntries > 0 && (
              <Text style={s.seeAll}>{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</Text>
            )}
          </View>

          {entriesQuery.isLoading && (
            <View style={s.entryLoading}>
              <Text style={s.entryEmptySub}>Loading your entries…</Text>
            </View>
          )}

          {!entriesQuery.isLoading && entries.length === 0 && (
            <View style={s.entryEmpty}>
              <MaterialCommunityIcons name="notebook-outline" size={36} color={C.outlineVariant} />
              <Text style={s.entryEmptyTitle}>No entries yet</Text>
              <Text style={s.entryEmptySub}>
                Tap the pencil to write your first reflection — even a sentence counts.
              </Text>
            </View>
          )}

          <View style={{ gap: 12 }}>
            {entries.map((e, i) => {
              const variant = ENTRY_VARIANTS[i % ENTRY_VARIANTS.length];
              const { date, time, dayLabel } = formatEntryDate(e.created_at);
              return (
                <TouchableOpacity
                  key={e.id}
                  style={s.entryCard}
                  activeOpacity={0.88}
                >
                  <View style={s.entryTop}>
                    <View>
                      <View style={s.entryDateRow}>
                        <Text style={s.entryDate}>{date}</Text>
                        <View style={s.entryDot} />
                        <Text style={s.entryTime}>{time}</Text>
                      </View>
                      <Text style={s.entryDayLabel}>{dayLabel}</Text>
                    </View>
                    <View style={[s.entryMood, { backgroundColor: variant.moodBg }]}>
                      <MaterialCommunityIcons name={variant.moodIcon} size={24} color={variant.moodColor} />
                    </View>
                  </View>
                  <Text style={s.entryExcerpt} numberOfLines={4}>{excerptOf(e.body)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Compose modal (new entry) ── */}
      <Modal
        visible={showCompose}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCompose}
      >
        <View style={s.composeRoot}>
          <View style={[s.composeHeader, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={closeCompose} style={s.composeClose} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close" size={22} color={C.onSurface} />
            </TouchableOpacity>
            <Text style={s.composeTitle}>New Entry</Text>
            <TouchableOpacity
              style={[
                s.composeSave,
                (!entryText.trim() || createEntry.isPending) && { opacity: 0.4 },
              ]}
              disabled={!entryText.trim() || createEntry.isPending}
              onPress={saveEntry}
              activeOpacity={0.85}
            >
              <Text style={s.composeSaveText}>
                {createEntry.isPending ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.composeDateBadge}>
            <Text style={s.composeDateText}>
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          <TextInput
            style={s.composeInput}
            multiline
            placeholder="Write freely… this is your safe space."
            placeholderTextColor={C.outlineVariant}
            value={entryText}
            onChangeText={(t) => { setEntryText(t); if (saveError) setSaveError(null); }}
            autoFocus
            textAlignVertical="top"
          />

          {saveError && (
            <View style={s.composeError}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b3261e" />
              <Text style={s.composeErrorText} numberOfLines={2}>{saveError}</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* ── FAB (new entry) — sits cleanly above the tab bar ── */}
      <TouchableOpacity
        style={[s.fab, { bottom: insets.bottom + TAB_BAR_H + 16 }]}
        activeOpacity={0.88}
        onPress={onNewEntry}
      >
        <MaterialCommunityIcons name="pencil-outline" size={28} color={C.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
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
    paddingHorizontal: 20,
  },
  topBrand: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 24,
    color: C.primary,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scroll: { paddingHorizontal: 24, gap: 24 },

  // Header row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    color: C.onSurface,
  },
  heroSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: C.surfaceContainer,
    borderRadius: 9999,
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  toggleBtnActive: {
    backgroundColor: C.surfaceContainerLowest,
    shadowColor: '#5C4742',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  toggleText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  toggleTextActive: { color: C.primary },

  // Insight card
  insightCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(232,131,107,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232,131,107,0.25)',
    borderRadius: 24,
    padding: 20,
    gap: 14,
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  insightLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.onPrimaryContainer,
    marginBottom: 4,
  },
  insightBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onPrimaryContainer,
    opacity: 0.9,
  },
  insightBold: {
    fontFamily: 'NunitoSans_600SemiBold',
    color: C.primary,
  },

  // Card
  card: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.30)',
    ...softShadow,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
  },
  cardAccent: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
  },
  cardSubLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Mood Calendar
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  calCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDayLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    color: C.outline,
    letterSpacing: 0.3,
  },
  calTile: {
    width: `${100 / 7 - 1}%`,
    aspectRatio: 1,
    borderRadius: 6,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 14,
    color: C.outline,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  legendDot: {
    width: 12, height: 12, borderRadius: 3,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.primary,
  },

  // Trend chart
  chartWrap: {
    position: 'relative',
    marginTop: 8,
  },
  peakTooltip: {
    position: 'absolute',
    top: 0,
    left: '46%',
    backgroundColor: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  peakTooltipText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    lineHeight: 14,
    color: C.onPrimary,
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: C.onSurface,
  },
  seeAll: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
  },

  // Entry card
  entryCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.25)',
    gap: 12,
  },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  entryDate: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: C.primary,
  },
  entryDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: C.outlineVariant,
  },
  entryTime: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  entryDayLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurfaceVariant,
  },
  entryMood: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5C4742',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  entryExcerpt: {
    fontFamily: 'NunitoSans_400Regular',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurface,
  },

  // Empty / loading
  entryLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  entryEmpty: {
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.40)',
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  entryEmptyTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurface,
    marginTop: 4,
  },
  entryEmptySub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Compose inline error
  composeError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(186,26,26,0.10)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  composeErrorText: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: '#b3261e',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: C.surface,
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  // Compose modal
  composeRoot: {
    flex: 1,
    backgroundColor: C.surface,
    paddingHorizontal: 24,
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  composeClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  composeSave: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: C.primary,
  },
  composeSaveText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: C.onPrimary,
    textTransform: 'uppercase',
  },
  composeDateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    marginTop: 4,
    marginBottom: 18,
  },
  composeDateText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: C.primary,
    textTransform: 'uppercase',
  },
  composeInput: {
    flex: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 17,
    lineHeight: 26,
    color: C.onSurface,
    paddingVertical: 8,
    ...Platform.select({
      web: { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as object,
      default: {},
    }),
  },
});
