import { useMemo } from 'react';
import { ShieldCheck, MapPin, Users, ArrowRight, BadgeCheck, Globe2 } from 'lucide-react';
import { useApp } from '../../lib/store';
import {
  EXPANSION_COUNTRIES, citiesForCountry, type ExpansionCountryCode,
} from '../../lib/expansion-cities';
import {
  computeCityStatus, STATUS_LABEL, STATUS_TONE,
} from '../../lib/expansion-rollout';
import {
  corridorsForCountry, slugifyCity,
} from '../../lib/cross-border-corridors';
import { useRouteHeroImage } from '../../hooks/useRouteHeroImage';
import { track } from '../../lib/analytics';

/**
 * Expansion-country shopfront — a rollout-status SEO surface for
 * markets where FlyttGo has registered the marketplace intent but the
 * payment + address-autocomplete + carrier-licensing wiring isn't live
 * yet.
 *
 * Differs from CountryPage in three ways:
 *   1. No <BookingShortcut /> — the country is not bookable yet.
 *   2. Renders a rollout-status panel showing each anchor city's
 *      live density-based status (inactive / activating / live / anchor).
 *   3. Provider-acquisition CTA is the primary call-to-action; the
 *      customer-side CTA routes to a waitlist / corridor-aware
 *      neighbouring market.
 *
 * The page reads provider counts off `initialProviderCount` for now —
 * a Supabase aggregation view will replace that with a live count
 * once the country activates.
 */
