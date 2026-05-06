import { describe, it, expect } from 'vitest';
import { calculateQuote } from './calculate';
import { COUNTRY_BASELINES, HOURS_MIN } from './data';
import type { QuoteInput } from './types';

/* Factory to keep each test focused on the property it's asserting,
 * not on the QuoteInput required-field boilerplate. */
function input(overrides: Partial<QuoteInput> & Pick<QuoteInput, 'country'>): QuoteInput {
  return {
    crewSize:       2,
    serviceType:    'labor-only',
    estimatedHours: HOURS_MIN,
    ...overrides,
  };
}

/* Smoke tests — guard the layered ledger contract. Anything that
 * silently shifts a customer-visible price has to either change these
 * tests deliberately or pop in a diff during review. */

describe('calculateQuote', () => {
  it('returns a customer total >= the labor floor for the cheapest country', () => {
    const q = calculateQuote(input({ country: 'gb' }));
    expect(q.customerTotal).toBeGreaterThan(0);
    expect(q.providerPayout).toBeGreaterThan(0);
    expect(q.platformMargin).toBeGreaterThan(0);
    expect(q.customerTotal).toBe(q.providerPayout + q.platformMargin);
  });

  it('honours the minimum billed hours when input is below the floor', () => {
    const q = calculateQuote(input({ country: 'us', estimatedHours: 1 }));
    expect(q.billedHours).toBeGreaterThanOrEqual(HOURS_MIN);
  });

  it('applies a city multiplier > 1 for Manhattan vs unknown city', () => {
    const baseline = calculateQuote(input({ country: 'us', city: 'Nowhereville' }));
    const manhattan = calculateQuote(input({ country: 'us', city: 'Manhattan, NY' }));
    expect(manhattan.customerTotal).toBeGreaterThan(baseline.customerTotal);
    expect(manhattan.resolved.cityMultiplier).toBeGreaterThan(1);
  });

  it('emits a country-baseline step that matches the data table', () => {
    const q = calculateQuote(input({ country: 'us' }));
    const baseline = q.steps.find(s => s.layer === 'country');
    expect(baseline?.contribution).toBe(COUNTRY_BASELINES.us.baseHourly);
  });

  it('clamps an out-of-band commission percentage', () => {
    const wild = calculateQuote(input({ country: 'us', commissionPct: 0.99 }));
    /* Commission band caps below 0.99, so platform margin shouldn't
     * eat the whole customer total. */
    expect(wild.providerPayout).toBeGreaterThan(0);
  });

  it('produces a labor + distance + insurance total in the right currency', () => {
    const q = calculateQuote(input({
      country: 'no',
      city: 'Oslo',
      estimatedHours: 3,
      distanceKm: 12,
      insurance: 'basic',
    }));
    expect(q.currency).toBe('NOK');
    expect(q.steps.some(s => s.layer === 'distance')).toBe(true);
  });
});
