import CorridorExpansionSection from './CorridorExpansionSection';
import { resolveSEOContent, type SEOCountryCode, type SEOLanguageCode } from './seo-content';

/* ─────────────────────────────────────────────────────────────────
 * <CountrySEOSection>
 *
 * Multilingual SEO content block for country storefronts. Renders:
 *   - eyebrow + h2 headline
 *   - primary SEO paragraph (80–160 words, native phrasing)
 *   - <CorridorExpansionSection> with the country's city-pair
 *     relocation corridors
 *
 * All copy comes from src/components/seo/seo-content.ts and is
 * server-rendered (no client-only translation), so Google's HTML
 * indexer crawls the localized text directly.
 *
 * Sits after the supply-side trust modules (TopProviders /
 * EarningsSimulator) and before the Final CTA on the country page —
 * the spec calls for "after TopProviders, before FAQ"; country
 * pages don't carry an FAQ today, so the natural insertion point
 * is just before the closing CTA.
 * ───────────────────────────────────────────────────────────────── */

interface Props {
  countryCode:   SEOCountryCode;
  languageCode:  SEOLanguageCode;
}

export default function CountrySEOSection({ countryCode, languageCode }: Props) {
  const content = resolveSEOContent(countryCode, languageCode);

  /* Defensive — if a country has no SEO content registered we
   * render nothing rather than a broken section. */
  if (!content) return null;

  return (
    <section
      className="bg-[#fafaf7] border-y border-slate-200 py-16 sm:py-20"
      aria-label={content.headline}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Lead — eyebrow + h2 + paragraph. Two-column on desktop
         *  so the paragraph sits beside a brief context aside; one
         *  column on mobile for normal scroll. */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 mb-12 items-start">
          <div className="lg:col-span-8">
            <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-2">
              {content.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-5">
              {content.headline}
            </h2>
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
              {content.paragraph}
            </p>
          </div>
          <aside
            className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 self-start"
            aria-label="Marketplace highlights"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-700 font-bold mb-3">
              Marketplace standards
            </p>
            <ul className="space-y-2.5 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0">·</span>
                <span><strong className="text-slate-900">Licensed providers</strong> — country-specific operator licences on every dispatch</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0">·</span>
                <span><strong className="text-slate-900">Distance-priced</strong> — real OSRM road distance, no flat estimates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0">·</span>
                <span><strong className="text-slate-900">Escrow-protected</strong> — funds clear after delivery is confirmed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 font-bold flex-shrink-0">·</span>
                <span><strong className="text-slate-900">Goods-in-transit insurance</strong> — held by every dispatched provider</span>
              </li>
            </ul>
          </aside>
        </div>

        {/* Corridor expansion. Passes countryCode so each card links
         *  to /corridor/<country>/<slug> — the per-corridor SEO
         *  landing pages, which are the highest-converting search
         *  intent surface in the marketplace. */}
        <CorridorExpansionSection
          headline={content.corridorsHeadline}
          corridors={content.corridors}
          countryCode={countryCode}
        />
      </div>
    </section>
  );
}

export type { SEOCountryCode, SEOLanguageCode };
