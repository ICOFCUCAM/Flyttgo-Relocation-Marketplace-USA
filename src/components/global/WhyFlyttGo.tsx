import React from 'react';
import { ShieldCheck, BadgeCheck, Lock, Headphones } from 'lucide-react';
import { Section, Eyebrow, SectionHeading } from '../ds';

/**
 * Four trust pillars surfaced on the home page. Refactored to use
 * the design-system primitives so spacing, typography, and tone read
 * identically to the rest of the marketplace.
 */
const PILLARS = [
  {
    icon:  BadgeCheck,
    title: 'Verified licensed providers',
    body:  'Every mover, packer and storage partner is checked against the local operator-licence registry — USDOT/MC, GVOL, GüKG, registre des transporteurs, yrkestransportløyve.',
  },
  {
    icon:  ShieldCheck,
    title: 'Insurance up to $50,000',
    body:  'Every booking is covered by goods-in-transit insurance of up to $50,000, surfaced before you confirm. Choose extra valuation cover if you are moving high-value items.',
  },
  {
    icon:  Lock,
    title: 'Escrow on every booking',
    body:  'Your money is held in escrow by Stripe until the move is complete and you confirm. Cash bookings hold a 30% deposit only; the rest is paid in cash to your driver.',
  },
  {
    icon:  Headphones,
    title: '24/7 human support',
    body:  'Local-language support seven days a week, by chat, WhatsApp and phone. Average response time is under three minutes, even on weekends.',
  },
];

export default function WhyFlyttGo() {
  return (
    <Section tone="canvas">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <Eyebrow>Why FlyttGo</Eyebrow>
        <SectionHeading>Built around four promises.</SectionHeading>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PILLARS.map(p => (
          <article
            key={p.title}
            className="bg-surface-soft hover:bg-surface-canvas border border-slate-200 hover:border-brand-400/60 hover:shadow-medium rounded-2xl p-6 transition-base ease-marketplace"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <p.icon size={22} />
            </div>
            <h3 className="font-bold text-ink-900 mb-2">{p.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
