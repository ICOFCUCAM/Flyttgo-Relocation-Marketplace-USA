import { Clock, X, Star, ArrowRight, Truck } from 'lucide-react';
import { useApp } from '../../lib/store';
import {
  useRecentlyViewedStore, removeRecentlyViewed, clearRecentlyViewed,
} from '../../lib/recently-viewed-store';
import { track } from '../../lib/analytics';
import { Container, Eyebrow } from '../ds';

/* ─────────────────────────────────────────────────────────────────
 * <RecentlyViewedRail> — horizontal "Pick up where you left off"
 * scroller. Reads the recently-viewed-store; renders nothing if the
 * customer hasn't opened any profiles yet, so it's safe to drop in
 * unconditionally on the home page + directory page.
 *
 * Each card is dismissible; the whole rail has a "Clear all" link
 * (small, in the eyebrow row) for customers who don't want a
 * browsing trail showing.
 * ───────────────────────────────────────────────────────────────── */

export default function RecentlyViewedRail() {
  const items = useRecentlyViewedStore();
  const { setPage } = useApp();

  if (items.length === 0) return null;

  function open(slug: string) {
    track('recently_viewed_clicked', { slug });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/provider?slug=${slug}`);
    }
    setPage('provider-profile');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  return (
    <section className="bg-surface-soft py-10 sm:py-12 border-y border-slate-200">
      <Container>
        <div className="flex items-end justify-between mb-4 gap-3">
          <div>
            <Eyebrow tone="brand" className="mb-1">
              <Clock size={11} className="inline -mt-0.5 mr-1" />
              Recently viewed
            </Eyebrow>
            <h2 className="text-lg sm:text-xl font-extrabold text-ink-900">
              Pick up where you left off
            </h2>
          </div>
          <button
            onClick={() => { clearRecentlyViewed(); track('recently_viewed_cleared'); }}
            className="text-xs text-slate-500 hover:text-danger-600 underline underline-offset-2 flex-shrink-0"
          >
            Clear all
          </button>
        </div>

        <ul
          className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
          aria-label="Recently viewed providers"
        >
          {items.map(p => (
            <li
              key={p.slug}
              className="snap-start flex-shrink-0 w-[280px] bg-white border border-slate-200 hover:border-brand-400/60 hover:shadow-medium rounded-2xl p-4 transition-base ease-marketplace relative group"
            >
              <button
                type="button"
                aria-label={`Remove ${p.name} from recently viewed`}
                onClick={(e) => { e.stopPropagation(); removeRecentlyViewed(p.slug); }}
                className="absolute top-2 right-2 p-1 rounded text-slate-300 hover:text-danger-600 hover:bg-danger-50 opacity-0 group-hover:opacity-100 transition"
              >
                <X size={14} />
              </button>

              <button
                type="button"
                onClick={() => open(p.slug)}
                className="text-left w-full"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-50 to-amber-200 flex items-center justify-center flex-shrink-0">
                    <Truck size={16} className="text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-ink-900 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <span aria-hidden>{p.flag}</span>
                      {p.city}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <strong className="text-ink-900">{p.rating.toFixed(2)}</strong>
                  <span className="text-slate-400">·</span>
                  <span>{p.reviews.toLocaleString()} reviews</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">From</span>
                  <span className="text-sm font-extrabold text-brand-700">{p.fromPrice}</span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 group-hover:text-brand-700">
                  Resume profile
                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
