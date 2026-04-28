/* ─────────────────────────────────────────────────────────────────
 * Provider Earnings Simulator
 *
 * Acquisition tool that estimates how much a provider can earn on
 * the FlyttGo marketplace given a small set of self-reported inputs
 * (city, crew size, services offered, weekly availability). Mirrors
 * the lever Uber + DoorDash use to convert prospects into signed-up
 * providers — answers "how much can I earn?" before they apply.
 *
 * Architecture: thin wrapper around the 9-layer pricing engine —
 * we reuse COUNTRY_BASELINES + CITY_MULTIPLIERS + CREW_MULTIPLIERS +
 * SERVICE_ADJUSTMENTS so the simulator stays in sync with what
 * customers actually pay.
 *
 * Formula (matches the spec the customer provided):
 *
 *   base_rate          = country_rate × city_multiplier
 *   crew_adjustment    = base_rate × crew_multiplier
 *   service_adjustment = truck_bonus + packing_bonus + storage_bonus
 *   gross_hourly       = crew_adjustment + service_adjustment
 *   platform_fee       = gross_hourly × commission_rate
 *   provider_hourly    = gross_hourly − platform_fee
 *   weekend_uplift     = provider_hourly × weekend_share × WEEKEND_PCT
 *   weekly_income      = (provider_hourly + weekend_uplift) × hours_per_week
 *   monthly_income     = weekly_income × WEEKS_PER_MONTH
 *   annual_income      = monthly_income × 12
 * ───────────────────────────────────────────────────────────────── */

import {
  COUNTRY_BASELINES, CITY_MULTIPLIERS, CREW_MULTIPLIERS,
  SERVICE_ADJUSTMENTS, COMMISSION_DEFAULT, TIMING_FACTORS,
} from './pricing-engine';
import type { BookingCountry } from './store';
import type { Currency } from './pricing-engine';

/** Industry standard for converting weekly → monthly. 52 weeks ÷ 12. */
export const WEEKS_PER_MONTH = 4.345;

export type RelocationCorridor =
  | 'local'        // intra-city only
  | 'regional'     // up to ~200 km
  | 'interstate'   // multi-day cross-state
  | 'international'; // cross-border, lift-vans, customs coordination

/** Multiplier on the base hourly to reflect higher per-job revenue
 *  on longer-haul corridors (interstate jobs bill higher hourly
 *  equivalents on average). */
export const CORRIDOR_MULTIPLIERS: Record<RelocationCorridor, number> = {
  local:         1.00,
  regional:      1.10,
  interstate:    1.25,
  international: 1.45,
};

export interface EarningsInput {
  country:       BookingCountry;
  /** Optional canonical city name; falls back to country baseline. */
  city?:         string;
  crewSize:      2 | 3 | 4 | 5;
  /** Whether the provider has a truck (movers + truck bookings). */
  truckAvailable:    boolean;
  /** Whether the provider offers packing crews. */
  packingAvailable:  boolean;
  /** Whether the provider offers storage staging. */
  storageAvailable:  boolean;
  /** Operating availability. */
  hoursPerWeek:      number;       // 1–80
  /** Share of jobs taken on weekends (0–1). 0 = weekday only,
   *  1 = weekend only. Translates into a weighted weekend uplift. */
  weekendShare?:     number;       // default 0
  /** Relocation corridor mix (single-select for simplicity). */
  corridor?:         RelocationCorridor;
  /** Override the default 20% commission (e.g. enterprise contracts
   *  or paid-tier subscribers who get a discount). */
  commissionPct?:    number;
}

export interface EarningsBreakdown {
  /** Per-hour rate the provider earns net of commission. */
  providerHourly:    number;
  /** Per-hour rate the customer pays (gross). */
  customerHourly:    number;
  /** Per-hour platform fee. */
  platformFeeHourly: number;
  /** Projected weekly income (post-commission). */
  weeklyIncome:      number;
  /** Projected monthly income — weekly × 4.345. */
  monthlyIncome:     number;
  /** Projected annual income — monthly × 12. */
  annualIncome:      number;
  /** Hours per week feeding the projection. */
  hoursPerWeek:      number;
  /** Resolved currency + symbol for display. */
  currency:          Currency;
  symbol:            string;
  /** Decomposed contributions for the breakdown UI. */
  contributions:     EarningsContribution[];
}

export interface EarningsContribution {
  label:  string;
  amount: number;     // in country currency, per hour
  detail?: string;
}

/* Bonus rates additive on top of the per-mover crew rate.
 * Values mirror SERVICE_ADJUSTMENTS.additivePerHour where
 * applicable, with storage filling the gap. */
const TRUCK_BONUS_PER_HOUR   = SERVICE_ADJUSTMENTS['movers-truck'].additivePerHour; // 60
const PACKING_BONUS_PER_HOUR = SERVICE_ADJUSTMENTS['packing'].additivePerHour;      // 25
const STORAGE_BONUS_PER_HOUR = SERVICE_ADJUSTMENTS['storage'].additivePerHour;      // 20

