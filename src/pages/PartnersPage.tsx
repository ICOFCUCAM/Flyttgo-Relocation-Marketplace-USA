import React from 'react';
import { useApp } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';

const ECOSYSTEM = [
  { title: 'Payvera Payments Orchestration',  body: 'Booking deposits, multi-currency escrow holds, and provider payouts orchestrated through the Payvera payments rail.' },
  { title: 'Workverge Workforce Coordination', body: 'Crew rostering, shift assembly, and labor-only crew dispatch coordination across independent relocation teams.' },
  { title: 'Insurance carriers',               body: 'Valuation and third-party transit insurance options surfaced at coordination time for every market.' },
  { title: 'Storage networks',                 body: 'Self-storage, bonded warehouse, and staging operators integrated into multi-stage move plans.' },
  { title: 'Freight forwarders',               body: 'Cross-border freight, customs documentation coordination, and consolidation partners.' },
  { title: 'Accounting & ERP connectors',      body: 'Procurement-grade exports for HRIS, ERP, and accounting systems used by enterprise customers.' },
];

export default function PartnersPage() {
  const { setPage } = useApp();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="Partners &amp; ecosystem" />
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Ecosystem integrations
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 max-w-3xl">
            FlyttGo Global Logistics &amp; Relocation Marketplace integrates with payment rails,
            workforce coordination, insurance, storage networks, freight forwarders, and
            accounting connectors so customers and providers operate from a single coordination
            surface.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Ecosystem layers" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200">
            {ECOSYSTEM.map(e => (
              <article
                key={e.title}
                className="bg-white p-6 flex flex-col gap-3 min-h-[180px]"
              >
                <h3 className="font-serif text-xl text-slate-900">{e.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{e.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Talk to FlyttGo" />
          <div className="grid md:grid-cols-2 gap-10 items-end">
            <h2 className="font-serif text-3xl md:text-4xl leading-tight">
              Build on the FlyttGo coordination layer.
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setPage('contact')}
                className="px-6 py-3 bg-slate-900 text-white font-mono text-xs uppercase tracking-[0.2em] hover:bg-slate-700 transition"
              >
                Contact partnerships
              </button>
              <button
                onClick={() => setPage('compliance')}
                className="px-6 py-3 border border-slate-900 text-slate-900 font-mono text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition"
              >
                Compliance frame
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
