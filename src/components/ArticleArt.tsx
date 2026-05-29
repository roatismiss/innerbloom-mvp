// Editorial article illustrations for the Resource Library.
//
// One symbolic SVG per article id (60 total). Compositions use the InnerBloom
// palette and the shared background language established in
// design/article-illustrations/{mo-5,sl-2}.html — soft cream radial bg with
// peach/cyan blobs, a horizon line at y≈254, and limited burgundy/peach/pink
// silhouette work. Each illustration is a small <G> placed inside one shared
// <Svg viewBox="0 0 480 320">.
//
// If an article id has no bespoke illustration, the dispatcher falls back to a
// gradient + the category icon (matches the previous ArtBlock behaviour).

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import type { ResourceCategory } from '../lib/resources-data';

// ─── Tokens (mirror of design/home-screen.html) ──────────────────────────────
const T = {
  cream:        '#fff1ed',
  creamDeep:    '#fadcd5',
  peachLight:   '#ffdad2',
  peachMid:     '#ffb4a3',
  peach:        '#e8836b',
  burgundy:     '#994531',
  burgundyDark: '#641e0e',
  ink:          '#281814',
  pink:         '#a8315c',
  cyan:         '#90f2fc',
  white:        '#ffffff',
};

// ─── Shared background (peach radial + 2-3 blobs + horizon) ──────────────────
// Variants tint the blobs slightly per category so categories feel coherent.
type BgScheme = 'peach' | 'cyan' | 'pink' | 'fog' | 'ember';

function Bg({ scheme = 'peach' }: { scheme?: BgScheme }) {
  const accent =
    scheme === 'cyan'  ? { c: T.cyan,      o: 0.22 } :
    scheme === 'pink'  ? { c: T.pink,      o: 0.18 } :
    scheme === 'fog'   ? { c: '#c8b8b3',   o: 0.30 } :
    scheme === 'ember' ? { c: T.peach,     o: 0.35 } :
                         { c: T.peachLight, o: 0.55 };
  return (
    <G>
      <Defs>
        <RadialGradient id="art-bg" cx="50%" cy="55%" rx="80%" ry="80%">
          <Stop offset="0" stopColor={T.cream} />
          <Stop offset="1" stopColor={T.creamDeep} />
        </RadialGradient>
      </Defs>
      <Rect width="480" height="320" fill="url(#art-bg)" />
      <Ellipse cx="80"  cy="60"  rx="120" ry="80" fill={accent.c}      opacity={accent.o} />
      <Ellipse cx="420" cy="270" rx="130" ry="90" fill={T.peachLight}  opacity={0.55} />
      <Ellipse cx="380" cy="80"  rx="60"  ry="40" fill={T.creamDeep}   opacity={0.7} />
    </G>
  );
}

// ─── Shared ground horizon ──────────────────────────────────────────────────
function Ground({ y = 254, opacity = 0.45 }: { y?: number; opacity?: number }) {
  return (
    <G>
      <Path
        d={`M0 ${y} Q120 ${y - 2} 240 ${y + 2} T480 ${y - 2} L480 320 L0 320 Z`}
        fill={T.peachMid}
        opacity={opacity * 0.5}
      />
      <Path
        d={`M0 ${y} Q120 ${y - 2} 240 ${y + 2} T480 ${y - 2}`}
        stroke={T.peachMid}
        strokeWidth={1.4}
        fill="none"
        opacity={opacity + 0.05}
        strokeLinecap="round"
      />
    </G>
  );
}

// ─── Reusable motif: tiny flower (stem + petals) ────────────────────────────
function Flower({
  x, y, scale = 1, color = T.peach, center = T.burgundyDark,
}: { x: number; y: number; scale?: number; color?: string; center?: string }) {
  const r = 3 * scale;
  return (
    <G>
      <Path d={`M${x} ${y + 8 * scale} L${x} ${y - 2 * scale}`}
        stroke={T.pink} strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={x - r}     cy={y - r * 0.4} r={r * 1.05} fill={color} />
      <Circle cx={x + r}     cy={y - r * 0.4} r={r * 1.05} fill={color} />
      <Circle cx={x}         cy={y - r * 1.4} r={r * 1.05} fill={color} />
      <Circle cx={x}         cy={y + r * 0.6} r={r * 1.05} fill={color} />
      <Circle cx={x}         cy={y - r * 0.3} r={r * 0.55} fill={center} />
    </G>
  );
}

// ─── Reusable motif: simple human silhouette (head + tunic + legs) ──────────
function Figure({
  x, y, scale = 1, tint = T.peach, dark = T.ink, headDark = T.burgundyDark,
  pose = 'stand',
}: {
  x: number; y: number; scale?: number;
  tint?: string; dark?: string; headDark?: string;
  pose?: 'stand' | 'walk' | 'sit' | 'kneel' | 'reach';
}) {
  // Coords are RELATIVE to x,y. y is the figure's center-vertical anchor.
  const s = scale;
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Hair bun */}
      <Circle cx="0" cy="-46" r="5" fill={T.ink} />
      {/* Head */}
      <Ellipse cx="0" cy="-32" rx="12" ry="13" fill={headDark} />
      {/* Neck */}
      <Rect x="-4" y="-21" width="8" height="6" fill={headDark} />
      {/* Tunic */}
      <Path
        d="M-22 -12 Q-22 -16 -14 -17 L14 -17 Q22 -16 22 -12 L26 50 Q22 56 14 56 L-14 56 Q-22 56 -26 50 Z"
        fill={tint}
      />
      {/* Seam */}
      <Path d="M0 -12 L0 54" stroke={T.burgundyDark} strokeWidth={1.2} fill="none" opacity={0.55} />
      {/* V collar */}
      <Path d="M-7 -15 L0 -6 L7 -15" stroke={T.burgundyDark} strokeWidth={1.2} fill="none" opacity={0.6} />

      {pose === 'walk' && (
        <G>
          <Path d="M-14 56 L-16 88" stroke={dark} strokeWidth={5.5} strokeLinecap="round" />
          <Path d="M14 56 L20 88"   stroke={dark} strokeWidth={5.5} strokeLinecap="round" />
          <Ellipse cx="-18" cy="90" rx="7" ry="3" fill={dark} />
          <Ellipse cx="22"  cy="90" rx="7" ry="3" fill={dark} />
        </G>
      )}
      {pose === 'stand' && (
        <G>
          <Path d="M-10 56 L-10 88" stroke={dark} strokeWidth={5.5} strokeLinecap="round" />
          <Path d="M10  56 L10  88" stroke={dark} strokeWidth={5.5} strokeLinecap="round" />
          <Ellipse cx="-10" cy="90" rx="7" ry="3" fill={dark} />
          <Ellipse cx="10"  cy="90" rx="7" ry="3" fill={dark} />
        </G>
      )}
      {pose === 'sit' && (
        <G>
          <Path d="M-12 56 L-14 76 L14 76 L12 56 Z" fill={dark} />
          <Path d="M-14 76 L-16 90" stroke={dark} strokeWidth={5} strokeLinecap="round" />
          <Path d="M14 76 L16 90"   stroke={dark} strokeWidth={5} strokeLinecap="round" />
        </G>
      )}
      {pose === 'kneel' && (
        <G>
          <Path d="M-16 54 Q-22 70 -12 80 L18 80 L20 54 Z" fill={dark} />
          <Ellipse cx="-2" cy="84" rx="20" ry="3" fill={dark} opacity={0.5} />
        </G>
      )}
      {pose === 'reach' && (
        <G>
          <Path d="M-12 56 L-12 88" stroke={dark} strokeWidth={5} strokeLinecap="round" />
          <Path d="M12 56 L12 88"   stroke={dark} strokeWidth={5} strokeLinecap="round" />
          <Path d="M22 -8 Q40 8 56 22" stroke={tint} strokeWidth={9} strokeLinecap="round" />
          <Circle cx="56" cy="22" r="4" fill={T.peachLight} />
        </G>
      )}
    </G>
  );
}

// ─── Reusable motif: heart (small) ──────────────────────────────────────────
function Heart({ x, y, r = 8, fill = T.burgundy }: { x: number; y: number; r?: number; fill?: string }) {
  return (
    <Path
      d={`M${x} ${y + r * 0.6} Q${x - r} ${y - r * 0.4} ${x - r} ${y - r * 0.1}
          Q${x - r} ${y - r} ${x} ${y - r * 0.2}
          Q${x + r} ${y - r} ${x + r} ${y - r * 0.1}
          Q${x + r} ${y - r * 0.4} ${x} ${y + r * 0.6} Z`}
      fill={fill}
    />
  );
}

// =============================================================================
// ─── ARTICLE ARTS ────────────────────────────────────────────────────────────
// =============================================================================
// All return a <G> (no own background) — Bg is rendered by the dispatcher.
// Each composition occupies the 480x320 frame established by the SVG viewBox.

// ─── WORK STRESS ─────────────────────────────────────────────────────────────

// ws-1 — When the Inbox Becomes a Tide
function Ws1() {
  return (
    <G>
      <Ground />
      {/* Cyan-tinted wave swell rising from the right */}
      <Path
        d="M120 220 Q200 160 280 180 Q360 200 420 150 Q470 130 480 140 L480 254 L120 254 Z"
        fill={T.cyan} opacity={0.35}
      />
      <Path
        d="M120 220 Q200 160 280 180 Q360 200 420 150"
        stroke={T.burgundy} strokeWidth={1.6} fill="none" opacity={0.55} strokeLinecap="round"
      />
      {/* Envelopes carried in the wave */}
      {[260, 320, 380].map((cx, i) => (
        <G key={i} transform={`translate(${cx} ${178 - i * 4}) rotate(${-12 + i * 8})`}>
          <Rect x="-14" y="-9" width="28" height="18" rx="2" fill={T.white} stroke={T.burgundy} strokeWidth={1.2} />
          <Path d="M-14 -9 L0 3 L14 -9" stroke={T.burgundy} strokeWidth={1.2} fill="none" />
        </G>
      ))}
      {/* Small figure at desk on the left, calm but braced */}
      <Figure x={120} y={210} scale={0.7} tint={T.peach} pose="sit" />
      <Rect x="78" y="240" width="60" height="6" fill={T.burgundyDark} />
      <Rect x="86" y="232" width="44" height="10" rx="1.5" fill={T.white} stroke={T.burgundy} strokeWidth={1} />
    </G>
  );
}

