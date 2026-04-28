import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ShieldCheck, Loader2, Inbox, Send, Calendar,
  MapPin, AlertTriangle, Check, X as XIcon, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../lib/store';
import { useAuth } from '../lib/auth';
import {
  createQuoteRequest, listMyQuoteRequests, listQuotesForRequest,
  acceptProviderQuote, cancelQuoteRequest,
  type QuoteRequestRow, type ProviderQuoteRow,
} from '../lib/quote-requests-store';
import { COUNTRY_PROFILES, formatPrice, findCountryProfile } from '../lib/country-profiles';
import { PROVIDER_CATEGORIES } from '../lib/provider-categories';
import type { PricingCountry } from '../lib/pricing-engine';
import type { ProviderCategorySlug } from '../lib/provider-categories';
import { Section, Eyebrow, Pill, EmptyState } from '../components/ds';
import { COMPLIANCE_DISCLOSURE } from '../lib/onboarding-rules';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <RequestQuotePage> — /request-quote
 *
 * Step 2 of the payment-flow spec — provider-confirmation pricing
 * for moves that don't fit the instant-booking flow (long-distance,
 * international, corporate, complex labor briefs).
 *
 * Two stacked surfaces:
 *
 *   1. New brief form   — customer captures origin / destination /
 *                          category / move date / open notes. Submits
 *                          to quote_requests; providers in that
 *                          country see it in their inbox.
 *   2. My quotes inbox  — list of the customer's existing requests
 *                          with the quotes received per request, plus
 *                          one-click accept that atomically rejects
 *                          siblings via the accept_provider_quote RPC.
 *
 * Sign-in gated — every row has a user_id FK and RLS enforces
 * ownership.
 * ───────────────────────────────────────────────────────────────── */

