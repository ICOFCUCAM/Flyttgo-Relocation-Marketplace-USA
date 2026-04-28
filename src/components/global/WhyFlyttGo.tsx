import React from 'react';
import { ShieldCheck, BadgeCheck, Lock, Headphones } from 'lucide-react';

/**
 * Four trust pillars surfaced on the home page above the customer
 * reviews section. Mirrors the conversion convention shared by every
 * mature marketplace: we tell the visitor *why* they should buy here
 * before showing them what other people said.
 */
const PILLARS = [
  {
    icon: BadgeCheck,
    title: 'Verified licensed providers',
    body:  'Every mover, packer and storage partner is checked against the local operator-licence registry — USDOT/MC, GVOL, GüKG, registre des transporteurs, yrkestransportløyve.',
  },
  {
    icon: ShieldCheck,
    title: 'Insurance up to $50,000',
    body:  'Every booking is covered by goods-in-transit insurance of up to $50,000, surfaced before you confirm. Choose extra valuation cover if you are moving high-value items.',
  },
  {
    icon: Lock,
    title: 'Escrow on every booking',
    body:  'Your money is held in escrow by Stripe until the move is complete and you confirm. Cash bookings hold a 30% deposit only; the rest is paid in cash to your driver.',
  },
  {
    icon: Headphones,
    title: '24/7 human support',
    body:  'Local-language support seven days a week, by chat, WhatsApp and phone. Average response time is under three minutes, even on weekends.',
  },
];

export default function WhyFlyttGo() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
            Why FlyttGo
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built around four promises.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map(p => (
            <article
              key={p.title}
              className="bg-[#fafaf7] hover:bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg rounded-2xl p-6 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <p.icon size={22} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
