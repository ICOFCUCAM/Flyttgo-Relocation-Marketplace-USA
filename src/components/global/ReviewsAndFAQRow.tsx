import ReviewsCarousel from './ReviewsCarousel';
import HomeFAQ from './HomeFAQ';

/* ─────────────────────────────────────────────────────────────────
 * <ReviewsAndFAQRow> — composes the two parallel trust modules
 *
 * Customer voices (left, RTL marquee) + FAQ (right, accordion) sit
 * in one row near the bottom of the homepage. This is the single
 * "trust section" before the supply-side block, so the visual
 * weight is balanced and the customer can scan both kinds of
 * objection-handler at once.
 *
 * Stacked on mobile (single-column grid below the lg breakpoint),
 * side-by-side at lg+. Both child components read an `inline` prop
 * that strips their default <section> wrappers; this one provides
 * the wrapper for both.
 * ───────────────────────────────────────────────────────────────── */

export default function ReviewsAndFAQRow() {
  return (
    <section className="bg-[#fafaf7] py-16 sm:py-20" aria-label="Customer reviews and frequently asked questions">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-start">
          <div className="min-w-0">
            <ReviewsCarousel inline />
          </div>
          <div>
            <HomeFAQ inline />
          </div>
        </div>
      </div>
    </section>
  );
}
