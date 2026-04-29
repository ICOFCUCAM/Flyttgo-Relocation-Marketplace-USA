import { z } from 'zod';
import { supabaseFunctionUrl } from '../lib/supabase';
import {
  ZUuid, ZMoneyMajor, ZMoneyMinor, ZCurrencyCode, ZPayMethod,
  parseOrThrow, type PayMethod,
} from './_schemas';

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
  const res = await fetch(supabaseFunctionUrl('create-checkout-session'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create-checkout-session failed: ${res.status}`);
  return res.json();
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
  const res = await fetch(supabaseFunctionUrl('create-checkout-session'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create-checkout-session failed: ${res.status}`);
  return res.json();
}
