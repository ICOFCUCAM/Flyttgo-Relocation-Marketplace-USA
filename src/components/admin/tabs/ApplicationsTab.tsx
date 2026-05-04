import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Eye, Clock, AlertTriangle, FileText, User } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { REQUIRED_DOCS, DOCUMENT_TYPE_LABELS } from '../utils';
import { useReviewApplication } from '../../../hooks/queries/useAdminDashboard';
import type { ApplicationRow } from '../../../services/admin';
import type { AdminPanelHandlers } from '../types';

/* ─────────────────────────────────────────────────────────────────
 * <ApplicationsTab> — driver application review surface
 *
 * The admin's primary tool for moving applications from "submitted"
 * to "approved" or "rejected". Surfaces:
 *   - applicant context (name, phone, when they applied)
 *   - status (pending / approved / rejected / under_review)
 *   - per-document approval state with progress count
 *   - inline approve / reject / view-docs actions
 *   - status filter chips so the queue can be scoped to "pending"
 *     during a review session
 *
 * The data is loaded by useAdminDashboard and refreshed on
 * mutation; this surface is read-only beyond the approve/reject
 * action which goes through useReviewApplication → admin service.
 * ───────────────────────────────────────────────────────────────── */

type StatusFilter = 'all' | 'pending' | 'under_review' | 'approved' | 'rejected';

const STATUS_TONE: Record<string, { bg: string; text: string; label: string; icon: typeof Clock }> = {
  pending:       { bg: 'bg-amber-100',    text: 'text-amber-800',    label: 'Pending review',  icon: Clock },
  submitted:     { bg: 'bg-amber-100',    text: 'text-amber-800',    label: 'Pending review',  icon: Clock },
  under_review:  { bg: 'bg-sky-100',      text: 'text-sky-800',      label: 'Under review',    icon: Eye },
  approved:      { bg: 'bg-emerald-100',  text: 'text-emerald-800',  label: 'Approved',        icon: CheckCircle2 },
  rejected:      { bg: 'bg-red-100',      text: 'text-red-800',      label: 'Rejected',        icon: XCircle },
};

