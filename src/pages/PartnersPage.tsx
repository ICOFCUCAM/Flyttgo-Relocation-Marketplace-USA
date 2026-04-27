import React from 'react';
import { useApp } from '../lib/store';

const STACK = [
  { title: 'FlyttGo Marketplace Engine',  desc: 'The matching, pricing, and coordination layer connecting customers with verified relocation providers across the United States.' },
  { title: 'Payvera Payments Orchestration', desc: 'Escrow, payouts, dispute holds, and provider settlement. Multi-rail support for card, ACH, and wallet payments.' },
  { title: 'Workverge Workforce Coordination', desc: 'Scheduling, dispatch, and capacity tooling for labor crews and carrier fleets operating on the marketplace.' },
];

const ECOSYSTEM = [
  { category: 'Insurance partners',     desc: 'Third-party valuation and transit coverage providers integrated into the booking flow.' },
  { category: 'Storage networks',       desc: 'National and regional self-storage operators surfaced for staged and interstate timelines.' },
  { category: 'Truck rental partners',  desc: 'Truck rental availability layered alongside labor and crew bookings.' },
  { category: 'Accounting connectors',  desc: 'QuickBooks, NetSuite, and Xero integrations for receipts, invoicing, and tax-ready records.' },
  { category: 'Identity & verification',desc: 'KYC, business identity, and authority verification providers used during provider onboarding.' },
  { category: 'Mapping & routing',      desc: 'Address, distance, and route-time providers powering the quoting and tracking surfaces.' },
];

export default function PartnersPage() {
  const { setPage } = useApp();
  return (
    <div className="min-h-screen bg-white">

      <section className="bg-gradient-to-br from-[#0B2E59] to-[#1a4a8a] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium px-4 py-2 rounded-full mb-6">
            Partners & Ecosystem
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">An open ecosystem around the marketplace</h1>
          <p className="text-white/75 text-lg max-w-3xl">
            The FlyttGo Relocation Marketplace USA is built on a platform stack and interoperates
            with insurance, storage, rental, identity, and accounting partners across the United
            States.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">Platform stack</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STACK.map(s => (
            <div key={s.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition">
              <h3 className="font-bold text-[#0B2E59] mb-2">{s.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">Ecosystem categories</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ECOSYSTEM.map(e => (
              <div key={e.category} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-xs uppercase tracking-wider text-emerald-600 font-bold mb-2">Category</div>
                <h3 className="font-bold text-[#0B2E59] mb-2">{e.category}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B2E59] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Partner with FlyttGo</h2>
          <p className="text-white/75 max-w-xl mx-auto mb-6">
            Insurance carriers, storage networks, truck rental operators, and accounting platforms — get in touch about ecosystem integration.
          </p>
          <button onClick={() => setPage('contact')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">Contact partnerships</button>
        </div>
      </section>

    </div>
  );
}
