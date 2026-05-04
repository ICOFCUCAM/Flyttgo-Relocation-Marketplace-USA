import { useApp } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';
import MarketplaceBanner from '../components/banners/MarketplaceBanner';

export default function UniversitiesPage() {
  const { setPage } = useApp();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <MarketplaceBanner
        eyebrow="University Mobility"
        breadcrumb={{ id: 'GLRM.01', label: 'University relocation' }}
        headline="Student relocation, coordinated globally"
        lead="Move-in, move-out, semester mobility, and international arrival corridors for universities, residence halls, and student housing offices. FlyttGo coordinates with independent licensed providers in each jurisdiction so housing and admissions teams operate from a single audit-ready record across countries."
        compliancePills={[
          { label: 'Term-aware scheduling' },
          { label: 'Residence-hall verified' },
          { label: 'Cross-border corridors' },
          { label: 'Bonded carriers' },
        ]}
        ctas={[
          { label: 'Coordinate with admissions →', onClick: () => setPage('contact'), primary: true },
          { label: 'Capability brief',             onClick: () => setPage('capability-brief') },
        ]}
      />

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Coordination workflows" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200">
            {[
              { title: 'Student relocation corridors', description: 'Originating-country pickup, customs-aware coordination, and arrival-country delivery via independent licensed providers in both jurisdictions.' },
              { title: 'Housing move coordination', description: 'Move-in / move-out windows aligned with residence hall schedules, with consolidated billing for student housing operations.' },
              { title: 'International arrival relocation', description: 'Airport-adjacent labor crews, temporary storage, and short-haul delivery for international students arriving each semester.' },
              { title: 'Semester mobility workflows', description: 'Recurring coordination for exchange programmes, study-abroad cohorts, and end-of-term return logistics.' },
            ].map(w => (
              <article key={w.title} className="bg-white p-6 flex flex-col gap-3 min-h-[200px]">
                <h3 className="font-serif text-xl text-slate-900">{w.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{w.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Why housing teams use FlyttGo" />
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { title: 'Audit trail', description: 'Procurement-grade record of every coordinated move — invoices, providers, jurisdictions, signatures.' },
              { title: 'Cross-border', description: 'A single workflow covers origin- and arrival-country providers, including customs-aware coordination.' },
              { title: 'No carrier risk', description: 'FlyttGo never operates as a carrier. Each provider is licensed in its own country and responsible for compliance.' },
            ].map(b => (
              <div key={b.title}>
                <h3 className="font-serif text-2xl text-white mb-3">{b.title}</h3>
                <p className="text-slate-300 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.04" label="Get in touch" />
          <div className="grid md:grid-cols-2 gap-10 items-end">
            <h2 className="font-serif text-3xl lg:text-4xl leading-tight">
              For housing offices, registrars, and international student services.
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setPage('contact')}
                className="px-6 py-3 bg-slate-900 text-white font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-700 transition"
              >
                Talk to FlyttGo
              </button>
              <button
                onClick={() => setPage('how-it-works')}
                className="px-6 py-3 border border-slate-900 text-slate-900 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition"
              >
                How it works
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
