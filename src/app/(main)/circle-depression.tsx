import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
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
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScrollTopOnFocus } from '../../lib/use-scroll-top-on-focus';

// ─── Design tokens (AGENTS.md canonical + Depression bespoke accent) ─────────
const C = {
  surface:               '#fff8f6',
  surfaceContainerLowest:'#ffffff',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  surfaceContainerHighest:'#fadcd5',
  primary:               '#994531',
  primaryContainer:      '#e8836b',
  primaryFixed:          '#ffdad2',
  onPrimary:             '#ffffff',
  onPrimaryContainer:    '#641e0e',
  secondary:             '#006970',
  secondaryContainer:    '#90f2fc',
  secondaryFixed:        '#90f2fc',
  onSecondaryContainer:  '#006f77',
  tertiary:              '#a8315c',
  tertiaryContainer:     '#fa719c',
  tertiaryFixed:         '#ffd9e1',
  onTertiaryContainer:   '#700034',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  outlineVariant:        '#dbc1bb',
  error:                 '#ba1a1a',
  errorContainer:        '#ffdad6',
  onErrorContainer:      '#93000a',
  onError:               '#ffffff',
  inverseSurface:        '#3e2c28',
  inverseOnSurface:      '#ffede9',
  // Bespoke accent for this circle's editorial direction (per HTML ref).
  accent:                '#8a7a9a',
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_BAR_H = Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82;

const CRISIS = { label: 'PH Hotline 1553', tel: '1553' } as const;

// ─── Mock content (per design ref) ──────────────────────────────────────────

type Weather = 'foggy' | 'heavy' | 'flat' | 'tender' | 'light';
interface WeatherOpt { id: Weather; icon: Mci; label: string }
const WEATHER_OPTS: WeatherOpt[] = [
  { id: 'foggy',  icon: 'weather-fog',           label: 'foggy' },
  { id: 'heavy',  icon: 'dumbbell',              label: 'heavy' },
  { id: 'flat',   icon: 'minus',                 label: 'flat' },
  { id: 'tender', icon: 'leaf',                  label: 'tender' },
  { id: 'light',  icon: 'white-balance-sunny',   label: 'a little light' },
];

interface SmallestThing { id: string; icon: Mci; label: string; bg: string; fg: string }
const SMALLEST_THINGS: SmallestThing[] = [
  { id: 's1', icon: 'water',         label: 'Drink water',         bg: C.secondaryContainer,    fg: C.onSecondaryContainer },
  { id: 's2', icon: 'window-open',   label: 'Open a window',       bg: C.tertiaryContainer,     fg: C.onTertiaryContainer  },
  { id: 's3', icon: 'seat',          label: 'Sit up for 30 sec',   bg: C.primaryContainer,      fg: C.onPrimaryContainer   },
];

interface UsedToFeelGood { id: string; icon: Mci; label: string; action: Mci; actionFill?: boolean }
const USED_TO_FEEL_GOOD: UsedToFeelGood[] = [
  { id: 'g1', icon: 'music-note',  label: 'That song from college', action: 'play',     actionFill: true },
  { id: 'g2', icon: 'map-marker',  label: 'Walking by the river',   action: 'pin' },
  { id: 'g3', icon: 'phone',       label: 'Calling my sister',      action: 'phone-outline' },
];

type Filter = 'all' | 'hard' | 'wins' | 'honest';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',    label: 'All' },
  { id: 'hard',   label: 'Today is hard' },
  { id: 'wins',   label: 'Tiny wins' },
  { id: 'honest', label: 'Honest' },
];

