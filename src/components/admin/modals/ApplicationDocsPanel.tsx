import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, FileText, Eye, X, Download, Image as ImageIcon, Truck } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS } from '../utils';
import {
  useApplicationDocuments,
  useSetDocumentVerification,
} from '../../../hooks/queries/useAdminDashboard';
import { getDocumentPublicUrl } from '../../../services/admin';
import type { DocumentRow } from '../../../services/admin';
import { readApplicationCompliance, complianceLabel, type ApplicationComplianceInput } from '../../../lib/application-compliance';

/* ─────────────────────────────────────────────────────────────────
 * <ApplicationDocsPanel>
 *
 * Driver document review surface — used for *both* pending
 * applications (where docs are awaiting verification) and adopted
 * (approved) drivers (where docs were verified at onboarding and
 * the admin needs to re-inspect).
 *
 * The data layer already keys off `driver_id` so the same hook
 * works whether we open from the Applications tab (with an
 * applicationId) or from the Drivers tab (just a userId).
 *
 * Replaces the prior 96-wide floating box with a proper centered
 * modal: per-document tile + inline image preview (or PDF chip),
 * status pill, approve/reject actions, and a permission to
 * download/open in a new tab. Brand-aligned amber for primary
 * verify; emerald only on the final "Approved" status (legitimate
 * status state per the color-sweep policy).
 * ───────────────────────────────────────────────────────────────── */

interface DriverDocsContext {
  /** Required — the driver's auth.users id (= driver_documents.driver_id). */
  userId:        string;
  /** Optional — present when opened from the Applications tab. */
  applicationId: string | null;
  /** Display name to show in the modal title. Use the FlyttGo
   *  white-label identity from getProviderPublicIdentity if you
   *  have it; falls back to the raw applicant name. */
  displayName:   string;
  /** Optional context badge text — e.g. "Application · Pending review"
   *  or "Active driver". */
  contextLabel?: string;
  /** Optional applicant context — when present, the modal renders a
   *  vehicle + compliance block at the top so the admin sees the
   *  same data the driver sees on /driver-application-status. */
  vehicleType?:  string | null;
  vehicleYear?:  number | null;
  /** Structured + legacy compliance source. Carries vehicle_model
   *  (legacy cram-string) AND the per-jurisdiction structured
   *  columns. readApplicationCompliance prefers structured columns
   *  and falls back to parsing the cram-string. */
  compliance?:   ApplicationComplianceInput;
}

const STATUS_TONE: Record<string, { bg: string; text: string; label: string; icon: typeof Clock }> = {
  approved: { bg: 'bg-emerald-50  border-emerald-200', text: 'text-emerald-700', label: 'Approved',     icon: CheckCircle2 },
  rejected: { bg: 'bg-red-50      border-red-200',      text: 'text-red-700',     label: 'Rejected',     icon: XCircle },
  pending:  { bg: 'bg-amber-50    border-amber-200',    text: 'text-amber-800',   label: 'Pending',      icon: Clock },
};

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|bmp|avif)(\?|$)/i.test(url);
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}