/**
 * Run the earnings projection. Pure + synchronous — safe to call on
 * every keystroke for the live UI.
 */
export function simulateEarnings(input: EarningsInput): EarningsBreakdown {
  const baseline = COUNTRY_BASELINES[input.country];
  const cityKey  = input.city
    ? input.city.split(',')[0].trim().toLowerCase()
    : null;
  const cityMultiplier = cityKey
    ? (CITY_MULTIPLIERS[input.country]?.[cityKey] ?? 1.0)
    : 1.0;
  const cityName = cityKey && CITY_MULTIPLIERS[input.country]?.[cityKey] != null
    ? input.city!.split(',')[0].trim()
    : null;

  const crewMultiplier = CREW_MULTIPLIERS[input.crewSize];
  const corridor       = input.corridor ?? 'local';
  const corridorMult   = CORRIDOR_MULTIPLIERS[corridor];
  const commissionPct  = input.commissionPct ?? COMMISSION_DEFAULT;
  const weekendShare   = clamp(input.weekendShare ?? 0, 0, 1);
  const hoursPerWeek   = clamp(input.hoursPerWeek, 1, 80);

  /* Step 1 — base per-mover hourly × city × crew = base crew hourly. */
  const baseRate     = baseline.baseHourly * cityMultiplier;
  const crewHourly   = baseRate * crewMultiplier * corridorMult;

  /* Step 2 — service bonuses additive on top of crew hourly. */
  const truckBonus   = input.truckAvailable   ? TRUCK_BONUS_PER_HOUR   : 0;
  const packingBonus = input.packingAvailable ? PACKING_BONUS_PER_HOUR : 0;
  const storageBonus = input.storageAvailable ? STORAGE_BONUS_PER_HOUR : 0;

  /* Gross hourly the customer pays. */
  const grossHourly = crewHourly + truckBonus + packingBonus + storageBonus;

  /* Weekend uplift weighted by the provider's weekend mix. */
  const weekendUpliftPerHour = grossHourly * weekendShare * TIMING_FACTORS.weekend;
  const customerHourly       = grossHourly + weekendUpliftPerHour;

  /* Platform commission on the customer hourly. */
  const platformFeeHourly    = customerHourly * commissionPct;
  const providerHourly       = customerHourly - platformFeeHourly;

  /* Project to weekly / monthly / annual. */
  const weeklyIncome  = providerHourly * hoursPerWeek;
  const monthlyIncome = weeklyIncome   * WEEKS_PER_MONTH;
  const annualIncome  = monthlyIncome  * 12;

  /* Per-hour contribution breakdown for the UI ledger. Each step
   * shows how the provider's effective hourly is composed. */
  const contributions: EarningsContribution[] = [
    {
      label:  `Country baseline (${input.country.toUpperCase()})`,
      amount: baseline.baseHourly,
      detail: `${baseline.symbol}${baseline.baseHourly}/hr per mover`,
    },
  ];
  if (cityMultiplier !== 1.0) {
    contributions.push({
      label:  `City multiplier${cityName ? ` (${cityName})` : ''}`,
      amount: baseRate - baseline.baseHourly,
      detail: `× ${cityMultiplier.toFixed(2)}`,
    });
  }
  contributions.push({
    label:  `Crew of ${input.crewSize}`,
    amount: crewHourly - baseRate,
    detail: `× ${crewMultiplier.toFixed(2)}${corridorMult !== 1 ? ` × ${corridorMult.toFixed(2)} corridor` : ''}`,
  });
  if (truckBonus)   contributions.push({ label: 'Truck bonus',   amount: truckBonus,   detail: `+ ${baseline.symbol}${truckBonus}/hr` });
  if (packingBonus) contributions.push({ label: 'Packing bonus', amount: packingBonus, detail: `+ ${baseline.symbol}${packingBonus}/hr` });
  if (storageBonus) contributions.push({ label: 'Storage bonus', amount: storageBonus, detail: `+ ${baseline.symbol}${storageBonus}/hr` });
  if (weekendUpliftPerHour > 0) {
    contributions.push({
      label:  'Weekend uplift',
      amount: weekendUpliftPerHour,
      detail: `${(weekendShare * 100).toFixed(0)}% weekend mix · +12% per weekend hour`,
    });
  }
  contributions.push({
    label:  'Platform fee',
    amount: -platformFeeHourly,
    detail: `${(commissionPct * 100).toFixed(0)}% commission`,
  });

  return {
    providerHourly,
    customerHourly,
    platformFeeHourly,
    weeklyIncome,
    monthlyIncome,
    annualIncome,
    hoursPerWeek,
    currency: baseline.currency,
    symbol:   baseline.symbol,
    contributions,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
