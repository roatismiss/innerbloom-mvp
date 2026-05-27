import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReelBackground, type ReelSchemeKey, isSchemeDark } from '../../components/reels/ReelBackground';
import { ShareReelSheet, type SharedReelPayload } from '../../components/reels/ShareReelSheet';
import { layout } from '../../constants/theme';
import {
  HAS_REEL_AUDIO,
  REEL_AUDIO_VOLUME,
  getReelAudio,
  type ReelAudioTrack,
} from '../../lib/audio/reel-audio';
import { getReelVideo, type ReelVideoKey } from '../../lib/video/reel-video';
import { useAudioPrefs } from '../../store/audio-prefs';
import type { ReelAudioKey } from '../../types/database';

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
  // Drives the ambient loop that plays while the reel is on-screen. The
  // `music` field above is the *display label* for the bottom pill (curated
  // copy, can diverge from the actual loop); `audioKey` is the actual sound.
  audioKey: ReelAudioKey | null;
  // When set, renders a full-screen bundled mp4 as the reel background. The
  // video carries its own voiceover so the ambient audio loop is muted for
  // this reel; the centered quote text is also hidden (the avatar speaks it).
  // Other UI (sidebar, caption, daily bloom) keeps rendering on top.
  videoKey?: ReelVideoKey;
  hugs: number;
  dailyBloom?: string;
  bgImage?: string;
  darkBg?: boolean;
  // When set, renders a gradient + SVG art layer background. Overrides
  // `bgImage` and the legacy blob theme. Preferred path for all editorial reels.
  scheme?: ReelSchemeKey;
  theme: ReelTheme;
}

