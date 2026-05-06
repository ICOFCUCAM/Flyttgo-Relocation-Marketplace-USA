import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, MapPin, ArrowRight, BadgeCheck, Globe2, Users } from 'lucide-react';
import { useApp } from '../lib/store';
import {
  EXPANSION_COUNTRIES, findCityBySlug, type AnchorCity,
} from '../lib/expansion-cities';
import {
  computeCityStatus, STATUS_LABEL, STATUS_TONE,
} from '../lib/expansion-rollout';
import { corridorsForCity } from '../lib/cross-border-corridors';
import { useProviderCountsByCity } from '../hooks/queries/useProviderCounts';
import { useRouteHeroImage } from '../hooks/useRouteHeroImage';
import { track } from '../lib/analytics';

/**
 * Strategic-city SEO landing page — `/moving-<slug>`.
 *
 * Reads the slug from window.location.pathname (the route resolves
 * any `/moving-…` URL to this page). Looks up the city in
 * ANCHOR_CITIES; renders a 404 if unknown.
 *
 * The page is a customer-facing SEO target: H1 includes the city
 * name + "Moves & Logistics", anchor description, rollout status pill,
 * cross-border corridors, and a provider-onboarding CTA when the
 * city is below the active threshold.
 */
function readSlugFromPath(): string {
  if (typeof window === 'undefined') return '';
  const path = window.location.pathname;
  const match = path.match(/^\/moving-([a-z0-9-]+)\/?$/i);
  return match ? match[1].toLowerCase() : '';
}

