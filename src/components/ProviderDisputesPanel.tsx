import React, { useState, useEffect } from 'react';
import { AlertTriangle, Upload, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import {
  type DisputeRow,
  type DisputeEvidenceRow,
  type EvidenceKind,
  listDisputeEvidence,
  addDisputeEvidence,
  uploadDisputeEvidenceFile,
} from '../lib/disputes-store';

/* ─────────────────────────────────────────────────────────────────
 * <ProviderDisputesPanel>
 *
 * Driver-portal companion to the customer-facing dispute pages.
 * Surfaces every dispute filed against the signed-in provider so
 * they can:
 *   - Read the customer's summary + suggested resolution path
 *   - Post counter-evidence (file upload + free-text note)
 *   - Track the resolution outcome once admin closes the dispute
 *
 * Uses the existing disputes / dispute_evidence tables. RLS keeps
 * each provider scoped to their own rows; admin override paths are
 * unaffected.
 * ───────────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  open:             'bg-amber-100 text-amber-800',
  under_review:     'bg-blue-100 text-blue-800',
  resolved:         'bg-emerald-100 text-emerald-800',
  closed_no_action: 'bg-gray-100 text-gray-700',
  escalated:        'bg-red-100 text-red-800',
};

const KIND_OPTIONS: { value: EvidenceKind; label: string }[] = [
  { value: 'photo',           label: 'Photo' },
  { value: 'video',           label: 'Video' },
  { value: 'receipt',         label: 'Receipt / invoice' },
  { value: 'chat_screenshot', label: 'Chat screenshot' },
  { value: 'inventory_list',  label: 'Inventory list' },
  { value: 'arrival_proof',   label: 'Arrival proof' },
  { value: 'timeline_note',   label: 'Timeline note' },
  { value: 'other',           label: 'Other' },
];

interface Props { providerUserId: string; }

export default function ProviderDisputesPanel({ providerUserId }: Props) {
  const [disputes,   setDisputes]   = useState<DisputeRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [evidence,   setEvidence]   = useState<Record<string, DisputeEvidenceRow[]>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('disputes')
      .select('*')
      .eq('provider_user_id', providerUserId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setDisputes((data ?? []) as DisputeRow[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [providerUserId]);

  async function toggleExpand(id: string) {
    if (activeId === id) { setActiveId(null); return; }
    setActiveId(id);
    if (!evidence[id]) {
      const rows = await listDisputeEvidence(id);
      setEvidence(prev => ({ ...prev, [id]: rows }));
    }
  }

  async function handleUpload(disputeId: string, kind: EvidenceKind, file: File | null, note: string) {
    if (!file && !note.trim()) {
      toast.error('Add a note or attach a file', { description: 'Empty submissions aren\'t saved.' });
      return;
    }
    try {
      let fileUrl: string | undefined;
      if (file) {
        fileUrl = await uploadDisputeEvidenceFile(disputeId, providerUserId, file);
      }
      const row = await addDisputeEvidence({
        disputeId,
        uploaderUserId: providerUserId,
        uploaderRole:   'provider',
        kind,
        fileUrl,
        note: note.trim() || undefined,
      });
      setEvidence(prev => ({
        ...prev,
        [disputeId]: [...(prev[disputeId] ?? []), row],
      }));
      toast.success('Evidence submitted', { description: 'Admin will review your response.' });
    } catch (err: any) {
      toast.error('Could not submit evidence', { description: err?.message });
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
        <div className="h-3 w-full bg-gray-100 rounded mb-2" />
        <div className="h-3 w-5/6 bg-gray-100 rounded" />
      </div>
    );
  }

  if (disputes.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 border text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
        <p className="font-bold text-gray-900 mb-1">No open disputes</p>
        <p className="text-sm text-gray-500">
          When a customer files a complaint about one of your jobs, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-0.5">Why this matters</p>
          <p>Posting clear counter-evidence within 48 hours protects your reputation score and can reverse the suggested refund path. Admin reviews every submission.</p>
        </div>
      </div>

      {disputes.map(d => (
        <DisputeCard
          key={d.id}
          dispute={d}
          expanded={activeId === d.id}
          evidence={evidence[d.id] ?? []}
          onToggle={() => toggleExpand(d.id)}
          onUpload={(kind, file, note) => handleUpload(d.id, kind, file, note)}
        />
      ))}
    </div>
  );
}

function DisputeCard({
  dispute, expanded, evidence, onToggle, onUpload,
}: {
  dispute:   DisputeRow;
  expanded:  boolean;
  evidence:  DisputeEvidenceRow[];
  onToggle:  () => void;
  onUpload:  (kind: EvidenceKind, file: File | null, note: string) => void;
}) {
  const [kind, setKind] = useState<EvidenceKind>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reviewDue = new Date(dispute.review_due_at);
  const hoursLeft = Math.max(0, Math.floor((reviewDue.getTime() - Date.now()) / 3_600_000));
  const editable  = dispute.status === 'open' || dispute.status === 'under_review';

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[dispute.status] || 'bg-gray-100 text-gray-700'}`}>
              {dispute.status.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-mono text-gray-500 uppercase">
              {dispute.category_slug.replace(/_/g, ' ')}
            </span>
            {editable && hoursLeft > 0 && (
              <span className="text-[10px] inline-flex items-center gap-1 text-amber-700">
                <Clock size={10} /> {hoursLeft}h to respond
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{dispute.summary}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Filed {new Date(dispute.filed_at).toLocaleDateString()} · Booking #{dispute.booking_id.slice(0, 8)}
          </p>
        </div>
        <span className={`ml-3 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-4">
          {/* Suggested resolution */}
          {dispute.suggested_path && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                Suggested resolution
              </p>
              <p className="text-sm text-blue-800">
                {dispute.suggested_path.replace(/_/g, ' ')}
                {dispute.suggested_pct != null && ` · ${Math.round(dispute.suggested_pct * 100)}% of total`}
              </p>
            </div>
          )}

          {/* Final resolution if resolved */}
          {dispute.status === 'resolved' && dispute.final_path && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide mb-1">
                Final resolution
              </p>
              <p className="text-sm text-emerald-800">
                {dispute.final_path.replace(/_/g, ' ')}
                {dispute.final_amount != null && ` · ${dispute.final_amount} USD`}
              </p>
            </div>
          )}

          {/* Evidence timeline */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Evidence timeline ({evidence.length})
            </p>
            {evidence.length === 0 ? (
              <p className="text-sm text-gray-400">No evidence has been posted yet.</p>
            ) : (
              <ul className="space-y-2">
                {evidence.map(e => (
                  <li key={e.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[10px] font-bold uppercase ${e.uploader_role === 'provider' ? 'text-emerald-700' : e.uploader_role === 'customer' ? 'text-blue-700' : 'text-purple-700'}`}>
                        {e.uploader_role} · {e.kind.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(e.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {e.note && <p className="text-gray-700">{e.note}</p>}
                    {e.file_url && (
                      <p className="text-xs text-blue-600 truncate font-mono">📎 {e.file_url}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Upload form — only when dispute is still actionable */}
          {editable && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                await onUpload(kind, file, note);
                setSubmitting(false);
                setFile(null);
                setNote('');
              }}
              className="border-t border-gray-100 pt-4 space-y-2"
            >
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Add counter-evidence
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as EvidenceKind)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                  <Upload size={14} className="text-gray-500" />
                  <span className="truncate text-gray-700">{file?.name ?? 'Attach file (optional)'}</span>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Add a written note explaining your side."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                  {submitting ? 'Submitting…' : 'Submit evidence'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
