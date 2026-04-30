import { ArrowRight } from 'lucide-react';
import { useApp } from '../../lib/store';
import { SERVICE_CATEGORIES } from '../../lib/service-categories';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <CategoryPreviewsRow> — featured category landing pages on home
 *
 * The high-level "What you can book" tile grid is decorative —
 * it routes everyone into the booking flow regardless of category.
 * This row is the deeper layer: each card is a real category
 * landing page at /services/<slug> with category-specific
 * provider filters, pricing tier, and a how-it-works tuned to
 * that service.
 *
 * Surfaces 4 of the 9 categories on the home page (the rest are
 * one click away on the /services index): the highest-intent
 * categories — long-distance, office relocation, international,
 * and student moves. Each card shows the tagline + FAQ count to
 * signal the page has substance, not just a marketing blurb.
 * ───────────────────────────────────────────────────────────────── */

const FEATURED_SLUGS = ['long-distance', 'international', 'office', 'student'];

export default function CategoryPreviewsRow() {
  const { setPage } = useApp();

  /* Derive featured cards from the canonical SERVICE_CATEGORIES
   * source — when slugs change in service-categories.ts the row
   * stays in sync. Filter then preserve declaration order. */
  const featured = FEATURED_SLUGS
    .map(slug => SERVICE_CATEGORIES.find(c => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  function openCategory(slug: string) {
    track('home_category_preview_clicked', { slug });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/services/${slug}`);
    }
    setPage('service-category');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  return (
    <section className="bg-white py-16 sm:py-20" aria-label="Featured category landing pages">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
              Category landing pages
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Each move type is its own marketplace.
            </h2>
            <p className="mt-3 text-slate-600 max-w-2xl">
              Filtered providers, category-specific pricing, and a how-it-works
              tuned to the service. Open the page to see live availability.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map(c => (
            <button
              key={c.slug}
              type="button"
              onClick={() => openCategory(c.slug)}
              className="group text-left bg-[#fafaf7] hover:bg-white border border-slate-200 hover:border-amber-300 hover:shadow-xl rounded-2xl p-5 transition flex flex-col"
            >
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                  /services/{c.slug}
                </p>
                <h3 className="mt-2 text-lg font-extrabold text-slate-900 leading-snug">
                  {c.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                  {c.tagline}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">
                  {c.howItWorks.length} steps · {c.faq.length} FAQs
                </span>
                <span className="inline-flex items-center gap-1 text-amber-700 group-hover:translate-x-0.5 transition-transform">
                  Open
                  <ArrowRight size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
