import { Star, Truck, ShieldCheck, Award, ArrowRight, Zap } from 'lucide-react';
import AddToCompareButton from './AddToCompareButton';
import AvailabilityBadge from './AvailabilityBadge';
import { useApp } from '../../lib/store';
import { PROVIDERS, type ProviderRecord } from '../../lib/providers-catalogue';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <TopProviders> — dispatch-style provider strip on the homepage +
 * country shopfronts.
 *
 * Today's data source: lib/providers-catalogue (curated TS records)
 * so the home grid + per-provider profile pages stay in sync —
 * one record edits both surfaces.
 *
 * ── TODO(supabase) ──────────────────────────────────────────────
 * The card design below is shaped to match what a future
 * `public.providers` view would return:
 *
 *   id, company_name (→ name), rating, completed_jobs (→ reviews),
 *   primary_corridor, instant_book, tier (→ badge),
 *   availability_status (→ availability), service_zip_codes,
 *   base_hourly_rate, from_price.
 *
 * Replacement is a one-call swap: replace the `PROVIDERS` import
 * with a useQuery({ queryKey: ['providers', ...] }) that calls
 * supabase.from('providers').select(...).order('tier desc, rating desc').
 *
 * Pickup-ZIP-based corridor filtering needs:
 *   1. lib/store.tsx to surface bookingData.pickupAddress as a ZIP
 *      (currently a structured USAddress).
 *   2. NorwayAddressAutocomplete to call setBookingData with a ZIP
 *      slice on every selection.
 *   3. service_zip_codes column on the providers view + a
 *      `.contains('service_zip_codes', [zip])` clause when set.
 *
 * Route-aware pricing (e.g. "From $642 · 10001 → 02108") needs
 * deliveryZip + a metro / season multiplier resolver. The
 * src/lib/pricing-engine module already has the multiplier tables;
 * exposing a price preview helper is the missing piece.
 *
 * Tracked separately so the visual upgrade can ship today.
 * ───────────────────────────────────────────────────────────────── */

/* Crude but transparent corridor picker — first sampleJob's route
 * is what the provider has actually moved before, so it doubles as
 * a "specializes in" line without needing a new schema column. */
function primaryCorridor(p: ProviderRecord): string {
  return p.sampleJobs?.[0]?.route ?? p.coverage ?? p.city;
}

/* Best-effort estimator — multiplies the catalogue's fromPrice
 * (parsed numerically) by a typical 2-mover × 4-hour relocation.
 * Replace with a lib/pricing-engine call once pickup + dropoff ZIPs
 * are in the store. */
function parseFromPriceMajor(s: string): number {
  const m = s.replace(/\s+/g, '').match(/(\d[\d.,]*)/);
  if (!m) return 0;
  return Number(m[1].replace(/[.,]/g, '')) || 0;
}

/* Map the catalogue's availability enum to a customer-facing line.
 * Matches the labels we'd surface from a future Supabase view's
 * availability_status column. */
function availabilityLabel(a: ProviderRecord['availability']): string {
  switch (a) {
    case 'available_now': return 'Available this week';
    case 'books_fast':    return 'Next-day availability';
    case 'slots_left':    return 'Limited slots this week';
    case 'busy':          return 'Joining waitlist';
    default:              return 'Available this week';
  }
}

const BADGE =
  'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md';

