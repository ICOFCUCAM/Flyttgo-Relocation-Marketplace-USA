import { z } from 'zod';
import {
  ZUuid, ZMoneyMajor, ZMoneyMinor, ZCurrencyCode, ZPayMethod,
  parseOrThrow, type PayMethod,
} from './_schemas';
import { callEdgeFunction } from './_edge';

export type { PayMethod };

/* ── Generic Stripe Checkout payload (cents-based) ─────────────── */

export const CheckoutSessionInputSchema = z.object({
  bookingId:   ZUuid,
  amountCents: ZMoneyMinor,
  currency:    ZCurrencyCode,
});
export type CheckoutSessionInput = z.infer<typeof CheckoutSessionInputSchema>;

export async function createCheckoutSession(
  rawInput: CheckoutSessionInput,
): Promise<{ url: string; sessionId: string }> {
  const input = parseOrThrow(CheckoutSessionInputSchema, rawInput);
  return callEdgeFunction('create-checkout-session', input);
}

/* ── Booking checkout (PaymentPage) ────────────────────────────── */

export const BookingCheckoutInputSchema = z.object({
  bookingId: ZUuid,
  amount:    ZMoneyMajor,
  method:    ZPayMethod,
});
export type BookingCheckoutInput = z.infer<typeof BookingCheckoutInputSchema>;

/** PaymentPage payload — the edge function reads bookingId, amount,
 *  and method to construct the Stripe session and route Apple/Google
 *  Pay through the same flow. Returns the redirect URL on success. */
export async function createBookingCheckout(
  rawInput: BookingCheckoutInput,
): Promise<{ url?: string; sessionId?: string }> {
  const input = parseOrThrow(BookingCheckoutInputSchema, rawInput);
  return callEdgeFunction('create-checkout-session', input);
}
