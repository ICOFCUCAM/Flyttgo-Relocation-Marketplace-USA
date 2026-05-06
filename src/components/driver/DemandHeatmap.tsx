import { useEffect, useState } from 'react';
import { TrendingUp, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * <DemandHeatmap>
 *
 * Driver-facing demand-density panel: top cities by recent booking
 * volume in the driver's country. Backed by the
 * public.driver_demand_heatmap SQL view, which aggregates the
 * bookings table by pickup_city over a rolling 30-day window.
 *
 * Visual: horizontal bar chart, longest bar = highest demand.
 * Picks the top N cities; renders nothing when the country has
 * zero bookings in the window (avoids an empty rectangle on a
 * fresh-deploy market). 'Top 8' is a sensible default — fits a
 * single column without scrolling on most screens.
 */
interface HeatmapRow {
  country:        string;
  city:           string;
  bookings_total: number;
  bookings_7d:    number;
  bookings_30d:   number;
}

export function DemandHeatmap({ country }: { country: string }) {
  const [rows, setRows]       = useState<HeatmapRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('driver_demand_heatmap')
        .select('country, city, bookings_total, bookings_7d, bookings_30d')
        .eq('country', country.toUpperCase())
        .limit(8);
      if (cancelled) return;
      setRows(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [country]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <p className="text-sm text-gray-500">Loading demand data…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} className="text-amber-500" />
          <h3 className="font-bold text-gray-900">Demand heatmap</h3>
        </div>
        <p className="text-sm text-gray-500">
          No recent bookings recorded in {country.toUpperCase()} yet — the
          heatmap activates as soon as the first move comes through.
        </p>
      </div>
    );
  }

  const max = Math.max(...rows.map(r => r.bookings_30d || r.bookings_total));

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-amber-500" />
          <h3 className="font-bold text-gray-900">Demand heatmap</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Last 30 days · {country.toUpperCase()}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Top cities by recent booking volume. Position yourself near a
        high-demand corridor for the highest dispatch rate.
      </p>
      <ul className="space-y-2">
        {rows.map(r => {
          const pct = max > 0 ? Math.round((r.bookings_30d / max) * 100) : 0;
          /* Recent-7d marker rendered as a darker overlay on the bar so the
           * driver sees both the 30-day baseline and the live trend. */
          const recentPct = max > 0 ? Math.round((r.bookings_7d / max) * 100) : 0;
          return (
            <li key={`${r.country}-${r.city}`} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin size={12} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 truncate">{r.city}</span>
                </div>
                <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-amber-300" style={{ width: `${pct}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-amber-600" style={{ width: `${recentPct}%` }} />
                </div>
              </div>
              <span className="text-xs font-bold text-gray-700 tabular-nums">
                {r.bookings_30d}
                {r.bookings_7d > 0 && (
                  <span className="ml-1 text-amber-700">({r.bookings_7d}↑)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-gray-400 mt-4">
        Light bar: 30-day total · Dark bar: last 7 days · Aggregated, no PII.
      </p>
    </div>
  );
}