// Editorial library — 10 curated quotes, real authors, paired with a unique
// gradient + SVG art scheme. Order is an emotional arc: opens on resilience,
// moves through depression / anxiety / loneliness / addiction / burnout,
// closes on growth.
const REELS: ReelItem[] = [
  {
    id: 'bloom-voices-depression',
    quote: '', // Avatar speaks the message — quote text is hidden for video reels.
    author: 'Bloom Voices · Liezel',
    handle: '@innerbloom_voices',
    caption: 'Depression isn’t laziness — it’s your body in shutdown. The way out starts by telling your body it’s safe. #Depression #Reframe',
    music: 'Bloom Voices · Liezel',
    audioKey: null, // video has voiceover; no ambient under it
    videoKey: 'depression-isnt-laziness',
    hugs: 12480,
    theme: { bg: '#1f1410', blob1: '#3d2820', blob2: '#5c3d2e', avatarBg: '#5c3d2e' },
  },
  {
    id: 'horne-load',
    quote: '“It’s not the load that breaks you down, it’s the way you carry it.”',
    author: 'Lena Horne',
    handle: '@innerbloom_voices',
    caption: 'A reminder for heavy days. The weight is real — but so is your way of holding it. #Resilience #Stress',
    music: 'Tidewater & Strings',
    audioKey: 'relaxing_water',
    hugs: 5219,
    dailyBloom: 'Pause and notice where you are holding tension right now. Soften that one place — just for a breath.',
    scheme: 'ripples-aqua',
    theme: { bg: '#dceef5', blob1: '#a8d5e2', blob2: '#b5d5e0', avatarBg: '#6b9ec2' },
  },
  {
    id: 'solomon-noonday',
    quote: '“If you are chronically down, it is a lifelong fight to keep from sinking.”',
    author: 'Andrew Solomon, The Noonday Demon',
    handle: '@innerbloom_voices',
    caption: 'For anyone in the long fight. You are not lazy. You are not broken. You are tired in a way that needs witnessing. #Depression #Honesty',
    music: 'Cello in Slow Tide',
    audioKey: 'ambient',
    hugs: 8742,
    dailyBloom: 'If today feels heavy, do not negotiate with the heaviness. Just put one foot down, then the next.',
    scheme: 'ripples-graphite',
    theme: { bg: '#2a1d1a', blob1: '#5c4742', blob2: '#7a5e58', avatarBg: '#7a5e58' },
  },
  {
    id: 'wurtzel-prozac',
    quote: '“A human being can survive almost anything, as long as she sees the end in sight. But depression compounds daily — it is impossible to ever see the end.”',
    author: 'Elizabeth Wurtzel, Prozac Nation',
    handle: '@innerbloom_voices',
    caption: 'Naming it is not the cure. But it is the first place where company becomes possible. #Depression #Wurtzel',
    music: 'Rain on Window',
    audioKey: 'rainforest',
    hugs: 6128,
    dailyBloom: 'You don’t have to see the end. You only have to see the next ten minutes.',
    scheme: 'rain-indigo',
    theme: { bg: '#1a1a3e', blob1: '#3d2a6b', blob2: '#5c4778', avatarBg: '#5c4778' },
  },
  {
    id: 'nin-anxiety',
    quote: '“Anxiety is love’s greatest killer. It makes others feel as you might when a drowning man holds on to you.”',
    author: 'Anaïs Nin',
    handle: '@innerbloom_voices',
    caption: 'Anxiety doesn’t just hurt you — it changes how love can reach you. Naming that pattern is the start of softening it. #Anxiety #Nin',
    music: 'Breath & Cello',
    audioKey: 'asmr_anxiety',
    hugs: 4307,
    scheme: 'waves-coral',
    theme: { bg: '#ffd5c5', blob1: '#ffb3a0', blob2: '#ff8c75', avatarBg: '#c46e5a' },
  },
  {
    id: 'tolle-worry',
    quote: '“Worry pretends to be necessary but serves no useful purpose.”',
    author: 'Eckhart Tolle',
    handle: '@innerbloom_voices',
    caption: 'A short sentence to interrupt the spiral. Not advice — a pattern interrupt. #Anxiety #Mindfulness',
    music: 'Soft Bells',
    audioKey: 'ambient',
    hugs: 3621,
    dailyBloom: 'Name one worry you are carrying that has no action attached. Set it down for the next breath.',
    scheme: 'enso-mint',
    theme: { bg: '#eef6ee', blob1: '#a8cbb8', blob2: '#d4ebe0', avatarBg: '#7a9e88' },
  },
  {
    id: 'williams-alone',
    quote: '“The worst thing in life is not ending up alone. It’s ending up with people who make you feel alone.”',
    author: 'Robin Williams',
    handle: '@innerbloom_voices',
    caption: 'For anyone counting the people in the room and still feeling missing. You are allowed to want more than presence. #Loneliness #Williams',
    music: 'Distant Piano',
    audioKey: 'ambient',
    hugs: 9482,
    scheme: 'mountain-dusk',
    theme: { bg: '#1e2540', blob1: '#3a3260', blob2: '#5c4778', avatarBg: '#4a3f6b' },
  },
  {
    id: 'hari-connection',
    quote: '“The opposite of addiction is not sobriety. The opposite of addiction is connection.”',
    author: 'Johann Hari, Chasing the Scream',
    handle: '@innerbloom_voices',
    caption: 'Sobriety is a milestone. Connection is the soil. One reaches you. The other holds you. #Addiction #Hari',
    music: 'Hearth & Warm Strings',
    audioKey: 'fireplace',
    hugs: 7240,
    dailyBloom: 'Reach toward one person today — not to be helped, just to be a little less alone in the room.',
    scheme: 'network-amber',
    theme: { bg: '#fff1d4', blob1: '#ffd99b', blob2: '#e8a861', avatarBg: '#c48845' },
  },
  {
    id: 'gungor-burnout',
    quote: '“Burnout is what happens when you try to avoid being human for too long.”',
    author: 'Michael Gungor',
    handle: '@innerbloom_voices',
    caption: 'Not a weakness. A signal. The body asking for the things you postponed. #Burnout #Recovery',
    music: 'Pale Synth at Dusk',
    audioKey: 'ambient',
    hugs: 5816,
    dailyBloom: 'Pick one human thing you’ve been postponing — a meal, a call, a walk — and do it before noon.',
    scheme: 'sun-rose',
    theme: { bg: '#3d1f2e', blob1: '#7a3a4f', blob2: '#c46e7a', avatarBg: '#a85770' },
  },
  {
    id: 'drucker-productive',
    quote: '“Nothing is less productive than to make more efficient what should not be done at all.”',
    author: 'Peter Drucker',
    handle: '@innerbloom_voices',
    caption: 'Motivation isn’t about going faster. It’s about going at the right thing. Audit before you accelerate. #Motivation #Work',
    music: 'Quiet Workshop',
    audioKey: 'fireplace',
    hugs: 2987,
    scheme: 'grid-clay',
    theme: { bg: '#f5d4b8', blob1: '#cf8f6a', blob2: '#8a4a30', avatarBg: '#a8623c' },
  },
  {
    id: 'salk-work',
    quote: '“The reward for work well done is the opportunity to do more.”',
    author: 'Jonas Salk',
    handle: '@innerbloom_voices',
    caption: 'Mastery isn’t a finish line. It’s a permission slip — to be trusted with the next, harder thing. #Work #Growth',
    music: 'Garden at Dawn',
    audioKey: 'rainforest',
    hugs: 4012,
    dailyBloom: 'Look at one thing you finished this week. Let it count — for thirty seconds — before you ask what’s next.',
    scheme: 'sprout-sage',
    theme: { bg: '#eef0d4', blob1: '#c5d6a3', blob2: '#7d9e58', avatarBg: '#7d9e58' },
  },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

// Viewability config + handler need to be stable refs — FlatList throws if
// `onViewableItemsChanged` changes between renders.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 80 };

export default function ReelsScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reelH = height - layout.tabBarHeight;
  const [shareTarget, setShareTarget] = useState<SharedReelPayload | null>(null);

  // Visible reel index — drives which card's audio is playing. Init to 0
  // because the first card is on screen before any scroll event fires.
  const [visibleIndex, setVisibleIndex] = useState(0);

  // Pause everything when the user switches to another tab. The FlatList
  // stays mounted in the background, so without this guard the audio would
  // keep playing under the Dashboard / AI screens.
  const isFocused = useIsFocused();

  const reelsMuted = useAudioPrefs((s) => s.reelsMuted);
  const toggleMuted = useAudioPrefs((s) => s.toggleReelsMuted);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first && typeof first.index === 'number') {
        setVisibleIndex(first.index);
      }
    },
  ).current;

  const handleMutePress = useCallback(() => {
    Haptics.selectionAsync();
    toggleMuted();
  }, [toggleMuted]);

  return (
    <View style={s.root}>
      {/* Full-screen snap feed */}
      <FlatList
        data={REELS}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <ReelCard
            reel={item}
            width={width}
            height={reelH}
            isPlaying={index === visibleIndex && isFocused}
            muted={reelsMuted}
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
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={onViewableItemsChanged}
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
        <View style={s.topBarRight}>
          {HAS_REEL_AUDIO && (
            <TouchableOpacity
              style={s.topBarBtn}
              activeOpacity={0.7}
              onPress={handleMutePress}
              accessibilityRole="button"
              accessibilityLabel={reelsMuted ? 'Unmute reels' : 'Mute reels'}
            >
              <MaterialCommunityIcons
                name={reelsMuted ? 'volume-off' : 'volume-high'}
                size={24}
                color={C.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.topBarBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>
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
  isPlaying,
  muted,
  onShare,
}: {
  reel: ReelItem;
  width: number;
  height: number;
  isPlaying: boolean;
  muted: boolean;
  onShare: () => void;
}) {
  const [hugged, setHugged] = useState(false);
  const [hugCount, setHugCount] = useState(reel.hugs);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);
  const audioTrack = getReelAudio(reel.audioKey);
  const videoTrack = getReelVideo(reel.videoKey);
  // Video reels carry their own voiceover; the ambient pad would just fight
  // with it. We also hide the centered quote (the avatar speaks the message)
  // and the Daily Bloom card (too much overlap with a talking head).
  const isVideoReel = !!videoTrack;
  const playAmbient =
    !isVideoReel ||
    (videoTrack !== null && !videoTrack.hasVoiceover);

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
  // darkBg is derived from the scheme when present; falls back to the manual
  // flag for any legacy bgImage-based reels.
  const darkBg = reel.scheme ? isSchemeDark(reel.scheme) : !!reel.darkBg;
  const hasArtBg = !!reel.scheme || !!reel.bgImage;

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[s.reel, { width, height }]}
      onPress={handleDoubleTap}
    >
      {/* Ambient audio loop — silently mounted; only present when the track
          actually has a bundled source AND this reel isn't a video reel with
          baked-in voiceover (see lib/audio/reel-audio.ts). */}
      {playAmbient && reel.audioKey && audioTrack?.source != null && (
        <ReelAudio
          source={audioTrack.source}
          volume={REEL_AUDIO_VOLUME[reel.audioKey]}
          isPlaying={isPlaying}
          muted={muted}
        />
      )}

      {/* Background — video (mp4 + voiceover) > scheme (gradient + SVG art) >
          bgImage > legacy color blobs. Video covers everything below it. */}
      {videoTrack ? (
        <ReelVideo
          source={videoTrack.source}
          isPlaying={isPlaying}
          muted={muted}
        />
      ) : reel.scheme ? (
        <ReelBackground scheme={reel.scheme} />
      ) : reel.bgImage ? (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
          <Image
            source={{ uri: reel.bgImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        </>
      ) : (
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
      )}

      {/* Gradient-style overlay at top for header readability */}
      <View style={s.gradientTop} />
      {/* Gradient-style overlay at bottom for caption readability — stronger when over an illustrated bg */}
      <View style={[s.gradientBottom, hasArtBg && s.gradientBottomOnImage]} />
      {/* Soft center scrim — light tint to lift dark text on light schemes,
          dark tint to anchor light text on dark schemes. */}
      {hasArtBg && (
        <View style={darkBg ? s.centerVignetteOnDark : s.centerVignetteOnLight} pointerEvents="none" />
      )}

      {/* Center: Quote — hidden for video reels (the avatar speaks it). */}
      {!isVideoReel && (
        <View style={s.centerContent}>
          <Animated.View entering={FadeIn.delay(100).springify()} style={s.quoteBlock}>
            <Text
              style={[
                s.quoteText,
                hasArtBg && !darkBg && s.quoteTextOnLightImage,
                darkBg && s.quoteTextOnDark,
              ]}
            >
              {reel.quote}
            </Text>
            <Text style={[s.quoteAuthor, darkBg && s.quoteAuthorOnDark]}>— {reel.author}</Text>
          </Animated.View>
        </View>
      )}

      {/* Daily Bloom — absolutely positioned bottom-left so it stays clear of
          the right-side action column and sits just above the caption. Hidden
          on video reels (too much overlap with a talking head). */}
      {!isVideoReel && reel.dailyBloom && (
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

      {/* Bottom caption — video reels surface the voiceover attribution
          in the music pill (with a microphone icon) instead of the loop
          label, since there's no ambient pad playing. */}
      <View style={s.caption}>
        <Text style={[s.captionHandle, (darkBg || isVideoReel) && s.captionHandleOnDark]}>{reel.handle}</Text>
        <Text style={[s.captionText, (darkBg || isVideoReel) && s.captionTextOnDark]} numberOfLines={2}>{reel.caption}</Text>
        <View style={s.musicTagWrap}>
          <View style={s.musicTagBlurWrap}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={40} tint="light" style={s.musicTag}>
                <MaterialCommunityIcons
                  name={isVideoReel ? 'microphone' : 'music'}
                  size={13}
                  color={C.primary}
                />
                <Text style={s.musicText}>{videoTrack ? videoTrack.label : reel.music}</Text>
              </BlurView>
            ) : (
              <View style={[s.musicTag, { backgroundColor: 'rgba(255,226,219,0.7)' }]}>
                <MaterialCommunityIcons
                  name={isVideoReel ? 'microphone' : 'music'}
                  size={13}
                  color={C.primary}
                />
                <Text style={s.musicText}>{videoTrack ? videoTrack.label : reel.music}</Text>
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

// Full-screen video background. Same play/pause discipline as ReelAudio:
// looping is set once, play/pause flips with visibility, mute flips with the
// global pref. Voiceover is baked into the mp4 so volume isn't a knob here.
function ReelVideo({
  source,
  isPlaying,
  muted,
}: {
  source: VideoSource;
  isPlaying: boolean;
  muted: boolean;
}) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isPlaying]);

  // `cover` = TikTok behavior: video fills the screen edge-to-edge, scaling
  // to the longer of the two container dimensions. If the avatar's video is
  // 9:16 and the device is taller (iPhone 14 Pro Max ≈ 9:19.5), `cover`
  // scales to fill the height and crops a sliver off the sides — the
  // avatar's safe-zone margin gets trimmed but the subject stays centered,
  // matching how every editorial reel fills its container.
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

// Mounted only when the reel actually has a playable source. Looping is set
// once; play/pause flips with visibility; mute flips with the user pref
// without restarting the loop (so unmuting drops back into the same beat).
function ReelAudio({
  source,
  volume,
  isPlaying,
  muted,
}: {
  source: NonNullable<ReelAudioTrack['source']>;
  volume: number;
  isPlaying: boolean;
  muted: boolean;
}) {
  const player = useAudioPlayer(source);

  useEffect(() => {
    player.loop = true;
    player.volume = volume;
  }, [player, volume]);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, isPlaying]);

  return null;
}

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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  gradientBottomOnImage: {
    backgroundColor: 'rgba(28,14,8,0.5)',
    height: 340,
  },
  centerVignetteOnDark: {
    position: 'absolute',
    top: '20%', left: 0, right: 0, height: '50%',
    backgroundColor: 'rgba(28,14,8,0.28)',
    zIndex: 2,
  },
  centerVignetteOnLight: {
    position: 'absolute',
    top: '20%', left: 0, right: 0, height: '50%',
    backgroundColor: 'rgba(255,248,246,0.22)',
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
  quoteTextOnDark: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  quoteTextOnLightImage: {
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  quoteAuthorOnDark: {
    color: '#ffdad2',
    opacity: 0.95,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captionHandleOnDark: {
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captionTextOnDark: {
    color: '#f5e6e0',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