// ws-2 — The 4 p.m. Wall
function Ws2() {
  return (
    <G>
      {/* Setting sun behind */}
      <Circle cx="360" cy="170" r="42" fill={T.peachMid} opacity={0.85} />
      <Circle cx="360" cy="170" r="62" fill={T.peachLight} opacity={0.6} />
      <Ground />
      {/* Flat wall horizon */}
      <Rect x="180" y="200" width="280" height="54" fill={T.burgundy} opacity={0.85} />
      <Path d="M180 200 L460 200" stroke={T.burgundyDark} strokeWidth={1.4} />
      {/* Small figure at base of wall, leaning back */}
      <G transform="translate(140 232)">
        <Circle cx="0" cy="-12" r="9" fill={T.burgundyDark} />
        <Path d="M-10 -2 L-10 18 L12 18 L14 -2 Z" fill={T.peach} />
        <Path d="M-10 18 L-14 26" stroke={T.ink} strokeWidth={4} strokeLinecap="round" />
        <Path d="M14 18 L16 26"   stroke={T.ink} strokeWidth={4} strokeLinecap="round" />
      </G>
      {/* Long shadow on the ground */}
      <Ellipse cx="160" cy="262" rx="50" ry="3" fill={T.ink} opacity={0.18} />
    </G>
  );
}

// ws-3 — Quiet Quitting Yourself
function Ws3() {
  return (
    <G>
      <Ground />
      {/* Empty chair — silhouette of an indent */}
      <G transform="translate(160 200)">
        <Rect x="-22" y="-6" width="44" height="8" rx="1.5" fill={T.burgundy} />
        <Path d="M-22 2 L-22 50 M22 2 L22 50" stroke={T.burgundy} strokeWidth={3.5} strokeLinecap="round" />
        <Path d="M-22 -6 L-22 -36 L22 -36 L22 -6 Z" fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.5} />
        {/* Faint figure-shape indent on the chair */}
        <Ellipse cx="0" cy="-20" rx="10" ry="12" fill={T.peach} opacity={0.4} />
      </G>
      {/* Figure walking away from the chair */}
      <Figure x={320} y={196} scale={0.9} tint={T.peach} pose="walk" />
      {/* Faint footprints leading away */}
      <Ellipse cx="240" cy="262" rx="5" ry="2" fill={T.peach} opacity={0.4} />
      <Ellipse cx="262" cy="266" rx="5" ry="2" fill={T.peach} opacity={0.5} />
      <Ellipse cx="284" cy="262" rx="5" ry="2" fill={T.peach} opacity={0.6} />
    </G>
  );
}

// ws-4 — Meetings as Micro-Stress
function Ws4() {
  return (
    <G>
      {/* Fractured clock — wedges in slightly offset positions */}
      <G transform="translate(240 170)">
        <Circle cx="0" cy="0" r="74" fill={T.peachLight} />
        {/* Wedges */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 - 90) * (Math.PI / 180);
          const a2 = ((i + 1) * 45 - 90) * (Math.PI / 180);
          const offset = i % 2 === 0 ? 4 : -4;
          const ox = Math.cos((a + a2) / 2) * Math.abs(offset);
          const oy = Math.sin((a + a2) / 2) * Math.abs(offset);
          const x1 = Math.cos(a) * 70 + ox;
          const y1 = Math.sin(a) * 70 + oy;
          const x2 = Math.cos(a2) * 70 + ox;
          const y2 = Math.sin(a2) * 70 + oy;
          const fill = i % 2 === 0 ? T.peach : T.burgundy;
          return (
            <Path key={i}
              d={`M${ox} ${oy} L${x1} ${y1} A70 70 0 0 1 ${x2} ${y2} Z`}
              fill={fill} opacity={i % 2 === 0 ? 0.85 : 0.7} />
          );
        })}
        <Circle cx="0" cy="0" r="6" fill={T.white} />
      </G>
      <Ground />
    </G>
  );
}

// ws-5 — Open-Plan Office and the Vigilant Brain
function Ws5() {
  return (
    <G>
      <Ground />
      {/* Concentric sound waves */}
      {[40, 60, 84, 110, 140].map((r, i) => (
        <Circle key={i} cx="240" cy="180" r={r}
          stroke={T.peach} strokeWidth={1.4} fill="none" opacity={0.7 - i * 0.12} />
      ))}
      {/* Figure in the centre, head slightly tilted */}
      <Figure x={240} y={192} scale={0.85} tint={T.burgundy} pose="stand" />
      {/* Tiny scattered chat bubbles */}
      <G fill={T.cyan} opacity={0.6}>
        <Ellipse cx="90"  cy="120" rx="10" ry="7" />
        <Ellipse cx="400" cy="100" rx="12" ry="8" />
        <Ellipse cx="80"  cy="220" rx="9"  ry="6" />
        <Ellipse cx="410" cy="220" rx="11" ry="7" />
      </G>
    </G>
  );
}

// ws-6 — Working from Home, Still Not Home
function Ws6() {
  return (
    <G>
      <Ground />
      {/* Bed silhouette */}
      <Path d="M80 230 L80 254 L400 254 L400 230 Q400 220 390 220 L90 220 Q80 220 80 230 Z"
        fill={T.peach} />
      <Rect x="80" y="218" width="80" height="14" rx="3" fill={T.peachLight} />
      {/* Laptop on bed */}
      <G transform="translate(240 200)">
        <Path d="M-30 8 L30 8 L36 14 L-36 14 Z" fill={T.burgundyDark} />
        <Rect x="-26" y="-22" width="52" height="32" rx="2" fill={T.ink} />
        {/* Tiny office figure on the screen */}
        <Circle cx="0" cy="-10" r="3" fill={T.peach} />
        <Rect x="-2" y="-6" width="4" height="8" fill={T.peach} />
        <Rect x="-16" y="4" width="32" height="2" fill={T.burgundy} />
      </G>
      {/* Window in background showing daylight */}
      <Rect x="100" y="80" width="80" height="90" rx="3" fill={T.cyan} opacity={0.45} />
      <Path d="M140 80 L140 170 M100 125 L180 125" stroke={T.burgundy} strokeWidth={1.4} />
    </G>
  );
}

// ws-7 — Performance Reviews and the Body Memory of Judgement
function Ws7() {
  return (
    <G>
      <Ground />
      {/* Small figure standing centre-left */}
      <Figure x={180} y={196} scale={0.85} tint={T.peach} pose="stand" />
      {/* Magnifying glass over the figure */}
      <G>
        <Circle cx="200" cy="170" r="60" fill={T.cyan} opacity={0.18} />
        <Circle cx="200" cy="170" r="60" stroke={T.burgundy} strokeWidth={4} fill="none" />
        <Path d="M244 214 L300 280" stroke={T.burgundy} strokeWidth={10} strokeLinecap="round" />
        <Path d="M244 214 L300 280" stroke={T.burgundyDark} strokeWidth={4} strokeLinecap="round" />
      </G>
      {/* Tiny pulse line through the figure's chest — body memory */}
      <Path d="M170 178 L182 178 L188 168 L196 188 L202 178 L220 178"
        stroke={T.pink} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </G>
  );
}

// ws-8 — The Sunday Scaries, Decoded
function Ws8() {
  return (
    <G>
      <Ground />
      {/* Calendar — Sunday bright, Monday dark */}
      <G transform="translate(140 130)">
        <Rect x="0" y="0" width="90" height="110" rx="6" fill={T.white} stroke={T.burgundy} strokeWidth={1.5} />
        <Rect x="0" y="0" width="90" height="20" rx="6" fill={T.peach} />
        <Path d="M16 -8 L16 4 M74 -8 L74 4" stroke={T.burgundyDark} strokeWidth={3} strokeLinecap="round" />
        <Path d="M45 30 L45 90 M15 60 L75 60" stroke={T.burgundy} strokeWidth={0.6} opacity={0.4} />
        {/* SUN cell highlighted */}
        <Rect x="6" y="35" width="36" height="22" fill={T.peachLight} />
        <Path d="M16 40 L34 40 M16 46 L34 46 M16 52 L34 52" stroke={T.burgundy} strokeWidth={1} />
      </G>
      {/* Monday — looming dark cloud */}
      <G transform="translate(330 150)">
        <Path d="M-40 20 Q-60 20 -50 0 Q-50 -20 -20 -16 Q-10 -36 14 -28 Q44 -34 44 -8 Q66 -8 56 16 Z"
          fill={T.burgundyDark} opacity={0.85} />
        <Path d="M-20 24 L-30 50 M0 24 L-10 50 M20 24 L10 50 M40 24 L34 48"
          stroke={T.burgundyDark} strokeWidth={2.4} strokeLinecap="round" opacity={0.6} />
      </G>
    </G>
  );
}

// ws-9 — Burnout Isn't a Badge
function Ws9() {
  return (
    <G>
      <Ground />
      {/* Extinguished candle — wisp of smoke instead of flame */}
      <G transform="translate(170 200)">
        <Rect x="-2" y="-44" width="4" height="0" fill={T.peach} />
        <Path d="M-3 -44 Q0 -56 0 -64 Q-4 -76 0 -84 Q4 -76 0 -64"
          stroke={T.peachMid} strokeWidth={1.6} fill="none" opacity={0.7} strokeLinecap="round" />
        <Rect x="-14" y="-44" width="28" height="50" rx="2" fill={T.peach} />
        <Ellipse cx="0" cy="-44" rx="14" ry="4" fill={T.peachLight} />
        <Rect x="-20" y="6" width="40" height="6" fill={T.burgundy} />
      </G>
      {/* A tarnished medal beside the candle */}
      <G transform="translate(310 220)">
        <Path d="M-12 -34 L0 -38 L12 -34 L8 -18 L-8 -18 Z" fill={T.peachMid} opacity={0.8} />
        <Circle cx="0" cy="0" r="22" fill={T.burgundy} opacity={0.4} />
        <Circle cx="0" cy="0" r="22" stroke={T.burgundyDark} strokeWidth={2} fill="none" />
        <Path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke={T.burgundyDark} strokeWidth={1.6} opacity={0.5} />
      </G>
    </G>
  );
}

// ws-10 — Returning From Leave Without Apology
function Ws10() {
  return (
    <G>
      <Ground />
      {/* Open door with soft light beyond */}
      <G transform="translate(300 110)">
        <Rect x="0" y="0" width="90" height="145" fill={T.burgundyDark} />
        <Path d="M0 0 L90 -10 L90 155 L0 145 Z" fill={T.peachLight} opacity={0.95} />
        <Path d="M0 0 L90 -10 L90 155 L0 145 Z" stroke={T.burgundy} strokeWidth={1.6} fill="none" />
        <Circle cx="78" cy="80" r="2.5" fill={T.burgundyDark} />
        {/* Light beam onto the floor */}
        <Path d="M0 145 L-80 220 L-110 220 L0 145 Z" fill={T.peachLight} opacity={0.55} />
      </G>
      {/* Figure stepping through */}
      <Figure x={210} y={196} scale={0.85} tint={T.peach} pose="walk" />
    </G>
  );
}

