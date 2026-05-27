-- ============================================================================
-- InnerBloom — Bloom reels: ambient audio loops
-- ============================================================================
-- Adds a soft ambient soundtrack to each reel. Audio assets ship inside the
-- app bundle (assets/audio/*.mp3) — the DB only stores a key the client maps
-- to a bundled file via REEL_AUDIO_TRACKS in src/lib/audio/reel-audio.ts.
--
-- Why a key, not a URL:
--   - The 4 loops are universal and never change per reel; bundling them
--     keeps reels feeling instant (no network warm-up before audio fades in).
--   - Storing a URL would also force CDN egress on every play.
--
-- Why nullable:
--   - Legacy reels stay valid without audio while we backfill.
--   - The ReelCard treats `null` as silent (no player created, mute UI hidden).
--
-- The today_for_me() RPC already does `select *` from bloom_reels, so the new
-- column is picked up automatically with no RPC changes.
-- ============================================================================

begin;

alter table bloom_reels
  add column if not exists audio_key text
    check (audio_key is null or audio_key in (
      'ambient',
      'rainforest',
      'fireplace',
      'relaxing_guitar',
      'relaxing_water',
      'asmr_anxiety'
    ));

-- Backfill existing seeded reels with a sensible default per category, so the
-- pilot screens hear sound out of the gate. Categories map to moods, so the
-- pairing is opinionated:
--
--   anxiety_stillness    → asmr_anxiety    (targeted nervous-system regulation)
--   depression_hope      → ambient         (warm tonal pad, no rhythm)
--   motivation_direction → relaxing_water  (open, forward-feeling flow)
--   financial_clarity    → ambient         (neutral, doesn't romanticize stress)
--   breaking_patterns    → fireplace       (intimate, ritual energy)
--   rest_recovery        → relaxing_guitar (gentle, intimate, slow)
update bloom_reels
   set audio_key = case category
                     when 'anxiety_stillness'    then 'asmr_anxiety'
                     when 'depression_hope'      then 'ambient'
                     when 'motivation_direction' then 'relaxing_water'
                     when 'financial_clarity'    then 'ambient'
                     when 'breaking_patterns'    then 'fireplace'
                     when 'rest_recovery'        then 'relaxing_guitar'
                   end
 where audio_key is null;

commit;
