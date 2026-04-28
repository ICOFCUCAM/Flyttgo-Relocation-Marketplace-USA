/* ─────────────────────────────────────────────────────────────────
 * FlyttGo pricing engine · calculate()
 *
 * Pure function: given a QuoteInput, returns a fully decomposed
 * QuoteBreakdown. Every layer that contributes to the price emits a
 * QuoteStep so the customer-facing UI can render the ledger
 * line-by-line — no hidden multipliers.
 *
 * Rounding:
 *   - Per-hour rates kept as floats during composition.
 *   - Final subtotal rounded to whole-currency unit at the end.
 *   - Per-step contributions rounded for display only; the running
 *     total is computed against the unrounded math, so rounding
 *     errors don't cascade.
 * ───────────────────────────────────────────────────────────────── */

import {
  COUNTRY_BASELINES, CITY_MULTIPLIERS, CREW_MULTIPLIERS,
  SERVICE_ADJUSTMENTS, COMPLEXITY_FACTORS, TIMING_FACTORS,
  INSURANCE_OPTIONS, COMMISSION_DEFAULT, QUOTE_DEFAULTS, HOURS_MIN,
  COMMISSION_BAND,
} from './data';
import type {
  QuoteBreakdown, QuoteInput, QuoteStep, PricingCountry, InsuranceTier,
} from './types';
import { COUNTRY_PROFILES } from '../country-profiles';

/* Per-country insurance availability + per-hour multiplier resolver.
 * Looks up the country profile (which lives in country-profiles.ts to
 * avoid circular imports back into pricing-engine/data.ts) and
 * returns the multiplier to apply to the global INSURANCE_OPTIONS
 * rate. Falls back to 1.0 when the tier isn't listed for that country
 * — calling code is responsible for not offering the tier in the UI. */
function resolveInsuranceMultiplier(country: PricingCountry, tier: InsuranceTier): number {
  const profile = COUNTRY_PROFILES.find(p => p.code === country);
  if (!profile) return 1.0;
  const entry = profile.insuranceAvailability.find(a => a.tier === tier);
  return entry?.perHourMultiplier ?? 1.0;
}

/* Strip "City, ST" → "city"; lowercase + trim; keep accents (so
 * "Montréal" matches the table key). */
function normaliseCity(city: string): string {
  return city.split(',')[0].trim().toLowerCase();
}

function clampCommission(pct: number | undefined): number {
  const v = pct ?? COMMISSION_DEFAULT;
  if (v < COMMISSION_BAND.min) return COMMISSION_BAND.min;
  if (v > COMMISSION_BAND.max) return COMMISSION_BAND.max;
  return v;
}

