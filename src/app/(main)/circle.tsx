import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCircleFeed } from '../../lib/queries/feed';
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
  onPrimary:             '#ffffff',
  onPrimaryContainer:    '#641e0e',
  secondary:             '#006970',
  secondaryContainer:    '#90f2fc',
  secondaryFixed:        '#90f2fc',
  onSecondaryContainer:  '#006f77',
  onSurface:             '#281814',
  onSurfaceVariant:      '#55433e',
  outline:               '#88726d',
  outlineVariant:        '#dbc1bb',
  error:                 '#ba1a1a',
  errorContainer:        '#ffdad6',
} as const;

type Mci = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_BAR_H = Platform.select({ ios: 96, android: 82, default: 82 }) ?? 82;

// ─── Circle registry (placeholder until bloom_circles table lands) ──────────

interface CircleMeta {
  id: string;
  name: string;
  hero: { icon: Mci; gradient: [string, string] };
  memberCount: string;
  onlineCount: string;
}

const CIRCLES: Record<string, CircleMeta> = {
  anxiety: {
    id: 'anxiety',
    name: 'Anxiety Support',
    hero: { icon: 'leaf', gradient: ['#90f2fc', '#ffdad2'] },
    memberCount: '12.4k members',
    onlineCount: '47 online',
  },
};

// ─── Mock content (per design ref) ──────────────────────────────────────────
// Placeholder until circle_posts / circle_voice_notes / circle_pulse land.

interface ReliefTool {
  id: string;
  label: string;
  icon: Mci;
  iconBg: string;
  iconColor: string;
  borderError?: boolean;
  route?: string;
  tel?: string;
}

const RELIEF_TOOLS: ReliefTool[] = [
  { id: 'breathing',  label: '4-7-8 Breathing',     icon: 'weather-windy',  iconBg: C.surfaceContainer,  iconColor: C.primary,                   route: '/(main)/breathing' },
  { id: 'grounding',  label: '5-4-3-2-1 Grounding', icon: 'eye-outline',    iconBg: C.secondaryContainer, iconColor: C.secondary,                 route: '/(main)/body-scan'  },
  { id: 'body-scan',  label: 'Body Scan',           icon: 'human',          iconBg: C.primaryFixed,      iconColor: C.primary,                   route: '/(main)/body-scan'  },
  { id: 'sos',        label: 'SOS Hotline',         icon: 'phone-in-talk',  iconBg: C.errorContainer,    iconColor: C.error, borderError: true,  tel: '1553' },
];

interface VoiceNote {
  id: string;
  who: string;
  when: string;
  duration: string;
  waveform: number[]; // bar heights in px, 2 .. 32
}

const VOICE_NOTES: VoiceNote[] = [
  { id: 'v1', who: 'anonymous', when: '2h ago', duration: '0:34', waveform: [12, 20, 32, 16, 24, 8, 14, 22, 10] },
  { id: 'v2', who: 'deepak',    when: '5h ago', duration: '1:12', waveform: [24, 8, 16, 28, 12, 20, 6, 18, 26] },
];

type Filter = 'all' | 'support' | 'wins' | 'questions' | 'resources';

