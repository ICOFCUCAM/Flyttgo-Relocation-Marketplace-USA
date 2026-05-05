import { useEffect, useState } from 'react';
import { Banknote, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { FOCUS_RING } from '../ds';
import {
  getStripeConnectStatus,
  startStripeConnectOnboarding,
  type StripeConnectStatus,
} from '../../services/stripeConnect';

/**
 * Self-serve payouts onboarding card for the driver portal.
 *
 * State machine (driven by the stripe_connect_accounts row, refreshed
 * by the `account.updated` webhook):
 *
 *   not-started  →  details_submitted=false                       → "Set up payouts"
 *   in-progress  →  details_submitted=true, requirements_due!=[]  → "Resume verification"
 *   restricted   →  charges_enabled=false                          → "Action needed"
 *   active       →  payouts_enabled=true                           → "Payouts active"
 *
 * The CTA always calls the edge function which returns a fresh
 * AccountLink URL (Stripe-hosted) and we redirect the browser to it.
 */
export default function StripeConnectCard({ userId }: { userId: string }) {
  const [status,  setStatus]  = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStripeConnectStatus(userId)
      .then(s => { if (!cancelled) setStatus(s); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); });
    return () => { cancelled = true; };
  }, [userId]);

  /* When Stripe redirects back with ?stripe-connect=return, refresh
   * the status — the webhook may have already fired by then. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('stripe-connect');
    if (flag === 'return' || flag === 'refresh') {
      void getStripeConnectStatus(userId).then(setStatus);
      params.delete('stripe-connect');
      const cleanQuery = params.toString();
      const newPath    = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '');
      window.history.replaceState({}, '', newPath);
    }
    return undefined;
  }, [userId]);

  async function startOnboarding() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await startStripeConnectOnboarding();
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Stripe onboarding');
      setLoading(false);
    }
  }

  if (!status) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-3 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading payout setup…
      </div>
    );
  }

  const phase: 'active' | 'in-progress' | 'restricted' | 'not-started' =
    status.payoutsEnabled                         ? 'active' :
    !status.chargesEnabled && status.hasAccount   ? 'restricted' :
    status.detailsSubmitted                       ? 'in-progress' :
                                                    'not-started';

  const tone = {
    active:        'border-emerald-200 bg-emerald-50/40',
    'in-progress': 'border-amber-200 bg-amber-50/40',
    restricted:    'border-red-200 bg-red-50/40',
    'not-started': 'border-slate-200 bg-white',
  }[phase];

  const headline = {
    active:        'Payouts active',
    'in-progress': 'Verification in progress',
    restricted:    'Action needed',
    'not-started': 'Set up self-serve payouts',
  }[phase];

  const sub = {
    active:        'Stripe-verified bank account on file. Earnings settle to your bank automatically after each completed booking.',
    'in-progress': 'Stripe is reviewing your details. Resume the form to add anything they still need.',
    restricted:    'Stripe needs additional information before payouts can resume.',
    'not-started': 'Add your bank in 60 seconds via Stripe. Replaces the manual admin-approves-bank-details path — no email back-and-forth.',
  }[phase];

  const ctaLabel = {
    active:        'Update bank details',
    'in-progress': 'Resume verification',
    restricted:    'Fix outstanding items',
    'not-started': 'Set up payouts',
  }[phase];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          phase === 'active' ? 'bg-emerald-100 text-emerald-600' :
          phase === 'restricted' ? 'bg-red-100 text-red-600' :
                                    'bg-amber-100 text-amber-600'
        }`}>
          {phase === 'active' ? <ShieldCheck className="w-5 h-5" /> :
           phase === 'restricted' ? <AlertCircle className="w-5 h-5" /> :
                                     <Banknote className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900">{headline}</p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{sub}</p>

          {status.requirementsDue.length > 0 && (
            <div className="mt-3 text-xs">
              <p className="font-semibold text-slate-700 mb-1">Outstanding:</p>
              <ul className="text-slate-500 space-y-0.5 list-disc pl-4">
                {status.requirementsDue.slice(0, 5).map(r => (
                  <li key={r}>{r.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-xs mt-2 mb-2">{error}</p>
      )}

      <button
        onClick={startOnboarding}
        disabled={loading}
        className={`mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-60 ${
          phase === 'active'
            ? 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
            : phase === 'restricted'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-[#0B2E59] hover:bg-[#0F3558] text-white'
        } ${FOCUS_RING}`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        {loading ? 'Opening Stripe…' : ctaLabel}
      </button>
    </div>
  );
}
