import React from 'react';
import { useApp } from '../lib/store';
import { SERVICES, CITIES, PARTICIPANTS } from '../lib/constants';

/* Marketplace landing — categories, providers, and entry points into the
 * FlyttGo Relocation Marketplace USA coordination layer. */
export default function MarketplacePage() {
  const { setPage } = useApp();

  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <section className="bg-gradient-to-br from-[#0B2E59] to-[#1a4a8a] text-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium px-4 py-2 rounded-full mb-6">
            Marketplace · United States
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
            One platform. Every relocation provider.
          </h1>
          <p className="text-white/75 text-lg max-w-3xl">
            FlyttGo Relocation Marketplace USA coordinates labor crews, USDOT-licensed carriers,
            packing services, storage networks, truck rental partners, and insurance providers
            in a single procurement layer. Operated by Wankong LLC, Delaware.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => setPage('booking')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">
              Start a relocation
            </button>
            <button onClick={() => setPage('how-it-works')} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition">
              How it works
            </button>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-3">Coordinated service categories</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            FlyttGo does not perform any of these services directly. The marketplace coordinates
            matching between customers and licensed independent providers.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map(s => (
            <div key={s.name} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition">
              <h3 className="font-bold text-[#0B2E59] mb-2">{s.name}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PARTICIPANTS */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-3">Marketplace participants</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              The platform serves both demand-side and supply-side participants across the US
              relocation ecosystem.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PARTICIPANTS.map(p => (
              <div key={p.id} className="bg-white rounded-xl p-5 border border-gray-100">
                <div className="text-xs uppercase tracking-wider text-emerald-600 font-bold mb-2">{p.icon}</div>
                <div className="font-semibold text-[#0B2E59]">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CITIES STRIP */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-wrap items-end justify-between mb-8 gap-3">
          <div>
            <h2 className="text-3xl font-extrabold text-[#0B2E59]">Phase 1 launch cities</h2>
            <p className="text-gray-500 mt-2">Initial US rollout footprint. Expansion timeline published on the Cities page.</p>
          </div>
          <button onClick={() => setPage('cities')} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">View rollout plan →</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {CITIES.map(c => (
            <div key={c.slug} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
              <div className="text-xs text-gray-400">{c.state}</div>
              <div className="font-bold text-[#0B2E59]">{c.name}</div>
              <div className="text-xs text-gray-500 mt-1">{c.drivers} providers · {c.bookings}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPLIANCE STRIP */}
      <section className="bg-[#0B2E59] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">FlyttGo is not a motor carrier</h2>
          <p className="text-white/75 max-w-2xl mx-auto">
            FlyttGo Relocation Marketplace USA is a digital coordination platform. Carriers
            on the platform hold their own USDOT and MC numbers. Customers contract directly
            with the licensed provider for any move.
          </p>
          <button onClick={() => setPage('compliance')} className="mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">
            Read compliance disclosures
          </button>
        </div>
      </section>

    </div>
  );
}
