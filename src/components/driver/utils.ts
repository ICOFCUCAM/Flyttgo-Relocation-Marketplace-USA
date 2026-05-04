import { PLAN_OPTIONS, VAT_RATE, type PlanOption } from './types';

export function safeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
}

export function formatDuration(start?: string | null, end?: string | null): string {
  if (!start) return 'Not started';
  const diff = Math.floor(((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 1000);
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

export function daysLeft(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

/** Commission brackets keyed on the lowercase plan IDs stored in
 *  driver_subscriptions.plan. Mirrors the engine's decision matrix. */
export function calcCommission(price: number, plan: string): { rate: number; commission: number; earning: number } {
  const p = Number.isNaN(price) ? 0 : price;
  if (p <= 500) return { rate: 0, commission: 0, earning: p };

  let rate = 0;
  if (plan === 'basic') {
    if (p <= 1500)      rate = 0.2;
    else if (p <= 5000) rate = 0.15;
    else                rate = 0.1;
  }
  if (plan === 'pro_mini' || plan === 'pro') {
    if (p <= 1500)      rate = 0.1;
    else if (p <= 5000) rate = 0.05;
    else                rate = 0.04;
  }
  if (plan === 'unlimited') rate = 0;

  const commission = p * rate;
  return { rate, commission, earning: p - commission };
}

export interface ProrationResult {
  daysInMonth:     number;
  daysUsed:        number;
  daysRemaining:   number;
  dailyRate:       number;
  creditExVat:     number;
  unlimitedExVat:  number;
  dueExVat:        number;
  dueVat:          number;
  dueTotal:        number;
  isFullyCovered:  boolean;
}

/** Pro → Unlimited proration. Returns null if the upgrade isn't a
 *  pro→unlimited transition or the current sub has no start_date.
 *  Accepts a minimal structural shape so callers can pass either a
 *  full DriverSubscriptionRow or a synthetic preview object without
 *  casts. */
export interface ProrationCurrentSub {
  plan?:       string | null;
  start_date?: string | null;
}

export function calculateProration(
  currentSub: ProrationCurrentSub | null | undefined,
  newPlan: PlanOption,
): ProrationResult | null {
  const plan       = currentSub?.plan;
  const startDate  = currentSub?.start_date;
  if (plan !== 'pro' || newPlan.id !== 'unlimited') return null;
  if (!startDate) return null;

  const proPlan       = PLAN_OPTIONS.find(p => p.id === 'pro');
  if (!proPlan) return null;

  const today         = new Date();
  const start         = new Date(startDate);
  const daysInMonth   = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const daysUsed      = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86_400_000));
  const daysRemaining = Math.max(0, daysInMonth - daysUsed);
  const dailyRate     = proPlan.priceUSD / daysInMonth;
  const creditExVat   = Math.round(dailyRate * daysRemaining);
  const dueExVat      = Math.max(0, newPlan.priceUSD - creditExVat);
  const dueVat        = Math.round(dueExVat * VAT_RATE);
  const dueTotal      = dueExVat + dueVat;

  return {
    daysInMonth, daysUsed, daysRemaining,
    dailyRate: Math.round(dailyRate),
    creditExVat,
    unlimitedExVat: newPlan.priceUSD,
    dueExVat, dueVat, dueTotal,
    isFullyCovered: dueTotal === 0,
  };
}
