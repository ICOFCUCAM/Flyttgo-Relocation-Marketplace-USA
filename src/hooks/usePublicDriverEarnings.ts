import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Aggregate per-city driver earnings for the public /drivers-earnings
 * page. Backed by docs/install-public-driver-earnings.sql which
 * exposes ONLY anonymized aggregates (city + counts + earnings
 * buckets). Cities below the small-sample threshold are excluded by
 * the view itself so single-driver income can't be reverse-engineered.
 */
export interface PublicDriverEarningRow {
  country:         string;   // 'US' / 'NO' / 'unknown'
  city:            string;
  payoutsTotal:    number;
  driversActive:   number;
  earningsAvg:     number;   // local-currency
  earningsMedian:  number;
  earningsP75:     number;
  earningsSum90d:  number;
}

let cache: PublicDriverEarningRow[] | null = null;

export function usePublicDriverEarnings(country?: string) {
  const [rows, setRows] = useState<PublicDriverEarningRow[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) { setLoading(false); return undefined; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('public_driver_earnings_by_city')
        .select('country, city, payouts_total, drivers_active, earnings_avg, earnings_median, earnings_p75, earnings_sum_90d')
        .order('payouts_total', { ascending: false })
        .limit(200);
      if (cancelled) return;
      const next: PublicDriverEarningRow[] = (data ?? []).map(r => ({
        country:        String(r.country),
        city:           String(r.city),
        payoutsTotal:   Number(r.payouts_total ?? 0),
        driversActive:  Number(r.drivers_active ?? 0),
        earningsAvg:    Number(r.earnings_avg ?? 0),
        earningsMedian: Number(r.earnings_median ?? 0),
        earningsP75:    Number(r.earnings_p75 ?? 0),
        earningsSum90d: Number(r.earnings_sum_90d ?? 0),
      }));
      cache = next;
      setRows(next);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  /* Filter happens in-memory so changing the country dropdown
   * doesn't trigger a network round-trip. */
  const filtered = country
    ? rows.filter(r => r.country.toLowerCase() === country.toLowerCase())
    : rows;

  return { rows: filtered, loading };
}
