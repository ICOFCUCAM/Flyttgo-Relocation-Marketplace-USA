import { Loader2, ArrowRight } from 'lucide-react';
import { useAcquisitionFunnel } from '../../../hooks/queries/useAdminAnalytics';

/**
 * Driver acquisition funnel: applied → approved → active → first
 * booking. Each step shows count + conversion % from the previous
 * step, plus a width-proportional bar so drop-off is visually
 * obvious at a glance.
 */
export default function FunnelView() {
  const { data, isLoading } = useAcquisitionFunnel();

  if (isLoading || !data) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-3 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading funnel…
      </div>
    );
  }

  const steps: { label: string; count: number; tone: string }[] = [
    { label: 'Applied',         count: data.applied,               tone: 'bg-slate-700' },
    { label: 'Approved',        count: data.approved,              tone: 'bg-blue-600' },
    { label: 'Active',          count: data.active,                tone: 'bg-amber-500' },
    { label: 'First booking',   count: data.firstBookingCompleted, tone: 'bg-emerald-600' },
  ];
  const max = Math.max(...steps.map(s => s.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="font-bold text-slate-900 mb-1">Driver acquisition funnel</h3>
      <p className="text-xs text-slate-500 mb-5">From application submitted to first completed booking.</p>

      <div className="space-y-3">
        {steps.map((s, i) => {
          const width = Math.max((s.count / max) * 100, 6);
          const prev  = i > 0 ? steps[i - 1].count : null;
          const conv  = prev != null && prev > 0 ? (s.count / prev) * 100 : null;
          return (
            <div key={s.label}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>{s.label}</span>
                <span className="text-slate-500 font-mono">
                  {s.count.toLocaleString()}
                  {conv != null && (
                    <span className="ml-2 text-emerald-600">({conv.toFixed(0)}%)</span>
                  )}
                </span>
              </div>
              <div className="w-full h-7 bg-slate-100 rounded-lg overflow-hidden">
                <div
                  className={`h-full ${s.tone} flex items-center px-3 transition-all duration-700`}
                  style={{ width: `${width}%` }}
                >
                  <span className="text-white text-[11px] font-bold">{s.count.toLocaleString()}</span>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center my-1 text-slate-300">
                  <ArrowRight className="w-3 h-3 rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
