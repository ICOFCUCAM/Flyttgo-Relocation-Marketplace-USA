import React, { useEffect } from 'react';
import { useApp } from '../../lib/store';
import type { Page, BookingCountry } from '../../lib/store';
import { applyCountryLanguage } from '../../lib/i18n';
import BookingShortcut from './BookingShortcut';

/**
 * Section-index label kept around so any non-country surface that
 * imports it from this module (HowItWorks, Universities, etc.) keeps
 * working. New country pages don't render section indices any more —
 * the surface is a marketplace shopfront, not an editorial doc.
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
  /** ISO-3166-1 alpha-2 (drives address autocomplete + i18n locale). */
  iso2: BookingCountry;
  /** Country name displayed in headers (e.g. "United States"). */
  name: string;
  /** Native-language tagline shown right under the H1. */
  localLabel: string;
  /** Country flag (emoji). Lightweight — no extra dependency. */
  flag: string;
  /** One-sentence positioning statement for the country. */
  positioning: string;
  /** Local rollout phase — pulled into the rollout strip. */
  rolloutPhase: string;
  /** Compliance frame for this jurisdiction. */
  compliance: string;
  /** Service availability rows. */
  services: CountryServiceTile[];
  /** Local provider categories listed under marketplace participants. */
  providers: CountryProviderCategory[];
  /** Operator entity disclosed in the local footer band. */
  operator: string;
  /** Localised market specs — country code, currency, jurisdiction etc. */
  specs: CountrySpecBlock[];
  /** Optional list of representative cities/regions. */
  regions?: string[];
}

/**
 * Country deployment surface, marketplace-shopfront edition.
 *
 * The hero leads with a localised buy-now message and a country-scoped
 * BookingShortcut form. Below the hero we still keep the regional
 * deployment, service availability, provider categories, compliance
 * frame, and operator disclosure — but they read as supporting
 * context, not the main attraction.
 */
export default function CountryPage(props: CountryPageProps) {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);

  /* Switch the active i18n language when the customer enters this
   * country surface — Norwegian for /norway, German for /germany,
   * French for /france, English everywhere else. The change persists
   * to localStorage so the booking flow they continue into stays in
   * the same language. */
  useEffect(() => {
    applyCountryLanguage(props.iso2);
  }, [props.iso2]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ─── HERO — country shopfront with booking shortcut ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1420] via-[#1a2332] to-[#0d1420] text-white">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`grid-${props.iso2}`} width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${props.iso2})`} />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <button
                onClick={() => go('home')}
                className="inline-flex items-center gap-2 text-emerald-300 hover:text-emerald-200 text-sm font-semibold mb-6 transition"
              >
                <span aria-hidden>←</span> All countries
              </button>
              <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
                <span className="text-2xl leading-none" aria-hidden>{props.flag}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
                  {props.iso2.toUpperCase()} · {props.localLabel}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight mb-5">
                {props.name} Moves &amp; Logistics
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed max-w-xl mb-8">
                {props.positioning}
              </p>
              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Licensed providers · {props.iso2.toUpperCase()}-scoped addresses
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Escrow on every booking
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <BookingShortcut country={props.iso2} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SERVICE AVAILABILITY ───────────────────────────────── */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-3xl mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-700 mb-3">
              Service availability
            </p>
            <h2 className="font-serif text-3xl lg:text-4xl tracking-tight text-slate-900">
              Coordination categories live in {props.name}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {props.services.map(s => (
              <article
                key={s.title}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:bg-white hover:shadow-lg hover:border-emerald-300 transition"
              >
                <h3 className="font-serif text-lg text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── REGIONS + ROLLOUT ──────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-700 mb-3">
                Geographic deployment
              </p>
              <h2 className="font-serif text-3xl lg:text-4xl tracking-tight text-slate-900 mb-4">
                Where the {props.name} marketplace is live
              </h2>
              <p className="text-slate-600 leading-relaxed">{props.rolloutPhase}</p>
            </div>
            {props.regions && props.regions.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-4">
                  Active &amp; activating regions
                </p>
                <ul className="grid grid-cols-2 gap-y-2 font-mono text-sm text-slate-800">
                  {props.regions.map(r => (
                    <li key={r} className="flex items-baseline gap-2">
                      <span className="h-1 w-1 bg-emerald-500" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE FRAME ───────────────────────────────────── */}
      <section className="bg-[#0d1420] text-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-400 mb-3">
            Jurisdictional awareness
          </p>
          <h2 className="font-serif text-3xl lg:text-4xl tracking-tight text-white mb-6 max-w-3xl">
            FlyttGo coordinates · {props.name} providers comply
          </h2>
          <p className="text-slate-300 leading-relaxed max-w-3xl">{props.compliance}</p>
        </div>
      </section>

      {/* ─── PROVIDERS + OPERATOR + SPECS ────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-700 mb-3">
                Provider categories live in {props.iso2.toUpperCase()}
              </p>
              <h2 className="font-serif text-3xl lg:text-4xl tracking-tight text-slate-900 mb-6">
                Marketplace participants
              </h2>
              <ul className="space-y-2">
                {props.providers.map(p => (
                  <li
                    key={p.label}
                    className="flex items-baseline gap-3 border-b border-slate-200 pb-2 font-mono text-sm"
                  >
                    <span className="text-emerald-600">→</span>
                    <span className="text-slate-900">{p.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2">
                  Marketplace operator
                </p>
                <p className="font-serif text-lg text-slate-900">{props.operator}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-3">
                  Market specs
                </p>
                <dl className="space-y-2 font-mono text-sm">
                  {props.specs.map(s => (
                    <div key={s.label} className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                      <dt className="text-slate-500 text-xs uppercase tracking-[0.14em]">{s.label}</dt>
                      <dd className="text-slate-900 text-right">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM CTA — repeat the booking shortcut ───────────── */}
      <section className="bg-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-serif text-3xl lg:text-5xl tracking-tight mb-4">
                Ready to move in {props.name}?
              </h2>
              <p className="text-emerald-50 leading-relaxed max-w-md">
                Pick your pickup and drop-off — your quote is ready in under a
                minute. All providers are licensed and accountable in{' '}
                {props.name}.
              </p>
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