export default function RequestQuotePage() {
  const { setPage, bookingData } = useApp();
  const { user } = useAuth();

  const [country,         setCountry]         = useState<PricingCountry>(bookingData.country ?? 'us');
  const [category,        setCategory]        = useState<ProviderCategorySlug>('moving-labor');
  const [pickupAddress,   setPickupAddress]   = useState('');
  const [pickupCity,      setPickupCity]      = useState('');
  const [dropoffAddress,  setDropoffAddress]  = useState('');
  const [dropoffCity,     setDropoffCity]     = useState('');
  const [moveDate,        setMoveDate]        = useState('');
  const [bedrooms,        setBedrooms]        = useState<number | ''>('');
  const [expectedHours,   setExpectedHours]   = useState<number | ''>('');
  const [notes,           setNotes]           = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [requests,   setRequests]   = useState<QuoteRequestRow[]>([]);
  const [loading,    setLoading]    = useState(true);

  /* Quotes received, keyed by request id. Lazy-loaded when a row
   * is expanded — avoids N+1 SELECTs at list-render time. */
  const [quotesByReq,  setQuotesByReq]  = useState<Record<string, ProviderQuoteRow[]>>({});
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    listMyQuoteRequests(user.id)
      .then(setRequests)
      .catch(err => toast.error('Failed to load your quote requests', { description: err.message }))
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleSubmit() {
    if (!user?.id) {
      toast.error('Sign in to request quotes');
      return;
    }
    if (!pickupAddress || !dropoffAddress) {
      toast.error('Pick up and drop-off addresses are required');
      return;
    }
    setSubmitting(true);
    try {
      const row = await createQuoteRequest(user.id, {
        country, category,
        pickup_address:   pickupAddress,
        pickup_city:      pickupCity || null,
        dropoff_address:  dropoffAddress,
        dropoff_city:     dropoffCity || null,
        move_date:        moveDate || null,
        brief: {
          bedrooms:      typeof bedrooms === 'number' ? bedrooms : undefined,
          expectedHours: typeof expectedHours === 'number' ? expectedHours : undefined,
          inventoryNote: notes || undefined,
        },
      });
      track('quote_request_submitted', { country, category });
      setRequests(prev => [row, ...prev]);
      toast.success('Quote request submitted', {
        description: 'Providers in your market see it now. Quotes typically arrive within 4–24 hours.',
      });
      /* Reset fields except country/category. */
      setPickupAddress(''); setPickupCity('');
      setDropoffAddress(''); setDropoffCity('');
      setMoveDate(''); setBedrooms(''); setExpectedHours(''); setNotes('');
    } catch (err) {
      toast.error('Failed to submit quote request', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function loadQuotes(requestId: string) {
    if (quotesByReq[requestId]) return;
    try {
      const rows = await listQuotesForRequest(requestId);
      setQuotesByReq(prev => ({ ...prev, [requestId]: rows }));
    } catch (err) {
      toast.error('Failed to load quotes', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    }
  }

  function toggleExpand(requestId: string) {
    if (expandedId === requestId) {
      setExpandedId(null);
    } else {
      setExpandedId(requestId);
      void loadQuotes(requestId);
    }
  }

  async function handleAccept(quote: ProviderQuoteRow) {
    try {
      await acceptProviderQuote(quote.id);
      track('quote_accepted', { quoteId: quote.id, amount: quote.amount_total });
      toast.success('Quote accepted', {
        description: 'We\'ve emailed the provider; they\'ll send a deposit-payment link.',
      });
      /* Refresh local state. */
      setQuotesByReq(prev => ({
        ...prev,
        [quote.request_id]: (prev[quote.request_id] ?? []).map(q =>
          q.id === quote.id
            ? { ...q, status: 'accepted' as const }
            : q.status === 'submitted' ? { ...q, status: 'declined' as const } : q,
        ),
      }));
      setRequests(prev => prev.map(r =>
        r.id === quote.request_id
          ? { ...r, status: 'accepted' as const, accepted_quote_id: quote.id }
          : r,
      ));
    } catch (err) {
      toast.error('Could not accept quote', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    }
  }

  async function handleCancel(req: QuoteRequestRow) {
    try {
      await cancelQuoteRequest(req.id);
      setRequests(prev => prev.map(r =>
        r.id === req.id ? { ...r, status: 'cancelled' as const } : r,
      ));
      toast.success('Request cancelled');
    } catch (err) {
      toast.error('Could not cancel', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    }
  }

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <button
          onClick={() => setPage('home')}
          className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wider mb-6 transition"
        >
          <ArrowLeft size={12} /> Back
        </button>
        <Pill tone="brand" className="mb-3"><Send size={12} /> Request quotes</Pill>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Get quotes from verified providers.
        </h1>
        <p className="text-white/75 max-w-2xl">
          Best for long-distance, international, corporate, or complex labor
          briefs. Providers in your market submit competing quotes within
          4–24 hours; you pick the winner. Local moves should use the instant
          quote on the homepage instead.
        </p>
      </Section>

      {/* COMPLIANCE DISCLOSURE */}
      <Section tone="warm" size="sm">
        <div className="flex items-start gap-3 bg-white border border-amber-300/60 rounded-2xl p-5 max-w-4xl">
          <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-ink-900 block mb-1">Coordination layer · escrow protected</strong>
            {COMPLIANCE_DISCLOSURE} Quoted prices are binding on acceptance;
            payment goes into FlyttGo escrow and releases to the provider
            after the move completes + the dispute window passes.
          </p>
        </div>
      </Section>

      {/* SIGN-IN GATE */}
      {!user ? (
        <Section tone="canvas" size="default" containerSize="narrow">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-extrabold text-ink-900 mb-2">Sign in to request quotes</h2>
            <p className="text-slate-600 mb-5">
              We need to know who to send the quotes to. The instant-quote
              widget on the homepage works without signing in.
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
          {/* NEW BRIEF */}
          <Section tone="canvas" size="default">
            <Eyebrow tone="brand" className="mb-1">New quote brief</Eyebrow>
            <h2 className="text-2xl font-extrabold text-ink-900 mb-6">Tell us about the move</h2>

            <div className="grid lg:grid-cols-2 gap-4">
              <Field label="Country">
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value as PricingCountry)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {COUNTRY_PROFILES.map(p => (
                    <option key={p.code} value={p.code}>{p.flag} {p.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Service category">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ProviderCategorySlug)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {PROVIDER_CATEGORIES.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Pickup address" icon={MapPin} fullWidth>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={e => setPickupAddress(e.target.value)}
                  placeholder="Street + number"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </Field>
              <Field label="Pickup city">
                <input
                  type="text"
                  value={pickupCity}
                  onChange={e => setPickupCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </Field>

              <Field label="Drop-off address" icon={MapPin} fullWidth>
                <input
                  type="text"
                  value={dropoffAddress}
                  onChange={e => setDropoffAddress(e.target.value)}
                  placeholder="Street + number"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </Field>
              <Field label="Drop-off city">
                <input
                  type="text"
                  value={dropoffCity}
                  onChange={e => setDropoffCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </Field>

              <Field label="Preferred move date" icon={Calendar}>
                <input
                  type="date"
                  value={moveDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setMoveDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </Field>

              <Field label="Bedrooms (approx)">
                <input
                  type="number" min={0} max={10}
                  value={bedrooms}
                  onChange={e => setBedrooms(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </Field>

              <Field label="Expected hours">
                <input
                  type="number" min={1} max={24}
                  value={expectedHours}
                  onChange={e => setExpectedHours(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </Field>

              <Field label="Notes for the provider" fullWidth>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special items, fragile cargo, stairs / elevator, parking, anything that affects the quote."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </Field>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-ink-900 font-bold rounded-xl shadow-medium transition"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitting ? 'Submitting…' : 'Submit quote request'}
            </button>
          </Section>

          {/* MY QUOTES INBOX */}
          <Section tone="soft" size="default">
            <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
              <div>
                <Eyebrow tone="brand" className="mb-1"><Inbox size={11} className="inline -mt-0.5 mr-1" />My quote requests</Eyebrow>
                <h2 className="text-xl font-extrabold text-ink-900">
                  {requests.length} request{requests.length === 1 ? '' : 's'}
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 text-slate-500 py-12">
                <Loader2 size={18} className="animate-spin" /> Loading…
              </div>
            ) : requests.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No quote requests yet"
                body={<span>Submit your first brief above and we'll fan it out to verified providers in your market.</span>}
              />
            ) : (
              <ul className="space-y-3">
                {requests.map(r => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    expanded={expandedId === r.id}
                    onToggle={() => toggleExpand(r.id)}
                    onCancel={() => handleCancel(r)}
                    onAccept={handleAccept}
                    quotes={quotesByReq[r.id]}
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

/* ── Local UI helpers ─────────────────────────────────────────── */

function Field({ label, icon: Icon, fullWidth = false, children }: {
  label: string; icon?: LucideIcon; fullWidth?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={fullWidth ? 'lg:col-span-2' : ''}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 inline-flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-slate-400" />}
        {label}
      </p>
      {children}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  open:      'bg-blue-50 text-blue-700',
  quoting:   'bg-amber-50 text-amber-700',
  accepted:  'bg-emerald-50 text-emerald-700',
  expired:   'bg-slate-100 text-slate-500',
  cancelled: 'bg-rose-50 text-rose-700',
};

function RequestCard({ request: r, expanded, onToggle, onCancel, onAccept, quotes }: {
  request:   QuoteRequestRow;
  expanded:  boolean;
  onToggle:  () => void;
  onCancel:  () => void;
  onAccept:  (q: ProviderQuoteRow) => void;
  quotes?:   ProviderQuoteRow[];
}) {
  const profile = findCountryProfile(r.country);
  const cat     = PROVIDER_CATEGORIES.find(c => c.slug === r.category);

  return (
    <li className="bg-white border border-slate-200 rounded-2xl">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span aria-hidden>{profile.flag}</span>
            <strong className="text-sm text-ink-900 truncate">
              {r.pickup_city || r.pickup_address.split(',')[0]} → {r.dropoff_city || r.dropoff_address.split(',')[0]}
            </strong>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${STATUS_TONE[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
              {r.status}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {cat?.name ?? r.category} · {r.move_date ? new Date(r.move_date).toLocaleDateString() : 'No date'}
          </p>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0 inline-flex items-center gap-1">
          {(quotes?.length ?? 0)} quote{(quotes?.length ?? 0) === 1 ? '' : 's'}
          <ArrowRight
            size={11}
            className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          {!quotes ? (
            <p className="text-xs text-slate-500 inline-flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Loading quotes…
            </p>
          ) : quotes.length === 0 ? (
            <p className="text-xs text-slate-500">
              No quotes yet — providers usually respond within 4–24 hours of submission.
            </p>
          ) : (
            <ul className="space-y-2">
              {quotes.map(q => (
                <li
                  key={q.id}
                  className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
                    q.status === 'accepted' ? 'bg-emerald-50 border-emerald-300' :
                    q.status === 'declined' ? 'bg-slate-50 border-slate-200 opacity-60' :
                                              'bg-surface-soft border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-ink-900">
                      {formatPrice(q.amount_total, r.country)}
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {Math.round(q.deposit_pct * 100)}% deposit
                      </span>
                    </p>
                    {q.note && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{q.note}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Valid until {new Date(q.valid_until).toLocaleString()}
                    </p>
                  </div>
                  {q.status === 'submitted' && r.status !== 'accepted' && r.status !== 'cancelled' ? (
                    <button
                      onClick={() => onAccept(q)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition flex-shrink-0"
                    >
                      <Check size={12} /> Accept
                    </button>
                  ) : q.status === 'accepted' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 flex-shrink-0">
                      <Check size={12} /> Accepted
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 flex-shrink-0 capitalize">{q.status}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {(r.status === 'open' || r.status === 'quoting') && (
            <button
              onClick={onCancel}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600"
            >
              <XIcon size={11} /> Cancel this request
            </button>
          )}
        </div>
      )}
    </li>
  );
}
