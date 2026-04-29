import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  adminResolveDispute, adminReleasePayout, adminRequestEvidence,
  adminEscalateDispute, adminSetProviderSuspension,
} from '../../../lib/admin-disputes-store';
import type { DisputeRow as DisputeRowData } from '../../../lib/disputes-store';
import { DISPUTE_CATEGORIES, type ResolutionPath } from '../../../lib/dispute-rules';

/* Admin queue row with action buttons. Lives in the disputes tab. */
export function DisputeRow({
  dispute: d,
  onChanged,
}: {
  dispute: DisputeRowData;
  onChanged: () => void;
}) {
  const cat = DISPUTE_CATEGORIES.find(c => c.slug === d.category_slug);
  const [busy, setBusy] = useState(false);

  async function run<T>(label: string, fn: () => Promise<T>): Promise<void> {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      onChanged();
    } catch (err) {
      toast.error(label + ' failed', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    } finally {
      setBusy(false);
    }
  }

  function promptResolve(path: ResolutionPath) {
    const rationale = prompt(`Rationale for ${path.replace(/_/g, ' ')}?`) ?? '';
    if (!rationale.trim()) return;
    let amount: number | null = null;
    let pct:    number | null = null;
    if (path === 'partial_refund' || path === 'service_credit') {
      const raw = prompt('Refund / credit amount in booking currency (e.g. 60.00)?') ?? '';
      const n   = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return;
      amount = n;
    }
    if (path === 'full_refund') {
      const raw = prompt('Full refund amount (booking total)?') ?? '';
      const n   = Number(raw);
      if (!Number.isFinite(n) || n <= 0) return;
      amount = n;
      pct    = 1.0;
    }
    void run('Resolved', () => adminResolveDispute(d.id, path, amount, pct, rationale));
  }

  function promptRelease() {
    const r = prompt('Rationale for releasing payout (no refund)?') ?? '';
    if (!r.trim()) return;
    void run('Payout released', () => adminReleasePayout(d.id, r));
  }

  function promptEvidence() {
    const r = prompt('Note explaining what evidence is needed?') ?? '';
    if (!r.trim()) return;
    void run('Evidence requested', () => adminRequestEvidence(d.id, r));
  }

  function promptEscalate() {
    const r = prompt('Reason for escalation?') ?? '';
    if (!r.trim()) return;
    void run('Escalated', () => adminEscalateDispute(d.id, r));
  }

  function promptSuspend() {
    if (!d.provider_user_id) {
      toast.error('No provider linked to this dispute');
      return;
    }
    const r = prompt('Reason for suspending the provider?') ?? '';
    if (!r.trim()) return;
    void run('Provider suspended', () => adminSetProviderSuspension(d.provider_user_id!, true, r));
  }

  const statusTone =
    d.status === 'open'             ? 'bg-amber-100 text-amber-700' :
    d.status === 'under_review'     ? 'bg-blue-100 text-blue-700' :
    d.status === 'resolved'         ? 'bg-emerald-100 text-emerald-700' :
    d.status === 'closed_no_action' ? 'bg-gray-100 text-gray-500' :
                                      'bg-rose-100 text-rose-700';

  return (
    <tr className="border-t align-top">
      <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
        {new Date(d.filed_at).toLocaleDateString()}
      </td>
      <td className="p-3">
        <div className="font-bold">{cat?.label ?? d.category_slug}</div>
        <div className="text-xs text-gray-500 uppercase">{d.country}</div>
      </td>
      <td className="p-3 text-xs font-mono text-gray-500 truncate max-w-[10rem]">
        {d.booking_id.slice(0, 8)}…
      </td>
      <td className="p-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${statusTone}`}>
          {d.status.replace(/_/g, ' ')}
        </span>
      </td>
      <td className="p-3 text-xs">
        {d.suggested_path ? (
          <div className="capitalize">
            {d.suggested_path.replace(/_/g, ' ')}
            {d.suggested_pct != null && <span className="text-gray-400"> · {Math.round(d.suggested_pct * 100)}%</span>}
          </div>
        ) : <span className="text-gray-400">—</span>}
      </td>
      <td className="p-3">
        {d.status === 'resolved' || d.status === 'closed_no_action' ? (
          <span className="text-xs text-gray-400">Closed</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            <button disabled={busy} onClick={promptRelease}
              className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded disabled:opacity-50">
              Release
            </button>
            <button disabled={busy} onClick={() => promptResolve('partial_refund')}
              className="text-[10px] font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded disabled:opacity-50">
              Partial refund
            </button>
            <button disabled={busy} onClick={() => promptResolve('full_refund')}
              className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded disabled:opacity-50">
              Full refund
            </button>
            <button disabled={busy} onClick={promptEvidence}
              className="text-[10px] font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 rounded disabled:opacity-50">
              Request evidence
            </button>
            <button disabled={busy} onClick={promptEscalate}
              className="text-[10px] font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded disabled:opacity-50">
              Escalate
            </button>
            <button disabled={busy} onClick={promptSuspend}
              className="text-[10px] font-bold uppercase tracking-wider bg-rose-800 hover:bg-rose-900 text-white px-2 py-1 rounded disabled:opacity-50">
              Suspend provider
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