// ─── ANXIETY ─────────────────────────────────────────────────────────────────

// an-1 — The Body Says "Maybe" Before the Mind Says "Yes"
function An1() {
  return (
    <G>
      <Ground />
      {/* Large body outline — chest forward, head turned */}
      <G transform="translate(240 170)">
        <Circle cx="0" cy="-50" r="22" fill="none" stroke={T.burgundy} strokeWidth={2.2} />
        <Path d="M-40 -22 Q-40 -32 -20 -34 L20 -34 Q40 -32 40 -22 L50 80 Q40 90 20 90 L-20 90 Q-40 90 -50 80 Z"
          fill="none" stroke={T.burgundy} strokeWidth={2.2} />
        {/* Tension dots — jaw, chest, shoulder */}
        <Circle cx="-6" cy="-38" r="6" fill={T.pink} opacity={0.85} />
        <Circle cx="0"  cy="-4" r="9" fill={T.pink} opacity={0.85} />
        <Circle cx="-34" cy="-16" r="6" fill={T.pink} opacity={0.75} />
        <Circle cx="34"  cy="-16" r="6" fill={T.pink} opacity={0.75} />
        {/* Pulse waves emanating from chest */}
        <Circle cx="0" cy="-4" r="22" stroke={T.pink} strokeWidth={1.2} fill="none" opacity={0.45} />
        <Circle cx="0" cy="-4" r="34" stroke={T.pink} strokeWidth={1}   fill="none" opacity={0.3} />
      </G>
    </G>
  );
}

// an-2 — Catastrophizing as Care
function An2() {
  return (
    <G>
      <Ground />
      {/* Figure cradling a small storm-globe */}
      <Figure x={240} y={170} scale={1} tint={T.peach} pose="stand" />
      <G transform="translate(240 178)">
        <Circle cx="0" cy="0" r="32" fill={T.cyan} opacity={0.55} />
        <Circle cx="0" cy="0" r="32" stroke={T.burgundy} strokeWidth={2} fill="none" />
        {/* Storm */}
        <Path d="M-16 -6 Q-22 -10 -10 -12 Q-6 -22 6 -16 Q18 -18 14 -4 Z" fill={T.burgundyDark} opacity={0.7} />
        <Path d="M-10 6 L-14 16 M-2 6 L-6 18 M8 6 L4 18 M16 4 L12 14"
          stroke={T.burgundy} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        <Rect x="-20" y="28" width="40" height="6" rx="1" fill={T.burgundyDark} />
      </G>
      {/* Arms cupping it */}
      <Path d="M210 180 Q200 190 200 210" stroke={T.peach} strokeWidth={9} fill="none" strokeLinecap="round" />
      <Path d="M270 180 Q280 190 280 210" stroke={T.peach} strokeWidth={9} fill="none" strokeLinecap="round" />
    </G>
  );
}

// an-3 — When the Future Feels Loud
function An3() {
  return (
    <G>
      <Ground />
      {/* Giant looming clock behind */}
      <Circle cx="320" cy="140" r="90" fill={T.cyan} opacity={0.3} />
      <Circle cx="320" cy="140" r="90" stroke={T.burgundy} strokeWidth={3} fill="none" />
      <Path d="M320 140 L320 80 M320 140 L370 160" stroke={T.burgundyDark} strokeWidth={4} strokeLinecap="round" />
      <Circle cx="320" cy="140" r="6" fill={T.burgundyDark} />
      {/* Ticks */}
      {[0, 1, 2, 3].map((i) => {
        const a = i * (Math.PI / 2);
        return (
          <Path key={i}
            d={`M${320 + Math.cos(a) * 80} ${140 + Math.sin(a) * 80} L${320 + Math.cos(a) * 88} ${140 + Math.sin(a) * 88}`}
            stroke={T.burgundyDark} strokeWidth={3} strokeLinecap="round" />
        );
      })}
      {/* Small figure in foreground */}
      <Figure x={150} y={196} scale={0.8} tint={T.peach} pose="stand" />
    </G>
  );
}

// an-4 — Breathing, Reframed (the Featured Daily)
function An4() {
  return (
    <G>
      <Ground />
      {/* Lung-shaped tree — two soft halves */}
      <G transform="translate(240 160)">
        {/* Trunk */}
        <Rect x="-4" y="0" width="8" height="80" fill={T.burgundyDark} />
        {/* Left lung */}
        <Path d="M-4 0 Q-60 -10 -70 30 Q-72 70 -34 76 Q-12 78 -4 60 Z"
          fill={T.peach} stroke={T.burgundy} strokeWidth={1.6} />
        {/* Right lung */}
        <Path d="M4 0 Q60 -10 70 30 Q72 70 34 76 Q12 78 4 60 Z"
          fill={T.peach} stroke={T.burgundy} strokeWidth={1.6} />
        {/* Veins/branches inside */}
        <Path d="M-4 10 Q-30 20 -34 60 M-4 20 Q-18 26 -22 50" stroke={T.burgundyDark} strokeWidth={1.2} fill="none" />
        <Path d="M4 10 Q30 20 34 60 M4 20 Q18 26 22 50"     stroke={T.burgundyDark} strokeWidth={1.2} fill="none" />
        {/* Small leaves at branch tips */}
        <Circle cx="-34" cy="60" r="4" fill={T.pink} />
        <Circle cx="34"  cy="60" r="4" fill={T.pink} />
        <Circle cx="-22" cy="50" r="3" fill={T.pink} />
        <Circle cx="22"  cy="50" r="3" fill={T.pink} />
      </G>
      {/* Soft breath waves */}
      <Path d="M70 230 Q120 222 170 230" stroke={T.cyan} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
      <Path d="M310 230 Q360 222 410 230" stroke={T.cyan} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
    </G>
  );
}

// an-5 — Social Anxiety Is Not Shyness
function An5() {
  return (
    <G>
      <Ground />
      {/* Single spotlight on centre figure */}
      <Path d="M180 60 L300 60 L380 250 L100 250 Z" fill={T.peachLight} opacity={0.55} />
      <Figure x={240} y={196} scale={0.85} tint={T.burgundy} pose="stand" />
      {/* Blurred faces around */}
      {[
        { x: 70,  y: 170 }, { x: 90,  y: 220 },
        { x: 400, y: 170 }, { x: 410, y: 220 },
        { x: 30,  y: 200 }, { x: 450, y: 200 },
      ].map((p, i) => (
        <G key={i} opacity={0.6}>
          <Ellipse cx={p.x} cy={p.y} rx="18" ry="22" fill={T.peachMid} />
          <Circle  cx={p.x} cy={p.y - 6} r="9" fill={T.burgundy} opacity={0.4} />
        </G>
      ))}
    </G>
  );
}

// an-6 — The Anxious Achiever
function An6() {
  return (
    <G>
      <Ground />
      {/* Looping staircase */}
      <G stroke={T.burgundy} strokeWidth={2} fill="none">
        <Path d="M60 250 L100 250 L100 220 L150 220 L150 190 L200 190 L200 160 L250 160 L250 130 L300 130 L300 100 L350 100 L350 70" />
      </G>
      {/* Trophy at the top with a crack */}
      <G transform="translate(360 50)">
        <Path d="M-12 14 Q-12 -14 0 -16 Q12 -14 12 14 Z" fill={T.peach} stroke={T.burgundy} strokeWidth={1.4} />
        <Rect x="-8" y="14" width="16" height="6" fill={T.burgundy} />
        {/* Crack */}
        <Path d="M-4 -10 L2 -2 L-2 4 L4 12" stroke={T.burgundyDark} strokeWidth={1.4} fill="none" />
      </G>
      {/* Small figure on the stairs near bottom */}
      <Figure x={120} y={200} scale={0.55} tint={T.peach} pose="walk" />
    </G>
  );
}

// an-7 — Phone Notifications and the Startle Reflex
function An7() {
  return (
    <G>
      <Ground />
      <G transform="translate(240 180)">
        <Rect x="-30" y="-60" width="60" height="120" rx="10" fill={T.burgundyDark} />
        <Rect x="-24" y="-52" width="48" height="100" rx="2" fill={T.peachLight} />
        {/* Notification dot */}
        <Circle cx="20" cy="-48" r="6" fill={T.pink} />
        {/* Tiny lines suggesting text */}
        <Rect x="-18" y="-36" width="20" height="3" fill={T.burgundy} opacity={0.7} />
        <Rect x="-18" y="-28" width="32" height="3" fill={T.burgundy} opacity={0.5} />
      </G>
      {/* Ripples outward */}
      {[55, 80, 110, 145].map((r, i) => (
        <Circle key={i} cx="240" cy="180" r={r}
          stroke={T.peach} strokeWidth={1.4} fill="none" opacity={0.55 - i * 0.1} />
      ))}
    </G>
  );
}

// an-8 — Sleep, the First Domino
function An8() {
  return (
    <G>
      <Ground />
      {/* Falling dominoes left → right */}
      {[
        { x: 80,  rot: -65 },
        { x: 130, rot: -45 },
        { x: 180, rot: -25 },
        { x: 230, rot: -10 },
        { x: 280, rot: 0 },
      ].map((d, i) => (
        <G key={i} transform={`translate(${d.x} 234) rotate(${d.rot})`}>
          <Rect x="-9" y="-50" width="18" height="50" rx="2" fill={T.peach} stroke={T.burgundy} strokeWidth={1.3} />
          <Path d="M-9 -28 L9 -28" stroke={T.burgundy} strokeWidth={1} opacity={0.5} />
        </G>
      ))}
      {/* Last "domino" is a small moon */}
      <G transform="translate(370 210)">
        <Path d="M0 -28 Q-24 -24 -24 0 Q-24 24 0 28 Q-14 14 -14 0 Q-14 -14 0 -28 Z"
          fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.4} />
      </G>
    </G>
  );
}

