import { useMemo } from 'react';
import { Star } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
 * <ReviewsCarousel> — horizontal RTL auto-scroll marquee.
 *
 * Replaces the prior single-pane rotator with a continuously scrolling
 * marquee that travels right-to-left at a steady pace. Pauses on hover
 * + when the user has prefers-reduced-motion set, so accessibility
 * isn't compromised. The track is duplicated (two copies of the
 * REVIEWS array rendered back-to-back) so the loop is seamless — when
 * the first copy has fully scrolled off-screen the second copy is
 * already in the same position, ready to repeat.
 *
 * Two render modes:
 *   - default        : renders its own <section> with the headline
 *                      ("4.8 average from 27,000+ moves") + Trustpilot
 *                      ribbon, suitable for full-width placement.
 *   - inline (prop)  : renders only the marquee + a compact title row,
 *                      so it can sit side-by-side with HomeFAQ inside
 *                      <ReviewsAndFAQRow> without its own padding.
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

interface Props {
  /** When true, omits the outer <section> + headline. Used by
   *  ReviewsAndFAQRow to compose with HomeFAQ side-by-side. */
  inline?: boolean;
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <article className="flex-shrink-0 w-[20rem] sm:w-[22rem] bg-white border border-slate-200 rounded-2xl p-5 mr-4 shadow-sm">
      <div className="flex gap-0.5 mb-3" aria-hidden="true">
        {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed line-clamp-5">
        “{r.text}”
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
          {r.name.charAt(0)}
        </div>
        <div className="text-left min-w-0">
          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5 truncate">
            {r.name}
            <span aria-hidden="true">{r.flag}</span>
          </p>
          <p className="text-xs text-slate-500 truncate">{r.route}</p>
        </div>
      </div>
    </article>
  );
}

export default function ReviewsCarousel({ inline = false }: Props) {
  /* Doubled track — REVIEWS twice in succession so the keyframe
   * animation can travel exactly -50% and reset seamlessly. The
   * second copy is aria-hidden so screen readers only see the
   * first set; otherwise the same testimonial reads twice. */
  const doubled = useMemo(() => [...REVIEWS, ...REVIEWS], []);

  const marquee = (
    <div
      className="relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
    >
      {/* Edge fade masks so cards don't pop in/out abruptly */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#fafaf7] to-transparent z-10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#fafaf7] to-transparent z-10" />

      <div className="flex w-max animate-[marquee-rtl_40s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:[animation:none]">
        {doubled.map((r, i) => (
          <div key={i} aria-hidden={i >= REVIEWS.length ? 'true' : undefined}>
            <ReviewCard r={r} />
          </div>
        ))}
      </div>
    </div>
  );

  if (inline) {
    return (
      <div>
        <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
          Real customers, real moves
        </p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
          4.8 average from 27,000+ moves
        </h2>
        {marquee}
      </div>
    );
  }

  return (
    <section className="bg-[#fafaf7] py-16 sm:py-20" aria-label="Customer reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-3">
            Real customers, real moves
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            4.8 average from 27,000+ moves
          </h2>
          <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mt-3">
            <span className="flex gap-0.5" aria-hidden="true">
              {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-emerald-600 text-emerald-600" />)}
            </span>
            <span className="text-sm font-bold text-emerald-700">Trustpilot</span>
            <span className="text-sm text-emerald-700">·</span>
            <span className="text-sm text-emerald-700">4.8 / 5 from 12,800+ reviews</span>
          </div>
        </div>
        {marquee}
      </div>
    </section>
  );
}
