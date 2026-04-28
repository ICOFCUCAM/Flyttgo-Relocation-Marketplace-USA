import type { BookingCountry } from './store';

/* ─────────────────────────────────────────────────────────────────
 * Curated promo-code catalogue.
 *
 * In production these are validated by the calculate-price edge
 * function against the `promo_codes` Supabase table — we mirror a
 * subset locally so the booking widget can give instant feedback
 * (apply / reject) without a network round-trip. The edge function
 * is the source of truth at booking-creation time, so a code that
 * passes here may still be rejected if it expired between widget
 * apply and submit.
 *
 * Discounts:
 *   - `pct`  (0–1): fractional discount applied to the pre-discount
 *                   indicative total
 *
 * Country-scoping:
 *   - `countries` undefined → applies in all six markets
 *   - `countries` array     → only applies in the listed markets
 *
 * Expiry:
 *   - `expiresAt` undefined → no expiry
 *   - else ISO timestamp; we reject codes whose date is in the past
 * ───────────────────────────────────────────────────────────────── */

export interface PromoCode {
  code:       string;          // uppercase canonical
  pct:        number;          // 0–1
  label:      string;          // marketing description
  countries?: BookingCountry[];
  expiresAt?: string;          // ISO
  /** Min indicative total (in country currency) to qualify. */
  minTotal?:  number;
}

export const PROMO_CODES: PromoCode[] = [
  {
    code:  'WELCOME10',
    pct:   0.10,
    label: '10% off your first move',
  },
  {
    code:  'MOVE15',
    pct:   0.15,
    label: '15% off — limited-time launch',
    expiresAt: '2026-12-31T23:59:00Z',
  },
  {
    code:  'REFER25',
    pct:   0.25,
    label: '25% off via referral · max once per customer',
  },
  {
    code:  'STUDENT20',
    pct:   0.20,
    label: '20% off student moves',
    countries: ['us', 'gb', 'de', 'fr'],
  },
  {
    code:  'EU2026',
    pct:   0.12,
    label: '12% off EU moves · 2026 calendar',
    countries: ['de', 'fr', 'no'],
  },
];

export type PromoApplyResult =
  | { ok: true;  code: PromoCode }
  | { ok: false; reason: 'unknown' | 'expired' | 'wrong_country' | 'min_total' };

/**
 * Validate + look up a promo code for the given booking context.
 * Returns a discriminated union so the caller can render a precise
 * error message instead of a generic "invalid".
 */
export function applyPromo(
  raw:        string,
  country:    BookingCountry,
  totalNow:   number | null,
): PromoApplyResult {
  const code = (raw ?? '').trim().toUpperCase();
  if (!code) return { ok: false, reason: 'unknown' };

  const match = PROMO_CODES.find(p => p.code === code);
  if (!match) return { ok: false, reason: 'unknown' };

  if (match.expiresAt && Date.parse(match.expiresAt) < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  if (match.countries && !match.countries.includes(country)) {
    return { ok: false, reason: 'wrong_country' };
  }
  if (match.minTotal != null && (totalNow ?? 0) < match.minTotal) {
    return { ok: false, reason: 'min_total' };
  }

  return { ok: true, code: match };
}