// an-9 — Naming It Loosens It
function An9() {
  return (
    <G>
      <Ground />
      {/* A glass jar with a soft glow inside */}
      <G transform="translate(240 190)">
        <Path d="M-30 -50 L30 -50 L30 -42 L-30 -42 Z" fill={T.burgundy} />
        <Path d="M-32 -42 Q-32 -42 -28 -38 L-28 50 Q-28 56 -20 58 L20 58 Q28 56 28 50 L28 -38 Q32 -42 32 -42 Z"
          fill={T.cream} stroke={T.burgundy} strokeWidth={1.8} opacity={0.95} />
        {/* Soft glow inside */}
        <Circle cx="0" cy="10" r="22" fill={T.peach} opacity={0.7} />
        <Circle cx="0" cy="10" r="14" fill={T.peachLight} opacity={0.9} />
        {/* Label being applied */}
        <Rect x="-22" y="-22" width="44" height="20" rx="2" fill={T.white} stroke={T.burgundy} strokeWidth={1.2} />
        <Path d="M-16 -16 L16 -16 M-16 -10 L8 -10" stroke={T.burgundy} strokeWidth={1.2} />
      </G>
    </G>
  );
}

// an-10 — Letters to the Worried Part of You
function An10() {
  return (
    <G>
      <Ground />
      {/* Larger figure writing */}
      <Figure x={170} y={186} scale={0.85} tint={T.peach} pose="sit" />
      {/* Letter / paper */}
      <G transform="translate(220 220)">
        <Path d="M0 0 L70 -10 L78 30 L8 38 Z" fill={T.white} stroke={T.burgundy} strokeWidth={1.4} />
        <Path d="M12 8 L60 4 M14 16 L54 12 M16 24 L50 20" stroke={T.burgundy} strokeWidth={1} opacity={0.6} />
      </G>
      {/* Smaller "worried" figure sitting next to them */}
      <G transform="translate(340 220)">
        <Circle cx="0" cy="-20" r="11" fill={T.burgundyDark} />
        <Path d="M-10 -10 L-10 20 L12 20 L14 -10 Z" fill={T.peachMid} />
        <Ellipse cx="0" cy="28" rx="16" ry="2" fill={T.ink} opacity={0.18} />
        {/* Small hug-curl posture */}
      </G>
    </G>
  );
}

// ─── DEPRESSION ──────────────────────────────────────────────────────────────

// dp-1 — The Weight Without a Source
function Dp1() {
  return (
    <G>
      <Ground />
      {/* Figure walking slowly */}
      <Figure x={240} y={186} scale={0.95} tint={T.peach} pose="walk" />
      {/* A soft grey cloud on their shoulders */}
      <G opacity={0.85}>
        <Path d="M200 140 Q190 130 200 122 Q210 110 226 116 Q236 100 256 110 Q280 102 286 124 Q300 128 296 144 Q280 152 244 150 Q220 152 200 140 Z"
          fill="#9c8c87" />
        <Path d="M200 140 Q190 130 200 122 Q210 110 226 116 Q236 100 256 110 Q280 102 286 124 Q300 128 296 144"
          stroke={T.burgundyDark} strokeWidth={1.4} fill="none" opacity={0.4} />
      </G>
    </G>
  );
}

// dp-2 — Anhedonia, Quietly
function Dp2() {
  return (
    <G>
      <Ground />
      {/* Row of three muted objects — cup, apple, flower — last one starting to gain colour */}
      <G transform="translate(110 200)">
        {/* Cup */}
        <Path d="M-24 -20 L24 -20 L20 30 L-20 30 Z" fill="#b2a4a0" />
        <Path d="M24 -10 Q40 -10 40 6 Q40 22 24 22" stroke="#b2a4a0" strokeWidth={4} fill="none" />
      </G>
      <G transform="translate(240 200)">
        {/* Apple */}
        <Circle cx="0" cy="6" r="26" fill="#b2a4a0" />
        <Path d="M-2 -18 Q-2 -28 8 -30" stroke={T.burgundyDark} strokeWidth={2} fill="none" />
      </G>
      <G transform="translate(370 200)">
        {/* Flower — barely colour returning */}
        <Path d="M0 30 L0 -4" stroke={T.pink} strokeWidth={1.6} strokeLinecap="round" />
        <Circle cx="-9" cy="-4" r="9" fill={T.peach} opacity={0.85} />
        <Circle cx="9"  cy="-4" r="9" fill={T.peach} opacity={0.85} />
        <Circle cx="0"  cy="-14" r="9" fill={T.peach} opacity={0.85} />
        <Circle cx="0"  cy="2"  r="9" fill={T.peach} opacity={0.85} />
        <Circle cx="0"  cy="-6" r="4" fill={T.burgundyDark} />
      </G>
    </G>
  );
}

// dp-3 — When Showering Becomes a Mountain
function Dp3() {
  return (
    <G>
      <Ground />
      {/* Giant showerhead at top */}
      <G transform="translate(300 70)">
        <Path d="M0 -10 L0 20" stroke={T.burgundyDark} strokeWidth={5} strokeLinecap="round" />
        <Circle cx="0" cy="30" r="22" fill={T.burgundy} />
        <Circle cx="0" cy="30" r="18" fill={T.burgundyDark} />
        {/* Drops */}
        <Path d="M-12 56 L-14 80 M-4 56 L-6 96 M4 56 L6 92 M12 56 L14 84"
          stroke={T.cyan} strokeWidth={2.2} strokeLinecap="round" />
      </G>
      {/* Small figure at base looking up */}
      <Figure x={140} y={210} scale={0.6} tint={T.peach} pose="stand" />
      {/* Soft shadow of the showerhead overshadowing the figure */}
      <Ellipse cx="240" cy="260" rx="180" ry="14" fill={T.burgundyDark} opacity={0.08} />
    </G>
  );
}

// dp-4 — The Difference Between Sad and Heavy
function Dp4() {
  return (
    <G>
      <Ground />
      {/* Left figure — sadness (one tear) */}
      <Figure x={150} y={186} scale={0.85} tint={T.peach} pose="stand" />
      <Circle cx="142" cy="160" r="2.6" fill={T.cyan} />
      <Path d="M142 162 L140 172" stroke={T.cyan} strokeWidth={1.8} strokeLinecap="round" />
      {/* Divider */}
      <Path d="M240 90 L240 250" stroke={T.peachMid} strokeWidth={1.4} strokeDasharray="6 8" opacity={0.7} />
      {/* Right figure — heaviness (cloud weight on head/back) */}
      <Figure x={340} y={186} scale={0.85} tint={T.burgundy} pose="stand" />
      <G opacity={0.8}>
        <Path d="M310 134 Q300 124 314 116 Q322 102 340 110 Q358 100 366 118 Q380 124 372 138 Q346 144 310 134 Z"
          fill="#9c8c87" />
      </G>
    </G>
  );
}

// dp-5 — Tiny Promises
function Dp5() {
  return (
    <G>
      <Ground />
      {/* Row of footprints, each leading to a small flower */}
      {[
        { x: 80,  s: 0.7 },
        { x: 150, s: 0.8 },
        { x: 220, s: 0.9 },
        { x: 290, s: 1.0 },
        { x: 360, s: 1.1 },
      ].map((p, i) => (
        <G key={i}>
          <Ellipse cx={p.x} cy={260} rx={7 * p.s} ry={3 * p.s} fill={T.peach} opacity={0.55 + i * 0.08} />
          <Ellipse cx={p.x + 16 * p.s} cy={252} rx={5 * p.s} ry={2 * p.s} fill={T.peach} opacity={0.5 + i * 0.08} />
          <Flower x={p.x + 8} y={240 - i * 6} scale={0.6 + i * 0.12}
            color={i < 2 ? T.peachMid : i < 4 ? T.peach : T.pink} />
        </G>
      ))}
    </G>
  );
}

// dp-6 — Why You Can't Just Cheer Up
function Dp6() {
  return (
    <G>
      <Ground />
      {/* Balance scale */}
      <G transform="translate(240 130)">
        <Path d="M0 100 L0 -10" stroke={T.burgundy} strokeWidth={4} strokeLinecap="round" />
        <Path d="M-90 -10 L90 -10" stroke={T.burgundy} strokeWidth={4} strokeLinecap="round" />
        <Path d="M-90 -10 L-90 30 M90 -10 L90 30" stroke={T.burgundy} strokeWidth={1.6} strokeLinecap="round" />
        {/* Left pan: a brain shape (anatomical) */}
        <Path d="M-110 30 L-70 30 Q-70 50 -90 52 Q-110 50 -110 30 Z" fill={T.burgundy} />
        <Path d="M-104 24 Q-100 14 -90 16 Q-80 14 -76 24 Q-72 22 -76 30 M-100 22 L-98 28 M-86 22 L-84 28"
          stroke={T.burgundyDark} strokeWidth={1.4} fill={T.peachLight} />
        {/* Right pan: a light-switch — empty/crossed */}
        <Path d="M70 30 L110 30 Q110 50 90 52 Q70 50 70 30 Z" fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.4} />
        <Rect x="84" y="14" width="12" height="20" rx="2" fill={T.peach} />
        <Path d="M74 4 L98 28 M98 4 L74 28" stroke={T.pink} strokeWidth={2} strokeLinecap="round" />
        <Rect x="-22" y="100" width="44" height="6" fill={T.burgundyDark} />
      </G>
    </G>
  );
}

// dp-7 — Sunlight as Medicine
function Dp7() {
  return (
    <G>
      <Ground />
      {/* Window frame */}
      <Rect x="60" y="40" width="140" height="180" rx="4" fill={T.cyan} opacity={0.42} />
      <Path d="M130 40 L130 220 M60 130 L200 130" stroke={T.burgundy} strokeWidth={1.6} />
      <Rect x="60" y="40" width="140" height="180" rx="4" fill="none" stroke={T.burgundy} strokeWidth={2} />
      {/* Light beam onto figure */}
      <Path d="M200 60 L420 220 L420 254 L160 254 L200 60 Z" fill={T.peachLight} opacity={0.55} />
      <Figure x={320} y={196} scale={0.85} tint={T.peach} pose="stand" />
      {/* Sun visible through the window */}
      <Circle cx="130" cy="130" r="22" fill={T.peach} />
      <Circle cx="130" cy="130" r="32" fill={T.peach} opacity={0.45} />
    </G>
  );
}

// dp-8 — Telling Someone, the First Time
function Dp8() {
  return (
    <G>
      <Ground />
      <Figure x={140} y={196} scale={0.85} tint={T.peach} pose="stand" />
      <Figure x={340} y={196} scale={0.85} tint={T.burgundy} pose="stand" />
      {/* Hand passing a small lantern between them */}
      <G transform="translate(240 200)">
        <Rect x="-9" y="-10" width="18" height="20" rx="2" fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.4} />
        <Circle cx="0" cy="0" r="6" fill={T.peach} />
        <Path d="M-12 -10 L12 -10" stroke={T.burgundyDark} strokeWidth={1.4} />
        <Path d="M-6 -14 L0 -20 L6 -14" stroke={T.burgundy} strokeWidth={1.4} fill="none" />
        {/* Glow */}
        <Circle cx="0" cy="0" r="22" fill={T.peach} opacity={0.25} />
      </G>
      {/* Hands meeting */}
      <Path d="M178 198 L222 200" stroke={T.peach} strokeWidth={7} strokeLinecap="round" />
      <Path d="M258 200 L304 198" stroke={T.burgundyDark} strokeWidth={7} strokeLinecap="round" />
    </G>
  );
}

