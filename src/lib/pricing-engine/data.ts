/* ─────────────────────────────────────────────────────────────────
 * FlyttGo pricing engine · data tables
 *
 * Curated data backing the 9-layer engine. In production these load
 * from Supabase tables (see ./schema.sql); for now we ship a curated
 * baseline so the engine is fully demonstrable on day one.
 *
 * Anchored on the user-supplied US relocation rate intelligence
 * (BLS, MoveBuddha, HireAHelper, MovingHelp) plus equivalent EU
 * salary + relocation studies.
 * ───────────────────────────────────────────────────────────────── */

import type { BookingCountry } from '../store';
import type {
  ServiceType, InsuranceTier, Currency, QuoteInput,
} from './types';

/* ── Layer 1 — Country pricing baseline ────────────────────────── */

export interface CountryBaseline {
  /** Median single-mover hourly rate the engine multiplies up from. */
  baseHourly: number;
  currency:   Currency;
  /** Customer-facing formatted currency symbol. */
  symbol:     string;
  /** Per-km mileage rate when distance > city radius. */
  perKm:      number;
}

export const COUNTRY_BASELINES: Record<BookingCountry, CountryBaseline> = {
  us: { baseHourly: 75, currency: 'USD', symbol: '$', perKm: 1.4 },
  ca: { baseHourly: 70, currency: 'CAD', symbol: 'C$', perKm: 1.5 },
  gb: { baseHourly: 55, currency: 'GBP', symbol: '£', perKm: 1.2 },
  de: { baseHourly: 60, currency: 'EUR', symbol: '€', perKm: 1.3 },
  fr: { baseHourly: 55, currency: 'EUR', symbol: '€', perKm: 1.3 },
  no: { baseHourly: 600, currency: 'NOK', symbol: 'kr', perKm: 12 },
};

/* ── Layer 2 — City multipliers ────────────────────────────────── */

/* Keyed by the country's BookingCountry code, then by lowercase
 * city slug. Lookup is case-insensitive and tolerant of "City, ST"
 * suffixes (we strip after the first comma). Cities not listed
 * fall through to multiplier 1.0 (= country baseline). */
export const CITY_MULTIPLIERS: Record<BookingCountry, Record<string, number>> = {
  us: {
    'new york':     1.6,
    'manhattan':    1.65,
    'brooklyn':     1.55,
    'san francisco': 1.55,
    'los angeles':  1.45,
    'boston':       1.4,
    'washington':   1.35,
    'seattle':      1.3,
    'chicago':      1.2,
    'austin':       1.05,
    'atlanta':      0.95,
    'dallas':       1.0,
    'houston':      0.95,
    'phoenix':      0.95,
    'miami':        1.1,
    'denver':       1.1,
    'nashville':    0.95,
    'charlotte':    0.9,
    'tampa':        0.9,
  },
  ca: {
    'toronto':   1.35,
    'vancouver': 1.4,
    'montréal':  1.15,
    'montreal':  1.15,
    'calgary':   1.1,
    'ottawa':    1.05,
    'edmonton':  1.0,
    'halifax':   0.95,
  },
  gb: {
    'london':     1.55,
    'manchester': 1.05,
    'birmingham': 1.0,
    'leeds':      0.95,
    'bristol':    1.05,
    'edinburgh':  1.1,
    'glasgow':    0.95,
  },
  de: {
    'berlin':      1.2,
    'münchen':     1.35,
    'munich':      1.35,
    'hamburg':     1.2,
    'frankfurt':   1.3,
    'stuttgart':   1.2,
    'köln':        1.1,
    'cologne':     1.1,
    'düsseldorf':  1.15,
  },
  fr: {
    'paris':     1.45,
    'lyon':      1.1,
    'marseille': 1.05,
    'toulouse':  1.0,
    'bordeaux':  1.05,
    'lille':     0.95,
    'nice':      1.15,
  },
  no: {
    'oslo':      1.15,
    'bergen':    1.05,
    'trondheim': 1.0,
    'stavanger': 1.05,
    'drammen':   0.95,
    'tromsø':    1.1,
  },
};

/* ── Layer 3 — Crew size multipliers ───────────────────────────── */

export const CREW_MULTIPLIERS: Record<2 | 3 | 4 | 5, number> = {
  2: 1.0,
  3: 1.45,
  4: 1.9,
  5: 2.3,
};

/* ── Layer 4 — Service-type adjustments ────────────────────────── */

/* `additivePerHour` is added on top of the per-hour crew rate; some
 * services (storage / corporate) use a percentage multiplier instead
 * — we capture both and apply additive-first then % so the breakdown
 * is unambiguous. */
export interface ServiceAdjustment {
  additivePerHour: number;       // in country currency
  multiplier:      number;       // 1.0 = no change
  label:           string;
}

export const SERVICE_ADJUSTMENTS: Record<ServiceType, ServiceAdjustment> = {
  'labor-only':   { additivePerHour: 0,  multiplier: 1.0,  label: 'Labor-only crew' },
  'movers-truck': { additivePerHour: 60, multiplier: 1.0,  label: 'Movers + truck' },
  'packing':      { additivePerHour: 25, multiplier: 1.0,  label: 'Packing crew' },
  'storage':      { additivePerHour: 20, multiplier: 1.0,  label: 'Storage staging' },
  'corporate':    { additivePerHour: 0,  multiplier: 1.7,  label: 'Corporate coordination' },
};

/* ── Layer 5 — Complexity factors (additive percentage) ────────── */

export const COMPLEXITY_FACTORS = {
  stairsPerFlight: 0.05,
  longCarry:       0.05,
  elevatorWait:    0.03,
  fragile:         0.04,
  assembly:        0.05,
} as const;

/* ── Layer 6 — Timing factors (additive percentage) ────────────── */

export const TIMING_FACTORS = {
  weekend:    0.12,
  evening:    0.08,
  peakSeason: 0.15,
} as const;

/* ── Layer 8 — Insurance options (per-hour additive) ───────────── */

export interface InsuranceOption {
  tier:     InsuranceTier;
  perHour:  number;
  label:    string;
  blurb:    string;
}

export const INSURANCE_OPTIONS: Record<InsuranceTier, InsuranceOption> = {
  basic:   { tier: 'basic',   perHour: 0,  label: 'Basic liability',         blurb: 'Goods-in-transit cover, $50k limit per booking. Included in every booking.' },
  full:    { tier: 'full',    perHour: 12, label: 'Full-value protection',   blurb: 'Replacement-value cover for declared inventory, $250k limit.' },
  premium: { tier: 'premium', perHour: 22, label: 'Premium coverage',        blurb: 'Replacement value + accidental damage + delay cover, $500k limit.' },
};

/* ── Layer 9 — Marketplace commission ──────────────────────────── */

export const COMMISSION_DEFAULT = 0.20;        // 20% — mid-band default
export const COMMISSION_BAND    = { min: 0.10, max: 0.25 };

/* ── Defaults pulled when the input doesn't carry an override ──── */

export const QUOTE_DEFAULTS: Required<Pick<QuoteInput, 'crewSize' | 'serviceType' | 'estimatedHours' | 'insurance'>> = {
  crewSize:       2,
  serviceType:    'labor-only',
  estimatedHours: 3,
  insurance:      'basic',
};

/** Two-hour minimum on every booking. */
export const HOURS_MIN = 2;
