// ============================================================================
// send-push — Edge Function
// ----------------------------------------------------------------------------
// Called by DB triggers via pg_net with:
//   { user_id: string, type: string, payload: Record<string, unknown> }
//
// Responsibilities:
//   1. Look up active Expo push tokens for `user_id`.
//   2. Compose a friendly title + body for the given event type.
//   3. POST a batch to https://exp.host/--/api/v2/push/send.
//   4. On DeviceNotRegistered / InvalidCredentials errors, delete the token
//      so the next push doesn't waste an HTTP roundtrip.
//
// Notes:
//   - Best-effort: no queue, no retry. A lost push is acceptable because
//     Realtime channels keep the in-app state authoritative.
//   - Auth: this function is invoked with the service-role key by pg_net.
//     The check is implicit (DB-only callers).
//
// Deploy:
//   supabase functions deploy send-push
//
// Optional secret (improves rate limits if you have Expo's enhanced token):
//   supabase secrets set EXPO_ACCESS_TOKEN=...
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_ACCESS_TOKEN         = Deno.env.get('EXPO_ACCESS_TOKEN');

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';

type NotificationType =
  | 'new_message'
  | 'hug_received'
  | 'kindred_request'
  | 'match_found';

interface PushRequest {
  user_id: string;
  type:    NotificationType | string;
  payload: Record<string, unknown>;
}

interface ExpoMessage {
  to:       string;
  title:    string;
  body:     string;
  sound:    'default' | null;
  priority: 'default' | 'normal' | 'high';
  data:     Record<string, unknown>;
  // iOS: badge count delta. Skipped for MVP.
}

interface ExpoTicket {
  status:  'ok' | 'error';
  id?:     string;
  message?: string;
  details?: { error?: string };
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function composeMessage(
  token: string,
  type: string,
  payload: Record<string, unknown>,
): ExpoMessage {
  let title = 'InnerBloom';
  let body  = 'Something new is waiting for you.';
  // The `data` payload is what we read back when the user taps the
  // notification — used for in-app deep linking.
  const data: Record<string, unknown> = { type, ...payload };

  switch (type) {
    case 'new_message': {
      title = 'A new reflection arrived';
      const preview = String(payload.preview ?? '').trim();
      body = preview.length > 0 ? preview : 'Your kindred sent you a message.';
      break;
    }
    case 'hug_received':
      title = 'Someone sent you a hug';
      body  = 'Your moment touched a kindred soul.';
      break;
    case 'kindred_request':
      title = 'A kindred wants to keep blooming';
      body  = String(payload.note ?? 'They asked to continue your conversation.');
      break;
    case 'match_found':
      title = 'Your kindred is here';
      body  = 'Today’s Soul Match is ready. Step in when you’re ready.';
      break;
  }

  return {
    to:       token,
    title,
    body,
    sound:    'default',
    priority: 'high',
    data,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'access-control-allow-origin':  '*',
        'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return ok({ error: 'method_not_allowed' }, 405);
  }

  let request: PushRequest;
  try {
    request = await req.json();
  } catch {
    return ok({ error: 'invalid_json' }, 400);
  }

  if (!request.user_id || !request.type) {
    return ok({ error: 'missing_fields' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Look up tokens for this user.
  const { data: tokenRows, error: tokensErr } = await admin
    .from('user_push_tokens')
    .select('token')
    .eq('user_id', request.user_id);

  if (tokensErr) {
    return ok({ error: 'tokens_lookup_failed', detail: tokensErr.message }, 500);
  }

  if (!tokenRows || tokenRows.length === 0) {
    return ok({ skipped: 'no_tokens' });
  }

  // 2. Compose messages and chunk to Expo's 100-message batch limit.
  const messages: ExpoMessage[] = tokenRows.map((r: { token: string }) =>
    composeMessage(r.token, request.type, request.payload ?? {}),
  );

  const batches: ExpoMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    batches.push(messages.slice(i, i + 100));
  }

  const ticketsAll: ExpoTicket[] = [];

  for (const batch of batches) {
    const headers: Record<string, string> = {
      'Content-Type':    'application/json',
      'Accept':          'application/json',
      'Accept-Encoding': 'gzip, deflate',
    };
    if (EXPO_ACCESS_TOKEN) {
      headers['Authorization'] = `Bearer ${EXPO_ACCESS_TOKEN}`;
    }

    try {
      const res = await fetch(EXPO_URL, {
        method:  'POST',
        headers,
        body:    JSON.stringify(batch),
      });
      const json = await res.json();
      const tickets: ExpoTicket[] = Array.isArray(json?.data) ? json.data : [];
      ticketsAll.push(...tickets);
    } catch (err) {
      // Network failure — give up on this batch, others may still succeed.
      console.error('[send-push] fetch failed', err);
    }
  }

  // 3. Reap dead tokens flagged by Expo. Errors map 1:1 with batch order.
  const deadTokens: string[] = [];
  ticketsAll.forEach((ticket, i) => {
    if (ticket.status !== 'error') return;
    const reason = ticket.details?.error ?? '';
    if (
      reason === 'DeviceNotRegistered' ||
      reason === 'InvalidCredentials'
    ) {
      const tok = messages[i]?.to;
      if (tok) deadTokens.push(tok);
    }
  });

  if (deadTokens.length > 0) {
    await admin
      .from('user_push_tokens')
      .delete()
      .in('token', deadTokens);
  }

  return ok({
    sent:    ticketsAll.filter((t) => t.status === 'ok').length,
    failed:  ticketsAll.filter((t) => t.status === 'error').length,
    pruned:  deadTokens.length,
  });
});
