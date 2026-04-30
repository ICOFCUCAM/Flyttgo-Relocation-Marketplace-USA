import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase:            { from: () => ({}), rpc: () => ({}) },
  supabaseFunctionUrl: (n: string) => `https://stub/${n}`,
}));

import { CheckoutSessionInputSchema, BookingCheckoutInputSchema } from './payments';
import {
  UpdateDriverStatusSchema, AssignDriverPlanSchema, ApplyManualRefundSchema,
  ManualDispatchSchema, ReviewApplicationInputSchema, SetDocumentVerificationSchema,
} from './admin';
import {
  ChangeDriverSubscriptionSchema, LogSubscriptionCreditSchema,
  RequestPayoutSchema, SubscriptionCheckoutPayloadSchema,
} from './driver';
import { CreateQuoteRequestSchema } from './quotes';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('mutation-boundary schemas', () => {
  describe('payments', () => {
    it('CheckoutSessionInput: accepts a valid payload', () => {
      expect(() => CheckoutSessionInputSchema.parse({
        bookingId: UUID, amountCents: 12500, currency: 'USD',
      })).not.toThrow();
    });
    it('CheckoutSessionInput: rejects a non-uppercase currency', () => {
      expect(() => CheckoutSessionInputSchema.parse({
        bookingId: UUID, amountCents: 100, currency: 'usd',
      })).toThrow(/currency/i);
    });
    it('BookingCheckoutInput: rejects an unknown payment method', () => {
      expect(() => BookingCheckoutInputSchema.parse({
        bookingId: UUID, amount: 100, method: 'crypto',
      })).toThrow();
    });
    it('BookingCheckoutInput: rejects a non-positive amount', () => {
      expect(() => BookingCheckoutInputSchema.parse({
        bookingId: UUID, amount: 0, method: 'card',
      })).toThrow();
    });
  });

  describe('admin', () => {
    it('UpdateDriverStatus: rejects an unknown status', () => {
      expect(() => UpdateDriverStatusSchema.parse({ id: UUID, status: 'banished' })).toThrow();
    });
    it('AssignDriverPlan: rejects an unknown plan', () => {
      expect(() => AssignDriverPlanSchema.parse({ driverId: UUID, plan: 'platinum' })).toThrow();
    });
    it('ApplyManualRefund: rejects > 100', () => {
      expect(() => ApplyManualRefundSchema.parse({ bookingId: UUID, percent: 250 })).toThrow();
    });
    it('ApplyManualRefund: rejects negative', () => {
      expect(() => ApplyManualRefundSchema.parse({ bookingId: UUID, percent: -10 })).toThrow();
    });
    it('ManualDispatch: rejects a bad uuid', () => {
      expect(() => ManualDispatchSchema.parse({ bookingId: 'nope', driverId: UUID })).toThrow();
    });
    it('ReviewApplication: requires rejection reason when rejecting', () => {
      expect(() => ReviewApplicationInputSchema.parse({
        applicationId: UUID, action: 'rejected', reviewerUserId: UUID,
      })).toThrow(/rejectionReason/);
    });
    it('ReviewApplication: accepts approval without a rejection reason', () => {
      expect(() => ReviewApplicationInputSchema.parse({
        applicationId: UUID, action: 'approved', reviewerUserId: UUID,
      })).not.toThrow();
    });
    it('SetDocumentVerification: rejects an unknown status', () => {
      expect(() => SetDocumentVerificationSchema.parse({ documentId: UUID, status: 'maybe' })).toThrow();
    });
  });

  describe('driver', () => {
    it('ChangeDriverSubscription: rejects an unknown plan', () => {
      expect(() => ChangeDriverSubscriptionSchema.parse({ userId: UUID, planId: 'enterprise' })).toThrow();
    });
    it('LogSubscriptionCredit: rejects empty description', () => {
      expect(() => LogSubscriptionCreditSchema.parse({ driverId: UUID, amount: 10, description: '' })).toThrow();
    });
    it('RequestPayout: rejects a non-positive amount', () => {
      expect(() => RequestPayoutSchema.parse({ driverId: UUID, amount: 0 })).toThrow();
    });
    it('SubscriptionCheckoutPayload: rejects a non-subscription type literal', () => {
      expect(() => SubscriptionCheckoutPayloadSchema.parse({
        type: 'donation', planId: 'pro', planLabel: 'Pro', driverId: UUID, userId: UUID,
        amount: 150, amountExVat: 150, vatAmount: 0, billing: '/month', prorationNote: '',
        proration: null, description: 'desc',
      })).toThrow();
    });
  });

  describe('quotes', () => {
    it('CreateQuoteRequest: requires a country', () => {
      expect(() => CreateQuoteRequestSchema.parse({})).toThrow(/country/);
    });
    it('CreateQuoteRequest: tolerates extra columns', () => {
      expect(() => CreateQuoteRequestSchema.parse({
        country: 'us', extra_col: 'whatever',
      })).not.toThrow();
    });
  });
});
