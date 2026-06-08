import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AgeBand } from '../types/database';

// ─────────────────────────────────────────────────────────────────────────────
// Age gate — self-declared 16+ check, shown once as the very first step.
//
// WHY LOCAL-ONLY
// The declared date of birth never leaves the device. We keep it (a) to remember
// the verdict across cold starts so a verified user is never re-prompted, and
// (b) to recompute age if MIN_AGE ever changes. It is the only piece of identity
// the app stores locally and it is deliberately NOT mirrored to the server —
// only the pass/block verdict matters for routing.
//
// This is a soft, self-declared gate (the App Store / Play Store standard for a
// non-regulated wellness app). It is not identity verification.
// ─────────────────────────────────────────────────────────────────────────────

export const MIN_AGE = 16;

export type AgeStatus =
  | 'unknown' // no date of birth on file yet — show the gate
  | 'allowed' // declared age ≥ MIN_AGE
  | 'blocked'; // declared age < MIN_AGE — locked out on this device

type AgeGateState = {
  /** Locally-stored date of birth, ISO `YYYY-MM-DD`. Never leaves the device. */
  birthDate: string | null;
  status: AgeStatus;
  /** True once the persisted value has rehydrated — routing must wait for this. */
  hydrated: boolean;
  /** Records the declared DOB, computes the verdict, and returns it. */
  setBirthDate: (iso: string) => AgeStatus;
  reset: () => void;
};

// Whole-year age from an ISO date, accounting for whether this year's birthday
// has already passed. Uses the real device clock at call time.
export function ageFromISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  const beforeBirthday =
    now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

// Coarse age band for demographics — DERIVED from the gate's stored DOB so we
// never ask for age twice. Bands start at 16-17 (the gate floor); returns null
// for under-16 (shouldn't happen past the gate) or a malformed date.
export function ageBandFromISO(iso: string): AgeBand | null {
  const age = ageFromISO(iso);
  if (age < 16) return null;
  if (age <= 17) return '16-17';
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  return '45+';
}

export const useAgeGate = create<AgeGateState>()(
  persist(
    (set) => ({
      birthDate: null,
      status: 'unknown',
      hydrated: false,
      setBirthDate: (iso) => {
        const status: AgeStatus = ageFromISO(iso) >= MIN_AGE ? 'allowed' : 'blocked';
        set({ birthDate: iso, status });
        return status;
      },
      reset: () => set({ birthDate: null, status: 'unknown' }),
    }),
    {
      name: 'innerbloom.age-gate.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the DOB + verdict are durable; `hydrated` is a runtime-only flag.
      partialize: (s) => ({ birthDate: s.birthDate, status: s.status }),
      // Flip `hydrated` true whether rehydration succeeds OR errors — otherwise a
      // storage fault would leave the splash waiting on the gate forever.
      onRehydrateStorage: () => () => {
        useAgeGate.setState({ hydrated: true });
      },
    },
  ),
);
