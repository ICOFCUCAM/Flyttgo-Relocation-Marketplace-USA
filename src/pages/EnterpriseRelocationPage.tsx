import React from 'react';
import { useApp } from '../lib/store';

const PROGRAMS = [
  { title: 'Corporate mobility programs', desc: 'Talent relocation packages, lump-sum coordination, exception workflows, and HRIS-friendly audit logs.' },
  { title: 'Multi-site operations',       desc: 'Coordinate office moves, equipment relocations, and warehouse staging across distributed US sites.' },
  { title: 'University & student housing',desc: 'Move-in / move-out logistics, group rates, and dedicated coordinators for residence life teams.' },
  { title: 'Government & institutional',  desc: 'Procurement-aligned coordination with documented carrier compliance for grant-funded relocations.' },
];

const CAPABILITIES = [
  { title: 'Centralized procurement',     desc: 'Single contract covers an unlimited number of relocations across all FlyttGo markets — with budget guardrails per cost center.' },
  { title: 'Audit-ready records',         desc: 'Immutable booking history, carrier authority snapshots, and downloadable coordination receipts for every relocation.' },
  { title: 'Consolidated invoicing',      desc: 'Monthly invoices grouped by department or project code. Net 30 / Net 60 payment terms available.' },
  { title: 'Approval workflows',          desc: 'Multi-step approval chains, spend caps, and policy enforcement before any provider is dispatched.' },
  { title: 'API & SSO',                   desc: 'REST API and SAML/OIDC SSO for HRIS, ERP, and procurement system integration.' },
  { title: 'Dedicated coordination team', desc: 'A named FlyttGo coordinator on retainer for high-volume programs.' },
];

export default function EnterpriseRelocationPage() {
  const { setPage } = useApp();
  return (
    <div className="min-h-screen bg-white">

      <section className="bg-gradient-to-br from-[#0B2E59] to-[#1a4a8a] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium px-4 py-2 rounded-full mb-6">
            Enterprise Relocation Coordination
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">Relocation infrastructure for institutional buyers</h1>
          <p className="text-white/75 text-lg max-w-3xl">
            FlyttGo Relocation Marketplace USA serves corporate mobility programs, university
            housing offices, and institutional procurement teams that move people, teams, and
            equipment at scale across the United States.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => setPage('contact')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">Talk to enterprise</button>
            <button onClick={() => setPage('compliance')} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition">Compliance posture</button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">Programs we serve</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {PROGRAMS.map(p => (
            <div key={p.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition">
              <h3 className="font-bold text-[#0B2E59] mb-2">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">Enterprise capabilities</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map(c => (
              <div key={c.title} className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-[#0B2E59] mb-2">{c.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B2E59] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Ready to centralize your relocation procurement?</h2>
          <p className="text-white/75 max-w-xl mx-auto mb-6">
            Our enterprise team will scope your program and tailor the coordination workflow.
          </p>
          <button onClick={() => setPage('contact')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">Contact enterprise</button>
        </div>
      </section>

    </div>
  );
}
