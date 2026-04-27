import React from 'react';
import { useApp } from '../lib/store';

const PROVIDER_TYPES = [
  { title: 'Licensed moving carriers',     desc: 'USDOT/MC-registered interstate and intrastate carriers. Authority status auto-verified against FMCSA data.', icon: 'truck' },
  { title: 'Independent labor crews',      desc: 'Vetted hourly moving labor crews for loading, unloading, and in-home moves. Bring-your-own-truck friendly.', icon: 'users' },
  { title: 'Packing service providers',    desc: 'Independent packing crews, materials, and crating specialists for residential and commercial relocations.', icon: 'package' },
  { title: 'Self-storage operators',       desc: 'Storage facility partners integrated into multi-stage move plans for staged or interstate timelines.', icon: 'box' },
  { title: 'Truck rental partners',        desc: 'National and regional truck rental partners surfaced alongside labor and crew bookings.', icon: 'rental' },
  { title: 'Insurance providers',          desc: 'Valuation and third-party transit insurance options disclosed at the time of booking.', icon: 'shield' },
];

const ONBOARDING = [
  { step: '1', title: 'Apply',                desc: 'Complete the provider application with your business identity, authority numbers, insurance, and service categories.' },
  { step: '2', title: 'Verification',         desc: 'FMCSA authority validation for carriers. Identity, insurance and references for crews and other categories.' },
  { step: '3', title: 'Profile activation',   desc: 'Set service area, capacity, calendar, and pricing. The matching engine starts surfacing your profile to qualified leads.' },
  { step: '4', title: 'Operate & get paid',   desc: 'Accept matched relocations, complete the work, confirm in-app, and receive escrow payout per platform terms.' },
];

export default function ProvidersPage() {
  const { setPage } = useApp();
  return (
    <div className="min-h-screen bg-white">

      <section className="bg-gradient-to-br from-[#0B2E59] to-[#1a4a8a] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium px-4 py-2 rounded-full mb-6">
            For Providers
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">Operate on the marketplace</h1>
          <p className="text-white/75 text-lg max-w-3xl">
            FlyttGo Relocation Marketplace USA welcomes USDOT-licensed carriers, independent
            moving crews, packers, storage operators, truck rental networks, and insurance
            providers across the United States.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">Provider categories</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROVIDER_TYPES.map(p => (
            <div key={p.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:border-emerald-200 transition">
              <div className="text-xs uppercase tracking-wider text-emerald-600 font-bold mb-2">{p.icon}</div>
              <h3 className="font-bold text-[#0B2E59] mb-2">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-[#0B2E59] mb-10 text-center">Onboarding pipeline</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ONBOARDING.map(o => (
              <div key={o.step} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold mb-4">{o.step}</div>
                <h3 className="font-bold text-[#0B2E59] mb-2">{o.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{o.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B2E59] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">Apply to become a verified provider</h2>
          <p className="text-white/75 max-w-xl mx-auto mb-6">
            Carriers, crews, and operators with active authority and insurance are encouraged to apply.
          </p>
          <button onClick={() => setPage('driver-onboarding')} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition">
            Open the application
          </button>
        </div>
      </section>

    </div>
  );
}
