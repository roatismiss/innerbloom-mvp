// ============================================================================
// find-soul-match — Edge Function
// ============================================================================
// Reads caller's soul_match_quiz_responses for today + today's mood,
// scores candidates, inserts the directional match pair + conversation,
// returns { match_id, conversation_id, other_alias, ... } or { status: 'waiting' }.
// ----------------------------------------------------------------------------
// Deploy: supabase functions deploy find-soul-match
// Invoke from client: supabase.functions.invoke('find-soul-match')
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type EmotionCategory =
  | 'anxious' | 'sad' | 'stressed' | 'neutral' | 'happy' | 'hopeful';
type LookingFor =
  | 'listener' | 'similar_story' | 'perspective' | 'just_presence';

type Quiz = {
  user_id: string;
  current_feeling: EmotionCategory;
  looking_for: LookingFor;
  energy_level: number;
  openness_level: number;
};
type Mood = {
  user_id: string;
  category: EmotionCategory;
  intensity: number;
};
type Profile = {
  id: string;
  anonymous_alias: string;
  institution_id: string | null;
};

const SCORE_THRESHOLD = 55;

const ADJACENT: Record<EmotionCategory, EmotionCategory[]> = {
  anxious:  ['stressed', 'sad'],
  sad:      ['anxious', 'hopeful'],
  stressed: ['anxious', 'neutral'],
  neutral:  ['hopeful', 'happy'],
  happy:    ['hopeful', 'neutral'],
  hopeful:  ['happy', 'neutral'],
};

const LF_COMPAT: Record<LookingFor, Record<LookingFor, number>> = {
  listener:        { listener: 0.4, similar_story: 1.0, perspective: 0.7, just_presence: 0.8 },
  similar_story:   { listener: 1.0, similar_story: 0.8, perspective: 0.5, just_presence: 0.7 },
  perspective:     { listener: 0.7, similar_story: 0.5, perspective: 0.9, just_presence: 0.6 },
  just_presence:   { listener: 0.8, similar_story: 0.7, perspective: 0.6, just_presence: 1.0 },
};

function moodScore(a: EmotionCategory, b: EmotionCategory): number {
  if (a === b) return 1;
  if (ADJACENT[a]?.includes(b)) return 0.5;
  return 0;
}

function intensityScore(a: number | null, b: number | null): number {
  if (a == null || b == null) return 0.5;
  return Math.max(0, 1 - Math.abs(a - b) / 4);
}

