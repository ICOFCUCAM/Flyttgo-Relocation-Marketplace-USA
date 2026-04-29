import { COUNTRY_BASELINES } from './pricing-engine';
import type { PricingCountry } from './pricing-engine';

/* ─────────────────────────────────────────────────────────────────
 * route-price-estimator
 *
 * Client-side dispatch-style price preview for the homepage / country
 * shopfront provider cards. Two-tier design:
 *
 *   1. Best path: real driving distance from `lib/routing.getRouteDistance`
 *      (OSRM via the route-distance Supabase edge function, with a
 *      Haversine × 1.4 in-browser fallback). Caller resolves the
 *      route ONCE per page load and feeds `miles` into every card.
 *
 *   2. Cheap path: ZIP-prefix bucket distance for visitors who
 *      typed ZIPs but haven't picked addresses yet. Loose but
 *      directionally correct.
 *
 * Multipliers (transparent, all in this file):
 *   - Distance buckets:      <40 mi (3 h), <120 mi (5 h), <300 mi (8 h), else 12 h
 *   - Tier multipliers:      Elite 1.15, Gold Pro 1.10, Gold 1.05, Silver Plus 1.02
 *   - Metro multipliers:     NYC / LA / SF / Boston / Chicago / Atlanta — applied
 *                            on top of weekday/weekend/month-end/student-season
 *                            timing as a single combined factor.
 *
 * SQL parity:
 *   The static METRO_DEMAND table mirrors the per-row shape proposed
 *   in `docs/install-metro-demand-multipliers.sql` (same column names,
 *   same multiplier columns) so swapping the source from this static
 *   map to the Supabase view is a one-call change inside
 *   resolveDemandTiming(). Until the table is applied, the static map
 *   is authoritative; once applied, route-cache.ts handles the lookup.
 *
 * Returned shape:
 *   - amount    — rounded major-unit price (e.g. 642)
 *   - currency  — 'USD' | 'EUR' | 'NOK' | …
 *   - symbol    — '$' | '€' | 'kr' | …
 *   - hours     — billed hours used in the calc
 *   - miles     — distance in miles when it could be resolved
 *   - source    — 'route' | 'baseline'
 *   - surgeApplied — true when metroMultiplier > 1, used for the UI pill
 *
 * Never throws — bad input falls back to a baseline day-rate so the
 * UI always has something to render.
 * ───────────────────────────────────────────────────────────────── */

export type ProviderTierLabel =
  | 'Elite' | 'Gold Pro' | 'Gold' | 'Silver Plus' | 'Silver'
  | string | undefined;

export interface RoutePriceInput {
  /** Real driving distance in miles, when known (resolved via OSRM
   *  upstream). Caller is expected to fetch once per route, not per
   *  provider card — see TopProviders for the pattern. */
  miles?:      number | null;
  /** ZIP fallback distance buckets, used only when `miles` is null. */
  fromZip?:    string | null;
  toZip?:      string | null;
  country:     PricingCountry;
  tier?:       ProviderTierLabel;
  /** Optional override; defaults to the country baseline hourly rate. */
  baseHourly?: number;
  /** Optional injectable clock for deterministic tests. */
  now?:        Date;
}

export interface RoutePriceResult {
  amount:        number;
  currency:      string;
  symbol:        string;
  hours:         number;
  miles:         number | null;
  source:        'route' | 'baseline';
  surgeApplied:  boolean;
  /** The detected metro code (NYC / LA / …) when one applied — useful
   *  for the optional surge label in the UI. */
  metroCode:     string | null;
}

/* Metro demand table — mirrors the row shape of
 * docs/install-metro-demand-multipliers.sql so swapping to the live
 * view is a typed cutover, not a refactor. */
interface MetroDemandRow {
  metro_code:                string;
  weekday_multiplier:        number;
  weekend_multiplier:        number;
  month_end_multiplier:      number;
  student_season_multiplier: number;
}

