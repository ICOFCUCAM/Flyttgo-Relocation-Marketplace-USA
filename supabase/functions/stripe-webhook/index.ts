// ============================================================================
// FlyttGo — stripe-webhook Edge Function
// ============================================================================
//
// Receives Stripe webhook events and flips the relevant FlyttGo
// state once a payment has been successfully captured.
//
// Handles two distinct kinds of checkout sessions, disambiguated by
// metadata.type (which create-checkout-session stamps when it creates
// the session):
//
//   metadata.type = 'booking'      → updates a bookings row
//                                      payment_status: 'pending' → 'paid'
//                                    + the related escrow_payments row
//                                      status: 'held' → 'escrow'
//
//   metadata.type = 'subscription' → updates the driver's active
//                                     driver_subscriptions row
//                                     (subscription_status: 'active',
//                                      end_date bumped forward).
//
// The dual-confirmation escrow release (at delivery time) is still
// handled by process-payment — this function is only the PAID gate,
// not the RELEASED gate.
//
// DEPLOY
// ------
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// --no-verify-jwt is required because Stripe doesn't send a Supabase
// JWT — it signs requests with a Stripe webhook secret instead, which
// we verify manually in verifyStripeSignature().
//
// REQUIRED SECRETS
// ----------------
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//   (STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are
//    auto-injected and/or already set.)
//
// To get STRIPE_WEBHOOK_SECRET: in the Stripe dashboard, go to
// Developers → Webhooks → Add endpoint. Set the URL to
//   https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
// select the events `checkout.session.completed` and
// `checkout.session.async_payment_succeeded`, save, then click
// "Reveal" next to "Signing secret" and copy the whsec_... string.
//
// IDEMPOTENCY
// -----------
// Stripe uses at-least-once delivery, so the same event can arrive
// twice on retries. We check the current state before writing:
//   - bookings: if payment_status is already 'paid' / 'escrow' /
//     'released' / 'refunded', short-circuit with { idempotent: true }
//   - subscriptions: same idea keyed on the session id stored in the
//     subscription row (stripe_session_id)
//
// ============================================================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyStripeSignature } from './stripe-signature.ts';

/* ─── Env ──────────────────────────────────────────────────────── */
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_WEBHOOK_SECRET     = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/* Stripe signature verification lives in ./stripe-signature.ts so it
 * can be exercised by the Vitest suite. The edge function imports the
 * pure helper and stays focused on side-effects. */

/* ─── Booking paid path ────────────────────────────────────────── */

/**
 * Flip booking payment_status from 'pending' → 'paid' and the escrow
 * row from 'held' → 'escrow'. Idempotent: if already processed,
 * returns { idempotent: true } without mutating.
 */
async function markBookingPaid(bookingId: string, sessionId: string) {
  const { data: booking, error: readErr } = await supabase
    .from('bookings')
    .select('id, payment_status')
    .eq('id', bookingId)
    .maybeSingle();

  if (readErr) throw new Error(`booking read failed: ${readErr.message}`);
  if (!booking) throw new Error(`booking ${bookingId} not found`);

  const alreadyProcessed = ['paid', 'escrow', 'released', 'refunded'];
  if (alreadyProcessed.includes(String(booking.payment_status))) {
    return { ok: true, idempotent: true, previousStatus: booking.payment_status };
  }

  const { error: bookingErr } = await supabase
    .from('bookings')
    .update({ payment_status: 'paid' })
    .eq('id', bookingId);
  if (bookingErr) throw new Error(`booking update failed: ${bookingErr.message}`);

  const { error: escrowErr } = await supabase
    .from('escrow_payments')
    .update({ status: 'escrow' })
    .eq('booking_id', bookingId);
  if (escrowErr) {
    /* Don't fail the whole webhook if the escrow row update fails —
     * the booking is now paid either way and ops can reconcile. */
    console.warn(`escrow update for ${bookingId} failed: ${escrowErr.message}`);
  }

  return { ok: true, idempotent: false, sessionId };
}

/* ─── Subscription paid path ───────────────────────────────────── */

