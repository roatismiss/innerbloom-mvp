# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Design System — InnerBloom

This is the canonical design spec. Every screen must match it exactly. No deviations.

## Color Tokens

```
primary:              #994531
primaryContainer:     #e8836b    ← CTA button backgrounds
onPrimaryContainer:   #641e0e    ← CTA button text
secondaryContainer:   #90f2fc    ← active toggle tab
onSecondaryContainer: #006f77
surface:              #fff8f6    ← page background
surfaceContainerLowest: #ffffff  ← card backgrounds
surfaceContainer:     #ffe9e4    ← input backgrounds
surfaceContainerLow:  #fff1ed    ← toggle track background
surfaceContainerHigh: #ffe2db
primaryFixed:         #ffdad2
secondaryFixed:       #90f2fc
onSurface:            #281814    ← primary text
onSurfaceVariant:     #55433e    ← secondary text
outlineVariant:       #dbc1bb    ← borders, inactive dots
outline:              #88726d    ← muted text
tertiary:             #a8315c    ← links
```

## Typography

- **Headlines / labels / UI text**: `NunitoSans_600SemiBold` or `NunitoSans_400Regular`
- **Display / decorative**: `Fraunces_600SemiBold` (editorial moments only)
- **Loaded in _layout.tsx**: Fraunces 400/600/italic + NunitoSans 400/500/600

## Spacing & Radius

- Container padding: 24px horizontal
- Card padding: 32px
- Input height: 56px, borderRadius: 16
- Button height: 56px, borderRadius: 9999 (pill)
- Card borderRadius: 32px
- Section gap: 32px, stack gap: 16px

## Component Patterns

### Inputs
- Background: `surfaceContainer (#ffe9e4)`
- Height: 56px, borderRadius: 16, paddingHorizontal: 24
- Font: NunitoSans_400Regular, 16px, color: onSurface
- Placeholder color: outlineVariant

### CTA Buttons
- Background: `primaryContainer (#e8836b)`
- Text: `onPrimaryContainer (#641e0e)`, uppercase, letterSpacing 0.8
- Font: NunitoSans_600SemiBold, 14px
- Shadow: `shadowColor: #994531`, opacity 0.2, radius 16

### Social / Outline Buttons
- Border: `outlineVariant (#dbc1bb)`, width 1
- Height: 56px, borderRadius: 9999
- Text: onSurfaceVariant, NunitoSans_600SemiBold 14px