function institutionScore(a: string | null, b: string | null): number {
  return a && b && a === b ? 1 : 0;
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
      ...init.headers,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'missing bearer token' }, { status: 401 });
  }

  // User-scoped client to identify the caller via JWT.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();

  if (userErr || !user) {
    return jsonResponse({ error: 'unauthenticated' }, { status: 401 });
  }

  // Service-role client for matchmaking writes (bypasses RLS by design).
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const today = new Date().toISOString().slice(0, 10);

  // ── 1. Caller's quiz + mood ──────────────────────────────────────────────
  const { data: myQuiz, error: quizErr } = await admin
    .from('soul_match_quiz_responses')
    .select('user_id, current_feeling, looking_for, energy_level, openness_level')
    .eq('user_id', user.id)
    .eq('quiz_date', today)
    .maybeSingle<Quiz>();

  if (quizErr) return jsonResponse({ error: quizErr.message }, { status: 500 });
  if (!myQuiz) return jsonResponse({ error: 'quiz_required' }, { status: 400 });

  const { data: myMood } = await admin
    .from('mood_checkins')
    .select('user_id, category, intensity')
    .eq('user_id', user.id)
    .eq('checkin_date', today)
    .maybeSingle<Mood>();

  const { data: myProfile } = await admin
    .from('profiles')
    .select('id, anonymous_alias, institution_id')
    .eq('id', user.id)
    .single<Profile>();

  // ── 2. Already matched today? Return existing. ───────────────────────────
  const { data: existing } = await admin
    .from('soul_matches')
    .select('id, user_a_id, user_b_id, shared_category, resonance_score, status')
    .eq('match_date', today)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq('status', 'connected')
    .limit(1)
    .maybeSingle();

  if (existing) {
    const otherId = existing.user_a_id === user.id ? existing.user_b_id : existing.user_a_id;
    const { data: otherProfile } = await admin
      .from('profiles')
      .select('anonymous_alias')
      .eq('id', otherId)
      .single<{ anonymous_alias: string }>();
    const { data: conv } = await admin
      .from('conversations')
      .select('id')
      .eq('match_id', existing.id)
      .maybeSingle<{ id: string }>();

    return jsonResponse({
      status: 'matched',
      match_id: existing.id,
      conversation_id: conv?.id ?? null,
      other_alias: otherProfile?.anonymous_alias ?? 'Bloom',
      shared_category: existing.shared_category,
      resonance_score: existing.resonance_score,
    });
  }

  // ── 3. Candidate pool ────────────────────────────────────────────────────
  const energyMin = Math.max(1, myQuiz.energy_level - 1);
  const energyMax = Math.min(5, myQuiz.energy_level + 1);
  const opennessMin = Math.max(1, myQuiz.openness_level - 1);
  const opennessMax = Math.min(5, myQuiz.openness_level + 1);

  const { data: candidates, error: candErr } = await admin
    .from('soul_match_quiz_responses')
    .select('user_id, current_feeling, looking_for, energy_level, openness_level')
    .eq('quiz_date', today)
    .neq('user_id', user.id)
    .gte('energy_level', energyMin)
    .lte('energy_level', energyMax)
    .gte('openness_level', opennessMin)
    .lte('openness_level', opennessMax);

  if (candErr) return jsonResponse({ error: candErr.message }, { status: 500 });
  if (!candidates || candidates.length === 0) {
    return jsonResponse({ status: 'waiting', reason: 'no_candidates_yet' });
  }

  // Exclude candidates who already have any match today (either direction).
  const candIds = candidates.map((c: Quiz) => c.user_id);
  const { data: takenRows } = await admin
    .from('soul_matches')
    .select('user_a_id, user_b_id')
    .eq('match_date', today)
    .or(
      candIds.map((id: string) => `user_a_id.eq.${id},user_b_id.eq.${id}`).join(','),
    );

  const taken = new Set<string>();
  (takenRows ?? []).forEach((r: { user_a_id: string; user_b_id: string }) => {
    taken.add(r.user_a_id);
    taken.add(r.user_b_id);
  });

  const eligible = candidates.filter((c: Quiz) => !taken.has(c.user_id));
  if (eligible.length === 0) {
    return jsonResponse({ status: 'waiting', reason: 'all_taken' });
  }

  // Load their moods + institutions for scoring
  const eligibleIds = eligible.map((c: Quiz) => c.user_id);
  const [{ data: theirMoods }, { data: theirProfiles }] = await Promise.all([
    admin
      .from('mood_checkins')
      .select('user_id, category, intensity')
      .eq('checkin_date', today)
      .in('user_id', eligibleIds),
    admin
      .from('profiles')
      .select('id, anonymous_alias, institution_id')
      .in('id', eligibleIds),
  ]);

  const moodById = new Map<string, Mood>(
    (theirMoods ?? []).map((m: Mood) => [m.user_id, m]),
  );
  const profileById = new Map<string, Profile>(
    (theirProfiles ?? []).map((p: Profile) => [p.id, p]),
  );

  // ── 4. Score ─────────────────────────────────────────────────────────────
  type Scored = {
    quiz: Quiz;
    mood: Mood | null;
    profile: Profile | null;
    score: number;
  };

  const scored: Scored[] = eligible.map((q: Quiz) => {
    const theirMood = moodById.get(q.user_id) ?? null;
    const theirProfile = profileById.get(q.user_id) ?? null;

    const moodCat = myMood?.category ?? myQuiz.current_feeling;
    const otherCat = theirMood?.category ?? q.current_feeling;

    const mScore = moodScore(moodCat, otherCat);
    const iScore = intensityScore(
      myMood?.intensity ?? null,
      theirMood?.intensity ?? null,
    );
    const lScore = LF_COMPAT[myQuiz.looking_for][q.looking_for];
    const instScore = institutionScore(
      myProfile?.institution_id ?? null,
      theirProfile?.institution_id ?? null,
    );

    const score = Math.round(
      40 * mScore + 30 * iScore + 15 * lScore + 15 * instScore,
    );
    return { quiz: q, mood: theirMood, profile: theirProfile, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (!best || best.score < SCORE_THRESHOLD) {
    return jsonResponse({
      status: 'waiting',
      best_score: best?.score ?? 0,
      threshold: SCORE_THRESHOLD,
    });
  }

  // ── 5. Commit match: 2 directional rows + 1 conversation ────────────────
  const sharedCategory = myMood?.category ?? myQuiz.current_feeling;

  const { data: matchA, error: matchAErr } = await admin
    .from('soul_matches')
    .insert({
      user_a_id: user.id,
      user_b_id: best.quiz.user_id,
      shared_category: sharedCategory,
      resonance_score: best.score,
      status: 'connected',
      match_date: today,
    })
    .select('id')
    .single<{ id: string }>();

  if (matchAErr || !matchA) {
    // Likely a race — someone else matched with one of us between read and write.
    return jsonResponse({ status: 'waiting', reason: 'race_lost' });
  }

  // Mirror row (best knowledge for "matches received by user B today").
  // If the unique on (user_a_id, match_date) trips for B, swallow it — B is
  // already matched and our row A still stands.
  await admin
    .from('soul_matches')
    .insert({
      user_a_id: best.quiz.user_id,
      user_b_id: user.id,
      shared_category: sharedCategory,
      resonance_score: best.score,
      status: 'connected',
      match_date: today,
    });

  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .insert({
      match_id: matchA.id,
      user_a_id: user.id,
      user_b_id: best.quiz.user_id,
    })
    .select('id')
    .single<{ id: string }>();

  if (convErr || !conv) {
    return jsonResponse({ error: 'conversation_create_failed' }, { status: 500 });
  }

  return jsonResponse({
    status: 'matched',
    match_id: matchA.id,
    conversation_id: conv.id,
    other_alias: best.profile?.anonymous_alias ?? 'Bloom',
    shared_category: sharedCategory,
    resonance_score: best.score,
  });
});
