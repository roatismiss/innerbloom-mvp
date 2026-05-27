# Design References — InnerBloom

This folder holds the **canonical HTML reference files** for each screen.
They are the source of truth. The React Native implementations in
`src/app/**/*.tsx` must match these files exactly (layout, color, type,
spacing, interaction). If the design changes, update the HTML reference
**first**, then port the change to the RN screen.

| File                              | RN Screen                              | Approved      |
| --------------------------------- | -------------------------------------- | ------------- |
| `home-screen.html`                | `src/app/(main)/feed.tsx`              | 2026-05-25    |
| `soul-matching-quiz-step-1.html`  | `src/app/match/index.tsx`              | 2026-05-26    |
| `soul-matching-quiz-step-2.html`  | `src/app/match/step-2.tsx`             | 2026-05-26    |
| `soul-matching-quiz-step-3.html`  | `src/app/match/step-3.tsx`             | 2026-05-26    |
| `soul-matching-quiz-step-4.html`  | `src/app/match/step-4.tsx`             | 2026-05-26    |
| `soul-matching-finding.html`      | `src/app/match/finding.tsx`            | 2026-05-26    |
| `bloom-ai-chat.html`              | `src/app/(main)/bloom.tsx`             | 2026-05-26    |
| `emotional-journal.html`          | `src/app/(main)/journal.tsx`           | 2026-05-26    |
| `breathi-in-exercise.html`        | `src/app/(main)/breathing.tsx`         | 2026-05-26    |
| `soul-matching-conversation.html` | `src/app/match/conversation.tsx`       | 2026-05-26    |

## Soul Matching flow

The "Soul Matching" zone is a multi-step experience. Screens live under
the top-level `src/app/match/` Stack (deliberately outside the `(main)`
tabs so the regular tab bar is hidden during the flow). Reference HTML
files are prefixed `soul-matching-*` and the user **must** be matched 1:1
— no liberties.

1. `soul-matching-quiz-step-1.html` → `src/app/match/index.tsx` —
   *"How would you describe your current emotional energy?"* — Step 1 of
   4. Progress bar (25%), 4 option cards (icon + title + description),
   decorative quote card, fixed-bottom Continue button.
2. `soul-matching-quiz-step-2.html` → `src/app/match/step-2.tsx` —
   *"Communication Style"* — Step 2 of 4. Back-only top bar (no close),
   50% progress bar with shimmer overlay (h-3 / 12px tall, primary-container fill),
   4 option cards w/ check_circle indicator on selection, full primary-container
   fill on selected state, 192px decorative image w/ gradient overlay quote,
   primary-container Continue button.
3. `soul-matching-quiz-step-3.html` → `src/app/match/step-3.tsx` —
   *"What topics resonate with you most right now?"* — Step 3 of 4.
   Multi-select bento grid (2 full-width hero cards + 4 half-width chips),
   75% progress bar with bouncy `progress-bloom` spring transition, two
   pink floating orbs drifting in the background, "Need help? Skip for now"
   glass pill at the bottom. Continue enables at ≥3 selections.
4. `soul-matching-quiz-step-4.html` → `src/app/match/step-4.tsx` —
   *"What is your primary goal for this connection?"* — Step 4 of 4. Back
   + close top bar (close icon uses on-surface-variant, NOT primary).
   Thin 6px progress bar fills 0→100% with a 1.5s bouncy bezier on mount,
   big "100%" label in headline-sm primary. Single-select cards with
   subtle peach selection state (primary-fixed bg + primary-container
   border, NO white text or scale — gentlest selection state in the flow).
   Soft pulsing decorative blob (128×128 linear-gradient circle) below
   options. Footer has a vertical bg-gradient fade from transparent at
   top to surface opaque at bottom, holding a tall (h-16 = 64px)
   primary-container CTA "Find My Kindred Spirits" with sparkles icon.
5. `soul-matching-finding.html` → `src/app/match/finding.tsx` —
   *Finding your kindred spirits* (v2, redesigned 2026-05-26). Full-screen,
   no top bar. Mesh background + 2 corner blur blobs + 2 concentric
   pulse-rings + 1 morphing/rotating organic "resonance field"
   (peach→pink→cyan linear gradient with 40px blur, 12s shape-shifting
   loop) + 96px white center orb with a **filled heart** icon. Big
   primary headline. Progress bar (12px on surface-container-highest,
   glowing primary-container fill) ticks toward 99% with an "X%
   HARMONIZED" uppercase label + a pulsing secondary `rebase_edit` icon
   + an italic cycling sub-hint that rotates through community/empathy
   copy (the "your neighbour's problem is your problem" thread).
6. `soul-matching-result.html` → *not yet provided.*

## Why HTML, not Figma

Cursor / Claude can read HTML losslessly. Tailwind utility classes carry
every design token (color, spacing, font weight, radius) inline, so the
agent can translate them directly into RN StyleSheet values without
guessing. PNG/Figma reference loses the type and spacing scale.

## Rules

1. The HTML reference is **immutable** unless the user explicitly approves
   a redesign.
2. If a screen in `src/app/` drifts from its reference, fix the screen,
   not the reference.
3. New screens require a new HTML reference in this folder + an entry in
   the table above before implementation begins.
