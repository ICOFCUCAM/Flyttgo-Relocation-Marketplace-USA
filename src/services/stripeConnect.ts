import { supabase } from '../lib/supabase';
import { callEdgeFunction } from './_edge';

/**
 * Stripe Connect (driver self-serve payouts) service.
 *
 * Backed by docs/install-stripe-connect.sql + the
 * stripe-connect-onboarding edge function. The driver portal calls
 * `getStripeConnectStatus` to render the right card state, and
 * `startStripeConnectOnboarding` when the driver clicks the CTA.
 */

export interface StripeConnectStatus {
  hasAccount:        boolean;
  chargesEnabled:    boolean;
  payoutsEnabled:    boolean;
  detailsSubmitted:  boolean;
  requirementsDue:   string[];
}

const EMPTY: StripeConnectStatus = {
  hasAccount:       false,
  chargesEnabled:   false,
  payoutsEnabled:   false,
  detailsSubmitted: false,
  requirementsDue:  [],
};

/** Reads the cached Stripe Connect status off the
 *  stripe_connect_accounts row. The webhook keeps these flags in
 *  sync with Stripe's truth — no API round-trip needed. */
export async function getStripeConnectStatus(userId: string): Promise<StripeConnectStatus> {
  const { data, error } = await supabase
    .from('stripe_connect_accounts')
    .select('stripe_account_id, charges_enabled, payouts_enabled, details_submitted, requirements_due')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY;
  return {
    hasAccount:        Boolean(data.stripe_account_id),
    chargesEnabled:    Boolean(data.charges_enabled),
    payoutsEnabled:    Boolean(data.payouts_enabled),
    detailsSubmitted:  Boolean(data.details_submitted),
    requirementsDue:   Array.isArray(data.requirements_due) ? (data.requirements_due as string[]) : [],
  };
}

/** Calls the stripe-connect-onboarding edge function and returns the
 *  one-time Stripe-hosted URL the driver should be redirected to. */
export async function startStripeConnectOnboarding(): Promise<{ url: string }> {
  const data = await callEdgeFunction<{ url: string }>('stripe-connect-onboarding', {});
  return data;
}