export default function MovingCityPage() {
  const { setPage } = useApp();
  const [slug, setSlug] = useState<string>(() => readSlugFromPath());

  /* Track popstate so back/forward updates the slug. */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPop = () => setSlug(readSlugFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const city = useMemo<AnchorCity | null>(() => findCityBySlug(slug), [slug]);

  /* Hooks must run unconditionally — call them *before* the
   * city-not-found early return. */
  const hero       = useRouteHeroImage(city?.city);
  const liveCounts = useProviderCountsByCity();

  /* Per-city <head> meta — title + description + canonical so each
   * /moving-<slug> URL ships its own crawl-ready meta. MovingCityPage
   * shares one Page id ('moving-city') across 50 URLs; the global
   * applyPageMeta() in store.tsx only sees the page id, not the
   * slug, so per-city meta lands here. */
  useEffect(() => {
    if (typeof document === 'undefined' || !city) return undefined;
    const country = EXPANSION_COUNTRIES[city.country];
    const url = `https://flyttgo.com/moving-${city.slug}`;
    const title = `Moving in ${city.city}, ${country.name} · FlyttGo marketplace`;
    const description = city.paragraph;

    const prevTitle = document.title;
    document.title = title;

    const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    const upsertLink = (rel: string, href: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    upsertMeta('name',     'description',      description);
    upsertLink('canonical', url);
    upsertMeta('property', 'og:title',         title);
    upsertMeta('property', 'og:description',   description);
    upsertMeta('property', 'og:url',           url);
    upsertMeta('name',     'twitter:title',    title);
    upsertMeta('name',     'twitter:description', description);

    return () => {
      document.title = prevTitle;
    };
  }, [city]);

  if (!city) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center bg-white text-slate-900">
        <div className="max-w-lg text-center px-4">
          <h1 className="text-3xl font-extrabold mb-3">City not found</h1>
          <p className="text-slate-600 mb-6">
            We don't have a landing page for <code className="bg-slate-100 px-1.5 py-0.5 rounded">/moving-{slug}</code> yet.
          </p>
          <button
            onClick={() => setPage('home')}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-5 py-3 rounded-xl text-sm font-bold transition"
          >
            Back to FlyttGo home <ArrowRight size={16} />
          </button>
        </div>
      </main>
    );
  }

  const country    = EXPANSION_COUNTRIES[city.country];
  const liveCount  = liveCounts[city.slug] ?? city.initialProviderCount ?? 0;
  const state      = computeCityStatus(city, liveCount);
  const tone     = STATUS_TONE[state.status];
  const corridors = corridorsForCity(city.slug);

  /* JSON-LD per city — Place + BreadcrumbList. Place carries the
   * city's slug + paragraph; BreadcrumbList wires the nav trail
   * (FlyttGo › Country › City) for Google rich results. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':       'Place',
        '@id':         `https://flyttgo.com/moving-${city.slug}#place`,
        name:          city.city,
        description:   city.paragraph,
        url:           `https://flyttgo.com/moving-${city.slug}`,
        address:       { '@type': 'PostalAddress', addressCountry: city.country.toUpperCase(), addressLocality: city.city },
        containedInPlace: {
          '@type': 'Country',
          name:    country.name,
          url:     `https://flyttgo.com/market-${city.country}`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'FlyttGo',           item: 'https://flyttgo.com/' },
          { '@type': 'ListItem', position: 2, name: country.name,         item: `https://flyttgo.com/market-${city.country}` },
          { '@type': 'ListItem', position: 3, name: `Moving in ${city.city}`, item: `https://flyttgo.com/moving-${city.slug}` },
        ],
      },
    ],
  };

  return (
    <main className="bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            onClick={() => setPage(`market-${city.country}` as never)}
            className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200 text-sm font-semibold mb-8 transition"
          >
            <span aria-hidden>←</span> {country.name} marketplace
          </button>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-5">
                <span className="text-xl leading-none" aria-hidden>{country.flag}</span>
                <span className="text-white text-xs font-semibold uppercase tracking-wider">
                  {country.name} · {city.city}
                </span>
                <span
                  className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${tone.bg} ${tone.text}`}
                >
                  {STATUS_LABEL[state.status]}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-5">
                Moving in {city.city}{' '}
                <span className="text-amber-300">— FlyttGo marketplace</span>
              </h1>
              <p className="text-lg text-white/85 leading-relaxed max-w-2xl mb-6">
                {city.paragraph}
              </p>

              <div className="flex flex-wrap gap-2 mb-6 text-xs text-white/80">
                {city.crossBorderCorridorFlag && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-400/30">
                    <Globe2 size={11} /> Cross-border ready
                  </span>
                )}
                {city.anchorFlag && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/30">
                    <ShieldCheck size={11} /> Strategic anchor
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  Dispatch priority · {state.dispatchPriority}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  {country.activationWindow}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {state.qualifiesForLanding ? (
                  <button
                    onClick={() => {
                      track('moving_city_request_quote_clicked', { slug: city.slug });
                      setPage('request-quote');
                    }}
                    className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition"
                  >
                    Request a quote <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      track('moving_city_waitlist_clicked', { slug: city.slug });
                      setPage('contact');
                    }}
                    className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition"
                  >
                    Join customer waitlist <ArrowRight size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    track('moving_city_become_provider_clicked', { slug: city.slug });
                    setPage('driver-onboarding');
                  }}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-5 py-3 rounded-xl text-sm font-bold transition"
                >
                  Provide in {city.city}
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-white/5 backdrop-blur border border-white/15 rounded-3xl p-6">
                <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
                  Why this city is on the map
                </p>
                <ul className="space-y-3 text-sm text-white/85">
                  {city.rationale.map(r => (
                    <li key={r} className="flex items-baseline gap-2">
                      <BadgeCheck size={14} className="text-emerald-300 flex-shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROLLOUT STATUS PANEL ─────────────────────────── */}
      <section className="bg-[#fafaf7] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Status</p>
              <p className={`text-lg font-extrabold ${tone.text}`}>{STATUS_LABEL[state.status]}</p>
              <p className="text-xs text-slate-600 mt-1">
                {state.providerCount} provider{state.providerCount === 1 ? '' : 's'} registered
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Dispatch priority</p>
              <p className="text-lg font-extrabold text-slate-900 capitalize">{state.dispatchPriority}</p>
              <p className="text-xs text-slate-600 mt-1">
                {state.qualifiesForDispatchPriority ? 'Top-of-marketplace routing' : 'Standard routing'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Country</p>
              <p className="text-lg font-extrabold text-slate-900">{country.name}</p>
              <p className="text-xs text-slate-600 mt-1">{country.localLabel}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Currency</p>
              <p className="text-lg font-extrabold text-slate-900">{country.currency}</p>
              <p className="text-xs text-slate-600 mt-1">Quotes localized at activation</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CROSS-BORDER CORRIDORS ─────────────────────── */}
      {corridors.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
                Cross-border corridors from {city.city}
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Where {city.city} relocations bridge to.
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {corridors.map(c => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    track('moving_city_corridor_clicked', { city: city.slug, corridor: c.slug });
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', `/corridor/${c.fromCountry}/${c.slug}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }
                  }}
                  className="text-left bg-[#fafaf7] rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md p-4 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-bold text-slate-900">
                      {c.fromCity} → {c.toCity}
                    </span>
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
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── PROVIDER ACQUISITION ─────────────────────────── */}
      <section className="bg-[#0b1f3a] text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                {state.status === 'inactive' ? 'Be first in ' + city.city : 'Strengthen the ' + city.city + ' marketplace'}
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                {state.status === 'anchor'
                  ? `${city.city} is an anchor — high-priority dispatch is already on.`
                  : state.status === 'promoted'
                  ? `${city.city} is live. Push it to anchor by registering more providers.`
                  : state.status === 'active'
                  ? `${city.city} is activating. Two more providers unlock the public landing surface.`
                  : `Be the first provider in ${city.city} and unlock the marketplace there.`
                }
              </h2>
              <ul className="space-y-2 text-white/85 text-sm leading-relaxed mb-6 max-w-2xl">
                <li className="flex items-baseline gap-2">
                  <Users size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                  <span>Promotion rule: <strong>1 → activating · 3 → live · 10 → anchor</strong>.</span>
                </li>
                <li className="flex items-baseline gap-2">
                  <ShieldCheck size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                  <span>Compliance frame: {country.compliance}</span>
                </li>
              </ul>
              <button
                onClick={() => {
                  track('moving_city_provider_cta_clicked', { slug: city.slug });
                  setPage('driver-onboarding');
                }}
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition"
              >
                Apply to provide in {city.city} <ArrowRight size={16} />
              </button>
            </div>
            <div className="lg:col-span-4">
              <div className="bg-white/5 backdrop-blur border border-white/15 rounded-2xl p-5">
                <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                  Country shopfront
                </p>
                <p className="text-sm text-white/85 leading-relaxed mb-4">
                  Browse all {country.name} anchor cities, cross-border corridors,
                  and rollout status from the country-level surface.
                </p>
                <button
                  onClick={() => setPage(`market-${city.country}` as never)}
                  className="text-amber-300 hover:text-amber-200 text-sm font-semibold inline-flex items-center gap-1.5 transition"
                >
                  Go to /market-{city.country} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BREADCRUMB / DEEP LINK ────────────────────────── */}
      <section className="bg-white py-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <button onClick={() => setPage('home')} className="hover:text-slate-900 font-semibold transition">FlyttGo</button>
          <span aria-hidden>›</span>
          <button onClick={() => setPage(`market-${city.country}` as never)} className="hover:text-slate-900 font-semibold transition">{country.name}</button>
          <span aria-hidden>›</span>
          <span className="text-slate-900 font-semibold inline-flex items-center gap-1.5">
            <MapPin size={11} className="text-amber-500" /> Moving in {city.city}
          </span>
        </div>
      </section>
    </main>
  );
}
