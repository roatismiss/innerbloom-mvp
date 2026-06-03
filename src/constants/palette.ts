// ─────────────────────────────────────────────────────────────────────────────
// InnerBloom — single source of truth for the product color system.
//
// WHY THIS FILE EXISTS
// Every screen used to copy the same ~25-line `const C = {…}` block inline.
// That duplication (a) drifted — `onSurfaceVariant` was `#55443e` in login.tsx
// but `#55433e` everywhere else — and (b) made any palette change a 30-file
// edit. Centralizing here means a single value fixes all screens at once.
//
// Screens import this as:  `import { ui as C } from '@/constants/palette';`
// so the existing `C.token` call-sites keep working verbatim.
//
// `ui` is the union of every token name any screen referenced, so it is a
// safe drop-in for every local `C`. Extra keys a given screen doesn't use are
// harmless.
// ─────────────────────────────────────────────────────────────────────────────

export const ui = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  surface:                 '#fff8f6', // page background
  surfaceContainerLowest:  '#ffffff', // card backgrounds
  surfaceLowest:           '#ffffff', // alias used by login.tsx
  surfaceContainerLow:     '#fff1ed', // toggle track / soft cards
  surfaceLow:              '#fff1ed', // alias used by login.tsx
  surfaceContainer:        '#ffe9e4', // input backgrounds
  surfaceContainerHigh:    '#ffe2db', // borders / raised tint
  surfaceHigh:             '#ffe2db', // alias used by login.tsx
  surfaceContainerHighest: '#fadcd5',
  surfaceVariant:          '#fadcd5',

  // ── Brand / primary (terracotta) ───────────────────────────────────────────
  primary:               '#994531', // brand text, links, icons
  onPrimary:             '#ffffff',
  primaryContainer:      '#e8836b', // CTA button backgrounds
  onPrimaryContainer:    '#641e0e', // CTA button text
  primaryFixed:          '#ffdad2',
  primaryFixedVariant:   '#7a2e1d',
  onPrimaryFixed:        '#3d0600',
  onPrimaryFixedVariant: '#7a2e1d',

  // ── Secondary (RETUNED) ─────────────────────────────────────────────────────
  // Was the neon `#90f2fc` cyan, which read as out-of-palette against the warm
  // peach surfaces (the tab bar already worked around it). Replaced with a calm
  // seafoam aqua that still reads as a cool counterpoint but belongs in the
  // family and survives bright outdoor light (PH pilot). Text token darkened so
  // onSecondary copy passes WCAG AA (`#0e4d49` on `#b8e6e0` ≈ 7.0:1).
  secondary:             '#0e4d49',
  secondaryContainer:    '#b8e6e0',
  onSecondaryContainer:  '#0e4d49',
  secondaryFixed:        '#b8e6e0',
  onSecondaryFixed:      '#063b37',

  // ── Tertiary (pink accents / links) ─────────────────────────────────────────
  tertiary:            '#a8315c',
  tertiaryContainer:   '#fa719c',
  onTertiaryContainer: '#700034',
  tertiaryFixedDim:    '#ffb1c4',

  // ── Text / lines ─────────────────────────────────────────────────────────────
  onSurface:        '#281814', // primary text  (≈15:1 on surface — AAA)
  onSurfaceVariant: '#55433e', // secondary text (8.86:1 — AAA). Fixes login typo.
  outline:          '#88726d', // muted text / large labels
  outlineVariant:   '#dbc1bb', // borders, inactive dots — NEVER body/placeholder text
  // Accessible placeholder: `#dbc1bb` on the `#ffe9e4` input was 1.46:1 (invisible).
  // `#7a635c` on `#ffe9e4` ≈ 4.8:1 — passes AA.
  placeholder:      '#7a635c',

  // ── State ────────────────────────────────────────────────────────────────────
  error:           '#ba1a1a',
  errorContainer:  '#ffdad6',
  onErrorContainer:'#410e0b',
  online:          '#16a34a',
} as const;

export type UiToken = keyof typeof ui;

// ─────────────────────────────────────────────────────────────────────────────
// Emotion / category accents — harmonized.
//
// The Community circle tiles used a saturated rainbow (`#FF6B4A #9B59B6 #5DADE2
// #27AE60 #E91E63 #00BCD4`) — generic Flat-UI/Material hues that clashed with
// the curated peach palette and read like a kids' category grid. These are the
// muted, deeper tones from the emotional family: each stays distinct, white
// glyphs on them stay legible (≥3:1, graphical), and they sit inside the brand
// world instead of fighting it.
// ─────────────────────────────────────────────────────────────────────────────

export const emotionAccent = {
  anxiety:     '#c97548', // warm terracotta
  depression:  '#5e759a', // deep slate blue
  grief:       '#6e8ca8', // muted blue
  recovery:    '#4e9e6a', // grounded green
  burnout:     '#b06a8a', // muted rose
  mindfulness: '#5ba0b8', // deep aqua (matches the retuned secondary family)
} as const;

export type EmotionAccentKey = keyof typeof emotionAccent;

// ─────────────────────────────────────────────────────────────────────────────
// Dark scheme (warm, not gray).
//
// NOTE: most screens declare their colors at module scope inside
// `StyleSheet.create`, which can't switch at runtime. These tokens are the
// agreed target for the dark rollout — screens migrated to dynamic styles
// (colors read inside the component) consume `uiDark`. Terracotta is lifted so
// it keeps contrast on dark surfaces; CTA text flips dark on the peach fill.
// ─────────────────────────────────────────────────────────────────────────────

export const uiDark = {
  surface:                 '#19120f',
  surfaceContainerLowest:  '#140e0c',
  surfaceLowest:           '#140e0c',
  surfaceContainerLow:     '#241a17',
  surfaceLow:              '#241a17',
  surfaceContainer:        '#2c201c',
  surfaceContainerHigh:    '#372824',
  surfaceHigh:             '#372824',
  surfaceContainerHighest: '#42302b',
  surfaceVariant:          '#42302b',

  primary:               '#f0a78f', // lifted terracotta for dark-bg contrast
  onPrimary:             '#2a0e06',
  primaryContainer:      '#e8836b',
  onPrimaryContainer:    '#2a0e06',
  primaryFixed:          '#5c2417',
  primaryFixedVariant:   '#ffb5a3',
  onPrimaryFixed:        '#ffdad2',
  onPrimaryFixedVariant: '#ffb5a3',

  secondary:             '#9fd6cf',
  secondaryContainer:    '#234b47',
  onSecondaryContainer:  '#bdeae3',
  secondaryFixed:        '#234b47',
  onSecondaryFixed:      '#bdeae3',

  tertiary:            '#ffb1c4',
  tertiaryContainer:   '#8b274f',
  onTertiaryContainer: '#ffd9e2',
  tertiaryFixedDim:    '#8b274f',

  onSurface:        '#f3e9e4',
  onSurfaceVariant: '#d8c4bd',
  outline:          '#a6928c',
  outlineVariant:   '#52403b',
  placeholder:      '#a6928c',

  error:           '#ffb4ab',
  errorContainer:  '#5c1410',
  onErrorContainer:'#ffdad6',
  online:          '#4ade80',
} as const;

export type UiScheme = typeof ui;
