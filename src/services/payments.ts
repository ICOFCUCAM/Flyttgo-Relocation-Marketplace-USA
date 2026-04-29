import { supabaseFunctionUrl } from '../lib/supabase';

export interface CheckoutSessionInput {
  bookingId: string;
  amountCents: number;
  currency: string;
}

/** Create a Stripe Checkout session for a booking. */
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
