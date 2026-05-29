import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
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

// ─── Design tokens (AGENTS.md canonical spec) ────────────────────────────────
const C = {
  surface:               '#fff8f6',
  surfaceContainerLowest:'#ffffff',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  primary:               '#994531',
  primaryContainer:      '#e8836b',
  primaryFixed:          '#ffdad2',
  primaryFixedDim:       '#ffb4a3',
  onPrimary:             '#ffffff',
  onPrimaryContainer:    '#641e0e',
  secondary:             '#006970',
  secondaryContainer:    '#90f2fc',
  secondaryFixed:        '#90f2fc',
  secondaryFixedDim:     '#73d5df',
  onSecondaryContainer:  '#006f77',
  tertiary:              '#a8315c',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  outlineVariant:        '#dbc1bb',
  inverseSurface:        '#3e2c28',
  inverseOnSurface:      '#ffede9',
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_BAR_H = Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82;

// ─── Mock content (per design ref) ──────────────────────────────────────────
// Placeholder until circle_pulse / circle_permission_slips / circle_voice_notes
// / circle_boundary_scripts / circle_posts land.

interface EnergyBar { day: string; pct: number; color: string }
const WEEKLY_ENERGY: EnergyBar[] = [
  { day: 'M', pct: 0.30, color: 'rgba(153,69,49,0.20)' },
  { day: 'T', pct: 0.45, color: 'rgba(153,69,49,0.40)' },
  { day: 'W', pct: 0.25, color: C.primaryContainer },
  { day: 'T', pct: 0.60, color: C.primary },
  { day: 'F', pct: 0.40, color: C.primaryContainer },
  { day: 'S', pct: 0.85, color: C.secondaryFixedDim },
  { day: 'S', pct: 0.70, color: C.secondaryFixedDim },
];

interface PermissionSlip { id: string; text: string; n: string }
const PERMISSION_SLIPS: PermissionSlip[] = [
  { id: 'p1', text: '"…to rest without earning it."',     n: 'Slip #01' },
  { id: 'p2', text: '"…to disappoint someone today."',    n: 'Slip #02' },
  { id: 'p3', text: '"…to miss the meeting."',            n: 'Slip #03' },
  { id: 'p4', text: '"…to be messy and unoptimized."',    n: 'Slip #04' },
];

interface BoundaryScript { id: string; icon: Mci; label: string }
const BOUNDARY_SCRIPTS: BoundaryScript[] = [
  { id: 'b1', icon: 'briefcase-off-outline', label: 'Saying no to extra work' },
  { id: 'b2', icon: 'bag-suitcase-outline',  label: 'Asking for leave' },
  { id: 'b3', icon: 'bell-off-outline',      label: 'Off-clock notifications' },
];

interface VoiceNote { id: string; who: string; initial: string; duration: string; progress: number; tint: string }
const VOICE_NOTES: VoiceNote[] = [
  { id: 'v1', who: 'Sarah M.', initial: 'S', duration: '2:04', progress: 0.33, tint: C.primaryFixed },
  { id: 'v2', who: 'David R.', initial: 'D', duration: '1:15', progress: 0,    tint: C.primaryFixedDim },
];

type Filter = 'boundaries' | 'wins' | 'reframes' | 'quit-stories' | 'rest-hacks';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'boundaries',   label: 'Boundaries' },
  { id: 'wins',         label: 'Wins' },
  { id: 'reframes',     label: 'Reframes' },
  { id: 'quit-stories', label: 'Quit stories' },
  { id: 'rest-hacks',   label: 'Rest hacks' },
];

type PostKind =
  | {
      kind: 'post';
      id: string;
      icon: Mci;
      tagLabel: string;
      tagColor: string;
      tagBgRgba: string;
      when: string;
      body: string;
      topAccent?: string;
      reactions: { icon: Mci; count: number; filled?: boolean; color?: string }[];
    }
  | { kind: 'event'; id: string; title: string; eyebrow: string; cta: string }
  | { kind: 'reframe'; id: string; when: string; body: string };

