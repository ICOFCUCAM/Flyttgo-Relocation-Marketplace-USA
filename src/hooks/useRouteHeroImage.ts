/**
 * Route-aware hero image hook.
 *
 * Thin reactive wrapper around `resolveHeroImage()` (the pure
 * resolver in src/config/visualResolver.ts):
 *
 *   - Reads `currentPage` from the AppLayout routing store
 *   - Subscribes to popstate so /moving-<slug> back / forward updates
 *   - Re-resolves whenever currentPage changes
 *   - Falls through to DEFAULT_HERO_IMAGE only when the resolver
 *     declines to override AND the caller still wants a hero
 *
 * When the resolver returns `null` (legacy market, dashboard, home,
 * etc.) callers asking for `useRouteHeroImage()` get the default
 * image. Callers who want to detect "no override" themselves should
 * use `resolveHeroImage()` directly — see ExpansionCountryPage and
 * MovingCityPage for the canonical wiring.
 */

import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import {
  resolveHeroImage, isLegacyMarketPage,
} from '../config/visualResolver';
import {
  DEFAULT_HERO_IMAGE, type PageHeroImage,
} from '../config/pageHeroImages';

function readMovingCitySlug(): string {
  if (typeof window === 'undefined') return '';
  const m = window.location.pathname.match(/^\/moving-([a-z0-9-]+)\/?$/i);
  return m ? m[1].toLowerCase() : '';
}

/**
 * Returns the resolved hero image for the current route, or
 * `DEFAULT_HERO_IMAGE` when the resolver declines.
 *
 * Pass `displayName` to populate the alt text on /moving-<slug>
 * pages with the city's accented native form (e.g. "Göteborg").
 */
export function useRouteHeroImage(displayName?: string): PageHeroImage {
  const { currentPage } = useApp();

  /* Track the URL slug for /moving-<slug> — currentPage alone is
   * just 'moving-city' so we need the path segment too. */
  const [movingSlug, setMovingSlug] = useState<string>(() => readMovingCitySlug());
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => setMovingSlug(readMovingCitySlug());
    window.addEventListener('popstate', onPop);
    /* setPage updates history without firing popstate, so re-read on
     * currentPage change. */
    setMovingSlug(readMovingCitySlug());
    return () => window.removeEventListener('popstate', onPop);
  }, [currentPage]);

  const resolved = resolveHeroImage(currentPage, { movingSlug, displayName });
  return resolved ?? DEFAULT_HERO_IMAGE;
}

/** Companion hook — exposes the legacy-bypass signal directly so
 *  components can render their own hero without forcing a default.
 *  Returns `null` when the resolver declines (legacy or no opinion). */
export function useResolvedHeroImage(displayName?: string): PageHeroImage | null {
  const { currentPage } = useApp();
  const [movingSlug, setMovingSlug] = useState<string>(() => readMovingCitySlug());
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => setMovingSlug(readMovingCitySlug());
    window.addEventListener('popstate', onPop);
    setMovingSlug(readMovingCitySlug());
    return () => window.removeEventListener('popstate', onPop);
  }, [currentPage]);
  return resolveHeroImage(currentPage, { movingSlug, displayName });
}

export { isLegacyMarketPage };
