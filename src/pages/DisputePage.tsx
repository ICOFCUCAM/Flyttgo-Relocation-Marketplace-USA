import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ShieldCheck, AlertTriangle, Send, Inbox,
  Loader2, Upload, Camera, FileText, MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../lib/store';
import { useAuth } from '../lib/auth';
import {
  fileDispute, listMyDisputes, listDisputeEvidence,
  addDisputeEvidence, uploadDisputeEvidenceFile,
  type DisputeRow, type DisputeEvidenceRow, type EvidenceKind,
} from '../lib/disputes-store';
import {
  DISPUTE_CATEGORIES, resolvePath,
  type DisputeCategorySlug,
} from '../lib/dispute-rules';
import { COUNTRY_PROFILES, formatPrice, findCountryProfile } from '../lib/country-profiles';
import type { PricingCountry } from '../lib/pricing-engine';
import { Section, Eyebrow, Pill, EmptyState } from '../components/ds';
import { COMPLIANCE_DISCLOSURE } from '../lib/onboarding-rules';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <DisputePage> — /dispute
 *
 * Customer-facing dispute submission + inbox. Captures booking ID,
 * country, category (one of 8 standard types) + free-form summary;
 * surfaces the recommended resolution path before the customer files
 * (per the country × category template). Existing cases listed
 * below with expandable evidence trail; customer can add additional
 * evidence (files or notes) to any open case.
 *
 * Sign-in gated. Booking ID is currently entered manually — once
 * MyBookings exposes a "File a dispute" CTA per row, the form will
 * accept the booking id via URL ?booking= param too.
 * ───────────────────────────────────────────────────────────────── */

const KIND_ICON: Record<EvidenceKind, LucideIcon> = {
  photo:           Camera,
  video:           Camera,
  receipt:         FileText,
  chat_screenshot: MessageSquare,
  inventory_list:  FileText,
  timeline_note:   MessageSquare,
  arrival_proof:   Camera,
  other:           FileText,
};