### Toggle Tab (Sign Up / Login)
- Track: surfaceContainerLow, borderRadius 9999, padding 6
- Active tab: secondaryContainer (#90f2fc), active text: onSecondaryContainer
- Inactive text: onSurfaceVariant

### Background Blobs
Three soft organic circles behind every auth/onboarding screen:
- Top-left: secondaryFixed (#90f2fc), 380×380, opacity 0.55
- Mid-right: surfaceContainerHigh (#ffe2db), 280×280, opacity 0.55
- Bottom: primaryFixed (#ffdad2), 460×460, opacity 0.55
- No blur filter needed — opacity alone gives the soft look

### Pagination Dots
- Active: width 32, height 8, borderRadius 4, color primary (#994531)
- Inactive: width 8, height 8, borderRadius 4, color outlineVariant (#dbc1bb)

## Onboarding Screen

- Hero image: 60% of screen height, full width, `contentFit="cover"`
- Content area: flex 1, centered, paddingH 28, paddingTop 32
- Title: NunitoSans_600SemiBold 17px (small, label-like)
- Body: NunitoSans_400Regular 22px (large, dominant)
- Skip button: absolute top-right, `rgba(255,255,255,0.88)` pill
- Slide backgrounds alternate: surface (#fff8f6) and surfaceContainerLow (#fff1ed)

## Home Screen — `src/app/(main)/feed.tsx`

**This is the most important screen in the app.** The canonical reference lives at
[`design/home-screen.html`](design/home-screen.html) — that file is the source of
truth. Match it exactly.

Section order, top to bottom:

1. **Top App Bar** — fixed, `bg-surface/90` with blur, border-bottom `surfaceContainer`, 80px tall.
   - Left: 44×44 avatar with `border-2 border-primary/20`, green online-dot bottom-right (12px, surface border).
   - Brand stack: "InnerBloom" (NunitoSans 600, 18px, primary) + "Premium Member" (12px, onSurfaceVariant).
   - Right: notifications icon with `error` dot top-right, settings icon. Both 40×40.

2. **Greeting** — `Good morning, {name}` (32/40, NunitoSans 600, onSurface, -0.32 letter-spacing).
   - Subtitle: sun icon + "A clear sky and a calm mind await you today." (16px, onSurfaceVariant 80%).

3. **Today's Focus card** — `bg-primary/5` w/ `border-primary/10`, 20px radius, p-5, row layout.
   - 48×48 `bg-primary/10` circle with `target` icon.
   - Center: "TODAY'S FOCUS" uppercase tracking-wider 12px primary, then "Setting Kind Intentions" (18px headline).
   - Pill CTA: `bg-primary` "Start", white text, label-md 14/20.

4. **Mood + Trend card** — `bg-surfaceContainerLow` 24px radius, p-6, soft-shadow, white/40 border.
   - Heading "How are you blooming?" (20/28, NunitoSans 600).
   - 5 mood buttons row: Radiant / Good / Steady / Tired / Low (filled material `sentiment_*` icons).
     - Idle: 48×48 `bg-surfaceContainer` circle, onSurfaceVariant text.
     - Active: 56×56 `bg-primaryContainer` w/ `ring-4 ring-primaryContainer/30`, label is primary + bold.
   - Divider line (outlineVariant/30, 1px), then 7-bar mini chart (M T W T F S S, 64px tall).
     - Past days: bars in `primary/20` → `primary/40` → `primary/60` (more recent = darker).
     - Future days (S, S): `surfaceContainer`, label opacity 30%.
   - Caption below: "Your mood has been improving consistently this week." (12px, center).

5. **Quick Care** — heading "Quick Care" (20/28 NunitoSans 600), then 2×2 grid of action cards.
   - Each card: white bg, `surfaceContainerHigh` border, 16px radius, p-4, soft-shadow.
   - 40×40 colored icon circle (tinted by category) + label below.
   - Tiles: `Log Mood` (secondary/cyan), `Start Journal` (tertiary/pink), `Breathing` (primary/peach), `Emergency Calm` (error/red — label bold, error color).

6. **Bloom AI Insight card** — `bg-surfaceContainerHighest/50`, p-6, 16px radius, blurred primary glow bottom-right.
   - `auto_awesome` icon (24px primary) at top.
   - Italic Fraunces body-lg 18/28.8 center-aligned: the affirmation copy.
   - Footer pill: avatar + "Insight from Bloom AI" on `white/60` w/ blur.

7. **Your Journey** — 2-card grid, white bg, surfaceContainerHigh border.
   - Card 1: 🌱 emoji (allowed here per design ref) → "7 Days" (24/32, primary) → "CURRENT STREAK" label.
   - Card 2: `task_alt` icon (tertiary, 36px) → "Quest" → "MINDFULNESS WEEK".

8. **Upcoming Circles** — heading row with "Join Queue" link.
   - Each row: 48×48 date badge (today=secondaryContainer, future=surfaceContainer), title + attendees, chevron_right.

9. **Recommended** — heading row with "See All" link, horizontal scroll of 256×auto cards.
   - 128px image w/ "10 MIN" / "PROMPT" pill badge top-right.
   - Title (label-md 14px) + sub (body-sm 14px) in p-4 body.

10. **FAB** — `bg-primary` 56×56 chat-bubble pill, fixed bottom-right above tab bar (bottom: 112px, right: 24px).

### Implementation notes (RN translation)

- Container: 24px paddingHorizontal, max-width 600 centered, paddingTop: insets.top + 80 (header height).
- Section gap: 32px (`stack-gap-lg`).
- "Soft shadow" everywhere = `shadowColor #5C4742`, opacity 0.08, radius 24, offset 0,8.
- Use `MaterialCommunityIcons` (icon name → MCI equivalent below). Never use Material Symbols web font.
  - `notifications` → `bell-outline`
  - `settings` → `cog-outline`
  - `wb_sunny` → `white-balance-sunny`
  - `target` → `target`
  - `sentiment_very_satisfied` → `emoticon-excited-outline`
  - `sentiment_satisfied` → `emoticon-happy-outline`
  - `sentiment_neutral` → `emoticon-neutral-outline`
  - `sentiment_dissatisfied` → `emoticon-sad-outline`
  - `sentiment_very_dissatisfied` → `emoticon-cry-outline`
  - `add_reaction` → `emoticon-plus-outline`
  - `edit_note` → `note-edit-outline`
  - `air` → `weather-windy`
  - `emergency_home` → `home-heart`
  - `auto_awesome` → `auto-fix`
  - `task_alt` → `check-decagram`
  - `chevron_right` → `chevron-right`
  - `chat_bubble` → `message-outline`
- The 🌱 emoji in the streak card is intentionally allowed (it's the only emoji in the screen and the HTML uses it deliberately as a hero element).

## Auth Screen (Login / Sign Up)

- Single screen with tab toggle — no separate routes for sign-up
- Logo badge: 64×64, borderRadius 16, primaryContainer bg, MaterialCommunityIcons `head-heart-outline`
- Brand name: NunitoSans_600SemiBold 24px, primary color
- Tagline: NunitoSans_400Regular 16px, onSurfaceVariant
- Footer quote: italic, outline color

## Screen Routing

```
App open
  ├─ Not authenticated  → /onboarding (hero slides)
  │                         └─ "Get Started" → /(auth)/login
  └─ Authenticated
       ├─ New user       → /onboarding/setup (questionnaire)
       │                     └─ "Next" / "Skip for now" → /(main)/checkin
       └─ Returning user → /(main)/checkin

Auth flow (/(auth)/login)
  ├─ Sign Up success → /onboarding/setup
  └─ Log In success  → /(main)/checkin
```

## Rules

1. Never use emoji in UI — always use vector icons (`@expo/vector-icons`)
2. Never use `Dimensions.get('window')` at module level — use `useWindowDimensions()` hook
3. `borderRadius: 0` on inputs is always wrong — use 16
4. Background color is `#fff8f6`, never `#FFF5F0`
5. All text must use loaded font families (NunitoSans_* or Fraunces_*)
6. Design quality bar: Apple-grade. Every screen should look agency-built.
