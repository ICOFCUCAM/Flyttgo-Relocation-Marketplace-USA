import React from 'react';
import { Star, Truck, ShieldCheck, Award, ArrowRight } from 'lucide-react';
import AddToCompareButton from './AddToCompareButton';
import AvailabilityBadge from './AvailabilityBadge';
import { useApp } from '../../lib/store';
import { PROVIDERS } from '../../lib/providers-catalogue';
import { track } from '../../lib/analytics';

/**
 * "Top-rated providers" card row. Sources from lib/providers-catalogue
 * so the home grid + the per-provider profile pages stay in sync —
 * one record edits both surfaces.
 *
 * Each card now navigates to /provider?slug=<slug> on click; the
 * AddToCompare button still toggles the compare-store snapshot
 * without leaving the home page.
 */
export default function TopProviders() {
  const { setPage } = useApp();

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

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
            Top-rated providers worldwide
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Six countries. One trusted shortlist.
          </h2>
          <p className="mt-3 text-slate-600">
            Every provider is verified against its national operator-licence
            registry and ranked by completion rate, on-time record, and
            customer rating.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROVIDERS.map(p => (
            <article
              key={p.slug}
              className="group bg-[#fafaf7] hover:bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg rounded-2xl p-5 transition cursor-pointer"
              onClick={() => openProfile(p.slug)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <Truck size={20} className="text-amber-700" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span aria-hidden>{p.flag}</span>
                      {p.city}
                    </p>
                  </div>
                </div>
                {p.badge && (
                  <span className="inline-flex items-center gap-1 bg-amber-400/15 text-amber-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    <Award size={10} />
                    {p.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
                <Star size={15} className="fill-amber-400 text-amber-400" />
                <strong className="text-slate-900">{p.rating.toFixed(2)}</strong>
                <span className="text-slate-500">·</span>
                <span className="text-slate-500">{p.reviews.toLocaleString()} reviews</span>
                {p.availability && (
                  <AvailabilityBadge
                    availability={p.availability}
                    slotsLeft={p.slotsLeft}
                    size="sm"
                    className="ml-auto"
                  />
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">Booking from</span>
                <span className="font-extrabold text-amber-700">{p.fromPrice}</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-200">
                {p.verified.map(v => (
                  <span key={v} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    <ShieldCheck size={10} />
                    {v}
                  </span>
                ))}
              </div>

              <div
                className="mt-3 flex items-center justify-between gap-2"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => openProfile(p.slug)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-amber-700"
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
          ))}
        </div>
      </div>
    </section>
  );
}
