import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

// ─── Scheme registry ──────────────────────────────────────────────────────────
// Each editorial reel maps to one scheme. The scheme defines a base gradient
// plus a low-opacity vector "art layer" — never an emoji, never an icon —
// chosen to evoke the quote's emotional register without being literal.

export type ReelSchemeKey =
  | 'rain-indigo'       // chronic depression — descending rain
  | 'ripples-graphite'  // long-haul depression — concentric ripples
  | 'waves-coral'       // anxiety / drowning — flowing horizontal waves
  | 'enso-mint'         // anxiety / letting-go — single zen circle
  | 'network-amber'     // connection / addiction antidote — node graph
  | 'mountain-dusk'     // loneliness — layered horizon at dusk
  | 'grid-clay'         // motivation / craft — faint blueprint grid
  | 'ripples-aqua'      // stress / carrying weight — water ripples
  | 'sun-rose'          // burnout — large setting sun
  | 'sprout-sage';      // work / growth — small botanical sprout

type ArtType = 'rain' | 'ripples' | 'waves' | 'enso' | 'network' | 'mountain' | 'grid' | 'sun' | 'sprout';

interface SchemeDef {
  gradient: readonly [string, string, string];
  art: ArtType;
  artColor: string;
  artOpacity: number;
  darkBg: boolean;
}

const SCHEMES: Record<ReelSchemeKey, SchemeDef> = {
  'rain-indigo': {
    gradient: ['#1a1a3e', '#2d1b54', '#3d2a6b'] as const,
    art: 'rain', artColor: '#c4c0e8', artOpacity: 0.28, darkBg: true,
  },
  'ripples-graphite': {
    gradient: ['#2a1d1a', '#3d2823', '#5c3a30'] as const,
    art: 'ripples', artColor: '#e8b8a8', artOpacity: 0.22, darkBg: true,
  },
  'waves-coral': {
    gradient: ['#ffd5c5', '#ffb3a0', '#ff8c75'] as const,
    art: 'waves', artColor: '#641e0e', artOpacity: 0.16, darkBg: false,
  },
  'enso-mint': {
    gradient: ['#eef6ee', '#d4ebe0', '#a8cbb8'] as const,
    art: 'enso', artColor: '#1f3d2e', artOpacity: 0.32, darkBg: false,
  },
  'network-amber': {
    gradient: ['#fff1d4', '#ffd99b', '#e8a861'] as const,
    art: 'network', artColor: '#5a3208', artOpacity: 0.3, darkBg: false,
  },
  'mountain-dusk': {
    gradient: ['#1e2540', '#3a3260', '#5c4778'] as const,
    art: 'mountain', artColor: '#0d0f1f', artOpacity: 0.6, darkBg: true,
  },
  'grid-clay': {
    gradient: ['#f5d4b8', '#cf8f6a', '#8a4a30'] as const,
    art: 'grid', artColor: '#2a0d04', artOpacity: 0.18, darkBg: true,
  },
  'ripples-aqua': {
    gradient: ['#dceef5', '#a8d5e2', '#6b9ec2'] as const,
    art: 'ripples', artColor: '#1a3a5c', artOpacity: 0.22, darkBg: false,
  },
  'sun-rose': {
    gradient: ['#3d1f2e', '#7a3a4f', '#c46e7a'] as const,
    art: 'sun', artColor: '#ffd9b8', artOpacity: 0.5, darkBg: true,
  },
  'sprout-sage': {
    gradient: ['#eef0d4', '#c5d6a3', '#7d9e58'] as const,
    art: 'sprout', artColor: '#1f3308', artOpacity: 0.32, darkBg: false,
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function ReelBackground({ scheme }: { scheme: ReelSchemeKey }) {
  const { width, height } = useWindowDimensions();
  const def = SCHEMES[scheme];

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={def.gradient}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
      />
      <ArtLayer
        art={def.art}
        color={def.artColor}
        opacity={def.artOpacity}
        width={width}
        height={height}
      />
    </View>
  );
}

export function isSchemeDark(scheme: ReelSchemeKey): boolean {
  return SCHEMES[scheme].darkBg;
}

// ─── Art layers ───────────────────────────────────────────────────────────────

function ArtLayer({
  art, color, opacity, width, height,
}: {
  art: ArtType; color: string; opacity: number; width: number; height: number;
}) {
  switch (art) {
    case 'rain': return <RainArt w={width} h={height} c={color} o={opacity} />;
    case 'ripples': return <RipplesArt w={width} h={height} c={color} o={opacity} />;
    case 'waves': return <WavesArt w={width} h={height} c={color} o={opacity} />;
    case 'enso': return <EnsoArt w={width} h={height} c={color} o={opacity} />;
    case 'network': return <NetworkArt w={width} h={height} c={color} o={opacity} />;
    case 'mountain': return <MountainArt w={width} h={height} c={color} o={opacity} />;
    case 'grid': return <GridArt w={width} h={height} c={color} o={opacity} />;
    case 'sun': return <SunArt w={width} h={height} c={color} o={opacity} />;
    case 'sprout': return <SproutArt w={width} h={height} c={color} o={opacity} />;
  }
}

interface ArtProps { w: number; h: number; c: string; o: number; }

function RainArt({ w, h, c, o }: ArtProps) {
  const count = 44;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G opacity={o}>
        {Array.from({ length: count }).map((_, i) => {
          const x = ((i * 73) % 100) / 100 * w;
          const yStart = ((i * 37) % 100) / 100 * h * 0.7;
          const len = 50 + (i % 5) * 24;
          return (
            <Line
              key={i}
              x1={x} y1={yStart}
              x2={x - 14} y2={yStart + len}
              stroke={c}
              strokeWidth={1.3}
              strokeLinecap="round"
              opacity={0.6 + (i % 3) * 0.13}
            />
          );
        })}
      </G>
    </Svg>
  );
}

