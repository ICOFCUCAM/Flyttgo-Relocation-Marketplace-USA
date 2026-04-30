import { ShieldCheck, BadgeCheck, Lock, Globe2, Truck } from 'lucide-react';

/**
 * Press / trust strip — Section 7 in the homepage spec.
 *
 * Two layers in one component:
 *   1. Authority pills — USDOT, GVOL, EU licensed, escrow,
 *      $50k coverage. Short, strong, logistics-grade.
 *   2. "As featured in" press wordmarks — editorial promise
 *      (we are working towards these placements). Swap for real
 *      coverage URLs as press lands.
 *
 * Lives between the country marketplace cards (Section 6) and the
 * carbon offset module (Section 8).
 */

interface AuthorityPill {
  icon:  typeof ShieldCheck;
  label: string;
}

const AUTHORITY_PILLS: AuthorityPill[] = [
  { icon: BadgeCheck,  label: 'USDOT-compliant carriers' },
  { icon: Truck,       label: 'GVOL operators · UK' },
  { icon: Globe2,      label: 'EU licensed movers' },
  { icon: Lock,        label: 'Escrow-secured bookings' },
  { icon: ShieldCheck, label: '$50k shipment protection' },
];

export default function PressStrip() {
  const items: { name: string; subtitle: string }[] = [
    { name: 'TechCrunch',          subtitle: 'United States' },
    { name: 'FORBES',              subtitle: 'United States' },
    { name: 'The Times',           subtitle: 'United Kingdom' },
    { name: 'Le Monde',            subtitle: 'France' },
    { name: 'Süddeutsche',         subtitle: 'Germany' },
    { name: 'Aftenposten',         subtitle: 'Norway' },
  ];

  return (
    <section className="bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Authority pills — short, logistics-grade. */}
        <div>
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-5">
            Marketplace authority
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {AUTHORITY_PILLS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700"
              >
                <Icon size={13} className="text-amber-600" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Press wordmarks. */}
        <div className="border-t border-slate-100 pt-6">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-5">
            As featured in
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {items.map(item => (
              <div
                key={item.name}
                className="flex flex-col items-center group cursor-default"
                title={`Editorial coverage placeholder — ${item.subtitle}`}
              >
                <span className="text-lg sm:text-xl font-serif font-bold text-slate-400 group-hover:text-slate-700 transition-colors tracking-tight">
                  {item.name}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-300 mt-0.5">
                  {item.subtitle}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
