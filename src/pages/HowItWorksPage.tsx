import React from 'react';
import { useApp } from '../lib/store';
import { HOW_IT_WORKS } from '../lib/constants';

const COORDINATION_LAYERS = [
  { title: 'Provider matching engine',  desc: 'Real-time availability across labor crews, licensed carriers, packers, and storage partners — filtered by location, capacity, and service scope.' },
  { title: 'Verification layer',        desc: 'FMCSA-aware checks for licensed carriers (USDOT/MC numbers, authority status). Identity, insurance and rating verification for independent crews.' },
  { title: 'Pricing transparency layer',desc: 'Line-item quotes from each provider with clear coordination fees. No hidden marketplace markups; all variances disclosed before booking.' },
  { title: 'Escrow & dispute layer',    desc: 'Payment held in escrow until the provider confirms completion and the customer accepts. Dispute window with platform mediation.' },
  { title: 'Audit & documentation layer',desc: 'Immutable booking records, status history, and downloadable coordination receipts for procurement, insurance and tax workflows.' },
];

export default function HowItWorksPage() {
  const { setPage } = useApp();
  return (
    <div className="min-h-screen bg-white">

      <section className="bg-gradient-to-br from-[#0B2E59] to-[#1a4a8a] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium px-4 py-2 rounded-full mb-6">
            How the marketplace works
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">From inquiry to confirmed coordination</h1>
          <p className="text-white/75 text-lg max-w-2xl mx-auto">
            FlyttGo coordinates relocation providers across the US through five integrated
            layers — matching, verification, pricing, escrow, and audit.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">The customer flow</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HOW_IT_WORKS.map(step => (
            <div key={step.step} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold mb-4">{step.step}</div>
              <h3 className="font-bold text-[#0B2E59] mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">Five coordination layers</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {COORDINATION_LAYERS.map(l => (
              <div key={l.title} className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-[#0B2E59] mb-2">{l.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B2E59] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Ready to coordinate your relocation?</h2>
          <p className="text-white/75 max-w-xl mx-auto mb-6">
            Describe your move, compare verified providers, and book under escrow.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => setPage('booking')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">Start a relocation</button>
            <button onClick={() => setPage('compliance')} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition">Compliance details</button>
          </div>
        </div>
      </section>

    </div>
  );
}
