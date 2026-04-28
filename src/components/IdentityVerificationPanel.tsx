import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, X, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  listMyVerifications, submitVerification, fetchTrustLevel,
  type IdentityVerificationRow, type VerificationKind,
  VERIFICATION_KIND_LABEL, TRUST_LEVEL_LABEL,
} from '../lib/identity-store';
import TrustLevelBadge from './global/TrustLevelBadge';

/* ─────────────────────────────────────────────────────────────────
 * <IdentityVerificationPanel>
 *
 * Provider-facing identity verification UI for the Driver Portal.
 * Shows the resolved trust level, every verification kind with its
 * status, and an "Add verification" form for submitting new
 * evidence. Status flips to 'approved' only when admin reviews —
 * RLS enforces that (the form itself can't bypass it).
 *
 * Reads from the identity_verifications table; writes upsert
 * pending rows. Re-uses TrustLevelBadge for the level display.
 * ───────────────────────────────────────────────────────────────── */

const KIND_OPTIONS: VerificationKind[] = [
  'email', 'phone', 'id_document', 'business_registration',
  'vehicle', 'insurance', 'tax_status', 'address_proof',
];

const STATUS_TONE: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-800',
  pending:  'bg-amber-100   text-amber-800',
  rejected: 'bg-red-100     text-red-800',
  expired:  'bg-slate-100   text-slate-700',
};

interface Props { providerUserId: string; }

export default function IdentityVerificationPanel({ providerUserId }: Props) {
  const [rows,    setRows]    = useState<IdentityVerificationRow[]>([]);
  const [level,   setLevel]   = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [verifications, trust] = await Promise.all([
        listMyVerifications(providerUserId),
        fetchTrustLevel(providerUserId),
      ]);
      setRows(verifications);
      setLevel(trust);
    } catch (err: any) {
      toast.error('Could not load verifications', { description: err?.message });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [providerUserId]);

  async function handleSubmit(kind: VerificationKind, reference: string, evidenceUrl: string, expiresAt: string) {
    try {
      await submitVerification({
        userId:       providerUserId,
        kind,
        reference:    reference || undefined,
        evidenceUrl:  evidenceUrl || undefined,
        expiresAt:    expiresAt || undefined,
      });
      toast.success('Verification submitted', { description: 'An admin will review it shortly.' });
      setAdding(false);
      void refresh();
    } catch (err: any) {
      toast.error('Could not submit', { description: err?.message });
    }
  }

  /* Verifications missing entirely vs those already submitted. */
  const submittedKinds = new Set(rows.map(r => r.kind));
  const missingKinds = KIND_OPTIONS.filter(k => !submittedKinds.has(k));

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Identity &amp; Trust</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Verifications drive your trust level — which directly controls dispatch eligibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrustLevelBadge level={level} variant="full" />
          <button onClick={refresh}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Routing eligibility hint */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 flex items-start gap-3">
        <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">{TRUST_LEVEL_LABEL[level]}</p>
          <p className="text-xs">
            {level >= 4
              ? 'Eligible for enterprise + corporate routing.'
              : level >= 3
                ? 'Eligible for marketplace dispatch. Add vehicle + insurance to unlock enterprise routing.'
                : 'Add email, phone, and business registration to unlock dispatch.'}
          </p>
        </div>
      </div>

      {/* Verification rows */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
          {rows.map(r => (
            <li key={r.id} className="px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{VERIFICATION_KIND_LABEL[r.kind]}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {r.reference ? `Ref: ${r.reference}` : '—'}
                  {r.country_code ? ` · ${r.country_code.toUpperCase()}` : ''}
                  {r.expires_at ? ` · expires ${new Date(r.expires_at).toLocaleDateString()}` : ''}
                </p>
                {r.rejection_note && (
                  <p className="text-xs text-red-700 mt-0.5">Rejection note: {r.rejection_note}</p>
                )}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_TONE[r.status]}`}>
                {r.status === 'pending' && <Clock size={10} className="inline mr-1" />}
                {r.status === 'rejected' && <ShieldAlert size={10} className="inline mr-1" />}
                {r.status}
              </span>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-4 py-6 text-sm text-gray-500 text-center">
              No verifications yet. Add one below to start building your trust level.
            </li>
          )}
        </ul>
      )}

      {/* Add verification form */}
      {missingKinds.length > 0 && !adding && (
        <button onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
          <Plus size={12} />
          Add verification
        </button>
      )}

      {adding && (
        <AddVerificationForm
          missingKinds={missingKinds}
          onCancel={() => setAdding(false)}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}

function AddVerificationForm({
  missingKinds, onCancel, onSubmit,
}: {
  missingKinds: VerificationKind[];
  onCancel: () => void;
  onSubmit: (kind: VerificationKind, reference: string, evidenceUrl: string, expiresAt: string) => void;
}) {
  const [kind,        setKind]        = useState<VerificationKind>(missingKinds[0]);
  const [reference,   setReference]   = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [expiresAt,   setExpiresAt]   = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(kind, reference, evidenceUrl, expiresAt);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handle} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">Add verification</p>
        <button type="button" onClick={onCancel} className="p-1 rounded text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="text-xs">
          <span className="block font-semibold text-gray-700 mb-1">Kind</span>
          <select value={kind} onChange={e => setKind(e.target.value as VerificationKind)}
            className="w-full px-2.5 py-2 border border-gray-200 rounded-lg bg-white">
            {missingKinds.map(k => <option key={k} value={k}>{VERIFICATION_KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <label className="text-xs">
          <span className="block font-semibold text-gray-700 mb-1">Expires (optional)</span>
          <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
            className="w-full px-2.5 py-2 border border-gray-200 rounded-lg bg-white" />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="block font-semibold text-gray-700 mb-1">Reference (e.g. number, ID)</span>
          <input value={reference} onChange={e => setReference(e.target.value)} maxLength={200}
            placeholder="USDOT 1234567 / SIRET 12345678901234 / +47 …"
            className="w-full px-2.5 py-2 border border-gray-200 rounded-lg bg-white" />
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="block font-semibold text-gray-700 mb-1">Evidence URL (file upload coming)</span>
          <input value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} maxLength={500}
            placeholder="https://… or storage path"
            className="w-full px-2.5 py-2 border border-gray-200 rounded-lg bg-white" />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900">Cancel</button>
        <button type="submit" disabled={submitting}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>
    </form>
  );
}
