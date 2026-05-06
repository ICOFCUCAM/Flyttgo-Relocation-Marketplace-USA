/**
 * Visual resolver — extension-only hero image system.
 *
 * Hard rule: legacy markets (US · CA · DE · FR · UK · NO) and any
 * page that already manages its own hero image MUST NOT be overridden
 * by this resolver. The resolver returns `null` in that case so
 * callers know to leave the existing hero alone.
 *
 * Priority order (matches the spec):
 *   1. Legacy market page              → null  (bypass — keep existing hero)
 *   2. New expansion country market    → capital skyline
 *   3. New /moving-<city> landing page → city skyline
 *   4. /book or /payment               → logistics imagery
 *   5. /pricing                        → route/map imagery
 *   6. Anything else                   → null  (no opinion — keep existing hero)
 *
 * Where the spec calls for a "default fallback," that lives in
 * src/hooks/useRouteHeroImage which interprets a `null` return as
 * "no override; render the page's own hero or the default."
 *
 * The resolver is pure — pass in the current page id (and optional
 * slug from /moving-<slug>) and it returns the resolved image
 * descriptor. SSR-safe; doesn't touch window.
 */

import type { Page } from '../lib/store';
import { CITY_HERO_IMAGES } from './cityHeroImages';
import {
  BOOKING_HERO_IMAGE, PRICING_HERO_IMAGE, type PageHeroImage,
} from './pageHeroImages';

/* ── Legacy bypass ────────────────────────────────────────── */

/** Country codes whose marketplace surfaces predate the expansion
 *  visual system and manage their own hero photos via
 *  src/components/global/CountryPage.tsx → HERO_PHOTOS. */
export const LEGACY_COUNTRIES = ['us', 'ca', 'de', 'fr', 'gb', 'no'] as const;
export type LegacyCountryCode = typeof LEGACY_COUNTRIES[number];

/** Page ids for the legacy country shopfronts. resolveHeroImage()
 *  returns `null` for any of these so the existing hero stays in
 *  place. */
const LEGACY_MARKET_PAGES: ReadonlySet<Page> = new Set<Page>([
  'market-us', 'market-canada', 'market-germany',
  'market-france', 'market-uk', 'market-norway',
]);

export function isLegacyMarketPage(page: Page): boolean {
  return LEGACY_MARKET_PAGES.has(page);
}

/** True when the country code refers to a legacy market. Useful for
 *  call sites that have a country code but not a Page id. */
export function isLegacyCountry(code: string): code is LegacyCountryCode {
  return (LEGACY_COUNTRIES as readonly string[]).includes(code);
}

/* ── New expansion country → capital skyline lookup ──────── */

/** Each expansion-country shopfront maps to its capital city slug.
 *  The country shopfront reuses the CITY_HERO_IMAGES registry so
 *  there is exactly one source of truth for skyline URLs. */
const EXPANSION_PAGE_TO_CAPITAL_SLUG: Partial<Record<Page, string>> = {
  'market-nl': 'amsterdam',
  'market-se': 'stockholm',
  'market-es': 'madrid',
  'market-it': 'milan',
  'market-pl': 'warsaw',
  'market-dk': 'copenhagen',
  'market-be': 'brussels',
  'market-at': 'vienna',
  'market-ch': 'zurich',
  'market-cz': 'prague',
  'market-cy': 'nicosia',
};

/* ── Resolver ────────────────────────────────────────────── */

export interface ResolveHeroOptions {
  /** Slug parsed from /moving-<slug>. Caller reads it from
   *  window.location.pathname (not safe to do here — keeps the
   *  resolver pure + SSR-safe). */
  movingSlug?: string;
  /** Optional display name (e.g. "Stockholm") used in the alt text. */
  displayName?: string;
}

function cityHeroOrNull(slug: string, displayName?: string): PageHeroImage | null {
  const url = CITY_HERO_IMAGES[slug];
  if (!url) return null;
  const label = displayName ?? slug;
  return {
    url,
    alt:   `${label} skyline`,
    query: `${label} skyline`,
  };
}

/**
 * Resolve the hero image for a route.
 *
 * Returns `null` to signal "do not override" — either because the
 * page is a legacy market with its own hero, or because the page
 * type isn't one we have an opinion about (home, dashboards, etc.).
 *
 * Callers wanting a guaranteed image should fall through to a
 * default themselves — see src/hooks/useRouteHeroImage.ts for the
 * canonical pattern.
 */
export function resolveHeroImage(
  page: Page,
  opts: ResolveHeroOptions = {},
): PageHeroImage | null {
  /* 1. Legacy bypass — keep existing hero. */
  if (isLegacyMarketPage(page)) return null;

  /* 2. New expansion country market → capital skyline. */
  const capitalSlug = EXPANSION_PAGE_TO_CAPITAL_SLUG[page];
  if (capitalSlug) {
    return cityHeroOrNull(capitalSlug);
  }

  /* 3. New /moving-<slug> city landing → city skyline. */
  if (page === 'moving-city') {
    if (!opts.movingSlug) return null;
    return cityHeroOrNull(opts.movingSlug, opts.displayName);
  }

  /* 4. Booking / payment → logistics imagery. */
  if (page === 'booking' || page === 'payment') {
    return BOOKING_HERO_IMAGE;
  }

  /* 5. Pricing → route/map imagery. */
  if (page === 'pricing') {
    return PRICING_HERO_IMAGE;
  }

  /* 6. Anything else — no opinion, callers keep their existing hero. */
  return null;
}
