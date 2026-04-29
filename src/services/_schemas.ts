import { z } from 'zod';

/* ─────────────────────────────────────────────────────────────────
 * Shared Zod atoms reused across the service-layer schemas.
 *
 * Why centralise: every mutation boundary in services/* should be
 * validating its input. Sharing atoms keeps the rules consistent
 * (e.g. "money is positive, finite, in major units") and lets us
 * tighten them in one place when product rules change.
 *
 * Conventions:
 *   - Scalar atoms are exported as `Z<Name>`.
 *   - Compound shapes belong in the consumer service file.
 *   - Each atom carries a customer-readable error message so the
 *     thrown Error from safeParse → throw can be surfaced directly
 *     in the UI without further translation.
 * ───────────────────────────────────────────────────────────────── */

export const ZUuid             = z.string().uuid('Invalid id');
export const ZShortString      = (label = 'value', max = 200) =>
  z.string().trim().min(1, `${label} required`).max(max);
export const ZOptionalText     = (max = 2000) => z.string().trim().max(max);

/** Major-unit currency amount (e.g. USD dollars). Positive, finite. */
export const ZMoneyMajor       = z.number().positive('Must be positive').finite();
/** Minor-unit currency amount (e.g. USD cents). Non-negative integer. */
export const ZMoneyMinor       = z.number().int().nonnegative();
/** ISO 4217 three-letter currency code, uppercase. */
export const ZCurrencyCode     = z.string().regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO code');
/** Refund percentage (0–100, integer). */
export const ZRefundPercent    = z.number().int().min(0).max(100);

/* ── Domain enums ──────────────────────────────────────────────── */

export const ZDriverPlan = z.enum(['free', 'basic', 'pro_mini', 'pro', 'unlimited']);
export type DriverPlan   = z.infer<typeof ZDriverPlan>;

export const ZPayMethod  = z.enum(['card', 'apple_pay', 'google_pay', 'invoice']);
export type PayMethod    = z.infer<typeof ZPayMethod>;

export const ZDriverStatus = z.enum(['pending', 'approved', 'suspended', 'rejected']);

export const ZApplicationDecision = z.enum(['approved', 'rejected']);

export const ZDocumentVerification = z.enum(['approved', 'rejected']);

/** Helper: parse + throw with a path-prefixed message so the UI can
 *  display it directly. Mirrors the error shape we use in
 *  createBookingWithEscrow. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, raw: unknown): z.infer<T> {
  const r = schema.safeParse(raw);
  if (!r.success) {
    const first = r.error.issues[0];
    const path  = first.path.join('.');
    throw new Error(`${path ? `${path}: ` : ''}${first.message}`);
  }
  return r.data;
}
