/* ─────────────────────────────────────────────────────────────────
 * Country profiles — canonical metadata for every market FlyttGo's
 * pricing engine supports. Mirrors the user-supplied country-adaptive
 * pricing spec: each country carries currency, exchange rate vs USD,
 * tax mode, dominant service model, and which services even make
 * sense in that market.
 *
 * Single source of truth for the customer-facing pricing surfaces:
 *
 *   - LivePriceCalculator    — show currency + symbol per country
 *   - EarningsSimulator      — show only locally-relevant services
 *   - PricingPage            — strategic-positioning panel
 *   - BookingShortcut        — adapt service chips per country
 *   - ProvidersDirectoryPage — group providers by market profile
 *
 * The TS data here is mirrored 1:1 by the rows seeded in
 * docs/install-country-profiles.sql so the engine can swap source
 * (TS curated → Supabase live) with no code change.
 *
 * Adding a new country:
 *   1. Add the ISO-2 code to PricingCountry in pricing-engine/types.ts.
 *   2. Add COUNTRY_BASELINES + CITY_MULTIPLIERS rows in pricing-engine/data.ts.
 *   3. Add a profile entry below.
 *   4. Add the SQL seed row in docs/install-country-profiles.sql.
 *   5. Verify the calculator + simulator chip rows pick it up.
 * ───────────────────────────────────────────────────────────────── */

import type { PricingCountry, ServiceType, InsuranceTier } from './pricing-engine';

/** How a country quotes prices to customers.
 *
 *  vat-included  — final number includes VAT (DE/FR/UK/NO/AE common)
 *  sales-tax-added — quote is pre-tax; sales tax added at checkout
 *                    per state/province (US/CA)
 *  quoted-net    — quote is the all-in number, no tax line
 *                    (NG/KE common — informal sector)
 */
export type TaxMode = 'vat-included' | 'sales-tax-added' | 'quoted-net';

/** Dominant relocation service model per country. Drives which
 *  service chips the booking widget surfaces by default and which
 *  copy lands on the country shopfront. */
export type ServiceModel =
  | 'labor-only-plus-truck'    // US default — labor crews + truck rental coordination
  | 'full-service-bundle'      // DE default — crew + vehicle + packing bundled
  | 'packing-heavy'            // FR default — packing crews lead, hauling secondary
  | 'hourly-crew'              // UK default — pure hourly crew model
  | 'crew-only-distance'       // NG/KE default — crew-only, distance-based pricing
  | 'employer-sponsored';      // AE default — corporate / sponsored relocation

export interface CountryProfile {
  code:         PricingCountry;
  name:         string;
  flag:         string;
  /** Display currency code (matches pricing-engine.Currency). */
  currency:     'USD' | 'CAD' | 'EUR' | 'GBP' | 'NOK' | 'NGN' | 'KES' | 'AED';
  symbol:       string;
  /** Approximate exchange rate vs 1 USD as of seed time. Used only
   *  for cross-market display ("Same move costs $X equivalent in
   *  market Y"). The pricing engine itself never converts — local
   *  customers see local currency only. */
  usdRate:      number;
  /** How prices are quoted to the end customer. */
  taxMode:      TaxMode;
  /** Default service model — drives the booking widget's chip order
   *  and the country shopfront copy. */
  serviceModel: ServiceModel;
  /** Subset of ServiceType slugs that actually exist in this market.
   *  Surfaces only these in the simulator + calculator UI. */
  availableServices: ServiceType[];
  /** Insurance tiers that customers can pick in this market. Some
   *  countries gate certain tiers (e.g. AE corporate-relocation
   *  customers can't buy Basic-only — Full or Premium minimum). The
   *  engine applies these in two ways:
   *    1. UI: insurance picker only shows the listed tiers.
   *    2. Engine: per-tier per-hour overrides multiply the global
   *       INSURANCE_OPTIONS rate by `perHourMultiplier`. */
  insuranceAvailability: InsuranceAvailability[];
  /** Customer-facing copy describing the market's stance, used in
   *  the PricingPage strategic-positioning panel + country shopfronts. */
  marketNote:   string;
}

export interface InsuranceAvailability {
  tier:               InsuranceTier;
  /** Multiplier on the global per-hour rate. 1.0 = no change. */
  perHourMultiplier:  number;
  /** Optional per-country footnote shown next to the tier in the UI. */
  note?:              string;
}

