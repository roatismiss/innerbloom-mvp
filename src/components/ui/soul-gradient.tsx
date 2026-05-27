import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { emotions, type Emotion } from '@/constants/theme';

export interface SoulGradientProps {
  emotion: Emotion;
  width: number;
  height: number;
}

// Abstract gradient + soft contour lines. Color is sampled from the user's
// current emotion — never a fixed brand color. The curves are the only
// decorative element this design system allows, and only because they sit
// inside the hero card representing a shared emotional state.
export function SoulGradient({ emotion, width, height }: SoulGradientProps) {
  const { from, to } = emotions[emotion];
  const w = width;
  const h = height;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} stopOpacity="0.95" />
          <Stop offset="1" stopColor={to} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect width={w} height={h} fill="url(#bg)" />
      <Path
        d={`M0 ${h * 0.28} Q ${w * 0.4} ${h * 0.44} ${w} ${h * 0.32}`}
        stroke="#FFFFFF"
        strokeOpacity={0.22}
        strokeWidth={1}
        fill="none"
      />
      <Path
        d={`M0 ${h * 0.55} Q ${w * 0.55} ${h * 0.72} ${w} ${h * 0.58}`}
        stroke="#FFFFFF"
        strokeOpacity={0.16}
        strokeWidth={1}
        fill="none"
      />
      <Path
        d={`M0 ${h * 0.82} Q ${w * 0.5} ${h * 0.94} ${w} ${h * 0.86}`}
        stroke="#FFFFFF"
        strokeOpacity={0.1}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}
