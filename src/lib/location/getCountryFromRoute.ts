import type { CountryCode } from '../../components/NorwayAddressAutocomplete';
import { findCityBySlug } from '../expansion-cities';

/* ─────────────────────────────────────────────────────────────────
 * getCountryFromRoute
 *
 * Inspects the current URL pathname and resolves it to one of the
 * 16 supported country codes. Used by the booking flow as the
 * first fallback when bookingData.country isn't set — so a
 * customer who lands directly on /book from a country storefront
 * URL gets the right address autocomplete + currency without
 * having to click through.
 *
 * Recognised paths (case-insensitive):
 *
 *   Legacy:    /us, /usa, /market-us, /book/us              → us
 *              /ca, /canada, /market-canada, /book/ca       → ca
 *              /uk, /gb, /market-uk, /book/uk               → gb
 *              /fr, /france, /market-france, /book/fr       → fr
 *              /de, /germany, /market-germany, /book/de     → de
 *              /no, /norway, /market-norway, /book/no       → no
 *
 *   Expansion: /market-nl … /market-cz, /nl … /cz, country
 *              names (netherlands, sweden, spain, italy,
 *              poland, denmark, belgium, austria, switzerland,
 *              czechia)
 *
 * Returns null when the path doesn't carry a clear country signal —
 * caller is expected to chain into the browser-locale fallback.
 * ───────────────────────────────────────────────────────────────── */

const PATH_SEGMENT_TO_COUNTRY: Record<string, CountryCode> = {
  /* Direct ISO segments — legacy */
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
  /* Direct ISO segments — expansion (first + second wave) */
  nl:           'nl', netherlands:  'nl',
  se:           'se', sweden:       'se',
  es:           'es', spain:        'es',
  it:           'it', italy:        'it',
  pl:           'pl', poland:       'pl',
  dk:           'dk', denmark:      'dk',
  be:           'be', belgium:      'be',
  at:           'at', austria:      'at',
  ch:           'ch', switzerland:  'ch',
  cz:           'cz', czechia:      'cz',
  /* In-app market-* page paths — legacy */
  'market-us':      'us',
  'market-canada':  'ca',
  'market-uk':      'gb',
  'market-france':  'fr',
  'market-germany': 'de',
  'market-norway':  'no',
  /* In-app market-* page paths — expansion */
  'market-nl': 'nl',
  'market-se': 'se',
  'market-es': 'es',
  'market-it': 'it',
  'market-pl': 'pl',
  'market-dk': 'dk',
  'market-be': 'be',
  'market-at': 'at',
  'market-ch': 'ch',
  'market-cz': 'cz',
  /* /moving-<slug> pages — slug isn't a country code, but if the
   * user landed via a moving-city URL we want the booking flow to
   * pick up the city's country. The mapping happens via
   * findCityBySlug, not here, so leave moving-* unmapped. */
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

  /* /moving-<slug> — recover the city's country from the anchor-city
   * registry. The registry maps each city slug to one of the 10
   * expansion ISOs, all of which are valid CountryCode values. */
  const movingMatch = path.toLowerCase().match(/\/moving-([a-z0-9-]+)/);
  if (movingMatch) {
    const city = findCityBySlug(movingMatch[1]);
    if (city) return city.country as CountryCode;
  }

  return null;
}
