import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

// ─── Design tokens (AGENTS.md canonical + Grief bespoke palette) ─────────────
const C = {
  surface:               '#fff8f6',
  surfaceContainerLowest:'#ffffff',
  surfaceContainerLow:   '#fff1ed',
  surfaceContainer:      '#ffe9e4',
  surfaceContainerHigh:  '#ffe2db',
  primary:               '#994531',
  onPrimary:             '#ffffff',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  outlineVariant:        '#dbc1bb',
  // Bespoke palette for this circle's editorial direction (per HTML ref).
  candleGold:            '#e6b860',
  mistyBlue:             '#8a96a3',
  softHeather:           '#a89bb0',
  warmCream:             '#f5ede4',  // hero gradient bottom
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_BAR_H = Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82;

// ─── Mock content (per design ref) ──────────────────────────────────────────

type Wave = 'quiet' | 'receding' | 'cresting' | 'incoming';
const WAVES: { id: Wave; label: string; opacity: number }[] = [
  { id: 'quiet',    label: 'Quiet',    opacity: 0.30 },
  { id: 'receding', label: 'Receding', opacity: 0.50 },
  { id: 'cresting', label: 'Cresting', opacity: 0.80 },
  { id: 'incoming', label: 'Incoming', opacity: 0.40 },
];

interface Memorial { id: string; name: string; year: string; tint: string }
const MEMORIALS: Memorial[] = [
  { id: 'm1', name: 'Lola Maria', year: '2019', tint: 'rgba(138,150,163,0.20)' },
  { id: 'm2', name: 'Pepper',     year: '2023', tint: 'rgba(230,184,96,0.20)' },
  { id: 'm3', name: 'Mark',       year: '2021', tint: 'rgba(168,155,176,0.20)' },
];

type Filter = 'anniversary' | 'continuing' | 'disenfranchised' | 'anticipatory';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'anniversary',     label: 'Anniversary' },
  { id: 'continuing',      label: 'Continuing bonds' },
  { id: 'disenfranchised', label: 'Disenfranchised' },
  { id: 'anticipatory',    label: 'Anticipatory' },
];

type LossKind = 'parent' | 'pet' | 'partner' | 'sibling';
const LOSS_KINDS: { id: LossKind; label: string }[] = [
  { id: 'parent',  label: 'Parent' },
  { id: 'pet',     label: 'Pet' },
  { id: 'partner', label: 'Partner' },
  { id: 'sibling', label: 'Sibling' },
];

type Reaction = { icon: Mci; label: string; iconColor?: string };
type Post =
  | {
      kind: 'reactions';
      id: string;
      authorInitial: string;
      authorTint: string;
      authorName: string;
      tagLabel: string;
      tagColor: string;
      tagBg: string;
      body: string;
      reactions: Reaction[];
    }
  | {
      kind: 'social';
      id: string;
      authorInitial: string;
      authorTint: string;
      authorName: string;
      tagLabel: string;
      tagColor: string;
      tagBg: string;
      topAccent: string;
      body: string;
    }
  | {
      kind: 'quoted';
      id: string;
      authorInitial: string;
      authorTint: string;
      authorName: string;
      tagLabel: string;
      tagColor: string;
      tagBg: string;
      body: string;
      hearts: number;
      chats: number;
    };

