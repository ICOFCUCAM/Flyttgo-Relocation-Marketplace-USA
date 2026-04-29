import { useEffect, useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
 * <ReviewsCarousel> — single-pane review rotator.
 *
 * Replaces the legacy 9-card grid with a focused single-pane testimonial
 * carousel. Better signal-to-noise on mobile, less visual weight on
 * the homepage scroll, and the rotation cycle keeps the section
 * "alive" instead of feeling like a static wall of quotes.
 *
 * Auto-advances every 6 seconds when the user hasn't interacted
 * recently; pauses while the panel has focus or the cursor is
 * hovering, so screen readers and keyboard users aren't yanked
 * mid-read. Dot navigation + prev/next arrows for explicit control.
 * ───────────────────────────────────────────────────────────────── */

interface Review {
  name:  string;
  route: string;
  flag:  string;
  text:  string;
}

const REVIEWS: Review[] = [
  {
    name:  'Emily Johnson',
    route: 'Austin → Atlanta',
    flag:  '🇺🇸',
    text:  'Booked a licensed long-distance carrier in under five minutes. The price held, escrow released exactly when the team finished unloading.',
  },
  {
    name:  'James Walker',
    route: 'London → Manchester',
    flag:  '🇬🇧',
    text:  'Used the cash-on-delivery option for our office move. Slick — 30% online, the rest paid in cash to a brilliant GVOL operator.',
  },
  {
    name:  'Erik Hansen',
    route: 'Oslo → Bergen',
    flag:  '🇳🇴',
    text:  'Norsk språk gjennom hele bestillingen. Lisensiert flytteselskap, sporing i sanntid, raskt utbetalt fra escrow.',
  },
  {
    name:  'Lukas Müller',
    route: 'Berlin → München',
    flag:  '🇩🇪',
    text:  'Drei Anbieter im Vergleich, faire Preise, transparente Versicherung. Genau das, was Umzüge in Deutschland gebraucht haben.',
  },
  {
    name:  'Sophie Dubois',
    route: 'Paris → Lyon',
    flag:  '🇫🇷',
    text:  'Devis instantané, déménageurs licenciés, paiement sécurisé. Le déménagement le plus simple que j’ai jamais fait.',
  },
  {
    name:  'Ava Tremblay',
    route: 'Toronto → Montréal',
    flag:  '🇨🇦',
    text:  'Bilingual coordination across two provinces, federally compliant carrier, transparent total — no surprises at the dock.',
  },
];

const AUTO_ADVANCE_MS = 6000;

export default function ReviewsCarousel() {
  const [index,    setIndex]    = useState(0);
  const [paused,   setPaused]   = useState(false);

  /* Auto-advance loop. Cleanup re-runs on every index change so the
   * timer always reflects the current pause state. */
  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setIndex(i => (i + 1) % REVIEWS.length), AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [paused, index]);

  const review = REVIEWS[index];
  const goPrev = () => setIndex(i => (i - 1 + REVIEWS.length) % REVIEWS.length);
  const goNext = () => setIndex(i => (i + 1) % REVIEWS.length);

  return (
    <section
      className="bg-white py-16 sm:py-20"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-3">
          Real customers, real moves
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          4.8 average from 27,000+ moves
        </h2>
        <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mb-8">
          <span className="flex gap-0.5" aria-hidden="true">
            {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-emerald-600 text-emerald-600" />)}
          </span>
          <span className="text-sm font-bold text-emerald-700">Trustpilot</span>
          <span className="text-sm text-emerald-700">·</span>
          <span className="text-sm text-emerald-700">4.8 / 5 from 12,800+ reviews</span>
        </div>

        <div
          className="relative bg-[#fafaf7] rounded-2xl p-8 sm:p-10 shadow-sm border border-slate-100"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex justify-center gap-1 mb-4" aria-hidden="true">
            {[1,2,3,4,5].map(i => <Star key={i} size={18} className="fill-amber-400 text-amber-400" />)}
          </div>

          <p className="text-lg sm:text-xl text-slate-700 leading-relaxed max-w-3xl mx-auto">
            “{review.text}”
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
              {review.name.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                {review.name}
                <span aria-hidden="true" className="text-base leading-none">{review.flag}</span>
              </p>
              <p className="text-xs text-slate-500">{review.route}</p>
            </div>
          </div>

          {/* Prev / next — absolute on the panel for desktop, hidden on mobile
           *  so the dot row remains the primary control on small screens. */}
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous review"
            className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-amber-300 hover:text-amber-600 items-center justify-center text-slate-500 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next review"
            className="hidden sm:flex absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-amber-300 hover:text-amber-600 items-center justify-center text-slate-500 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Dot navigation — primary control on mobile, secondary on desktop. */}
        <div className="flex justify-center gap-2 mt-6" role="tablist">
          {REVIEWS.map((r, i) => (
            <button
              key={r.name}
              type="button"
              role="tab"
              aria-label={`Show review ${i + 1} of ${REVIEWS.length}`}
              aria-selected={index === i}
              onClick={() => setIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                index === i ? 'bg-amber-400 scale-110' : 'bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