interface Post {
  id: string;
  authorInitial?: string;
  authorAvatar?: string; // hex bg when no photo
  authorAvatarTint: string;
  authorName: string;
  when: string;
  pillLabel: string;
  pillBg: string;
  pillFg: string;
  body: string;
  reactions: { icon: Mci; label: string }[];
}
const POSTS: Post[] = [
  {
    id: 'p1',
    authorInitial: 'AB',
    authorAvatarTint: C.primaryContainer,
    authorName: 'Anonymous Bloom',
    when: '2h ago',
    pillLabel: 'Today is hard',
    pillBg: C.surfaceContainer,
    pillFg: C.onSurfaceVariant,
    body: "Today is hard. That's all I can say. I'm just breathing and that's taking all my energy.",
    reactions: [
      { icon: 'heart-outline', label: 'Sitting with you' },
      { icon: 'eye-outline',   label: '12' },
    ],
  },
  {
    id: 'p2',
    authorInitial: 'M',
    authorAvatarTint: C.secondaryFixed,
    authorName: 'Maya',
    when: '5h ago',
    pillLabel: 'Tiny win',
    pillBg: C.secondaryContainer,
    pillFg: C.onSecondaryContainer,
    body: "I showered today. It wasn't nothing. It felt like climbing a mountain, but I'm clean now.",
    reactions: [
      { icon: 'thumb-up-outline', label: '8' },
    ],
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CircleDepressionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [weather, setWeather] = useState<Weather | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const scrollRef = useScrollTopOnFocus();

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
      params: { circleId: 'depression', anonymous: '0' },
    });
  }

  // Today's date — "Tuesday, May 29" style, dynamic so it never goes stale.
  const todayStr = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    [],
  );

  // Three staggered pulsing dots above the "Sit in the room" copy.
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);
  useEffect(() => {
    const cfg = { duration: 1000, easing: Easing.inOut(Easing.cubic) };
    d1.value = withRepeat(withTiming(1, cfg), -1, true);
    d2.value = withDelay(300, withRepeat(withTiming(1, cfg), -1, true));
    d3.value = withDelay(600, withRepeat(withTiming(1, cfg), -1, true));
  }, [d1, d2, d3]);
  const d1Style = useAnimatedStyle(() => ({ opacity: 1 - d1.value * 0.6, transform: [{ scale: 1 - d1.value * 0.1 }] }));
  const d2Style = useAnimatedStyle(() => ({ opacity: 1 - d2.value * 0.6, transform: [{ scale: 1 - d2.value * 0.1 }] }));
  const d3Style = useAnimatedStyle(() => ({ opacity: 1 - d3.value * 0.6, transform: [{ scale: 1 - d3.value * 0.1 }] }));

  return (
    <View style={s.root}>
      {/* ── Sticky Header ── */}
      <View style={[s.topBar, { paddingTop: insets.top, height: insets.top + headerH }]}>
        <View style={s.topLeft}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>Depression</Text>
        </View>
        <View style={s.topRight}>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color={C.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + headerH,
          paddingBottom: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Band ── */}
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient
            colors={[C.surfaceContainerLow, C.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            {/* Decorative SVG-like dusk arc — rendered as a translucent line via
                a rotated thin View as a stand-in for the original Bezier curve.
                Visually communicates the "soft trail" intent of the HTML. */}
            <View style={s.heroSwoosh} pointerEvents="none" />

            <View style={s.heroIcon}>
              <MaterialCommunityIcons name="heart" size={36} color={C.accent} />
            </View>
            <Text style={s.heroTitle}>Depression</Text>
            <Text style={s.heroSub}>You don't have to feel better to belong here.</Text>

            <View style={s.heroMetaRow}>
              <Text style={s.heroMetaText}>18.4k members</Text>
              <View style={s.heroMetaDot} />
              <Text style={s.heroMetaText}>You're not the only one</Text>
            </View>
            <Text style={s.heroModerated}>Moderated</Text>

            <TouchableOpacity activeOpacity={0.85} style={s.joinedBtn}>
              <Text style={s.joinedBtnText}>Joined</Text>
              <MaterialCommunityIcons name="check" size={18} color={C.onPrimary} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ── Date Anchor ── */}
        <Animated.View entering={FadeInUp.delay(60).springify()} style={s.dateAnchor}>
          <Text style={s.dateLabel}>{todayStr}</Text>
          <Text style={s.dateTitle}>You made it here.</Text>
          <Text style={s.dateBody}>That counts. Even if today is heavy.</Text>
        </Animated.View>

        {/* ── How's the weather inside? ── */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={s.weatherCard}>
          <Text style={s.cardHeading}>How's the weather inside?</Text>
          <View style={s.weatherRow}>
            {WEATHER_OPTS.map((w) => {
              const active = weather === w.id;
              return (
                <TouchableOpacity
                  key={w.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setWeather(w.id);
                  }}
                  style={s.weatherCol}
                >
                  <View style={[s.weatherIcon, active && s.weatherIconActive]}>
                    <MaterialCommunityIcons
                      name={w.icon}
                      size={22}
                      color={active ? C.onPrimaryContainer : C.outline}
                    />
                  </View>
                  <Text style={s.weatherLabel} numberOfLines={1}>{w.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Smallest thing today ── */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={s.smallestSection}>
          <Text style={[s.cardHeading, { paddingHorizontal: 24 }]}>Smallest thing today</Text>
          <View style={s.smallestRow}>
            {SMALLEST_THINGS.map((t) => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.88}
                style={[s.smallestCard, { backgroundColor: t.bg }]}
              >
                <MaterialCommunityIcons name={t.icon} size={22} color={t.fg} />
                <Text style={[s.smallestLabel, { color: t.fg }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── What used to feel good ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={s.goodCard}>
          <View style={s.goodHeader}>
            <Text style={s.cardHeading}>What used to feel good</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={s.goodEdit}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 12 }}>
            {USED_TO_FEEL_GOOD.map((g) => (
              <View key={g.id} style={s.goodRow}>
                <View style={s.goodRowLeft}>
                  <MaterialCommunityIcons name={g.icon} size={22} color={C.primary} />
                  <Text style={s.goodRowLabel}>{g.label}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.85} style={s.goodAction}>
                  <MaterialCommunityIcons name={g.action} size={16} color={C.onPrimaryContainer} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── From Further Along (pinned) ── */}
        <Animated.View entering={FadeInUp.delay(240).springify()} style={s.pinnedCard}>
          <View style={s.pinnedHead}>
            <MaterialCommunityIcons name="pin" size={18} color={C.tertiary} />
            <Text style={s.pinnedEyebrow}>From Further Along</Text>
          </View>
          <View style={s.pinnedAuthor}>
            <View style={[s.pinnedAvatar, { backgroundColor: C.tertiaryFixed }]}>
              <Text style={s.pinnedAvatarInitial}>L</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pinnedName}>Lena</Text>
              <Text style={s.pinnedSub}>3-year journey</Text>
            </View>
          </View>
          <Text style={s.pinnedBody}>
            "Three years ago, I couldn't imagine a Tuesday where I didn't feel paralyzed. It doesn't mean the clouds don't come back, but I've learned how to sit with them until they pass. You're doing better than you think just by being here."
          </Text>
          <View style={s.pinnedReactions}>
            <TouchableOpacity activeOpacity={0.85} style={s.pinnedReact}>
              <MaterialCommunityIcons name="eye-outline" size={16} color={C.onSurfaceVariant} />
              <Text style={s.pinnedReactText}>I see you</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={s.pinnedReact}>
              <MaterialCommunityIcons name="history" size={16} color={C.onSurfaceVariant} />
              <Text style={s.pinnedReactText}>I've been here</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Sit in the room ── */}
        <Animated.View entering={FadeInUp.delay(280).springify()} style={{ paddingHorizontal: 24, marginTop: 40 }}>
          <LinearGradient
            colors={[C.surfaceContainerHighest, C.surfaceContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.sitRoom}
          >
            <View style={s.sitRoomDots}>
              <Animated.View style={[s.sitDot, d1Style]} />
              <Animated.View style={[s.sitDot, d2Style]} />
              <Animated.View style={[s.sitDot, d3Style]} />
            </View>
            <Text style={s.sitRoomTitle}>47 people are quietly here right now.</Text>
            <Text style={s.sitRoomBody}>No pressure to talk. Just shared space.</Text>
            <TouchableOpacity activeOpacity={0.85} style={s.sitRoomBtn}>
              <Text style={s.sitRoomBtnText}>Join the room</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ── Filters ── */}
        <Animated.View entering={FadeInUp.delay(320).springify()} style={{ marginTop: 40 }}>
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
          {POSTS.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(360 + i * 60).springify()} style={s.postCard}>
              <View style={s.postHead}>
                <View style={s.postAuthor}>
                  <View style={[s.postAvatar, { backgroundColor: p.authorAvatarTint }]}>
                    <Text style={[s.postAvatarText, { color: C.onPrimaryContainer }]}>{p.authorInitial}</Text>
                  </View>
                  <View>
                    <Text style={s.postName}>{p.authorName}</Text>
                    <Text style={s.postWhen}>{p.when}</Text>
                  </View>
                </View>
                <View style={[s.postPill, { backgroundColor: p.pillBg }]}>
                  <Text style={[s.postPillText, { color: p.pillFg }]}>{p.pillLabel}</Text>
                </View>
              </View>
              <Text style={s.postBody}>{p.body}</Text>
              <View style={s.postReactions}>
                {p.reactions.map((rx, ri) => (
                  <TouchableOpacity key={ri} activeOpacity={0.85} style={s.postReactBtn}>
                    <MaterialCommunityIcons name={rx.icon} size={15} color={C.onSurfaceVariant} />
                    <Text style={s.postReactText}>{rx.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          ))}
        </View>

        {/* ── Weekly Check-in (Are you safe?) ── */}
        <Animated.View entering={FadeInUp.delay(460).springify()} style={s.safetyWrap}>
          <View style={s.safetyCard}>
            <Text style={s.safetyHeading}>Are you safe?</Text>
            <View style={{ gap: 12 }}>
              <TouchableOpacity activeOpacity={0.85} style={s.safetyBtn}>
                <Text style={s.safetyBtnText}>Yes, I'm safe</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={s.safetyBtn}>
                <Text style={s.safetyBtnText}>Mostly — having hard thoughts</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={callCrisis} style={s.safetyBtnError}>
                <Text style={s.safetyBtnErrorText}>I need help right now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── FAB (rounded-2xl square per HTML) ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openComposer}
        style={[s.fab, { bottom: insets.bottom + TAB_BAR_H + 28 }]}
      >
        <MaterialCommunityIcons name="microphone" size={26} color={C.onPrimary} />
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
    backgroundColor: '#ffffff',
  },
  topLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  topTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 24,
    color: C.onSurface,
  },

  // Hero
  hero: {
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroSwoosh: {
    position: 'absolute',
    top: 28, right: -32,
    width: 180, height: 2,
    borderRadius: 9999,
    backgroundColor: C.accent,
    opacity: 0.18,
    transform: [{ rotate: '32deg' }],
  },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.surfaceContainerLowest,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    ...softShadow,
  },
  heroTitle: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 44, lineHeight: 50,
    color: C.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 17, lineHeight: 25,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroMetaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  heroMetaDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: C.outlineVariant,
  },
  heroModerated: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.outline,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  joinedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 9999,
    ...softShadow,
  },
  joinedBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onPrimary,
    letterSpacing: 0.3,
  },

  // Date anchor
  dateAnchor: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
  },
  dateLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.outline,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  dateTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 24, lineHeight: 30,
    color: C.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  dateBody: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 15, lineHeight: 22,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },

  // Card heading
  cardHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 26,
    color: C.onSurface,
    letterSpacing: -0.1,
    marginBottom: 20,
  },

  // Weather card
  weatherCard: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    ...softShadow,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  weatherCol: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    minWidth: 56,
  },
  weatherIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  weatherIconActive: {
    backgroundColor: C.primaryContainer,
  },
  weatherLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Smallest things
  smallestSection: {
    marginTop: 40,
  },
  smallestRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 4,
  },
  smallestCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    ...softShadow,
  },
  smallestLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 19,
    letterSpacing: 0.1,
  },

  // What used to feel good
  goodCard: {
    marginHorizontal: 24,
    marginTop: 40,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: 24,
  },
  goodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goodEdit: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.primary,
    letterSpacing: 0.2,
    marginBottom: 20,
  },
  goodRow: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goodRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  goodRowLabel: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 22,
    color: C.onSurface,
    flex: 1,
  },
  goodAction: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },

  // Pinned card
  pinnedCard: {
    marginHorizontal: 24,
    marginTop: 40,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: C.tertiary,
    padding: 24,
    ...softShadow,
  },
  pinnedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  pinnedEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.tertiary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  pinnedAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  pinnedAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  pinnedAvatarInitial: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 18, lineHeight: 22,
    color: C.onTertiaryContainer,
  },
  pinnedName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurface,
  },
  pinnedSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
  },
  pinnedBody: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 16, lineHeight: 27,
    color: C.onSurface,
    marginBottom: 24,
  },
  pinnedReactions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pinnedReact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surfaceContainerHigh,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  pinnedReactText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },

  // Sit in the room
  sitRoom: {
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    ...softShadow,
  },
  sitRoomDots: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  sitDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.tertiary,
  },
  sitRoomTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 26,
    color: C.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  sitRoomBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14, lineHeight: 21,
    color: C.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 22,
  },
  sitRoomBtn: {
    backgroundColor: C.onSurface,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 9999,
    ...softShadow,
  },
  sitRoomBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.surface,
    letterSpacing: 0.3,
  },

  // Filters
  filtersRow: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
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
  filterLabelActive: { color: C.onPrimary },

  // Posts
  postsList: {
    marginTop: 24,
    paddingHorizontal: 24,
    gap: 16,
  },
  postCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 22,
    ...softShadow,
  },
  postHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 10,
  },
  postAuthor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  postAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  postAvatarText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
  },
  postName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurface,
  },
  postWhen: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    marginTop: 1,
  },
  postPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  postPillText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 14,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  postBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 17, lineHeight: 26,
    color: C.onSurface,
    marginBottom: 22,
  },
  postReactions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  postReactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  postReactText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },

  // Safety check-in (dark card)
  safetyWrap: {
    marginTop: 40,
    paddingHorizontal: 24,
  },
  safetyCard: {
    backgroundColor: C.inverseSurface,
    borderRadius: 16,
    padding: 32,
    ...softShadow,
  },
  safetyHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20, lineHeight: 28,
    color: C.inverseOnSurface,
    marginBottom: 22,
    letterSpacing: -0.1,
  },
  safetyBtn: {
    backgroundColor: 'rgba(255,248,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,246,0.18)',
    padding: 16,
    borderRadius: 14,
  },
  safetyBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.inverseOnSurface,
    letterSpacing: 0.2,
  },
  safetyBtnError: {
    backgroundColor: C.errorContainer,
    padding: 16,
    borderRadius: 14,
  },
  safetyBtnErrorText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onErrorContainer,
    letterSpacing: 0.2,
  },

  // FAB (rounded-2xl per HTML, not full circle)
  fab: {
    position: 'absolute',
    right: 24,
    width: 56, height: 56,
    borderRadius: 18,
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