function RipplesArt({ w, h, c, o }: ArtProps) {
  const cx = w / 2;
  const cy = h * 0.5;
  const rings = [70, 150, 240, 340, 460, 600, 760];
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G opacity={o}>
        {rings.map((r, i) => (
          <Circle
            key={r}
            cx={cx} cy={cy} r={r}
            stroke={c}
            strokeWidth={1.6}
            fill="none"
            opacity={1 - i * 0.11}
          />
        ))}
      </G>
    </Svg>
  );
}

function WavesArt({ w, h, c, o }: ArtProps) {
  const yRatios = [0.12, 0.28, 0.44, 0.62, 0.78, 0.92];
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G opacity={o}>
        {yRatios.map((yr, i) => {
          const y = h * yr;
          const amp = 24 + (i % 2) * 12;
          const phase = (i % 2) * (w / 4);
          const d = `M ${-20} ${y} Q ${w/4 + phase} ${y - amp} ${w/2} ${y} T ${w + 20} ${y}`;
          return <Path key={i} d={d} stroke={c} strokeWidth={1.5} fill="none" />;
        })}
      </G>
    </Svg>
  );
}

function EnsoArt({ w, h, c, o }: ArtProps) {
  const cx = w / 2;
  const cy = h * 0.42;
  const r = Math.min(w, h) * 0.32;
  // Open arc — 330° sweep, leaving a brush gap
  const startA = 30;
  const endA = 340;
  const start = polarToCart(cx, cy, r, startA);
  const end = polarToCart(cx, cy, r, endA);
  const largeArc = endA - startA <= 180 ? '0' : '1';
  const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G opacity={o}>
        <Path d={d} stroke={c} strokeWidth={4} fill="none" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function NetworkArt({ w, h, c, o }: ArtProps) {
  const nodes = [
    { x: 0.18, y: 0.22 }, { x: 0.48, y: 0.14 }, { x: 0.78, y: 0.26 },
    { x: 0.32, y: 0.42 }, { x: 0.62, y: 0.48 },
    { x: 0.14, y: 0.66 }, { x: 0.5, y: 0.72 }, { x: 0.82, y: 0.6 },
    { x: 0.3, y: 0.88 }, { x: 0.7, y: 0.9 },
  ];
  const edges: [number, number][] = [
    [0,1],[1,2],[0,3],[1,3],[1,4],[2,4],[3,4],
    [3,5],[3,6],[4,6],[4,7],[5,6],[6,7],[5,8],[6,8],[6,9],[7,9],
  ];
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G opacity={o}>
        {edges.map(([a, b], i) => (
          <Line
            key={`e${i}`}
            x1={nodes[a].x * w} y1={nodes[a].y * h}
            x2={nodes[b].x * w} y2={nodes[b].y * h}
            stroke={c} strokeWidth={1}
          />
        ))}
        {nodes.map((n, i) => (
          <Circle key={`n${i}`} cx={n.x * w} cy={n.y * h} r={4.5} fill={c} />
        ))}
      </G>
    </Svg>
  );
}

