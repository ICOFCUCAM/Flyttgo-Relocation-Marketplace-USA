import { supabase, supabaseFunctionUrl } from '../lib/supabase';

/* ─────────────────────────────────────────────────────────────────
 * Edge-function call helper
 *
 * Every client → edge-function POST should:
 *   1. Send the user's JWT in the Authorization header so the
 *      function can resolve auth.uid() and gate sensitive actions.
 *   2. Surface non-2xx responses as readable Errors that include
 *      the body's `error` / `detail` fields when present, so
 *      mutation-hook onError handlers can show something useful.
 *   3. Skip work entirely when the user isn't signed in. The edge
 *      function itself returns 401 in that case, but failing fast
 *      here saves a network round-trip and produces a clearer error.
 *
 * Keep this thin — no retries, no caching. React Query + the existing
 * service layer do that.
 * ───────────────────────────────────────────────────────────────── */

export interface CallEdgeOptions {
  /** Optional override; defaults to the user's current Supabase
   *  session token. Set when calling from a context that already has
   *  the token in hand (avoids the extra getSession call). */
  accessToken?: string | null;
  /** Set true to allow unauthenticated calls (e.g. webhooks). */
  allowAnonymous?: boolean;
}

/** POST a JSON body to a Supabase edge function with the caller's
 *  JWT attached. Throws a readable Error on non-2xx and on missing
 *  auth (when not allowAnonymous). */
export async function callEdgeFunction<TResponse = unknown>(
  name:  string,
  body:  unknown,
  opts:  CallEdgeOptions = {},
): Promise<TResponse> {
  let token = opts.accessToken;
  if (token === undefined) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  }
  if (!token && !opts.allowAnonymous) {
    throw new Error('Not signed in');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(supabaseFunctionUrl(name), {
    method: 'POST',
    headers,
    body:   JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error ?? j?.detail ?? '';
    } catch {
      /* Response wasn't JSON; fall through with status only. */
    }
    throw new Error(`${name} failed: ${res.status}${detail ? ` (${detail})` : ''}`);
  }

  return res.json() as Promise<TResponse>;
}
