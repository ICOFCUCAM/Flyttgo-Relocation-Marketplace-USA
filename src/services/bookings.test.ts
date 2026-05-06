import { describe, it, expect, vi } from 'vitest';

/* Stub Supabase before importing the module under test — the real
 * client reads env vars at import time and we don't want network
 * calls leaking into the unit suite. */
vi.mock('../lib/supabase', () => ({
  supabase:               { from: () => ({}) },
  supabaseFunctionUrl:    (n: string) => `https://stub/${n}`,
}));

import { CreateBookingInputSchema, type CreateBookingInput } from './bookings';

/* Smoke tests for the createBookingWithEscrow input schema. The
 * actual DB write is not exercised here — that needs an integration
 * test against a Supabase test project. We just guard the validation
 * boundary so a UI bug can't ship a nonsense booking. */

function valid(): CreateBookingInput {
  return {
    customer: {
      id:    '11111111-1111-1111-1111-111111111111',
      email: 'jane@example.com',
      name:  'Jane Doe',
      phone: '+1 555 555 0100',
    },
    pickup:  { address: '1 Main St', postcode: '10001', city: 'New York',     lat: 40.7128, lng: -74.0060 },
    dropoff: { address: '2 Elm St',  postcode: '90001', city: 'Los Angeles',  lat: 34.05,   lng: -118.24 },
    moveType:           'apartment',
    vanType:            'medium_van',
    helpers:            1,
    additionalServices: [],
    inventory:          { 'Sofa': 1 },
    moveDate:           '2026-05-01',
    moveTime:           '09:00',
    notes:              '',
    distanceKm:         4500,
    estimatedHours:     6,
    priceTotal:         3200,
  };
}

describe('CreateBookingInputSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(() => CreateBookingInputSchema.parse(valid())).not.toThrow();
  });

  /* Path-based assertion helper: the schema reports issues with a
   * `.path` array we can match on directly, instead of relying on
   * Zod's free-text message format. */
  function expectIssueOn(input: unknown, path: (string | number)[]) {
    const r = CreateBookingInputSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some(i => i.path.join('.') === path.join('.'))).toBe(true);
    }
  }

  it('rejects an invalid customer id', () => {
    expectIssueOn({ ...valid(), customer: { ...valid().customer, id: 'not-a-uuid' } }, ['customer', 'id']);
  });

  it('rejects an invalid email', () => {
    expectIssueOn({ ...valid(), customer: { ...valid().customer, email: 'definitely not email' } }, ['customer', 'email']);
  });

  it('rejects a non-positive total price', () => {
    expectIssueOn({ ...valid(), priceTotal: 0 }, ['priceTotal']);
  });

  it('rejects out-of-range coordinates', () => {
    expectIssueOn({ ...valid(), pickup: { ...valid().pickup, lat: 999 } }, ['pickup', 'lat']);
  });

  it('rejects a negative helpers count', () => {
    expectIssueOn({ ...valid(), helpers: -1 }, ['helpers']);
  });

  it('rejects an absurd estimatedHours', () => {
    expectIssueOn({ ...valid(), estimatedHours: 999 }, ['estimatedHours']);
  });

  it('allows null lat/lng for unresolved addresses', () => {
    const ok = { ...valid(), pickup: { ...valid().pickup, lat: null, lng: null } };
    expect(() => CreateBookingInputSchema.parse(ok)).not.toThrow();
  });
});
