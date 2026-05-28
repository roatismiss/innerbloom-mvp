import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { createElement, useEffect, useMemo, useRef } from 'react';
import { Image as RNImage, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getReelById } from '../../lib/reels-data';
import { getReelVideo } from '../../lib/video/reel-video';
import { ReelBackground, isSchemeDark } from './ReelBackground';

const C = {
  primary:              '#994531',
  primaryContainer:     '#e8836b',
  onPrimaryContainer:   '#641e0e',
  primaryFixed:         '#ffdad2',
  surfaceContainer:     '#ffe9e4',
  surfaceContainerLow:  '#fff1ed',
  outline:              '#88726d',
  outlineVariant:       '#dbc1bb',
  onSurface:            '#281814',
  onSurfaceVariant:     '#55433e',
} as const;

const PREVIEW_W = 180;
const PREVIEW_H = 240; // 3:4 — feels tight in a chat bubble while still legible

// Instagram-style reel preview card for a shared reel inside a conversation.
// Renders the actual reel background (poster frame from the bundled video, or
// the gradient/SVG scheme for non-video reels) plus a play badge and a 2-line
// caption strip at the bottom. Tap routes the user to /(main)/reels?id=<id>
// so the reels screen scrolls straight to this reel.
export function ReelPreviewCard({
  reelId,
  onPress,
}: {
  reelId: string;
  onPress: () => void;
}) {
  const reel = getReelById(reelId);

  if (!reel) {
    // Reel was removed from the library since the message was sent. Show a
    // muted fallback rather than blowing up the bubble.
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={s.fallback}>
        <View style={s.fallbackHeader}>
          <MaterialCommunityIcons name="play-circle-outline" size={15} color={C.primary} />
          <Text style={s.fallbackLabel}>BLOOM REEL</Text>
        </View>
        <Text style={s.fallbackText}>This reel is no longer available.</Text>
      </TouchableOpacity>
    );
  }

  const videoTrack = getReelVideo(reel.videoKey);
  const darkBg = reel.scheme ? isSchemeDark(reel.scheme) : !!reel.darkBg;
  const text = reel.caption.trim() || reel.quote.trim();

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={s.wrap}>
      {/* Background layer — video poster frame OR scheme art OR theme color */}
      <View style={s.bgLayer}>
        {videoTrack ? (
          <PosterVideo source={videoTrack.source} />
        ) : reel.scheme ? (
          <ReelBackground scheme={reel.scheme} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: reel.theme.bg }]} />
        )}
        {/* Subtle vignette so the play badge + caption stay readable on any bg */}
        <View style={s.scrim} pointerEvents="none" />
      </View>

      {/* Play badge — centered */}
      <View style={s.playBadge} pointerEvents="none">
        <MaterialCommunityIcons name="play" size={22} color="#ffffff" />
      </View>

      {/* Bottom caption strip */}
      <View style={s.captionStrip} pointerEvents="none">
        <View style={s.headerRow}>
          <MaterialCommunityIcons name="play-circle-outline" size={11} color="#ffffff" />
          <Text style={s.headerLabel}>BLOOM REEL</Text>
        </View>
        <Text style={s.captionText} numberOfLines={2}>{text}</Text>
        {reel.author && (
          <Text style={s.authorText} numberOfLines={1}>— {reel.author}</Text>
        )}
      </View>

      {/* Top-right hint badge */}
      <View style={[s.themeBadge, darkBg && s.themeBadgeOnDark]} pointerEvents="none">
        <MaterialCommunityIcons
          name="video-outline"
          size={12}
          color={darkBg ? '#ffffff' : C.primary}
        />
      </View>
    </TouchableOpacity>
  );
}

// Autoplay muted, looped — same pattern Instagram / TikTok use for inline reel
// previews. Plays as soon as the card mounts so the user always sees motion,
// not a black box waiting for a poster frame that some platforms never paint.
//
// Native uses expo-video; web drops down to a raw HTML5 <video> because
// expo-video's web build does not emit `playsinline` on the underlying element,
// which makes mobile browsers refuse to render small embedded clips.
function PosterVideo({ source }: { source: VideoSource }) {
  if (Platform.OS === 'web') return <WebPosterVideo source={source} />;
  return <NativePosterVideo source={source} />;
}

function NativePosterVideo({ source }: { source: VideoSource }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

function WebPosterVideo({ source }: { source: VideoSource }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  // Normalise the require()'d asset to a URL string that <video src> understands.
  const src = useMemo(() => {
    if (!source) return '';
    if (typeof source === 'string') return source;
    if (typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
      return source.uri;
    }
    const resolved = RNImage.resolveAssetSource(source as never);
    return resolved?.uri ?? '';
  }, [source]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const playResult = v.play();
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch(() => {});
    }
  }, [src]);

  return createElement('video', {
    ref,
    src,
    loop: true,
    autoPlay: true,
    muted: true,
    playsInline: true,
    'webkit-playsinline': 'true',
    controls: false,
    disablePictureInPicture: true,
    controlsList: 'nodownload nofullscreen noremoteplayback',
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      pointerEvents: 'none',
      display: 'block',
      background: '#000',
    },
  });
}

const s = StyleSheet.create({
  wrap: {
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  bgLayer: { ...StyleSheet.absoluteFill },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,10,8,0.18)',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 52,
    height: 52,
    marginLeft: -26,
    marginTop: -26,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  captionStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(20,10,8,0.55)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 9,
    letterSpacing: 1,
    color: '#ffffff',
    opacity: 0.9,
  },
  captionText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: '#ffffff',
  },
  authorText: {
    fontFamily: 'NunitoSans_400Regular',
    fontStyle: 'italic',
    fontSize: 10,
    lineHeight: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  themeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBadgeOnDark: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Fallback for missing reel
  fallback: {
    width: PREVIEW_W,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fallbackLabel: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    color: C.primary,
  },
  fallbackText: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: C.onSurfaceVariant,
  },
});
