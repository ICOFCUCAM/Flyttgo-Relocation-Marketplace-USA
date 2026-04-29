import { useApp } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';

const PRINCIPLES = [
  { t: 'Coordination, not carriage', b: 'FlyttGo is a digital coordination marketplace. We do not operate as a moving company or a transportation carrier.' },
  { t: 'Provider-led compliance', b: 'Every relocation is performed by independent providers, licensed and accountable in their own jurisdiction.' },
  { t: 'Procurement-grade record', b: 'Every coordinated relocation produces an audit-ready record for procurement, insurance, and tax purposes.' },
  { t: 'Built for 2030', b: 'Multi-country deployment, multi-currency invoicing, and intercontinental corridors are first-class platform concerns.' },
];

export default function AboutUsPage() {
  const { setPage } = useApp();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="About FlyttGo" />
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            FlyttGo Global Logistics &amp; Relocation Marketplace
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 max-w-3xl">
            FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
            digital coordination platform connecting customers with independent
            licensed relocation providers across multiple jurisdictions
            worldwide. Service providers are responsible for compliance with
            their national licensing, taxation, insurance, and regulatory
            requirements.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Operating principles" />
          <div className="grid md:grid-cols-2 gap-px bg-slate-200">
            {PRINCIPLES.map(p => (
              <article key={p.t} className="bg-white p-8 flex flex-col gap-3 min-h-[180px]">
                <h3 className="font-serif text-2xl text-slate-900">{p.t}</h3>
                <p className="text-slate-600 leading-relaxed">{p.b}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-900 text-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Operator structure" />
          <div className="grid md:grid-cols-2 gap-10">
            <div className="border-l border-slate-700 pl-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">North American marketplace</p>
              <h3 className="font-serif text-2xl text-white">Wankong LLC (Delaware)</h3>
              <p className="mt-3 text-slate-300 leading-relaxed">
                Operates United States marketplace services and Phase 1 / Phase 2
                rollout across US and Canadian metros.
              </p>
            </div>
            <div className="border-l border-slate-700 pl-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">European marketplace</p>
              <h3 className="font-serif text-2xl text-white">FlyttGo Technologies Group (Norway)</h3>
              <p className="mt-3 text-slate-300 leading-relaxed">
                Operates European marketplace services across Norway, the United
                Kingdom, Germany, and France in the Phase 3 European corridor.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.04" label="Where to next" />
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setPage('how-it-works')}
              className="px-6 py-3 bg-slate-900 text-white font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-700 transition"
            >
              How it works
            </button>
            <button
              onClick={() => setPage('compliance')}
              className="px-6 py-3 border border-slate-900 text-slate-900 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition"
            >
              Compliance frame
            </button>
            <button
              onClick={() => setPage('cities')}
              className="px-6 py-3 border border-slate-300 text-slate-700 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition"
            >
              Geographic deployment
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
