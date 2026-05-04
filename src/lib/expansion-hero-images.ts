/* ─────────────────────────────────────────────────────────────────
 * Expansion-country + anchor-city hero image lookups
 *
 * Image policy (platform-wide):
 *   - Country page  → capital skyline
 *   - City page     → city skyline
 *   - Booking widget → logistics imagery (handled in BookingShortcut)
 *   - Pricing page  → route/map imagery (handled in PricingPage)
 *
 * URLs are sourced from the canonical registry in
 *   src/config/cityHeroImages.ts
 * which is keyed by city slug. Country shopfronts look up the slug
 * of their capital and reuse the same registry — one source of truth.
 * ───────────────────────────────────────────────────────────────── */

import type { ExpansionCountryCode } from './expansion-cities';
import { CITY_HERO_IMAGES } from '../config/cityHeroImages';

/** Each expansion country's capital city slug — used to map a
 *  country shopfront to the correct skyline in the city registry. */
const COUNTRY_CAPITAL_SLUG: Record<ExpansionCountryCode, string> = {
  nl: 'amsterdam',
  se: 'stockholm',
  es: 'madrid',
  it: 'milan',     // commercial capital; matches the deployment plan
  pl: 'warsaw',
  dk: 'copenhagen',
  be: 'brussels',
  at: 'vienna',
  ch: 'zurich',    // commercial capital; matches the deployment plan
  cz: 'prague',
};

/** Generic European skyline fallback — used when a slug isn't
 *  registered in CITY_HERO_IMAGES. Berlin twilight from Unsplash. */
const FALLBACK_SKYLINE =
  'https://images.unsplash.com/photo-1560969184-10fe8719e047?q=80&w=2400';

export interface HeroImage {
  /** Stable Unsplash CDN URL with render params. */
  url: string;
  /** Alt text — set on the <img> in each page template. */
  alt: string;
}

/** Lookup helper — falls through to the generic European fallback if
 *  the slug isn't registered (e.g. a brand-new anchor city added to
 *  ANCHOR_CITIES before the registry catches up). */
export function heroForCity(slug: string, displayName?: string): HeroImage {
  const url = CITY_HERO_IMAGES[slug];
  if (!url) {
    return {
      url: FALLBACK_SKYLINE,
      alt: displayName ? `${displayName} skyline` : 'European city skyline',
    };
  }
  return {
    url,
    alt: displayName ? `${displayName} skyline` : `${slug} skyline`,
  };
}

/** Lookup helper — returns the country shopfront hero (capital skyline). */
export function heroForExpansionCountry(code: ExpansionCountryCode): HeroImage {
  const capital = COUNTRY_CAPITAL_SLUG[code];
  return heroForCity(capital);
}
