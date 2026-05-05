// ============================================================================
// FlyttGo — stripe-connect-onboarding Edge Function
// ============================================================================
//
// Driver-facing self-serve KYC + bank collection via Stripe Connect Express.
// Replaces the manual admin-approves-bank-details path with a Stripe-hosted
// flow that takes the driver ~60s and returns them to the driver portal
// with `payouts_enabled = true` once Stripe finishes verification.
//
// FLOW
// ----
//   1. Driver clicks "Set up payouts" in StripeConnectCard.
//   2. Frontend POSTs here with their auth bearer token (no body needed).
//   3. We resolve the caller, look up their stripe_connect_accounts row
//      (created by the install-stripe-connect.sql trigger when their
//      application was approved). If `stripe_account_id` is null we
//      create a new Express account with the right country + email +
//      business_type. Otherwise we reuse the existing account.
//   4. We mint a fresh AccountLink (one-time URL) and return it.
//   5. Frontend redirects the browser to that URL.
//   6. Stripe handles KYC + bank input + identity verification.
//   7. Stripe redirects back to FRONTEND_URL/driver?stripe-connect=return.
//   8. The `account.updated` webhook (handled by stripe-webhook) cashes
//      back updated charges_enabled / payouts_enabled / requirements_due
//      onto the stripe_connect_accounts row.
//
// DEPLOY
// ------
//   supabase functions deploy stripe-connect-onboarding --no-verify-jwt
//
// REQUIRED SECRETS
// ----------------
//   supabase secrets set STRIPE_SECRET_KEY=<sk_test_... or sk_live_...>
//   supabase secrets set FRONTEND_URL=https://flyttgo.com
//
// REQUEST
// -------
//   POST /functions/v1/stripe-connect-onboarding
//   Headers: Authorization: Bearer <user-jwt>
//   Body:    {} (no payload — caller is identified from the JWT)
//
// RESPONSE
// --------
//   200 { url: 'https://connect.stripe.com/setup/...' }   on success
//   401 { error: 'Sign in required' }                     no JWT
//   404 { error: 'No driver application found' }          not yet approved
//   500 { error: 'Stripe not configured' }                missing env vars
// ============================================================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY         = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const FRONTEND_URL              = (Deno.env.get('FRONTEND_URL') ?? 'https://flyttgo.com').replace(/\/$/, '');
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function resolveCallerUserId(req: Request): Promise<string | null> {
  if (!supabase) return null;
  const auth = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

/* Stripe REST helper — form-encoded per Stripe's API conventions.
 * We avoid pulling the SDK in here; the API surface we need is
 * tiny (Account create + AccountLink create). */
async function stripeFetch(path: string, body: Record<string, string>): Promise<unknown> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(String((data.error as { message?: string } | undefined)?.message ?? `Stripe ${res.status}`));
  return data;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);

  if (!STRIPE_SECRET_KEY || !supabase) {
    return json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY.' }, 500);
  }

  const userId = await resolveCallerUserId(req);
  if (!userId) return json({ error: 'Sign in required' }, 401);

  /* Resolve the driver's country + email so Stripe can pre-fill the
   * onboarding form. driver_applications.zone is the ISO-2 we tag at
   * application time. */
  const { data: app } = await supabase
    .from('driver_applications')
    .select('zone, email, full_name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!app) return json({ error: 'No driver application found' }, 404);

  const country = (app.zone as string | null)?.toUpperCase() ?? 'US';
  const email   = (app.email as string | null) ?? undefined;

  /* Look up existing Connect row — created by the install-stripe-connect
   * trigger when the application was approved. Should always exist by
   * the time the driver clicks the CTA. */
  const { data: existing } = await supabase
    .from('stripe_connect_accounts')
    .select('stripe_account_id')
    .eq('user_id', userId)
    .maybeSingle();

  let accountId = existing?.stripe_account_id as string | null;

  if (!accountId) {
    /* Create a new Express account. Capability hints are required so
     * Stripe knows which payment methods to enable. */
    const account = await stripeFetch('accounts', {
      type:                          'express',
      country,
      ...(email ? { email } : {}),
      'capabilities[transfers][requested]':    'true',
      'capabilities[card_payments][requested]':'true',
      'business_type':                          'individual',
      'metadata[flyttgo_user_id]':              userId,
    }) as { id: string };

    accountId = account.id;

    await supabase.from('stripe_connect_accounts')
      .upsert({ user_id: userId, stripe_account_id: accountId, updated_at: new Date().toISOString() });
  }

  /* Mint a one-time onboarding URL. AccountLinks expire in 5 mins —
   * the frontend redirects immediately so this is fine. */
  const link = await stripeFetch('account_links', {
    'account':     accountId,
    'refresh_url': `${FRONTEND_URL}/driver?stripe-connect=refresh`,
    'return_url':  `${FRONTEND_URL}/driver?stripe-connect=return`,
    'type':        'account_onboarding',
  }) as { url: string };

  return json({ url: link.url, accountId });
});