// dp-9 — When Therapy Feels Slow
function Dp9() {
  return (
    <G>
      <Ground />
      {/* Stone with water drops slowly carving it */}
      <Path d="M170 240 Q150 200 200 190 Q260 178 290 200 Q320 220 290 240 Z"
        fill={T.peachMid} stroke={T.burgundy} strokeWidth={1.6} />
      {/* Subtle indentation in the stone — where the drops landed over time */}
      <Path d="M226 200 Q230 210 226 218" stroke={T.burgundyDark} strokeWidth={1.4} fill="none" opacity={0.6} />
      {/* Drops falling */}
      {[60, 100, 140, 180].map((y, i) => (
        <Path key={i}
          d={`M226 ${y} Q224 ${y + 8} 226 ${y + 14} Q228 ${y + 8} 226 ${y}`}
          fill={T.cyan} opacity={0.85} />
      ))}
      {/* Spiral path on the ground beside */}
      <Path d="M350 240 Q360 220 380 220 Q400 220 400 240 Q400 260 380 260 Q370 260 370 250 Q370 240 380 240"
        stroke={T.burgundy} strokeWidth={1.6} fill="none" />
    </G>
  );
}

// dp-10 — The Color Returning
function Dp10() {
  return (
    <G>
      <Ground />
      {/* Greyscale tree */}
      <G transform="translate(160 130)">
        <Rect x="-4" y="60" width="8" height="60" fill="#998a85" />
        <Circle cx="0" cy="40" r="40" fill="#b2a4a0" />
        <Circle cx="-18" cy="22" r="22" fill="#b2a4a0" />
        <Circle cx="18" cy="22" r="22" fill="#b2a4a0" />
      </G>
      {/* A single colour bloom on the right */}
      <G transform="translate(340 150)">
        <Path d="M0 60 L0 -6" stroke={T.pink} strokeWidth={2} strokeLinecap="round" />
        <Circle cx="-10" cy="-6" r="10" fill={T.peach} />
        <Circle cx="10"  cy="-6" r="10" fill={T.peach} />
        <Circle cx="0"   cy="-18" r="10" fill={T.peach} />
        <Circle cx="0"   cy="6"  r="10" fill={T.peach} />
        <Circle cx="0"   cy="-8" r="5" fill={T.burgundyDark} />
      </G>
    </G>
  );
}

// ─── ADDICTION ───────────────────────────────────────────────────────────────

// ad-1 — Not All Coping Is Healing
function Ad1() {
  return (
    <G>
      <Ground />
      {/* Open cage */}
      <G transform="translate(220 170)">
        <Path d="M-50 60 L50 60 L50 -50 L-50 -50 Z" stroke={T.burgundy} strokeWidth={2} fill="none" />
        {[-34, -18, -2, 14, 30].map((x) => (
          <Path key={x} d={`M${x} -50 L${x} 60`} stroke={T.burgundy} strokeWidth={1.6} />
        ))}
        {/* Door swung open */}
        <Path d="M-50 -50 L-90 -30 L-90 80 L-50 60 Z" fill="none" stroke={T.burgundy} strokeWidth={2} />
        {[-58, -68, -78].map((x) => (
          <Path key={x} d={`M${x} ${-30 + (-50 - x) * -0.3} L${x} ${80 + (-50 - x) * -0.2}`}
            stroke={T.burgundy} strokeWidth={1.4} />
        ))}
        <Path d="M-50 -50 L-50 60" stroke={T.burgundy} strokeWidth={2} />
      </G>
      {/* Bird perched on edge */}
      <G transform="translate(280 134)">
        <Path d="M0 0 Q10 -6 16 -2 Q20 -2 14 4 Q16 14 6 14 Q-4 14 -6 6 Z" fill={T.peach} />
        <Circle cx="14" cy="-2" r="2" fill={T.burgundyDark} />
        <Path d="M-6 12 L-6 22 M0 12 L0 22" stroke={T.burgundyDark} strokeWidth={1.4} />
      </G>
    </G>
  );
}

// ad-2 — The Numb → Soothe → Repeat Loop
function Ad2() {
  return (
    <G>
      <Ground />
      {/* Loop arrow */}
      <G transform="translate(240 170)">
        <Circle cx="0" cy="0" r="70" stroke={T.burgundy} strokeWidth={3.2} fill="none" strokeDasharray="4 6" />
        <Path d="M70 0 L62 -8 L62 8 Z" fill={T.burgundy} />
        {/* Three nodes on the loop */}
        <G transform="translate(0 -70)">
          <Circle cx="0" cy="0" r="14" fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.6} />
        </G>
        <G transform="translate(61 35)">
          <Circle cx="0" cy="0" r="14" fill={T.peach} stroke={T.burgundy} strokeWidth={1.6} />
        </G>
        <G transform="translate(-61 35)">
          <Circle cx="0" cy="0" r="14" fill={T.pink} stroke={T.burgundy} strokeWidth={1.6} opacity={0.85} />
        </G>
      </G>
    </G>
  );
}

// ad-3 — Phone Scrolling as Anesthesia
function Ad3() {
  return (
    <G>
      <Ground />
      <Figure x={180} y={186} scale={0.9} tint={T.peach} pose="sit" />
      {/* Phone glow on face */}
      <G transform="translate(260 180)">
        <Rect x="-22" y="-40" width="44" height="80" rx="6" fill={T.burgundyDark} />
        <Rect x="-18" y="-34" width="36" height="68" rx="2" fill={T.peachLight} />
        <Circle cx="0" cy="0" r="50" fill={T.peach} opacity={0.32} />
      </G>
      {/* Reach line from figure */}
      <Path d="M210 180 Q230 180 240 180" stroke={T.peach} strokeWidth={9} strokeLinecap="round" />
    </G>
  );
}

// ad-4 — Sober Curiosity
function Ad4() {
  return (
    <G>
      <Ground />
      {/* Empty wine glass */}
      <G transform="translate(240 200)">
        <Path d="M-22 -60 L22 -60 Q26 -40 0 -20 Q-26 -40 -22 -60 Z" fill={T.peachLight} opacity={0.8} stroke={T.burgundy} strokeWidth={1.6} />
        <Path d="M0 -20 L0 30" stroke={T.burgundy} strokeWidth={2} />
        <Path d="M-20 30 L20 30" stroke={T.burgundy} strokeWidth={2} strokeLinecap="round" />
        {/* Small plant growing out of glass */}
        <Path d="M0 -40 Q-8 -56 -4 -72" stroke={T.pink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Circle cx="-6" cy="-72" r="6" fill={T.peach} />
        <Circle cx="0"  cy="-70" r="5" fill={T.peach} />
        <Circle cx="-3" cy="-78" r="5" fill={T.peach} />
        <Circle cx="-3" cy="-72" r="2.4" fill={T.burgundyDark} />
        {/* Leaf on stem */}
        <Path d="M-2 -60 Q4 -56 8 -50" stroke={T.pink} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </G>
    </G>
  );
}

// ad-5 — The Pull, Then the Pause
function Ad5() {
  return (
    <G>
      <Ground />
      {/* Cresting wave */}
      <Path d="M40 180 Q120 100 220 160 Q300 200 360 130 Q400 90 440 140"
        stroke={T.cyan} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M40 200 Q120 130 220 180 Q300 220 360 160 Q400 120 440 170 L440 254 L40 254 Z"
        fill={T.cyan} opacity={0.3} />
      {/* Hand in pause gesture */}
      <G transform="translate(240 200)">
        <Path d="M-18 30 Q-18 0 -12 -2 L-12 -28 Q-12 -34 -6 -34 Q0 -34 0 -28 L0 -8 L4 -8 L4 -32 Q4 -38 10 -38 Q16 -38 16 -32 L16 -8 L20 -8 L20 -26 Q20 -32 26 -32 Q32 -32 32 -26 L32 0 Q32 30 16 30 Z"
          fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.6} />
      </G>
    </G>
  );
}

// ad-6 — Trigger, Ritual, Reward
function Ad6() {
  return (
    <G>
      <Ground />
      {/* Three nodes connected */}
      <Path d="M120 200 L240 100 L360 200 Z"
        stroke={T.burgundy} strokeWidth={2} fill="none" strokeDasharray="3 6" />
      <G>
        <Circle cx="120" cy="200" r="26" fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.6} />
        <Path d="M114 196 L114 208 M126 196 L126 208 M114 196 L126 196" stroke={T.burgundy} strokeWidth={1.6} fill="none" />
      </G>
      <G>
        <Circle cx="240" cy="100" r="26" fill={T.peach} stroke={T.burgundy} strokeWidth={1.6} />
        <Path d="M232 100 Q240 90 248 100 Q248 110 240 116 Q232 110 232 100 Z" fill={T.burgundyDark} />
      </G>
      <G>
        <Circle cx="360" cy="200" r="26" fill={T.pink} opacity={0.9} stroke={T.burgundy} strokeWidth={1.6} />
        <Circle cx="360" cy="200" r="6" fill={T.peachLight} />
      </G>
    </G>
  );
}

// ad-7 — When the Substance Was Survival
function Ad7() {
  return (
    <G>
      <Ground />
      {/* Old life raft beached, grass growing through */}
      <G transform="translate(240 220)">
        <Ellipse cx="0" cy="0" rx="100" ry="22" fill={T.burgundy} />
        <Ellipse cx="0" cy="-4" rx="100" ry="20" fill={T.peach} />
        <Ellipse cx="0" cy="-4" rx="70" ry="10" fill={T.burgundyDark} opacity={0.8} />
        {/* Rope around edge */}
        <Path d="M-100 -2 Q-90 -8 -80 -2 Q-70 -8 -60 -2 Q-50 -8 -40 -2 Q-30 -8 -20 -2 Q-10 -8 0 -2 Q10 -8 20 -2 Q30 -8 40 -2 Q50 -8 60 -2 Q70 -8 80 -2 Q90 -8 100 -2"
          stroke={T.burgundy} strokeWidth={1.4} fill="none" />
      </G>
      {/* Grass blades */}
      {[140, 180, 230, 280, 330].map((x, i) => (
        <Path key={i} d={`M${x} 230 Q${x - 4} 218 ${x - 2} 200 M${x + 6} 232 Q${x + 8} 222 ${x + 4} 208`}
          stroke={T.pink} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      ))}
    </G>
  );
}

