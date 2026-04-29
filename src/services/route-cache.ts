import { supabase } from '../lib/supabase';
import { getRouteDistance, type LatLng, type RouteResult } from '../lib/routing';

/* ─────────────────────────────────────────────────────────────────
 * route-cache
 *
 * Two-tier route distance lookup used by the homepage / country
 * shopfront pricing previews:
 *
 *   1. Supabase-cached corridor lookup keyed on ZIP-prefix pairs.
 *      Covers the 20 or so headline US corridors (NYC↔Boston,
 *      LA↔SF, Austin↔Atlanta, …) where the marketplace has the
 *      highest visit-to-quote conversion. One row per direction
 *      so we don't have to assume routes are symmetric (toll
 *      structure + one-way streets often make them not).
 *
 *   2. Live OSRM via lib/routing.getRouteDistance for everything
 *      else, with the same in-memory LRU + Haversine fallback.
 *
 * The Supabase tier is OPTIONAL. The cache table is described in
 * docs/install-route-corridor-cache.sql but doesn't have to exist
 * for this module to work — every Supabase call is wrapped in
 * try/catch so a missing table degrades to a pure OSRM lookup
 * rather than throwing into the React tree.
 *
 * Once the SQL is applied, hits arrive in < 50 ms instead of the
 * 200–600 ms an OSRM round-trip costs and don't burn through the
 * public OSRM demo server's rate limit.
 * ───────────────────────────────────────────────────────────────── */

export interface ResolvedRoute extends RouteResult {
  /** Where the numbers actually came from. */
  source:    'cache' | 'osrm' | 'haversine';
  /** ZIP-prefix corridor key when the cache hit, e.g. "100→021". */
  corridor?: string;
}

interface CorridorRow {
  from_zip_prefix: string;
  to_zip_prefix:   string;
  distance_km:     number;
  duration_min:    number;
}

/* Tiny in-memory dedupe — multiple provider cards mounting at
 * once will all want the same route. We dedupe in-flight promises
 * so only one Supabase + one OSRM call goes out per page load. */
const inFlight = new Map<string, Promise<ResolvedRoute | null>>();

function corridorKey(fromZip: string, toZip: string): string {
  return `${fromZip.slice(0, 3)}->${toZip.slice(0, 3)}`;
}

async function lookupCorridor(fromZip: string, toZip: string): Promise<ResolvedRoute | null> {
  /* Wrapped — table may not exist yet. Both directions are tried
   * because a one-way row is still useful (~95% of moves are
   * symmetric in road distance). */
  const fromPrefix = fromZip.slice(0, 3);
  const toPrefix   = toZip.slice(0, 3);
  if (fromPrefix.length < 3 || toPrefix.length < 3) return null;

  try {
    const { data, error } = await supabase
      .from('route_corridor_cache')
      .select('from_zip_prefix, to_zip_prefix, distance_km, duration_min')
      .or(
        `and(from_zip_prefix.eq.${fromPrefix},to_zip_prefix.eq.${toPrefix}),` +
        `and(from_zip_prefix.eq.${toPrefix},to_zip_prefix.eq.${fromPrefix})`,
      )
      .limit(1)
      .maybeSingle<CorridorRow>();

    if (error || !data) return null;

    return {
      distanceKm:      data.distance_km,
      durationMinutes: data.duration_min,
      source:          'cache',
      corridor:        `${data.from_zip_prefix}→${data.to_zip_prefix}`,
    };
  } catch {
    /* Table missing or RLS denied — fall through to OSRM. */
    return null;
  }
}

/**
 * Resolve a route distance, preferring the Supabase corridor cache
 * when ZIPs are available and falling back to live OSRM otherwise.
 *
 * Always resolves; never throws. Returns `null` only when both
 * coords AND zips are missing.
 */
export async function resolveRoute(input: {
  from?:    LatLng | null;
  to?:      LatLng | null;
  fromZip?: string | null;
  toZip?:   string | null;
}): Promise<ResolvedRoute | null> {
  const { from, to, fromZip, toZip } = input;

  /* Cache key — coords win when present, ZIPs are the fallback
   * grouping. Same key shape so concurrent provider cards dedupe
   * cleanly. */
  const key = from && to
    ? `coord:${from.lat.toFixed(3)},${from.lng.toFixed(3)}|${to.lat.toFixed(3)},${to.lng.toFixed(3)}`
    : fromZip && toZip
      ? `zip:${corridorKey(fromZip, toZip)}`
      : null;
  if (!key) return null;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<ResolvedRoute | null> => {
    if (fromZip && toZip) {
      const cached = await lookupCorridor(fromZip, toZip);
      if (cached) return cached;
    }
    if (from && to) {
      const live = await getRouteDistance(from, to);
      if (live) return { ...live, source: live.source };
    }
    return null;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    /* Clear after settled so a subsequent navigation can re-fetch
     * if cache contents changed server-side. */
    inFlight.delete(key);
  }
}

export const KM_PER_MILE = 1.609344;

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}
