import type { CountryCode } from '../../components/NorwayAddressAutocomplete';

/* ─────────────────────────────────────────────────────────────────
 * getCountryFromRoute
 *
 * Inspects the current URL pathname and resolves it to one of the
 * six supported country codes. Used by the booking flow as the
 * first fallback when bookingData.country isn't set — so a
 * customer who lands directly on /book from a country storefront
 * URL gets the right address autocomplete + currency without
 * having to click through.
 *
 * Recognised paths (case-insensitive):
 *
 *   /us, /usa, /market-us, /book/us            → us
 *   /ca, /canada, /market-canada, /book/ca     → ca
 *   /uk, /gb, /market-uk, /book/uk             → gb
 *   /fr, /france, /market-france, /book/fr     → fr
 *   /de, /germany, /market-germany, /book/de   → de
 *   /no, /norway, /market-norway, /book/no     → no
 *
 * Returns null when the path doesn't carry a clear country signal —
 * caller is expected to chain into the browser-locale fallback.
 * ───────────────────────────────────────────────────────────────── */

const PATH_SEGMENT_TO_COUNTRY: Record<string, CountryCode> = {
  /* Direct ISO segments */
  us:      'us',
  usa:     'us',
  ca:      'ca',
  canada:  'ca',
  uk:      'gb',
  gb:      'gb',
  fr:      'fr',
  france:  'fr',
  de:      'de',
  germany: 'de',
  no:      'no',
  norway:  'no',
  /* In-app market-* page paths */
  'market-us':      'us',
  'market-canada':  'ca',
  'market-uk':      'gb',
  'market-france':  'fr',
  'market-germany': 'de',
  'market-norway':  'no',
};

export function getCountryFromRoute(pathname?: string): CountryCode | null {
  /* Resolve from the live URL when no explicit pathname is passed. */
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (!path) return null;

  /* Inspect path segments left-to-right. The first segment that
   * matches a known country wins — this handles both `/us` and
   * `/book/us` correctly without separate logic, and never matches
   * a substring inside a longer slug. */
  const segments = path.toLowerCase().split('/').filter(Boolean);
  for (const seg of segments) {
    const hit = PATH_SEGMENT_TO_COUNTRY[seg];
    if (hit) return hit;
  }
  return null;
}