export default function DisputePage() {
  const { setPage, bookingData } = useApp();
  const { user } = useAuth();

  const [bookingId, setBookingId] = useState('');
  const [country,   setCountry]   = useState<PricingCountry>(bookingData.country ?? 'us');
  const [category,  setCategory]  = useState<DisputeCategorySlug>('delay');
  const [summary,   setSummary]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [evidence, setEvidence] = useState<Record<string, DisputeEvidenceRow[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  /* Read booking from query param so MyBookings can deep-link
   * "File a dispute" buttons here. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const param = new URLSearchParams(window.location.search).get('booking');
    if (param) setBookingId(param);
  }, []);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    listMyDisputes(user.id)
      .then(setDisputes)
      .catch(err => toast.error('Failed to load disputes', { description: err.message }))
      .finally(() => setLoading(false));
  }, [user?.id]);

  /* Live preview of the recommended resolution path. */
  const recommended = useMemo(() => resolvePath(country, category), [country, category]);

  async function handleSubmit() {
    if (!user?.id) { toast.error('Sign in to file a dispute'); return; }
    if (!bookingId.trim()) { toast.error('Booking ID is required'); return; }
    if (!summary.trim() || summary.trim().length < 20) {
      toast.error('Tell us what happened (20+ characters)');
      return;
    }
    setSubmitting(true);
    try {
      const id = await fileDispute({
        bookingId: bookingId.trim(),
        country,
        category,
        summary:   summary.trim(),
      });
      track('dispute_filed', { country, category });
      toast.success('Dispute filed', {
        description: `Case ID ${id.slice(0, 8)}…  · Review SLA: 7 days. Funds on hold.`,
      });
      /* Reload list. */
      const fresh = await listMyDisputes(user.id);
      setDisputes(fresh);
      /* Reset form. */
      setBookingId(''); setSummary('');
    } catch (err) {
      toast.error('Could not file dispute', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function loadEvidence(disputeId: string) {
    if (evidence[disputeId]) return;
    try {
      const rows = await listDisputeEvidence(disputeId);
      setEvidence(prev => ({ ...prev, [disputeId]: rows }));
    } catch (err) {
      toast.error('Failed to load evidence', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    }
  }

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      void loadEvidence(id);
    }
  }

  async function handleUploadEvidence(dispute: DisputeRow, file: File) {
    if (!user?.id) return;
    try {
      const path = await uploadDisputeEvidenceFile(dispute.id, user.id, file);
      const kind: EvidenceKind =
        file.type.startsWith('image/') ? 'photo' :
        file.type.startsWith('video/') ? 'video' :
        'other';
      const row = await addDisputeEvidence({
        disputeId:      dispute.id,
        uploaderUserId: user.id,
        uploaderRole:   'customer',
        kind,
        fileUrl:        path,
      });
      setEvidence(prev => ({
        ...prev,
        [dispute.id]: [...(prev[dispute.id] ?? []), row],
      }));
      toast.success('Evidence added');
    } catch (err) {
      toast.error('Upload failed', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    }
  }

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <button
          onClick={() => setPage('my-bookings')}
          className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wider mb-6 transition"
        >
          <ArrowLeft size={12} /> My bookings
        </button>
        <Pill tone="brand" className="mb-3"><ShieldCheck size={12} /> Dispute resolution</Pill>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Something off? File a dispute.
        </h1>
        <p className="text-white/75 max-w-2xl">
          Filing a dispute pauses the provider's payout (escrow on hold) while
          the platform reviews. Most cases resolve within 7 days. Both sides
          can upload evidence — photos, receipts, chat screenshots, inventory.
        </p>
      </Section>

      {/* DISCLOSURE */}
      <Section tone="warm" size="sm">
        <div className="flex items-start gap-3 bg-white border border-amber-300/60 rounded-2xl p-5 max-w-4xl">
          <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-ink-900 block mb-1">Coordination layer · escrow protected</strong>
            {COMPLIANCE_DISCLOSURE} Provider insurance is the source of truth
            for damage claims; platform mediates and routes accordingly.
          </p>
        </div>
      </Section>

      {/* SIGN-IN GATE */}
      {!user ? (
        <Section tone="canvas" size="default" containerSize="narrow">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-extrabold text-ink-900 mb-2">Sign in to file a dispute</h2>
            <p className="text-slate-600 mb-5">
              Disputes are scoped to the customer who made the booking.
            </p>
            <button
              onClick={() => setPage('home')}
              className="px-5 py-2.5 bg-ink-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
            >
              Back to home
            </button>
          </div>
        </Section>
      ) : (
        <>
          {/* NEW CASE */}
          <Section tone="canvas" size="default">
            <Eyebrow tone="brand" className="mb-1">File a new case</Eyebrow>
            <h2 className="text-2xl font-extrabold text-ink-900 mb-6">Tell us what happened</h2>

            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Booking ID
                  </p>
                  <input
                    type="text"
                    value={bookingId}
                    onChange={e => setBookingId(e.target.value)}
                    placeholder="From the confirmation email or My bookings"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Country
                    </p>
                    <select
                      value={country}
                      onChange={e => setCountry(e.target.value as PricingCountry)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      {COUNTRY_PROFILES.map(p => (
                        <option key={p.code} value={p.code}>{p.flag} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Issue category
                    </p>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as DisputeCategorySlug)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      {DISPUTE_CATEGORIES.map(c => (
                        <option key={c.slug} value={c.slug}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  {DISPUTE_CATEGORIES.find(c => c.slug === category)?.description}
                </p>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    What happened?
                  </p>
                  <textarea
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="Describe the issue clearly. You'll be able to attach photos, receipts, and other evidence after filing."
                    rows={5}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{summary.length} characters · 20 minimum</p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl transition"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {submitting ? 'Filing…' : 'File dispute'}
                </button>
              </div>

              {/* RECOMMENDED RESOLUTION PREVIEW */}
              <aside className="lg:col-span-5 bg-amber-50 border border-amber-200 rounded-2xl p-5 self-start sticky top-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">
                  Recommended resolution · {findCountryProfile(country).name}
                </p>
                <p className="text-2xl font-extrabold text-ink-900 capitalize mb-2">
                  {recommended.path.replace(/_/g, ' ')}
                </p>
                {recommended.pct != null && (
                  <p className="text-sm text-slate-700 mb-3">
                    Suggested: <strong>{Math.round(recommended.pct * 100)}%</strong> of the booking value.
                  </p>
                )}
                {recommended.note && (
                  <p className="text-xs text-slate-600 leading-relaxed">{recommended.note}</p>
                )}
                <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                  Recommended is what the platform would default to —
                  evidence + admin review can shift the final outcome.
                </p>
              </aside>
            </div>
          </Section>

          {/* MY DISPUTES */}
          <Section tone="soft" size="default">
            <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
              <div>
                <Eyebrow tone="brand" className="mb-1">
                  <Inbox size={11} className="inline -mt-0.5 mr-1" />My disputes
                </Eyebrow>
                <h2 className="text-xl font-extrabold text-ink-900">
                  {disputes.length} case{disputes.length === 1 ? '' : 's'}
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 text-slate-500 py-12">
                <Loader2 size={18} className="animate-spin" /> Loading…
              </div>
            ) : disputes.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No disputes filed"
                body={<span>Hopefully it stays that way. If a booking goes sideways, file a case above and we'll mediate.</span>}
              />
            ) : (
              <ul className="space-y-3">
                {disputes.map(d => (
                  <DisputeCard
                    key={d.id}
                    dispute={d}
                    expanded={expanded === d.id}
                    onToggle={() => toggleExpand(d.id)}
                    evidence={evidence[d.id]}
                    onUpload={f => handleUploadEvidence(d, f)}
                  />
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </main>
  );
}

const DISPUTE_STATUS_TONE: Record<string, string> = {
  open:             'bg-amber-100 text-amber-700',
  under_review:     'bg-blue-100 text-blue-700',
  resolved:         'bg-emerald-100 text-emerald-700',
  closed_no_action: 'bg-slate-100 text-slate-500',
  escalated:        'bg-rose-100 text-rose-700',
};

function DisputeCard({ dispute: d, expanded, onToggle, evidence, onUpload }: {
  dispute:   DisputeRow;
  expanded:  boolean;
  onToggle:  () => void;
  evidence?: DisputeEvidenceRow[];
  onUpload:  (file: File) => void;
}) {
  const cat = DISPUTE_CATEGORIES.find(c => c.slug === d.category_slug);

  return (
    <li className="bg-white border border-slate-200 rounded-2xl">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <strong className="text-sm text-ink-900">{cat?.label}</strong>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${DISPUTE_STATUS_TONE[d.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {d.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1">
            Booking {d.booking_id.slice(0, 8)} · filed {new Date(d.filed_at).toLocaleDateString()}
          </p>
          {d.suggested_path && (
            <p className="text-[11px] text-amber-700 mt-1 inline-flex items-center gap-1">
              Suggested: <span className="font-bold capitalize">{d.suggested_path.replace(/_/g, ' ')}</span>
              {d.suggested_pct != null && <span>· {Math.round(d.suggested_pct * 100)}%</span>}
            </p>
          )}
        </div>
        <ArrowRight size={11} className={`flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-90' : ''} text-slate-400`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Your statement
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{d.summary}</p>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Evidence ({evidence?.length ?? 0})
              </p>
              {(d.status === 'open' || d.status === 'under_review') && (
                <label className="text-xs font-bold text-brand-700 hover:text-brand-800 cursor-pointer inline-flex items-center gap-1.5">
                  <Upload size={11} />
                  Add file
                  <input
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
            {!evidence ? (
              <p className="text-xs text-slate-500 inline-flex items-center gap-2">
                <Loader2 size={11} className="animate-spin" /> Loading…
              </p>
            ) : evidence.length === 0 ? (
              <p className="text-xs text-slate-400">No evidence yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {evidence.map(e => {
                  const Icon = KIND_ICON[e.kind] ?? FileText;
                  return (
                    <li key={e.id} className="flex items-start gap-2 text-xs bg-surface-soft rounded-lg px-3 py-2">
                      <Icon size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-ink-900 capitalize">
                          {e.kind.replace(/_/g, ' ')} · {e.uploader_role}
                        </p>
                        {e.note && <p className="text-slate-600 mt-0.5">{e.note}</p>}
                        {e.file_url && <p className="text-slate-400 truncate">{e.file_url}</p>}
                      </div>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {new Date(e.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {d.final_path && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                Final resolution
              </p>
              <p className="text-sm text-ink-900 capitalize font-bold">
                {d.final_path.replace(/_/g, ' ')}
                {d.final_amount != null && (
                  <span className="ml-2 text-emerald-700">
                    · {formatPrice(d.final_amount, d.country)}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
