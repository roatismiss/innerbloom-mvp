import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScrollTopOnFocus } from '../../lib/use-scroll-top-on-focus';

// ─── Design tokens (AGENTS.md canonical + Recovery bespoke palette) ──────────
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
  primaryFixedDim:       '#ffb4a3',
  onPrimary:             '#ffffff',
  onPrimaryContainer:    '#641e0e',
  secondary:             '#006970',
  secondaryContainer:    '#90f2fc',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  outlineVariant:        '#dbc1bb',
  error:                 '#ba1a1a',
  onError:               '#ffffff',
  // Bespoke palette for this circle.
  forestSage:            '#5a7a5e',
  sunriseGold:           '#d4a04a',
  amberGlow:             '#e8a87c',
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_BAR_H = Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82;

const CRISIS = { label: 'SOS Hotline 1553', tel: '1553' } as const;

// ─── Mock content ────────────────────────────────────────────────────────────

type HALT = 'hungry' | 'angry' | 'lonely' | 'tired';
const HALT_OPTS: { id: HALT; icon: Mci; label: string; color: string }[] = [
  { id: 'hungry', icon: 'silverware-fork-knife',  label: 'Hungry', color: C.sunriseGold },
  { id: 'angry',  icon: 'fire',                   label: 'Angry',  color: C.error },
  { id: 'lonely', icon: 'account-off-outline',    label: 'Lonely', color: C.secondary },
  { id: 'tired',  icon: 'moon-waning-crescent',   label: 'Tired',  color: C.primary },
];

const JFT_CHIPS = ['Attend a meeting', 'Drink 2L of water', 'Call mom'];

interface Meeting { id: string; status: string; statusBg: string; statusFg: string; title: string; sub: string; accent: string }
const MEETINGS: Meeting[] = [
  { id: 'm1', status: 'Happening Now', statusBg: 'rgba(90,122,94,0.10)', statusFg: C.forestSage,        title: 'AA Open Step',    sub: '142 people in room', accent: C.forestSage  },
  { id: 'm2', status: 'In 15 Mins',    statusBg: C.surfaceContainerHigh, statusFg: C.onSurfaceVariant,  title: 'SMART Tools',     sub: 'Check-in group',     accent: C.sunriseGold },
  { id: 'm3', status: 'In 40 Mins',    statusBg: C.surfaceContainerHigh, statusFg: C.onSurfaceVariant,  title: 'Refuge Recovery', sub: 'Meditation based',   accent: C.secondary   },
];

type Path = '12-step' | 'smart' | 'harm-reduction' | 'mat' | 'secular';
const PATHS: { id: Path; label: string }[] = [
  { id: '12-step',        label: '12-Step' },
  { id: 'smart',          label: 'SMART' },
  { id: 'harm-reduction', label: 'Harm Reduction' },
  { id: 'mat',            label: 'MAT' },
  { id: 'secular',        label: 'Secular' },
];

interface Milestone { id: string; icon: Mci; title: string; who: string; tint: string; bg: string; borderC: string }
const MILESTONES: Milestone[] = [
  { id: 'ms1', icon: 'star-four-points', title: 'Year 1',     who: 'Sarah J.',  tint: C.forestSage,      bg: 'rgba(90,122,94,0.06)',  borderC: 'rgba(90,122,94,0.22)' },
  { id: 'ms2', icon: 'refresh',          title: 'Day 1 again', who: 'Marcus L.', tint: C.primaryContainer, bg: 'rgba(232,131,107,0.10)', borderC: 'rgba(232,131,107,0.32)' },
];

