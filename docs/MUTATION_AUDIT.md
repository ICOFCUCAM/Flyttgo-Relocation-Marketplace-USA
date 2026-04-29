# Mutation Boundary Audit

This file maps every client-initiated mutation to its **client-side
schema** (Zod, in `src/services/`) and the **expected server-side RLS
policy** that enforces ownership on the same row. Both layers must
hold for the marketplace to be safe — Zod alone won't stop a
malicious client that bypasses our SDK.

Last reviewed: when the schemas in `src/services/_schemas.ts` last
changed. Re-run the checklist after every new mutation function.

## Bookings

| Function | Schema | Expected RLS |
|---|---|---|
| `createBookingWithEscrow` | `CreateBookingInputSchema` (uuid, email, lat/lng ranges, money) | `bookings_self_insert`: `auth.uid() = customer_id`. Escrow insert via SECURITY DEFINER trigger or a matching policy on `escrow_payments`. |
| `cancelBooking` | needs schema | `bookings_self_update`: `auth.uid() = customer_id`. |
| `setCustomerConfirmation` | needs schema | Same as above. |
| `markBookingPaid` | needs schema | Should run from server only — flagged for follow-up. Ideally moved into the `process-payment` edge function. |
| `getCustomerBookingById` | n/a (read) | `bookings_self_select`: `auth.uid() = customer_id`. |
| `findBookingByIdQuery` | n/a (read) | Bypasses customer scoping intentionally so a partner can paste a partial id; RLS must still gate read access. Double-check the public-read policy is scoped to non-PII columns. |

## Payments

| Function | Schema | Expected RLS / edge |
|---|---|---|
| `createCheckoutSession` | `CheckoutSessionInputSchema` (uuid + minor units + ISO-3 currency) | Edge function owns the check; policy on the booking row must let the caller read the row. |
| `createBookingCheckout` | `BookingCheckoutInputSchema` (uuid + major units + method enum) | Same. |

## Admin

All admin functions assume the caller has the `admin` role
(`admin_accounts` table). The corresponding RLS policies are in
`docs/install-admin-rls.sql`. Each schema below is the client guard;
the SQL there is the server guard.

| Function | Schema | Expected RLS |
|---|---|---|
| `updateDriverStatus` | `UpdateDriverStatusSchema` (uuid + enum) | `driver_profiles_admin_update` |
| `assignDriverPlan` | `AssignDriverPlanSchema` (uuid + plan enum) | `driver_subscriptions_admin_insert` |
| `applyManualRefundOverride` | `ApplyManualRefundSchema` (uuid + 0–100 int) | `bookings_admin_update` |
| `manualDispatchBooking` | `ManualDispatchSchema` (two uuids) | `bookings_admin_update` |
| `reviewDriverApplication` | `ReviewApplicationInputSchema` (uuid + decision; `rejectionReason` required when rejected) | `driver_applications_admin_update` |
| `setDocumentVerification` | `SetDocumentVerificationSchema` (uuid + status enum) | `driver_documents_admin_update` |
| `releaseBookingPayment` | needs schema | RPC `increment_driver_wallet` must be `SECURITY DEFINER` and check admin role. |
| `refundBookingPayment` | needs schema | Same. |
| `autoDispatchBooking` | n/a (RPC takes booking id only) | `dispatch_assign_best_driver` is `SECURITY DEFINER`. |
| `reclaimStaleDispatches` | n/a (admin-only RPC) | `reclaim_stale_dispatches` is `SECURITY DEFINER`. |

## Driver

| Function | Schema | Expected RLS |
|---|---|---|
| `requestPayout` | `RequestPayoutSchema` (uuid + positive money) | `payout_requests_self_insert`: `auth.uid() = driver_id`. |
| `changeDriverSubscription` | `ChangeDriverSubscriptionSchema` (uuid + plan enum) | `change_driver_subscription` RPC — `SECURITY DEFINER`, must verify caller owns the driver. |
| `logSubscriptionCredit` | `LogSubscriptionCreditSchema` (uuid + money + bounded text) | `driver_wallet_transactions_self_insert`: `auth.uid() = driver_id`. |
| `createSubscriptionCheckout` | `SubscriptionCheckoutPayloadSchema` (full payload) | Edge function — must verify `auth.uid()` matches `userId`. |
| `acceptJob` | needs schema | The compare-and-swap UPDATE relies on `bookings_driver_accept` policy: only allows update when `driver_id IS NULL`. |
| `startJob` / `finishJob` | needs schema | `bookings_driver_update`: `auth.uid() = driver_id`. |
| `setDriverConfirmation` | needs schema | Same. |
| `setDriverOnline` | needs schema | `driver_profiles_self_update`: `auth.uid() = user_id`. |

## Quotes

| Function | Schema | Expected RLS |
|---|---|---|
| `createQuoteRequest` | `CreateQuoteRequestSchema` (country required, tolerant of extras) | `quote_requests_self_insert`. |

## Open follow-ups

1. Add schemas to the rows above flagged "needs schema" — they're
   trivially uuid-only today but should still go through `parseOrThrow`
   so the boundary is consistent and the Audit row links to a real
   `Schema` symbol.
2. Move `markBookingPaid` server-side. Letting the client flip
   `payment_status` directly (even with RLS) means a sufficiently
   motivated user could mark themselves paid without actually paying.
3. Confirm every `SECURITY DEFINER` RPC has a `revoke execute on
   function … from public` step in its install script. Spot-check
   `change_driver_subscription`, `dispatch_assign_best_driver`,
   `reclaim_stale_dispatches`, `increment_driver_wallet`,
   `decrement_driver_wallet`.
4. Spot-check that the edge functions (`process-payment`,
   `create-checkout-session`, `stripe-webhook`) verify the caller
   identity against the `bookingId` they're acting on. Without that
   the Zod schema is decoration.
