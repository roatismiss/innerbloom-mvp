import { Platform, type TextStyle, type ViewStyle } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Linen & Aurora — semantic tokens
// Light is canonical. Dark mirrors structure, not brightness.
// ─────────────────────────────────────────────────────────────────────────────

export const tokens = {
  light: {
    surface: '#FAF7F2',
    surfaceRaised: '#FFFFFF',
    surfaceSunk: '#F3EFE8',
    ink: {
      primary: '#1C1B1A',
      secondary: '#6B6862',
      tertiary: '#A8A29A',
    },
    hairline: 'rgba(28,27,26,0.06)',
    shadow: '#1C1B1A',
  },
  dark: {
    surface: '#14130F',
    surfaceRaised: '#1F1D1A',
    surfaceSunk: '#0E0D0B',
    ink: {
      primary: '#F2EEE6',
      secondary: '#A8A29A',
      tertiary: '#6B6862',
    },
    hairline: 'rgba(242,238,230,0.08)',
    shadow: '#000000',
  },
} as const;

export type Scheme = keyof typeof tokens;

// ─────────────────────────────────────────────────────────────────────────────
// Emotional accents
// Reserved for user-generated moments: 4pt edge accents, pills, dot indicators,
// 12% washes. Never full button fills. Never gradients > 40% of a surface.
// ─────────────────────────────────────────────────────────────────────────────

// Key order matches the schema check constraint on mood_checkins.category.
// `neutral` carries the "calm/mist" visual from the spec — the steady middle.
export const emotions = {
  anxious:  { from: '#C9A8E2', to: '#A985C6', wash: 'rgba(201,168,226,0.12)' },
  sad:      { from: '#7E94B5', to: '#5E759A', wash: 'rgba(126,148,181,0.12)' },
  stressed: { from: '#E89363', to: '#C97548', wash: 'rgba(232,147,99,0.12)' },
  neutral:  { from: '#A8D5E2', to: '#7EB9CC', wash: 'rgba(168,213,226,0.12)' },
  happy:    { from: '#F5C842', to: '#E8A93B', wash: 'rgba(245,200,66,0.12)' },
  hopeful:  { from: '#8FCB9B', to: '#6FAE7C', wash: 'rgba(143,203,155,0.12)' },
} as const;

export type Emotion = keyof typeof emotions;

// ─────────────────────────────────────────────────────────────────────────────
// Geometry — 8pt grid, all values multiples of 4
// ─────────────────────────────────────────────────────────────────────────────

export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48, 16: 64,
} as const;

export const layout = {
  screenPaddingH: 20,
  edgeMin: 24,
  cardPadding: 20,
  cardGap: 12,
  sectionGap: 32,
  touchTarget: 44,
  maxContentWidth: 430,
  tabBarHeight: Platform.select({ ios: 83, android: 65 }) ?? 65,
} as const;

