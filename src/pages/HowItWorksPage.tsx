import React from 'react';
import { useApp } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';

const STEPS = [
  {
    n: '01',
    title: 'Enter relocation details',
    body: 'Origin, destination, scope, scale, and timeline. The marketplace turns the brief into a coordinated plan across labor, carrier, storage, packing, vehicle rental, and insurance categories.',
  },
  {
    n: '02',
    title: 'Match with independent licensed providers',
    body: 'FlyttGo never delivers the move itself. Country-licensed providers — carriers, labor crews, storage networks, packing services — are matched against the brief.',
  },
  {
    n: '03',
    title: 'Compare service options',
    body: 'Transparent pricing, jurisdictional licence references (USDOT/MC, GüKG, GVOL, registre des transporteurs, yrkestransportløyve), and insurance options surfaced side-by-side.',
  },
  {
    n: '04',
    title: 'Select partners',
    body: 'Pick the providers and the service mix. Every selection is recorded with operator details, pricing breakdown, and the jurisdiction the provider is licensed in.',
  },
  {
    n: '05',
    title: 'Coordinate the relocation',
    body: 'Real-time coordination, status updates, escrow funds, and an audit-ready record retained for procurement, insurance, and tax purposes.',
  },
];

export default function HowItWorksPage() {
  const { setPage } = useApp();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="Customer workflow" />
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            How the global marketplace works
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 max-w-3xl">
            FlyttGo Global Logistics &amp; Relocation Marketplace is a coordination
            layer, not a moving company and not a trucking carrier. Customers
            describe their relocation; the platform matches them with
            independent licensed providers across the United States, Canada,
            Germany, France, the United Kingdom, and Norway.
          </p>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Five-step coordination" />
          <ol className="space-y-px bg-slate-200">
            {STEPS.map(s => (
              <li
                key={s.n}
                className="bg-white grid md:grid-cols-12 gap-6 p-8 items-start"
              >
                <div className="md:col-span-2 font-mono text-2xl font-semibold text-slate-900">
                  {s.n}
                </div>
                <h3 className="md:col-span-3 font-serif text-2xl text-slate-900">
                  {s.title}
                </h3>
                <p className="md:col-span-7 text-slate-600 leading-relaxed">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-slate-900 text-slate-100 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="What FlyttGo is, and isn't" />
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="font-serif text-2xl text-white mb-3">FlyttGo is</h3>
              <ul className="space-y-2 text-slate-300">
                <li>— A digital coordination marketplace.</li>
                <li>— A discovery and matching layer for licensed providers.</li>
                <li>— An audit-ready record of every coordinated relocation.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-serif text-2xl text-white mb-3">FlyttGo is not</h3>
              <ul className="space-y-2 text-slate-300">
                <li>— A moving company.</li>
                <li>— A trucking carrier or motor carrier.</li>
                <li>— Responsible for provider licensing, taxation, or insurance.</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap gap-4">
            <button
              onClick={() => setPage('booking')}
              className="px-6 py-3 bg-emerald-500 text-slate-900 font-mono text-xs uppercase tracking-[0.18em] hover:bg-emerald-400 transition"
            >
              Start a coordination
            </button>
            <button
              onClick={() => setPage('compliance')}
              className="px-6 py-3 border border-slate-300 text-slate-100 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-800 transition"
            >
              Compliance frame
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
