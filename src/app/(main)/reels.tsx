import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareReelSheet, type SharedReelPayload } from '../../components/reels/ShareReelSheet';
import { layout } from '../../constants/theme';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary:              '#994531',
  primaryContainer:     '#e8836b',
  onPrimaryContainer:   '#641e0e',
  surfaceContainerHigh: '#ffe2db',
  onSurface:            '#281814',
  onSurfaceVariant:     '#55443e',
  outline:              '#88726d',
  surfaceContainerLow:  '#fff1ed',
} as const;

// ─── Data ────────────────────────────────────────────────────────────────────

interface ReelTheme {
  bg: string;
  blob1: string;
  blob2: string;
  avatarBg: string;
}

interface ReelItem {
  id: string;
  quote: string;
  author: string;
  handle: string;
  caption: string;
  music: string;
  hugs: number;
  dailyBloom?: string;
  theme: ReelTheme;
}

const REELS: ReelItem[] = [
  {
    id: '1',
    quote: '"Your heart is a garden. Let it bloom at its own pace."',
    author: 'Willow Reed',
    handle: '@willow_reed',
    caption: 'Finding peace in the small moments of today. Be kind to yourself. #Mindfulness #SelfLove',
    music: 'Ambient Rain & Piano',
    hugs: 1247,
    dailyBloom: 'Close your eyes and take three slow, deep breaths. Imagine a warm light filling your chest.',
    theme: { bg: '#fadcd5', blob1: '#e8836b', blob2: '#ffdad2', avatarBg: '#e8836b' },
  },
  {
    id: '2',
    quote: '"Your breath is the anchor in the storm of your thoughts."',
    author: 'InnerBloom Collective',
    handle: '@innerbloom_app',
    caption: 'Take a moment to ground yourself. You are here. You are safe. #Grounding #Peace',
    music: 'Soft Strings & Rain',
    hugs: 842,
    theme: { bg: '#d4eef5', blob1: '#7e94b5', blob2: '#a8d5e2', avatarBg: '#7e94b5' },
  },
  {
    id: '3',
    quote: '"Anxiety is not a character flaw. It is your nervous system doing the best it can."',
    author: 'Sage Morning',
    handle: '@sage_morning',
    caption: 'Healing is not linear. Be patient with yourself on the hard days. #Healing #Community',
    music: 'Piano & Birdsong',
    hugs: 2103,
    dailyBloom: 'Place one hand on your heart. Feel it beating. That rhythm is your resilience.',
    theme: { bg: '#d4f0e5', blob1: '#8fcb9b', blob2: '#c5e8d5', avatarBg: '#6fae7c' },
  },
  {
    id: '4',
    quote: '"Some days getting out of bed IS the victory. Celebrate the small things."',
    author: 'Luna Paz',
    handle: '@luna_paz',
    caption: "You don't need to have it all figured out. One next step is enough. #Depression #Hope",
    music: 'Gentle Guitar',
    hugs: 3841,
    theme: { bg: '#f5e8c5', blob1: '#f5c842', blob2: '#fff0b5', avatarBg: '#e8a93b' },
  },
  {
    id: '5',
    quote: '"Rest is not a reward for productivity. Rest is a right."',
    author: 'River Stone',
    handle: '@river_stone',
    caption: "You don't have to earn rest. You already deserve it. #RestRecovery #Healing",
    music: 'Forest & Wind',
    hugs: 1568,
    dailyBloom: 'Give yourself permission to do nothing for three minutes. Just be.',
    theme: { bg: '#ead4f5', blob1: '#c9a8e2', blob2: '#f0d5ff', avatarBg: '#a985c6' },
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ReelsScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reelH = height - layout.tabBarHeight;
  const [shareTarget, setShareTarget] = useState<SharedReelPayload | null>(null);

  return (
    <View style={s.root}>
      {/* Full-screen snap feed */}
      <FlatList
        data={REELS}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <ReelCard
            reel={item}
            width={width}
            height={reelH}
            onShare={() =>
              setShareTarget({
                id: item.id,
                quote: item.quote,
                author: item.author,
                dailyBloom: item.dailyBloom,
              })
            }
          />
        )}
        pagingEnabled
        snapToInterval={reelH}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: reelH,
          offset: reelH * index,
          index,
        })}
      />

      {/* Floating top bar — absolute, sits above all reels */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { top: insets.top }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={s.topBarBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="menu" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.topBarWordmark}>InnerBloom</Text>
        <TouchableOpacity style={s.topBarBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="bell-outline" size={24} color={C.primary} />
        </TouchableOpacity>
      </Animated.View>

      <ShareReelSheet
        reel={shareTarget}
        visible={!!shareTarget}
        onClose={() => setShareTarget(null)}
      />
    </View>
  );
}

