import { supabaseFunctionUrl } from '../lib/supabase';

export interface CheckoutSessionInput {
  bookingId:   string;
  amountCents: number;
  currency:    string;
}

/** Generic Stripe Checkout session — used for the original API. */
export async function createCheckoutSession(
  input: CheckoutSessionInput,
): Promise<{ url: string; sessionId: string }> {
  const res = await fetch(supabaseFunctionUrl('create-checkout-session'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create-checkout-session failed: ${res.status}`);
  return res.json();
}

export type PayMethod = 'card' | 'apple_pay' | 'google_pay' | 'invoice';

export interface BookingCheckoutInput {
  bookingId: string;
  amount:    number;
  method:    PayMethod;
}

/** PaymentPage payload shape — the edge function reads bookingId,
 *  amount, and method to construct the Stripe session and route
 *  Apple/Google Pay through the same flow. Returns the redirect URL
 *  on success. */
export async function createBookingCheckout(
  input: BookingCheckoutInput,
): Promise<{ url?: string; sessionId?: string }> {
  const res = await fetch(supabaseFunctionUrl('create-checkout-session'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`create-checkout-session failed: ${res.status}`);
  return res.json();
}