function statusBadge(status: string) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
  const Icon = tone.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${tone.bg} ${tone.text}`}>
      <Icon size={11} />
      {tone.label}
    </span>
  );
}

export function ApplicationsTab({
  applications,
  applicationDocStatus,
  handlers,
}: {
  applications: ApplicationRow[];
  applicationDocStatus: Record<string, string[]>;
  handlers: AdminPanelHandlers;
}) {
  const { user } = useAuth();
  const review = useReviewApplication();
  const [filter, setFilter] = useState<StatusFilter>('all');

  /* Counts by status — drives both the filter chips and the
   * empty-state messaging. Pending + submitted collapse into one
   * "needs review" bucket since they're equivalent for the admin. */
  const counts = useMemo(() => {
    const c = { all: applications.length, pending: 0, under_review: 0, approved: 0, rejected: 0 };
    for (const a of applications) {
      if (a.status === 'pending' || a.status === 'submitted') c.pending++;
      else if (a.status === 'under_review') c.under_review++;
      else if (a.status === 'approved')     c.approved++;
      else if (a.status === 'rejected')     c.rejected++;
    }
    return c;
  }, [applications]);

  const filtered = useMemo(() => {
    if (filter === 'all') return applications;
    if (filter === 'pending') {
      return applications.filter(a => a.status === 'pending' || a.status === 'submitted');
    }
    return applications.filter(a => a.status === filter);
  }, [applications, filter]);

  function runReview(app: ApplicationRow, action: 'approved' | 'rejected') {
    if (!user?.id) return;
    let rejectionReason: string | null = null;
    if (action === 'rejected') {
      const entered = window.prompt('Reason for rejection (visible to the driver on their status page):', '');
      if (entered === null) return;
      if (entered.trim().length === 0) {
        alert('Please enter a rejection reason so the driver knows what to fix.');
        return;
      }
      rejectionReason = entered.trim();
    }
    review.mutate(
      { applicationId: app.id, action, reviewerUserId: user.id, rejectionReason },
      {
        onSuccess: result => {
          if (action !== 'approved') return;
          if (!result.activated) {
            alert(
              'Driver cannot be activated.\nMissing approvals for:\n' +
                (result.missingDocs ?? []).join(', '),
            );
          } else {
            alert('Driver activated successfully.');
          }
        },
        onError: err => alert('Review failed: ' + (err instanceof Error ? err.message : 'unknown')),
      },
    );
  }

  return (
    <div>
      {/* Header — pending count gets prime visual weight so the admin
       *  knows at a glance how many need their attention. */}
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 mb-1">
            Driver applications
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Review queue
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Approve or reject driver applications. Approval activates the
            driver only when every required document is verified.
          </p>
        </div>

        {counts.pending > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center shadow shadow-amber-500/30">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-amber-800 tabular-nums leading-none">
                {counts.pending}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Awaiting review
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([
          { key: 'all',          label: 'All',           count: counts.all },
          { key: 'pending',      label: 'Pending',       count: counts.pending },
          { key: 'under_review', label: 'Under review',  count: counts.under_review },
          { key: 'approved',     label: 'Approved',      count: counts.approved },
          { key: 'rejected',     label: 'Rejected',      count: counts.rejected },
        ] as const).map(c => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                active
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              {c.label}
              <span className={`tabular-nums ${active ? 'text-amber-300' : 'text-slate-400'}`}>
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">
            {filter === 'all'
              ? 'No driver applications yet'
              : `No ${filter.replace('_', ' ')} applications`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            New applications appear here automatically as drivers complete
            the onboarding flow at /become-a-driver.
          </p>
        </div>
      ) : (
        /* Card grid — easier to scan than the prior plain table.
         * Each card carries the applicant, status, doc-progress, and
         * actions in a fixed layout so the admin learns the rhythm. */
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map(app => {
            const approvedDocs = applicationDocStatus[app.id] ?? [];
            const totalDocs    = REQUIRED_DOCS.length;
            const progressPct  = Math.round((approvedDocs.length / totalDocs) * 100);
            const fullName = [app.first_name, app.last_name].filter(Boolean).join(' ') || 'Unnamed applicant';

            return (
              <article key={app.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-lg transition">
                {/* Header — applicant identity */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold flex-shrink-0">
                      <User size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{fullName}</p>
                      {app.phone && (
                        <p className="text-xs text-slate-500 truncate">{app.phone}</p>
                      )}
                    </div>
                  </div>
                  {statusBadge(app.status)}
                </div>

                {/* Document progress */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Required documents
                    </p>
                    <p className="text-xs font-bold text-slate-700 tabular-nums">
                      {approvedDocs.length} / {totalDocs}
                    </p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all ${progressPct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {REQUIRED_DOCS.map(doc => {
                      const ok = approvedDocs.includes(doc);
                      return (
                        <span
                          key={doc}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            ok
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {ok && <CheckCircle2 size={10} />}
                          {DOCUMENT_TYPE_LABELS[doc] ?? doc.replace(/_/g, ' ')}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Footer — applied date + actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] text-slate-400">
                    Applied {new Date(app.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlers.openApplicationDocs(app)}
                      className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold rounded-lg transition"
                    >
                      <Eye size={12} />
                      Docs
                    </button>
                    <button
                      onClick={() => runReview(app, 'rejected')}
                      disabled={review.isPending || app.status === 'approved' || app.status === 'rejected'}
                      className="inline-flex items-center gap-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold rounded-lg transition"
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                    <button
                      onClick={() => runReview(app, 'approved')}
                      disabled={review.isPending || app.status === 'approved' || app.status === 'rejected'}
                      className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold rounded-lg transition shadow shadow-amber-500/30"
                    >
                      <CheckCircle2 size={12} />
                      Approve
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
