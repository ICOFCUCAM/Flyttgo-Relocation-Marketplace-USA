import React from 'react';
import { useApp } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';

const WORKFLOWS = [
  {
    title: 'Corporate employee relocation',
    body: 'Talent moves, lump-sum coordination, multi-country mobility packages, exception handling, and HRIS-friendly audit logs.',
  },
  {
    title: 'Government workforce mobility',
    body: 'Federal, state, and municipal workforce moves with bonded providers, audit-ready records, and consolidated procurement billing.',
  },
  {
    title: 'University relocation coordination',
    body: 'Student housing offices and registrars: international arrival corridors, semester mobility, and residence-hall move-in / move-out windows.',
  },
  {
    title: 'Project-based relocation support',
    body: 'Engineering, construction, energy, and entertainment projects — staged crew relocation, equipment storage, and cross-border coordination.',
  },
];

export default function EnterpriseRelocationPage() {
  const { setPage } = useApp();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="Enterprise relocation" />
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Procurement-grade relocation coordination
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 max-w-3xl">
            Enterprise, government, university, and project-based relocation
            workflows — coordinated across the United States, Canada, Germany,
            France, the United Kingdom, and Norway through one shared
            platform and one consolidated invoicing surface.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Workflow categories" />
          <div className="grid md:grid-cols-2 gap-px bg-slate-200">
            {WORKFLOWS.map(w => (
              <article
                key={w.title}
                className="bg-white p-8 flex flex-col gap-3 min-h-[200px]"
              >
                <h3 className="font-serif text-2xl text-slate-900">{w.title}</h3>
                <p className="text-slate-600 leading-relaxed">{w.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Operating layer" />
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { title: 'Centralised procurement', body: 'One contract, multi-country provider matching, vendor approval lists, and per-cost-center billing.' },
              { title: 'Audit-ready records', body: 'Procurement, jurisdiction, licence references, insurance disclosures, and signatures retained per coordinated relocation.' },
              { title: 'Consolidated invoicing', body: 'Monthly invoicing across markets and providers, with multi-currency reconciliation and ERP-friendly exports.' },
            ].map(b => (
              <div key={b.title}>
                <h3 className="font-serif text-2xl text-white mb-3">{b.title}</h3>
                <p className="text-slate-300 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.04" label="Get in touch" />
          <div className="grid md:grid-cols-2 gap-10 items-end">
            <h2 className="font-serif text-3xl lg:text-4xl leading-tight">
              For HR, mobility, procurement, and public-sector teams.
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setPage('contact')}
                className="px-6 py-3 bg-slate-900 text-white font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-700 transition"
              >
                Talk to FlyttGo
              </button>
              <button
                onClick={() => setPage('how-it-works')}
                className="px-6 py-3 border border-slate-900 text-slate-900 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition"
              >
                How it works
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