function MountainArt({ w, h, c, o }: ArtProps) {
  const horizon = h * 0.66;
  const back = `M0 ${horizon + 80}
    L${w*0.12} ${horizon - 40}
    L${w*0.28} ${horizon + 30}
    L${w*0.48} ${horizon - 90}
    L${w*0.68} ${horizon - 10}
    L${w*0.84} ${horizon - 60}
    L${w} ${horizon + 40}
    L${w} ${h} L0 ${h} Z`;
  const mid = `M0 ${horizon + 160}
    L${w*0.18} ${horizon + 40}
    L${w*0.36} ${horizon + 90}
    L${w*0.56} ${horizon + 10}
    L${w*0.74} ${horizon + 70}
    L${w} ${horizon + 130}
    L${w} ${h} L0 ${h} Z`;
  const front = `M0 ${horizon + 240}
    L${w*0.28} ${horizon + 150}
    L${w*0.52} ${horizon + 210}
    L${w*0.78} ${horizon + 140}
    L${w} ${horizon + 220}
    L${w} ${h} L0 ${h} Z`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={back} fill={c} opacity={o * 0.55} />
      <Path d={mid} fill={c} opacity={o * 0.75} />
      <Path d={front} fill={c} opacity={o} />
    </Svg>
  );
}

function GridArt({ w, h, c, o }: ArtProps) {
  const step = 44;
  const cols = Math.ceil(w / step) + 1;
  const rows = Math.ceil(h / step) + 1;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G opacity={o}>
        {Array.from({ length: cols }).map((_, i) => (
          <Line key={`v${i}`} x1={i*step} y1={0} x2={i*step} y2={h} stroke={c} strokeWidth={0.8} />
        ))}
        {Array.from({ length: rows }).map((_, i) => (
          <Line key={`h${i}`} x1={0} y1={i*step} x2={w} y2={i*step} stroke={c} strokeWidth={0.8} />
        ))}
      </G>
    </Svg>
  );
}

function SunArt({ w, h, c, o }: ArtProps) {
  const cx = w / 2;
  const cy = h * 0.58;
  const r = Math.min(w, h) * 0.42;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle cx={cx} cy={cy} r={r} fill={c} opacity={o * 0.5} />
      <Circle cx={cx} cy={cy} r={r * 0.72} fill={c} opacity={o * 0.4} />
      <Circle cx={cx} cy={cy} r={r * 0.45} fill={c} opacity={o * 0.55} />
    </Svg>
  );
}

function SproutArt({ w, h, c, o }: ArtProps) {
  // A small sprout in the lower-right, like a botanical illustration.
  const baseX = w * 0.78;
  const baseY = h * 0.92;
  const stem = `M${baseX} ${baseY} Q${baseX - 24} ${baseY - 90} ${baseX - 36} ${baseY - 200} Q${baseX - 32} ${baseY - 260} ${baseX - 12} ${baseY - 310}`;
  // Two leaves
  const leafL = `M${baseX - 30} ${baseY - 130} Q${baseX - 90} ${baseY - 170} ${baseX - 110} ${baseY - 140} Q${baseX - 80} ${baseY - 110} ${baseX - 30} ${baseY - 130} Z`;
  const leafR = `M${baseX - 36} ${baseY - 220} Q${baseX + 30} ${baseY - 260} ${baseX + 48} ${baseY - 230} Q${baseX + 12} ${baseY - 200} ${baseX - 36} ${baseY - 220} Z`;
  const leafTop = `M${baseX - 18} ${baseY - 300} Q${baseX - 52} ${baseY - 332} ${baseX - 64} ${baseY - 308} Q${baseX - 42} ${baseY - 286} ${baseX - 18} ${baseY - 300} Z`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <G opacity={o}>
        <Path d={stem} stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d={leafL} fill={c} opacity={0.85} />
        <Path d={leafR} fill={c} opacity={0.9} />
        <Path d={leafTop} fill={c} opacity={0.9} />
      </G>
    </Svg>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
