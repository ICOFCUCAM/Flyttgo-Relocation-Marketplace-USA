import { TrendingUp, Activity, DollarSign, Loader2 } from 'lucide-react';
import { useKpiTimeseries } from '../../../hooks/queries/useAdminAnalytics';
import type { KpiTimeseriesRow as Row } from '../../../services/adminAnalytics';

/**
 * 30-day KPI strip — three pure-SVG sparklines for bookings,
 * revenue, and active drivers. No charting library; the data point
 * count is small enough to draw with `<polyline>` and a couple
 * of derived helpers.
 *
 * Each card surfaces:
 *   • The sparkline path
 *   • Today's value
 *   • Δ vs the 30-day mean (signal of trajectory)
 */
export default function TimeSeriesSparklines() {
  const { data, isLoading } = useKpiTimeseries();

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-3 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading 30-day strip…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SparkCard
        rows={data}
        valueOf={(r) => r.bookingsCount}
        label="Bookings · 30d"
        icon={<Activity className="w-4 h-4" />}
        color="#0B2E59"
        format={(v) => v.toLocaleString()}
      />
      <SparkCard
        rows={data}
        valueOf={(r) => r.bookingsValue}
        label="Booking value · 30d"
        icon={<DollarSign className="w-4 h-4" />}
        color="#059669"
        format={(v) => `${Math.round(v).toLocaleString()}`}
      />
      <SparkCard
        rows={data}
        valueOf={(r) => r.activeDrivers}
        label="Active drivers · 30d"
        icon={<TrendingUp className="w-4 h-4" />}
        color="#f59e0b"
        format={(v) => v.toLocaleString()}
      />
    </div>
  );
}

function SparkCard({
  rows, valueOf, label, icon, color, format,
}: {
  rows: Row[];
  valueOf: (r: Row) => number;
  label: string;
  icon: React.ReactNode;
  color: string;
  format: (v: number) => string;
}) {
  const series = rows.map(valueOf);
  const today  = series[series.length - 1] ?? 0;
  const mean   = series.length > 0 ? series.reduce((s, v) => s + v, 0) / series.length : 0;
  const delta  = mean > 0 ? ((today - mean) / mean) * 100 : 0;

  /* Path math — normalise to a 0..1 box, flip Y because SVG y-axis
   * grows down. Pad the min/max range so a flat line still has a
   * visible mid-line. */
  const min = Math.min(...series);
  const max = Math.max(...series, min + 1);
  const W   = 240;
  const H   = 56;
  const stepX = series.length > 1 ? W / (series.length - 1) : W;
  const norm  = (v: number) => 1 - (v - min) / (max - min);
  const points = series.map((v, i) => `${(i * stepX).toFixed(1)},${(norm(v) * H).toFixed(1)}`).join(' ');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
          {icon} {label}
        </div>
        <div className={`text-[11px] font-bold ${
          delta >= 5  ? 'text-emerald-600' :
          delta <= -5 ? 'text-red-600'     :
                        'text-slate-400'
        }`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}%
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="text-3xl font-extrabold text-slate-900">{format(today)}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    </div>
  );
}
