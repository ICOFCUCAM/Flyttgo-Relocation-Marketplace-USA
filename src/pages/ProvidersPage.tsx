import { useApp } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';
import EarningsSimulator from '../components/global/EarningsSimulator';

const CATEGORIES = [
  { title: 'Licensed moving carrier', body: 'USDOT/MC, GüKG, GVOL, registre des transporteurs, yrkestransportløyve — country-specific operator licensing.' },
  { title: 'Moving labor provider', body: 'Loading, unloading, and in-home labor crews matched against the customer brief.' },
  { title: 'Packing services provider', body: 'Independent packing crews and materials suppliers integrated into coordinated relocations.' },
  { title: 'Storage facility partner', body: 'Self-storage, bonded warehouses, and staging facilities for staged or international moves.' },
  { title: 'Vehicle rental partner', body: 'Truck and van rental partners reserved alongside labor and carrier coordination.' },
  { title: 'Freight forwarding partner', body: 'Cross-border freight, customs documentation coordination, and consolidation.' },
  { title: 'International relocation coordinator', body: 'End-to-end origin-country and arrival-country relocation orchestration.' },
  { title: 'University relocation partner', body: 'Student move-in / move-out, residence hall windows, and semester mobility.' },
  { title: 'Corporate relocation vendor', body: 'Talent mobility, project relocation, and consolidated procurement workflows.' },
];

export default function ProvidersPage() {
  const { setPage } = useApp();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="Providers" />
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Join the global marketplace
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 max-w-3xl">
            FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
            digital coordination platform connecting customers with independent
            licensed relocation providers across multiple jurisdictions worldwide.
            Service providers are responsible for compliance with their national
            licensing, taxation, insurance, and regulatory requirements.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Provider categories" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200">
            {CATEGORIES.map(c => (
              <article key={c.title} className="bg-white p-6 flex flex-col gap-3 min-h-[180px]">
                <h3 className="font-serif text-xl text-slate-900">{c.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GLRM.03 — Earnings simulator (acquisition lever) */}
      <section className="border-b border-slate-200 bg-amber-50/40">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Earnings simulator" />
          <h2 className="font-serif text-3xl lg:text-4xl leading-tight text-slate-900 mb-3">
            How much can I earn on FlyttGo?
          </h2>
          <p className="text-slate-600 max-w-2xl mb-8 leading-relaxed">
            Same engine the booking widget runs against. Pick your city, crew
            size, services, and weekly hours — the simulator estimates your
            hourly, weekly, monthly, and annual income after the marketplace
            commission.
          </p>
          <EarningsSimulator />
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.04" label="How providers join" />
          <ol className="space-y-px bg-slate-200">
            {[
              { n: '01', t: 'Submit registration', b: 'Country, category, operator licence reference, contact and tax details.' },
              { n: '02', t: 'Surface licensing', b: 'Provider declarations are surfaced to customers — FMCSA/USDOT, GüKG, GVOL, French registre, Norwegian løyve.' },
              { n: '03', t: 'Activate categories', b: 'Activate the marketplace categories the provider operates in: labor, carrier, packing, storage, vehicle rental, freight forwarding.' },
              { n: '04', t: 'Receive coordinated work', b: 'Matching, dispatch, and consolidated payouts under the FlyttGo coordination layer.' },
            ].map(s => (
              <li key={s.n} className="bg-white grid md:grid-cols-12 gap-6 p-8 items-start">
                <div className="md:col-span-2 font-mono text-2xl font-semibold text-slate-900">{s.n}</div>
                <h3 className="md:col-span-3 font-serif text-2xl text-slate-900">{s.t}</h3>
                <p className="md:col-span-7 text-slate-600 leading-relaxed">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.05" label="Country-level compliance responsibility" />
          <div className="grid md:grid-cols-2 gap-10">
            <h2 className="font-serif text-3xl lg:text-4xl leading-tight text-white">
              Providers comply. The marketplace coordinates.
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Each provider is responsible for compliance with the licensing,
              taxation, insurance, and regulatory requirements of every
              jurisdiction in which it operates. The FlyttGo coordination layer
              records the operator licence references and surfaces them to
              customers — it does not perform the regulated relocation services
              itself.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap gap-4">
            <button
              onClick={() => setPage('driver-onboarding')}
              className="px-6 py-3 bg-emerald-500 text-slate-900 font-mono text-xs uppercase tracking-[0.18em] hover:bg-emerald-400 transition"
            >
              Apply as a provider
            </button>
            <button
              onClick={() => setPage('provider-requirements')}
              className="px-6 py-3 bg-amber-400 text-slate-900 font-mono text-xs uppercase tracking-[0.18em] hover:bg-amber-300 transition"
            >
              See country requirements
            </button>
            <button
              onClick={() => setPage('compliance')}
              className="px-6 py-3 border border-slate-300 text-slate-100 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-800 transition"
            >
              Compliance frame
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
