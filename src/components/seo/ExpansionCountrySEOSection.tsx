import { ArrowRight, MapPin, Globe2, BadgeCheck } from 'lucide-react';
import { useApp } from '../../lib/store';
import {
  EXPANSION_COUNTRIES, citiesForCountry, type ExpansionCountryCode,
} from '../../lib/expansion-cities';
import { corridorsForCountry } from '../../lib/cross-border-corridors';
import { computeCityStatus, STATUS_LABEL, STATUS_TONE } from '../../lib/expansion-rollout';
import { useProviderCountsByCity } from '../../hooks/queries/useProviderCounts';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <ExpansionCountrySEOSection>
 *
 * SEO content block for the 10 expansion-country shopfronts. Mirrors
 * the role <CountrySEOSection> plays for legacy markets but doesn't
 * require the multilingual content registry — expansion countries
 * ship with English-baseline copy and rely on the live ANCHOR_CITIES
 * + CROSS_BORDER_CORRIDORS data for the per-country body.
 *
 * Renders, per country:
 *   - Eyebrow + h2 headline naming the 5 anchor cities
 *   - SEO paragraph composed from the country positioning + city list
 *   - 5 anchor-city cards with internal links to /moving-<slug>
 *   - Cross-border corridor strip (max 6) with internal links
 *   - JSON-LD <Place> schema for the country, with containedInPlace
 *     listing the anchor cities so Google sees the relationship
 *
 * Sits above the Provider Acquisition CTA inside ExpansionCountryPage
 * so the SEO body is the last thing crawlers see before the closing
 * conversion module — same insertion point as <CountrySEOSection>.
 * ───────────────────────────────────────────────────────────────── */

interface Props {
  code: ExpansionCountryCode;
}

export default function ExpansionCountrySEOSection({ code }: Props) {
  const { setPage } = useApp();
  const country  = EXPANSION_COUNTRIES[code];
  const cities    = citiesForCountry(code);
  const corridors = corridorsForCountry(code).slice(0, 6);
  const liveCounts = useProviderCountsByCity();

  /* Compose the SEO paragraph — country positioning + named anchor
   * cities. Reads naturally and surfaces every anchor's display name
   * in the page body so Google indexes the city↔country relationship. */
  const cityList = cities.map(c => c.city).join(', ');
  const seoParagraph =
    `${country.positioning} The ${country.name} marketplace anchors on ${cityList} ` +
    `— each with its own /moving-<city> SEO landing page, transparent ` +
    `pricing, and verified providers. ${
      corridors.length > 0
        ? `${corridors.length} cross-border corridors connect ${country.name} into neighbouring markets, including ${corridors.slice(0, 3).map(c => `${c.fromCity} ↔ ${c.toCity}`).join(', ')}.`
        : ''
    }`;

  /* JSON-LD Place schema — country with containedInPlace list of
   * anchor cities. Each city appears as its own Place referenced
   * back to the country. Google uses this to bind the city pages
   * to the country shopfront in its knowledge graph. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'Place',
    name:       country.name,
    description: country.positioning,
    address:    { '@type': 'PostalAddress', addressCountry: country.code.toUpperCase() },
    url:        `https://flyttgo.us/market-${country.code}`,
    containedInPlace: { '@type': 'Country', name: country.name },
    containsPlace: cities.map(c => ({
      '@type': 'Place',
      name:    c.city,
      url:     `https://flyttgo.us/moving-${c.slug}`,
      description: c.paragraph,
    })),
  };

  return (
    <section
      className="bg-[#fafaf7] border-y border-slate-200 py-16 sm:py-20"
      aria-label={`${country.name} marketplace SEO`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Lead — eyebrow + h2 + paragraph ──────────────── */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 mb-12 items-start">
          <div className="lg:col-span-8">
            <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-2">
              {country.localLabel} · {country.name} marketplace
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-5">
              Moving in {country.name}? Anchor cities: {cityList}.
            </h2>
            <p className="text-base text-slate-700 leading-relaxed">
              {seoParagraph}
            </p>
          </div>

          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              {country.name} at a glance
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500 text-xs uppercase tracking-wider">ISO</dt>
                <dd className="text-slate-900 font-semibold">{country.code.toUpperCase()}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500 text-xs uppercase tracking-wider">Currency</dt>
                <dd className="text-slate-900 font-semibold">{country.currency}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500 text-xs uppercase tracking-wider">Anchor cities</dt>
                <dd className="text-slate-900 font-semibold">{cities.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2">
                <dt className="text-slate-500 text-xs uppercase tracking-wider">Corridors</dt>
                <dd className="text-slate-900 font-semibold">{corridorsForCountry(code).length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500 text-xs uppercase tracking-wider">Rollout</dt>
                <dd className="text-slate-900 font-semibold">{country.activationWindow.split(' — ')[0]}</dd>
              </div>
            </dl>
          </aside>
        </div>

        {/* ── Anchor city cards — internal links ──────────── */}
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Strategic city landing pages
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {cities.map(city => {
              const state = computeCityStatus(
                city,
                liveCounts[city.slug] ?? city.initialProviderCount ?? 0,
              );
              const tone = STATUS_TONE[state.status];
              return (
                <a
                  key={city.slug}
                  href={`/moving-${city.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    track('country_seo_city_clicked', { country: code, slug: city.slug });
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', `/moving-${city.slug}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md p-4 transition group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900 group-hover:text-amber-700 transition">
                      Moving in {city.city}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${tone.bg} ${tone.text}`}>
                      {STATUS_LABEL[state.status]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {city.paragraph}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400 font-mono">/moving-{city.slug}</p>
                </a>
              );
            })}
          </div>
        </div>

        {/* ── Cross-border corridor strip ──────────────────── */}
        {corridors.length > 0 && (
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Cross-border corridors from {country.name}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {corridors.map(c => (
                <a
                  key={c.slug}
                  href={`/corridor/${c.fromCountry}/${c.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    track('country_seo_corridor_clicked', { country: code, slug: c.slug });
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', `/corridor/${c.fromCountry}/${c.slug}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  className="block bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md p-4 transition group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                      <Globe2 size={11} className="inline-block mr-1 -mt-0.5 text-amber-500" />
                      {c.fromCity} → {c.toCity}
                    </span>
                    {c.isHighFrequency && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Frequent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-1.5 line-clamp-2">
                    {c.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{c.distanceKm} km</span>
                    <span>·</span>
                    <span>{Math.round(c.driveMinutes / 60 * 10) / 10} h</span>
                    {c.bridgesToExistingMarket && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">to live market</span>
                      </>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Trust strip ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <BadgeCheck size={20} className="text-emerald-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">Verified providers</p>
              <p className="text-xs text-slate-600">{country.compliance}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-900">{cities.length} anchor cities</p>
              <p className="text-xs text-slate-600">SEO landing per anchor</p>
            </div>
          </div>
          <button
            onClick={() => {
              track('country_seo_provider_cta_clicked', { country: code });
              setPage('driver-onboarding');
            }}
            className="flex items-center justify-between gap-3 bg-[#0b1f3a] hover:bg-[#0e264a] text-white rounded-xl px-4 py-3 text-sm font-semibold transition group"
          >
            <span>Provide in {country.name}</span>
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}
