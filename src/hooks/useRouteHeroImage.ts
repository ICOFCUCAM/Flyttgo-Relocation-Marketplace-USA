/**
 * Route-aware hero image resolver.
 *
 * Reads the current Page from the AppLayout routing store
 * (src/lib/store.tsx) and returns the correct hero photo for that
 * route — drawing from CITY_HERO_IMAGES (city skylines) and
 * PAGE_HERO_IMAGES (booking / pricing / fallback).
 *
 * Routing rules:
 *   /market-<cc>      → capital skyline (looks up the country's capital
 *                        slug in CITY_HERO_IMAGES)
 *   /moving-<slug>    → city skyline (reads the slug from
 *                        window.location.pathname)
 *   /book             → BOOKING_HERO_IMAGE (logistics imagery)
 *   /payment          → BOOKING_HERO_IMAGE (logistics imagery)
 *   /pricing          → PRICING_HERO_IMAGE (route/map imagery)
 *   anything else     → DEFAULT_HERO_IMAGE
 *
 * This hook is the canonical entry point — page templates that want
 * a hero should call it instead of hard-coding photo URLs.
 */

import { useEffect, useState } from 'react';
import { useApp, type Page } from '../lib/store';
import { CITY_HERO_IMAGES } from '../config/cityHeroImages';
import {
  BOOKING_HERO_IMAGE, PRICING_HERO_IMAGE, DEFAULT_HERO_IMAGE,
  type PageHeroImage,
} from '../config/pageHeroImages';
import type { ExpansionCountryCode } from '../lib/expansion-cities';

/** Each expansion country's capital city slug. Country shopfronts
 *  reuse the city registry by looking up their capital here. */
const COUNTRY_CAPITAL_SLUG: Record<ExpansionCountryCode, string> = {
  nl: 'amsterdam',
  se: 'stockholm',
  es: 'madrid',
  it: 'milan',
  pl: 'warsaw',
  dk: 'copenhagen',
  be: 'brussels',
  at: 'vienna',
  ch: 'zurich',
  cz: 'prague',
};

const EXPANSION_PAGE_TO_CODE: Partial<Record<Page, ExpansionCountryCode>> = {
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
};

/** Read the city slug from a /moving-<slug> URL. Returns '' when the
 *  current path is not a /moving- URL. */
function readMovingCitySlug(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.pathname.match(/^\/moving-([a-z0-9-]+)\/?$/i);
  return m ? m[1].toLowerCase() : '';
}

/** Build the hero image for a slug — falls through to DEFAULT_HERO
 *  when the slug isn't registered. */
function heroForCitySlug(slug: string, displayName?: string): PageHeroImage {
  const url = CITY_HERO_IMAGES[slug];
  if (!url) {
    return DEFAULT_HERO_IMAGE;
  }
  return {
    url,
    alt:   displayName ? `${displayName} skyline` : `${slug} skyline`,
    query: `${displayName ?? slug} skyline`,
  };
}

/**
 * Returns the hero image for the current route.
 *
 * For /moving-<slug> pages, the hook subscribes to popstate so
 * back / forward navigation re-resolves the slug — important because
 * a single MovingCityPage instance handles every /moving-<slug> URL.
 */
export function useRouteHeroImage(displayName?: string): PageHeroImage {
  const { currentPage } = useApp();

  /* Track the path slug for /moving-<slug> routes. We can't read it
   * from currentPage alone — currentPage is just 'moving-city'. */
  const [movingSlug, setMovingSlug] = useState<string>(() => readMovingCitySlug());
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => setMovingSlug(readMovingCitySlug());
    window.addEventListener('popstate', onPop);
    /* Re-read on currentPage change too — setPage pushes history but
     * doesn't fire popstate. */
    setMovingSlug(readMovingCitySlug());
    return () => window.removeEventListener('popstate', onPop);
  }, [currentPage]);

  /* Country shopfronts → capital skyline. */
  const expansionCode = EXPANSION_PAGE_TO_CODE[currentPage];
  if (expansionCode) {
    return heroForCitySlug(COUNTRY_CAPITAL_SLUG[expansionCode]);
  }

  /* City landings → city skyline. */
  if (currentPage === 'moving-city' && movingSlug) {
    return heroForCitySlug(movingSlug, displayName);
  }

  /* Booking + payment → logistics imagery. */
  if (currentPage === 'booking' || currentPage === 'payment') {
    return BOOKING_HERO_IMAGE;
  }

  /* Pricing → route/map imagery. */
  if (currentPage === 'pricing') {
    return PRICING_HERO_IMAGE;
  }

  return DEFAULT_HERO_IMAGE;
}
