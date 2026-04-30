import { useApp } from '../lib/store';
import type { Page } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';
import MarketplaceBanner from '../components/banners/MarketplaceBanner';
import {
  GLOBAL_SERVICES,
  GLOBAL_MARKETS,
  GLOBAL_PROVIDER_CATEGORIES,
} from '../lib/constants';

export default function MarketplacePage() {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <MarketplaceBanner
        eyebrow="Marketplace surface"
        breadcrumb={{ id: 'GLRM.01', label: 'Marketplace surface' }}
        headline="Browse the FlyttGo global marketplace"
        lead="FlyttGo operates as a digital coordination platform connecting customers with independent licensed relocation providers across multiple jurisdictions worldwide. Service providers are responsible for compliance with their national licensing, taxation, insurance, and regulatory requirements."
        compliancePills={[
          { label: 'Country-licensed providers' },
          { label: 'Distance-priced quotes' },
          { label: 'Escrow on every booking' },
          { label: 'Audit-ready records' },
        ]}
        ctas={[
          { label: 'Get an instant price →', onClick: () => go('booking'), primary: true },
          { label: 'How it works',            onClick: () => go('how-it-works') },
        ]}
      />

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Service stack" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200">
            {GLOBAL_SERVICES.map(s => (
              <article
                key={s.title}
                className="bg-white p-6 flex flex-col gap-3 min-h-[170px]"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700">
                  {s.code}
                </p>
                <h3 className="font-serif text-xl text-slate-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{s.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Markets" />
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight text-white mb-12">
            Country deployment nodes
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-800">
            {GLOBAL_MARKETS.map(m => (
              <button
                key={m.iso}
                onClick={() => go(m.route)}
                className="bg-slate-900 text-left p-6 flex flex-col gap-3 min-h-[180px] hover:bg-slate-800 transition group"
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">
                  {m.iso} · {m.phaseLabel}
                </p>
                <h3 className="font-serif text-2xl text-white group-hover:text-emerald-300 transition">
                  {m.name} Moves &amp; Logistics
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{m.tagline}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.04" label="Provider categories" />
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-3 font-mono text-sm">
            {GLOBAL_PROVIDER_CATEGORIES.map(c => (
              <li
                key={c}
                className="flex items-baseline gap-3 border-b border-slate-200 pb-3"
              >
                <span className="text-slate-400">→</span>
                <span className="text-slate-900">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
