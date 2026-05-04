/* ─────────────────────────────────────────────────────────────────
 * FlyttGo subscription tiers — country-multiplier pricing engine.
 *
 * Five tiers mapped to lead-priority + commercial positioning:
 *
 *   Silver       — entry / Free
 *   Silver Plus  — visibility unlock
 *   Gold         — growth acceleration
 *   Gold Pro     — commercial-grade provider
 *   Elite        — Certified Infrastructure Partner
 *                  (institutional / enterprise / government tier)
 *
 * The DB identifier for Elite stays `elite` (mirrors the existing
 * `SUBSCRIPTION_PLANS.id` and `driver_subscriptions.plan` column);
 * display copy uses "Certified Infrastructure Partner" throughout.
 * Renaming the DB slug would break every existing subscription row.
 *
 * Pricing model:
 *   - USD monthly baseline per tier
 *   - country multiplier (US = 1.0; UK 0.85; DE/FR 0.75; NO 1.2;
 *                          AE 0.9; West Africa 0.35; East Africa 0.25;
 *                          India 0.20; Canada 0.95)
 *   - localized currency display via Intl.NumberFormat
 *
 * Adding a new market: extend COUNTRY_PRICING_MULTIPLIERS + the
 * subscription-tier pricing migration in lockstep.
 * ───────────────────────────────────────────────────────────────── */

import type { PricingCountry } from './pricing-engine';
import { findCountryProfile } from './country-profiles';
import type { TrustBadgeSlug } from './provider-scoring-store';

export type SubscriptionTierSlug =
  | 'silver'
  | 'silver_plus'
  | 'gold'
  | 'gold_pro'
  | 'elite';                 // DB-stable; displayed as "Certified Infrastructure Partner"

/** Privileges unlocked at this tier. Lower tiers inherit nothing
 *  from higher tiers — every privilege a tier offers must be listed
 *  explicitly so the marketing copy + comparison grid stay honest. */
export type TierPrivilege =
  | 'standard-queue'
  | 'moderate-dispatch'
  | 'high-dispatch'
  | 'priority-dispatch'             // Gold Pro
  | 'top-of-marketplace'            // Gold Pro+
  | 'first-access-jobs'             // Elite/CIP only
  | 'corporate-relocation-access'   // Gold Pro+
  | 'enterprise-relocation-access'  // Elite/CIP only
  | 'university-relocation-access'  // Elite/CIP only
  | 'municipal-relocation-access'   // Elite/CIP only
  | 'government-deployment-access'  // Elite/CIP only
  | 'api-routing-priority'          // Elite/CIP only
  | 'accelerated-payout'            // Elite/CIP only
  | 'advanced-analytics'            // Gold Pro+
  | 'featured-listing'              // Gold Pro+
  | 'dedicated-account-manager'     // Gold+
  | 'priority-phone-support';

