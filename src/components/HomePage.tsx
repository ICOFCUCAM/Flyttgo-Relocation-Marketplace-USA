import React from 'react';
import { useApp } from '../lib/store';
import type { Page } from '../lib/store';
import WorldDeploymentMap from './global/WorldDeploymentMap';
import { SectionIndex } from './global/CountryPage';
import {
  GLOBAL_SERVICES,
  GLOBAL_MARKETS,
  GLOBAL_ROLLOUT,
  GLOBAL_PROVIDER_CATEGORIES,
} from '../lib/constants';

export default function HomePage() {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* GLRM.00 — Editorial masthead with deployment map */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="flex items-baseline gap-3 mb-8 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <span className="text-slate-900 font-semibold">GLRM.00</span>
            <span className="h-px w-12 bg-slate-300" aria-hidden />
            <span>Global Logistics &amp; Relocation Marketplace</span>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-slate-900">
                A coordination layer for global relocation, not a moving company.
              </h1>
              <p className="mt-8 text-lg leading-relaxed text-slate-700 max-w-2xl">
                FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
                digital coordination platform connecting customers with independent
                licensed relocation providers across multiple jurisdictions worldwide.
                Service providers are responsible for compliance with their national
                licensing, taxation, insurance, and regulatory requirements.
              </p>
              <div className="flex flex-wrap gap-4 mt-10">
                <button
                  onClick={() => go('booking')}
                  className="px-6 py-3 bg-slate-900 text-white font-mono text-xs uppercase tracking-[0.2em] hover:bg-slate-700 transition"
                >
                  Start a coordination
                </button>
                <button
                  onClick={() => go('how-it-works')}
                  className="px-6 py-3 border border-slate-900 text-slate-900 font-mono text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition"
                >
                  How it works
                </button>
                <button
                  onClick={() => go('compliance')}
                  className="px-6 py-3 border border-slate-300 text-slate-700 font-mono text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition"
                >
                  Compliance frame
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="border border-slate-200 bg-white p-4">
                <WorldDeploymentMap />
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Deployment nodes · United States · Canada · Germany · France · United Kingdom · Norway
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* GLRM.01 — Service stack */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="Marketplace service stack" />
          <div className="grid md:grid-cols-2 gap-10 items-end mb-12">
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight">
              One coordination layer. Nine service categories. Six markets.
            </h2>
            <p className="text-slate-600 leading-relaxed">
              The service stack is consistent across every deployment node. Local
              licensed providers fulfil the work; the FlyttGo platform handles the
              matching, the audit trail, and the consolidated invoicing.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200">
            {GLOBAL_SERVICES.map(s => (
              <article
                key={s.title}
                className="bg-white p-6 flex flex-col gap-3 min-h-[170px]"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
                  {s.code}
                </p>
                <h3 className="font-serif text-xl text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{s.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GLRM.02 — Markets grid */}
      <section className="border-b border-slate-200 bg-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Markets" />
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight text-white mb-12">
            Country deployment nodes
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-800">
            {GLOBAL_MARKETS.map(m => (
              <button
                key={m.iso}
                onClick={() => go(m.route)}
                className="bg-slate-900 text-left p-6 flex flex-col gap-3 min-h-[180px] hover:bg-slate-800 transition group"
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">
                  {m.iso} · {m.phaseLabel}
                </p>
                <h3 className="font-serif text-2xl text-white group-hover:text-emerald-300 transition">
                  {m.name} Moves &amp; Logistics
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{m.tagline}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* GLRM.03 — Customer workflow */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Customer workflow" />
          <ol className="space-y-px bg-slate-200">
            {[
              { n: '01', t: 'Enter relocation details' },
              { n: '02', t: 'Match with independent licensed providers' },
              { n: '03', t: 'Compare service options' },
              { n: '04', t: 'Select partners' },
              { n: '05', t: 'Coordinate the relocation' },
            ].map(s => (
              <li
                key={s.n}
                className="bg-white grid md:grid-cols-12 gap-6 p-6 items-baseline"
              >
                <div className="md:col-span-2 font-mono text-2xl font-semibold">
                  {s.n}
                </div>
                <h3 className="md:col-span-10 font-serif text-2xl text-slate-900">
                  {s.t}
                </h3>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-4">
            <button
              onClick={() => go('how-it-works')}
              className="px-6 py-3 bg-slate-900 text-white font-mono text-xs uppercase tracking-[0.2em] hover:bg-slate-700 transition"
            >
              Read the full workflow
            </button>
            <button
              onClick={() => go('providers')}
              className="px-6 py-3 border border-slate-300 text-slate-700 font-mono text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition"
            >
              For providers
            </button>
          </div>
        </div>
      </section>

      {/* GLRM.04 — Rollout timeline */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.04" label="Global rollout" />
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight mb-12">
            Phased deployment through 2030.
          </h2>
          <ol className="space-y-px bg-slate-300">
            {GLOBAL_ROLLOUT.map(p => (
              <li
                key={p.phase}
                className="bg-white grid md:grid-cols-12 gap-6 p-6 items-start"
              >
                <p className="md:col-span-2 font-mono text-xs uppercase tracking-[0.18em] text-emerald-700">
                  {p.timeline}
                </p>
                <h3 className="md:col-span-3 font-serif text-2xl text-slate-900">
                  {p.phase}
                </h3>
                <p className="md:col-span-7 text-slate-600 leading-relaxed">
                  {p.scope}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* GLRM.05 — Provider categories */}
      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.05" label="Provider categories" />
          <div className="grid md:grid-cols-2 gap-10 items-end mb-12">
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight">
              Marketplace participants are licensed in their own jurisdictions.
            </h2>
            <p className="text-slate-600 leading-relaxed">
              FlyttGo coordinates · Providers comply. Each category surfaces the
              operator licence references the local jurisdiction expects.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-3 font-mono text-sm">
            {GLOBAL_PROVIDER_CATEGORIES.map(c => (
              <li
                key={c}
                className="flex items-baseline gap-3 border-b border-slate-200 pb-3"
              >
                <span className="text-slate-400">→</span>
                <span className="text-slate-900">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* GLRM.06 — Operator disclosure */}
      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.06" label="Operator structure" />
          <div className="grid md:grid-cols-2 gap-10">
            <div className="border-l border-slate-300 pl-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
                North American marketplace
              </p>
              <h3 className="font-serif text-2xl text-slate-900">Wankong LLC</h3>
              <p className="text-sm text-slate-500 mt-1">Delaware, United States</p>
            </div>
            <div className="border-l border-slate-300 pl-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
                European marketplace
              </p>
              <h3 className="font-serif text-2xl text-slate-900">FlyttGo Technologies Group</h3>
              <p className="text-sm text-slate-500 mt-1">Norway · EEA</p>
            </div>
          </div>

          <p className="mt-12 text-slate-600 leading-relaxed max-w-3xl">
            FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
            digital coordination platform connecting customers with independent
            licensed relocation providers across multiple jurisdictions worldwide.
            Service providers are responsible for compliance with their national
            licensing, taxation, insurance, and regulatory requirements.
          </p>
        </div>
      </section>
    </main>
  );
}
