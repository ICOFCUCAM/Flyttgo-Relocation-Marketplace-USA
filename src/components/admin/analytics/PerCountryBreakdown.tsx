import { Loader2, Download } from 'lucide-react';
import { useCountryBreakdown } from '../../../hooks/queries/useAdminAnalytics';
import { downloadCsv } from '../utils';

/**
 * Per-country KPI rollup. Bookings (total + 30d + completed),
 * revenue, and driver count split by country code so ops can see
 * which shopfronts are firing.
 *
 * "Export CSV" button reuses the existing downloadCsv helper —
 * one-click weekly snapshot for finance + marketing.
 */
export default function PerCountryBreakdown() {
  const { data, isLoading } = useCountryBreakdown();

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-3 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading per-country breakdown…
      </div>
    );
  }

  function exportCsv() {
    downloadCsv(
      `flyttgo-country-breakdown-${new Date().toISOString().slice(0, 10)}.csv`,
      (data ?? []) as unknown as Record<string, unknown>[],
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Per-country breakdown</h3>
          <p className="text-xs text-slate-500 mt-0.5">Live aggregates per booking_country / driver_profiles.zone.</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B2E59] hover:bg-[#0F3558] text-white text-xs font-bold rounded-lg transition"
        >
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left  px-6 py-3">Country</th>
              <th className="text-right px-6 py-3">Bookings · all</th>
              <th className="text-right px-6 py-3">Bookings · 30d</th>
              <th className="text-right px-6 py-3">Completed</th>
              <th className="text-right px-6 py-3">Revenue · 30d</th>
              <th className="text-right px-6 py-3">Drivers · total</th>
              <th className="text-right px-6 py-3">Active</th>
              <th className="text-right px-6 py-3">Online</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r => (
              <tr key={r.country} className="border-t border-gray-100 hover:bg-slate-50">
                <td className="px-6 py-3 font-bold text-slate-900 uppercase">{r.country}</td>
                <td className="px-6 py-3 text-right">{r.bookingsTotal.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-bold text-slate-900">{r.bookings30d.toLocaleString()}</td>
                <td className="px-6 py-3 text-right text-emerald-700 font-semibold">{r.bookingsCompleted.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-semibold">{Math.round(r.revenue30d).toLocaleString()}</td>
                <td className="px-6 py-3 text-right">{r.driversTotal}</td>
                <td className="px-6 py-3 text-right">{r.driversActive}</td>
                <td className="px-6 py-3 text-right">
                  <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    r.driversOnline > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{r.driversOnline}</span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400 text-sm">No country data yet — bookings + drivers will populate this once they're tagged with a country.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
