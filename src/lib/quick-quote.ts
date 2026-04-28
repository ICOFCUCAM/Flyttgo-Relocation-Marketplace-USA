import type { BookingCountry } from './store';

/* ─────────────────────────────────────────────────────────────────
 * quick-quote — tiny event bus that opens the QuickQuoteDrawer from
 * any "Get a quote" CTA in the app, without prop-drilling state
 * through the layout. The drawer (mounted globally in AppLayout)
 * listens for `flyttgo:open-quick-quote` and pops open with the
 * supplied country (defaulting to the customer's last-booking
 * country, or 'us').
 *
 * Callers don't import the drawer component itself — they just call
 * openQuickQuote() — so the lazy bundle stays untouched until first
 * use.
 * ───────────────────────────────────────────────────────────────── */

export const QUICK_QUOTE_OPEN_EVENT  = 'flyttgo:open-quick-quote';
export const QUICK_QUOTE_CLOSE_EVENT = 'flyttgo:close-quick-quote';

export interface QuickQuoteOpenDetail {
  country?: BookingCountry;
  /** Free-form analytics label so we can see which surface fired. */
  source?:  string;
}

export function openQuickQuote(detail: QuickQuoteOpenDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<QuickQuoteOpenDetail>(QUICK_QUOTE_OPEN_EVENT, { detail }));
}

export function closeQuickQuote(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(QUICK_QUOTE_CLOSE_EVENT));
}
