// Re-export all DB-level types
export type {
  Database,
  Tables,
  InsertTables,
  EmotionCategory,
  ReelCategory,
  ReelAudioKey,
  MatchStatus,
  InstitutionType,
  HugContextType,
  ProfileRow,
  MoodCheckinRow,
  BloomPostRow,
  ResonanceRow,
  SoulMatchRow,
  BloomReelRow,
  HugRow,
} from './database';

// ----------------------------------------------------------------------------
// Application-layer view models (used in UI — mapped from DB rows)
// ----------------------------------------------------------------------------

export type EmotionalState = {
  colorHex: string;
  intensity: number;
  anchorWord: string;
  category: import('./database').EmotionCategory;
};

export type User = {
  id: string;
  anonymousAlias: string;
  city?: string;
  institution?: string;
  institutionType?: 'bpo' | 'university';
  currentMood?: EmotionalState;
  createdAt: string;
};

export type BloomPost = {
  id: string;
  sentence: string;
  colorHex: string;
  anchorWord: string;
  resonanceCount: number;
  didResonate?: boolean;
  createdAt: string;
};

export type SoulMatch = {
  id: string;
  matchedUserId: string;
  matchedAlias: string;
  resonanceScore: number;
  sharedEmotion: import('./database').EmotionCategory;
  status: import('./database').MatchStatus;
  createdAt: string;
};

export type BloomReel = {
  id: string;
  category: import('./database').ReelCategory;
  content: string;
  colorHex: string;
  durationMs: number;
  authorAlias: string;
};

export type HugGarden = {
  totalHugs: number;
  flowerCount: number;
  lastReceivedAt?: string;
};