export const COUNTRY_PROFILES: CountryProfile[] = [
  {
    code:         'us',
    name:         'United States',
    flag:         '🇺🇸',
    currency:     'USD',
    symbol:       '$',
    usdRate:      1.0,
    taxMode:      'sales-tax-added',
    serviceModel: 'labor-only-plus-truck',
    availableServices: ['labor-only', 'movers-truck', 'packing', 'storage', 'corporate'],
    insuranceAvailability: [
      { tier: 'basic',   perHourMultiplier: 1.0 },
      { tier: 'full',    perHourMultiplier: 1.0 },
      { tier: 'premium', perHourMultiplier: 1.0, note: 'High-value home + interstate' },
    ],
    marketNote:
      "Largest opportunity is labor-only + coordination. FMCSA-aware verification " +
      "for interstate; sales tax handled per-state at checkout.",
  },
  {
    code:         'ca',
    name:         'Canada',
    flag:         '🇨🇦',
    currency:     'CAD',
    symbol:       'C$',
    usdRate:      1.36,
    taxMode:      'sales-tax-added',
    serviceModel: 'labor-only-plus-truck',
    availableServices: ['labor-only', 'movers-truck', 'packing', 'storage', 'corporate'],
    insuranceAvailability: [
      { tier: 'basic',   perHourMultiplier: 1.0 },
      { tier: 'full',    perHourMultiplier: 1.0 },
      { tier: 'premium', perHourMultiplier: 1.0 },
    ],
    marketNote:
      "GST/PST/HST handled per-province at checkout. Cross-border (US ↔ CA) freight " +
      "coordination available.",
  },
  {
    code:         'gb',
    name:         'United Kingdom',
    flag:         '🇬🇧',
    currency:     'GBP',
    symbol:       '£',
    usdRate:      0.79,
    taxMode:      'vat-included',
    serviceModel: 'hourly-crew',
    availableServices: ['labor-only', 'movers-truck', 'packing', 'storage', 'corporate'],
    insuranceAvailability: [
      { tier: 'basic',   perHourMultiplier: 1.0 },
      { tier: 'full',    perHourMultiplier: 1.0 },
      { tier: 'premium', perHourMultiplier: 1.05, note: 'Includes ABTA-aligned cover' },
    ],
    marketNote:
      "20% VAT included in every quote. GVOL operator licensing for full-truck " +
      "moves; sub-3.5t crews can run unlicensed.",
  },
  {
    code:         'de',
    name:         'Germany',
    flag:         '🇩🇪',
    currency:     'EUR',
    symbol:       '€',
    usdRate:      0.92,
    taxMode:      'vat-included',
    serviceModel: 'full-service-bundle',
    availableServices: ['movers-truck', 'packing', 'storage', 'corporate'],
    insuranceAvailability: [
      /* DE law requires Verkehrshaftpflicht (carrier liability) so
       * Basic isn't a meaningful customer-facing option here — the
       * tier is folded into the regulated baseline. */
      { tier: 'full',    perHourMultiplier: 1.10, note: 'Carrier liability already included by law' },
      { tier: 'premium', perHourMultiplier: 1.10 },
    ],
    marketNote:
      "19% MwSt. included. GüKG-licensed Umzugsfirma. Customers expect bundled " +
      "crew + vehicle + packing — labor-only is rare.",
  },
  {
    code:         'fr',
    name:         'France',
    flag:         '🇫🇷',
    currency:     'EUR',
    symbol:       '€',
    usdRate:      0.92,
    taxMode:      'vat-included',
    serviceModel: 'packing-heavy',
    availableServices: ['movers-truck', 'packing', 'storage', 'corporate'],
    insuranceAvailability: [
      { tier: 'basic',   perHourMultiplier: 1.0 },
      { tier: 'full',    perHourMultiplier: 1.05 },
      { tier: 'premium', perHourMultiplier: 1.05, note: 'Inclut la garantie déménageur' },
    ],
    marketNote:
      "20% TVA included. Inscription au registre des transporteurs. Packing " +
      "(emballage) typically leads the quote, hauling follows.",
  },
  {
    code:         'no',
    name:         'Norway',
    flag:         '🇳🇴',
    currency:     'NOK',
    symbol:       'kr',
    usdRate:      10.5,
    taxMode:      'vat-included',
    serviceModel: 'full-service-bundle',
    availableServices: ['movers-truck', 'packing', 'storage', 'corporate'],
    insuranceAvailability: [
      /* NO insurance market is regulated up — basic is rolled into
       * the operator licence, customers pick Full or Premium. */
      { tier: 'full',    perHourMultiplier: 1.15, note: 'Bredde-dekning · NOK levels' },
      { tier: 'premium', perHourMultiplier: 1.15 },
    ],
    marketNote:
      "25% MVA included. Yrkestransportløyve required for commercial " +
      "transport. Premium market — highest hourly in the marketplace.",
  },
  {
    code:         'ng',
    name:         'Nigeria',
    flag:         '🇳🇬',
    currency:     'NGN',
    symbol:       '₦',
    usdRate:      1_580,
    taxMode:      'quoted-net',
    serviceModel: 'crew-only-distance',
    availableServices: ['labor-only', 'movers-truck'],
    insuranceAvailability: [
      /* Informal sector — Basic only; formal goods-in-transit cover
       * is rare and usually negotiated direct between provider +
       * corporate customers. */
      { tier: 'basic', perHourMultiplier: 0.5, note: 'Limited goods-in-transit cover' },
    ],
    marketNote:
      "Crew-only with distance-based pricing dominates. Lagos premium of ~40% " +
      "over national baseline; Abuja federal capital follows.",
  },
  {
    code:         'ke',
    name:         'Kenya',
    flag:         '🇰🇪',
    currency:     'KES',
    symbol:       'KSh',
    usdRate:      129,
    taxMode:      'quoted-net',
    serviceModel: 'crew-only-distance',
    availableServices: ['labor-only', 'movers-truck'],
    insuranceAvailability: [
      { tier: 'basic', perHourMultiplier: 0.5, note: 'Limited goods-in-transit cover' },
    ],
    marketNote:
      "Nairobi metro carries the highest multiplier; Mombasa coastal moves " +
      "carry their own logistics premium. Negotiated services common.",
  },
  {
    code:         'ae',
    name:         'United Arab Emirates',
    flag:         '🇦🇪',
    currency:     'AED',
    symbol:       'AED',
    usdRate:      3.67,
    taxMode:      'vat-included',
    serviceModel: 'employer-sponsored',
    availableServices: ['movers-truck', 'packing', 'storage', 'corporate'],
    insuranceAvailability: [
      /* AE corporate-sponsored sector defaults to Full minimum;
       * Basic-only isn't offered (matches employer expectations). */
      { tier: 'full',    perHourMultiplier: 1.10, note: 'Mandatory minimum for corporate accounts' },
      { tier: 'premium', perHourMultiplier: 1.10 },
    ],
    marketNote:
      "5% VAT included. Employer-sponsored relocation dominates — corporate " +
      "and packing services lead. Dubai + Abu Dhabi top the multiplier.",
  },
];

