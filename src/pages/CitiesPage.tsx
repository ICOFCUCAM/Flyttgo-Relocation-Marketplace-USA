import React from 'react';
import { useApp } from '../lib/store';
import { CITIES, ROLLOUT_PHASES } from '../lib/constants';

export default function CitiesPage() {
  const { setPage } = useApp();
  return (
    <div className="min-h-screen bg-white">

      <section className="bg-gradient-to-br from-[#0B2E59] to-[#1a4a8a] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium px-4 py-2 rounded-full mb-6">
            Geographic Rollout · United States
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">United States rollout plan</h1>
          <p className="text-white/75 text-lg max-w-3xl">
            FlyttGo Relocation Marketplace USA is rolling out across the United States in
            published phases. Each market activates only when verified provider density,
            compliance coverage, and demand validation thresholds are met.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-3 text-center">Phase 1 launch cities</h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10">Live now in five Sun Belt and Southeast markets.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CITIES.map(c => (
            <div key={c.slug} className="bg-white rounded-2xl p-5 border border-gray-100 text-center hover:shadow-xl transition">
              <div className="text-xs uppercase tracking-wider text-gray-400">{c.state}</div>
              <div className="text-xl font-extrabold text-[#0B2E59] mt-1">{c.name}</div>
              <div className="text-xs text-gray-500 mt-2">{c.drivers} verified providers</div>
              <div className="text-xs text-gray-500">{c.bookings} coordinated relocations</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-3 text-center">Expansion timeline</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-10">Published rollout plan through 2027 and beyond.</p>
          <div className="space-y-4">
            {ROLLOUT_PHASES.map(p => (
              <div key={p.phase} className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col md:flex-row md:items-center md:gap-6">
                <div className="md:w-32 mb-3 md:mb-0">
                  <div className="text-xs uppercase tracking-wider text-emerald-600 font-bold">Phase {p.phase}</div>
                  <div className="text-sm font-semibold text-[#0B2E59]">{p.label}</div>
                  <div className="text-xs text-gray-500">{p.timeline}</div>
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {p.cities.map(c => (
                    <span key={c} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B2E59] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Want FlyttGo in your city?</h2>
          <p className="text-white/75 max-w-xl mx-auto mb-6">
            Enterprise partners can fast-track market activation by committing relocation
            volume in a target metro.
          </p>
          <button onClick={() => setPage('enterprise-relocation')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">
            Talk to enterprise
          </button>
        </div>
      </section>

    </div>
  );
}