export interface SubscriptionTier {
  slug:           SubscriptionTierSlug;
  /** What we display to customers + providers. */
  displayName:    string;
  /** Compact name for tight UI (e.g. provider profile cards). */
  shortName:      string;
  /** Marketing tagline. */
  tagline:        string;
  /** USD baseline for the cadence below. Lower-cost tiers bill
   *  daily so casual providers can opt in for a single peak day;
   *  higher-tier commitments stay monthly. */
  baselineUSD:    number;
  /** Billing cadence. Drives both the price suffix ("/ day" vs
   *  "/ month") and the eventual Stripe-subscription interval. */
  cadence:        'daily' | 'monthly';
  /** Platform commission percentage at this tier. */
  commissionPct:  number;
  /** Privileges unlocked. */
  privileges:     TierPrivilege[];
  /** Trust badge that auto-shows on the provider's profile. */
  badge?:         TrustBadgeSlug;
  /** Highlighted on the comparison grid. */
  popular:        boolean;
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    slug:        'silver',
    displayName: 'Silver',
    shortName:   'Silver',
    tagline:     'Entry tier · all standard jobs',
    baselineUSD: 0,
    cadence:     'daily',
    commissionPct: 0.30,
    privileges:  ['standard-queue'],
    badge:       'registered-provider',
    popular:     false,
  },
  {
    slug:        'silver_plus',
    displayName: 'Silver Plus',
    shortName:   'Silver+',
    tagline:     'Visibility unlock — moderate dispatch priority',
    /* $29/day — daily cadence keeps the tier accessible for a
     * single peak-day opt-in without committing to a full month. */
    baselineUSD: 29,
    cadence:     'daily',
    commissionPct: 0.25,
    privileges:  ['standard-queue', 'moderate-dispatch'],
    badge:       'verified-provider',
    popular:     false,
  },
  {
    slug:        'gold',
    displayName: 'Gold',
    shortName:   'Gold',
    tagline:     'Growth acceleration · high-priority dispatch + dedicated AM',
    /* $79/day — daily cadence so corridor specialists can opt in
     * for peak weeks (Memorial Day, end-of-month, university
     * intake) without a multi-month commitment. */
    baselineUSD: 79,
    cadence:     'daily',
    commissionPct: 0.20,
    privileges:  ['standard-queue', 'high-dispatch', 'dedicated-account-manager'],
    badge:       'verified-provider',
    popular:     true,
  },
  {
    slug:        'gold_pro',
    displayName: 'Gold Pro',
    shortName:   'Gold Pro',
    tagline:     'Commercial-grade — top placement + corporate eligibility',
    baselineUSD: 199,
    cadence:     'monthly',
    commissionPct: 0.15,
    privileges: [
      'standard-queue', 'priority-dispatch', 'top-of-marketplace',
      'corporate-relocation-access', 'featured-listing',
      'advanced-analytics', 'dedicated-account-manager',
      'priority-phone-support',
    ],
    badge:    'corporate-ready',
    popular:  false,
  },
  {
    slug:        'elite',
    displayName: 'Certified Infrastructure Partner',
    shortName:   'CIP',
    tagline:     'Institutional gateway · government + enterprise + university procurement',
    baselineUSD: 499,
    cadence:     'monthly',
    commissionPct: 0.10,
    privileges: [
      'first-access-jobs',
      'priority-dispatch', 'top-of-marketplace',
      'corporate-relocation-access', 'enterprise-relocation-access',
      'university-relocation-access', 'municipal-relocation-access',
      'government-deployment-access',
      'api-routing-priority', 'accelerated-payout',
      'advanced-analytics', 'featured-listing',
      'dedicated-account-manager', 'priority-phone-support',
    ],
    badge:    'government-ready',
    popular:  false,
  },
];

/* ── Country multipliers — applied to the USD baseline ────────────
 *
 * Markets we don't list inherit 1.0 (US benchmark). Update in
 * lockstep with docs/install-subscription-tier-pricing.sql so live
 * Supabase reads return identical numbers.
 */
export const COUNTRY_PRICING_MULTIPLIERS: Partial<Record<PricingCountry, number>> = {
  us: 1.00,
  ca: 0.95,
  gb: 0.85,
  de: 0.75,
  fr: 0.75,
  no: 1.20,
  ae: 0.90,
  ng: 0.35,        // West Africa (Nigeria — cluster anchor)
  ke: 0.25,        // East Africa (Kenya — cluster anchor)
};

/** Lookup with a 1.0 fallback so unknown countries default to the
 *  US benchmark price (better than rendering "—"). */
export function multiplierForCountry(country: PricingCountry): number {
  return COUNTRY_PRICING_MULTIPLIERS[country] ?? 1.0;
}

/* ── Local price resolver ────────────────────────────────────────
 *
 * Returns the rendered price string for a tier in a specific country
 * with proper locale-aware grouping + symbol position. Built on
 * Intl.NumberFormat so it handles `kr 599`, `₦8,500`, `60,00 €` etc.
 * automatically.
 */
export interface LocalizedTierPrice {
  amount:     number;
  currency:   string;
  symbol:     string;
  formatted:  string;        // 'kr 599' / '$199' / '60,00 €'
  /** True when the tier is free (renders as 'Free' instead of currency). */
  isFree:     boolean;
  /** Billing cadence — propagated from the tier definition for
   *  rendering convenience. */
  cadence:    'daily' | 'monthly';
  /** Localized cadence suffix the UI appends after the formatted
   *  amount, e.g. " / day", " / Tag", " / dag". Already includes
   *  the leading space. Empty string when isFree. */
  cadenceLabel: string;
}

const FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

function priceFormatter(currency: string, locale: string): Intl.NumberFormat {
  const key = `${currency}-${locale}`;
  let f = FORMATTER_CACHE.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency', currency,
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    });
    FORMATTER_CACHE.set(key, f);
  }
  return f;
}

const LOCALE_BY_CURRENCY: Record<string, string> = {
  USD: 'en-US', CAD: 'en-CA', GBP: 'en-GB', EUR: 'en-IE',
  NOK: 'nb-NO', NGN: 'en-NG', KES: 'en-KE', AED: 'en-AE',
};