export function findCountryProfile(code: PricingCountry): CountryProfile {
  const profile = COUNTRY_PROFILES.find(p => p.code === code);
  if (!profile) throw new Error(`No country profile for ${code}`);
  return profile;
}

/** Convenience — list of country codes ordered by USD-equivalent
 *  baseline rate descending. Used in the PricingPage cross-market
 *  panel so prospects can scan from highest-paying markets down. */
export function countriesByEarningPotential(): CountryProfile[] {
  return [...COUNTRY_PROFILES].sort((a, b) => a.usdRate - b.usdRate);
}

/* Locale-keyed Intl.NumberFormat per currency. Cached so we don't
 * pay the Intl constructor cost on every render. */
const FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

const LOCALE_BY_CURRENCY: Record<CountryProfile['currency'], string> = {
  USD: 'en-US',
  CAD: 'en-CA',
  GBP: 'en-GB',
  EUR: 'en-IE',          // shared EU locale; EUR symbol position varies less than format
  NOK: 'nb-NO',
  NGN: 'en-NG',
  KES: 'en-KE',
  AED: 'en-AE',
};

/**
 * Format a price for a given country using locale-aware
 * Intl.NumberFormat. Returns the country's currency string with
 * proper grouping (`₦8,500`), symbol position (`$1,200` vs `1 200 kr`),
 * and decimal handling per locale.
 *
 *   formatPrice(8500, 'ng') → '₦8,500'
 *   formatPrice(1200, 'us') → '$1,200'
 *   formatPrice(600,  'no') → 'kr 600' (Norwegian convention)
 */
export function formatPrice(amount: number, country: PricingCountry, opts: {
  /** Show 2 decimals (default 0 — relocation pricing is whole-unit). */
  decimals?: number;
} = {}): string {
  const profile  = findCountryProfile(country);
  const decimals = opts.decimals ?? 0;
  const cacheKey = `${profile.currency}-${decimals}`;
  let formatter = FORMATTER_CACHE.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE_BY_CURRENCY[profile.currency], {
      style:                 'currency',
      currency:              profile.currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    FORMATTER_CACHE.set(cacheKey, formatter);
  }
  return formatter.format(amount);
}