/**
 * For driver subscription payments, we assume the driver already has
 * a driver_subscriptions row (created when they initiated the
 * upgrade) with a matching stripe_session_id or a pending plan to
 * activate. The minimal viable thing here is to UPDATE the active
 * subscription row to status='active' and leave the plan transition
 * details to ops / a separate activation function.
 *
 * The `end_date` is computed from each plan's billing cadence —
 * without this, paid subscriptions land with no expiration and the
 * pg_cron auto-downgrade job (docs/subscription-expiry-cron.sql)
 * has nothing to act on. The free plan has no expiration because
 * there's nothing to downgrade to.
 *
 * If FlyttGo wants more sophisticated subscription handling
 * (renewals, proration, dunning) it belongs in a dedicated
 * activate-subscription Edge Function.
 */

/* How long each paid plan stays active after a successful payment.
 * Free and Basic are free-tier and never expire — there's nothing
 * lower to downgrade them to. Pro Mini bills daily, Pro and
 * Unlimited bill monthly (30 days). */
const PLAN_DURATION_DAYS: Record<string, number> = {
  free:      0,    // no expiry
  basic:     0,    // no expiry (free tier with commission)
  pro_mini:  1,
  pro:       30,
  unlimited: 30,
};

function computeEndDate(planId: string): string | null {
  const days = PLAN_DURATION_DAYS[planId] ?? 0;
  if (days <= 0) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function markSubscriptionPaid(
  driverId: string,
  planId:   string,
  sessionId: string,
) {
  /* Flip the existing active subscription to the new plan. If the
   * driver didn't have one, insert. This is intentionally simple —
   * real billing cycle management belongs elsewhere. */
  const { data: existing, error: readErr } = await supabase
    .from('driver_subscriptions')
    .select('id, plan, subscription_status')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr) throw new Error(`subscription read failed: ${readErr.message}`);

  if (existing?.plan === planId && existing?.subscription_status === 'active') {
    return { ok: true, idempotent: true, plan: planId };
  }

  /* Fresh activation window: start_date = now, end_date = now + plan
   * duration. Writing both on every activation means the pg_cron
   * auto-downgrade job can treat end_date as the only source of
   * truth for "is this subscription live?". */
  const nowIso  = new Date().toISOString();
  const endDate = computeEndDate(planId);

  if (existing) {
    const { error: updErr } = await supabase
      .from('driver_subscriptions')
      .update({
        plan:                planId,
        subscription_status: 'active',
        start_date:          nowIso,
        end_date:            endDate,
      })
      .eq('id', existing.id);
    if (updErr) throw new Error(`subscription update failed: ${updErr.message}`);
  } else {
    const { error: insErr } = await supabase
      .from('driver_subscriptions')
      .insert({
        driver_id:           driverId,
        plan:                planId,
        subscription_status: 'active',
        start_date:          nowIso,
        end_date:            endDate,
      });
    if (insErr) throw new Error(`subscription insert failed: ${insErr.message}`);
  }

  return { ok: true, idempotent: false, plan: planId, sessionId, endDate };
}

/* ─── Event router ─────────────────────────────────────────────── */

interface StripeCheckoutSession {
  id:       string;
  object:   'checkout.session';
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
}

interface StripeEvent {
  id:   string;
  type: string;
  data: { object: StripeCheckoutSession };
}

/**
 * Event-level idempotency.
 *
 * Stripe delivers each event at-least-once; the same `event.id` may
 * land twice on retry. The per-row idempotency in markBookingPaid /
 * markSubscriptionPaid is enough today (we short-circuit on
 * payment_status === 'paid'), but as soon as a future handler does
 * MULTIPLE writes per event the partial-retry hazard reappears. The
 * `processed_stripe_events` table makes that impossible by recording
 * the event id atomically — INSERT with `id` as the primary key, and
 * the duplicate INSERT fails with PG error 23505 (unique_violation),
 * which we surface as "already processed".
 *
 * Schema lives in docs/install-stripe-event-idempotency.sql:
 *
 *   create table public.processed_stripe_events (
 *     id          text primary key,
 *     event_type  text not null,
 *     processed_at timestamptz not null default now()
 *   );
 *
 * If the table doesn't exist (migration not yet applied), we log a
 * warning but DON'T block the event — the per-row idempotency takes
 * over. This keeps deploy-order safety until ops applies the SQL.
 */
async function alreadyProcessed(eventId: string, eventType: string): Promise<boolean> {
  const { error } = await supabase
    .from('processed_stripe_events')
    .insert({ id: eventId, event_type: eventType });
  if (!error) return false;                    // first time, proceed
  if (error.code === '23505') return true;     // duplicate insert → seen this event before
  /* Any other error (relation does not exist / permissions) — log
   * once and fall through to the per-row idempotency. */
  console.warn('processed_stripe_events insert failed:', error.code, error.message);
  return false;
}