// ─── Reel card ────────────────────────────────────────────────────────────────

function ReelCard({
  reel,
  width,
  height,
  onShare,
}: {
  reel: ReelItem;
  width: number;
  height: number;
  onShare: () => void;
}) {
  const [hugged, setHugged] = useState(false);
  const [hugCount, setHugCount] = useState(reel.hugs);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTap.current < 400) {
      if (!hugged) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setHugged(true);
        setHugCount((c) => c + 1);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 900);
      }
    }
    lastTap.current = now;
  }

  function handleHugPress() {
    Haptics.selectionAsync();
    setHugged((prev) => !prev);
    setHugCount((c) => (hugged ? c - 1 : c + 1));
  }

  const { bg, blob1, blob2, avatarBg } = reel.theme;

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[s.reel, { width, height }]}
      onPress={handleDoubleTap}
    >
      {/* Background with decorative blobs */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}>
        <View style={[s.blob, {
          width: width * 0.85, height: width * 0.85,
          borderRadius: width * 0.425,
          backgroundColor: blob2,
          top: -width * 0.2, left: -width * 0.25, opacity: 0.55,
        }]} />
        <View style={[s.blob, {
          width: width * 0.65, height: width * 0.65,
          borderRadius: width * 0.325,
          backgroundColor: blob1,
          bottom: -width * 0.15, right: -width * 0.2, opacity: 0.45,
        }]} />
      </View>

      {/* Gradient-style overlay at top for header readability */}
      <View style={s.gradientTop} />
      {/* Gradient-style overlay at bottom for caption readability */}
      <View style={s.gradientBottom} />

      {/* Center: Quote */}
      <View style={s.centerContent}>
        <Animated.View entering={FadeIn.delay(100).springify()} style={s.quoteBlock}>
          <Text style={s.quoteText}>{reel.quote}</Text>
          <Text style={s.quoteAuthor}>— {reel.author}</Text>
        </Animated.View>
      </View>

      {/* Daily Bloom — absolutely positioned bottom-left so it stays clear of
          the right-side action column and sits just above the caption. */}
      {reel.dailyBloom && (
        <Animated.View
          entering={FadeIn.delay(200).springify()}
          style={s.dailyCardWrap}
        >
          <View style={s.dailyCardBlurWrap}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={50} tint="light" style={s.dailyCardInner}>
                <DailyBloomContent text={reel.dailyBloom} />
              </BlurView>
            ) : (
              <View style={[s.dailyCardInner, { backgroundColor: 'rgba(255,241,237,0.85)' }]}>
                <DailyBloomContent text={reel.dailyBloom} />
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Right sidebar */}
      <View style={s.sidebar}>
        {/* Avatar */}
        <View style={s.sidebarAvatarWrap}>
          <View style={[s.sidebarAvatar, { backgroundColor: avatarBg }]}>
            <MaterialCommunityIcons name="account" size={22} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={s.followBadge}>
            <MaterialCommunityIcons name="plus" size={10} color="#ffffff" />
          </View>
        </View>

        <SidebarBtn
          icon={hugged ? 'heart' : 'heart-outline'}
          label={formatCount(hugCount)}
          iconColor={hugged ? '#e8836b' : C.primary}
          onPress={handleHugPress}
        />
        <SidebarBtn icon="book-open-outline" label="Journal" onPress={() => {}} />
        <SidebarBtn
          icon="share-variant-outline"
          onPress={() => {
            Haptics.selectionAsync();
            onShare();
          }}
        />
      </View>

      {/* Bottom caption */}
      <View style={s.caption}>
        <Text style={s.captionHandle}>{reel.handle}</Text>
        <Text style={s.captionText} numberOfLines={2}>{reel.caption}</Text>
        <View style={s.musicTagWrap}>
          <View style={s.musicTagBlurWrap}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={40} tint="light" style={s.musicTag}>
                <MaterialCommunityIcons name="music" size={13} color={C.primary} />
                <Text style={s.musicText}>{reel.music}</Text>
              </BlurView>
            ) : (
              <View style={[s.musicTag, { backgroundColor: 'rgba(255,226,219,0.7)' }]}>
                <MaterialCommunityIcons name="music" size={13} color={C.primary} />
                <Text style={s.musicText}>{reel.music}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Double-tap heart burst */}
      {showHeart && (
        <Animated.View
          entering={ZoomIn.duration(300)}
          style={s.heartBurst}
          pointerEvents="none"
        >
          <MaterialCommunityIcons name="heart" size={80} color="#e8836b" />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DailyBloomContent({ text }: { text: string }) {
  return (
    <>
      <View style={s.dailyBadge}>
        <MaterialCommunityIcons name="shimmer" size={16} color={C.primary} />
        <Text style={s.dailyBadgeText}>Daily Bloom</Text>
      </View>
      <Text style={s.dailyText}>{text}</Text>
    </>
  );
}

function SidebarBtn({
  icon,
  label,
  iconColor = C.primary,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label?: string;
  iconColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.sidebarItem} onPress={onPress} activeOpacity={0.75}>
      <View style={s.sidebarBtnBlurWrap}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={30} tint="light" style={s.sidebarBtnInner}>
            <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
          </BlurView>
        ) : (
          <View style={[s.sidebarBtnInner, { backgroundColor: 'rgba(255,226,219,0.65)' }]}>
            <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
          </View>
        )}
      </View>
      {label && <Text style={s.sidebarLabel}>{label}</Text>}
    </TouchableOpacity>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fadcd5' },

  // Top bar
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 50,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarWordmark: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    color: C.primary,
    letterSpacing: -0.1,
  },

  // Reel
  reel: { position: 'relative', overflow: 'hidden' },
  blob: { position: 'absolute' },
  gradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 140,
    backgroundColor: 'rgba(28,14,8,0.12)',
    zIndex: 2,
  },
  gradientBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 280,
    backgroundColor: 'rgba(28,14,8,0.28)',
    zIndex: 2,
  },

  // Center quote
  centerContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 10,
  },
  quoteBlock: { alignItems: 'center', gap: 10, maxWidth: 340 },
  quoteText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 22,
    lineHeight: 32,
    color: C.onSurface,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  quoteAuthor: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.primary,
    fontStyle: 'italic',
    opacity: 0.85,
  },

  // Daily bloom card — anchored bottom-left, clear of the right action column
  // (sidebar lives at right:16 with width ~48, so we keep right:96 of breathing
  // room) and stacked above the caption block at the bottom.
  dailyCardWrap: {
    position: 'absolute',
    left: 24,
    right: 96,
    bottom: 140,
    zIndex: 15,
    maxWidth: 320,
  },
  dailyCardBlurWrap: { borderRadius: 20, overflow: 'hidden' },
  dailyCardInner: {
    padding: 18,
    gap: 8,
  },
  dailyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dailyBadgeText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 13,
    color: C.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  dailyText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: C.onSurface,
  },

  // Sidebar
  sidebar: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    zIndex: 20,
    alignItems: 'center',
    gap: 20,
  },
  sidebarAvatarWrap: { position: 'relative', marginBottom: 4 },
  sidebarAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  followBadge: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarItem: { alignItems: 'center', gap: 4 },
  sidebarBtnBlurWrap: { borderRadius: 24, overflow: 'hidden' },
  sidebarBtnInner: {
    width: 48, height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurface,
  },

  // Caption
  caption: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 72,
    paddingHorizontal: 24,
    zIndex: 20,
    gap: 6,
  },
  captionHandle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: C.onSurface,
  },
  captionText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: C.onSurfaceVariant,
  },
  musicTagWrap: {},
  musicTagBlurWrap: { borderRadius: 9999, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 4 },
  musicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  musicText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    color: C.onSurfaceVariant,
  },

  // Double-tap heart
  heartBurst: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -40,
    zIndex: 99,
  },
});