export function calculateQuote(input: QuoteInput): QuoteBreakdown {
  const baseline = COUNTRY_BASELINES[input.country];
  const crewSize       = input.crewSize       ?? QUOTE_DEFAULTS.crewSize;
  const serviceType    = input.serviceType    ?? QUOTE_DEFAULTS.serviceType;
  const estimatedHours = Math.max(HOURS_MIN, input.estimatedHours ?? QUOTE_DEFAULTS.estimatedHours);
  const insurance      = input.insurance      ?? QUOTE_DEFAULTS.insurance;
  const commissionPct  = clampCommission(input.commissionPct);

  /* ── Layer 1 — Country baseline (per-mover hourly) ────────────── */
  const steps: QuoteStep[] = [];
  const hourlyPerMover_L1 = baseline.baseHourly;
  steps.push({
    layer:        'country',
    label:        `Country baseline (${input.country.toUpperCase()})`,
    contribution: hourlyPerMover_L1,
    detail:       `${baseline.symbol}${hourlyPerMover_L1}/hr per mover`,
  });

  /* ── Layer 2 — City multiplier ────────────────────────────────── */
  const cityKey = input.city ? normaliseCity(input.city) : null;
  const cityMultiplier = cityKey
    ? (CITY_MULTIPLIERS[input.country]?.[cityKey] ?? 1.0)
    : 1.0;
  const cityName = cityKey && CITY_MULTIPLIERS[input.country]?.[cityKey] != null
    ? input.city!.split(',')[0].trim()
    : null;
  const hourlyPerMover_L2 = hourlyPerMover_L1 * cityMultiplier;
  if (cityMultiplier !== 1.0) {
    steps.push({
      layer:        'city',
      label:        `City multiplier${cityName ? ` (${cityName})` : ''}`,
      contribution: hourlyPerMover_L2 - hourlyPerMover_L1,
      detail:       `× ${cityMultiplier.toFixed(2)}`,
    });
  }

  /* ── Layer 3 — Crew multiplier (scales the per-mover rate up to a
   *               crew rate). */
  const crewMultiplier = CREW_MULTIPLIERS[crewSize];
  const hourlyCrew_L3 = hourlyPerMover_L2 * crewMultiplier;
  steps.push({
    layer:        'crew',
    label:        `Crew of ${crewSize}`,
    contribution: hourlyCrew_L3 - hourlyPerMover_L2,
    detail:       `× ${crewMultiplier.toFixed(2)}`,
  });

  /* ── Layer 4 — Service type adjustment (additive per-hour, then
   *               percentage multiplier). */
  const service = SERVICE_ADJUSTMENTS[serviceType];
  const hourlyCrew_L4a = hourlyCrew_L3 + service.additivePerHour;
  const hourlyCrew_L4  = hourlyCrew_L4a * service.multiplier;
  if (service.additivePerHour !== 0 || service.multiplier !== 1.0) {
    steps.push({
      layer:        'service',
      label:        service.label,
      contribution: hourlyCrew_L4 - hourlyCrew_L3,
      detail:       service.additivePerHour > 0
        ? `+ ${baseline.symbol}${service.additivePerHour}/hr`
        : `× ${service.multiplier.toFixed(2)}`,
    });
  }

  /* ── Layer 5 — Complexity factor (single combined % applied
   *               once to the hourly crew rate). */
  const c = input.complexity ?? {};
  const complexityFactor =
    (c.stairsFlights ?? 0) * COMPLEXITY_FACTORS.stairsPerFlight +
    (c.longCarry     ? COMPLEXITY_FACTORS.longCarry    : 0) +
    (c.elevatorWait  ? COMPLEXITY_FACTORS.elevatorWait : 0) +
    (c.fragile       ? COMPLEXITY_FACTORS.fragile      : 0) +
    (c.assembly      ? COMPLEXITY_FACTORS.assembly     : 0);
  const hourlyCrew_L5 = hourlyCrew_L4 * (1 + complexityFactor);
  if (complexityFactor > 0) {
    const detailParts: string[] = [];
    if (c.stairsFlights) detailParts.push(`Stairs × ${c.stairsFlights}`);
    if (c.longCarry)     detailParts.push('Long carry');
    if (c.elevatorWait)  detailParts.push('Elevator wait');
    if (c.fragile)       detailParts.push('Fragile items');
    if (c.assembly)      detailParts.push('Assembly');
    steps.push({
      layer:        'complexity',
      label:        'Complexity uplift',
      contribution: (hourlyCrew_L5 - hourlyCrew_L4) * estimatedHours,
      detail:       `${(complexityFactor * 100).toFixed(0)}% · ${detailParts.join(' · ')}`,
    });
  }

  /* ── Layer 6 — Timing factor (single combined % applied once to
   *               the hourly crew rate). */
  const t = input.timing ?? {};
  const timingFactor =
    (t.weekend    ? TIMING_FACTORS.weekend    : 0) +
    (t.evening    ? TIMING_FACTORS.evening    : 0) +
    (t.peakSeason ? TIMING_FACTORS.peakSeason : 0);
  const hourlyCrew_L6 = hourlyCrew_L5 * (1 + timingFactor);
  if (timingFactor > 0) {
    const detailParts: string[] = [];
    if (t.weekend)    detailParts.push('Weekend');
    if (t.evening)    detailParts.push('Evening');
    if (t.peakSeason) detailParts.push('Peak season');
    steps.push({
      layer:        'timing',
      label:        'Timing uplift',
      contribution: (hourlyCrew_L6 - hourlyCrew_L5) * estimatedHours,
      detail:       `${(timingFactor * 100).toFixed(0)}% · ${detailParts.join(' · ')}`,
    });
  }

  /* Subtotal of the labor portion (hourly × hours, post-complexity +
   * timing). All later layers add to or subtract from this. */
  const laborSubtotal = hourlyCrew_L6 * estimatedHours;

  /* The labor "subtotal" line is the sum of the country/city/crew/
   * service contributions above, plus the complexity + timing
   * contributions. We've already pushed each — assert the math. */

  /* ── Layer 7 — Distance mileage (out-of-city haul only) ───────── */
  let distanceContribution = 0;
  if (input.distanceKm && input.distanceKm > 0) {
    distanceContribution = input.distanceKm * baseline.perKm;
    steps.push({
      layer:        'distance',
      label:        'Out-of-city distance',
      contribution: distanceContribution,
      detail:       `${input.distanceKm} km × ${baseline.symbol}${baseline.perKm}/km`,
    });
  }

  /* ── Layer 8 — Insurance tier · country-adaptive ──────────────── */
  const ins = INSURANCE_OPTIONS[insurance];
  const countryInsuranceMult = resolveInsuranceMultiplier(input.country, insurance);
  const insurancePerHour     = ins.perHour * countryInsuranceMult;
  const insuranceContribution = insurancePerHour * estimatedHours;
  if (insuranceContribution > 0) {
    const detail = countryInsuranceMult !== 1.0
      ? `${baseline.symbol}${insurancePerHour.toFixed(0)}/hr × ${estimatedHours}h · ${input.country.toUpperCase()} ×${countryInsuranceMult.toFixed(2)}`
      : `${baseline.symbol}${insurancePerHour.toFixed(0)}/hr × ${estimatedHours}h`;
    steps.push({
      layer:        'insurance',
      label:        ins.label,
      contribution: insuranceContribution,
      detail,
    });
  }

  /* Customer subtotal — labor + distance + insurance. */
  const customerTotalRaw =
    laborSubtotal + distanceContribution + insuranceContribution;
  const customerTotal = Math.round(customerTotalRaw);

  /* ── Layer 9 — Marketplace commission ─────────────────────────── */
  const platformMargin = Math.round(customerTotal * commissionPct);
  const providerPayout = customerTotal - platformMargin;
  steps.push({
    layer:        'commission',
    label:        'Marketplace coordination fee',
    contribution: platformMargin,
    detail:       `${(commissionPct * 100).toFixed(0)}% · provider receives ${baseline.symbol}${providerPayout.toLocaleString('en-US')}`,
  });

  return {
    steps,
    customerTotal,
    platformMargin,
    providerPayout,
    hourlyEffective: customerTotal / estimatedHours,
    billedHours:     estimatedHours,
    currency:        baseline.currency,
    resolved: {
      countryBaseline:  hourlyPerMover_L1,
      cityMultiplier,
      cityName,
      crewMultiplier,
      serviceUplift:    hourlyCrew_L4 - hourlyCrew_L3,
      complexityFactor,
      timingFactor,
    },
  };
}
