import { ArrowRight, MapPin } from 'lucide-react';
import { useApp } from '../../lib/store';
import { SEO_CONTENT, type SEOCountryCode } from '../seo/seo-content';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <PopularCorridorsSection>
 *
 * Surfaces the 6 highest-intent city-pair corridors directly on the
 * homepage, each linking into the per-corridor SEO landing page at
 * /corridor/<country>/<slug>.
 *
 * Corridor selection: one corridor per supported country, picked
 * from the SEO_CONTENT.corridors list. The first entry per country
 * is treated as the flagship (it's the corridor we lead with on the
 * country page too). Manual override possible by passing a custom
 * `corridors` prop.
 *
 * Every card is a real internal link to a real SEO landing page —
 * not a decorative tile. Drives crawler discovery of the corridor
 * surface and gives high-intent visitors a one-click path to a
 * corridor-scoped booking funnel.
 * ───────────────────────────────────────────────────────────────── */

interface FeaturedCorridor {
  country:   SEOCountryCode;
  slug:      string;
  heading:   string;
  /** Native-language tagline displayed under the heading. */
  tagline:   string;
  flag:      string;
  /** Short-lang label shown in the corner, e.g. "USA · EN". */
  langLabel: string;
}

/* Default flagship picks — first corridor per country, in the
 * spec's 6-country order. Override at consumer call-site if a
 * specific homepage variant wants a different selection. */
function defaultCorridors(): FeaturedCorridor[] {
  const picks: { country: SEOCountryCode; lang: keyof typeof SEO_CONTENT['us']; flag: string; langLabel: string }[] = [
    { country: 'us', lang: 'en', flag: '🇺🇸', langLabel: 'USA' },
    { country: 'ca', lang: 'en', flag: '🇨🇦', langLabel: 'Canada · EN' },
    { country: 'uk', lang: 'en', flag: '🇬🇧', langLabel: 'United Kingdom' },
    { country: 'fr', lang: 'fr', flag: '🇫🇷', langLabel: 'France' },
    { country: 'de', lang: 'de', flag: '🇩🇪', langLabel: 'Germany' },
    { country: 'no', lang: 'nb', flag: '🇳🇴', langLabel: 'Norge' },
  ];

  const out: FeaturedCorridor[] = [];
  for (const pick of picks) {
    const bucket = SEO_CONTENT[pick.country]?.[pick.lang];
    const first = bucket?.corridors[0];
    if (first) {
      out.push({
        country:   pick.country,
        slug:      first.slug,
        heading:   first.heading,
        tagline:   first.body,
        flag:      pick.flag,
        langLabel: pick.langLabel,
      });
    }
  }
  return out;
}

interface Props {
  corridors?: FeaturedCorridor[];
}

export default function PopularCorridorsSection({ corridors = defaultCorridors() }: Props) {
  const { setPage } = useApp();

  function openCorridor(c: FeaturedCorridor) {
    track('home_popular_corridor_clicked', { country: c.country, slug: c.slug });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/corridor/${c.country}/${c.slug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  return (
    <section className="bg-[#fafaf7] py-16 sm:py-20" aria-label="Popular relocation corridors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div className="max-w-2xl">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-[0.18em] mb-2">
              Corridor examples
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Popular relocation corridors
            </h2>
            <p className="mt-3 text-slate-600">
              Each corridor opens its own marketplace landing page with
              licensed providers, distance-priced quotes, and escrow
              protection on every booking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPage('cities')}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 hover:text-amber-800 transition"
          >
            See all markets
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {corridors.map(c => (
            <button
              key={`${c.country}-${c.slug}`}
              type="button"
              onClick={() => openCorridor(c)}
              className="group text-left bg-white hover:shadow-xl border border-slate-200 hover:border-amber-300 rounded-2xl p-6 transition flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="text-3xl leading-none" aria-hidden="true">{c.flag}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mt-1">
                  {c.langLabel}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-amber-700 leading-snug mb-2">
                {c.heading}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 flex-1">
                {c.tagline}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <MapPin size={11} />
                  /corridor/{c.country}/{c.slug}
                </span>
                <span className="inline-flex items-center gap-1 text-amber-700 group-hover:translate-x-0.5 transition-transform">
                  Open corridor
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
