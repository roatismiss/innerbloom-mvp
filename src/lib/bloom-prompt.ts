// The Bloom system prompt is the runtime source of truth in
// supabase/functions/bloom-chat/index.ts (BLOOM_SYSTEM_PROMPT).
// This file holds only the client-facing types + UI data referenced by it.

export type BloomCard =
  | { type: 'breathing'; name: string; duration_sec: number }
  | { type: 'reflection'; prompt: string }
  | { type: 'mood_picker'; options: string[] }
  | { type: 'crisis_resources' };

export const BLOOM_CRISIS_RESOURCES_PH = [
  { name: 'HOPELINE PH',           numbers: ['(02) 8804-4673', '0917-558-4673'] },
  { name: 'NCMH Crisis Hotline',   numbers: ['1553', '0917-899-8727'] },
  { name: 'In Touch Crisis Line',  numbers: ['(02) 8893-7603'] },
  { name: 'Immediate danger',      numbers: ['911'] },
] as const;