export default function ExpansionCountryPage({ code }: { code: ExpansionCountryCode }) {
  const { setPage } = useApp();
  const country  = EXPANSION_COUNTRIES[code];
  const cities   = useMemo(() => citiesForCountry(code), [code]);
  const corridors = useMemo(() => corridorsForCountry(code), [code]);
  const hero     = useRouteHeroImage();

  const cityStates = useMemo(() => cities.map(c => ({
    city:  c,
    state: computeCityStatus(c, c.initialProviderCount ?? 0),
  })), [cities]);

  const anchorCount = cityStates.filter(s => s.state.status === 'anchor').length;
  const liveCount   = cityStates.filter(s => s.state.status === 'promoted' || s.state.status === 'anchor').length;

  return (
    <main className="bg-white text-slate-900">

      {/* ─── HERO ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={hero.url}
            alt={hero.alt}
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f3a]/95 via-[#0b1f3a]/85 to-[#0b1f3a]/55" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <button
            onClick={() => setPage('home')}
            className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200 text-sm font-semibold mb-8 transition"
          >
            <span aria-hidden>←</span> All countries
          </button>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-5">
                <span className="text-xl leading-none" aria-hidden>{country.flag}</span>
                <span className="text-white text-xs font-semibold uppercase tracking-wider">
                  {country.code.toUpperCase()} · {country.localLabel}
                </span>
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                  {country.wave === 'first' ? '1st-wave expansion' : '2nd-wave expansion'}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-5">
                {country.name} Moves &amp;{' '}
                <span className="text-amber-300">Logistics Marketplace</span>
              </h1>
              <p className="text-lg text-white/85 leading-relaxed max-w-2xl mb-6">
                {country.positioning}
              </p>

              <div className="flex flex-wrap gap-2 mb-6 text-xs text-white/80">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  <ShieldCheck size={11} className="text-amber-300" />
                  {country.compliance}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  <Globe2 size={11} className="text-amber-300" />
                  {country.activationWindow}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    track('expansion_country_provider_cta_clicked', { country: code });
                    setPage('driver-onboarding');
                  }}
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition"
                >
                  Become a {country.name} provider <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => {
                    track('expansion_country_waitlist_cta_clicked', { country: code });
                    setPage('contact');
                  }}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-5 py-3 rounded-xl text-sm font-bold transition"
                >
                  Join customer waitlist
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white/5 backdrop-blur border border-white/15 rounded-3xl p-6">
                <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                  Rollout snapshot
                </p>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3">
                    <dt className="text-white/60">Anchor cities</dt>
                    <dd className="text-white font-semibold">{cities.length} designated</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3">
                    <dt className="text-white/60">Strategic anchors</dt>
                    <dd className="text-white font-semibold">{anchorCount}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3">
                    <dt className="text-white/60">Live + accepting</dt>
                    <dd className="text-white font-semibold">{liveCount}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-3">
                    <dt className="text-white/60">Cross-border corridors</dt>
                    <dd className="text-white font-semibold">{corridors.length}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-white/60">Currency</dt>
                    <dd className="text-white font-semibold">{country.currency}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANCHOR CITIES + ROLLOUT STATUS ─────────────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
              Anchor cities — designated rollout
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Five strategic relocation anchors per country.
            </h2>
            <p className="text-slate-600 leading-relaxed mt-3">
              Each {country.name} anchor is selected for relocation demand,
              provider-availability probability, cross-border corridor connectivity,
              logistics density, and university or corporate flow. Cities promote
              automatically as providers register: <strong>1 →</strong> activating,{' '}
              <strong>3 →</strong> live, <strong>10 →</strong> anchor with dispatch
              priority.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cityStates.map(({ city, state }) => {
              const tone = STATUS_TONE[state.status];
              return (
                <article
                  key={city.slug}
                  className="bg-[#fafaf7] rounded-2xl p-5 border border-slate-200 hover:border-amber-300 hover:shadow-lg transition cursor-pointer"
                  onClick={() => {
                    track('expansion_anchor_city_clicked', { country: code, slug: city.slug });
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', `/moving-${city.slug}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {city.city}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">/moving-{city.slug}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tone.bg} ${tone.text}`}
                    >
                      {STATUS_LABEL[state.status]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">
                    {city.paragraph}
                  </p>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {city.rationale.slice(0, 3).map(r => (
                      <li key={r} className="flex items-baseline gap-2">
                        <BadgeCheck size={11} className="text-emerald-500 flex-shrink-0" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                  {city.crossBorderCorridorFlag && (
                    <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Globe2 size={10} /> Cross-border ready
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CROSS-BORDER CORRIDORS ─────────────────────────── */}
      {corridors.length > 0 && (
        <section className="bg-[#fafaf7] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
                Cross-border corridors
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {country.name} routes that bridge into neighbouring markets.
              </h2>
              <p className="text-slate-600 leading-relaxed mt-3">
                Strategic infrastructure: high-frequency relocation routes
                surfaced as 1-click options on both endpoint city pages.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {corridors.map(c => {
                const slug = c.slug;
                const label = `${c.fromCity} → ${c.toCity}`;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => {
                      track('expansion_country_corridor_clicked', { country: code, slug });
                      if (typeof window !== 'undefined') {
                        window.history.pushState({}, '', `/corridor/${c.fromCountry}/${slug}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                    }}
                    className="text-left bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md p-4 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-bold text-slate-900">{label}</span>
                      {c.isHighFrequency && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          High-frequency
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">
                      {c.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{c.distanceKm} km</span>
                      <span>·</span>
                      <span>{Math.round(c.driveMinutes / 60 * 10) / 10} h drive</span>
                      {c.bridgesToExistingMarket && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-700 font-semibold">Bridges to live market</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── PROVIDER ACQUISITION CTA ───────────────────────── */}
      <section className="bg-[#0b1f3a] text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                Provider activation — own your city before launch
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                First provider in your {country.name} city activates the marketplace there.
              </h2>
              <ul className="space-y-2 text-white/85 text-sm leading-relaxed mb-6 max-w-2xl">
                <li className="flex items-baseline gap-2">
                  <Users size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                  <span><strong>≥1 provider</strong> registered → city goes <em>activating</em>.</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <Users size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                  <span><strong>≥3 providers</strong> → city goes <em>live · accepting bookings</em> with an SEO landing page.</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <Users size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                  <span><strong>≥10 providers</strong> → city becomes a <em>marketplace anchor</em> with dispatch priority.</span>
                </li>
              </ul>
              <button
                onClick={() => {
                  track('expansion_country_final_cta_clicked', { country: code });
                  setPage('driver-onboarding');
                }}
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition"
              >
                Apply to provide in {country.name} <ArrowRight size={16} />
              </button>
            </div>
            <div className="lg:col-span-4">
              <div className="bg-white/5 backdrop-blur border border-white/15 rounded-2xl p-5">
                <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                  Compliance frame
                </p>
                <p className="text-sm text-white/85 leading-relaxed mb-4">
                  FlyttGo coordinates · {country.name} providers comply with{' '}
                  {country.compliance}
                </p>
                <button
                  onClick={() => setPage('compliance')}
                  className="text-amber-300 hover:text-amber-200 text-sm font-semibold inline-flex items-center gap-1.5 transition"
                >
                  See provider requirements <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANCHOR CITY DEEP-LINK STRIP ───────────────────── */}
      <section className="bg-white py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            City landing pages
          </p>
          <div className="flex flex-wrap gap-2">
            {cities.map(c => (
              <a
                key={c.slug}
                href={`/moving-${slugifyCity(c.city)}`}
                onClick={(e) => {
                  e.preventDefault();
                  track('expansion_country_city_link_clicked', { country: code, slug: c.slug });
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', `/moving-${c.slug}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fafaf7] hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 text-xs font-bold transition"
              >
                <MapPin size={11} className="text-amber-500" />
                Moving in {c.city}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
