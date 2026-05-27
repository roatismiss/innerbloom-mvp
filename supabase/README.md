# InnerBloom — Backend

Canonical schema and Edge Functions for the InnerBloom mobile app.

## Layout

- `migrations/20260601000000_initial.sql` — single source of truth. Every
  table, trigger, RPC and RLS policy lives here. Idempotent + transactional.
- `seed.sql` — institutions, bloom_quotes (~30 entries across all moods +
  tones), bloom_reels (~5 per category). Idempotent via `ON CONFLICT DO
  NOTHING`.
- `functions/find-soul-match/index.ts` — matchmaking Edge Function.

## Local setup

```bash
# 1. Start local Supabase
supabase start

# 2. Reset DB to the canonical schema + reseed
supabase db reset

# 3. Serve functions locally (Deno)
supabase functions serve find-soul-match --env-file ./supabase/.env.local
```

`.env.local` needs:
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<from `supabase status`>
```

## Deploy

```bash
supabase db push
supabase functions deploy find-soul-match --no-verify-jwt
# (Edge Function verifies JWT manually via auth.getUser inside the handler.)
```

## Privacy: `display_name`

`profiles.display_name` is private. Two mechanisms enforce this:

1. The `profiles` SELECT policy only matches the owner's own row
   (`auth.uid() = id`).
2. Other-user reads go through the `public_profiles` view, which omits
   `display_name` from its SELECT list.

Never `select('*')` from `profiles` when displaying another user — use
`public_profiles` instead.

## RPCs

All RPCs are `SECURITY DEFINER` with `search_path = public, ''` and guard
`auth.uid() IS NOT NULL` at the top.

### `complete_onboarding(payload jsonb)`
Upserts onboarding_responses, sets `profiles.onboarding_completed_at`,
inserts the baseline mood as today's mood_checkin (no-op if one exists).

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/complete_onboarding" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"payload": {
    "display_name": "Maya",
    "baseline_mood": "hopeful",
    "baseline_intensity": 3,
    "baseline_color_hex": "#8FCB9B",
    "baseline_anchor_word": "ready",
    "growth_goals": ["less anxiety", "deeper rest"],
    "checkin_frequency": "daily",
    "blooming_focus": ["self-compassion", "boundaries"],
    "notification_opt_in": true
  }}'
```

### `submit_mood_checkin(category, intensity, anchor_word, color_hex)`
Upsert today's mood. Refining same-day re-runs the streak trigger as a
no-op. Returns `{ mood, streak }`.

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/submit_mood_checkin" \
  -H "Authorization: Bearer $USER_JWT" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_category":"anxious","p_intensity":3,"p_anchor_word":"jittery","p_color_hex":"#C9A8E2"}'
```

### `today_for_me()`
The fan-out RPC. Single round trip, returns mood + streak + today's
quote (tone biased by intensity) + 5 mood-mapped reels + feed_categories
for filtering the post feed. <150ms cold on free tier.

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/today_for_me" \
  -H "Authorization: Bearer $USER_JWT" -H "apikey: $ANON_KEY"
```

### `mood_history(days int = 30)`
Returns one row per day for the last N days, gap-filled with nulls
(so the dashboard chart doesn't compute date math).

### `send_message(p_conversation_id uuid, p_body text)`
Inserts a message after re-checking conversation membership
server-side (more explicit errors than RLS alone).

## Edge Function — `find-soul-match`

POST with a user JWT. The function:

1. Reads the caller's quiz row for today (400 if missing).
2. Builds a candidate pool (other users with a quiz today, energy ±1,
   openness ±1, not already matched today).
3. Scores each candidate:
   `40·moodScore + 30·intensityScore + 15·lookingForScore + 15·institutionScore`
4. If best ≥ 55: writes the directional pair `(a→b, b→a)` + a
   `conversations` row in two service-role calls; returns the
   `match_id` + `conversation_id` + `other_alias`.
5. Otherwise returns `{ status: 'waiting' }` and the client subscribes
   to Realtime inserts on `soul_matches` where `user_b_id = me`.

```bash
curl -X POST "$SUPABASE_URL/functions/v1/find-soul-match" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" -d '{}'
```

## Realtime channels (client-side)

- `messages:conversation_id=eq.<id>` — chat live updates.
- `soul_matches:user_b_id=eq.<me>` — get notified when another user
  matches with you while you're in "waiting" state.

Both tables are added to the `supabase_realtime` publication by the
migration.

## Operational notes

- **Pending placeholders**: when no match is found, the function does
  NOT insert a self-pending row (avoiding the unique constraint trap).
  The waiting client relies purely on Realtime — another caller's
  successful match will fire an INSERT on `soul_matches` with
  `user_b_id = me`. If no one comes, the waiting screen times out
  client-side.
- **Anonymous-by-default**: clients should display
  `public_profiles.anonymous_alias` only. Never query `profiles.display_name`
  for anyone other than the signed-in user.
- **Resetting in dev**: `supabase db reset` is destructive — wipes all
  rows. Safe in local; never run against staging/prod.
