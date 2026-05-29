import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleProp, View, ViewStyle } from 'react-native';

// ─── Bloom preset avatars ─────────────────────────────────────────────────────
// Stored in DB as 'bloom:1' … 'bloom:6'. Decoded here into icon+color combos.
export const BLOOM_PRESETS = [
  { key: 'bloom:1', icon: 'flower-tulip-outline' as const, bg: '#ffdad2', fg: '#994531' },
  { key: 'bloom:2', icon: 'leaf'                  as const, bg: '#90f2fc', fg: '#006f77' },
  { key: 'bloom:3', icon: 'heart-outline'          as const, bg: '#ffe2db', fg: '#a8315c' },
  { key: 'bloom:4', icon: 'white-balance-sunny'    as const, bg: '#e8836b', fg: '#641e0e' },
  { key: 'bloom:5', icon: 'star-four-points'       as const, bg: '#fff1ed', fg: '#55433e' },
  { key: 'bloom:6', icon: 'water-outline'          as const, bg: '#ffe9e4', fg: '#994531' },
] as const;

type PresetKey = (typeof BLOOM_PRESETS)[number]['key'];
const PRESET_MAP = Object.fromEntries(
  BLOOM_PRESETS.map((p) => [p.key, p]),
) as Record<PresetKey, (typeof BLOOM_PRESETS)[number]>;

// ─── Component ────────────────────────────────────────────────────────────────

interface BloomAvatarProps {
  uri: string | null | undefined;
  size: number;
  style?: StyleProp<ViewStyle>;
}

export function BloomAvatar({ uri, size, style }: BloomAvatarProps) {
  const radius = size / 2;
  const iconSize = Math.round(size * 0.46);

  if (uri?.startsWith('bloom:')) {
    const p = PRESET_MAP[uri as PresetKey] ?? BLOOM_PRESETS[0];
    return (
      <View
        style={[
          { width: size, height: size, borderRadius: radius, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
      >
        <MaterialCommunityIcons name={p.icon} size={iconSize} color={p.fg} />
      </View>
    );
  }

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: radius }, style] as object}
        contentFit="cover"
      />
    );
  }

  // Null / undefined — generic placeholder
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: radius, backgroundColor: '#ffdad2', alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <MaterialCommunityIcons name="head-heart-outline" size={iconSize} color="#994531" />
    </View>
  );
}
