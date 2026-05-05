import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { INPUT_FOCUS } from './ds';
import { SUBSCRIPTION_PLANS, calculateCommission, COMMISSION } from '../lib/constants';
import { useApp } from '../lib/store';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import MarketplaceBanner from './banners/MarketplaceBanner';
import {
  findTier, localPriceForTier, PRIVILEGE_LABELS,
  type SubscriptionTierSlug,
} from '../lib/subscription-tiers';
import { COUNTRY_PROFILES } from '../lib/country-profiles';
import {
  checkCipEligibilityFull, CIP_THRESHOLDS,
  type DocumentStatus, type CipDocumentSlug,
} from '../lib/cip-eligibility';
import { loadProviderScore } from '../lib/provider-scoring-store';
import type { PricingCountry } from '../lib/pricing-engine';
import { getCountryFromRoute }   from '../lib/location/getCountryFromRoute';
import { getCountryFromBrowser } from '../lib/location/getCountryFromBrowser';

/** The application states we care about for gating. 'approved' → plans
 *  are actionable. Anything else → we redirect or warn. */
type ApplicationGate =
  | 'loading'       // waiting for the application row to load
  | 'not-applied'   // no row — user needs to apply first
  | 'pending'       // application under review
  | 'rejected'      // rejected, needs re-upload
  | 'approved';     // ready to subscribe

/* Map the existing driver_documents.document_type values to the
 * four canonical CIP document slugs the eligibility check expects.
 * We're flexible on naming because the underlying table predates
 * the CIP requirements layer. */
function mapDocTypeToCipSlug(raw: string | null | undefined): CipDocumentSlug | null {
  const v = (raw ?? '').toLowerCase().replace(/[\s-]/g, '_');
  if (v.includes('insurance'))                                return 'insurance';
  if (v.includes('vehicle_compliance') || v.includes('vehicle_registration')
                                       || v.includes('mot')) return 'vehicle_compliance';
  if (v.includes('tax')           || v.includes('vat')
                                  || v.includes('siret'))    return 'tax_registration';
  if (v.includes('company')       || v.includes('business')
                                  || v.includes('registration')
                                  || v.includes('gewerbe')
                                  || v.includes('cac'))      return 'company_registration';
  return null;
}

