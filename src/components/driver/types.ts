/* Shared types and constants for the driver portal. */

import type { DriverPlan } from '../../services/_schemas';
import { SUBSCRIPTION_TIERS } from '../../lib/subscription-tiers';

/** Gate states the DriverPortal can land in. Drives the state-machine
 *  access control — checked in order so the earliest unmet
 *  precondition is what the user sees. */
export type PortalGate =
  | 'loading'
  | 'no-application'
  | 'application-pending'
  | 'application-rejected'
  | 'no-driver-profile'
  | 'suspended'
  | 'subscription-needed'
  | 'ready';

export type PortalTab = 'overview' | 'jobs' | 'earnings' | 'wallet' | 'subscription';

export const VAT_RATE = 0; // US sales tax is calculated per-state at checkout

/* Lightweight view of a SubscriptionTier — kept so callers that only
 * need the in-portal fields don't have to know about TierPrivilege /
 * badge / etc. The id is narrowed to DriverPlan so the schemas align. */
export interface PlanOption {
  id:          DriverPlan;
  label:       string;
  priceUSD:    number;
  billing:     string;
  commission:  string;
  description: string;
  color:       string;
  highlight:   boolean;
}

const TIER_THEME: Record<DriverPlan, { color: string; commissionLabel: string }> = {
  silver:       { color: 'border-gray-200',    commissionLabel: '30%' },
  silver_plus:  { color: 'border-blue-300',    commissionLabel: '25%' },
  gold:         { color: 'border-amber-400',   commissionLabel: '20%' },
  gold_pro:     { color: 'border-emerald-400', commissionLabel: '15%' },
  elite:        { color: 'border-purple-400',  commissionLabel: '10%' },
};

/** PLAN_OPTIONS is derived from SUBSCRIPTION_TIERS so the driver
 *  portal Subscription tab and the marketing shopfront
 *  /driver-subscriptions agree on what plans exist, what they cost,
 *  and what commission they unlock. Country pricing applies at
 *  render time via localPriceForTier — these baselines stay USD. */
export const PLAN_OPTIONS: PlanOption[] = SUBSCRIPTION_TIERS.map(t => ({
  id:          t.slug as DriverPlan,
  label:       t.displayName,
  priceUSD:    t.baselineUSD,
  billing:     t.baselineUSD === 0 ? '' : t.cadence === 'daily' ? 'USD/day' : '/month USD',
  commission:  TIER_THEME[t.slug as DriverPlan].commissionLabel,
  description: t.tagline,
  color:       TIER_THEME[t.slug as DriverPlan].color,
  highlight:   t.popular,
}));

export const PORTAL_TABS: PortalTab[] = ['overview', 'jobs', 'earnings', 'wallet', 'subscription'];
