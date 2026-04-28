import React from 'react';
import { Globe2, Sparkles, MapPin } from 'lucide-react';
import { useApp } from '../lib/store';
import { Section, Eyebrow, Pill } from '../components/ds';
import { COUNTRY_PROFILES } from '../lib/country-profiles';
import { CITY_MULTIPLIERS } from '../lib/pricing-engine';
import InstitutionalCTAs from '../components/global/InstitutionalCTAs';

/* ─────────────────────────────────────────────────────────────────
 * <DeploymentRegionsPage> — /deployment-regions
 *
 * Single-page overview of every market FlyttGo deploys in. Three
 * tiers of coverage to set expectations for institutional buyers:
 *
 *   Live coverage         — pricing engine + provider catalogue
 *                            seeded; bookings settle today.
 *   Partner coverage      — partner provider network onboarded
 *                            but the country shopfront / booking
 *                            flow isn't yet activated. Used for
 *                            RFP / pilot discussions.
 *   Expansion-ready       — pricing data ready, partner pipeline
 *                            building. Pilot discussions welcome.
 *
 * Powered off the canonical country profiles + pricing engine
 * data — adding a new market here is a one-row addition to those
 * modules, no separate page needed.
 * ───────────────────────────────────────────────────────────────── */

type Coverage = 'live' | 'partner' | 'expansion-ready';

const COVERAGE_BY_COUNTRY: Record<string, Coverage> = {
  us: 'live', ca: 'live', gb: 'live', de: 'live', fr: 'live', no: 'live',
  ae: 'partner',
  ng: 'partner', ke: 'partner',
};

const EXPANSION_READY_COUNTRIES = [
  { code: 'cm', name: 'Cameroon',  flag: '🇨🇲' },
  { code: 'ug', name: 'Uganda',    flag: '🇺🇬' },
  { code: 'et', name: 'Ethiopia',  flag: '🇪🇹' },
  { code: 'in', name: 'India',     flag: '🇮🇳' },
];

const COVERAGE_TONE: Record<Coverage, { bg: string; text: string; label: string }> = {
  'live':            { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Live coverage' },
  'partner':         { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Partner coverage' },
  'expansion-ready': { bg: 'bg-blue-50',    text: 'text-blue-700',    label: 'Expansion-ready' },
};

export default function DeploymentRegionsPage() {
  const { setPage } = useApp();
  return (
    <main className="bg-white text-ink-900">
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><Globe2 size={12} /> Deployment regions</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Where FlyttGo settles bookings today.
        </h1>
        <p className="text-white/75 max-w-2xl text-lg leading-relaxed">
          Live coverage in {COUNTRY_PROFILES.filter(p => COVERAGE_BY_COUNTRY[p.code] === 'live').length} markets.
          Partner-onboarded coverage in {COUNTRY_PROFILES.filter(p => COVERAGE_BY_COUNTRY[p.code] === 'partner').length} more.
          Expansion-ready in {EXPANSION_READY_COUNTRIES.length} additional countries
          for institutional pilot programmes.
        </p>
        <div className="mt-7">
          <InstitutionalCTAs only={['submit-procurement-inquiry','start-pilot-deployment']} emphasizePrimary />
        </div>
      </Section>

      {/* COUNTRY GRID */}
      <Section tone="canvas" size="default">
        <Eyebrow tone="brand" className="mb-1">Live + partner coverage</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-6">
          {COUNTRY_PROFILES.length} markets · {COUNTRY_PROFILES.filter(p => COVERAGE_BY_COUNTRY[p.code]).length} active
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COUNTRY_PROFILES.map(p => {
            const coverage = COVERAGE_BY_COUNTRY[p.code] ?? 'partner';
            const tone     = COVERAGE_TONE[coverage];
            const cityCount = Object.keys(CITY_MULTIPLIERS[p.code] ?? {}).length;
            return (
              <article key={p.code} className="bg-surface-soft border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-2xl mb-1" aria-hidden>{p.flag}</p>
                    <h3 className="font-extrabold text-ink-900">{p.name}</h3>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 ${tone.bg} ${tone.text}`}>
                    {tone.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{p.marketNote}</p>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-3 border-t border-slate-200">
                  <span>{p.currency} · {p.taxMode.replace('-', ' ')}</span>
                  <span><MapPin size={10} className="inline mr-1" />{cityCount} cities seeded</span>
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      {/* EXPANSION READY */}
      <Section tone="soft" size="default">
        <Eyebrow tone="brand" className="mb-1"><Sparkles size={11} className="inline mr-1" /> Expansion-ready · pilot discussions welcome</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-6">
          Next markets in the pipeline
        </h2>
        <p className="text-slate-600 max-w-2xl mb-6">
          Pricing data is staged in the engine; partner-provider pipeline is
          building. Institutional buyers running pilot programmes in these
          markets get priority access to onboarding the local provider
          network alongside their deployment.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EXPANSION_READY_COUNTRIES.map(c => (
            <article key={c.code} className="bg-white border border-blue-200 rounded-2xl p-5">
              <p className="text-2xl mb-1" aria-hidden>{c.flag}</p>
              <h3 className="font-extrabold text-ink-900 mb-1">{c.name}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 ${COVERAGE_TONE['expansion-ready'].bg} ${COVERAGE_TONE['expansion-ready'].text}`}>
                {COVERAGE_TONE['expansion-ready'].label}
              </span>
            </article>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section tone="canvas" size="default" containerSize="narrow">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-ink-900 mb-3">
            Need a market we don't list?
          </h2>
          <p className="text-slate-600 mb-6">
            Pilot frameworks include market-onboarding work as part of the
            engagement. Tell us where you need coverage and we'll scope the
            pilot.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setPage('procurement-rfp')}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition shadow-medium"
            >
              Submit procurement inquiry
            </button>
            <button
              onClick={() => setPage('pilot-deployment-programs')}
              className="px-6 py-3 bg-white border border-slate-200 text-ink-900 font-bold rounded-xl hover:border-ink-900 transition"
            >
              See pilot programmes
            </button>
          </div>
        </div>
      </Section>
    </main>
  );
}