export const radius = {
  card: 20,
  sheet: 28,
  input: 14,
  pill: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Elevation — three levels only. No glow, no colored shadows, no inner shadows.
// ─────────────────────────────────────────────────────────────────────────────

export const elevation = {
  flat: {
    borderWidth: Platform.select({ ios: 0.5, default: 1 }),
    borderColor: tokens.light.hairline,
  } satisfies ViewStyle,
  resting: Platform.select<ViewStyle>({
    ios: {
      shadowColor: tokens.light.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle,
  lifted: Platform.select<ViewStyle>({
    ios: {
      shadowColor: tokens.light.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 8 },
    default: {},
  }) as ViewStyle,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Typography — Fraunces (serif) for display + quote, Nunito Sans for everything
// else. Cross-platform, same font on iOS and Android — design parity matters
// more than native typeface familiarity in this aesthetic.
// Load in _layout.tsx: Fraunces 400 / 600 / 400-italic + NunitoSans 400/500/600.
// ─────────────────────────────────────────────────────────────────────────────

const family = {
  serif: 'Fraunces_600SemiBold',
  serifItalic: 'Fraunces_400Regular_Italic',
  body: 'NunitoSans_400Regular',
  bodyMedium: 'NunitoSans_500Medium',
  bodySemibold: 'NunitoSans_600SemiBold',
} as const;

export const typography = {
  display1: {
    fontFamily: family.serif, fontSize: 34, lineHeight: 40,
    letterSpacing: -0.6, fontWeight: '600',
  } satisfies TextStyle,
  display2: {
    fontFamily: family.serif, fontSize: 28, lineHeight: 34,
    letterSpacing: -0.5, fontWeight: '600',
  } satisfies TextStyle,
  heading: {
    fontFamily: family.bodySemibold, fontSize: 20, lineHeight: 26,
    letterSpacing: -0.2, fontWeight: '600',
  } satisfies TextStyle,
  body: {
    fontFamily: family.body, fontSize: 17, lineHeight: 24,
    letterSpacing: 0, fontWeight: '400',
  } satisfies TextStyle,
  bodyEmphasized: {
    fontFamily: family.bodyMedium, fontSize: 17, lineHeight: 24,
    letterSpacing: 0, fontWeight: '500',
  } satisfies TextStyle,
  footnote: {
    fontFamily: family.body, fontSize: 13, lineHeight: 18,
    letterSpacing: 0.1, fontWeight: '400',
  } satisfies TextStyle,
  caption: {
    fontFamily: family.bodyMedium, fontSize: 11, lineHeight: 14,
    letterSpacing: 0.6, fontWeight: '500', textTransform: 'uppercase',
  } satisfies TextStyle,
  quote: {
    fontFamily: family.serifItalic, fontSize: 22, lineHeight: 32,
    letterSpacing: -0.2, fontWeight: '400', fontStyle: 'italic',
  } satisfies TextStyle,
  wordmark: {
    fontFamily: family.serif, fontSize: 17, lineHeight: 22,
    letterSpacing: 0, fontWeight: '600',
  } satisfies TextStyle,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Motion — breath, not performance. Spring only. No bounce.
// ─────────────────────────────────────────────────────────────────────────────

export const motion = {
  spring: { stiffness: 180, damping: 22, mass: 1 },
  duration: { fast: 200, base: 280, slow: 400 },
  enter: { opacity: { from: 0, to: 1 }, translateY: { from: 8, to: 0 } },
  reduceMotionDuration: 200,
  skeleton: { shimmerMs: 1200, shimmerOpacity: 0.04, minWaitMs: 400 },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Haptics — selection for taps, success/warning for confirmations only.
// Never medium impact on routine actions.
// ─────────────────────────────────────────────────────────────────────────────

export const haptics = {
  selection: 'selection',
  success: 'success',
  warning: 'warning',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Legacy aliases — existing screens read these. Migrate to the tokens above
// when each screen is rewritten against the new design system.
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated use `tokens` */
export const Colors = {
  primary: emotions.stressed.from,
  primaryLight: emotions.stressed.to,
  primaryDark: emotions.stressed.to,
  accentBlue: emotions.neutral.to,
  babyBlue: emotions.neutral.from,
  lightBlue: emotions.neutral.wash,
  background: tokens.light.surface,
  backgroundCard: tokens.light.surfaceRaised,
  backgroundSplash: tokens.dark.surface,
  text: tokens.light.ink.primary,
  textSecondary: tokens.light.ink.secondary,
  textInverse: tokens.light.surfaceRaised,
  border: tokens.light.hairline,
  shadow: 'rgba(28,27,26,0.04)',
  success: emotions.hopeful.from,
  error: emotions.stressed.to,
  transparent: 'transparent',
} as const;

/** @deprecated use `typography` */
export const Fonts = {
  headline: family.serif,
  headlineBold: family.serif,
  body: family.body,
  bodyMedium: family.bodyMedium,
  bodySemiBold: family.bodySemibold,
  bodyBold: family.bodySemibold,
} as const;

/** @deprecated use `type` */
export const FontSizes = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 28, xxxl: 34, display: 34,
} as const;

/** @deprecated use `space` */
export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, section: 64,
} as const;

/** @deprecated use `radius` */
export const Radius = {
  sm: 8, md: 12, lg: 14, xl: 20, pill: 9999, full: 9999,
} as const;

/** @deprecated use `elevation` */
export const Shadows = {
  sm: elevation.resting,
  md: elevation.resting,
  lg: elevation.lifted,
} as const;

/** @deprecated use `layout` */
export const Layout = {
  screenPaddingH: layout.screenPaddingH,
  maxWidth: layout.maxContentWidth,
  tabBarHeight: layout.tabBarHeight,
} as const;

export const MaxContentWidth = layout.maxContentWidth;
export const BottomTabInset = layout.tabBarHeight;
export type ThemeColor = keyof typeof Colors;
