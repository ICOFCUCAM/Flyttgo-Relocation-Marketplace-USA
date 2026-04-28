/* ─────────────────────────────────────────────────────────────────
 * FlyttGo pricing engine · types
 *
 * Architecture mirrors what the customer-supplied design doc calls
 * for: a 9-layer composable engine that turns a quote input into a
 * fully-broken-down ledger of contributions, ending with a customer
 * total + provider payout + platform margin.
 *
 * Layers (in evaluation order):
 *   1. country        — base hourly rate per market
 *   2. city           — metro-level multiplier on top of country base
 *   3. crew           — crew-size multiplier (2 / 3 / 4 / 5 movers)
 *   4. service        — service-type adjustment (truck / pack / store)
 *   5. complexity     — stairs, long carry, elevator wait, fragile, assembly
 *   6. timing         — weekend / evening / peak-season uplift
 *   7. distance       — per-km mileage on top of hourly when out-of-city
 *   8. insurance      — basic / full / premium coverage uplift
 *   9. commission     — marketplace cut (provider payout = total − margin)
 *
 * Every layer's contribution is captured as a QuoteStep so the
 * customer-facing breakdown shows precisely *why* the price is what
 * it is — no hidden multipliers, no surprise fees.
 *
 * Backend mapping (eventual Supabase tables):
 *   - countries_pricing       → COUNTRY_BASELINES
 *   - cities_pricing          → CITY_MULTIPLIERS
 *   - crew_multipliers        → CREW_MULTIPLIERS
 *   - service_type_adjustments→ SERVICE_ADJUSTMENTS
 *   - complexity_adjustments  → COMPLEXITY_FACTORS
 *   - seasonal_adjustments    → TIMING_FACTORS
 *   - insurance_options       → INSURANCE_OPTIONS
 *   - commission_rules        → COMMISSION_DEFAULT
 *
 * See ./schema.sql for the matching DDL.
 * ───────────────────────────────────────────────────────────────── */

import type { BookingCountry } from '../store';

/* ─────────────────────────────────────────────────────────────────
 * PricingCountry — superset of BookingCountry that the engine
 * supports. Booking surfaces (BookingShortcut, country shopfronts)
 * stay scoped to BookingCountry's six launch markets; the engine
 * itself, the live calculator, and the earnings simulator widen to
 * the full marketplace footprint so prospects in expansion markets
 * (Nigeria, Kenya, UAE) see realistic rates before we activate
 * dedicated country shopfronts.
 *
 * Adding a new country:
 *   1. Add the ISO-2 code below.
 *   2. Seed COUNTRY_BASELINES + CITY_MULTIPLIERS in ./data.ts.
 *   3. Add the country profile (currency, tax mode, service model)
 *      to lib/country-profiles.ts.
 *   4. Add the corresponding seed rows to docs/install-country-profiles.sql.
 * ───────────────────────────────────────────────────────────────── */
export type PricingCountry =
  | BookingCountry           // 'us' | 'ca' | 'gb' | 'de' | 'fr' | 'no'
  | 'ng'                     // Nigeria
  | 'ke'                     // Kenya
  | 'ae';                    // United Arab Emirates

export type ServiceType =
  | 'labor-only'
  | 'movers-truck'
  | 'packing'
  | 'storage'
  | 'corporate';

export type InsuranceTier = 'basic' | 'full' | 'premium';

export type Currency = 'USD' | 'CAD' | 'EUR' | 'GBP' | 'NOK' | 'NGN' | 'KES' | 'AED';

export interface ComplexityInput {
  stairsFlights?:  number;   // 0+ flights, 0.05 each
  longCarry?:      boolean;  // 0.05
  elevatorWait?:   boolean;  // 0.03
  fragile?:        boolean;  // 0.04
  assembly?:       boolean;  // 0.05
}

export interface TimingInput {
  weekend?:    boolean;      // 0.12
  evening?:    boolean;      // 0.08
  peakSeason?: boolean;      // 0.15
}

export interface QuoteInput {
  country:        PricingCountry;
  /** Optional canonical city name. Falls back to country baseline if
   *  no city multiplier is registered. Case-insensitive lookup. */
  city?:          string;
  crewSize:       2 | 3 | 4 | 5;
  serviceType:    ServiceType;
  complexity?:    ComplexityInput;
  timing?:        TimingInput;
  /** Customer's expected duration in hours. Two-hour minimum
   *  enforced inside calculate(). */
  estimatedHours: number;
  /** Out-of-city haul distance in km. 0 / undefined → no mileage
   *  added (move stays inside metro). */
  distanceKm?:    number;
  insurance?:     InsuranceTier;
  /** Override the default marketplace commission percentage (0–1).
   *  Used for enterprise contracts that negotiate a lower rate. */
  commissionPct?: number;
}

/** A single ledger line in the breakdown. */
export interface QuoteStep {
  layer:        'country' | 'city' | 'crew' | 'service'
              | 'complexity' | 'timing' | 'distance'
              | 'insurance' | 'commission';
  label:        string;
  /** Contribution to the running subtotal in major currency units.
   *  Multiplier-only steps (crew, city, complexity, timing) report
   *  the *delta* they added vs the prior subtotal, so each line
   *  reads as "+$X" in the breakdown UI. */
  contribution: number;
  /** Free-form context — "× 1.6 (NYC metro)", "Stairs × 2 flights". */
  detail?:      string;
}

export interface QuoteBreakdown {
  /** Ordered ledger of layer contributions. */
  steps:           QuoteStep[];
  /** Customer pays this amount, all-in. */
  customerTotal:   number;
  /** Marketplace keeps this much. */
  platformMargin:  number;
  /** Provider receives this amount (customerTotal − platformMargin). */
  providerPayout:  number;
  /** Effective per-hour rate the customer pays. */
  hourlyEffective: number;
  /** Hours used for billing (≥ 2). */
  billedHours:     number;
  currency:        Currency;
  /** Country baseline + city multiplier resolved for inspection. */
  resolved:        {
    countryBaseline:  number;
    cityMultiplier:   number;
    cityName:         string | null;
    crewMultiplier:   number;
    serviceUplift:    number;
    complexityFactor: number;
    timingFactor:     number;
  };
}