export function ApplicationDocsPanel({
  context,
  onClose,
}: {
  context: DriverDocsContext;
  onClose: () => void;
}) {
  const { data: docs = [], isLoading } = useApplicationDocuments(
    context.applicationId,
    context.userId,
  );
  const setVerification = useSetDocumentVerification(context.applicationId ?? context.userId);

  /* Esc-to-close. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const counts = docs.reduce(
    (acc, d) => {
      const s = (d.verification_status ?? 'pending') as string;
      if (s === 'approved') acc.approved++;
      else if (s === 'rejected') acc.rejected++;
      else acc.pending++;
      return acc;
    },
    { approved: 0, rejected: 0, pending: 0 },
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Driver application documents"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.4)] flex flex-col overflow-hidden">
        {/* Header — ink-navy band with amber accent, matches the
         *  rest of the marketplace surface. */}
        <div className="bg-ink-900 text-white px-6 py-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300 mb-1">
              Documents · {context.contextLabel ?? 'Driver record'}
            </p>
            <h2 className="text-xl font-extrabold truncate">{context.displayName}</h2>
            <p className="text-xs text-white/60 font-mono mt-1 truncate">
              {context.applicationId
                ? `Application: ${context.applicationId}`
                : `Driver: ${context.userId}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status counters — at-a-glance triage. */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap gap-2 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            <FileText size={12} />
            {docs.length} document{docs.length === 1 ? '' : 's'}
          </span>
          {counts.pending > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              <Clock size={12} />
              {counts.pending} pending
            </span>
          )}
          {counts.approved > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={12} />
              {counts.approved} approved
            </span>
          )}
          {counts.rejected > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700">
              <XCircle size={12} />
              {counts.rejected} rejected
            </span>
          )}
        </div>

        {/* Body — scrolls inside the modal. */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Vehicle + compliance block — structured-first reader.
           *  Same data the driver sees on their /driver-application-
           *  status page, cleanly formatted regardless of whether
           *  the row was written before or after the structured-
           *  columns migration. */}
          {(context.compliance || context.vehicleType) && (() => {
            const parsed = readApplicationCompliance(context.compliance ?? {});
            const vehicleType = context.vehicleType?.replace(/_/g, ' ');
            const headLine = [
              vehicleType,
              parsed.makeModel,
              context.vehicleYear ? `(${context.vehicleYear})` : null,
            ].filter(Boolean).join(' · ');
            const complianceEntries = Object.entries(parsed.compliance);
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                    <Truck size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
                      Vehicle &amp; compliance
                    </p>
                    <p className="font-bold text-slate-900">{headLine || '—'}</p>
                    {parsed.category && (
                      <p className="text-xs text-slate-500 mt-0.5">{parsed.category}</p>
                    )}
                  </div>
                </div>
                {complianceEntries.length > 0 && (
                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {complianceEntries.map(([k, v]) => (
                      <div key={k} className="flex items-baseline gap-2 min-w-0">
                        <dt className="text-slate-500 flex-shrink-0">{complianceLabel(k)}</dt>
                        <dd className="font-mono text-slate-900 truncate">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })()}

          {isLoading ? (
            <div className="text-center py-20 text-slate-500 text-sm">Loading documents…</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-20">
              <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No documents uploaded yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Drivers upload required documents during the
                /become-a-driver onboarding flow. They'll appear
                here as soon as they submit.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {docs.map(doc => (
                <DocumentTile
                  key={doc.id}
                  doc={doc}
                  onApprove={() => setVerification.mutate({ documentId: doc.id, status: 'approved' })}
                  onReject={() => setVerification.mutate({ documentId: doc.id, status: 'rejected' })}
                  isPending={setVerification.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentTile({
  doc,
  onApprove,
  onReject,
  isPending,
}: {
  doc:       DocumentRow;
  onApprove: () => void;
  onReject:  () => void;
  isPending: boolean;
}) {
  const [previewError, setPreviewError] = useState(false);
  const url    = getDocumentPublicUrl(doc.file_url);
  const status = (doc.verification_status ?? 'pending') as string;
  const tone   = STATUS_TONE[status] ?? STATUS_TONE.pending;
  const StatusIcon = tone.icon;
  const isImage = isImageUrl(doc.file_url);
  const isPdf   = isPdfUrl(doc.file_url);
  const docLabel = DOCUMENT_TYPE_LABELS[doc.document_type as string] ?? doc.document_type;
  const isFinal = status === 'approved' || status === 'rejected';

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Preview — image inline, PDF/other as a labelled chip. */}
      <div className="relative bg-slate-50 h-44 flex items-center justify-center">
        {isImage && !previewError ? (
          <img
            src={url}
            alt={docLabel}
            className="w-full h-full object-cover"
            onError={() => setPreviewError(true)}
            loading="lazy"
          />
        ) : (
          <div className="text-center">
            {isPdf ? (
              <FileText className="w-10 h-10 text-red-500 mx-auto mb-1" />
            ) : (
              <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-1" />
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isPdf ? 'PDF document' : 'Document'}
            </p>
          </div>
        )}
        <span className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${tone.bg} ${tone.text}`}>
          <StatusIcon size={10} />
          {tone.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="font-bold text-slate-900 text-sm">{docLabel}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '—'}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold rounded-lg transition"
          >
            <Eye size={12} />
            View
          </a>
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold rounded-lg transition"
          >
            <Download size={12} />
            Download
          </a>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onReject}
              disabled={isPending || isFinal}
              className="inline-flex items-center gap-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold rounded-lg transition"
            >
              <XCircle size={12} />
              Reject
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={isPending || isFinal}
              className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold rounded-lg transition shadow shadow-amber-500/30"
            >
              <CheckCircle2 size={12} />
              Approve
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export type { DriverDocsContext };
