import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { listFraudAlerts, runFraudScan, updateFraudAlertStatus } from '../service';
import type { FraudAlertRow } from '../types';

const SEVERITY_TONE: Record<FraudAlertRow['severity'], string> = {
  low:      'bg-slate-100  text-slate-700',
  medium:   'bg-amber-100  text-amber-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100    text-red-700',
};

/**
 * Fraud + anomaly alerts panel. Reads from the fraud_alerts table,
 * surfaces open alerts with severity + category + message, and
 * lets the admin dismiss / confirm + manually trigger a scan.
 *
 * Used inside the AdminDashboard OverviewTab and the back-office
 * intelligence section.
 */
export default function FraudAlertsPanel() {
  const [rows,    setRows]    = useState<FraudAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);

  async function refresh() {
    try {
      setRows(await listFraudAlerts('open'));
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  async function scan() {
    setBusy(true);
    try {
      const n = await runFraudScan();
      toast.success(n === 0 ? 'No new anomalies detected' : `Detected ${n} new alert${n === 1 ? '' : 's'}`);
      void refresh();
    } catch (e) {
      toast.error('Scan failed', { description: e instanceof Error ? e.message : '' });
    } finally { setBusy(false); }
  }

  async function resolve(id: string, next: FraudAlertRow['status']) {
    try {
      await updateFraudAlertStatus(id, next);
      toast.success(next === 'dismissed' ? 'Dismissed' : 'Marked as fraud');
      void refresh();
    } catch (e) {
      toast.error('Update failed', { description: e instanceof Error ? e.message : '' });
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-slate-900">Fraud & anomaly alerts</h3>
          {rows.length > 0 && (
            <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              {rows.length} open
            </span>
          )}
        </div>
        <button
          onClick={scan} disabled={busy}
          className="inline-flex items-center gap-1.5 bg-[#0B2E59] hover:bg-[#0F3558] text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Run scan
        </button>
      </div>

      {loading ? (
        <p className="px-6 py-6 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : rows.length === 0 ? (
        <p className="px-6 py-8 text-sm text-slate-400 text-center">No open alerts. Click <strong>Run scan</strong> to check the last 7 days.</p>
      ) : (
        <ul>
          {rows.map(a => (
            <li key={a.id} className="px-6 py-3 border-t border-gray-100 flex items-start gap-3">
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${SEVERITY_TONE[a.severity]}`}>
                {a.severity}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">
                  {a.category.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">{a.message}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {a.subject_type} {a.subject_id.slice(0, 8)} · {new Date(a.detected_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => resolve(a.id, 'dismissed')}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
                  <X className="w-3 h-3" /> Dismiss
                </button>
                <button onClick={() => resolve(a.id, 'confirmed_fraud')}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white">
                  <Check className="w-3 h-3" /> Confirm fraud
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