interface Reaction { icon: Mci; iconColor: string; label: string }
interface Post { id: string; initial: string; tint: string; fg: string; name: string; when: string; dayLabel: string; dayColor: string; body: string; bodyItalic?: boolean; reactions: Reaction[] }
const POSTS: Post[] = [
  {
    id: 'p1',
    initial: 'ML',
    tint: 'rgba(232,131,107,0.20)',
    fg: C.primary,
    name: 'Marcus L.',
    when: '10 mins ago',
    dayLabel: 'Day 1',
    dayColor: C.primary,
    bodyItalic: true,
    body: '"I slipped. Feel heavy with shame but I\'m here. Posting because honesty is the only way back. I\'m starting over today."',
    reactions: [
      { icon: 'heart-outline', iconColor: C.secondary, label: "I'm with you" },
      { icon: 'arm-flex',      iconColor: C.primary,   label: 'Strength' },
    ],
  },
  {
    id: 'p2',
    initial: 'AK',
    tint: 'rgba(144,242,252,0.30)',
    fg: C.secondary,
    name: 'Anaya K.',
    when: '2 hours ago',
    dayLabel: 'Day 89',
    dayColor: C.forestSage,
    body: '"Feeling really shaky this afternoon. The cravings are loud. Taking it one breath at a time."',
    reactions: [
      { icon: 'human',          iconColor: C.primary,   label: 'Felt this in my body' },
      { icon: 'forum-outline',  iconColor: C.secondary, label: 'Stay strong' },
    ],
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CircleRecoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useScrollTopOnFocus();

  const [activeHalt, setActiveHalt] = useState<HALT | null>(null);
  const [activePath, setActivePath] = useState<Path>('12-step');
  const [jft, setJft] = useState('');

  const headerH = 64;

  function goBack() {
    void Haptics.selectionAsync();
    router.replace('/(main)/community');
  }

  function callCrisis() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void Linking.openURL(`tel:${CRISIS.tel}`);
  }

  function openComposer() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(main)/post-composer',
      params: { circleId: 'recovery', anonymous: '0' },
    });
  }

  function logToday() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Future: writes to a recovery_streaks table. For now just bumps a haptic.
  }

  // Floating sun in the hero — gentle vertical bob.
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [bob]);
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -5 + bob.value * 10 }],
  }));

  return (
    <View style={s.root}>
      {/* Top App Bar */}
      <View style={[s.topBar, { paddingTop: insets.top, height: insets.top + headerH }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>Recovery</Text>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="cog-outline" size={22} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + headerH,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient
            colors={[C.primaryFixed, C.amberGlow]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={s.hero}
          >
            <Animated.View style={[s.heroBlob, bobStyle]} />
            <View style={s.heroPad}>
              <View style={s.heroDisc}>
                <MaterialCommunityIcons name="white-balance-sunny" size={22} color={C.onPrimaryContainer} />
              </View>
              <Text style={s.heroQuote}>
                Recovery is a choice you can make today.{'\n'}And tomorrow. And the day after.
              </Text>
            </View>
            <View style={s.heroHorizon} />
          </LinearGradient>
        </Animated.View>

        {/* ── Day counter ── */}
        <Animated.View entering={FadeInUp.delay(60).springify()} style={s.streakWrap}>
          <View style={s.streakCard}>
            <Text style={s.streakEyebrow}>Current Streak</Text>
            <Text style={s.streakNumber}>47</Text>
            <Text style={s.streakSub}>Days of courage</Text>
            <View style={s.streakActions}>
              <TouchableOpacity activeOpacity={0.85} onPress={logToday} style={s.streakBtnFilled}>
                <MaterialCommunityIcons name="plus" size={16} color="#ffffff" />
                <Text style={s.streakBtnFilledText}>Log today</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={s.streakBtnOutline}>
                <Text style={s.streakBtnOutlineText}>I'm shaky</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={s.streakBtnSoft}>
                <Text style={s.streakBtnSoftText}>Day 1 again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── Craving SOS ── */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={s.sosWrap}>
          <LinearGradient
            colors={[C.amberGlow, C.sunriseGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.sosCard}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.sosTitle}>Craving hitting hard?</Text>
              <Text style={s.sosSub}>Don't sit with it alone.</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={s.sosBtn} onPress={callCrisis}>
              <Text style={s.sosBtnText}>Call the circle</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ── HALT Check ── */}
        <Animated.View entering={FadeInUp.delay(140).springify()} style={s.haltWrap}>
          <Text style={[s.sectionHeading, { paddingLeft: 8, marginBottom: 14 }]}>HALT Check</Text>
          <View style={s.haltGrid}>
            {HALT_OPTS.map((h) => {
              const active = activeHalt === h.id;
              return (
                <TouchableOpacity
                  key={h.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setActiveHalt((cur) => (cur === h.id ? null : h.id));
                  }}
                  style={[s.haltCard, active && { borderColor: h.color, backgroundColor: 'rgba(255,255,255,0.7)' }]}
                >
                  <MaterialCommunityIcons name={h.icon} size={26} color={h.color} />
                  <Text style={s.haltLabel}>{h.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Just for today ── */}
        <Animated.View entering={FadeInUp.delay(180).springify()} style={s.jftWrap}>
          <View style={s.jftCard}>
            <Text style={s.jftTitle}>Just for today…</Text>
            <TextInput
              value={jft}
              onChangeText={setJft}
              placeholder="I will [take a 10 min walk]"
              placeholderTextColor={C.outline}
              style={s.jftInput}
            />
            <View style={s.jftChipsRow}>
              {JFT_CHIPS.map((c) => (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.85}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setJft(c);
                  }}
                  style={s.jftChip}
                >
                  <Text style={s.jftChipText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Live Meetings ── */}
        <Animated.View entering={FadeInUp.delay(220).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Live Meetings</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.linkLabel}>View all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.meetingsRow}
          >
            {MEETINGS.map((m) => (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.88}
                style={[s.meetingCard, { borderLeftColor: m.accent }]}
              >
                <View style={[s.meetingPill, { backgroundColor: m.statusBg }]}>
                  <Text style={[s.meetingPillText, { color: m.statusFg }]}>{m.status}</Text>
                </View>
                <Text style={s.meetingTitle}>{m.title}</Text>
                <Text style={s.meetingSub}>{m.sub}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Recovery Paths ── */}
        <Animated.View entering={FadeInUp.delay(260).springify()} style={s.section}>
          <Text style={[s.sectionHeading, { paddingLeft: 32, marginBottom: 14 }]}>Recovery Paths</Text>
          <View style={s.pathsRow}>
            {PATHS.map((p) => {
              const active = activePath === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setActivePath(p.id);
                  }}
                  style={[s.pathChip, active && s.pathChipActive]}
                >
                  <Text style={[s.pathLabel, active && s.pathLabelActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Today's Milestones ── */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={s.section}>
          <Text style={[s.sectionHeading, { paddingLeft: 32, marginBottom: 14 }]}>Today's Milestones</Text>
          <View style={s.milestonesGrid}>
            {MILESTONES.map((ms) => (
              <View key={ms.id} style={[s.milestoneCard, { backgroundColor: ms.bg, borderColor: ms.borderC }]}>
                <View style={[s.milestoneIcon, { backgroundColor: ms.tint }]}>
                  <MaterialCommunityIcons name={ms.icon} size={22} color="#ffffff" />
                </View>
                <Text style={s.milestoneTitle}>{ms.title}</Text>
                <Text style={s.milestoneWho}>{ms.who}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Community Feed ── */}
        <Animated.View entering={FadeInUp.delay(340).springify()} style={s.section}>
          <Text style={[s.sectionHeading, { paddingLeft: 32, marginBottom: 14 }]}>Community Feed</Text>
          <View style={s.postsList}>
            {POSTS.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(380 + i * 60).springify()} style={s.postCard}>
                <View style={s.postHead}>
                  <View style={[s.postAvatar, { backgroundColor: p.tint }]}>
                    <Text style={[s.postAvatarText, { color: p.fg }]}>{p.initial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.postName}>{p.name}</Text>
                    <Text style={s.postMeta}>
                      {p.when} · <Text style={[s.postDay, { color: p.dayColor }]}>{p.dayLabel}</Text>
                    </Text>
                  </View>
                </View>
                <Text style={[s.postBody, p.bodyItalic && s.postBodyItalic]}>{p.body}</Text>
                <View style={s.postReactions}>
                  {p.reactions.map((rx, ri) => (
                    <TouchableOpacity key={ri} activeOpacity={0.85} style={s.postReactBtn}>
                      <MaterialCommunityIcons name={rx.icon} size={16} color={rx.iconColor} />
                      <Text style={s.postReactText}>{rx.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* ── Footer Resources ── */}
        <Animated.View entering={FadeInUp.delay(440).springify()} style={s.footerWrap}>
          <TouchableOpacity activeOpacity={0.85} style={s.footerBtnNeutral}>
            <MaterialCommunityIcons name="hand-heart-outline" size={20} color={C.onSurfaceVariant} />
            <Text style={s.footerBtnNeutralText}>Sponsor needed?</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={callCrisis} style={s.footerBtnError}>
            <MaterialCommunityIcons name="phone" size={20} color={C.onError} />
            <Text style={s.footerBtnErrorText}>{CRISIS.label}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openComposer}
        style={[s.fab, { bottom: insets.bottom + TAB_BAR_H + 24 }]}
      >
        <MaterialCommunityIcons name="pencil-plus-outline" size={24} color={C.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Header
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,248,246,0.82)',
  },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  topTitle: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22, lineHeight: 28,
    color: C.primary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Hero
  hero: {
    height: 240,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-start',
  },
  heroBlob: {
    position: 'absolute',
    top: 36,
    left: '50%',
    marginLeft: -64,
    width: 128, height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  heroPad: {
    position: 'relative',
    zIndex: 10,
    gap: 14,
    marginTop: 24,
  },
  heroDisc: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroQuote: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 18, lineHeight: 24,
    color: C.onPrimaryContainer,
  },
  heroHorizon: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },

  // Day Counter
  streakWrap: {
    paddingHorizontal: 24,
    marginTop: -32,
  },
  streakCard: {
    backgroundColor: C.surfaceContainer,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    ...softShadow,
  },
  streakEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 2.0,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  streakNumber: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 80, lineHeight: 88,
    color: C.forestSage,
  },
  streakSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 20,
    color: C.onSurfaceVariant,
    marginBottom: 22,
  },
  streakActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  streakBtnFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.forestSage,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  streakBtnFilledText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  streakBtnOutline: {
    backgroundColor: C.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  streakBtnOutlineText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurface,
    letterSpacing: 0.2,
  },
  streakBtnSoft: {
    backgroundColor: 'rgba(232,131,107,0.18)',
    borderWidth: 1,
    borderColor: C.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  streakBtnSoftText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.primary,
    letterSpacing: 0.2,
  },

  // SOS
  sosWrap: { paddingHorizontal: 24, marginTop: 24 },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
    borderRadius: 24,
    gap: 14,
    ...softShadow,
  },
  sosTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17, lineHeight: 22,
    color: '#ffffff',
  },
  sosSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: 'rgba(255,255,255,0.92)',
  },
  sosBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9999,
    shadowColor: '#5C4742',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sosBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.sunriseGold,
    letterSpacing: 0.3,
  },

  // HALT
  haltWrap: { paddingHorizontal: 24, marginTop: 32 },
  haltGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  haltCard: {
    width: '47.5%',
    flexGrow: 1,
    aspectRatio: 2.6,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  haltLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurface,
    letterSpacing: 0.1,
  },

  // Just for today
  jftWrap: { paddingHorizontal: 24, marginTop: 32 },
  jftCard: {
    padding: 22,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.outlineVariant,
    backgroundColor: 'rgba(250,220,213,0.30)',
  },
  jftTitle: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 19, lineHeight: 24,
    color: C.onSurface,
    marginBottom: 14,
  },
  jftInput: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 15, lineHeight: 22,
    color: C.onSurfaceVariant,
    marginBottom: 14,
  },
  jftChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jftChip: {
    backgroundColor: C.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  jftChipText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.primaryContainer,
    letterSpacing: 0.2,
  },

  // Section common
  section: { marginTop: 32 },
  sectionHeaderRow: {
    paddingHorizontal: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 19, lineHeight: 24,
    color: C.onSurface,
    letterSpacing: -0.1,
  },
  linkLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.primary,
    letterSpacing: 0.2,
  },

  // Live Meetings
  meetingsRow: {
    paddingHorizontal: 24,
    gap: 14,
    paddingBottom: 4,
  },
  meetingCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    borderLeftWidth: 4,
    gap: 8,
    shadowColor: '#5C4742',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  meetingPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  meetingPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  meetingTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15, lineHeight: 20,
    color: C.onSurface,
    marginTop: 4,
  },
  meetingSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
  },

  // Recovery Paths
  pathsRow: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pathChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
  },
  pathChipActive: { backgroundColor: C.forestSage },
  pathLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  pathLabelActive: { color: '#ffffff' },

  // Milestones
  milestonesGrid: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    gap: 14,
  },
  milestoneCard: {
    flex: 1,
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  milestoneIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  milestoneTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurface,
  },
  milestoneWho: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // Posts
  postsList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  postCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: C.surfaceContainerHigh,
    gap: 14,
    shadowColor: '#5C4742',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  postHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  postAvatarText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
  },
  postName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurface,
  },
  postMeta: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  postDay: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
  },
  postBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 24,
    color: C.onSurface,
  },
  postBodyItalic: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 16, lineHeight: 27,
  },
  postReactions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  postReactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  postReactText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },

  // Footer resources
  footerWrap: {
    paddingHorizontal: 24,
    marginTop: 32,
    flexDirection: 'row',
    gap: 14,
  },
  footerBtnNeutral: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: C.surfaceContainer,
    borderRadius: 24,
  },
  footerBtnNeutralText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  footerBtnError: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: C.error,
    borderRadius: 24,
    shadowColor: C.error,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  footerBtnErrorText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onError,
    letterSpacing: 0.3,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.forestSage,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.forestSage,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 25,
  },
});