// ad-8 — Withdrawal Is Information
function Ad8() {
  return (
    <G>
      <Ground />
      {/* Barometer / dial */}
      <G transform="translate(240 170)">
        <Circle cx="0" cy="0" r="70" fill={T.peachLight} stroke={T.burgundy} strokeWidth={2.2} />
        <Circle cx="0" cy="0" r="58" fill={T.cream} stroke={T.burgundy} strokeWidth={1} opacity={0.7} />
        {/* Tick marks */}
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (-Math.PI * 0.85) + i * (Math.PI * 1.7 / 8);
          return (
            <Path key={i}
              d={`M${Math.cos(a) * 50} ${Math.sin(a) * 50} L${Math.cos(a) * 58} ${Math.sin(a) * 58}`}
              stroke={T.burgundy} strokeWidth={1.6} />
          );
        })}
        {/* Needle pointing slightly past midline */}
        <Path d="M0 0 L36 -30" stroke={T.pink} strokeWidth={3.4} strokeLinecap="round" />
        <Circle cx="0" cy="0" r="5" fill={T.burgundyDark} />
      </G>
    </G>
  );
}

// ad-9 — Community as Counter-Force
function Ad9() {
  return (
    <G>
      <Ground />
      {/* Circle of small figures holding hands (top view, simplified) */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const a = (deg - 90) * (Math.PI / 180);
        const cx = 240 + Math.cos(a) * 90;
        const cy = 170 + Math.sin(a) * 60;
        const tint = i % 2 === 0 ? T.peach : T.burgundy;
        return (
          <G key={i} transform={`translate(${cx} ${cy})`}>
            <Circle cx="0" cy="-8" r="9" fill={T.burgundyDark} />
            <Path d="M-10 0 L-10 22 L12 22 L14 0 Z" fill={tint} />
          </G>
        );
      })}
      {/* Connecting curve through them */}
      <Path d="M240 110 Q310 130 326 170 Q316 220 240 230 Q160 220 154 170 Q166 130 240 110 Z"
        stroke={T.peachMid} strokeWidth={1.6} fill="none" strokeDasharray="3 5" opacity={0.7} />
    </G>
  );
}

// ad-10 — The First 90 Days, Honestly
function Ad10() {
  return (
    <G>
      <Ground />
      {/* Mini-calendar grid */}
      <G transform="translate(120 100)">
        <Rect x="0" y="0" width="160" height="120" rx="6" fill={T.white} stroke={T.burgundy} strokeWidth={1.6} />
        {Array.from({ length: 9 }).map((_, i) => {
          const r = Math.floor(i / 3); const c = i % 3;
          return (
            <Rect key={i} x={10 + c * 50} y={10 + r * 36} width="44" height="30" rx="3"
              fill={i < 6 ? T.peachLight : T.peach} opacity={0.8 + i * 0.02} />
          );
        })}
      </G>
      {/* Plant growing through the calendar */}
      <G transform="translate(330 200)">
        <Path d="M0 60 L0 -50" stroke={T.pink} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M0 30 Q-14 22 -22 28" stroke={T.pink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Path d="M0 0  Q14 -8 22 -4"  stroke={T.pink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Path d="M0 -28 Q-12 -34 -20 -32" stroke={T.pink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Circle cx="-22" cy="28" r="6" fill={T.peach} />
        <Circle cx="22"  cy="-4" r="6" fill={T.peach} />
        <Circle cx="-20" cy="-32" r="6" fill={T.peach} />
        <Circle cx="0"   cy="-58" r="8" fill={T.peach} />
      </G>
    </G>
  );
}

// ─── MOTIVATION ──────────────────────────────────────────────────────────────

// mo-1 — Discipline Is Self-Compassion in Slow Motion
function Mo1() {
  return (
    <G>
      <Ground />
      {/* Hands cupping a seedling */}
      <G transform="translate(240 220)">
        <Path d="M-80 0 Q-70 -30 -30 -30 L30 -30 Q70 -30 80 0 Q70 22 0 24 Q-70 22 -80 0 Z"
          fill={T.peach} stroke={T.burgundy} strokeWidth={1.6} />
        {/* Wrist lines */}
        <Path d="M-60 12 Q-50 18 -40 20 M60 12 Q50 18 40 20" stroke={T.burgundyDark} strokeWidth={1.2} fill="none" opacity={0.6} />
      </G>
      {/* Seedling */}
      <G transform="translate(240 190)">
        <Path d="M0 0 L0 -40" stroke={T.pink} strokeWidth={2} strokeLinecap="round" />
        <Path d="M0 -16 Q-14 -22 -22 -14" stroke={T.pink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Path d="M0 -28 Q14 -34 22 -26"   stroke={T.pink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Circle cx="-20" cy="-14" r="6" fill={T.peach} />
        <Circle cx="22"  cy="-26" r="6" fill={T.peach} />
        <Circle cx="0"   cy="-46" r="6" fill={T.peach} />
      </G>
    </G>
  );
}

// mo-2 — The Two-Minute Rule
function Mo2() {
  return (
    <G>
      <Ground />
      {/* A small key in a lock, just turning */}
      <G transform="translate(240 170)">
        <Circle cx="0" cy="0" r="48" fill={T.peachLight} stroke={T.burgundy} strokeWidth={2} />
        <Rect x="-6" y="-6" width="12" height="36" rx="2" fill={T.burgundyDark} />
        <Circle cx="0" cy="-6" r="4" fill={T.cream} />
      </G>
      <G transform="translate(290 170) rotate(20)">
        <Circle cx="0" cy="0" r="16" fill="none" stroke={T.burgundy} strokeWidth={3} />
        <Path d="M14 0 L60 0" stroke={T.burgundy} strokeWidth={3} strokeLinecap="round" />
        <Path d="M50 -6 L50 6 M58 -8 L58 8" stroke={T.burgundy} strokeWidth={3} strokeLinecap="round" />
      </G>
    </G>
  );
}

// mo-3 — Motivation Follows Action
function Mo3() {
  return (
    <G>
      <Ground />
      {/* A wheel being pushed, motion lines behind */}
      <Path d="M50 240 L120 240" stroke={T.peachMid} strokeWidth={2.4} strokeLinecap="round" opacity={0.85} />
      <Path d="M30 250 L100 250" stroke={T.peachMid} strokeWidth={2}   strokeLinecap="round" opacity={0.7} />
      <Path d="M60 230 L130 230" stroke={T.peachMid} strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />
      <G transform="translate(220 220)">
        <Circle cx="0" cy="0" r="36" fill={T.peach} stroke={T.burgundy} strokeWidth={2} />
        <Circle cx="0" cy="0" r="6"  fill={T.burgundyDark} />
        {Array.from({ length: 6 }).map((_, i) => {
          const a = i * (Math.PI / 3);
          return (
            <Path key={i}
              d={`M0 0 L${Math.cos(a) * 32} ${Math.sin(a) * 32}`}
              stroke={T.burgundy} strokeWidth={2} />
          );
        })}
      </G>
      {/* Figure pushing */}
      <Figure x={310} y={196} scale={0.85} tint={T.burgundy} pose="walk" />
    </G>
  );
}

// mo-4 — Your Why, Not Their Why
function Mo4() {
  return (
    <G>
      <Ground />
      {/* Compass */}
      <G transform="translate(240 170)">
        <Circle cx="0" cy="0" r="74" fill={T.peachLight} stroke={T.burgundy} strokeWidth={2.4} />
        <Circle cx="0" cy="0" r="60" fill={T.cream} stroke={T.burgundy} strokeWidth={1} opacity={0.7} />
        {/* Cardinal marks */}
        {['N','E','S','W'].map((_, i) => {
          const a = i * (Math.PI / 2) - Math.PI / 2;
          return (
            <Path key={i}
              d={`M${Math.cos(a) * 56} ${Math.sin(a) * 56} L${Math.cos(a) * 66} ${Math.sin(a) * 66}`}
              stroke={T.burgundy} strokeWidth={2} />
          );
        })}
        {/* Needle pointing inward (toward "self") */}
        <Path d="M0 -50 L8 0 L0 6 L-8 0 Z" fill={T.pink} />
        <Path d="M0 50 L8 0 L0 -6 L-8 0 Z" fill={T.peach} />
        {/* Inner glow */}
        <Circle cx="0" cy="0" r="14" fill={T.peach} opacity={0.5} />
        <Circle cx="0" cy="0" r="6"  fill={T.burgundyDark} />
      </G>
    </G>
  );
}

// mo-5 — When Goals Become Punishments (the first proof-of-concept)
function Mo5() {
  return (
    <G>
      {/* Faded trophy in the background — the outgrown ambition */}
      <G opacity={0.55} stroke={T.peachMid} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M295 110 Q295 175 340 178 Q385 175 385 110 Z" />
        <Path d="M290 110 L390 110" />
        <Path d="M295 120 Q270 125 270 145 Q270 160 290 162" />
        <Path d="M385 120 Q410 125 410 145 Q410 160 390 162" />
        <Path d="M340 178 L340 210" />
        <Path d="M315 210 L365 210 L372 222 L308 222 Z" />
        <Path d="M312 222 L368 222 L368 234 L312 234 Z" />
      </G>
      <Path d="M340 130 L344 142 L357 142 L347 150 L351 162 L340 154 L329 162 L333 150 L323 142 L336 142 Z"
        fill={T.peachMid} opacity={0.5} />
      <Ground y={258} />
      {/* Wildflowers along the path */}
      <Flower x={70}  y={254} scale={0.9} color={T.pink} />
      <Flower x={195} y={253} scale={0.7} color={T.pink} />
      <Flower x={448} y={252} scale={0.7} color={T.peach} />
      {/* Figure walking forward */}
      <Figure x={148} y={206} scale={1.0} tint={T.peach} pose="walk" />
      {/* Petals between figure & trophy */}
      <Path d="M232 168 Q228 162 232 156 Q236 162 232 168 Z" fill={T.peach} opacity={0.85} transform="rotate(-22 232 162)" />
      <Path d="M254 188 Q251 184 254 180 Q257 184 254 188 Z" fill={T.pink} opacity={0.6} transform="rotate(18 254 184)" />
    </G>
  );
}

// mo-6 — Energy Management Over Time
function Mo6() {
  return (
    <G>
      <Ground />
      {/* Sun + moon arc */}
      <Path d="M40 230 Q240 30 440 230" stroke={T.peachMid} strokeWidth={1.4} fill="none" strokeDasharray="4 6" />
      {/* Sun on left */}
      <Circle cx="100" cy="170" r="20" fill={T.peach} />
      <G stroke={T.peach} strokeWidth={2.2} strokeLinecap="round">
        <Path d="M100 138 L100 130 M100 202 L100 210 M68 170 L60 170 M132 170 L140 170 M76 146 L70 140 M124 146 L130 140 M76 194 L70 200 M124 194 L130 200" />
      </G>
      {/* Moon on right */}
      <Path d="M400 162 Q372 174 374 200 Q376 224 402 232 Q386 218 386 198 Q386 178 400 162 Z"
        fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.4} />
      {/* Energy curve */}
      <Path d="M40 240 Q120 160 200 170 Q260 180 280 220 Q320 250 360 200 Q400 150 440 220"
        stroke={T.burgundy} strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </G>
  );
}

// mo-7 — The Loneliness of Discipline
function Mo7() {
  return (
    <G>
      <Ground />
      {/* Building with many windows, one lit */}
      <Rect x="80" y="60" width="320" height="190" fill={T.burgundyDark} />
      {/* Window grid (5x4) */}
      {Array.from({ length: 5 * 4 }).map((_, i) => {
        const c = i % 5; const r = Math.floor(i / 5);
        const lit = i === 12; // the lit one (3rd column, 3rd row)
        return (
          <Rect key={i}
            x={100 + c * 56} y={80 + r * 42}
            width="40" height="30" rx="2"
            fill={lit ? T.peachLight : T.burgundy} opacity={lit ? 1 : 0.65} />
        );
      })}
      {/* Small figure visible in the lit window */}
      <G transform="translate(289 195)">
        <Circle cx="0" cy="-8" r="4" fill={T.burgundy} />
        <Path d="M-5 -4 L-5 10 L6 10 L6 -4 Z" fill={T.peach} />
      </G>
    </G>
  );
}

// mo-8 — Showing Up on Low Days
function Mo8() {
  return (
    <G>
      <Ground />
      {/* Foggy atmosphere */}
      <Ellipse cx="240" cy="180" rx="200" ry="50" fill={T.cream} opacity={0.85} />
      <Ellipse cx="160" cy="200" rx="160" ry="40" fill="#c8b8b3" opacity={0.4} />
      <Ellipse cx="320" cy="160" rx="160" ry="40" fill="#c8b8b3" opacity={0.4} />
      {/* A single small candle on the path */}
      <G transform="translate(240 230)">
        <Rect x="-7" y="-18" width="14" height="24" rx="2" fill={T.peach} />
        <Rect x="-9" y="6" width="18" height="4" fill={T.burgundy} />
        {/* Flame */}
        <Path d="M0 -30 Q-5 -22 -2 -18 Q0 -22 2 -18 Q5 -22 0 -30 Z" fill={T.peachLight} />
        <Path d="M0 -28 Q-3 -22 0 -20 Q3 -22 0 -28 Z" fill={T.peach} />
        {/* Halo */}
        <Circle cx="0" cy="-22" r="22" fill={T.peach} opacity={0.3} />
      </G>
    </G>
  );
}

// mo-9 — Reward Without Bribe
function Mo9() {
  return (
    <G>
      <Ground />
      {/* Open palm */}
      <G transform="translate(240 220)">
        <Path d="M-50 20 Q-50 -10 -40 -16 L-40 -50 Q-40 -56 -34 -56 Q-28 -56 -28 -50 L-28 -22 L-22 -22 L-22 -60 Q-22 -66 -16 -66 Q-10 -66 -10 -60 L-10 -22 L-4 -22 L-4 -56 Q-4 -62 2 -62 Q8 -62 8 -56 L8 -22 L14 -22 L14 -50 Q14 -56 20 -56 Q26 -56 26 -50 L26 -16 Q40 -10 40 20 Z"
          fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.6} />
      </G>
      {/* A small fruit/bloom resting in the palm */}
      <G transform="translate(240 180)">
        <Circle cx="0" cy="0" r="14" fill={T.pink} />
        <Path d="M-4 -10 Q-2 -16 6 -16" stroke={T.burgundyDark} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Circle cx="-6" cy="-2" r="3" fill={T.peachLight} opacity={0.85} />
      </G>
    </G>
  );
}

