import { Star, MapPin, ArrowRight, Search } from 'lucide-react';
import { FOCUS_RING } from '../ds';
import { useApp } from '../../lib/store';
import { DISCOVERY_PROVIDERS, type DiscoveryProvider } from '../../lib/discovery-providers';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <DiscoveryProvidersSection>
 *
 * The "exploration" tier of the homepage provider stack. These are
 * regional movers we've identified as marketplace candidates but
 * who haven't completed onboarding — i.e. they aren't bookable.
 *
 * Two jobs:
 *
 *   1. Customer signal — show real geographic coverage so the
 *      marketplace doesn't read as empty in markets where
 *      onboarded providers are still scarce.
 *
 *   2. Provider acquisition — every card carries a
 *      "Not yet onboarded · Instant booking available once provider
 *      joins" badge plus an "Are you {Provider}? Claim & onboard"
 *      CTA that routes into the provider funnel. The customer-
 *      facing surface becomes a lead-generation channel.
 *
 * Strict legal posture: cards are clearly labelled non-bookable, no
 * price affordance, no "Book this mover" button. The CTA only
 * routes a discovery candidate (or someone claiming to represent
 * one) into the onboarding flow.
 * ───────────────────────────────────────────────────────────────── */

const BADGE =
  'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md';

interface Props {
  /** Limit the rendered count. Default: 6 — fits a 3×2 grid on desktop. */
  limit?: number;
}

export default function DiscoveryProvidersSection({ limit = 6 }: Props) {
  const { setPage, bookingData } = useApp();

  /* If a customer arrived from a country shopfront the bookingData
   * carries a country hint; we surface that country's discovery
   * candidates first so the section reads as locally relevant. */
  const preferredCountry = bookingData.country;
  const ordered = preferredCountry
    ? [
        ...DISCOVERY_PROVIDERS.filter(p => p.country === preferredCountry),
        ...DISCOVERY_PROVIDERS.filter(p => p.country !== preferredCountry),
      ]
    : DISCOVERY_PROVIDERS;

  const visible = ordered.slice(0, limit);

  function claimListing(p: DiscoveryProvider) {
    track('discovery_provider_claim_clicked', { slug: p.slug, country: p.country });
    setPage('driver-onboarding');
  }

  function openCorridor(p: DiscoveryProvider) {
    if (!p.corridor) return;
    track('discovery_provider_corridor_clicked', { slug: p.slug, corridor: p.corridor });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/corridor/${p.country === 'gb' ? 'uk' : p.country}/${p.corridor}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  return (
    <section className="bg-white py-16 sm:py-20" aria-label="Discovery providers">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div className="max-w-2xl">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-[0.18em] mb-2">
              Discovery — exploration tier
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Example licensed movers in your region
            </h2>
            <p className="mt-3 text-slate-600">
              Regional companies we&apos;ve identified as marketplace candidates.
              They aren&apos;t bookable on FlyttGo today — these listings exist so
              providers can claim and join the marketplace.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Search size={18} className="text-amber-700 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-snug max-w-[18rem]">
              <strong>Not bookable.</strong> Cards below are public-listing
              signals only; instant booking lights up once a provider
              completes onboarding.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map(p => (
            <article
              key={p.slug}
              className="bg-[#fafaf7] border border-slate-200 rounded-2xl p-5 flex flex-col"
            >
              {/* HEADER */}
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-slate-900 leading-tight truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <span aria-hidden="true">{p.flag}</span>
                    <MapPin size={11} className="text-slate-400" />
                    {p.city}
                  </p>
                </div>
                <span className={`${BADGE} bg-slate-200 text-slate-700 flex-shrink-0`}>
                  Discovery
                </span>
              </div>

              {/* PUBLIC RATING SIGNAL */}
              {p.estRating !== undefined && (
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <Star size={14} className="fill-slate-400 text-slate-400" />
                  <span className="text-slate-700 font-semibold">
                    ~{p.estRating.toFixed(1)}
                  </span>
                  {p.estReviews !== undefined && (
                    <span className="text-slate-500 text-xs">
                      · est. {p.estReviews.toLocaleString()} {p.source} reviews
                    </span>
                  )}
                </div>
              )}

              {/* TAGLINE */}
              <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                {p.tagline}
              </p>

              {/* ONBOARDING BADGE — required by the policy in
               *   discovery-providers.ts. Cannot be removed without a
               *   review pass. */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                <p className="text-[11px] font-bold text-amber-800 leading-snug">
                  Not yet onboarded to FlyttGo
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5 leading-snug">
                  Instant booking available once provider joins
                </p>
              </div>

              {/* PRIMARY CTA — provider acquisition magnet */}
              <button
                type="button"
                onClick={() => claimListing(p)}
                className={`w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs transition ${FOCUS_RING}`}
              >
                Are you {p.name.split(' ')[0]}? Claim & onboard
                <ArrowRight size={12} />
              </button>

              {/* Optional corridor link — surfaces the matching SEO
               *   landing page so a customer who landed here looking
               *   for that corridor can pivot. */}
              {p.corridor && (
                <button
                  type="button"
                  onClick={() => openCorridor(p)}
                  className="mt-2 inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-amber-700 transition"
                >
                  See verified providers on this corridor
                  <ArrowRight size={11} />
                </button>
              )}
            </article>
          ))}
        </div>

        {/* Provider acquisition footer — invites bulk outreach. */}
        <div className="mt-10 bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 mb-2">
              For providers
            </p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug mb-2">
              Run a regional mover not yet listed?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Apply once and your company is dispatched to corridor-aware
              quotes across the marketplace. Approval typically clears in
              24–48 hours after document upload.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { track('discovery_section_apply_clicked'); setPage('driver-onboarding'); }}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 px-5 py-3 rounded-xl font-bold transition shadow-lg shadow-amber-500/30 flex-shrink-0"
          >
            Apply as a provider
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
