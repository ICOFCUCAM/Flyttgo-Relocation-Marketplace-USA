import React, { useEffect } from 'react';
import { Star, ShieldCheck, Truck, BadgeCheck, MapPin } from 'lucide-react';
import { useApp } from '../../lib/store';
import type { Page, BookingCountry } from '../../lib/store';
import { applyCountryLanguage } from '../../lib/i18n';
import BookingShortcut from './BookingShortcut';
import CountrySchema from './CountrySchema';

/**
 * Section-index label — kept for backward compatibility with editorial
 * pages (HowItWorks, Universities, About) that still import it. Country
 * pages no longer render these mono labels; they read as marketplace
 * pages, not infrastructure docs.
 */
export function SectionIndex({ id, label }: { id: string; label: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-6 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
      <span className="text-slate-900 font-semibold">{id}</span>
      <span className="h-px w-10 bg-slate-300" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

interface CountryServiceTile {
  title: string;
  description: string;
}

interface CountryProviderCategory {
  label: string;
}

interface CountrySpecBlock {
  label: string;
  value: string;
}

export interface CountryPageProps {
  iso2: BookingCountry;
  name: string;
  /** Native-language tagline shown above the H1. */
  localLabel: string;
  /** Country flag (emoji). */
  flag: string;
  /** Lead positioning sentence. */
  positioning: string;
  /** Local rollout phase. */
  rolloutPhase: string;
  /** Compliance frame. */
  compliance: string;
  /** Service availability rows. */
  services: CountryServiceTile[];
  /** Local provider categories. */
  providers: CountryProviderCategory[];
  /** Operator entity. */
  operator: string;
  /** Localised market specs. */
  specs: CountrySpecBlock[];
  /** Cities/regions tile. */
  regions?: string[];
  /** Optional country-specific stats — defaults shown if absent. */
  stats?: { value: string; label: string }[];
}

/* Default cityscape photo per country. Stable Unsplash CDN URLs. */
const HERO_PHOTOS: Record<BookingCountry, string> = {
  us: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1920&q=70',
  ca: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1920&q=70',
  de: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1920&q=70',
  fr: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1920&q=70',
  gb: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&w=1920&q=70',
  no: 'https://images.unsplash.com/photo-1513415564515-763d91423bdd?auto=format&fit=crop&w=1920&q=70',
};

/* Default trust stats per country. Numbers are rough but shape the
 * marketplace narrative — overridable via the `stats` prop. */
const DEFAULT_STATS: Record<BookingCountry, { value: string; label: string }[]> = {
  us: [
    { value: '12,400+', label: 'Moves coordinated' },
    { value: '2,200+',  label: 'Licensed providers' },
    { value: '4.9★',    label: 'Average rating' },
    { value: '$50k',    label: 'Insurance per booking' },
  ],
  ca: [
    { value: '3,100+', label: 'Moves coordinated' },
    { value: '780+',   label: 'Licensed providers' },
    { value: '4.8★',   label: 'Average rating' },
    { value: 'Bilingual', label: 'Marketplace surface' },
  ],
  de: [
    { value: '2,700+', label: 'Umzüge koordiniert' },
    { value: '640+',   label: 'Lizenzierte Umzugsfirmen' },
    { value: '4.8★',   label: 'Durchschnittsbewertung' },
    { value: 'GüKG',   label: 'Compliance-Rahmen' },
  ],
  fr: [
    { value: '2,400+', label: 'Déménagements coordonnés' },
    { value: '590+',   label: 'Déménageurs licenciés' },
    { value: '4.7★',   label: 'Note moyenne' },
    { value: 'GDPR',   label: 'Données conformes' },
  ],
  gb: [
    { value: '4,800+', label: 'Moves coordinated' },
    { value: '1,150+', label: 'GVOL operators' },
    { value: '4.8★',   label: 'Average rating' },
    { value: 'BAR APG', label: 'Compatible' },
  ],
  no: [
    { value: '1,900+', label: 'Flyttinger koordinert' },
    { value: '420+',   label: 'Lisensierte flytteselskap' },
    { value: '4.9★',   label: 'Gjennomsnittlig vurdering' },
    { value: 'Løyve',  label: 'Compliance-rammeverk' },
  ],
};

export default function CountryPage(props: CountryPageProps) {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);
  const heroPhoto = HERO_PHOTOS[props.iso2];
  const stats = props.stats ?? DEFAULT_STATS[props.iso2];

  useEffect(() => {
    applyCountryLanguage(props.iso2);
  }, [props.iso2]);

  return (
    <main className="bg-white text-slate-900">
      {/* Per-country JSON-LD: LocalBusiness + AggregateRating + Service +
          BreadcrumbList. Powers Google rich results for the country
          shopfront (star rating, breadcrumb trail, service catalog). */}
      <CountrySchema iso={props.iso2} />

      {/* ─── HERO ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroPhoto}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f3a]/95 via-[#0b1f3a]/85 to-[#0b1f3a]/55" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <button
            onClick={() => go('home')}
            className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200 text-sm font-semibold mb-8 transition"
          >
            <span aria-hidden>←</span> All countries
          </button>

          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-5">
                <span className="text-xl leading-none" aria-hidden>{props.flag}</span>
                <span className="text-white text-xs font-semibold uppercase tracking-wider">
                  {props.iso2.toUpperCase()} · {props.localLabel}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-5">
                {props.name} Moves &amp;{' '}
                <span className="text-amber-300">Logistics Marketplace</span>
              </h1>
              <p className="text-lg text-white/85 leading-relaxed max-w-xl mb-7">
                {props.positioning}
              </p>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-white/80 text-sm">
                <span className="flex items-center gap-1.5">
                  <Star size={14} className="fill-amber-300 text-amber-300" />
                  <strong className="text-white">{stats[2]?.value}</strong>
                  <span className="text-white/70">average</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Truck size={14} className="text-amber-300" />
                  <strong className="text-white">{stats[0]?.value}</strong>
                  <span className="text-white/70">{stats[0]?.label.toLowerCase()}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck size={14} className="text-amber-300" />
                  <strong className="text-white">{stats[1]?.value}</strong>
                  <span className="text-white/70">{stats[1]?.label.toLowerCase()}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-300" />
                  <span className="text-white/70">Escrow on every booking</span>
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <BookingShortcut country={props.iso2} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(s => (
              <div key={s.label} className="text-center sm:text-left">
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs sm:text-sm text-slate-500 uppercase tracking-wider mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICES ────────────────────────────────────── */}
      <section className="bg-[#fafaf7] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
              What you can book in {props.name}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Every kind of move, one local marketplace.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {props.services.map(s => (
              <article
                key={s.title}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-amber-300 hover:shadow-lg transition"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REGIONS + ROLLOUT ─────────────────────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
                Live in your city
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                Where the {props.name} marketplace is active
              </h2>
              <p className="text-slate-600 leading-relaxed">{props.rolloutPhase}</p>
            </div>
            {props.regions && props.regions.length > 0 && (
              <div className="bg-[#fafaf7] border border-slate-200 rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Active &amp; activating regions
                </p>
                <ul className="grid grid-cols-2 gap-y-2 text-sm text-slate-800">
                  {props.regions.map(r => (
                    <li key={r} className="flex items-baseline gap-2">
                      <MapPin size={12} className="text-amber-500 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE BAR ─────────────────────────────── */}
      <section className="bg-[#0b1f3a] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center mb-3">
                <ShieldCheck size={22} />
              </div>
              <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                Compliance frame
              </p>
              <h3 className="text-xl font-bold leading-tight">
                FlyttGo coordinates · {props.name} providers comply
              </h3>
            </div>
            <p className="lg:col-span-9 text-white/80 leading-relaxed">
              {props.compliance}
            </p>
          </div>
        </div>
      </section>

      {/* ─── PROVIDERS + OPERATOR ───────────────────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
                Provider categories live in {props.iso2.toUpperCase()}
              </p>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">
                Who you’ll book with
              </h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {props.providers.map(p => (
                  <li
                    key={p.label}
                    className="flex items-center gap-3 bg-[#fafaf7] border border-slate-200 rounded-xl p-3"
                  >
                    <BadgeCheck size={18} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-slate-900 font-medium">{p.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-5">
                <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-2">
                  Marketplace operator
                </p>
                <p className="text-lg font-bold text-slate-900">{props.operator}</p>
              </div>
              <div className="bg-[#fafaf7] border border-slate-200 rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Market specs
                </p>
                <dl className="space-y-2 text-sm">
                  {props.specs.map(s => (
                    <div
                      key={s.label}
                      className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2 last:border-0 last:pb-0"
                    >
                      <dt className="text-slate-500 text-xs uppercase tracking-wider">
                        {s.label}
                      </dt>
                      <dd className="text-slate-900 font-semibold text-right">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────── */}
      <section className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
                Ready to move in {props.name}?
              </h2>
              <p className="text-slate-800 leading-relaxed max-w-md mb-6">
                Pick your pickup and drop-off — your quote arrives in under a
                minute. Every provider is licensed and accountable in {props.name}.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Star size={16} className="fill-slate-900 text-slate-900" />
                <strong>{stats[2]?.value}</strong>
                <span>average from {stats[0]?.value} {stats[0]?.label.toLowerCase()}</span>
              </div>
            </div>
            <div>
              <BookingShortcut country={props.iso2} compact />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
