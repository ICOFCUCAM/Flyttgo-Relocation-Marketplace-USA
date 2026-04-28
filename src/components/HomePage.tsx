import React from 'react';
import { useApp } from '../lib/store';
import type { Page } from '../lib/store';
import { GLOBAL_MARKETS, GLOBAL_SERVICES, GLOBAL_ROLLOUT } from '../lib/constants';

/* ─────────────────────────────────────────────
 *  Country flag emojis — used inside the country tiles. Keeping them
 *  inline (rather than dragging in an icon set) keeps the homepage
 *  fast and avoids a dependency for what is purely a marketing
 *  shopfront surface.
 * ───────────────────────────────────────────── */
const COUNTRY_FLAG: Record<string, string> = {
  US: '🇺🇸', CA: '🇨🇦', DE: '🇩🇪', FR: '🇫🇷', GB: '🇬🇧', NO: '🇳🇴',
};

/* Bilingual short pitch shown on each country tile. First line is the
 * national language, second is English. Together they signal that the
 * country surface is localised on entry. */
const COUNTRY_TILE_PITCH: Record<string, { native: string; english: string }> = {
  US: { native: 'Move anywhere across the United States.',           english: 'Licensed carriers · Labor crews · Storage · Insurance' },
  CA: { native: 'Move across Canada — Toronto, Montréal, Vancouver.', english: 'Licensed carriers · Labor crews · Storage · Bilingual' },
  DE: { native: 'Umziehen — bundesweit, an einem Tag oder international.', english: 'Lizenzierte Umzugsfirmen · Umzugshelfer · Lager · Versicherung' },
  FR: { native: 'Déménagez partout en France.',                       english: 'Déménageurs licenciés · Manutention · Stockage · Assurance' },
  GB: { native: 'Move anywhere in the UK.',                           english: 'GVOL operators · Labor crews · Storage · Insurance' },
  NO: { native: 'Flytt hvor som helst i Norge.',                      english: 'Flytteselskap · Flyttehjelp · Lager · Forsikring' },
};

export default function HomePage() {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ─── HERO — country shopfront ─────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1420] via-[#1a2332] to-[#0d1420] text-white">
        <div className="absolute inset-0 opacity-15">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-[0.18em] mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Open in 6 markets
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.02] tracking-tight mb-6">
              Move anywhere.<br />
              <span className="text-emerald-400">Pick your country to start.</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
              FlyttGo is the global relocation marketplace — pick the country
              you’re moving in, get matched with licensed local providers, and
              book under escrow. Each country opens its own shopfront, in the
              local language.
            </p>
          </div>

          {/* Country tile grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {GLOBAL_MARKETS.map(m => {
              const flag = COUNTRY_FLAG[m.iso] ?? '';
              const pitch = COUNTRY_TILE_PITCH[m.iso] ?? { native: m.tagline, english: '' };
              return (
                <button
                  key={m.iso}
                  onClick={() => go(m.route)}
                  className="group relative text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/40 rounded-2xl p-6 lg:p-7 transition-all hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="text-4xl lg:text-5xl leading-none">{flag}</div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">
                      {m.phaseLabel}
                    </span>
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-white mb-2 group-hover:text-emerald-300 transition">
                    {m.name} Moves &amp; Logistics
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed mb-1">
                    {pitch.native}
                  </p>
                  {pitch.english && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {pitch.english}
                    </p>
                  )}
                  <div className="mt-5 flex items-center gap-2 text-emerald-400 text-sm font-semibold group-hover:gap-3 transition-all">
                    Open the {m.iso} shopfront
                    <span aria-hidden>→</span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-10 text-center text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
            FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
            digital coordination platform connecting customers with independent
            licensed relocation providers. Service providers are responsible
            for compliance with their national licensing, taxation, insurance,
            and regulatory requirements.
          </p>
        </div>
      </section>

      {/* ─── HOW THE SHOPFRONT WORKS ─────────────────────────────── */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Pick your country',
                body: 'Open any of the six country shopfronts. Each opens in the local language with a national booking portal.',
              },
              {
                step: '02',
                title: 'Get matched with licensed providers',
                body: 'Country-licensed carriers, labor crews, packing services, storage and rental partners — vetted in their own jurisdiction.',
              },
              {
                step: '03',
                title: 'Book under escrow',
                body: 'Transparent pricing, escrow on every booking, audit-ready record retained for procurement, insurance, and tax.',
              },
            ].map(s => (
              <div key={s.step} className="border-l-2 border-emerald-500 pl-5">
                <div className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-700 mb-2">
                  {s.step}
                </div>
                <h3 className="font-serif text-2xl text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICE STACK ───────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-3xl mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-700 mb-3">
              Marketplace service stack
            </p>
            <h2 className="font-serif text-3xl lg:text-5xl tracking-tight text-slate-900">
              Nine service categories. Six markets. One shopfront.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GLOBAL_SERVICES.map(s => (
              <article
                key={s.title}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-emerald-300 transition"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-2">
                  {s.code}
                </p>
                <h3 className="font-serif text-lg text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROLLOUT TIMELINE ────────────────────────────────────── */}
      <section className="bg-[#0d1420] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-3xl mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400 mb-3">
              Global rollout
            </p>
            <h2 className="font-serif text-3xl lg:text-5xl tracking-tight text-white">
              Open today. Expanding through 2030.
            </h2>
          </div>
          <ol className="space-y-3">
            {GLOBAL_ROLLOUT.map(p => (
              <li
                key={p.phase}
                className="bg-white/5 border border-white/10 rounded-xl p-5 grid md:grid-cols-12 gap-4 items-start"
              >
                <div className="md:col-span-2 font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">
                  {p.timeline}
                </div>
                <h3 className="md:col-span-3 font-serif text-xl text-white">
                  {p.phase}
                </h3>
                <p className="md:col-span-7 text-slate-300 leading-relaxed">
                  {p.scope}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── CTA — BACK TO COUNTRY PICK ───────────────────────────── */}
      <section className="bg-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="font-serif text-3xl lg:text-5xl tracking-tight mb-4">
            Ready to move? Pick a country.
          </h2>
          <p className="text-emerald-50 max-w-2xl mx-auto leading-relaxed mb-8">
            Each country opens its own marketplace shopfront with the local
            language, country-scoped address autocomplete, and licensed local
            providers.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {GLOBAL_MARKETS.map(m => (
              <button
                key={m.iso}
                onClick={() => go(m.route)}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl px-5 py-3 text-sm font-semibold transition"
              >
                <span aria-hidden>{COUNTRY_FLAG[m.iso] ?? ''}</span>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