const FILTERS: { id: Filter; label: string; dot?: string }[] = [
  { id: 'all',        label: 'All' },
  { id: 'support',    label: 'Need support', dot: C.error },
  { id: 'wins',       label: 'Wins' },
  { id: 'questions',  label: 'Questions' },
  { id: 'resources',  label: 'Resources' },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CircleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const meta = CIRCLES[id ?? 'anxiety'] ?? CIRCLES.anxiety;

  // Load real posts from the circle
  const { data: posts = [], isLoading: postsLoading } = useCircleFeed(meta.id);

  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [cwExpanded, setCwExpanded] = useState(false);
  const scrollRef = useScrollTopOnFocus();

  const headerH = 64;

  function goBack() {
    void Haptics.selectionAsync();
    router.replace('/(main)/community');
  }

  function openReliefTool(tool: ReliefTool) {
    void Haptics.selectionAsync();
    if (tool.tel) {
      void Linking.openURL(`tel:${tool.tel}`);
      return;
    }
    if (tool.route) router.push(tool.route as never);
  }

  function openComposer(anonymous: boolean) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(main)/post-composer',
      params: { circleId: meta.id, anonymous: anonymous ? '1' : '0' },
    });
  }

  const heroPadTop = useMemo(() => insets.top + headerH, [insets.top]);

  return (
    <View style={s.root}>
      {/* Top App Bar — fixed/translucent */}
      <View style={[s.topBar, { paddingTop: insets.top, height: insets.top + headerH }]}>
        <View style={s.topLeft}>
          <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={C.primary} />
          </TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>{meta.name}</Text>
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
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Band ── */}
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient
            colors={meta.hero.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.hero, { paddingTop: heroPadTop + 16 }]}
          >
            <View style={s.heroIcon}>
              <MaterialCommunityIcons name={meta.hero.icon} size={40} color={C.primary} />
            </View>
            <Text style={s.heroTitle}>{meta.name}</Text>
            <View style={s.heroMetaRow}>
              <Text style={s.heroMetaText}>{meta.memberCount}</Text>
              <View style={s.heroMetaDot} />
              <Text style={[s.heroMetaText, s.heroMetaOnline]}>{meta.onlineCount}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={s.joinedBtn}>
              <Text style={s.joinedBtnText}>Joined</Text>
              <MaterialCommunityIcons name="check" size={16} color={C.primary} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ── Pulse Strip ── */}
        <Animated.View entering={FadeInUp.delay(80).springify()} style={s.pulseCard}>
          <Text style={s.pulseHeading}>Right now in the circle</Text>
          <View style={s.pulseBar}>
            <View style={[s.pulseSeg, { flex: 12, backgroundColor: C.surfaceContainer }]} />
            <View style={[s.pulseSeg, { flex: 8,  backgroundColor: C.primaryFixed }]} />
            <View style={[s.pulseSeg, { flex: 4,  backgroundColor: C.secondaryFixed }]} />
          </View>
          <View style={s.pulseFooter}>
            <Text style={s.pulseLegend}>12 restless · 8 overwhelmed · 4 calm</Text>
            <TouchableOpacity activeOpacity={0.7} style={s.warmthBtn}>
              <Text style={s.warmthBtnText}>Send group warmth</Text>
              <MaterialCommunityIcons name="arrow-right" size={12} color={C.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Relief Toolkit ── */}
        <Animated.View entering={FadeInUp.delay(120).springify()} style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.editorialHeading}>When you need a moment</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.reliefRow}
          >
            {RELIEF_TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                activeOpacity={0.85}
                onPress={() => openReliefTool(tool)}
                style={[s.reliefCard, tool.borderError && s.reliefCardError]}
              >
                <View style={[s.reliefIcon, { backgroundColor: tool.iconBg }]}>
                  <MaterialCommunityIcons name={tool.icon} size={20} color={tool.iconColor} />
                </View>
                <Text style={[s.reliefLabel, tool.borderError && { color: C.error }]} numberOfLines={2}>
                  {tool.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Today's Anchor Card ── */}
        <Animated.View entering={FadeInUp.delay(160).springify()} style={s.anchorCard}>
          <View style={s.anchorBlob} />
          <Text style={s.anchorTitle}>What's one tiny thing that grounded you today?</Text>
          <View style={s.anchorActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openComposer(true)}
              style={s.anchorBtnOutline}
            >
              <Text style={s.anchorBtnOutlineText}>Share quietly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openComposer(false)}
              style={s.anchorBtnFilled}
            >
              <Text style={s.anchorBtnFilledText}>Share as me</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Voice Notes ── */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={s.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.voiceRow}
          >
            {VOICE_NOTES.map((vn) => (
              <View key={vn.id} style={s.voiceCard}>
                <View style={s.voiceTop}>
                  <TouchableOpacity activeOpacity={0.85} style={s.voicePlay}>
                    <MaterialCommunityIcons name="play" size={22} color={C.primary} />
                  </TouchableOpacity>
                  <View style={s.voiceWave}>
                    {vn.waveform.map((h, i) => (
                      <View
                        key={i}
                        style={[
                          s.voiceWaveBar,
                          {
                            height: h,
                            opacity: 0.3 + ((i * 17) % 70) / 100,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={s.voiceDuration}>{vn.duration}</Text>
                </View>
                <Text style={s.voiceMeta}>shared by {vn.who} · {vn.when}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Filter Chips ── */}
        <Animated.View entering={FadeInUp.delay(240).springify()} style={{ marginTop: 32 }}>
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
                  {f.dot ? <View style={[s.filterDot, { backgroundColor: f.dot }]} /> : null}
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
          {postsLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : posts.length === 0 ? (
            <View style={s.emptyState}>
              <MaterialCommunityIcons name="flower-outline" size={48} color={C.outlineVariant} />
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>Be the first to share a moment in this circle.</Text>
            </View>
          ) : (
            posts.map((post, i) => (
              <Animated.View key={post.id} entering={FadeInDown.delay(280 + i * 60).springify()} style={s.postCard}>
                <View style={s.postHead}>
                  <View style={[s.postTag, { backgroundColor: `${post.color_hex}20` }]}>
                    <Text style={[s.postTagText, { color: post.color_hex }]}>
                      {post.category}
                    </Text>
                  </View>
                  <Text style={s.postWhen}>
                    {new Date(post.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <Text style={s.postBody}>{post.sentence}</Text>
                {post.anchor_word ? (
                  <View style={s.anchorTag}>
                    <View style={[s.anchorDot, { backgroundColor: post.color_hex }]} />
                    <Text style={s.anchorText}>{post.anchor_word}</Text>
                  </View>
                ) : null}
                <View style={s.postActions}>
                  <TouchableOpacity activeOpacity={0.85} style={s.reactionBtn}>
                    <MaterialCommunityIcons name="heart-outline" size={14} color={C.onSurfaceVariant} />
                    <Text style={s.reactionLabel}>Felt this {post.resonance_count}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.85} style={s.reactionBtn}>
                    <MaterialCommunityIcons name="emoticon-outline" size={14} color={C.onSurfaceVariant} />
                    <Text style={s.reactionLabel}>Send a hug</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))
          )}
        </View>
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

  // Top bar (translucent, fixed)
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(219,193,187,0.18)',
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
    fontSize: 17, lineHeight: 22,
    color: C.onSurface,
    flex: 1,
  },

  // Hero band
  hero: {
    minHeight: 260,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    ...softShadow,
  },
  heroTitle: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 32, lineHeight: 38,
    color: C.onPrimaryContainer,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  heroMetaText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
  },
  heroMetaOnline: { color: C.secondary },
  heroMetaDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: C.primary,
  },
  joinedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: '#5C4742',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  joinedBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.primary,
    letterSpacing: 0.2,
  },

  // Pulse strip
  pulseCard: {
    marginHorizontal: 24,
    marginTop: 32,
    padding: 20,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
  },
  pulseHeading: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  pulseBar: {
    height: 8,
    borderRadius: 9999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  pulseSeg: { height: '100%' },
  pulseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pulseLegend: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
    flex: 1,
  },
  warmthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warmthBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Sections (gap holder)
  section: { marginTop: 32 },
  sectionHeaderRow: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  editorialHeading: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 18, lineHeight: 24,
    color: C.onSurface,
  },

  // Relief toolkit
  reliefRow: {
    paddingHorizontal: 24,
    gap: 14,
  },
  reliefCard: {
    flex: 1,
    minWidth: 140,
    aspectRatio: 1,
    backgroundColor: C.surfaceContainerLowest,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    ...softShadow,
  },
  reliefCardError: {
    borderWidth: 2,
    borderColor: 'rgba(186,26,26,0.22)',
  },
  reliefIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  reliefLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onSurface,
    textAlign: 'center',
  },

  // Anchor card
  anchorCard: {
    marginHorizontal: 24,
    marginTop: 32,
    padding: 28,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.35)',
    overflow: 'hidden',
    ...softShadow,
  },
  anchorBlob: {
    position: 'absolute',
    top: -32, right: -32,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,218,210,0.35)',
  },
  anchorTitle: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 22, lineHeight: 30,
    color: C.onSurface,
    marginBottom: 28,
  },
  anchorActions: {
    gap: 12,
  },
  anchorBtnOutline: {
    height: 52,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorBtnOutlineText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.primary,
    letterSpacing: 0.4,
  },
  anchorBtnFilled: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: C.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  anchorBtnFilledText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14, lineHeight: 18,
    color: C.onPrimaryContainer,
    letterSpacing: 0.4,
  },

  // Voice notes
  voiceRow: {
    paddingHorizontal: 24,
    gap: 14,
  },
  voiceCard: {
    width: 280,
    backgroundColor: C.surfaceContainerLow,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.45)',
  },
  voiceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  voicePlay: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#5C4742',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  voiceWave: {
    flex: 1,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceWaveBar: {
    width: 4,
    borderRadius: 9999,
    backgroundColor: C.primary,
  },
  voiceDuration: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  voiceMeta: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurface,
  },

  // Filter chips
  filtersRow: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
  },
  filterChipActive: {
    backgroundColor: C.primary,
  },
  filterDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  filterLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  filterLabelActive: {
    color: '#ffffff',
  },

  // Posts
  postsList: {
    marginTop: 24,
    paddingHorizontal: 24,
    gap: 16,
  },

  // Empty state
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: C.onSurface,
  },
  emptySub: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.onSurfaceVariant,
    textAlign: 'center',
  },

  // Anchor tag
  anchorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  anchorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  anchorText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    color: C.onSurfaceVariant,
    fontStyle: 'italic',
  },

  // Post card (white)
  postCard: {
    backgroundColor: C.surfaceContainerLowest,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(219,193,187,0.18)',
    ...softShadow,
  },
  postHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  postTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  postTagText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10, lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  postWhen: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 12, lineHeight: 16,
    color: C.onSurfaceVariant,
  },
  postBody: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15, lineHeight: 24,
    color: C.onSurface,
    marginBottom: 24,
  },
  postBodyEmphasis: {
    fontSize: 17, lineHeight: 26,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  postActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: C.surfaceContainer,
  },
  reactionBtnSubtle: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  reactionLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurfaceVariant,
  },

  // Content warning collapsed card
  cwCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(219,193,187,0.6)',
  },
  cwLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cwLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 18,
    color: C.onSurfaceVariant,
    flex: 1,
  },

  // Event banner
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
    borderRadius: 16,
    gap: 12,
    ...softShadow,
  },
  eventTitle: {
    fontFamily: 'Fraunces_400Regular_Italic',
    fontSize: 20, lineHeight: 26,
    color: C.onSurface,
    marginBottom: 4,
  },
  eventEyebrow: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: C.secondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eventBtn: {
    backgroundColor: C.onPrimaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: '#5C4742',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  eventBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // Crisis sticky strip
  crisisWrap: {
    position: 'absolute',
    left: 16, right: 16,
    zIndex: 30,
  },
  crisisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    paddingLeft: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(186,26,26,0.10)',
    shadowColor: '#5C4742',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  crisisLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  crisisText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13, lineHeight: 16,
    color: C.onSurface,
    flex: 1,
  },
  crisisBtn: {
    backgroundColor: C.error,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  crisisBtnText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 11, lineHeight: 14,
    color: '#ffffff',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 24,
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
