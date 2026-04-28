import React, { useEffect, useState } from 'react';
import { CheckCircle2, X, Clock, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import {
  listVerificationQueue, reviewVerification,
  type IdentityVerificationRow, type VerificationStatus,
  VERIFICATION_KIND_LABEL,
} from '../lib/identity-store';

/* ─────────────────────────────────────────────────────────────────
 * <AdminVerificationQueue>
 *
 * Admin-side review queue for identity_verifications. Lists every
 * row matching the active status filter (pending by default) with
 * approve / reject actions. Approving flips status='approved' and
 * stamps reviewed_at + reviewed_by; rejecting requires a note.
 *
 * RLS enforces is_admin() on writes, so the buttons fail loudly if
 * a non-admin somehow renders the queue.
 * ───────────────────────────────────────────────────────────────── */

const STATUS_TONE: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800',
  pending:  'bg-amber-100   text-amber-800',
  rejected: 'bg-red-100     text-red-800',
  expired:  'bg-slate-100   text-slate-700',
};

export default function AdminVerificationQueue() {
  const [rows,    setRows]    = useState<IdentityVerificationRow[]>([]);
  const [status,  setStatus]  = useState<VerificationStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listVerificationQueue(status, 100));
    } catch (err: any) {
      toast.error('Could not load queue', { description: err?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [status]);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await reviewVerification(id, 'approve');
      toast.success('Verification approved');
      await refresh();
    } catch (err: any) {
      toast.error('Approval failed', { description: err?.message });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const note = window.prompt('Rejection note (visible to the provider):', '');
    if (note === null) return;
    setBusyId(id);
    try {
      await reviewVerification(id, 'reject', note);
      toast.success('Verification rejected');
      await refresh();
    } catch (err: any) {
      toast.error('Rejection failed', { description: err?.message });
    } finally {
      setBusyId(null);
    }
  }

  const STATUS_FILTERS: (VerificationStatus | 'all')[] = ['pending', 'approved', 'rejected', 'expired', 'all'];

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            Identity Verification Queue
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Review provider + customer + organisation verifications. Approve to bump trust level.
          </p>
        </div>
        <button onClick={refresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
              status === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No verifications match this filter.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
          {rows.map(r => (
            <li key={r.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-gray-900">{VERIFICATION_KIND_LABEL[r.kind]}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[r.status]}`}>
                    {r.status === 'pending' && <Clock size={10} className="inline mr-0.5" />}
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  User <code className="font-mono text-[10px]">{r.user_id.slice(0, 8)}…</code>
                  {r.reference ? ` · Ref: ${r.reference}` : ''}
                  {r.country_code ? ` · ${r.country_code.toUpperCase()}` : ''}
                  {r.expires_at ? ` · expires ${new Date(r.expires_at).toLocaleDateString()}` : ''}
                </p>
                {r.evidence_url && (
                  <p className="text-xs text-blue-600 truncate font-mono mt-0.5">📎 {r.evidence_url}</p>
                )}
                {r.rejection_note && (
                  <p className="text-xs text-red-700 mt-0.5">Rejection: {r.rejection_note}</p>
                )}
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-1.5">
                  <button onClick={() => handleApprove(r.id)} disabled={busyId === r.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle2 size={12} />
                    Approve
                  </button>
                  <button onClick={() => handleReject(r.id)} disabled={busyId === r.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50">
                    <X size={12} />
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