export default function TopProviders() {
  const { setPage, setBookingData } = useApp();

  function openProfile(slug: string) {
    track('top_provider_clicked', { slug });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/provider?slug=${slug}`);
    }
    setPage('provider-profile');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  /* "Book this mover" → primes the BookingFlow with the provider's
   *  flag-derived country + city as the pickup hint, then opens the
   *  funnel. Once the schema has a real provider_id we'll forward
   *  that too so the matching engine pre-favours the chosen mover. */
  function bookProvider(p: ProviderRecord) {
    track('top_provider_book_clicked', { slug: p.slug });
    setBookingData({
      country:        p.country,
      pickupAddress:  p.city,
    });
    setPage('booking');
  }

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
            Top-rated movers
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Available providers near you
          </h2>
          <p className="mt-3 text-slate-600">
            Licensed carriers with corridor experience and escrow protection on every booking.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROVIDERS.map(p => {
            const fromMajor   = parseFromPriceMajor(p.fromPrice);
            const corridor    = primaryCorridor(p);
            const availLabel  = availabilityLabel(p.availability);
            const isInstant   = p.availability === 'available_now';

            return (
              <article
                key={p.slug}
                className="group bg-[#fafaf7] hover:bg-white border border-slate-200 hover:border-amber-300 hover:shadow-xl rounded-2xl p-5 transition flex flex-col"
              >
                {/* HEADER — logo / name + instant book pill */}
                <div className="flex items-start justify-between mb-3 gap-3">
                  <button
                    type="button"
                    onClick={() => openProfile(p.slug)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center flex-shrink-0">
                      <Truck size={20} className="text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-900 leading-tight truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <span aria-hidden="true">{p.flag}</span>
                        {p.city}
                      </p>
                    </div>
                  </button>
                  {isInstant && (
                    <span className={`${BADGE} bg-emerald-100 text-emerald-700 flex-shrink-0`}>
                      <Zap size={10} />
                      Instant book
                    </span>
                  )}
                </div>

                {/* RATING */}
                <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
                  <Star size={15} className="fill-amber-400 text-amber-400" />
                  <strong className="text-slate-900">{p.rating.toFixed(2)}</strong>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-500">{p.reviews.toLocaleString()} jobs</span>
                  {p.availability && !isInstant && (
                    <AvailabilityBadge
                      availability={p.availability}
                      slotsLeft={p.slotsLeft}
                      size="sm"
                      className="ml-auto"
                    />
                  )}
                </div>

                {/* CORRIDOR SPECIALIZATION */}
                <div className="mb-3">
                  <p className="text-xs text-slate-400">Best corridor</p>
                  <p className="font-semibold text-slate-900 text-sm">{corridor}</p>
                </div>

                {/* PRICE PREVIEW — uses the catalogue's fromPrice for the
                 *   "From $X" line and a static crew/time hint for the
                 *   typical-job context line. The dynamic, route-aware
                 *   price needs pickup + delivery ZIPs in the store —
                 *   tracked in the TODO(supabase) block above. */}
                <div className="mb-3">
                  <p className="text-base font-extrabold text-amber-700">{p.fromPrice}</p>
                  <p className="text-xs text-slate-500">
                    2 movers · 1 truck · 4 hours typical
                    {fromMajor > 0 ? ` · est. ${fromMajor * 2}+ for full day` : ''}
                  </p>
                </div>

                {/* TRUST + TIER BADGES */}
                <div className="flex flex-wrap gap-1.5 mb-3 pt-3 border-t border-slate-200">
                  {p.badge && (
                    <span className={`${BADGE} bg-amber-400/15 text-amber-700`}>
                      <Award size={10} />
                      Tier · {p.badge}
                    </span>
                  )}
                  {p.verified.slice(0, 3).map(v => (
                    <span key={v} className={`${BADGE} bg-emerald-50 text-emerald-700`}>
                      <ShieldCheck size={10} />
                      {v}
                    </span>
                  ))}
                </div>

                {/* AVAILABILITY LABEL */}
                <p className="text-xs text-emerald-600 font-semibold mb-4">
                  {availLabel}
                </p>

                {/* PRIMARY CTA — book + secondary actions */}
                <button
                  type="button"
                  onClick={() => bookProvider(p)}
                  className="mt-auto w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-2.5 rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                >
                  Book this mover →
                </button>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openProfile(p.slug)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                  >
                    Open profile
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <AddToCompareButton
                    item={{
                      id:        p.slug,
                      name:      p.name,
                      city:      p.city,
                      flag:      p.flag,
                      rating:    p.rating,
                      reviews:   p.reviews,
                      fromPrice: p.fromPrice,
                      badge:     p.badge,
                      verified:  p.verified,
                    }}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
