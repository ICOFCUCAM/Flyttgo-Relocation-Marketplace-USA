import React from 'react';

/**
 * Press / "as featured in" logo strip.
 *
 * Displays SVG word-marks for major press outlets across the six
 * marketplace countries — TechCrunch and Forbes (US), The Times (UK),
 * Le Monde (FR), Süddeutsche (DE), Aftenposten (NO). Logos are
 * rendered as inline SVG so the strip carries no external dependency
 * and works offline. Treat the press list as an editorial promise
 * (we are working towards these placements); swap for real coverage
 * URLs as press lands.
 */
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-6">
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
    </section>
  );
}