// mo-10 — Identity, Not Outcome
function Mo10() {
  return (
    <G>
      <Ground />
      {/* Seed on the left */}
      <G transform="translate(120 220)">
        <Ellipse cx="0" cy="0" rx="14" ry="8" fill={T.burgundy} />
        <Path d="M0 -8 Q-2 -14 -6 -14" stroke={T.pink} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </G>
      {/* Arrow showing it's the same plant */}
      <Path d="M150 210 Q200 170 250 170" stroke={T.peachMid} strokeWidth={1.6} fill="none" strokeDasharray="3 6" strokeLinecap="round" />
      <Path d="M250 170 L242 164 L242 176 Z" fill={T.peachMid} />
      {/* Full bloom on the right */}
      <G transform="translate(340 170)">
        <Path d="M0 60 L0 -10" stroke={T.pink} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M0 30 Q-14 22 -22 28" stroke={T.pink} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <Path d="M0 10 Q14 4 22 12"    stroke={T.pink} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        <Circle cx="-22" cy="28" r="6" fill={T.peach} />
        <Circle cx="22"  cy="12" r="6" fill={T.peach} />
        {/* Bloom head */}
        <Circle cx="-12" cy="-14" r="12" fill={T.peach} />
        <Circle cx="12"  cy="-14" r="12" fill={T.peach} />
        <Circle cx="0"   cy="-26" r="12" fill={T.peach} />
        <Circle cx="0"   cy="-4"  r="12" fill={T.peach} />
        <Circle cx="0"   cy="-14" r="6"  fill={T.burgundyDark} />
      </G>
    </G>
  );
}

// ─── SELF-LOVE ───────────────────────────────────────────────────────────────

// sl-1 — Self-Love Without the Spa Day
function Sl1() {
  return (
    <G>
      <Ground />
      {/* Hand on heart, abstract */}
      <Heart x={240} y={180} r={50} fill={T.peach} />
      <Heart x={240} y={180} r={40} fill={T.peachLight} />
      {/* Hand resting on the heart */}
      <G transform="translate(240 200)">
        <Path d="M-40 10 Q-40 -10 -32 -14 L-32 -36 Q-32 -42 -26 -42 Q-20 -42 -20 -36 L-20 -16 L-14 -16 L-14 -46 Q-14 -52 -8 -52 Q-2 -52 -2 -46 L-2 -16 L4 -16 L4 -42 Q4 -48 10 -48 Q16 -48 16 -42 L16 -16 L22 -16 L22 -36 Q22 -42 28 -42 Q34 -42 34 -36 L34 -10 Q34 10 14 12 Z"
          fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.6} />
      </G>
    </G>
  );
}

// sl-2 — The Inner Critic Was Once a Protector (the second proof-of-concept)
function Sl2() {
  return (
    <G>
      {/* glow */}
      <Defs>
        <RadialGradient id="sl2-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0"   stopColor={T.peachLight} stopOpacity={0.9} />
          <Stop offset="0.6" stopColor={T.peachLight} stopOpacity={0.2} />
          <Stop offset="1"   stopColor={T.peachLight} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="240" cy="200" r="70" fill="url(#sl2-glow)" />
      <Ground />
      {/* Small figure left */}
      <Figure x={158} y={206} scale={0.85} tint={T.peach} pose="kneel" />
      {/* Larger armored protector right */}
      <G>
        {/* Shield on ground */}
        <G transform="translate(360 240)">
          <Path d="M-26 0 Q-30 -18 -14 -26 Q0 -32 14 -26 Q30 -18 26 0 Q24 14 0 18 Q-24 14 -26 0 Z"
            fill={T.burgundy} />
          <Circle cx="0" cy="-6" r="4" fill={T.peach} />
          <Circle cx="-5" cy="-2" r="3" fill={T.peachLight} />
          <Circle cx="5" cy="-2" r="3" fill={T.peachLight} />
          <Circle cx="0" cy="2" r="3" fill={T.peachLight} />
          <Path d="M0 -10 L0 -22" stroke={T.pink} strokeWidth={1.6} strokeLinecap="round" />
        </G>
        {/* Helmet */}
        <Path d="M280 130 Q280 110 300 108 Q322 106 322 130 L322 154 Q322 162 314 164 L290 164 Q280 162 280 154 Z"
          fill={T.burgundyDark} />
        <Rect x="285" y="138" width="34" height="6" rx="2" fill={T.peachLight} />
        <Path d="M298 108 L301 100 L304 108" stroke={T.pink} strokeWidth={3} strokeLinecap="round" fill="none" />
        {/* Body plate */}
        <Rect x="294" y="164" width="14" height="6" fill={T.burgundyDark} />
        <Path d="M262 174 Q262 168 274 167 L326 167 Q340 168 340 174 L344 240 Q340 250 332 252 L268 252 Q260 250 256 240 Z"
          fill={T.burgundyDark} />
        <Path d="M286 178 Q286 174 300 173 L302 173 Q316 174 316 178 L316 220 Q316 226 308 228 L294 228 Q286 226 286 220 Z"
          fill={T.peach} />
        <Heart x={301} y={198} r={8} fill={T.peachLight} />
        {/* Arms */}
        <Path d="M260 188 Q244 210 232 230" stroke={T.burgundyDark} strokeWidth={11} strokeLinecap="round" fill="none" />
        <Ellipse cx="232" cy="232" rx="9" ry="6" fill={T.peachLight} />
        <Path d="M342 200 Q352 220 356 238" stroke={T.burgundyDark} strokeWidth={10} strokeLinecap="round" fill="none" />
        {/* Legs */}
        <Path d="M268 252 Q258 270 268 286 L300 286 L302 252 Z" fill={T.ink} />
        <Path d="M304 252 Q320 264 332 268 L344 268 Q346 258 340 252 Z" fill={T.ink} />
      </G>
    </G>
  );
}

