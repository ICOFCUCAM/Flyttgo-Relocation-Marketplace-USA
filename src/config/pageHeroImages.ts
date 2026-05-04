/**
 * Page-type hero image registry — non-city surfaces.
 *
 * Used by `useRouteHeroImage()` (src/hooks/useRouteHeroImage.ts) to
 * resolve the correct hero photo per route.
 *
 * Image policy (platform-wide):
 *   country page  → capital skyline   (CITY_HERO_IMAGES)
 *   city page     → city skyline      (CITY_HERO_IMAGES)
 *   booking page  → logistics imagery (this file)
 *   pricing page  → route/map imagery (this file)
 *   otherwise     → DEFAULT_HERO_IMAGE
 *
 * Each entry carries the search phrase used to source the photo so
 * mismatches can be swapped against Unsplash without spec-hunting.
 */

export interface PageHeroImage {
  url:   string;
  alt:   string;
  query: string;
}

export const BOOKING_HERO_IMAGE: PageHeroImage = {
  url:   'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2400',
  alt:   'Moving truck being loaded with boxes',
  query: 'moving truck loading boxes logistics',
};

export const PRICING_HERO_IMAGE: PageHeroImage = {
  url:   'https://images.unsplash.com/photo-1494412519320-aa613dfb7738?q=80&w=2400',
  alt:   'Aerial highway intersection — relocation route map',
  query: 'highway aerial intersection route map',
};

/** Generic European skyline — used when a route is unmapped. */
export const DEFAULT_HERO_IMAGE: PageHeroImage = {
  url:   'https://images.unsplash.com/photo-1560969184-10fe8719e047?q=80&w=2400',
  alt:   'European city skyline',
  query: 'European city skyline',
};