/* Per-locale "/ day" and "/ month" suffix (with leading space).
 * Falls back to English when the locale isn't registered. */
const CADENCE_SUFFIXES: Record<string, { daily: string; monthly: string }> = {
  'en-US': { daily: ' / day',     monthly: ' / month' },
  'en-CA': { daily: ' / day',     monthly: ' / month' },
  'en-GB': { daily: ' / day',     monthly: ' / month' },
  'en-IE': { daily: ' / day',     monthly: ' / month' },
  'fr-FR': { daily: ' / jour',    monthly: ' / mois' },
  'fr-CA': { daily: ' / jour',    monthly: ' / mois' },
  'de-DE': { daily: ' / Tag',     monthly: ' / Monat' },
  'nb-NO': { daily: ' / dag',     monthly: ' / måned' },
  'en-NG': { daily: ' / day',     monthly: ' / month' },
  'en-KE': { daily: ' / day',     monthly: ' / month' },
  'en-AE': { daily: ' / day',     monthly: ' / month' },
};

function cadenceSuffix(locale: string, cadence: 'daily' | 'monthly'): string {
  const entry = CADENCE_SUFFIXES[locale] ?? CADENCE_SUFFIXES['en-US'];
  return cadence === 'daily' ? entry.daily : entry.monthly;
}

export function localPriceForTier(
  tier:    SubscriptionTier | SubscriptionTierSlug,
  country: PricingCountry,
): LocalizedTierPrice {
  const t = typeof tier === 'string'
    ? SUBSCRIPTION_TIERS.find(x => x.slug === tier)!
    : tier;
  const profile    = findCountryProfile(country);
  const multiplier = multiplierForCountry(country);
  const locale     = LOCALE_BY_CURRENCY[profile.currency] ?? 'en-US';

  /* USD baseline → local-currency amount. The baseline is the
   * cadence-specific USD price (daily for tiers with cadence='daily',
   * monthly for cadence='monthly'). We multiply by the country
   * multiplier AND the country's USD rate to land on the
   * local-currency value, then round to whole units (sub-unit
   * pricing reads as noise on a marketing surface). */
  const rawAmount = t.baselineUSD * multiplier * profile.usdRate;
  /* Daily prices in low-multiplier markets can round to 0 (e.g.
   * $1.49 × 0.25 = $0.37 in NGN/KES baseline) which would render
   * as "Free" and confuse providers. Floor at 1 unit when the tier
   * isn't actually free. */
  const localAmount = t.baselineUSD === 0
    ? 0
    : Math.max(1, Math.round(rawAmount));
  const isFree = localAmount === 0;
  return {
    amount:     localAmount,
    currency:   profile.currency,
    symbol:     profile.symbol,
    formatted:  isFree
      ? 'Free'
      : priceFormatter(profile.currency, locale).format(localAmount),
    isFree,
    cadence:    t.cadence,
    cadenceLabel: isFree ? '' : cadenceSuffix(locale, t.cadence),
  };
}

/* ── Privilege metadata for UI rendering ─────────────────────── */

export const PRIVILEGE_LABELS: Record<TierPrivilege, string> = {
  'standard-queue':              'Standard job queue access',
  'moderate-dispatch':           'Moderate dispatch priority',
  'high-dispatch':               'High dispatch priority',
  'priority-dispatch':           'Priority dispatch routing',
  'top-of-marketplace':          'Top-of-marketplace placement',
  'first-access-jobs':           'First access to all jobs',
  'corporate-relocation-access': 'Corporate relocation visibility',
  'enterprise-relocation-access':'Enterprise relocation eligibility',
  'university-relocation-access':'University relocation eligibility',
  'municipal-relocation-access': 'Municipal relocation eligibility',
  'government-deployment-access':'Government deployment routing',
  'api-routing-priority':        'API booking routing priority',
  'accelerated-payout':          'Accelerated payout eligibility',
  'advanced-analytics':          'Advanced analytics dashboard',
  'featured-listing':            'Featured provider listing',
  'dedicated-account-manager':   'Dedicated account manager',
  'priority-phone-support':      'Priority phone support',
};

export function findTier(slug: SubscriptionTierSlug): SubscriptionTier {
  const tier = SUBSCRIPTION_TIERS.find(t => t.slug === slug);
  if (!tier) throw new Error(`Unknown subscription tier ${slug}`);
  return tier;
}