const POSTS: Post[] = [
  {
    kind: 'reactions',
    id: 'p1',
    authorInitial: 'S',
    authorTint: 'rgba(138,150,163,0.20)',
    authorName: 'Sarah H.',
    tagLabel: 'Incoming Wave',
    tagColor: '#8a96a3',
    tagBg: 'rgba(138,150,163,0.10)',
    body: 'Heard her song on the radio this morning… cried right in the cereal aisle. It felt like she was standing right behind me for a second.',
    reactions: [
      { icon: 'account-multiple-outline', label: "I'm sitting with you" },
      { icon: 'waves',                    label: 'This wave too' },
      { icon: 'candle',                   label: 'Sending a candle', iconColor: '#e6b860' },
    ],
  },
  {
    kind: 'social',
    id: 'p2',
    authorInitial: 'M',
    authorTint: 'rgba(230,184,96,0.30)',
    authorName: 'Maya',
    tagLabel: 'Anniversary',
    tagColor: '#e6b860',
    tagBg: 'rgba(230,184,96,0.12)',
    topAccent: '#e6b860',
    body: "Remembering Mom today. 4 years. The world feels different without her laugh, but I'm making her favorite lemon cake tonight.",
  },
  {
    kind: 'quoted',
    id: 'p3',
    authorInitial: 'J',
    authorTint: 'rgba(168,155,176,0.20)',
    authorName: 'James T.',
    tagLabel: 'Long Carrier',
    tagColor: '#a89bb0',
    tagBg: 'rgba(168,155,176,0.10)',
    body: "23 years since I lost my brother… It doesn't end. It just changes shape. Sometimes it's a pebble in my shoe, sometimes it's an anchor. Today it's just a soft breeze.",
    hearts: 152,
    chats: 48,
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CircleGriefScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useScrollTopOnFocus();

  const [activeWave, setActiveWave] = useState<Wave>('cresting');
  const [activeFilter, setActiveFilter] = useState<Filter>('anniversary');
  const [activeLoss, setActiveLoss] = useState<LossKind | null>(null);

  const headerH = 64;

  function goBack() {
    void Haptics.selectionAsync();
    router.replace('/(main)/community');
  }

  function openVoice() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(main)/post-composer',
      params: { circleId: 'grief', mode: 'voice', anonymous: '0' },
    });
  }
  function openLetter() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(main)/post-composer',
      params: { circleId: 'grief', mode: 'letter', anonymous: '0' },
    });
  }
  function openComposer() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(main)/post-composer',
      params: { circleId: 'grief', anonymous: '0' },
    });
  }

  const todayStr = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    [],
  );

  // Candle flicker — opacity 0.8 ↔ 1, scale 1 ↔ 1.1, 3s ease-in-out infinite.
  const flicker = useSharedValue(0);
  useEffect(() => {
    flicker.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [flicker]);
  const flickerStyle = useAnimatedStyle(() => ({
    opacity: 0.8 + flicker.value * 0.2,
    transform: [{ scale: 1 + flicker.value * 0.1 }],
  }));

  // Bottom safe pads: tab bar + bereavement strip + FAB
  const bottomPad = 32;

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.topBar, { paddingTop: insets.top, height: insets.top + headerH }]}>
        <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.onSurface} />
        </TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>Grief</Text>
        <View style={s.topRight}>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(main)/notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color={C.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: insets.top + headerH, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient
            colors={[C.surfaceContainerLow, C.warmCream]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroIcon}>
              <Animated.View style={flickerStyle}>
                <MaterialCommunityIcons name="candle" size={32} color={C.candleGold} />
              </Animated.View>
            </View>
            <Text style={s.heroTitle}>Grief</Text>
            <Text style={s.heroQuote}>"Grief is the love that has nowhere to go." — Jamie Anderson</Text>
            <View style={s.heroChipsRow}>
              <View style={s.heroChip}><Text style={s.heroChipText}>23.4k members</Text></View>
              <View style={s.heroChip}><Text style={s.heroChipText}>No finish line</Text></View>
              <View style={s.heroChip}><Text style={s.heroChipText}>Moderated</Text></View>
            </View>
            <View style={s.heroDivider} />
          </LinearGradient>
        </Animated.View>

        {/* ── Wave Check ── */}
        <Animated.View entering={FadeInUp.delay(60).springify()} style={s.waveWrap}>
          <View style={s.waveCard}>
            <Text style={s.cardHeading}>Where's the wave right now?</Text>
            <View style={s.waveRow}>
              {WAVES.map((w) => {
                const active = activeWave === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setActiveWave(w.id);
                    }}
                    style={s.waveCol}
                  >
                    <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
                      <LinearGradient
                        colors={[C.warmCream, C.mistyBlue]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={{
                          height: active ? '100%' : `${Math.max(40, w.opacity * 100)}%`,
                          borderTopLeftRadius: 9999,
                          borderTopRightRadius: 9999,
                          opacity: active ? 0.95 : w.opacity,
                        }}
                      />
                    </View>
                    <Text style={s.waveLabel}>{w.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ── Calendar of Remembrance ── */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={s.remembranceWrap}>
          <Text style={s.remembranceDate}>{todayStr}</Text>
          <Text style={s.remembranceLead}>Today, 12 members of this circle are remembering.</Text>
          <Text style={s.remembranceSub}>Anniversaries, birthdays, the day.</Text>
          <TouchableOpacity activeOpacity={0.85} style={s.remembranceBtn}>
            <Text style={s.remembranceBtnText}>View today's remembrances</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Memorial Wall ── */}
        <Animated.View entering={FadeInUp.delay(140).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionHeading}>Yours</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <MaterialCommunityIcons name="plus-circle-outline" size={22} color={C.outline} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.memorialRow}
          >
            {MEMORIALS.map((m) => (
              <View key={m.id} style={s.memorialCard}>
                <View style={[s.memorialAvatar, { backgroundColor: m.tint }]}>
                  <Text style={s.memorialInitial}>{m.name.charAt(0)}</Text>
                </View>
                <Text style={s.memorialName}>{m.name}</Text>
                <Text style={s.memorialYear}>{m.year}</Text>
                <Animated.View style={[flickerStyle, { marginTop: 'auto' }]}>
                  <MaterialCommunityIcons name="candle" size={14} color={C.candleGold} />
                </Animated.View>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Talk to Them ── */}
        <Animated.View entering={FadeInUp.delay(180).springify()} style={s.talkWrap}>
          <View style={s.talkCard}>
            <Text style={s.cardHeading}>Talk to them</Text>
            <View style={{ gap: 12 }}>
              <TouchableOpacity activeOpacity={0.85} onPress={openVoice} style={s.talkBtnFilled}>
                <MaterialCommunityIcons name="microphone" size={18} color="#ffffff" />
                <Text style={s.talkBtnFilledText}>Record a voice note to them</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={openLetter} style={s.talkBtnOutline}>
                <MaterialCommunityIcons name="pencil" size={18} color={C.onSurfaceVariant} />
                <Text style={s.talkBtnOutlineText}>Write them a letter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ── Today's Reading ── */}
        <Animated.View entering={FadeInUp.delay(220).springify()} style={s.readingWrap}>
          <View style={s.readingCard}>
            <Text style={s.readingEyebrow}>Today's Reading</Text>
            <Text style={s.readingQuote}>
              "What is grief, if not love persevering?"
            </Text>
            <Text style={s.readingAttribution}>— Vision, WandaVision</Text>
          </View>
        </Animated.View>

        {/* ── Companion Bench ── */}
        <Animated.View entering={FadeInUp.delay(260).springify()} style={s.companionWrap}>
          <LinearGradient
            colors={[C.warmCream, C.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.companionCard}
          >
            <Text style={s.companionTitle}>Someone arrived this week.</Text>
            <Text style={s.companionSub}>23 members joined the circle.</Text>
            <View style={s.companionActions}>
              <TouchableOpacity activeOpacity={0.85} style={s.companionBtnOutline}>
                <Text style={s.companionBtnOutlineText}>Sit with one of them</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={s.companionBtnFilled}>
                <Text style={s.companionBtnFilledText}>I'm new — find me someone</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Feed Header + Filters ── */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={{ marginTop: 40 }}>
          <Text style={[s.feedHeading, { paddingHorizontal: 24, marginBottom: 14 }]}>From the circle</Text>
          {/* Filter row 1 — kind */}
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
                  <Text style={[s.filterLabel, active && s.filterLabelActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {/* Filter row 2 — loss relation */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[s.filtersRow, { marginTop: 10 }]}
          >
            {LOSS_KINDS.map((f) => {
              const active = activeLoss === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setActiveLoss((cur) => (cur === f.id ? null : f.id));
                  }}
                  style={[s.lossChip, active && s.lossChipActive]}
                >
                  <Text style={[s.lossLabel, active && s.lossLabelActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── Posts ── */}
        <View style={s.postsList}>
          {POSTS.map((p, i) => {
            const headerNode = (
              <View style={s.postHead}>
                <View style={s.postAuthor}>
                  <View style={[s.postAvatar, { backgroundColor: p.authorTint }]}>
                    <Text style={s.postAvatarText}>{p.authorInitial}</Text>
                  </View>
                  <Text style={s.postName}>{p.authorName}</Text>
                </View>
                <View style={[s.postTag, { backgroundColor: p.tagBg }]}>
                  <Text style={[s.postTagText, { color: p.tagColor }]}>{p.tagLabel}</Text>
                </View>
              </View>
            );

            if (p.kind === 'reactions') {
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(340 + i * 60).springify()} style={s.postCard}>
                  {headerNode}
                  <Text style={s.postBody}>{p.body}</Text>
                  <View style={s.reactionsRow}>
                    {p.reactions.map((rx, ri) => (
                      <TouchableOpacity key={ri} activeOpacity={0.85} style={s.reactionPill}>
                        <MaterialCommunityIcons
                          name={rx.icon}
                          size={14}
                          color={rx.iconColor ?? C.onSurfaceVariant}
                        />
                        <Text style={s.reactionLabel}>{rx.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              );
            }

            if (p.kind === 'social') {
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(340 + i * 60).springify()} style={s.postCardOverflow}>
                  <View style={[s.postTopAccent, { backgroundColor: p.topAccent }]} />
                  <View style={{ padding: 20 }}>
                    {headerNode}
                    <Text style={s.postBodyMuted}>{p.body}</Text>
                    <View style={s.socialIcons}>
                      <MaterialCommunityIcons name="heart-outline" size={20} color={C.onSurfaceVariant} />
                      <MaterialCommunityIcons name="message-outline" size={20} color={C.onSurfaceVariant} />
                      <MaterialCommunityIcons name="share-variant" size={20} color={C.onSurfaceVariant} />
                    </View>
                  </View>
                </Animated.View>
              );
            }

            // quoted
            return (
              <Animated.View key={p.id} entering={FadeInDown.delay(340 + i * 60).springify()} style={s.postCard}>
                {headerNode}
                <View style={s.quotedBody}>
                  <Text style={s.quotedText}>{p.body}</Text>
                </View>
                <View style={s.metricsRow}>
                  <View style={s.metricItem}>
                    <MaterialCommunityIcons name="heart-outline" size={14} color={C.onSurfaceVariant} />
                    <Text style={s.metricText}>{p.hearts}</Text>
                  </View>
                  <View style={s.metricItem}>
                    <MaterialCommunityIcons name="message-outline" size={14} color={C.onSurfaceVariant} />
                    <Text style={s.metricText}>{p.chats}</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Lighting Hour ── */}
        <Animated.View entering={FadeInUp.delay(460).springify()} style={s.lightingWrap}>
          <LinearGradient
            colors={[C.softHeather, C.warmCream]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.lightingCard}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.lightingTitle}>Lighting Hour</Text>
              <Text style={s.lightingSub}>Join the live silent ritual at 8:00 PM tonight.</Text>
              <TouchableOpacity activeOpacity={0.85} style={s.lightingBtn}>
                <Text style={s.lightingBtnText}>Reserve a candle</Text>
              </TouchableOpacity>
            </View>
            <Animated.View style={[flickerStyle, { opacity: 0.4 }]}>
              <MaterialCommunityIcons name="candle" size={72} color="#ffffff" />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      {/* ── FAB (misty-blue, flickering candle) ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openComposer}
        style={[s.fab, { bottom: insets.bottom + TAB_BAR_H + 24 }]}
      >
        <Animated.View style={flickerStyle}>
          <MaterialCommunityIcons name="candle" size={28} color="#ffffff" />
        </Animated.View>
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
    backgroundColor: 'rgba(255,248,246,0.92)',
  },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  topTitle: {
    flex: 1,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17, lineHeight: 22,
    color: C.onSurface,
    textAlign: 'center',
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Hero
  hero: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 36, lineHeight: 44,
    color: C.onSurface,
    marginBottom: 16,
    textAlign: 'center',
  },
  heroQuote: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 24,
    color: C.onSurfaceVariant,
    maxWidth: 300,
    marginBottom: 24,
    textAlign: 'center',
  },
  heroChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 9999,
  },
  heroChipText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  heroDivider: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: C.mistyBlue,
    opacity: 0.20,
  },

  // Wave check
  waveWrap: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  waveCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: 24,
    ...softShadow,
  },
  cardHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 26,
    color: C.onSurface,
    letterSpacing: -0.1,
    marginBottom: 24,
  },
  waveRow: {
    flexDirection: 'row',
    height: 110,
    gap: 12,
  },
  waveCol: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    height: '100%',
  },
  waveLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 13,
    color: C.onSurfaceVariant,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Remembrance
  remembranceWrap: {
    paddingHorizontal: 24,
    marginTop: 48,
    alignItems: 'center',
  },
  remembranceDate: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  remembranceLead: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 26,
    color: C.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  remembranceSub: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 14, lineHeight: 20,
    color: C.onSurfaceVariant,
    marginBottom: 18,
    textAlign: 'center',
  },
  remembranceBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: C.mistyBlue,
    borderRadius: 9999,
  },
  remembranceBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // Sections (shared)
  section: { marginTop: 48 },
  sectionHeaderRow: {
    paddingHorizontal: 24,
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

  // Memorial wall
  memorialRow: {
    paddingHorizontal: 24,
    gap: 14,
    paddingBottom: 4,
  },
  memorialCard: {
    width: 116,
    height: 152,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.surfaceContainer,
    ...softShadow,
  },
  memorialAvatar: {
    width: 64, height: 64, borderRadius: 32,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: C.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  memorialInitial: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 24, lineHeight: 30,
    color: C.onSurfaceVariant,
  },
  memorialName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 15,
    color: C.onSurface,
    textAlign: 'center',
  },
  memorialYear: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 10, lineHeight: 13,
    color: C.onSurfaceVariant,
    marginTop: 2,
  },

  // Talk to them
  talkWrap: { paddingHorizontal: 24, marginTop: 32 },
  talkCard: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    padding: 24,
  },
  talkBtnFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    backgroundColor: C.mistyBlue,
    borderRadius: 9999,
  },
  talkBtnFilledText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  talkBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderWidth: 1,
    borderColor: C.outline,
    borderRadius: 9999,
  },
  talkBtnOutlineText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.3,
  },

  // Today's Reading
  readingWrap: { paddingHorizontal: 24, marginTop: 48 },
  readingCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 32,
    borderLeftWidth: 4,
    borderLeftColor: C.candleGold,
    ...softShadow,
  },
  readingEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 13,
    color: C.candleGold,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  readingQuote: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 18, lineHeight: 30,
    color: C.onSurface,
    marginBottom: 16,
  },
  readingAttribution: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
  },

  // Companion bench
  companionWrap: { paddingHorizontal: 24, marginTop: 32 },
  companionCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.surfaceContainer,
  },
  companionTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 18, lineHeight: 26,
    color: C.onSurface,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  companionSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    marginBottom: 22,
  },
  companionActions: { flexDirection: 'row', gap: 10 },
  companionBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.outline,
    borderRadius: 9999,
    alignItems: 'center',
  },
  companionBtnOutlineText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  companionBtnFilled: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: C.candleGold,
    borderRadius: 9999,
    alignItems: 'center',
  },
  companionBtnFilledText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurface,
    letterSpacing: 0.2,
  },

  // Feed
  feedHeading: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 22, lineHeight: 28,
    color: C.onSurface,
  },
  filtersRow: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerHigh,
  },
  filterChipActive: { backgroundColor: C.softHeather },
  filterLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  filterLabelActive: { color: '#ffffff' },
  lossChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: 'rgba(138,150,163,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(138,150,163,0.30)',
  },
  lossChipActive: {
    backgroundColor: C.mistyBlue,
    borderColor: C.mistyBlue,
  },
  lossLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  lossLabelActive: { color: '#ffffff' },

  // Posts
  postsList: {
    marginTop: 20,
    paddingHorizontal: 24,
    gap: 16,
  },
  postCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.surfaceContainer,
    ...softShadow,
  },
  postCardOverflow: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.surfaceContainer,
    ...softShadow,
  },
  postTopAccent: { height: 6, width: '100%' },
  postHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 8,
  },
  postAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  postAvatarText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 14, lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  postName: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurface,
  },
  postTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  postTagText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  postBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 24,
    color: C.onSurface,
    marginBottom: 18,
  },
  postBodyMuted: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 24,
    color: C.onSurfaceVariant,
    marginBottom: 18,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainerLow,
  },
  reactionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  socialIcons: { flexDirection: 'row', gap: 18 },
  quotedBody: {
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(168,155,176,0.40)',
    marginBottom: 18,
  },
  quotedText: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 15, lineHeight: 25,
    color: C.onSurface,
  },
  metricsRow: { flexDirection: 'row', gap: 18 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },

  // Lighting Hour
  lightingWrap: { paddingHorizontal: 24, marginTop: 32 },
  lightingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 28,
    borderRadius: 16,
    overflow: 'hidden',
    gap: 18,
    ...softShadow,
  },
  lightingTitle: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 20, lineHeight: 26,
    color: '#ffffff',
    marginBottom: 8,
  },
  lightingSub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13, lineHeight: 19,
    color: 'rgba(255,255,255,0.92)',
    maxWidth: 200,
    marginBottom: 16,
  },
  lightingBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  lightingBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12, lineHeight: 16,
    color: C.softHeather,
    letterSpacing: 0.3,
  },

  // Floating bereavement strip
  bereavementWrap: {
    position: 'absolute',
    left: 24, right: 24,
    zIndex: 28,
  },
  bereavementCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: C.surfaceContainer,
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...softShadow,
  },
  bereavementText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.mistyBlue,
    letterSpacing: 0.2,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.mistyBlue,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5C4742',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 30,
  },
});
