import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useIsFocused, useLocalSearchParams } from 'expo-router';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image as RNImage,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReelBackground, isSchemeDark } from '../../components/reels/ReelBackground';
import { ShareReelSheet, type SharedReelPayload } from '../../components/reels/ShareReelSheet';
import {
  HAS_REEL_AUDIO,
  REEL_AUDIO_VOLUME,
  getReelAudio,
  type ReelAudioTrack,
} from '../../lib/audio/reel-audio';
import { REELS, getReelIndexById, type ReelItem } from '../../lib/reels-data';
import { getReelVideo } from '../../lib/video/reel-video';
import { useAudioPrefs } from '../../store/audio-prefs';

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

// ─── Screen ──────────────────────────────────────────────────────────────────

// Viewability config + handler need to be stable refs — FlatList throws if
// `onViewableItemsChanged` changes between renders.
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 80 };

export default function ReelsScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarH = 14 + 50 + Math.max(insets.bottom, 16);
  // onLayout gives the container height; with the floating tab bar the container
  // is full window height, so reelH correctly fills edge-to-edge.
  const [reelH, setReelH] = useState(0);
  const params = useLocalSearchParams<{ id?: string }>();
  const deepLinkedId = typeof params.id === 'string' ? params.id : undefined;
  const initialIndex = deepLinkedId ? Math.max(0, getReelIndexById(deepLinkedId)) : 0;

  const [shareTarget, setShareTarget] = useState<SharedReelPayload | null>(null);
  const [visibleIndex, setVisibleIndex] = useState(initialIndex);
  // audioIndex lags visibleIndex during a swipe — it only catches up once the
  // scroll has snapped to its final reel. Drives audio (ambient loop +
  // voiceover unmute) so sound never starts mid-gesture.
  // On web, browsers block autoplay audio without a prior user gesture, so we
  // start at -1 (no audio) and arm it only after the first scroll snap.
  const [audioIndex, setAudioIndex] = useState(Platform.OS === 'web' ? -1 : initialIndex);
  const [showSaved, setShowSaved] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // When set, replaces the canonical REELS order with a randomized one. Stays
  // for the lifetime of the screen; tapping shuffle again reshuffles.
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const listRef = useRef<any>(null);
  const isFocused = useIsFocused();

  // When a deep link arrives (from a shared reel in chat), jump to that reel
  // once the list has mounted. Re-runs only if the linked id actually changes.
  useEffect(() => {
    if (!deepLinkedId) return;
    const idx = getReelIndexById(deepLinkedId);
    if (idx < 0) return;
    setShowSaved(false);
    setVisibleIndex(idx);
    setAudioIndex(idx);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex?.({ index: idx, animated: false });
    });
  }, [deepLinkedId]);

  // Full-screen immersive mode — white status bar icons over reel content, just
  // like Instagram Reels. On Android we also need to set translucent + transparent
  // background so the window extends behind the status bar (the app.json config
  // sets this at build time; the imperative calls below handle runtime toggling
  // in Expo Go / development builds before a full rebuild is done).
  useEffect(() => {
    if (isFocused) {
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent', true);
        StatusBar.setTranslucent(true);
      }
    } else {
      StatusBar.setBarStyle('dark-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#fff8f6', true);
        StatusBar.setTranslucent(false);
      }
    }
  }, [isFocused]);

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

  // Audio only "arms" once the scroll has fully snapped to a reel — this is
  // what stops the next reel's voiceover / ambient loop from bleeding in
  // mid-swipe (TikTok / Instagram Reels behavior). Compute the index from the
  // settled offset rather than relying on viewability (which fires at 80%).
  // On web this is also the first user gesture, which unblocks browser autoplay.
  //
  // We handle BOTH onMomentumScrollEnd (fast fling) and onScrollEndDrag (slow
  // deliberate swipe) because pagingEnabled scroll can settle without momentum
  // when the user lifts their finger slowly — in that case onMomentumScrollEnd
  // never fires and audioIndex would stay stuck at the previous reel.
  const handleScrollSnap = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (reelH <= 0) return;
      const idx = Math.round(e.nativeEvent.contentOffset.y / reelH);
      setAudioIndex(idx);
    },
    [reelH],
  );

  // Web only: arm audio on the first tap (a real click/touch event satisfies
  // the browser autoplay policy; scroll events do not). Once armed, stays armed.
  // On web, scroll-end events are unreliable with CSS-snapped FlatList.
  // Mirror visibleIndex once audio is armed (audioIndex >= 0).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setAudioIndex((cur) => (cur < 0 ? cur : visibleIndex));
  }, [visibleIndex]);

  const handleArmAudio = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setAudioIndex((cur) => (cur < 0 ? visibleIndex : cur));
  }, [visibleIndex]);

  const handleMutePress = useCallback(() => {
    Haptics.selectionAsync();
    toggleMuted();
  }, [toggleMuted]);

  const handleToggleSave = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSavedView = useCallback(() => {
    Haptics.selectionAsync();
    setShowSaved((prev) => !prev);
    setVisibleIndex(0);
    setAudioIndex(0);
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, []);

  const handleShuffle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShuffleSeed((s) => s + 1);
    setVisibleIndex(0);
    setAudioIndex(0);
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, []);

  // Reshuffle only when the seed changes — pure REELS order while seed is 0,
  // a stable randomized order otherwise. Memo so React doesn't re-randomize on
  // every render (which would crash the FlatList's keyExtractor).
  const orderedReels = useMemo<ReelItem[]>(() => {
    if (shuffleSeed === 0) return REELS;
    const arr = REELS.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [shuffleSeed]);

  const feedData = showSaved ? orderedReels.filter((r) => savedIds.has(r.id)) : orderedReels;

  // Single ambient audio player — lives at screen level so only one AudioContext
  // exists across all rendered reel cards. Multiple AudioContexts created at
  // initial render (before user gesture) stay suspended on web/PWA even after
  // the user activates the page, causing reel 2+ to stay silent.
  // key={audioIndex} recreates the player when the snap settles; by that point
  // the user has already tapped (arming the context via onArmAudio on web) or
  // the native player doesn't need a gesture at all.
  const activeReel = audioIndex >= 0 && audioIndex < feedData.length ? feedData[audioIndex] : null;
  const activeAudioKey = activeReel?.audioKey ?? null;
  const activeAudioTrack = activeAudioKey ? getReelAudio(activeAudioKey) : null;
  const activeVideoTrack = activeReel?.videoKey ? getReelVideo(activeReel.videoKey) : null;
  const activeAudioVolume = activeAudioKey
    ? REEL_AUDIO_VOLUME[activeAudioKey] * (activeVideoTrack?.hasVoiceover ? 0.15 : 1)
    : 1;

  return (
    <View style={s.root} onLayout={(e) => setReelH(e.nativeEvent.layout.height)}>
      {/* Full-screen snap feed */}
      {feedData.length === 0 && showSaved ? (
        <View style={s.emptyState}>
          <MaterialCommunityIcons name="bookmark-outline" size={48} color={C.primaryContainer} />
          <Text style={s.emptyTitle}>No saved reels yet</Text>
          <Text style={s.emptySubtitle}>Tap the bookmark on any reel to save it here.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={feedData}
          keyExtractor={(r) => r.id}
          renderItem={({ item, index }) => (
            <ReelCard
              reel={item}
              width={width}
              height={reelH}
              tabBarH={tabBarH}
              isPlaying={index === visibleIndex && isFocused}
              audioActive={index === visibleIndex && isFocused && audioIndex >= 0}
              muted={reelsMuted}
              isSaved={savedIds.has(item.id)}
              onToggleSave={() => handleToggleSave(item.id)}
              onArmAudio={handleArmAudio}
              onShare={() =>
                setShareTarget({
                  id: item.id,
                  reelId: item.id,
                  caption: item.caption,
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
          onMomentumScrollEnd={handleScrollSnap}
          onScrollEndDrag={handleScrollSnap}
          // Keep current ± 2 reels mounted so expo-video pre-initialises
          // the next player before the user swipes to it (Instagram pattern).
          windowSize={5}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          // Don't unmount off-screen players — avoids audio/video restart
          // when the user swipes back to a previously-viewed reel.
          removeClippedSubviews={false}
        />
      )}

      {/* Single ambient audio player for all reels — see comment above feedData. */}
      {activeAudioTrack?.source && (
        <ReelAudio
          key={audioIndex}
          source={activeAudioTrack.source}
          volume={activeAudioVolume}
          isPlaying={audioIndex >= 0 && isFocused}
          muted={reelsMuted}
        />
      )}

      {/* Floating top bar — absolute, sits above all reels */}
      <Animated.View
        entering={FadeInUp.springify()}
        style={[s.topBar, { top: insets.top }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={s.topBarSavedBtn} activeOpacity={0.7} onPress={handleToggleSavedView}>
          <MaterialCommunityIcons
            name={showSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={showSaved ? C.onPrimaryContainer : C.primary}
          />
          <Text style={[s.topBarSavedLabel, showSaved && s.topBarSavedLabelActive]}>
            Saved
          </Text>
        </TouchableOpacity>
        <View style={s.topBarRight}>
          <TouchableOpacity
            style={s.topBarBtn}
            activeOpacity={0.7}
            onPress={handleShuffle}
            accessibilityRole="button"
            accessibilityLabel="Shuffle reels"
          >
            <MaterialCommunityIcons
              name="shuffle-variant"
              size={22}
              color={shuffleSeed > 0 ? C.primaryContainer : C.primary}
            />
          </TouchableOpacity>
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
  tabBarH,
  isPlaying,
  audioActive,
  muted,
  isSaved,
  onToggleSave,
  onArmAudio,
  onShare,
}: {
  reel: ReelItem;
  width: number;
  height: number;
  tabBarH: number;
  isPlaying: boolean;
  // True only after the scroll has snapped to this reel. Drives audio so
  // sound never leaks in mid-swipe (the visible reel can still play silently).
  audioActive: boolean;
  muted: boolean;
  isSaved: boolean;
  onToggleSave: () => void;
  // Web only: called on first tap to satisfy browser autoplay policy.
  onArmAudio: () => void;
  onShare: () => void;
}) {
  const [hugged, setHugged] = useState(false);
  const [hugCount, setHugCount] = useState(reel.hugs);
  const [showHeart, setShowHeart] = useState(false);
  const [paused, setPaused] = useState(false);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectivePlaying = isPlaying && !paused;
  // Mute the video while it isn't the snapped reel — keeps the visual rolling
  // during the swipe but silences any baked-in voiceover until the gesture lands.
  const effectiveMuted = muted || !audioActive;
  const videoTrack = getReelVideo(reel.videoKey);
  const isVideoReel = !!videoTrack;

  function handleTap() {
    onArmAudio();
    const now = Date.now();
    if (now - lastTap.current < 350) {
      // Double tap — hug
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = null;
      lastTap.current = 0;
      if (!hugged) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setHugged(true);
        setHugCount((c) => c + 1);
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 900);
      }
    } else {
      // Potential single tap — wait to confirm it's not a double tap
      lastTap.current = now;
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        Haptics.selectionAsync();
        setPaused((p) => !p);
      }, 200);
    }
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
      onPress={handleTap}
    >
      {/* Background — video (mp4 + voiceover) > scheme (gradient + SVG art) >
          bgImage > legacy color blobs. Video covers everything below it.
          Video keeps playing visually during the swipe but is muted until
          audioActive flips, so the voiceover doesn't bleed across the snap. */}
      {videoTrack ? (
        <ReelVideo
          source={videoTrack.source}
          isPlaying={effectivePlaying}
          muted={effectiveMuted}
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
          style={[s.dailyCardWrap, { bottom: 140 + tabBarH }]}
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
      <View style={[s.sidebar, { bottom: 120 + tabBarH }]}>
        {/* Avatar */}
        <View style={s.sidebarAvatarWrap}>
          <View style={[s.sidebarAvatar, { backgroundColor: avatarBg }]}>
            <MaterialCommunityIcons name="head-heart-outline" size={22} color="rgba(255,255,255,0.95)" />
          </View>
        </View>

        <SidebarBtn
          icon={hugged ? 'heart' : 'heart-outline'}
          label={formatCount(hugCount)}
          iconColor={hugged ? '#e8836b' : C.primary}
          onPress={handleHugPress}
        />
        <SidebarBtn
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          label="Save"
          iconColor={isSaved ? C.primaryContainer : C.primary}
          onPress={onToggleSave}
        />
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
      <View style={[s.caption, { bottom: 24 + tabBarH }]}>
        <Text style={[s.captionHandle, darkBg && s.captionHandleOnDark]}>{reel.handle}</Text>
        <Text style={[s.captionText, darkBg && s.captionTextOnDark]} numberOfLines={2}>{reel.caption}</Text>
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

// Full-screen video background. Two implementations because the right
// behaviour differs sharply between native (expo-video does it well) and
// iOS Safari (expo-video's web build does NOT set `playsinline` on the
// underlying <video> element, which makes iOS hijack the first tap and
// open the fullscreen native player). On web we drop down to a raw HTML5
// <video> with the exact attributes iOS needs.
function ReelVideo(props: {
  source: VideoSource;
  isPlaying: boolean;
  muted: boolean;
}) {
  if (Platform.OS === 'web') {
    return <WebReelVideo {...props} />;
  }
  return <NativeReelVideo {...props} />;
}

function NativeReelVideo({
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

  // Single combined effect: set muted THEN call play/pause so the audio
  // track is always activated with the correct state. Two separate effects
  // caused player.muted = false to run without a subsequent play() call,
  // which left the audio track silent on Android/iOS after mute→unmute.
  useEffect(() => {
    player.muted = muted;
    if (isPlaying) player.play();
    else player.pause();
  }, [player, isPlaying, muted]);

  // `contain` keeps the 9:16 source intact — on a phone taller than 9:16
  // (iPhone 14 Pro Max ≈ 9:19.5) you get thin dark bars top/bottom instead
  // of cropping the avatar. Backdrop is black to match TikTok-style
  // letterboxing when a clip doesn't exactly fit the device aspect.
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
    </View>
  );
}

// Web-only: raw HTML5 <video> with every iOS Safari attribute spelled out.
// `playsinline` + `webkit-playsinline` together prevent the native fullscreen
// takeover even on older iOS builds; `autoplay` + `muted` are the magic combo
// that lets Safari start the video without a user gesture (we honour the
// user's mute preference reactively below). `object-fit: contain` keeps the
// 9:16 source intact instead of cropping it to whatever shape the viewport is.
function WebReelVideo({
  source,
  isPlaying,
  muted,
}: {
  source: VideoSource;
  isPlaying: boolean;
  muted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // `source` is the result of require('…mp4'). On web Metro typically returns
  // either a URL string or an object with `uri`. resolveAssetSource normalises
  // every shape (number / string / { uri }) to a URL string.
  const src = useMemo(() => {
    if (!source) return '';
    if (typeof source === 'string') return source;
    if (typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
      return source.uri;
    }
    const resolved = RNImage.resolveAssetSource(source as never);
    return resolved?.uri ?? '';
  }, [source]);

  // Same combined pattern as NativeReelVideo — muted then play/pause together.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (isPlaying) {
      const playResult = v.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {});
      }
    } else {
      v.pause();
    }
  }, [isPlaying, muted]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
      {createElement('video', {
        ref: videoRef,
        src,
        loop: true,
        autoPlay: true,
        muted,
        playsInline: true,
        'webkit-playsinline': 'true',
        controls: false,
        disablePictureInPicture: true,
        controlsList: 'nodownload nofullscreen noremoteplayback',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          display: 'block',
          background: '#000',
        },
      })}
    </View>
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
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    player.loop = true;
    player.volume = volume;
  }, [player, volume]);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (!isPlaying) {
      player.pause();
      return;
    }
    player.loop = true;
    const t = setTimeout(() => player.play(), 1000);
    return () => clearTimeout(t);
  }, [player, isPlaying]);

  // Belt-and-suspenders: if the native loop flag didn't trigger, restart manually.
  useEffect(() => {
    if (status.didJustFinish && isPlaying) {
      player.seekTo(0);
      player.play();
    }
  }, [status.didJustFinish]);

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
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
          </BlurView>
        ) : (
          <View style={[s.sidebarBtnInner, { backgroundColor: 'rgba(255,226,219,0.65)' }]}>
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
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

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
    backgroundColor: '#fff8f6',
  },
  emptyTitle: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 20,
    color: '#994531',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#55433e',
    textAlign: 'center',
  },

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
  topBarSavedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(232,131,107,0.12)',
  },
  topBarSavedLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    color: C.primary,
  },
  topBarSavedLabelActive: {
    color: C.onPrimaryContainer,
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
  // (sidebar lives at right:16 with width ~48, so we keep right:96 of breathing room)
  // and stacked above the caption block at the bottom.
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

  sidebar: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    zIndex: 20,
    alignItems: 'center',
    gap: 12,
  },
  sidebarAvatarWrap: { position: 'relative', marginBottom: 4 },
  sidebarAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  sidebarItem: { alignItems: 'center', gap: 3 },
  sidebarBtnBlurWrap: { borderRadius: 20, overflow: 'hidden' },
  sidebarBtnInner: {
    width: 38, height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: C.onSurface,
  },

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
    color: C.onPrimaryContainer,
  },
  captionText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: C.onPrimaryContainer,
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
