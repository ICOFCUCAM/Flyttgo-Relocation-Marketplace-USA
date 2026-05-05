// ============================================================================
// FlyttGo — create-checkout-session Edge Function (Stripe)
// ============================================================================
//
// Creates a Stripe Checkout session so FlyttGo customers can pay for a
// booking (or a driver subscription) with card, Google Pay or Apple Pay.
// Returns a redirect URL the frontend navigates to so the customer
// completes payment on Stripe's hosted page.
//
// This version supersedes the older Supabase-only one that had three
// bugs:
//   1) No CORS headers → every browser call failed preflight silently,
//      which caused PaymentPage to fall through to its escrow-update
//      fallback path and show a success screen without capturing money.
//   2) Hardcoded success/cancel URLs pointing at example.com → after
//      payment the customer landed on a random domain.
//   3) Ignored the `method` parameter PaymentPage sends, so there was
//      no wallet or alternative-method routing.
//
// DEPLOY
// ------
//   supabase functions deploy create-checkout-session --no-verify-jwt
//
// REQUIRED SECRETS
// ----------------
//   supabase secrets set STRIPE_SECRET_KEY=<sk_test_... or sk_live_...>
//   supabase secrets set FRONTEND_URL=https://flyttgo.us
//
// Optional (used by stripe-webhook, not read here):
//   supabase secrets set STRIPE_WEBHOOK_SECRET=<whsec_...>
//
// FRONTEND REQUEST
// ----------------
//   POST /functions/v1/create-checkout-session
//   Content-Type: application/json
//
//   {
//     "bookingId":    "a1b2c3d4-e5f6-7890-...",      // uuid from bookings
//     "amount":        4025,                          // whole USD
//     "method":        "card" | "google_pay" | ...,  // optional; honoured where it matters
//     "customerEmail": "customer@example.com",        // optional, pre-fills Stripe email
//     "description":   "FlyttGo booking"              // optional
//   }
//
// Alternative (subscription) request shape from DriverPortal:
//
//   {
//     "type":      "subscription",
//     "planId":    "pro",
//     "planLabel": "Pro",
//     "driverId":  "<uuid>",
//     "userId":    "<uuid>",
//     "amount":    1875                               // whole USD (incl. Sales Tax)
//   }
//
// FRONTEND RESPONSE (200)
// -----------------------
//   {
//     "url":      "https://checkout.stripe.com/...",  // window.location.href = url
//     "sessionId":"cs_test_...",
//     "reference":"booking-a1b2c3d4-1712934512",
//     "provider": "stripe"
//   }
//
// ============================================================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ─── Env ──────────────────────────────────────────────────────── */
const STRIPE_SECRET_KEY         = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const FRONTEND_URL              = (Deno.env.get('FRONTEND_URL') ?? 'https://flyttgo.us').replace(/\/$/, '');
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/* Service-role client for the caller-identity + booking-ownership
 * lookups. We never use this to write — it's read-only here. */
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

/* Resolve caller's auth.users.id from the bearer token. Returns null
 * when no token is present or the token can't be resolved — handler
 * decides whether to 401. */
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

/* ─── Request shapes ───────────────────────────────────────────── */

interface BookingRequest {
  type?:          undefined;
  bookingId:      string;
  amount:         number;
  /** ISO-4217 lowercase currency code Stripe expects ('usd', 'eur',
   *  'gbp', 'nok', 'sek', 'dkk', 'cad'). Defaults to 'usd' when
   *  omitted so legacy callers keep working. */
  currency?:      string;
  method?:        'card' | 'google_pay' | 'apple_pay' | 'klarna' | 'link';
  customerEmail?: string;
  description?:   string;
}

interface SubscriptionRequest {
  type:        'subscription';
  planId:      string;
  planLabel?:  string;
  driverId:    string;
  userId?:     string;
  amount:      number;
  currency?:   string;
  description?:string;
  /* Optional VAT split — our PRICING uses 25% VAT included, so
   * amountExVat + vatAmount should equal amount. Kept loose. */
  amountExVat?: number;
  vatAmount?:   number;
  billing?:     string;
}

type RequestBody = BookingRequest | SubscriptionRequest;

function isSubscription(body: RequestBody): body is SubscriptionRequest {
  return (body as SubscriptionRequest).type === 'subscription';
}