const METRO_DEMAND: Record<string, MetroDemandRow> = {
  NYC: { metro_code: 'NYC', weekday_multiplier: 1.08, weekend_multiplier: 1.12, month_end_multiplier: 1.18, student_season_multiplier: 1.10 },
  LA:  { metro_code: 'LA',  weekday_multiplier: 1.06, weekend_multiplier: 1.10, month_end_multiplier: 1.15, student_season_multiplier: 1.04 },
  SF:  { metro_code: 'SF',  weekday_multiplier: 1.07, weekend_multiplier: 1.11, month_end_multiplier: 1.16, student_season_multiplier: 1.06 },
  BOS: { metro_code: 'BOS', weekday_multiplier: 1.05, weekend_multiplier: 1.09, month_end_multiplier: 1.14, student_season_multiplier: 1.18 },
  CHI: { metro_code: 'CHI', weekday_multiplier: 1.04, weekend_multiplier: 1.08, month_end_multiplier: 1.12, student_season_multiplier: 1.03 },
  ATL: { metro_code: 'ATL', weekday_multiplier: 1.03, weekend_multiplier: 1.07, month_end_multiplier: 1.10, student_season_multiplier: 1.02 },
};

export function detectMetroFromZip(zip?: string | null): string | null {
  if (!zip) return null;
  const head = String(zip).slice(0, 2);
  if (head === '10' || head === '11') return 'NYC';
  if (head === '90' || head === '91') return 'LA';
  if (head === '94')                  return 'SF';
  if (head === '02')                  return 'BOS';
  if (head === '60')                  return 'CHI';
  if (head === '30')                  return 'ATL';
  return null;
}

/* Compose weekday / weekend / month-end / student-season multipliers
 * into one effective factor. Monthly student-season window is
 * August + early September (months 7 + 8 zero-indexed). */
function resolveDemandTiming(row: MetroDemandRow | undefined, now: Date = new Date()): number {
  if (!row) return 1;
  const day  = now.getDay();
  const date = now.getDate();

  let m = row.weekday_multiplier;
  if (day === 0 || day === 6)  m = row.weekend_multiplier;
  if (date >= 25)              m *= row.month_end_multiplier;
  if (now.getMonth() === 7 || now.getMonth() === 8) m *= row.student_season_multiplier;
  return m;
}

/* Fallback bucket distance from ZIP prefixes — only used when no real
 * driving distance is available yet. Same heuristic the spec
 * describes: same first 2 digits ≈ 40 mi, different ≈ 180 mi. */
function distanceFromZips(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null;
  const a = String(from).slice(0, 5);
  const b = String(to).slice(0, 5);
  if (!/^\d{5}$/.test(a) || !/^\d{5}$/.test(b)) return null;
  if (a === b)                          return 5;
  if (a.slice(0, 2) === b.slice(0, 2))  return 40;
  return 180;
}

function tierMultiplier(tier: ProviderTierLabel): number {
  if (!tier) return 1;
  const t = tier.toLowerCase();
  if (t === 'elite')                                       return 1.15;
  if (t === 'gold pro' || t === 'gold_pro')                return 1.10;
  if (t === 'gold')                                        return 1.05;
  if (t === 'silver plus' || t === 'silver_plus')          return 1.02;
  return 1;
}

function bucketHours(miles: number | null): number {
  if (miles === null) return 8;
  if (miles < 40)     return 3;
  if (miles < 120)    return 5;
  if (miles < 300)    return 8;
  return 12;
}

/** Produces a single dispatch-style price preview for a provider
 *  card. Synchronous — caller resolves real OSRM distance upstream
 *  and feeds `miles`, then this fn applies tier + metro + timing. */
export function estimateRoutePrice(input: RoutePriceInput): RoutePriceResult {
  const baseline = COUNTRY_BASELINES[input.country];
  const hourly   = input.baseHourly ?? baseline.baseHourly;

  const miles = input.miles != null ? input.miles : distanceFromZips(input.fromZip, input.toZip);
  const hours = bucketHours(miles);

  const metroCode  = detectMetroFromZip(input.fromZip);
  const metroFactor = metroCode ? resolveDemandTiming(METRO_DEMAND[metroCode], input.now) : 1;

  const amount = Math.round(
    hourly *
    2 *                          /* 2-mover crew, matches spec defaults */
    hours *
    tierMultiplier(input.tier) *
    metroFactor,
  );

  return {
    amount,
    currency:     baseline.currency,
    symbol:       baseline.symbol,
    hours,
    miles,
    source:       miles === null ? 'baseline' : 'route',
    surgeApplied: metroFactor > 1.0001,
    metroCode,
  };
}

/** Format helper — "$642" / "642 €" / "4 800 kr" depending on the
 *  country's currency symbol. */
export function formatRoutePrice(r: RoutePriceResult): string {
  if (r.symbol.length > 1) return `${r.amount.toLocaleString('en-US')} ${r.symbol}`;
  return `${r.symbol}${r.amount.toLocaleString('en-US')}`;
}
