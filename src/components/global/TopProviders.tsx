import { useEffect, useState } from 'react';
import { Star, Truck, ShieldCheck, Award, ArrowRight, Zap, Flame } from 'lucide-react';
import AddToCompareButton from './AddToCompareButton';
import AvailabilityBadge from './AvailabilityBadge';
import { useApp } from '../../lib/store';
import { PROVIDERS, type ProviderRecord } from '../../lib/providers-catalogue';
import { track } from '../../lib/analytics';
import { estimateRoutePrice, formatRoutePrice, type RoutePriceResult } from '../../lib/route-price-estimator';
import { resolveRoute, kmToMiles, type ResolvedRoute } from '../../services/route-cache';
import type { PricingCountry } from '../../lib/pricing-engine';

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
 * Pickup-ZIP-based corridor filtering still needs a
 * service_zip_codes column on the providers view + a
 * `.contains('service_zip_codes', [zip])` clause when set.
 * BookingShortcut now writes pickup/dropoff coords + postcodes
 * to bookingData on every autocomplete selection so the strip
 * can react without forcing the customer through the funnel.
 *
 * Route-aware pricing IS now wired:
 *   - estimateRoutePrice (lib/route-price-estimator) applies
 *     country baseline × tier × metro surge × distance bucket
 *   - resolveRoute (services/route-cache) prefers a Supabase
 *     route_corridor_cache row, falls back to live OSRM, and
 *     tolerates the cache table not existing.
 *   - The OSRM call fires ONCE per route, shared across all
 *     provider cards.
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
  const { setPage, setBookingData, bookingData } = useApp();

  /* Resolve real driving distance ONCE per route, not once per
   * provider card. Every card on the strip shares the same OSRM
   * answer, fed in via `miles` to estimateRoutePrice. The hook
   * fires on coord OR ZIP changes — coords win when present, ZIPs
   * route through the corridor cache when applied. */
  const [route, setRoute] = useState<ResolvedRoute | null>(null);

  const pickupLat  = bookingData.pickupLat;
  const pickupLng  = bookingData.pickupLng;
  const dropoffLat = bookingData.dropoffLat;
  const dropoffLng = bookingData.dropoffLng;
  const pickupZip  = bookingData.pickupPostcode;
  const dropoffZip = bookingData.dropoffPostcode;

  useEffect(() => {
    let cancelled = false;
    const hasCoords = pickupLat != null && pickupLng != null
                   && dropoffLat != null && dropoffLng != null;
    const hasZips   = Boolean(pickupZip && dropoffZip);

    if (!hasCoords && !hasZips) {
      setRoute(null);
      return undefined;
    }

    void (async () => {
      const resolved = await resolveRoute({
        from:    hasCoords ? { lat: pickupLat!,  lng: pickupLng!  } : null,
        to:      hasCoords ? { lat: dropoffLat!, lng: dropoffLng! } : null,
        fromZip: pickupZip,
        toZip:   dropoffZip,
      });
      if (!cancelled) setRoute(resolved);
    })();

    return () => { cancelled = true; };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, pickupZip, dropoffZip]);

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
          {route && (
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <span>
                Route resolved · {Math.round(route.distanceKm)} km
                {route.durationMinutes > 0 ? ` · ${Math.floor(route.durationMinutes / 60)}h ${route.durationMinutes % 60}m` : ''}
              </span>
              <span className="uppercase tracking-wider text-[10px] text-emerald-600">{route.source}</span>
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROVIDERS.map(p => {
            const fromMajor   = parseFromPriceMajor(p.fromPrice);
            const corridor    = primaryCorridor(p);
            const availLabel  = availabilityLabel(p.availability);
            const isInstant   = p.availability === 'available_now';

            /* Dynamic price preview — real OSRM miles when we have
             * coords, ZIP-prefix bucket when we don't, baseline
             * day-rate when we have neither. estimateRoutePrice
             * never throws so this is render-safe. */
            const miles: number | null = route ? Math.round(kmToMiles(route.distanceKm)) : null;
            const dynamic: RoutePriceResult = estimateRoutePrice({
              miles,
              fromZip: pickupZip,
              toZip:   dropoffZip,
              country: p.country as PricingCountry,
              tier:    p.badge,
            });
            const showDynamic = dynamic.source === 'route';

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

                {/* PRICE PREVIEW — when both pickup + drop-off resolve
                 *  to coords or ZIPs the customer sees the route-aware
                 *  number (OSRM distance × tier × metro surge). With no
                 *  route data we fall back to the catalogue's "from"
                 *  rate so the card always renders a price. */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-base font-extrabold text-amber-700">
                      {showDynamic ? formatRoutePrice(dynamic) : p.fromPrice}
                    </p>
                    {dynamic.surgeApplied && (
                      <span className={`${BADGE} bg-rose-50 text-rose-700`}>
                        <Flame size={10} />
                        {dynamic.metroCode ?? 'Surge'} demand
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {showDynamic
                      ? `2 movers · 1 truck · ~${dynamic.hours}h${dynamic.miles != null ? ` · ${dynamic.miles} mi` : ''}`
                      : (
                        <>
                          2 movers · 1 truck · 4 hours typical
                          {fromMajor > 0 ? ` · est. ${fromMajor * 2}+ for full day` : ''}
                        </>
                      )}
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
