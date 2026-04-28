import React from 'react';
import { useApp } from '../../lib/store';
import type { Page } from '../../lib/store';

/**
 * Section-index label in the FlyttGo Global editorial design system.
 * Renders as a JetBrains Mono code label so every section reads as
 * a numbered platform surface (GLRM.01, GLRM.02, …) rather than a
 * conventional marketing landing block.
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
  /** ISO-3166-1 alpha-2 (used for the deployment node id). */
  iso2: string;
  /** Country name displayed in headers (e.g. "United States"). */
  name: string;
  /** Native-language adjective for the deployment node label. */
  localLabel: string;
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
  /** Optional list of representative cities/regions for the deployment map. */
  regions?: string[];
}

/**
 * Country deployment surface.
 *
 * Renders an editorial "regional deployment page" in the spirit of
 * AWS regional pages and Stripe country availability surfaces — the
 * country isn't a marketing site, it's a documented marketplace
 * deployment node with its own compliance, service availability,
 * provider categories, and operator disclosure.
 */
export default function CountryPage(props: CountryPageProps) {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* GLRM.01 — Deployment masthead */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="Regional deployment" />
          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-700 mb-4">
                {props.iso2} · {props.localLabel}
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight text-slate-900">
                {props.name} Moves &amp; Logistics
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-700 max-w-3xl">
                {props.positioning}
              </p>
            </div>
            <div className="lg:col-span-4">
              <dl className="border-l border-slate-300 pl-6 space-y-4 font-mono text-sm">
                {props.specs.map(s => (
                  <div key={s.label} className="flex flex-col">
                    <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {s.label}
                    </dt>
                    <dd className="text-slate-900">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* GLRM.02 — Rollout phase */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Market rollout" />
          <div className="grid md:grid-cols-2 gap-10">
            <h2 className="font-serif text-3xl lg:text-4xl leading-tight text-slate-900">
              Geographic deployment cadence
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>{props.rolloutPhase}</p>
              {props.regions && props.regions.length > 0 && (
                <ul className="grid grid-cols-2 gap-y-2 font-mono text-sm text-slate-800 mt-6">
                  {props.regions.map(r => (
                    <li key={r} className="flex items-baseline gap-2">
                      <span className="h-1 w-1 bg-slate-400" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* GLRM.03 — Compliance positioning */}
      <section className="border-b border-slate-200 bg-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Compliance frame" />
          <div className="grid md:grid-cols-2 gap-10">
            <h2 className="font-serif text-3xl lg:text-4xl leading-tight text-white">
              Jurisdictional awareness
            </h2>
            <div className="space-y-4 leading-relaxed text-slate-300">
              <p>{props.compliance}</p>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                FlyttGo coordinates · Providers comply
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GLRM.04 — Service availability */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.04" label="Service availability" />
          <h2 className="font-serif text-3xl lg:text-4xl leading-tight text-slate-900 mb-10">
            Coordination categories live in {props.name}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200">
            {props.services.map(s => (
              <article
                key={s.title}
                className="bg-white p-6 flex flex-col gap-3 min-h-[180px]"
              >
                <h3 className="font-serif text-xl text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {s.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GLRM.05 — Provider categories */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.05" label="Provider categories" />
          <div className="grid md:grid-cols-2 gap-10">
            <h2 className="font-serif text-3xl lg:text-4xl leading-tight text-slate-900">
              Local marketplace participants
            </h2>
            <ul className="space-y-3 font-mono text-sm">
              {props.providers.map(p => (
                <li
                  key={p.label}
                  className="flex items-baseline gap-3 border-b border-slate-200 pb-3"
                >
                  <span className="text-slate-500">→</span>
                  <span className="text-slate-900">{p.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* GLRM.06 — Operator disclosure */}
      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.06" label="Operator disclosure" />
          <div className="grid md:grid-cols-2 gap-10 items-end">
            <div>
              <h2 className="font-serif text-3xl lg:text-4xl leading-tight text-slate-900">
                Marketplace operator for {props.name}
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
                digital coordination platform connecting customers with independent
                licensed relocation providers across multiple jurisdictions worldwide.
                Service providers are responsible for compliance with their national
                licensing, taxation, insurance, and regulatory requirements.
              </p>
            </div>
            <div className="font-mono text-sm border-l border-slate-300 pl-6">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
                Operating entity
              </p>
              <p className="text-slate-900">{props.operator}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-12">
            <button
              onClick={() => go('how-it-works')}
              className="px-6 py-3 bg-slate-900 text-white font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-700 transition"
            >
              How it works
            </button>
            <button
              onClick={() => go('providers')}
              className="px-6 py-3 border border-slate-900 text-slate-900 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition"
            >
              For providers
            </button>
            <button
              onClick={() => go('compliance')}
              className="px-6 py-3 border border-slate-300 text-slate-700 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition"
            >
              Compliance frame
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
