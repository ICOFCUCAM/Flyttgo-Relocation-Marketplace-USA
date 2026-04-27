# FlyttGo — Deployment Runbook

A single-page reference for taking FlyttGo from a fresh clone to production. Covers environment variables, Supabase Edge Function deploys, webhook configuration, database requirements, and a go-live checklist.

> **Current branch strategy:** ship via feature branches → PR → squash-merge into `main`. `main` is production. Vercel auto-deploys on merge.

## Contents

1. [Frontend (Vercel) environment](#1-frontend-vercel-environment)
2. [Supabase secrets](#2-supabase-secrets)
3. [Supabase Edge Functions](#3-supabase-edge-functions)
4. [Webhook configuration](#4-webhook-configuration)
5. [Database requirements](#5-database-requirements)
6. [Third-party provider accounts](#6-third-party-provider-accounts)
7. [Go-live checklist](#7-go-live-checklist)

---

## 1. Frontend (Vercel) environment

Set in Vercel dashboard → Project Settings → Environment Variables.

| Variable | Example | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://abc.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Publishable anon key (NOT service role) |

`VITE_*` variables are baked into the browser bundle at build time. `supabaseFunctionUrl()` in `src/lib/supabase.ts` uses `VITE_SUPABASE_URL` to construct Edge Function URLs.

---

## 2. Supabase secrets

Set on your laptop via `supabase secrets set` after `supabase link --project-ref <ref>`.

### Core
```bash
supabase secrets set FRONTEND_URL=https://flyttgo.us
```

### Routing (real driving distance)
```bash
supabase secrets set ROUTE_PROVIDER_KIND=ors
supabase secrets set ROUTE_PROVIDER_URL=https://api.openrouteservice.org
supabase secrets set ROUTE_PROVIDER_KEY=<openrouteservice.org key>
```
Alternative — free public OSRM (rate-limited):
```bash
supabase secrets set ROUTE_PROVIDER_KIND=osrm
supabase secrets set ROUTE_PROVIDER_URL=https://router.project-osrm.org
```

### Email (Resend)
```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set FLYTTGO_FROM="FlyttGo <bookings@flyttgo.us>"
supabase secrets set FLYTTGO_REPLY_TO=support@flyttgo.us
```

### Stripe
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

Verify with `supabase secrets list`.

---

## 3. Supabase Edge Functions

All live in `supabase/functions/<name>/index.ts`. Deploy each with:

```bash
supabase functions deploy <name> --no-verify-jwt
```

| Function | Purpose | Callers |
|---|---|---|
| `send-booking-email` | Resend transactional emails | `BookingFlow`, pg trigger |
| `route-distance` | OSRM/ORS driving distance lookup | `routing.ts` (home widget + BookingFlow preview) |
| `process-payment` | Dual-confirm escrow release + recalc | `CustomerDashboard`, `DriverPortal`, `MyBookings` |
| `create-checkout-session` | Stripe Checkout session | `PaymentPage`, `DriverPortal.subscribeToPlan` |
| `stripe-webhook` | Flips `payment_status → paid` post-Stripe | Stripe (webhook endpoint) |
| `calculate-price` | Server-authoritative pricing helper | (backend only) |
| `release-escrow` | Legacy commission calculator (harmless) | (none — dead code) |

`--no-verify-jwt` is **required** for every function — Supabase's default JWT check blocks unauthenticated browser calls (Stripe webhooks, anon booking widgets).

Deploy them all in one go:
```bash
for fn in send-booking-email route-distance process-payment \
          create-checkout-session stripe-webhook; do
  supabase functions deploy $fn --no-verify-jwt
done
```

---

## 4. Webhook configuration

### Stripe
1. Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
4. Reveal the signing secret (`whsec_...`) and set `STRIPE_WEBHOOK_SECRET` (section 2).

---

## 5. Database requirements

### Tables referenced by the app (must exist)
- `bookings` (with CHECK constraint on `status`: `pending`/`confirmed`/`driver_assigned`/`pickup_arrived`/`loading`/`in_transit`/`completed`/`cancelled`)
- `escrow_payments` (columns: `booking_id`, `driver_id`, `amount`, `original_amount`, `adjusted_amount`, `adjustment_reason`, `adjustment_approved`, `status`, `released_at`, `commission_amount`, `driver_earning`, `final_price`)
- `driver_profiles`
- `driver_subscriptions` (`plan`, `subscription_status`)
- `driver_wallets` (`balance`, `total_earned`, `pending`)
- `driver_wallet_transactions`
- `notifications`
- `profiles`

### RPCs (must be deployed as stored procedures)
- `increment_driver_wallet(p_driver_id uuid, p_amount numeric)` — called by `process-payment` to credit the driver wallet on escrow release
- `decrement_driver_wallet(p_driver_id uuid, p_amount numeric)` — called by `AdminDashboard` for refunds
- `change_driver_subscription(p_driver_id uuid, p_new_plan text)` — called by `DriverPortal.subscribeToPlan` to swap plans

Verify with:
```sql
SELECT routine_name FROM information_schema.routines
 WHERE routine_schema = 'public'
   AND routine_name IN (
     'increment_driver_wallet',
     'decrement_driver_wallet',
     'change_driver_subscription'
   );
```

### RLS policies
Review every table in section above and make sure:
- **Reads** are scoped to `auth.uid() = customer_id` / `driver_id` for customer and driver tables
- **Writes** go through server-side Edge Functions where possible (admin, escrow release, subscription changes)
- `escrow_payments` INSERT/UPDATE should only be allowed via the service role (edge functions). Customer UI only reads.

---

## 6. Third-party provider accounts

### OpenRouteService (driving distance)
- Sign up: [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)
- Free tier: 2 000 requests/day
- Generate a token → set as `ROUTE_PROVIDER_KEY`
- Rotate every 30 days (you can have multiple active tokens)

### Stripe
- Sign up: [stripe.com](https://stripe.com)
- Get secret key from Dashboard → Developers → API keys
- Use `sk_test_...` until you've processed at least one live-mode test booking manually
- Set `STRIPE_SECRET_KEY`

### Resend (email)
- Sign up: [resend.com](https://resend.com)
- Verify `flyttgo.us` domain (add SPF + DKIM DNS records)
- Generate API key → set as `RESEND_API_KEY`

---

## 7. Go-live checklist

Use this the first time you push to production.

### Pre-flight
- [ ] `main` branch is green — typecheck + build pass in CI
- [ ] Vercel project has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set
- [ ] All Supabase secrets from section 2 are set (`supabase secrets list` verifies)
- [ ] All 7 Edge Functions in section 3 are deployed
- [ ] Stripe webhook endpoint is configured in the Stripe dashboard
- [ ] Stripe env vars use live keys (not `sk_test_...`)
- [ ] ORS routing is live: `curl` `/functions/v1/route-distance` returns `{ provider: 'ors', ... }`

### Smoke test (use a real card with a tiny amount)
- [ ] Create a test booking in `/book`, complete all 6 steps
- [ ] Verify redirect to Stripe Checkout, complete payment with `4242 4242 4242 4242`
- [ ] Verify return to `/my-bookings?payment=success`
- [ ] Check `bookings.payment_status` = `paid` in Table Editor
- [ ] Check `escrow_payments.status` = `escrow`
- [ ] Have a test driver accept the job
- [ ] Driver clicks "Start Job" → verify `start_time` set
- [ ] Driver clicks "Finish Job" → verify `end_time` + `actual_hours` + `final_price` set
- [ ] Driver confirms → verify `driver_confirmation = true`
- [ ] Customer confirms → verify `customer_confirmation = true`, `escrow_payments.status = released`, `driver_wallets.balance` increased
- [ ] Cancel the test booking and refund the card

### Post-launch
- [ ] Rotate any API keys that were ever pasted into chat / Slack / tickets
- [ ] Replace the three `TODO` values in `Footer.tsx` with real Delaware EIN, sales tax registration, and insurance carrier name
- [ ] Enable Supabase point-in-time recovery (Settings → Database → PITR)
- [ ] Configure Vercel rate limiting on `/api` routes
- [ ] Set up uptime monitoring (BetterUptime / UptimeRobot) on `https://flyttgo.us`, `/booking`, `/tracking`
- [ ] Subscribe ops to the Resend webhook events for bounced emails
- [ ] Add monitoring dashboards for: Edge Function error rate, p95 latency, Stripe payment failure rate
