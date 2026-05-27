import { create } from 'zustand';

import type { EmotionCategory, LookingFor } from '../types/database';

// ============================================================================
// Soul Match quiz — in-memory draft across the 4 steps.
// ============================================================================
// Step 1 (index)   → energy bucket (id) → maps to current_feeling
// Step 2           → connection style (id) → maps to looking_for
// Step 3           → interests (multi-select, 3+ required)
// Step 4           → primary goal (id) → goes into prompt_answer
// step-4 then submits via submit_soul_match_quiz, then finding.tsx fires
// find-soul-match.
// ============================================================================

// ── Step 1: emotional energy → current_feeling + energy_level seed ──────────
export type Step1EnergyId = 'radiant' | 'quiet' | 'healing' | 'inspired';

export const ENERGY_TO_FEELING: Record<Step1EnergyId, EmotionCategory> = {
  radiant:  'happy',
  quiet:    'neutral',
  healing:  'sad',
  inspired: 'hopeful',
};

export const ENERGY_TO_LEVEL: Record<Step1EnergyId, number> = {
  radiant:  5,
  inspired: 4,
  quiet:    2,
  healing:  2,
};

// ── Step 2: connection style → looking_for ──────────────────────────────────
export type Step2StyleId =
  | 'deep-conversations'
  | 'shared-silence'
  | 'daily-checkins'
  | 'spontaneous-moments';

export const STYLE_TO_LOOKING_FOR: Record<Step2StyleId, LookingFor> = {
  'deep-conversations':  'listener',
  'shared-silence':      'just_presence',
  'daily-checkins':      'similar_story',
  'spontaneous-moments': 'perspective',
};

// ── Step 4: primary goal → human-readable prompt fragment ───────────────────
export type Step4GoalId =
  | 'mutual-support'
  | 'shared-learning'
  | 'accountability'
  | 'friendly';

export const GOAL_LABEL: Record<Step4GoalId, string> = {
  'mutual-support':  'mutual support',
  'shared-learning': 'shared learning',
  'accountability':  'accountability',
  'friendly':        'friendly presence',
};

// ── Store ───────────────────────────────────────────────────────────────────
type SoulMatchDraft = {
  energyId:   Step1EnergyId | null;
  styleId:    Step2StyleId | null;
  interests:  string[];           // step 3, IDs
  goalId:     Step4GoalId | null;
  setEnergy:    (id: Step1EnergyId) => void;
  setStyle:     (id: Step2StyleId) => void;
  setInterests: (ids: string[]) => void;
  setGoal:      (id: Step4GoalId) => void;
  reset: () => void;
};

const initial = {
  energyId:  null as Step1EnergyId | null,
  styleId:   null as Step2StyleId | null,
  interests: [] as string[],
  goalId:    null as Step4GoalId | null,
};

export const useSoulMatchDraft = create<SoulMatchDraft>((set) => ({
  ...initial,
  setEnergy:    (energyId) => set({ energyId }),
  setStyle:     (styleId)  => set({ styleId }),
  setInterests: (interests) => set({ interests }),
  setGoal:      (goalId)   => set({ goalId }),
  reset: () => set(initial),
}));

// ── Helper: build the RPC payload from current draft ────────────────────────
export type SoulMatchPayload = {
  current_feeling: EmotionCategory;
  looking_for: LookingFor;
  energy_level: number;     // 1-5
  openness_level: number;   // 1-5
  prompt_answer: string;
};

export function draftToPayload(draft: SoulMatchDraft): SoulMatchPayload | null {
  if (!draft.energyId || !draft.styleId) return null;

  const current_feeling = ENERGY_TO_FEELING[draft.energyId];
  const looking_for     = STYLE_TO_LOOKING_FOR[draft.styleId];
  const energy_level    = ENERGY_TO_LEVEL[draft.energyId];

  // Openness scales with interest variety. 0-2 interests → 1, 3 → 3, 4 → 4, 5+ → 5.
  const n = draft.interests.length;
  const openness_level =
    n >= 5 ? 5 :
    n === 4 ? 4 :
    n === 3 ? 3 :
    n === 2 ? 2 :
    1;

  const goalLabel = draft.goalId ? GOAL_LABEL[draft.goalId] : 'gentle connection';
  const interestsTxt = draft.interests.length > 0
    ? draft.interests.join(', ')
    : 'an open mind';

  const prompt_answer =
    `Hoping for ${goalLabel}. Drawn to ${interestsTxt}.`.slice(0, 500);

  return { current_feeling, looking_for, energy_level, openness_level, prompt_answer };
}