/* ─── Handler ──────────────────────────────────────────────────── */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);

  if (!STRIPE_SECRET_KEY) {
    return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const amount = Number((body as { amount?: unknown }).amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return json({ error: 'amount is required and must be a positive number (USD)' }, 400);
  }

  /* Caller-identity gate.
   *
   * For BOOKING checkouts we look up the booking's customer_id and
   * require the caller's auth.uid to match. This stops a tampered
   * client from creating a Stripe Checkout session against a booking
   * they don't own (which would also confuse the success URL flow
   * that lands the user on /my-bookings).
   *
   * For SUBSCRIPTION checkouts we require the caller's auth.uid to
   * match either driverId or userId on the payload — both are
   * supplied by DriverPortal and either is a valid identifier for
   * the same person. */
  const callerId = await resolveCallerUserId(req);
  if (!callerId) return json({ error: 'unauthenticated' }, 401);

  if (isSubscription(body)) {
    if (callerId !== body.driverId && callerId !== body.userId) {
      return json({ error: 'forbidden' }, 403);
    }
  } else {
    if (!body.bookingId) {
      return json({ error: 'bookingId is required' }, 400);
    }
    if (!supabase) {
      return json({ error: 'server misconfigured: SUPABASE_SERVICE_ROLE_KEY missing' }, 500);
    }
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('customer_id')
      .eq('id', body.bookingId)
      .single();
    if (bErr || !booking) return json({ error: 'booking not found' }, 404);
    if (booking.customer_id !== callerId) return json({ error: 'forbidden' }, 403);
  }

  /* Build the common pieces up-front and then branch on request type. */
  /* Currency: caller picks (e.g. 'eur' for DE/FR, 'nok' for NO,
   * 'sek' for SE, 'dkk' for DK). Stripe wants lowercase ISO-4217.
   * Defaults to 'usd' to stay compatible with pre-currency callers.
   *
   * Zero-decimal currencies (JPY, KRW, etc.) would need a different
   * unit conversion — none of the rollout markets use them, so
   * everything is simply price × 100. */
  const ALLOWED_CURRENCIES = new Set([
    'usd','eur','gbp','nok','sek','dkk','cad','aed','ngn','kes',
  ]);
  const requestedCurrency = String((body as { currency?: unknown }).currency ?? 'usd').toLowerCase();
  if (!ALLOWED_CURRENCIES.has(requestedCurrency)) {
    return json({ error: `currency '${requestedCurrency}' is not enabled — add it to ALLOWED_CURRENCIES` }, 400);
  }
  const currency  = requestedCurrency;
  const amountOre = Math.round(amount * 100); // local-currency smallest unit

  let reference:   string;
  let productName: string;
  const metadata:  Record<string, string> = {};

  if (isSubscription(body)) {
    if (!body.planId || !body.driverId) {
      return json({ error: 'planId and driverId are required for subscription type' }, 400);
    }
    reference   = `subscription-${body.driverId}-${body.planId}-${Date.now()}`;
    productName = `FlyttGo ${body.planLabel ?? body.planId} subscription`;
    metadata.type     = 'subscription';
    metadata.driverId = body.driverId;
    metadata.planId   = body.planId;
    if (body.userId)      metadata.userId   = body.userId;
    if (body.billing)     metadata.billing  = body.billing;
  } else {
    /* bookingId presence already checked in the caller-identity gate above. */
    reference   = `booking-${body.bookingId}-${Date.now()}`;
    productName = body.description?.slice(0, 80) ?? `FlyttGo booking ${body.bookingId.slice(0, 8)}`;
    metadata.type      = 'booking';
    metadata.bookingId = body.bookingId;
  }
  metadata.reference = reference;

  /* Success / cancel URLs now point at real FlyttGo paths and include
   * the Stripe session id + reference so the frontend can display
   * the right confirmation UI on return. */
  const successUrl = `${FRONTEND_URL}/my-bookings?payment=success&session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(reference)}`;
  const cancelUrl  = isSubscription(body)
    ? `${FRONTEND_URL}/driver-subscriptions?payment=cancelled`
    : `${FRONTEND_URL}/payment?payment=cancelled&ref=${encodeURIComponent(reference)}`;

  /* Build Stripe's URL-encoded form body. Stripe's REST API is
   * x-www-form-urlencoded with bracketed field names rather than
   * JSON, which is why we assemble URLSearchParams manually.
   *
   * Payment method types: we always include `card`. Stripe Checkout
   * automatically enables Google Pay / Apple Pay / Link as wallet
   * overlays on top of the card flow for supported devices, so the
   * client-supplied `method` is a UI hint only — Stripe detects the
   * actual wallet availability from the user agent. Adding
   * `klarna` or `link` explicitly is only needed if you want them
   * as their own rows in the method list. */
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', successUrl);
  params.set('cancel_url',  cancelUrl);
  params.append('payment_method_types[]', 'card');

  if (!isSubscription(body) && (body.method === 'klarna')) {
    params.append('payment_method_types[]', 'klarna');
  }

  /* Line item. One line item = the full booking/subscription total
   * including Sales Tax. The customer sees this label in Stripe Checkout. */
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', currency);
  params.set('line_items[0][price_data][unit_amount]', String(amountOre));
  params.set('line_items[0][price_data][product_data][name]', productName);
  if (body.description) {
    params.set('line_items[0][price_data][product_data][description]', body.description.slice(0, 240));
  }

  /* Reference + metadata — both client_reference_id and metadata
   * make their way into the Stripe webhook event, so the webhook
   * can look up the booking by either. client_reference_id is more
   * visible in the Stripe dashboard. */
  params.set('client_reference_id', reference);
  for (const [k, v] of Object.entries(metadata)) {
    params.set(`metadata[${k}]`, String(v));
  }

  /* Pre-fill the customer's email on Stripe's form if we know it.
   * Only for booking payments — subscription payments come from a
   * signed-in driver whose email Stripe will already know if they've
   * paid before. */
  if (!isSubscription(body) && body.customerEmail) {
    params.set('customer_email', body.customerEmail);
  }

  /* Call Stripe. */
  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20',
    },
    body: params,
  });

  const stripeText = await stripeRes.text();

  if (!stripeRes.ok) {
    console.error('Stripe checkout error:', stripeRes.status, stripeText.slice(0, 400));
    /* Surface Stripe's own error message to the client so the
     * frontend can show something useful instead of a generic
     * "something went wrong". Truncated to avoid leaking stack
     * traces. */
    let detail = stripeText.slice(0, 400);
    try { detail = JSON.parse(stripeText).error?.message ?? detail; } catch { /* keep raw */ }
    return json({ error: 'Stripe session creation failed', detail }, 502);
  }

  let session: { id?: string; url?: string };
  try {
    session = JSON.parse(stripeText);
  } catch {
    return json({ error: 'Stripe returned non-JSON response' }, 502);
  }

  if (!session.url) {
    return json({ error: 'Stripe session has no url', session }, 502);
  }

  return json({
    url:       session.url,
    sessionId: session.id,
    reference,
    provider:  'stripe',
  });
});
