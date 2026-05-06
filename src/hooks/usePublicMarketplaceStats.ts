import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Live aggregate counts the public marketing surfaces want to
 * display: GlobalPresence, MobilityIntelligence, footer trust strip.
 *
 * Backed by the public.public_marketplace_stats SQL view (created
 * in docs/install-public-marketplace-stats.sql). The view runs with
 * the owner's privileges so anon reads return platform-wide totals
 * — no RLS leakage, just aggregate counts.
 *
 * Static fallbacks keep the UI rendering plausible numbers while
 * the network round-trip is in flight or if the view ever 404s.
 */
export interface PublicMarketplaceStats {
  countriesTotal:    number;
  driversApproved:   number;
  bookingsCompleted: number;
  bookingsLast30d:   number;
  currenciesTotal:   number;
}

const FALLBACK: PublicMarketplaceStats = {
  countriesTotal:    16,
  driversApproved:   0,
  bookingsCompleted: 0,
  bookingsLast30d:   0,
  currenciesTotal:   7,
};

let cache: PublicMarketplaceStats | null = null;

export function usePublicMarketplaceStats(): PublicMarketplaceStats {
  /* Single shared fetch per page-load — these counts don't move
   * fast enough to need realtime. The cache is module-scoped so
   * GlobalPresence + Footer don't both trigger their own request. */
  const [stats, setStats] = useState<PublicMarketplaceStats>(cache ?? FALLBACK);

  useEffect(() => {
    if (cache) return undefined;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('public_marketplace_stats')
        .select('countries_total, drivers_approved, bookings_completed, bookings_last_30d, currencies_total')
        .single();
      if (cancelled || !data) return;
      const next: PublicMarketplaceStats = {
        countriesTotal:    Number(data.countries_total ?? FALLBACK.countriesTotal),
        driversApproved:   Number(data.drivers_approved ?? 0),
        bookingsCompleted: Number(data.bookings_completed ?? 0),
        bookingsLast30d:   Number(data.bookings_last_30d ?? 0),
        currenciesTotal:   Number(data.currencies_total ?? FALLBACK.currenciesTotal),
      };
      cache = next;
      setStats(next);
    })();
    return () => { cancelled = true; };
  }, []);

  return stats;
}