async function handleEvent(event: StripeEvent) {
  /* Stripe Connect account verification updates — keep our cached
   * stripe_connect_accounts flags in sync with Stripe's truth so the
   * driver portal renders the right state-machine card without
   * polling the Connect API. */
  if (event.type === 'account.updated') {
    if (await alreadyProcessed(event.id, event.type)) {
      return { ok: true, idempotent: true, reason: 'event already processed' };
    }
    const account = event.data.object as {
      id?:                 string;
      charges_enabled?:    boolean;
      payouts_enabled?:    boolean;
      details_submitted?:  boolean;
      requirements?:       { currently_due?: string[] };
      metadata?:           Record<string, string>;
    };
    if (!account.id) return { ok: true, ignored: true, reason: 'no account id' };

    /* Match by stripe_account_id first (cheap), then fall back to
     * the metadata.flyttgo_user_id we stamped at account creation. */
    const update = {
      charges_enabled:   Boolean(account.charges_enabled),
      payouts_enabled:   Boolean(account.payouts_enabled),
      details_submitted: Boolean(account.details_submitted),
      requirements_due:  account.requirements?.currently_due ?? [],
      updated_at:        new Date().toISOString(),
    };

    let { error } = await supabase
      .from('stripe_connect_accounts')
      .update(update)
      .eq('stripe_account_id', account.id);

    if (error && account.metadata?.flyttgo_user_id) {
      ({ error } = await supabase
        .from('stripe_connect_accounts')
        .update({ ...update, stripe_account_id: account.id })
        .eq('user_id', account.metadata.flyttgo_user_id));
    }
    if (error) return { ok: false, error: error.message };
    return { ok: true, kind: 'account.updated', accountId: account.id };
  }

  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  ) {
    return { ok: true, ignored: true, reason: `event type ${event.type}` };
  }

  /* Event-level idempotency gate — short-circuits retried deliveries
   * before any side effects fire. */
  if (await alreadyProcessed(event.id, event.type)) {
    return { ok: true, idempotent: true, reason: 'event already processed' };
  }

  const session   = event.data.object;
  const metadata  = session.metadata ?? {};
  const kind      = String(metadata.type ?? 'booking');
  const sessionId = session.id;

  /* Sanity check that the session actually ended up paid before we
   * flip state. For async payment methods (Klarna etc.) the
   * `checkout.session.completed` event fires before money is
   * captured; `async_payment_succeeded` is the real signal. */
  if (session.payment_status && session.payment_status !== 'paid') {
    return { ok: true, ignored: true, reason: `session payment_status=${session.payment_status}` };
  }

  if (kind === 'booking') {
    const bookingId = metadata.bookingId ?? null;
    if (!bookingId) {
      return { ok: true, ignored: true, reason: 'booking type without metadata.bookingId' };
    }
    return await markBookingPaid(bookingId, sessionId);
  }

  if (kind === 'subscription') {
    const driverId = metadata.driverId ?? null;
    const planId   = metadata.planId   ?? null;
    if (!driverId || !planId) {
      return { ok: true, ignored: true, reason: 'subscription type missing driverId/planId' };
    }
    return await markSubscriptionPaid(driverId, planId, sessionId);
  }

  return { ok: true, ignored: true, reason: `unknown metadata.type=${kind}` };
}

/* ─── Handler ──────────────────────────────────────────────────── */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);

  /* Read raw body BEFORE parsing — Stripe signature verification
   * requires the exact bytes that were sent. */
  const rawBody         = await req.text();
  const signatureHeader = req.headers.get('Stripe-Signature') ?? req.headers.get('stripe-signature');

  const verify = await verifyStripeSignature(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET);
  if (!verify.valid) {
    console.warn('stripe-webhook rejected:', verify.reason);
    return json({ error: 'Invalid webhook signature', reason: verify.reason }, 401);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const result = await handleEvent(event);
    return json({ received: true, ...result, eventId: event.id, eventType: event.type });
  } catch (err) {
    console.error('stripe-webhook handler error:', err);
    /* Return 500 so Stripe retries. Idempotency in markBookingPaid /
     * markSubscriptionPaid guards against double-processing on retry. */
    return json({ error: (err as Error).message }, 500);
  }
});
