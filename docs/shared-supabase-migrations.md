# Aligning Flyttgo + GRU + VanMan-UK on one Supabase

All three sites — `Flyttgo-Relocation-Marketplace-USA`, `Global-Relocation-USA`,
and `VanMan-UK` — are intended to read and write against a **single shared
Supabase project** so a booking made on one surface is visible on the others.

This document records the canonical schema migrations that the shared
project must have applied. They live in the `VanMan-UK` repo (under
`supabase/`); Flyttgo and GRU mirror VanMan's schema rather than maintain
their own.

## Migrations to apply (in order)

Run each of these in the Supabase SQL Editor against the shared project.
They are idempotent — safe to re-run.

1. `VanMan-UK/supabase/schema.sql`
   Base tables: `profiles`, `drivers`, `bookings`, `corporate_accounts`,
   `vehicles`, `payment_records`, `notifications`, plus RLS policies.

2. `VanMan-UK/supabase/payment_upgrade_migration.sql`
   - Adds `escrow_payments`, `driver_wallets`, `driver_wallet_transactions`,
     `commission_ledger` tables.
   - Adds `original_price`, `commission_rate`, `commission_amount`,
     `driver_earning`, `payment_provider`, `payment_intent_id`,
     `stripe_session_id`, `escrow_activated`, `driver_confirmation`,
     `customer_confirmation` to `bookings`.
   - Tightens `payment_status` constraint to
     `('pending','escrow','released','refunded','invoice_pending')`.
   - Installs `dispatch_assign_best_driver(booking_id)` and the
     `trg_dispatch_on_payment_captured` trigger that auto-dispatches a
     driver as soon as escrow is activated.
   - Installs `release_escrow_fn` + `trg_release_escrow` so funds flow
     to the driver wallet automatically when both customer and driver
     confirm completion.

3. `VanMan-UK/supabase/escrow_management_migration.sql`
   - `add_driver_pending(driver_id, amount)` — used by the
     `stripe-webhook` edge function when payment is captured.
   - `release_escrow_manually(booking_id)` — admin override.
   - `refund_escrow_manually(booking_id)` — admin override.

4. `VanMan-UK/supabase/routing_dispatch_migration.sql`
   Routing-aware dispatch (vehicle-type matching, online-driver scoring).

5. `VanMan-UK/supabase/recurring_bookings_migration.sql`
   Adds `is_recurring`, `recurring_frequency` columns and the trigger that
   spawns the next instance when a recurring booking is completed.

6. `VanMan-UK/supabase/corporate_migration.sql`
   Corporate accounts, invoice billing, and the per-account discount
   profile.

7. `VanMan-UK/supabase/admin_policies.sql`
   Final RLS policy bundle for the admin dashboard.

8. `VanMan-UK/supabase/driver_documents_migration.sql`
   Document upload table + storage policies for driver onboarding.

9. `VanMan-UK/supabase/fix_storage_rls.sql`
   Storage RLS hardening.

## Edge functions to deploy

Located at `VanMan-UK/supabase/functions/`:

- `create-payment-intent` — builds a Stripe Checkout Session for the
  booking. Used for both card-full payments (full price) and cash-method
  bookings (30% deposit). Reads the `STRIPE_SECRET_KEY` env var.
- `create-subscription` — Stripe Subscriptions for driver tier upgrades
  (silver_plus / gold / gold_pro / elite).
- `stripe-webhook` — listens for `checkout.session.completed`, flips
  `bookings.payment_status` to `escrow`, and calls `add_driver_pending`
  to credit the driver's wallet pending balance. The escrow release
  trigger in the SQL fires once both parties confirm completion.

## What lives where

| Concern | Source of truth |
|---|---|
| Database schema | `VanMan-UK/supabase/*.sql` |
| Edge functions | `VanMan-UK/supabase/functions/*` |
| `SUBSCRIPTION_PLANS` ids (silver / silver_plus / gold / gold_pro / elite) | mirrored in every site's `src/lib/constants.ts` |
| `COMMISSION` rates (30 / 25 / 20 / 15 / 10) | mirrored in every site's `src/lib/constants.ts` |
| `COMMISSION.cashDeposit = 0.30` (30% online deposit on cash bookings) | mirrored in every site's `src/lib/constants.ts` |
| Refund flow | admin-triggered via `release_escrow_manually` / `refund_escrow_manually` SQL functions |

## Cash booking lifecycle (end-to-end)

1. Customer clicks **Cash** in the country shopfront's `BookingShortcut`.
2. `BookingFlow` writes a row to `bookings` with
   `payment_method='cash'`, `payment_status='pending'`,
   `estimated_price=<full price>`.
3. Customer is redirected to the payment surface, which shows
   "30% deposit due now · 70% in cash to driver on delivery".
4. `create-payment-intent` is called with
   `chargeAmt = estimated_price * COMMISSION.cashDeposit (0.30)`.
5. Stripe Checkout collects the deposit. On success, `stripe-webhook`:
   - flips `payment_status` to `escrow`
   - inserts an `escrow_payments` row
   - calls `add_driver_pending(driver_id, deposit_after_commission)`
   - the `trg_dispatch_on_payment_captured` trigger auto-assigns a driver.
6. Driver completes the move and collects 70% in cash from the customer.
7. Both parties mark `driver_confirmation = true` /
   `customer_confirmation = true` on the booking.
8. `trg_release_escrow` fires, releasing the deposit to the driver
   wallet net of the per-tier commission, and writes a row to
   `commission_ledger`.

## Refund / no-show / cancellation lifecycle

There is **no automatic plan-based grace period** in this system.
Cancellations and disputes are admin-adjudicated:

- **Customer cancels before move** — admin runs
  `refund_escrow_manually(booking_id)`, then issues the Stripe refund
  for the deposit from the Stripe Dashboard.
- **Customer no-shows / dispute resolved in driver's favour** — admin
  runs `release_escrow_manually(booking_id)` so the driver keeps the
  deposit net of commission.
- **Adjustments** — `escrow_payments.adjustment_required` is set;
  admin reviews and either releases or refunds accordingly.

This matches VanMan-UK's actual behaviour. Earlier versions of this
codebase shipped an invented `PLAN_REFUND_POLICY` with per-tier
auto-retention; that has been removed so the three sites compute
identical results against the shared backend.