export default function SubscriptionPlans() {
  const { t } = useTranslation();
  const { setShowAuthModal, setAuthMode, setPage, bookingData } = useApp();
  const { user, profile } = useAuth();
  const [examplePrice, setExamplePrice] = useState(1000);
  /* Country picker for the country-multiplier pricing engine.
   * Resolved on first render from the chain:
   *   1. bookingData.country  (set when the user clicks through
   *                            from a country shopfront / hero
   *                            country selector)
   *   2. URL pathname          (e.g. /us, /canada, /uk)
   *   3. Browser locale region (Intl + navigator.languages)
   *   4. 'us' fallback
   * Same chain the booking flow uses — no surprise jumps when a
   * customer who landed on /uk goes from "Apply" → "Subscribe". */
  const [country, setCountry] = useState<PricingCountry>(() => (
    (bookingData.country as PricingCountry | undefined)
      ?? (getCountryFromRoute() as PricingCountry | null)
      ?? (getCountryFromBrowser() as PricingCountry | null)
      ?? 'us'
  ));
  /* CIP eligibility — fetched for signed-in approved providers so
   * the gating panel reads the real numbers from provider_reputation
   * + the document statuses from driver_documents. */
  const [cipEligibility, setCipEligibility] = useState<ReturnType<typeof checkCipEligibilityFull> | null>(null);

  useEffect(() => {
    if (!user?.id) { setCipEligibility(null); return undefined; }
    let cancelled = false;

    async function loadEligibility() {
      const score = await loadProviderScore(user!.id);

      /* Pull the latest status per CIP-required document type from
       * driver_documents. The table stores raw strings — we map
       * them to our four canonical CIP slugs. Missing rows imply
       * the doc hasn't been uploaded. */
      const { data: docRows } = await supabase
        .from('driver_documents')
        .select('document_type, verification_status')
        .eq('driver_id', user!.id);

      const docMap = new Map<CipDocumentSlug, DocumentStatus['status']>();
      for (const r of (docRows ?? [])) {
        const slug = mapDocTypeToCipSlug(r.document_type);
        if (!slug) continue;
        const status: DocumentStatus['status'] =
          r.verification_status === 'approved' ? 'approved' :
          r.verification_status === 'rejected' ? 'rejected' :
                                                  'pending';
        /* Approved beats pending; pending beats missing. */
        const prev = docMap.get(slug);
        if (prev === 'approved') continue;
        docMap.set(slug, status);
      }
      const documents: DocumentStatus[] = Array.from(docMap.entries()).map(([slug, status]) => ({ slug, status }));
      if (!cancelled) setCipEligibility(checkCipEligibilityFull(score, documents));
    }

    void loadEligibility().catch(() => { if (!cancelled) setCipEligibility(null); });
    return () => { cancelled = true; };
  }, [user?.id]);

  /* Gate state — reflects whether this signed-in user is actually
   * allowed to click Subscribe. Admins and signed-out visitors skip
   * the gate entirely (signed-out gets the auth modal, admins get
   * unrestricted browse access so they can preview the plans). */
  const [gate, setGate] = useState<ApplicationGate>('loading');

  useEffect(() => {
    /* Signed-out visitors can browse plans freely — we still want
     * marketing value for them. They hit the gate only when they
     * click Subscribe, which opens the driver-signup auth modal. */
    if (!user) { setGate('loading'); return undefined; }

    /* Admins always see the unrestricted UI (they shouldn't be
     * subscribing anyway, but we don't block them from looking). */
    if (profile?.role === 'admin') { setGate('approved'); return undefined; }

    /* Existing drivers who already have an approved application get
     * straight through — no need to re-check on every mount. Fall
     * through to the query for the definitive source of truth if
     * the role somehow isn't set yet. */
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('driver_applications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return undefined;

      /* On error (network, RLS denial, etc.) fail open to the
       * not-applied branch so the user sees an actionable CTA
       * instead of an indefinite spinner. The button will route
       * them to /become-a-driver where they can retry. */
      if (error) {
        console.error('[SubscriptionPlans] gate query failed:', error);
        setGate('not-applied');
        return undefined;
      }

      if (!data)                       setGate('not-applied');
      else if (data.status === 'approved') setGate('approved');
      else if (data.status === 'rejected') setGate('rejected');
      else                                  setGate('pending');
    })();

    return () => { cancelled = true; };
  }, [user?.id, profile?.role]);

  /** Single place that decides what happens when a user clicks any
   *  Subscribe button. Branch on the gate state and route them to
   *  the right next step. */
  function handleSubscribeClick() {
    /* Signed-out: open the driver-signup modal (existing behaviour). */
    if (!user) {
      setAuthMode('driver-signup');
      setShowAuthModal(true);
      return undefined;
    }

    switch (gate) {
      case 'not-applied':
        setPage('driver-onboarding');
        return undefined;
      case 'pending':
      case 'rejected':
        setPage('driver-application-status');
        return undefined;
      case 'approved':
        /* Approved drivers: fall through to the existing in-portal
         * subscribe flow. DriverPortal's subscription tab is the
         * real purchase surface (it builds the Stripe / Apple Pay
         * checkout session with proration etc.). */
        setPage('driver-portal');
        return undefined;
      case 'loading':
      default:
        /* Still waiting on the gate query — do nothing, the button
         * will re-render once the gate resolves. */
        return undefined;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MarketplaceBanner
        variant="inverse"
        eyebrow={t('driverSubscriptions.eyebrow')}
        breadcrumb={{ id: 'GLRM.05', label: t('driverSubscriptions.breadcrumb') }}
        headline={<>{t('driverSubscriptions.headline')}</>}
        lead={t('driverSubscriptions.lead')}
        compliancePills={[
          { label: 'Escrow-protected payouts' },
          { label: 'Country-licensed dispatch' },
          { label: 'Verified provider tier' },
        ]}
        aside={
          <div className="bg-white/5 border border-white/15 backdrop-blur rounded-2xl p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300 mb-2">{t('driverSubscriptions.market')}</p>
            <select
              value={country}
              onChange={e => setCountry(e.target.value as PricingCountry)}
              className={`w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-bold ${INPUT_FOCUS}`}
            >
              {COUNTRY_PROFILES.map(p => (
                <option key={p.code} value={p.code} className="text-slate-900">
                  {p.flag} {p.name}
                </option>
              ))}
            </select>
            <p className="mt-3 text-xs text-white/60 leading-relaxed">
              Tier rates render in {country.toUpperCase()} local currency below.
              Switch markets at any time — your subscription does not migrate.
            </p>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Eligibility banner — only rendered for signed-in users
         * who aren't yet approved. Browsers / admins don't see it. */}
        {user && profile?.role !== 'admin' && gate !== 'approved' && gate !== 'loading' && (
          <div className={`rounded-2xl border p-5 mb-8 flex items-start gap-4 ${
            gate === 'not-applied' ? 'bg-blue-50 border-blue-200' :
            gate === 'pending'     ? 'bg-yellow-50 border-yellow-200' :
                                      'bg-red-50 border-red-200'
          }`}>
            <span className="text-2xl flex-shrink-0">
              {gate === 'not-applied' ? '📋' : gate === 'pending' ? '⏳' : '❌'}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${
                gate === 'not-applied' ? 'text-blue-900' :
                gate === 'pending'     ? 'text-yellow-900' :
                                          'text-red-900'
              }`}>
                {gate === 'not-applied' && 'Apply to become a driver first'}
                {gate === 'pending'     && 'Your driver application is under review'}
                {gate === 'rejected'    && 'Your driver application was not approved'}
              </p>
              <p className={`text-xs mt-1 ${
                gate === 'not-applied' ? 'text-blue-700' :
                gate === 'pending'     ? 'text-yellow-700' :
                                          'text-red-700'
              }`}>
                {gate === 'not-applied' && 'Subscription plans are only available to approved drivers. Start your application — it takes about 5 minutes.'}
                {gate === 'pending'     && 'We usually review applications within 24 hours. You can subscribe as soon as you\u2019re approved.'}
                {gate === 'rejected'    && 'Check the review notes on your application status page and re-upload updated documents.'}
              </p>
              <button
                onClick={handleSubscribeClick}
                className={`mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  gate === 'not-applied' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                  gate === 'pending'     ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                                            'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {gate === 'not-applied' && 'Start driver application →'}
                {gate === 'pending'     && 'View application status →'}
                {gate === 'rejected'    && 'View review notes →'}
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 mb-16">
          {SUBSCRIPTION_PLANS.map(plan => {
            /* Resolve display + privileges from the canonical tier
             * catalogue. The legacy `plan` keeps its db-stable id
             * (silver / silver_plus / gold / gold_pro / elite); the
             * tier provides display names + locale-aware pricing
             * + privilege list. */
            const tier         = findTier(plan.id as SubscriptionTierSlug);
            const localPrice   = localPriceForTier(tier, country);
            const isCip        = tier.slug === 'elite';
            return (
            <div key={plan.id} className={`bg-white rounded-2xl border-2 p-6 relative flex flex-col ${
              isCip      ? 'border-amber-500 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-300/40' :
              plan.popular ? 'border-amber-500 shadow-xl shadow-amber-500/10' : 'border-gray-100'
            }`}>
              {isCip && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ink-900 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Institutional · Procurement-ready
                </div>
              )}
              {plan.popular && !isCip && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs font-bold px-4 py-1 rounded-full">{t('driverSubscriptions.mostPopular')}</div>
              )}
              <h3 className="text-xl font-bold text-gray-900 leading-tight mb-1">{tier.displayName}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4 min-h-[2rem]">{tier.tagline}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{localPrice.formatted}</span>
                {!localPrice.isFree && (
                  <span className="text-gray-500 text-sm">{localPrice.cadenceLabel}</span>
                )}
              </div>
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  isCip ? 'bg-ink-900 text-amber-300' :
                  plan.priorityLevel >= 4 ? 'bg-purple-100 text-purple-700' :
                  plan.priorityLevel >= 3 ? 'bg-amber-100 text-amber-700' :
                  plan.priorityLevel >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {Math.round(tier.commissionPct * 100)}% commission · {tier.privileges.includes('first-access-jobs')
                    ? 'first-access' : tier.privileges.includes('priority-dispatch')
                    ? 'priority' : tier.privileges.includes('high-dispatch')
                    ? 'high' : tier.privileges.includes('moderate-dispatch')
                    ? 'moderate' : 'standard'} dispatch
                </span>
              </div>
              <ul className="space-y-2 mb-4 flex-1">
                {tier.privileges.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    <span className="text-gray-600">{PRIVILEGE_LABELS[p]}</span>
                  </li>
                ))}
              </ul>

              {/* Cash-booking economics. Drivers see the commission they
                  pay on cash bookings (deposit released by admin under
                  release_escrow_manually) at their plan tier. */}
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                  Cash-booking economics
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Customer pays a <strong>{Math.round(COMMISSION.cashDeposit * 100)}% deposit</strong> online + the
                  rest in cash to you on delivery.{' '}
                  <strong>{plan.commissionRate}%</strong> platform commission applies to your
                  net earning when escrow is released.
                </p>
              </div>
              <button
                onClick={handleSubscribeClick}
                disabled={gate === 'loading'}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular ? 'bg-amber-600 text-white hover:bg-amber-700'
                               : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {gate === 'loading' && user ? t('driverSubscriptions.ctaChecking') :
                 gate === 'not-applied'     ? t('driverSubscriptions.ctaApplyFirst') :
                 gate === 'pending'         ? t('driverSubscriptions.ctaUnderReview') :
                 gate === 'rejected'        ? t('driverSubscriptions.ctaResubmit') :
                 plan.price === 0           ? t('driverSubscriptions.ctaGetStarted') :
                                               t('driverSubscriptions.ctaSubscribe')}
              </button>
            </div>
            );
          })}
        </div>

        {/* CIP eligibility panel — only for signed-in approved
            providers. Shows current rating / completion / on-time /
            verification vs the CIP thresholds with explicit blockers. */}
        {user && profile?.role !== 'admin' && cipEligibility && (
          <div className={`rounded-2xl border-2 p-6 mb-12 ${
            cipEligibility.qualifies
              ? 'bg-amber-50 border-amber-400'
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                  Certified Infrastructure Partner
                </p>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {cipEligibility.qualifies
                    ? "You qualify."
                    : "Eligibility check"}
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Min rating {CIP_THRESHOLDS.minRating} · {CIP_THRESHOLDS.minCompletedJobs}+ rated jobs ·{' '}
                {Math.round(CIP_THRESHOLDS.minOnTimeRate * 100)}% on-time · verification level 4
              </p>
            </div>
            {cipEligibility.qualifies ? (
              <p className="text-sm text-slate-700 leading-relaxed">
                You meet every requirement for the Certified Infrastructure
                Partner tier — institutional gateway with corporate, university,
                and government deployment routing. Subscribe above to activate.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {cipEligibility.blockers.map(b => (
                  <li key={b.field} className="flex items-baseline justify-between text-xs gap-2">
                    <span className="text-slate-700 capitalize">{b.field}</span>
                    <span className="text-slate-500">
                      {b.current} <span className="text-slate-400">→ {b.required}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Earnings Comparison */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Earnings Comparison</h2>
          <p className="text-gray-600 mb-6">See how much you earn per job with each plan</p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Example Job Value</label>
            <div className="flex items-center gap-4">
              <input type="range" min={300} max={10000} step={100} value={examplePrice} onChange={e => setExamplePrice(Number(e.target.value))} className="flex-1 accent-amber-600"/>
              <span className="text-xl font-bold text-amber-600 w-32 text-right">{examplePrice} USD</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Plan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Commission Rate</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Commission Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Driver Earnings</th>
                </tr>
              </thead>
              <tbody>
                {SUBSCRIPTION_PLANS.map(plan => {
                  const calc = calculateCommission(examplePrice, plan.id);
                  return (
                    <tr key={plan.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{plan.name}</td>
                      <td className="py-3 px-4">
                        {calc.rate === -1 ? <span className="text-red-500 font-medium">Job Hidden</span> : <span className="text-gray-600">{Number(calc.rate ?? 0)}%</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {calc.rate === -1 ? '—' : `${Number(calc.commission ?? 0).toFixed(0)} USD`}
                      </td>
                      <td className="py-3 px-4">
                        {calc.rate === -1 ? <span className="text-gray-400">—</span> : <span className="font-bold text-amber-600">{Number(calc.earning ?? 0).toFixed(0)} USD</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority system */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Dispatch Priority System</h2>
          <div className="space-y-3">
            {[...SUBSCRIPTION_PLANS].reverse().map(plan => (
              <div key={plan.id} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-700">{plan.name}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    plan.priorityLevel >= 5 ? 'bg-amber-500' :
                    plan.priorityLevel >= 4 ? 'bg-purple-500' :
                    plan.priorityLevel >= 3 ? 'bg-amber-500' :
                    plan.priorityLevel >= 2 ? 'bg-blue-500' : 'bg-gray-400'
                  }`} style={{ width: `${plan.priorityLevel * 20}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-500 w-20">{plan.dispatchPriority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
