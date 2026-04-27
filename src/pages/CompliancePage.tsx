import React from 'react';
import { useApp } from '../lib/store';

const COMPLIANCE_PILLARS = [
  {
    title: 'FMCSA-aware carrier verification',
    desc: 'For carrier categories, FlyttGo validates USDOT and MC numbers, authority status, operating classification, and insurance filing visibility against publicly available FMCSA records before a carrier is activated on the marketplace.',
  },
  {
    title: 'USDOT transparency compatibility',
    desc: 'Carrier profiles surface the carrier\'s legal name, USDOT number, and authority status. Customers see who they are contracting with before booking — including the carrier\'s own customer-facing identity.',
  },
  {
    title: 'Insurance disclosure compatibility',
    desc: 'For each booking, the customer sees the carrier\'s declared cargo and liability insurance position, plus optional third-party valuation coverage available through the marketplace.',
  },
  {
    title: 'Independent contracting',
    desc: 'Customers contract directly with the licensed provider. FlyttGo facilitates the connection and processes payment under escrow but is not party to the underlying transportation contract.',
  },
];

const CLARIFICATIONS = [
  'FlyttGo is not a motor carrier, freight broker, or freight forwarder.',
  'FlyttGo does not own vehicles, employ drivers, or operate moving fleets.',
  'FlyttGo does not hold goods-in-transit insurance for customer cargo. Insurance is provided by the licensed carrier or by separately purchased third-party coverage.',
  'FlyttGo verifications are based on publicly available information and self-attested provider data. They are not warranties, endorsements, or guarantees of carrier performance.',
];

export default function CompliancePage() {
  const { setPage } = useApp();
  return (
    <div className="min-h-screen bg-white">

      <section className="bg-gradient-to-br from-[#0B2E59] to-[#1a4a8a] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium px-4 py-2 rounded-full mb-6">
            Compliance & Carrier Verification
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">Compliance posture</h1>
          <p className="text-white/75 text-lg max-w-3xl">
            FlyttGo Relocation Marketplace USA operates as a digital relocation coordination
            platform connecting customers with licensed moving providers. The platform is
            engineered around regulatory transparency rather than carrier substitution.
          </p>
        </div>
      </section>

      {/* CRITICAL DISCLOSURE */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl p-6">
          <h2 className="text-xl font-extrabold text-amber-900 mb-2">FlyttGo is not a motor carrier.</h2>
          <p className="text-amber-900/80 leading-relaxed">
            FlyttGo Relocation Marketplace USA is a digital coordination platform operated by
            Wankong LLC, Delaware. The platform connects customers with independent licensed
            moving providers, labor crews, packers, and storage operators. Transportation
            services are performed by the providers under their own authority — not by FlyttGo.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">Platform compliance pillars</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {COMPLIANCE_PILLARS.map(p => (
            <div key={p.title} className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-[#0B2E59] mb-2">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-6">Important clarifications</h2>
          <ul className="space-y-3">
            {CLARIFICATIONS.map(c => (
              <li key={c} className="flex gap-3 items-start bg-white rounded-xl p-5 border border-gray-100">
                <span className="text-emerald-600 font-bold flex-shrink-0">›</span>
                <span className="text-sm text-gray-700 leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white rounded-2xl p-8 border border-gray-100">
          <h2 className="text-2xl font-extrabold text-[#0B2E59] mb-3">Reference resources</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            For independent verification of any carrier, customers may consult the Federal Motor
            Carrier Safety Administration (FMCSA) and the Department of Transportation (USDOT)
            registries. Carrier profiles on FlyttGo display the carrier's USDOT number for
            this purpose.
          </p>
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
            <li>FMCSA SAFER carrier search (publicly available)</li>
            <li>USDOT carrier authority and insurance lookup</li>
            <li>State-level moving regulator filings, where applicable</li>
          </ul>
        </div>
      </section>

      <section className="bg-[#0B2E59] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Read the full Terms of Service</h2>
          <p className="text-white/75 max-w-xl mx-auto mb-6">The marketplace classification and liability framework are documented in our Terms of Service.</p>
          <button onClick={() => setPage('terms')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">View Terms of Service</button>
        </div>
      </section>

    </div>
  );
}
