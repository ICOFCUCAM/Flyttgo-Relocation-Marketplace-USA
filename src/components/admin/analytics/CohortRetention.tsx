import { Loader2 } from 'lucide-react';
import { useDriverCohorts } from '../../../hooks/queries/useAdminAnalytics';

/**
 * Driver cohort retention heatmap. Each row is a signup-month
 * cohort; columns are weeks since signup (W0..W4). Cell intensity
 * encodes the % of the cohort that was still active that week.
 */
export default function CohortRetention() {
  const { data, isLoading } = useDriverCohorts();

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-3 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading cohorts…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-1">Driver retention by cohort</h3>
        <p className="text-xs text-slate-500">No cohort data yet — once drivers complete bookings, the matrix populates here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-1">Driver retention by signup cohort</h3>
      <p className="text-xs text-slate-500 mb-5">% of each signup-month cohort still completing bookings each week.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 uppercase tracking-wider text-[10px]">
              <th className="text-left pb-2 font-semibold">Cohort</th>
              <th className="text-right pb-2 font-semibold">Size</th>
              <th className="text-center pb-2 font-semibold">W0</th>
              <th className="text-center pb-2 font-semibold">W1</th>
              <th className="text-center pb-2 font-semibold">W2</th>
              <th className="text-center pb-2 font-semibold">W3</th>
              <th className="text-center pb-2 font-semibold">W4</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.cohortMonth} className="border-t border-slate-100">
                <td className="py-2 font-semibold text-slate-700">{formatMonth(c.cohortMonth)}</td>
                <td className="py-2 text-right text-slate-500">{c.cohortSize}</td>
                {[c.activeW0, c.activeW1, c.activeW2, c.activeW3, c.activeW4].map((v, i) => (
                  <td key={i} className="py-1.5 px-1 text-center">
                    <Cell value={v} cohortSize={c.cohortSize} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ value, cohortSize }: { value: number; cohortSize: number }) {
  const pct = cohortSize > 0 ? (value / cohortSize) * 100 : 0;
  /* Light → dark green ramp at 8 buckets. */
  const intensity = Math.min(Math.round(pct / 12.5), 7);
  const colors = [
    'bg-slate-50 text-slate-400',
    'bg-emerald-50 text-emerald-700',
    'bg-emerald-100 text-emerald-800',
    'bg-emerald-200 text-emerald-900',
    'bg-emerald-300 text-emerald-900',
    'bg-emerald-400 text-white',
    'bg-emerald-500 text-white',
    'bg-emerald-600 text-white',
  ];
  return (
    <span className={`inline-block min-w-[44px] py-1 rounded-md font-bold text-[11px] ${colors[intensity]}`}>
      {pct > 0 ? `${pct.toFixed(0)}%` : '—'}
    </span>
  );
}

function formatMonth(s: string): string {
  /* "2026-04-01" → "Apr 2026" */
  const d = new Date(s + 'T00:00:00Z');
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
