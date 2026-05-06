import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

/**
 * Live provider counts per anchor-city slug.
 *
 * Reads from `public.provider_counts_by_city` (see
 * docs/install-provider-counts-by-city.sql) — a view that aggregates
 * driver_profiles by `home_city_slug`. Returns a `Record<slug, count>`
 * keyed by the same kebab-case slugs used in ANCHOR_CITIES, so call
 * sites can substitute `counts[city.slug] ?? city.initialProviderCount ?? 0`
 * straight into `computeCityStatus()`.
 *
 * Tolerant: if the view doesn't exist yet (fresh database without
 * the migration applied), the hook returns an empty record and
 * components fall back to the static initialProviderCount on each
 * AnchorCity. No errors surfaced to the user.
 */

interface ProviderCountRow {
  city_slug:      string | null;
  approved_count: number | null;
  total_count:    number | null;
}

const QUERY_KEY = ['provider-counts', 'by-city'] as const;
const STALE_MS  = 5 * 60_000;   // 5 minutes — provider density doesn't change fast

async function fetchProviderCountsByCity(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('provider_counts_by_city')
    .select('city_slug, approved_count, total_count');

  /* PGRST204 / 42P01 — view doesn't exist. Treat as zero counts so
   * the rollout-status surface still renders against the static
   * initialProviderCount. */
  if (error) {
    if ((error as { code?: string }).code === '42P01' || error.message?.includes('relation')) {
      return {};
    }
    /* For anything else, surface to react-query so we can see it. */
    throw error;
  }
  if (!data) return {};

  const out: Record<string, number> = {};
  for (const row of data as ProviderCountRow[]) {
    if (!row.city_slug) continue;
    /* Prefer approved over total for status promotion — only
     * approved providers count for activation thresholds. */
    out[row.city_slug] = row.approved_count ?? row.total_count ?? 0;
  }
  return out;
}

/**
 * Hook: live provider counts keyed by anchor-city slug.
 *
 * Call sites can spread the live count into computeCityStatus():
 *   const counts = useProviderCountsByCity();
 *   const state  = computeCityStatus(city, counts[city.slug] ?? city.initialProviderCount ?? 0);
 */
export function useProviderCountsByCity() {
  const q = useQuery({
    queryKey: QUERY_KEY,
    queryFn:  fetchProviderCountsByCity,
    staleTime: STALE_MS,
    /* Never throw at the boundary — components should fall back to
     * static counts gracefully. */
    retry:    1,
  });
  return q.data ?? {};
}
