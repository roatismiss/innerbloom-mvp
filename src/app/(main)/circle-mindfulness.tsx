import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
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

// ─── Design tokens (AGENTS.md canonical + Mindfulness bespoke brand) ─────────
const C = {
  surface:               '#fff8f6',
  surfaceContainerLowest:'#ffffff',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  primary:               '#994531',
  primaryFixed:          '#ffdad2',
  onPrimary:             '#ffffff',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  outlineVariant:        '#dbc1bb',
  // Bespoke palette for this circle's editorial direction (per HTML ref).
  brandGold:             '#c89860',
  brandSage:             '#8a9a7b',
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_BAR_H = Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82;

// ─── Mock content (per design ref) ──────────────────────────────────────────

interface TimerCard { id: string; icon: Mci; iconFilled?: boolean; time: string; label: string; highlight?: boolean }
const TIMERS: TimerCard[] = [
  { id: 't1', icon: 'bell-outline', time: '5m',   label: 'Brief sit' },
  { id: 't2', icon: 'bell-outline', time: '10m',  label: 'Steady' },
  { id: 't3', icon: 'bell',         iconFilled: true, time: 'Live', label: 'Join progress', highlight: true },
];

interface Teacher { id: string; name: string; tradition: string; tint: string }
const TEACHERS: Teacher[] = [
  { id: 'tn', name: 'Tenzin', tradition: 'Vipassana', tint: 'rgba(138,154,123,0.20)' },
  { id: 'sf', name: 'Sofia',  tradition: 'Metta',     tint: 'rgba(255,218,210,0.55)' },
  { id: 'hr', name: 'Hiro',   tradition: 'Zen',       tint: 'rgba(200,152,96,0.22)' },
];

interface SanghaPost {
  kind: 'post' | 'teaching';
  id: string;
  name: string;
  when?: string;
  pull?: string;       // quoted callout
  body: string;
  reactions: { label: string; count: number }[];
}

const POSTS: SanghaPost[] = [
  {
    kind: 'post',
    id: 'sp1',
    name: 'Anya',
    when: '2h ago',
    body: 'Noticing how much effort I put into "fighting" certain thoughts today. Trying to just sit with them as guests instead of enemies.',
    reactions: [
      { label: 'Bow 🙏',       count: 12 },
      { label: 'Sat with this', count: 4 },
    ],
  },
  {
    kind: 'post',
    id: 'sp2',
    name: 'Marcus',
    when: '5h ago',
    pull: '"The bell sounded like an old friend."',
    body: 'Back after 47 days. It felt like coming home.',
    reactions: [
      { label: 'Bow 🙏', count: 28 },
    ],
  },
  {
    kind: 'teaching',
    id: 'sp3',
    name: 'Tenzin',
    body: 'When the mind wanders, do not be harsh. The act of returning is the meditation itself. The drift is not a failure; it is an opportunity to practice kindness.',
    reactions: [
      { label: 'Sat with this', count: 89 },
    ],
  },
];

// Wisdom Lane waveform — heights + opacities per HTML.
const WAVE: { h: number; o: number }[] = [
  { h: 12, o: 0.4 }, { h: 20, o: 1 }, { h: 8, o: 0.6 }, { h: 16, o: 1 },
  { h: 24, o: 1 },   { h: 12, o: 0.4 }, { h: 8, o: 0.6 }, { h: 16, o: 1 },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CircleMindfulnessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useScrollTopOnFocus();

  const headerH = 64;

  function goBack() {
    void Haptics.selectionAsync();
    router.replace('/(main)/community');
  }

  function openComposer() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(main)/post-composer',
      params: { circleId: 'mindful', anonymous: '0' },
    });
  }

  // "Currently Sitting" — two animations layered:
  //   • outer disc: scale 1 → 2.5 with opacity 0.3 → 0.1 over 12s (breath)
  //   • inner dot:  opacity 0.6 → 1 over 3s (pulse)
  const breath = useSharedValue(0);
  const pulse  = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [breath, pulse]);

  const breathStyle = useAnimatedStyle(() => {
    // Keyframes: 0%→scale 1 opacity 0.3, 40%→scale 2.5 opacity 0.1, 70%→back, 100%→back
    const t = breath.value;
    const ease = Math.sin(t * Math.PI); // smooth 0 → 1 → 0 over the loop
    const scale = 1 + ease * 1.5;       // 1 → 2.5
    const opacity = 0.3 - ease * 0.2;   // 0.3 → 0.1
    return { transform: [{ scale }], opacity };
  });
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + pulse.value * 0.4,
  }));

  return (
    <View style={s.root}>
      {/* ── Top Nav ── */}
      <View style={[s.topBar, { paddingTop: insets.top, height: insets.top + headerH }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>Mindfulness</Text>
        <TouchableOpacity
          style={s.iconBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/(main)/notifications')}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color={C.onSurfaceVariant} />
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
        <Animated.View entering={FadeInDown.springify()} style={s.hero}>
          <View style={s.heroRing}>
            <MaterialCommunityIcons name="meditation" size={36} color={C.brandGold} />
          </View>
          <Text style={s.heroSub}>Practice together. Begin again, always.</Text>
          <View style={s.heroDivider} />
        </Animated.View>

        {/* ── Currently Sitting ── */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={s.section}>
          <View style={s.sittingCard}>
            <View style={s.sittingPulseWrap}>
              <Animated.View style={[s.sittingPulse, breathStyle]} />
              <Animated.View style={[s.sittingDot, pulseStyle]} />
            </View>
            <Text style={s.sittingEyebrow}>Live Presence</Text>
            <Text style={s.sittingHeading}>234 people sitting</Text>
          </View>
        </Animated.View>

        {/* ── Today's Bell ── */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Today's Bell</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.sageLink}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={s.timersRow}>
            {TIMERS.map((t) => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.85}
                style={[s.timerCard, t.highlight && s.timerCardHighlight]}
              >
                <MaterialCommunityIcons name={t.icon} size={24} color={C.brandGold} />
                <Text style={s.timerTime}>{t.time}</Text>
                <Text style={s.timerLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Today's Reflection ── */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={s.section}>
          <View style={s.reflectionCard}>
            <MaterialCommunityIcons name="format-quote-open" size={28} color={`${C.brandGold}66`} />
            <Text style={s.reflectionBody}>
              "Notice this breath. Then the next. Nothing else is being asked of you."
            </Text>
            <Text style={s.reflectionAttribution}>— Pema Chödrön</Text>
          </View>
        </Animated.View>

        {/* ── Teachers in Residence ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Teachers in Residence</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.teachersRow}
          >
            {TEACHERS.map((t) => (
              <View key={t.id} style={s.teacherCard}>
                <View style={[s.teacherImage, { backgroundColor: t.tint }]}>
                  <Text style={s.teacherInitial}>{t.name.charAt(0)}</Text>
                </View>
                <View style={{ padding: 16, gap: 6 }}>
                  <Text style={s.teacherName}>{t.name}</Text>
                  <View style={s.traditionPill}>
                    <Text style={s.traditionPillText}>{t.tradition}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Wisdom Lane ── */}
        <Animated.View entering={FadeInUp.delay(240).springify()} style={[s.section, { paddingHorizontal: 28 }]}>
          <Text style={[s.sectionHeading, { marginBottom: 16 }]}>Wisdom Lane</Text>
          <View style={s.wisdomCard}>
            <TouchableOpacity activeOpacity={0.85} style={s.wisdomPlay}>
              <MaterialCommunityIcons name="play" size={22} color={C.brandGold} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={s.wisdomWave}>
                {WAVE.map((b, i) => (
                  <View
                    key={i}
                    style={{
                      width: 4,
                      height: b.h,
                      borderRadius: 9999,
                      backgroundColor: C.brandGold,
                      opacity: b.o,
                    }}
                  />
                ))}
              </View>
              <Text style={s.wisdomCaption}>Anya: On floating thoughts</Text>
            </View>
            <Text style={s.wisdomDuration}>1:24</Text>
          </View>
        </Animated.View>

        {/* ── From the Sangha ── */}
        <Animated.View entering={FadeInUp.delay(280).springify()} style={[s.section, { paddingHorizontal: 28 }]}>
          <Text style={[s.sectionHeading, { marginBottom: 16 }]}>From the Sangha</Text>
          <View style={{ gap: 32 }}>
            {POSTS.map((p) => (
              p.kind === 'teaching' ? (
                <View key={p.id} style={s.teachingCard}>
                  <View style={s.teachingHead}>
                    <View style={s.teachingAvatar} />
                    <Text style={s.teachingName}>{p.name}</Text>
                    <View style={s.teacherChip}>
                      <Text style={s.teacherChipText}>TEACHER</Text>
                    </View>
                  </View>
                  <Text style={s.sanghaBody}>{p.body}</Text>
                  <View style={s.sanghaActions}>
                    {p.reactions.map((rx, i) => (
                      <TouchableOpacity key={i} activeOpacity={0.7}>
                        <Text style={s.sanghaActionText}>{rx.label} <Text style={s.sanghaActionCount}>{rx.count}</Text></Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View key={p.id} style={s.sanghaPost}>
                  <View style={s.sanghaHair} />
                  <View style={s.sanghaMeta}>
                    <Text style={s.sanghaName}>{p.name}</Text>
                    <Text style={s.sanghaDot}>•</Text>
                    <Text style={s.sanghaWhen}>{p.when}</Text>
                  </View>
                  {p.pull ? (
                    <View style={s.pullQuoteCard}>
                      <Text style={s.pullQuoteText}>{p.pull}</Text>
                    </View>
                  ) : null}
                  <Text style={s.sanghaBody}>{p.body}</Text>
                  <View style={s.sanghaActions}>
                    {p.reactions.map((rx, i) => (
                      <TouchableOpacity key={i} activeOpacity={0.7}>
                        <Text style={s.sanghaActionText}>{rx.label} <Text style={s.sanghaActionCount}>{rx.count}</Text></Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )
            ))}
          </View>
        </Animated.View>

        {/* ── Daily Sangha Sits ── */}
        <Animated.View entering={FadeInUp.delay(320).springify()} style={[s.section, { paddingHorizontal: 28 }]}>
          <LinearGradient
            colors={[C.surfaceContainer, C.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.sanghaBanner}
          >
            <Text style={s.bannerTitle}>Daily Sangha Sits</Text>
            <Text style={s.bannerSub}>Join our community for guided practice.</Text>
            <View style={s.bannerPillsRow}>
              <View style={s.bannerPill}>
                <MaterialCommunityIcons name="weather-sunset-up" size={14} color={C.brandGold} />
                <Text style={s.bannerPillText}>6:00 AM</Text>
              </View>
              <View style={s.bannerPill}>
                <MaterialCommunityIcons name="weather-night" size={14} color={C.brandGold} />
                <Text style={s.bannerPillText}>8:00 PM</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Begin Again Strip ── */}
        <Animated.View entering={FadeInUp.delay(360).springify()} style={[s.section, { paddingHorizontal: 28 }]}>
          <View style={s.beginAgain}>
            <View style={s.beginAgainLeft}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={20} color={C.brandSage} />
              <Text style={s.beginAgainText}>You haven't sat in 4 days. Begin again.</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.sageLink}>Practice now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openComposer}
        style={[s.fab, { bottom: insets.bottom + TAB_BAR_H + 28 }]}
      >
        <MaterialCommunityIcons name="leaf" size={26} color={C.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const softShadow = {
  shadowColor: '#5C4742',
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },

  // Top nav
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 24,
    color: C.onSurface,
    flex: 1,
    textAlign: 'center',
  },

  // Hero
  hero: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 28,
    alignItems: 'center',
    position: 'relative',
  },
  heroRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 1,
    borderColor: C.brandGold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  heroSub: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 18, lineHeight: 28,
    color: C.onSurfaceVariant,
    maxWidth: 280,
    textAlign: 'center',
  },
  heroDivider: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: C.outlineVariant,
    opacity: 0.40,
  },

  // Sections
  section: { marginTop: 48 },
  sectionHeaderRow: {
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 26,
    color: C.onSurface,
    letterSpacing: -0.2,
  },
  sageLink: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.brandSage,
    letterSpacing: 0.2,
  },

  // Currently Sitting
  sittingCard: {
    marginHorizontal: 28,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...softShadow,
  },
  sittingPulseWrap: {
    width: 64, height: 64,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  sittingPulse: {
    position: 'absolute',
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: C.brandGold,
  },
  sittingDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.brandGold,
    zIndex: 10,
  },
  sittingEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.brandGold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sittingHeading: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 24, lineHeight: 32,
    color: C.onSurface,
  },

  // Today's Bell
  timersRow: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    gap: 12,
    paddingBottom: 4,
  },
  timerCard: {
    flex: 1,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    ...softShadow,
  },
  timerCardHighlight: {
    borderWidth: 1,
    borderColor: 'rgba(200,152,96,0.30)',
  },
  timerTime: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 26,
    color: C.onSurface,
    marginTop: 12,
  },
  timerLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    marginTop: 4,
  },

  // Reflection card
  reflectionCard: {
    marginHorizontal: 28,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    ...softShadow,
  },
  reflectionBody: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 22, lineHeight: 34,
    color: C.onSurface,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  reflectionAttribution: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  // Teachers
  teachersRow: {
    paddingHorizontal: 28,
    gap: 14,
    paddingBottom: 4,
  },
  teacherCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
    ...softShadow,
  },
  teacherImage: {
    width: '100%',
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherInitial: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 48, lineHeight: 56,
    color: 'rgba(40,24,20,0.35)',
  },
  teacherName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17, lineHeight: 22,
    color: C.onSurface,
  },
  traditionPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(138,154,123,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  traditionPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 13,
    color: C.brandSage,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },

  // Wisdom lane
  wisdomCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...softShadow,
  },
  wisdomPlay: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(200,152,96,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  wisdomWave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
  },
  wisdomCaption: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    marginTop: 6,
  },
  wisdomDuration: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.brandSage,
    letterSpacing: 0.2,
  },

  // Sangha posts (hair-line style)
  sanghaPost: {
    paddingLeft: 24,
    position: 'relative',
  },
  sanghaHair: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 1,
    backgroundColor: C.outlineVariant,
  },
  sanghaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sanghaName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.brandSage,
    letterSpacing: 0.2,
  },
  sanghaDot: {
    fontSize: 10,
    color: 'rgba(85,67,62,0.4)',
  },
  sanghaWhen: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  pullQuoteCard: {
    backgroundColor: 'rgba(200,152,96,0.06)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  pullQuoteText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 16, lineHeight: 24,
    color: C.onSurface,
  },
  sanghaBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 24,
    color: C.onSurface,
    marginBottom: 16,
  },
  sanghaActions: {
    flexDirection: 'row',
    gap: 18,
    flexWrap: 'wrap',
  },
  sanghaActionText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  sanghaActionCount: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12,
    color: 'rgba(85,67,62,0.6)',
  },

  // Teaching card
  teachingCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderLeftWidth: 4,
    borderLeftColor: C.brandGold,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    padding: 24,
    ...softShadow,
  },
  teachingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  teachingAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.brandSage,
  },
  teachingName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurface,
  },
  teacherChip: {
    backgroundColor: 'rgba(138,154,123,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  teacherChipText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 13,
    color: C.brandSage,
    letterSpacing: 1.4,
  },

  // Sangha banner
  sanghaBanner: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  bannerTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 26,
    color: C.onSurface,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  bannerSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 20,
    color: C.onSurfaceVariant,
    marginBottom: 22,
    textAlign: 'center',
  },
  bannerPillsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,248,246,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  bannerPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurface,
    letterSpacing: 0.3,
  },

  // Begin again
  beginAgain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: 16,
    backgroundColor: 'rgba(138,154,123,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(138,154,123,0.16)',
    borderRadius: 16,
  },
  beginAgainLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  beginAgainText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    flex: 1,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 32,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 25,
  },
});