const POSTS: PostKind[] = [
  {
    kind: 'post',
    id: 'p1',
    icon: 'star-four-points',
    tagLabel: 'Boundary Win',
    tagColor: C.secondary,
    tagBgRgba: 'rgba(0,105,112,0.12)',
    when: '2h ago',
    body: 'Today I deleted Slack from my phone for the weekend. The initial panic lasted exactly four minutes, and then… silence. A real, heavy, lovely silence.',
    reactions: [
      { icon: 'heart-outline',  count: 124 },
      { icon: 'message-outline', count: 18 },
    ],
  },
  {
    kind: 'post',
    id: 'p2',
    icon: 'exit-to-app',
    tagLabel: 'Quit Story',
    tagColor: C.tertiary,
    tagBgRgba: 'rgba(168,49,92,0.10)',
    when: '5h ago',
    topAccent: C.tertiary,
    body: "I finally walked away from the 'dream' role that was killing my spirit. I don't have a plan yet, just a commitment to not being exhausted anymore.",
    reactions: [
      { icon: 'heart', count: 482, filled: true, color: C.tertiary },
      { icon: 'message-outline', count: 56 },
    ],
  },
  { kind: 'event', id: 'e1', title: 'Nothing Hour', eyebrow: '60 minutes of collective doing-nothing starts in 12m.', cta: 'Join waiting room' },
  { kind: 'reframe', id: 'r1', when: 'Yesterday', body: "Productivity is a pace, not a destination. If your current pace is 'stagnant,' perhaps you're actually 'rooting.'" },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CircleBurnoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const [activeFilter, setActiveFilter] = useState<Filter>('boundaries');
  const scrollRef = useScrollTopOnFocus();

  // Slip cards: exactly two per viewport. 24px container padding × 2 + 14px gap.
  const slipCardW = Math.floor((winW - 48 - 14) / 2);

  const headerH = 64;

  function goBack() {
    void Haptics.selectionAsync();
    router.replace('/(main)/community');
  }

  function openReflect() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(main)/post-composer',
      params: { circleId: 'burnout', anonymous: '0' },
    });
  }

  // Animated "breathe" pulse on the hero icon (8s ease-in-out infinite).
  const breathe = useSharedValue(1);
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1.05, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [breathe]);
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
    opacity: 0.85 + (breathe.value - 1) * 4,
  }));

  return (
    <View style={s.root}>
      {/* Top App Bar (translucent, fixed) */}
      <View style={[s.topBar, { paddingTop: insets.top, height: insets.top + headerH }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>Burnout Recovery</Text>
        <View style={s.topRight}>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color={C.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero band ── */}
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient
            colors={['rgba(255,218,210,0.30)', C.surface]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[s.hero, { paddingTop: insets.top + headerH + 16 }]}
          >
            <Animated.View style={[s.heroIcon, breatheStyle]}>
              <MaterialCommunityIcons name="meditation" size={36} color={C.primary} />
            </Animated.View>
            <Text style={s.heroTitle}>Burnout Recovery</Text>
            <Text style={s.heroSub}>Recovery is a slow, sacred return.</Text>
            <View style={s.heroMetaRow}>
              <Text style={s.heroMetaText}>8.2k members</Text>
              <View style={s.heroMetaDot} />
              <Text style={s.heroMetaText}>You belong here</Text>
              <View style={s.heroMetaDot} />
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={C.outline} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Weekly Energy ── */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={s.energyWrap}>
          <View style={s.energyCard}>
            <View style={s.energyHeaderRow}>
              <View>
                <Text style={s.energyEyebrow}>Weekly Energy</Text>
                <Text style={s.energySub}>Mostly rebuilding. 23% reported rest.</Text>
              </View>
            </View>
            <View style={s.barChart}>
              {WEEKLY_ENERGY.map((b, i) => (
                <View key={i} style={s.barCol}>
                  <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                    <View
                      style={[
                        s.bar,
                        { height: `${b.pct * 100}%`, backgroundColor: b.color },
                      ]}
                    />
                  </View>
                  <Text style={s.barLabel}>{b.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ── Permission Slips ── */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Permission Slips</Text>
            <MaterialCommunityIcons name="notebook-outline" size={22} color={C.outline} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.slipsRow}
          >
            {PERMISSION_SLIPS.map((slip) => (
              <View key={slip.id} style={[s.slipCard, { width: slipCardW }]}>
                <Text style={s.slipText}>{slip.text}</Text>
                <Text style={s.slipNo}>{slip.n}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Today's Anchor ── */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={s.anchorWrap}>
          <View style={s.anchorCard}>
            <View style={s.anchorIconDeco}>
              <MaterialCommunityIcons name="anchor" size={88} color={C.primary} />
            </View>
            <Text style={s.anchorEyebrow}>Today's Anchor</Text>
            <Text style={s.anchorBody}>
              What did you say yes to this week that drained you — and what would it cost to say no next time?
            </Text>
            <TouchableOpacity activeOpacity={0.85} onPress={openReflect} style={s.anchorBtn}>
              <Text style={s.anchorBtnText}>Reflect in circle</Text>
              <MaterialCommunityIcons name="message-outline" size={14} color={C.onPrimary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Boundary Scripts ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Boundary Scripts</Text>
            <Text style={s.linkLabel}>View Library</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.scriptsRow}
          >
            {BOUNDARY_SCRIPTS.map((sc) => (
              <View key={sc.id} style={s.scriptCard}>
                <MaterialCommunityIcons name={sc.icon} size={24} color={C.secondary} />
                <Text style={s.scriptLabel}>{sc.label}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── End-of-shift notes ── */}
        <Animated.View entering={FadeInUp.delay(240).springify()} style={[s.section, { paddingHorizontal: 24 }]}>
          <Text style={[s.sectionHeading, { marginBottom: 18 }]}>End-of-shift notes</Text>
          <View style={{ gap: 12 }}>
            {VOICE_NOTES.map((v) => (
              <View key={v.id} style={s.voiceRow}>
                <View style={[s.voiceAvatar, { backgroundColor: v.tint }]}>
                  <Text style={s.voiceAvatarInitial}>{v.initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.voiceMetaRow}>
                    <Text style={s.voiceWho}>{v.who}</Text>
                    <Text style={s.voiceDur}>{v.duration}</Text>
                  </View>
                  <View style={s.voiceProgRow}>
                    <View style={s.voiceProgTrack}>
                      <View style={[s.voiceProgFill, { width: `${v.progress * 100}%` }]} />
                    </View>
                    <TouchableOpacity activeOpacity={0.85}>
                      <MaterialCommunityIcons name="play" size={22} color={C.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── From the circle ── */}
        <Animated.View entering={FadeInUp.delay(280).springify()} style={s.section}>
          <Text style={[s.sectionHeading, { paddingHorizontal: 24, marginBottom: 14 }]}>From the circle</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filtersRow}
          >
            {FILTERS.map((f) => {
              const active = activeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setActiveFilter(f.id);
                  }}
                  style={[s.filterChip, active && s.filterChipActive]}
                >
                  <Text style={[s.filterLabel, active && s.filterLabelActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── Posts ── */}
        <View style={s.postsList}>
          {POSTS.map((p, i) => {
            if (p.kind === 'event') {
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(320 + i * 60).springify()}>
                  <LinearGradient
                    colors={[C.secondaryContainer, C.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.eventBanner}
                  >
                    <Text style={s.eventTitle}>{p.title}</Text>
                    <Text style={s.eventBody}>{p.eyebrow}</Text>
                    <TouchableOpacity activeOpacity={0.85} style={s.eventBtn}>
                      <Text style={s.eventBtnText}>{p.cta}</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </Animated.View>
              );
            }

            if (p.kind === 'reframe') {
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(320 + i * 60).springify()} style={s.postCard}>
                  <View style={s.postHead}>
                    <View style={[s.postIconCircle, { backgroundColor: 'rgba(153,69,49,0.10)' }]}>
                      <MaterialCommunityIcons name="auto-fix" size={14} color={C.primary} />
                    </View>
                    <Text style={[s.postTag, { color: C.primary }]}>Reframe</Text>
                    <Text style={s.postWhen}>{p.when}</Text>
                  </View>
                  <Text style={s.postBody}>{p.body}</Text>
                </Animated.View>
              );
            }

            // post
            return (
              <Animated.View
                key={p.id}
                entering={FadeInDown.delay(320 + i * 60).springify()}
                style={[
                  s.postCard,
                  p.topAccent && {
                    borderTopWidth: 4,
                    borderTopColor: p.topAccent,
                  },
                ]}
              >
                <View style={s.postHead}>
                  <View style={[s.postIconCircle, { backgroundColor: p.tagBgRgba }]}>
                    <MaterialCommunityIcons name={p.icon} size={14} color={p.tagColor} />
                  </View>
                  <Text style={[s.postTag, { color: p.tagColor }]}>{p.tagLabel}</Text>
                  <Text style={s.postWhen}>{p.when}</Text>
                </View>
                <Text style={s.postBody}>{p.body}</Text>
                <View style={s.postActions}>
                  {p.reactions.map((rx, ri) => (
                    <TouchableOpacity key={ri} activeOpacity={0.85} style={s.reactionBtn}>
                      <MaterialCommunityIcons
                        name={rx.icon}
                        size={18}
                        color={rx.color ?? C.outline}
                      />
                      <Text style={[s.reactionCount, rx.color ? { color: rx.color } : null]}>
                        {rx.count}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Support Strip ── */}
        <Animated.View entering={FadeInUp.delay(420).springify()} style={s.supportWrap}>
          <TouchableOpacity activeOpacity={0.85} style={s.supportCard}>
            <View style={s.supportIcon}>
              <MaterialCommunityIcons name="clipboard-pulse-outline" size={22} color={C.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.supportTitle}>Find a burnout-aware therapist</Text>
              <Text style={s.supportSub}>Gentle support for your journey.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={C.outline} />
          </TouchableOpacity>
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
  elevation: 4,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(219,193,187,0.18)',
  },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  topTitle: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 24,
    color: C.primary,
    textAlign: 'center',
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Hero band
  hero: {
    minHeight: 280,
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(153,69,49,0.10)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 32, lineHeight: 38,
    color: C.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSub: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 16, lineHeight: 22,
    color: C.onSurfaceVariant,
    marginBottom: 16,
    textAlign: 'center',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroMetaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.outline,
    letterSpacing: 0.2,
  },
  heroMetaDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: C.outlineVariant,
  },

  // Weekly Energy
  energyWrap: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  energyCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: 24,
    ...softShadow,
  },
  energyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 22,
  },
  energyEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.outline,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  energySub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 132,
    gap: 8,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 9999,
    borderTopRightRadius: 9999,
  },
  barLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 13,
    color: C.outline,
    marginTop: 8,
    letterSpacing: 0.3,
  },

  // Sections
  section: { marginTop: 48 },
  sectionHeaderRow: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 26,
    color: C.primary,
    letterSpacing: -0.2,
  },
  linkLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.primary,
    letterSpacing: 0.2,
  },

  // Permission Slips
  slipsRow: {
    paddingHorizontal: 24,
    gap: 14,
  },
  slipCard: {
    aspectRatio: 3 / 4,
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 14,
    padding: 18,
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(153,69,49,0.22)',
  },
  slipText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 15, lineHeight: 22,
    color: C.primary,
  },
  slipNo: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.outline,
    letterSpacing: 0.4,
  },

  // Today's Anchor
  anchorWrap: {
    paddingHorizontal: 24,
    marginTop: 48,
  },
  anchorCard: {
    backgroundColor: 'rgba(153,69,49,0.06)',
    borderRadius: 16,
    padding: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  anchorIconDeco: {
    position: 'absolute',
    top: 12, right: 12,
    opacity: 0.10,
  },
  anchorEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  anchorBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 18, lineHeight: 30,
    color: C.onSurface,
    marginBottom: 24,
  },
  anchorBtn: {
    alignSelf: 'flex-start',
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  anchorBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onPrimary,
    letterSpacing: 0.3,
  },

  // Boundary Scripts
  scriptsRow: {
    paddingHorizontal: 24,
    gap: 12,
  },
  scriptCard: {
    width: 180,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.surfaceContainer,
    gap: 12,
    ...softShadow,
  },
  scriptLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 19,
    color: C.onSurface,
    letterSpacing: 0.1,
  },

  // Voice notes
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
  },
  voiceAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  voiceAvatarInitial: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 20, lineHeight: 24,
    color: C.primary,
  },
  voiceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  voiceWho: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurface,
    letterSpacing: 0.1,
  },
  voiceDur: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.outline,
    letterSpacing: 0.3,
  },
  voiceProgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 28,
  },
  voiceProgTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(153,69,49,0.20)',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  voiceProgFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 9999,
  },

  // Filter chips
  filtersRow: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerHigh,
  },
  filterChipActive: {
    backgroundColor: C.primary,
  },
  filterLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  filterLabelActive: {
    color: C.onPrimary,
  },

  // Posts
  postsList: {
    marginTop: 24,
    paddingHorizontal: 24,
    gap: 24,
  },
  postCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    ...softShadow,
  },
  postHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  postIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  postTag: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    letterSpacing: 0.2,
  },
  postWhen: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 16,
    color: C.outline,
    marginLeft: 'auto',
  },
  postBody: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 16, lineHeight: 27,
    color: C.onSurface,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 16,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reactionCount: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.outline,
    letterSpacing: 0.2,
  },

  // Event banner — Nothing Hour
  eventBanner: {
    minHeight: 184,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    ...softShadow,
  },
  eventTitle: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 22, lineHeight: 28,
    color: C.onSecondaryContainer,
    marginBottom: 6,
  },
  eventBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 19,
    color: C.onSecondaryContainer,
    opacity: 0.85,
    marginBottom: 16,
    maxWidth: 220,
  },
  eventBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  eventBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSecondaryContainer,
    letterSpacing: 0.3,
  },

  // Support strip
  supportWrap: {
    paddingHorizontal: 24,
    marginTop: 48,
    marginBottom: 24,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surfaceContainer,
    padding: 20,
    borderRadius: 16,
  },
  supportIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  supportTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurface,
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  supportSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
  },

  // FAB
  fabWrap: {
    position: 'absolute',
    right: 24,
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 30,
  },
  fabHint: {
    backgroundColor: C.inverseSurface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    opacity: 0.85,
  },
  fabHintText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 14,
    color: C.inverseOnSurface,
    letterSpacing: 0.3,
  },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