// sl-3 — Mirror Work Without the Cringe
function Sl3() {
  return (
    <G>
      <Ground />
      {/* Figure left, mirror right with softer reflection */}
      <Figure x={150} y={196} scale={0.85} tint={T.peach} pose="stand" />
      {/* Mirror frame */}
      <G transform="translate(330 170)">
        <Path d="M-50 -80 Q-50 -90 -40 -90 L40 -90 Q50 -90 50 -80 L50 80 Q50 90 40 90 L-40 90 Q-50 90 -50 80 Z"
          fill={T.peachLight} stroke={T.burgundy} strokeWidth={2.4} />
        {/* Reflection (softer) */}
        <G opacity={0.85}>
          <Circle cx="0" cy="-30" r="14" fill={T.peach} />
          <Path d="M-20 -10 Q-20 -14 -14 -16 L14 -16 Q20 -14 20 -10 L24 60 Q20 70 14 70 L-14 70 Q-20 70 -24 60 Z"
            fill={T.peach} opacity={0.8} />
        </G>
      </G>
    </G>
  );
}

// sl-4 — Boundaries Are Love Letters
function Sl4() {
  return (
    <G>
      <Ground />
      {/* A gentle picket fence with a gate, single flower at the gate */}
      <G transform="translate(240 220)">
        {[-90, -70, -50, -30, 30, 50, 70, 90].map((x, i) => (
          <Path key={i}
            d={`M${x} 0 L${x} -36 L${x + 6} -42 L${x + 12} -36 L${x + 12} 0 Z`}
            fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.6} />
        ))}
        {/* Horizontal rail */}
        <Path d="M-90 -16 L102 -16" stroke={T.burgundy} strokeWidth={1.6} />
        {/* Gate gap with a flower */}
      </G>
      <Flower x={240} y={224} scale={1.3} color={T.pink} />
    </G>
  );
}

// sl-5 — Body Neutrality, Not Body Positivity
function Sl5() {
  return (
    <G>
      <Ground />
      {/* Figure standing peacefully with a soft glow */}
      <Circle cx="240" cy="180" r="90" fill={T.peachLight} opacity={0.55} />
      <Circle cx="240" cy="180" r="60" fill={T.peachLight} opacity={0.5} />
      <Figure x={240} y={196} scale={0.95} tint={T.peach} pose="stand" />
    </G>
  );
}

// sl-6 — Forgiving the You from Last Year
function Sl6() {
  return (
    <G>
      <Ground />
      {/* Past self (more transparent) handing a flower to present self */}
      <G opacity={0.55}>
        <Figure x={140} y={196} scale={0.85} tint={T.peachMid} pose="stand" />
      </G>
      <Figure x={340} y={196} scale={0.85} tint={T.peach} pose="stand" />
      {/* Hands meeting in the middle holding a flower stem */}
      <Path d="M180 200 L240 200" stroke={T.peachMid} strokeWidth={6} strokeLinecap="round" />
      <Path d="M240 200 L300 200" stroke={T.peach} strokeWidth={6} strokeLinecap="round" />
      <Flower x={240} y={186} scale={1.1} color={T.pink} />
    </G>
  );
}

// sl-7 — Apologizing to Yourself
function Sl7() {
  return (
    <G>
      <Ground />
      {/* Larger figure cradling a smaller curled-up figure */}
      <G transform="translate(240 200)">
        {/* Larger arms */}
        <Path d="M-90 30 Q-80 -20 -20 -30 Q40 -38 90 0 Q100 40 60 50 Q-30 56 -90 30 Z"
          fill={T.peach} stroke={T.burgundy} strokeWidth={1.6} />
        {/* Small curled-up figure */}
        <Circle cx="0" cy="0" r="20" fill={T.burgundyDark} />
        <Path d="M-16 8 Q-10 24 14 18 Q26 6 16 -6" stroke={T.burgundyDark} strokeWidth={6} fill="none" strokeLinecap="round" />
      </G>
    </G>
  );
}

// sl-8 — Friendship With Solitude
function Sl8() {
  return (
    <G>
      <Ground />
      {/* Cozy window with figure inside, tea cup */}
      <Rect x="80" y="60" width="320" height="190" rx="6" fill={T.peachLight} stroke={T.burgundy} strokeWidth={2.4} />
      <Path d="M240 60 L240 250 M80 155 L400 155" stroke={T.burgundy} strokeWidth={1.6} />
      {/* Figure sitting on window seat */}
      <G transform="translate(170 200)">
        <Circle cx="0" cy="-30" r="14" fill={T.burgundyDark} />
        <Path d="M-18 -16 L-18 30 L22 30 L24 -16 Z" fill={T.peach} />
        {/* Curled-up legs */}
        <Path d="M-18 30 Q-18 46 30 46" fill={T.ink} />
      </G>
      {/* Tea cup */}
      <G transform="translate(330 210)">
        <Path d="M-14 -8 L14 -8 L10 16 L-10 16 Z" fill={T.white} stroke={T.burgundy} strokeWidth={1.4} />
        <Path d="M14 -2 Q24 -2 24 6 Q24 14 14 14" stroke={T.burgundy} strokeWidth={1.4} fill="none" />
        {/* Steam */}
        <Path d="M-6 -14 Q-10 -22 -4 -28 Q0 -22 -6 -14 Z" fill={T.peachMid} opacity={0.6} />
        <Path d="M6 -14 Q2 -22 8 -28 Q12 -22 6 -14 Z" fill={T.peachMid} opacity={0.6} />
      </G>
    </G>
  );
}

// sl-9 — The Childhood Self Still Listening
function Sl9() {
  return (
    <G>
      <Ground />
      {/* Present figure */}
      <Figure x={240} y={196} scale={0.95} tint={T.peach} pose="stand" />
      {/* Smaller child-shadow next to them */}
      <G opacity={0.65}>
        <Circle cx="180" cy="220" r="8" fill={T.burgundyDark} />
        <Path d="M170 232 L170 256 L192 256 L194 232 Z" fill={T.burgundy} />
      </G>
      {/* Hand of present figure resting on the child's head */}
      <Path d="M214 200 Q200 212 188 220" stroke={T.peach} strokeWidth={8} strokeLinecap="round" fill="none" />
      <Circle cx="188" cy="220" r="5" fill={T.peachLight} />
    </G>
  );
}

// sl-10 — Receiving as Practice
function Sl10() {
  return (
    <G>
      <Ground />
      {/* Cupped hands receiving falling petals */}
      <G transform="translate(240 220)">
        <Path d="M-70 0 Q-70 -22 -40 -22 L40 -22 Q70 -22 70 0 Q70 16 0 20 Q-70 16 -70 0 Z"
          fill={T.peachLight} stroke={T.burgundy} strokeWidth={1.8} />
        <Path d="M-30 -12 L30 -12" stroke={T.burgundyDark} strokeWidth={1.2} opacity={0.4} />
      </G>
      {/* Petals falling */}
      <Path d="M210 110 Q204 100 210 90 Q216 100 210 110 Z" fill={T.peach} transform="rotate(-20 210 100)" />
      <Path d="M260 60 Q254 50 260 40 Q266 50 260 60 Z"     fill={T.pink}  transform="rotate(20 260 50)" />
      <Path d="M230 150 Q226 144 230 138 Q234 144 230 150 Z" fill={T.peachLight} transform="rotate(40 230 144)" />
      <Path d="M280 130 Q276 124 280 118 Q284 124 280 130 Z" fill={T.peach}      transform="rotate(-30 280 124)" />
    </G>
  );
}

// =============================================================================
// ─── DISPATCHER ──────────────────────────────────────────────────────────────
// =============================================================================

const REGISTRY: Record<string, () => React.ReactElement> = {
  // Work Stress
  'ws-1': Ws1, 'ws-2': Ws2, 'ws-3': Ws3, 'ws-4': Ws4, 'ws-5': Ws5,
  'ws-6': Ws6, 'ws-7': Ws7, 'ws-8': Ws8, 'ws-9': Ws9, 'ws-10': Ws10,
  // Anxiety
  'an-1': An1, 'an-2': An2, 'an-3': An3, 'an-4': An4, 'an-5': An5,
  'an-6': An6, 'an-7': An7, 'an-8': An8, 'an-9': An9, 'an-10': An10,
  // Depression
  'dp-1': Dp1, 'dp-2': Dp2, 'dp-3': Dp3, 'dp-4': Dp4, 'dp-5': Dp5,
  'dp-6': Dp6, 'dp-7': Dp7, 'dp-8': Dp8, 'dp-9': Dp9, 'dp-10': Dp10,
  // Addiction
  'ad-1': Ad1, 'ad-2': Ad2, 'ad-3': Ad3, 'ad-4': Ad4, 'ad-5': Ad5,
  'ad-6': Ad6, 'ad-7': Ad7, 'ad-8': Ad8, 'ad-9': Ad9, 'ad-10': Ad10,
  // Motivation
  'mo-1': Mo1, 'mo-2': Mo2, 'mo-3': Mo3, 'mo-4': Mo4, 'mo-5': Mo5,
  'mo-6': Mo6, 'mo-7': Mo7, 'mo-8': Mo8, 'mo-9': Mo9, 'mo-10': Mo10,
  // Self-Love
  'sl-1': Sl1, 'sl-2': Sl2, 'sl-3': Sl3, 'sl-4': Sl4, 'sl-5': Sl5,
  'sl-6': Sl6, 'sl-7': Sl7, 'sl-8': Sl8, 'sl-9': Sl9, 'sl-10': Sl10,
};

// Per-category bg scheme (sets the accent blob colour).
const CATEGORY_BG: Record<string, BgScheme> = {
  'work-stress': 'ember',
  'anxiety':     'cyan',
  'depression':  'fog',
  'addiction':   'pink',
  'motivation':  'peach',
  'self-love':   'pink',
};

interface ArticleArtProps {
  id?: string;
  category: ResourceCategory;
  height: number;
  /** Override for the fallback icon size when no bespoke art exists. */
  iconSize?: number;
}

/**
 * Renders the bespoke editorial illustration for a given article id.
 * Falls back to the category gradient + icon when an id has no entry.
 */
export function ArticleArt({ id, category, height, iconSize = 28 }: ArticleArtProps) {
  const Inner = id ? REGISTRY[id] : undefined;
  const scheme = CATEGORY_BG[category.key] ?? 'peach';

  if (!Inner) {
    // Fallback — matches the original ArtBlock look (gradient + category icon).
    return (
      <View style={[styles.wrap, { height }]}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 480 320" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <LinearGradient id="art-fallback" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={category.bgColor} stopOpacity={1} />
              <Stop offset="1" stopColor="rgba(255,255,255,0.10)" stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="480" height="320" fill="url(#art-fallback)" />
        </Svg>
        <View style={styles.iconPill}>
          <MaterialCommunityIcons
            name={category.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
            size={iconSize}
            color={category.iconColor}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 480 320" preserveAspectRatio="xMidYMid slice">
        <Bg scheme={scheme} />
        <Inner />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: T.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPill: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
