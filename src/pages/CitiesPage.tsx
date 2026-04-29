import { useApp } from '../lib/store';
import type { Page } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';

const COUNTRIES: { iso: string; name: string; phase: string; route: Page }[] = [
  { iso: 'US', name: 'United States',  phase: 'Phase 1 — Live',              route: 'market-us' },
  { iso: 'CA', name: 'Canada',         phase: 'Phase 2 — Activating',        route: 'market-canada' },
  { iso: 'DE', name: 'Germany',        phase: 'Phase 3 — European corridor', route: 'market-germany' },
  { iso: 'FR', name: 'France',         phase: 'Phase 3 — European corridor', route: 'market-france' },
  { iso: 'GB', name: 'United Kingdom', phase: 'Phase 3 — European corridor', route: 'market-uk' },
  { iso: 'NO', name: 'Norway',         phase: 'Phase 3 — Home market',       route: 'market-norway' },
];

const ROLLOUT = [
  { phase: 'Phase 1', timeline: '2026',     scope: 'United States marketplace rollout', cities: ['Austin','Atlanta','Dallas','Phoenix','Charlotte'] },
  { phase: 'Phase 2', timeline: '2026 H2',  scope: 'Canada integration', cities: ['Toronto','Montreal','Vancouver','Calgary'] },
  { phase: 'Phase 3', timeline: '2027 H1',  scope: 'European relocation corridors', cities: ['Oslo','London','Berlin','Paris','Munich','Manchester','Lyon','Bergen'] },
  { phase: 'Phase 4', timeline: '2027 H2+', scope: 'Intercontinental corridors', cities: ['Africa → Europe','Europe → United States','Africa → United States'] },
];

export default function CitiesPage() {
  const { setPage } = useApp();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="Geographic deployment" />
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Markets &amp; deployment nodes
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 max-w-3xl">
            FlyttGo Global Logistics &amp; Relocation Marketplace operates country-level
            deployment nodes across the United States, Canada, Germany, France, the
            United Kingdom, and Norway, with intercontinental corridors planned
            through 2030.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Country deployment nodes" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200">
            {COUNTRIES.map(c => (
              <button
                key={c.iso}
                onClick={() => setPage(c.route)}
                className="bg-white text-left p-6 flex flex-col gap-3 min-h-[160px] hover:bg-slate-50 transition group"
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-700">
                  {c.iso} · Deployment node
                </p>
                <h3 className="font-serif text-2xl text-slate-900 group-hover:text-emerald-700 transition">
                  {c.name}
                </h3>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500 mt-auto">
                  {c.phase}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Global rollout timeline" />
          <ol className="space-y-px bg-slate-700">
            {ROLLOUT.map(p => (
              <li key={p.phase} className="bg-slate-900 grid md:grid-cols-12 gap-6 p-8 items-start">
                <div className="md:col-span-2 font-mono text-xs uppercase tracking-[0.18em] text-emerald-400">
                  {p.timeline}
                </div>
                <h3 className="md:col-span-3 font-serif text-2xl text-white">{p.phase}</h3>
                <div className="md:col-span-7">
                  <p className="text-slate-300 leading-relaxed">{p.scope}</p>
                  <ul className="mt-3 grid grid-cols-2 gap-y-1 font-mono text-xs text-slate-400">
                    {p.cities.map(city => (
                      <li key={city} className="flex items-baseline gap-2">
                        <span className="h-1 w-1 bg-slate-500" aria-hidden />{city}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
