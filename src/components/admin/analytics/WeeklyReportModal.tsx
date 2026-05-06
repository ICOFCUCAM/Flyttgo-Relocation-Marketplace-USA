import { useEffect } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import {
  useKpiTimeseries,
  useCountryBreakdown,
  useAcquisitionFunnel,
  useDriverCohorts,
} from '../../../hooks/queries/useAdminAnalytics';

/**
 * Printable weekly report.
 *
 * Opens as a fullscreen overlay with a print-friendly layout, and
 * triggers the browser's native print dialog when the user clicks
 * "Print / Save as PDF". No PDF library — relying on browser print
 * keeps the bundle tiny, lets the user pick PDF or paper, and works
 * across every modern browser without a server-side renderer.
 *
 * Captures the same numbers the dashboard sees — useAdminAnalytics
 * hooks read from the SQL views so the report is consistent with
 * the live UI.
 */
export default function WeeklyReportModal({ onClose }: { onClose: () => void }) {
  const { data: timeseries } = useKpiTimeseries();
  const { data: countries  } = useCountryBreakdown();
  const { data: funnel     } = useAcquisitionFunnel();
  const { data: cohorts    } = useDriverCohorts();

  const today    = new Date();
  const weekAgo  = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const range    = `${fmtDate(weekAgo)} → ${fmtDate(today)}`;

  /* Sums for the headline KPI band. */
  const ts7d = (timeseries ?? []).slice(-7);
  const totals7d = {
    bookings: ts7d.reduce((s, r) => s + r.bookingsCount, 0),
    revenue:  ts7d.reduce((s, r) => s + r.bookingsValue, 0),
    drivers:  ts7d.length > 0 ? Math.round(ts7d.reduce((s, r) => s + r.activeDrivers, 0) / ts7d.length) : 0,
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #flyttgo-weekly-report, #flyttgo-weekly-report * { visibility: visible; }
          #flyttgo-weekly-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
        {/* Floating action bar — hidden when printing */}
        <div className="no-print sticky top-0 z-10 bg-[#0b1f3a] text-white px-6 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-300" />
            <div>
              <p className="font-bold text-sm">Weekly Operations Report</p>
              <p className="text-xs text-white/60">{range}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold transition"
            >
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div id="flyttgo-weekly-report" className="max-w-4xl mx-auto bg-white text-slate-900 my-6 p-10 shadow-xl rounded-2xl print:my-0 print:rounded-none print:shadow-none">

          {/* Letterhead */}
          <header className="border-b-2 border-slate-200 pb-6 mb-6 flex items-center justify-between">
            <div>
              <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em]">FlyttGo Operations</p>
              <h1 className="text-3xl font-extrabold mt-1">Weekly report</h1>
              <p className="text-slate-500 text-sm mt-1">{range}</p>
            </div>
            <img src="/logo-mark.png" alt="FlyttGo" className="w-16 h-16 object-cover rounded-xl" />
          </header>

          {/* 7-day headline KPIs */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">7-day totals</h2>
            <div className="grid grid-cols-3 gap-4">
              <ReportKpi label="Bookings"    value={totals7d.bookings.toLocaleString()} />
              <ReportKpi label="Booking value" value={Math.round(totals7d.revenue).toLocaleString()} />
              <ReportKpi label="Avg active drivers / day" value={totals7d.drivers.toLocaleString()} />
            </div>
          </section>

          {/* Funnel */}
          {funnel && (
            <section className="mb-8">
              <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Acquisition funnel</h2>
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left  py-2 px-3 font-semibold">Stage</th>
                    <th className="text-right py-2 px-3 font-semibold">Count</th>
                    <th className="text-right py-2 px-3 font-semibold">Step conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Applied',         count: funnel.applied,               prev: null            },
                    { label: 'Approved',        count: funnel.approved,              prev: funnel.applied  },
                    { label: 'Active',          count: funnel.active,                prev: funnel.approved },
                    { label: 'First booking',   count: funnel.firstBookingCompleted, prev: funnel.active   },
                  ].map(s => {
                    const conv = s.prev != null && s.prev > 0 ? (s.count / s.prev) * 100 : null;
                    return (
                      <tr key={s.label} className="border-t border-slate-100">
                        <td className="py-2 px-3 font-semibold">{s.label}</td>
                        <td className="py-2 px-3 text-right font-mono">{s.count.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                          {conv != null ? `${conv.toFixed(0)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* Per-country */}
          {countries && countries.length > 0 && (
            <section className="mb-8 break-inside-avoid">
              <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">By market</h2>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left  py-2 px-2 font-semibold">Country</th>
                    <th className="text-right py-2 px-2 font-semibold">Bookings · 30d</th>
                    <th className="text-right py-2 px-2 font-semibold">Completed</th>
                    <th className="text-right py-2 px-2 font-semibold">Revenue · 30d</th>
                    <th className="text-right py-2 px-2 font-semibold">Drivers</th>
                    <th className="text-right py-2 px-2 font-semibold">Online</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map(r => (
                    <tr key={r.country} className="border-t border-slate-100">
                      <td className="py-1.5 px-2 font-bold uppercase">{r.country}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{r.bookings30d.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-emerald-700">{r.bookingsCompleted.toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{Math.round(r.revenue30d).toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{r.driversTotal}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{r.driversOnline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Cohorts */}
          {cohorts && cohorts.length > 0 && (
            <section className="mb-8 break-inside-avoid">
              <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Driver retention by cohort</h2>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left  py-2 px-2 font-semibold">Cohort</th>
                    <th className="text-right py-2 px-2 font-semibold">Size</th>
                    <th className="text-center py-2 px-2 font-semibold">W0</th>
                    <th className="text-center py-2 px-2 font-semibold">W1</th>
                    <th className="text-center py-2 px-2 font-semibold">W2</th>
                    <th className="text-center py-2 px-2 font-semibold">W3</th>
                    <th className="text-center py-2 px-2 font-semibold">W4</th>
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map(c => (
                    <tr key={c.cohortMonth} className="border-t border-slate-100">
                      <td className="py-1.5 px-2 font-semibold">{fmtCohort(c.cohortMonth)}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{c.cohortSize}</td>
                      {[c.activeW0, c.activeW1, c.activeW2, c.activeW3, c.activeW4].map((v, i) => {
                        const pct = c.cohortSize > 0 ? (v / c.cohortSize) * 100 : 0;
                        return (
                          <td key={i} className="py-1.5 px-2 text-center font-mono">
                            {pct > 0 ? `${pct.toFixed(0)}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Footer */}
          <footer className="border-t border-slate-200 pt-4 mt-8 text-[10px] text-slate-400 flex items-center justify-between">
            <span>FlyttGo Global Logistics &amp; Relocation Marketplace</span>
            <span>Generated {today.toISOString().slice(0, 16).replace('T', ' ')} UTC</span>
          </footer>

        </div>
      </div>
    </>
  );
}

function ReportKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtCohort(s: string): string {
  return new Date(s + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
