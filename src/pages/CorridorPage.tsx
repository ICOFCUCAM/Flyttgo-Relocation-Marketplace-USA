import { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import { useApp, type Page } from '../lib/store';
import MarketplaceBanner from '../components/banners/MarketplaceBanner';
import { findCorridor, type SEOCountryCode } from '../components/seo/seo-content';
import type { BookingCountry } from '../lib/store';

/* ─────────────────────────────────────────────────────────────────
 * <CorridorPage> — /corridor/<country>/<slug>
 *
 * Per-corridor SEO landing page. Each corridor (e.g. New York →
 * Boston, Paris → Lyon) becomes its own booking-funnel entry point
 * keyed off a high-intent search query the country page can't rank
 * for ("nyc to boston movers", "paris à lyon déménagement"). This
 * is the Uber Freight / AnyVan / UShip playbook — the most
 * marketplace-impactful SEO surface because the URL exactly
 * matches the customer's search intent.
 *
 * Slug source: window.location.pathname segments 2 + 3 (the URL
 * shape /corridor/<country>/<slug>). Same approach as
 * ServiceCategoryPage so the routing pattern stays consistent.
 *
 * Renders, in order:
 *   - <MarketplaceBanner variant="inverse"> with the localized
 *     corridor heading (e.g. "New York → Boston movers")
 *   - corridor description paragraph
 *   - "Coordinate this move" panel — country-aware booking CTA
 *   - "Other corridors in [country]" siblings rail with deep links
 *
 * SEO note: heading is rendered as h1 (banner default), siblings
 * use h3, paragraph and country context use p. No client-only
 * conditional rendering of headings — Google indexes the corridor
 * copy directly. JSON-LD schema is held back to a follow-up since
 * it deserves its own review pass.
 * ───────────────────────────────────────────────────────────────── */

interface ParsedSlug {
  country: SEOCountryCode;
  slug:    string;
}

function parseCorridorPath(): ParsedSlug | null {
  if (typeof window === 'undefined') return null;
  const parts = window.location.pathname.split('/').filter(Boolean);
  /* Expect ['corridor', '<country>', '<slug>']. Anything shorter is
   * an unknown URL and we render the missing-corridor empty state. */
  if (parts.length < 3 || parts[0].toLowerCase() !== 'corridor') return null;
  const country = parts[1].toLowerCase() as SEOCountryCode;
  const slug    = parts[2].toLowerCase();
  if (!['us', 'ca', 'uk', 'fr', 'de', 'no'].includes(country)) return null;
  return { country, slug };
}

/* Maps the SEO country code (ca/uk/fr/de/no/us) to the in-app
 * BookingCountry id (which uses 'gb' for the UK). The CorridorPage
 * pre-seeds bookingData.country with this id when the customer
 * hits the booking CTA. */
const SEO_TO_BOOKING_COUNTRY: Record<SEOCountryCode, BookingCountry> = {
  us: 'us',
  ca: 'ca',
  uk: 'gb',
  fr: 'fr',
  de: 'de',
  no: 'no',
};

const COUNTRY_SHOPFRONT_PAGE: Record<SEOCountryCode, Page> = {
  us: 'market-us',
  ca: 'market-canada',
  uk: 'market-uk',
  fr: 'market-france',
  de: 'market-germany',
  no: 'market-norway',
};

export default function CorridorPage() {
  const { setPage, setBookingData } = useApp();
  const [parsed, setParsed] = useState<ParsedSlug | null>(parseCorridorPath());

  /* Re-parse on popstate so back/forward navigation between
   * corridors works without a full route remount. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => setParsed(parseCorridorPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (!parsed) {
    return (
      <main className="min-h-screen bg-white">
        <MarketplaceBanner
          variant="inverse"
          eyebrow="Corridor not found"
          headline="We couldn't resolve that corridor"
          lead="Try one of the country marketplaces below — every country page lists its popular relocation corridors."
          ctas={[
            { label: 'Pick a country →', onClick: () => setPage('home'), primary: true },
          ]}
        />
      </main>
    );
  }

  const lookup = findCorridor(parsed.country, parsed.slug);
  if (!lookup) {
    return (
      <main className="min-h-screen bg-white">
        <MarketplaceBanner
          variant="inverse"
          eyebrow={parsed.country.toUpperCase()}
          headline="Corridor not yet on FlyttGo"
          lead="This city pair isn't a featured corridor in our marketplace yet. Open the country shopfront to see all corridors and book a custom quote."
          ctas={[
            { label: 'Open country shopfront →',
              onClick: () => setPage(COUNTRY_SHOPFRONT_PAGE[parsed.country]),
              primary: true },
          ]}
        />
      </main>
    );
  }

  const { corridor, siblings, content, languageCode } = lookup;

  function startBooking() {
    /* Pre-seed bookingData with the country and the from/to cities
     * so the booking flow opens with relevant context already
     * populated. The flow's address autocomplete is country-aware
     * so the customer can refine the addresses inside that flow. */
    setBookingData({
      country:        SEO_TO_BOOKING_COUNTRY[parsed!.country],
      pickupAddress:  corridor.fromCity,
      dropoffAddress: corridor.toCity,
    });
    setPage('booking');
  }

  function openShopfront() {
    setPage(COUNTRY_SHOPFRONT_PAGE[parsed!.country]);
  }

  function openSibling(slug: string) {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/corridor/${parsed!.country}/${slug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  /* Localized "back to country" label so the breadcrumb reads
   * naturally in each language. */
  const backLabel = (
    languageCode === 'fr' ? 'Retour aux corridors du pays' :
    languageCode === 'de' ? 'Zurück zu den Korridoren' :
    languageCode === 'nb' ? 'Tilbake til landets korridorer' :
    'Back to country corridors'
  );

  /* Localized "Other corridors" headline for the siblings rail. */
  const siblingsHeadline = (
    languageCode === 'fr' ? 'Autres corridors populaires' :
    languageCode === 'de' ? 'Weitere beliebte Korridore' :
    languageCode === 'nb' ? 'Andre populære korridorer' :
    'Other popular corridors'
  );

  /* Localized booking CTA. */
  const bookCta = (
    languageCode === 'fr' ? 'Obtenir un devis →' :
    languageCode === 'de' ? 'Sofortpreis erhalten →' :
    languageCode === 'nb' ? 'Få et tilbud →' :
    'Get an instant price →'
  );

  return (
    <main className="min-h-screen bg-white">
      <MarketplaceBanner
        variant="inverse"
        eyebrow={content.eyebrow}
        breadcrumb={{
          id: `${parsed.country.toUpperCase()}.${corridor.slug.toUpperCase()}`,
          label: corridor.heading,
        }}
        headline={corridor.heading}
        lead={corridor.body}
        compliancePills={[
          { label: 'Licensed providers' },
          { label: 'Distance-priced' },
          { label: 'Escrow-protected' },
          { label: 'Insured in transit' },
        ]}
        ctas={[
          { label: bookCta,    onClick: startBooking, primary: true },
          { label: backLabel,  onClick: openShopfront },
        ]}
        aside={
          <div className="bg-white/5 border border-white/15 backdrop-blur rounded-2xl p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300 mb-3">
              Route
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-amber-300 flex-shrink-0" />
                <span className="text-white font-bold">{corridor.fromCity}</span>
              </div>
              <div className="ml-2 border-l-2 border-white/30 pl-4 text-xs text-white/60">
                {parsed.country.toUpperCase()} relocation corridor
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-amber-300 flex-shrink-0" />
                <span className="text-white font-bold">{corridor.toCity}</span>
              </div>
            </div>
          </div>
        }
      />

      {/* Country context — the country-level SEO paragraph reused as
       *  the sub-page context so the corridor page reads as a real
       *  child of the country marketplace, not a stub. */}
      <section className="bg-[#fafaf7] border-b border-slate-200 py-14 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-bold mb-3">
            {content.eyebrow}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-4">
            {content.headline}
          </h2>
          <p className="text-base sm:text-lg text-slate-700 leading-relaxed">
            {content.paragraph}
          </p>
        </div>
      </section>

      {/* Sibling corridors — internal-link rail that boosts crawl
       *  depth across the corridor catalogue. Every card is a real
       *  /corridor/... URL the customer can deep-link to. */}
      {siblings.length > 0 && (
        <section className="bg-white py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
              {siblingsHeadline}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {siblings.map(s => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => openSibling(s.slug)}
                  className="group text-left bg-[#fafaf7] hover:bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg rounded-2xl p-5 transition flex flex-col"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 mb-2">
                    {s.heading}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 flex-1">
                    {s.body}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                    Open corridor
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final closing CTA — last conversion ramp before page exit. */}
      <section className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3">
            {corridor.fromCity} → {corridor.toCity}
          </h2>
          <p className="text-slate-800 max-w-2xl mx-auto leading-relaxed mb-7">
            {corridor.body}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={startBooking}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
            >
              {bookCta}
            </button>
            <button
              onClick={openShopfront}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-bold transition"
            >
              <ArrowLeft size={16} />
              {backLabel}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
