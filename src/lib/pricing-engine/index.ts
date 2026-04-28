/**
 * FlyttGo pricing engine — public API.
 *
 *   import { calculateQuote, type QuoteInput } from '@/lib/pricing-engine';
 *
 * See ./types.ts for the full input/output shape, ./data.ts for the
 * curated baseline tables, and ./calculate.ts for the composer. The
 * Supabase migration that backs this engine in production lives in
 * ./schema.sql.
 */

export { calculateQuote }      from './calculate';
export {
  COUNTRY_BASELINES, CITY_MULTIPLIERS, CREW_MULTIPLIERS,
  SERVICE_ADJUSTMENTS, COMPLEXITY_FACTORS, TIMING_FACTORS,
  INSURANCE_OPTIONS, COMMISSION_DEFAULT, COMMISSION_BAND,
  HOURS_MIN,
}                              from './data';
export type {
  QuoteInput, QuoteBreakdown, QuoteStep,
  ServiceType, InsuranceTier, Currency, PricingCountry,
  ComplexityInput, TimingInput,
} from './types';
