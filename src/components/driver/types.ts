/* Shared types and constants for the driver portal. */

import type { DriverPlan } from '../../services/_schemas';

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

export const PLAN_OPTIONS: PlanOption[] = [
  { id: 'free',      label: 'Free',      priceUSD: 0,   billing: '',           commission: '0%',  description: 'Jobs up to $50 only · Standard priority',     color: 'border-gray-200',    highlight: false },
  { id: 'basic',     label: 'Basic',     priceUSD: 0,   billing: '',           commission: '20%', description: 'All jobs · Moderate priority · Free plan',    color: 'border-gray-200',    highlight: false },
  { id: 'pro_mini',  label: 'Pro Mini',  priceUSD: 15,  billing: 'USD/day',    commission: '10%', description: 'High priority · Direct card/ACH payments',    color: 'border-blue-300',    highlight: false },
  { id: 'pro',       label: 'Pro',       priceUSD: 150, billing: '/month USD', commission: '10%', description: 'Very high priority · Premium support',         color: 'border-emerald-400', highlight: true  },
  { id: 'unlimited', label: 'Unlimited', priceUSD: 249, billing: '/month USD', commission: '0%',  description: 'Highest priority · Zero commission · VIP',     color: 'border-purple-400',  highlight: false },
];

export const PORTAL_TABS: PortalTab[] = ['overview', 'jobs', 'earnings', 'wallet', 'subscription'];
