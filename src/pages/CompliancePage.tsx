import React from 'react';
import { useApp } from '../lib/store';
import { SectionIndex } from '../components/global/CountryPage';

const JURISDICTIONS = [
  {
    region: 'United States',
    body: 'FMCSA awareness. FlyttGo surfaces USDOT and MC numbers for licensed motor carriers and integrates FMCSA SAFER data where appropriate. Surety bonds, FMCSA-mandated insurance, sales tax, and tariff compliance are the licensed carrier\'s responsibility.',
  },
  {
    region: 'European Union',
    body: 'EU relocation compliance awareness. FlyttGo surfaces operator licences and VAT registration where required. Cabotage, posted-worker rules, and EU customs clearance for cross-border relocations remain the licensed provider\'s responsibility.',
  },
  {
    region: 'United Kingdom',
    body: 'UK transport licensing awareness. FlyttGo surfaces Goods Vehicle Operator Licence (GVOL) status, DVSA roadworthiness, and BAR Advance Payment Guarantee participation where applicable. UK GDPR / Data Protection Act 2018 alignment for customer and provider data.',
  },
  {
    region: 'Canada',
    body: 'Provincial transport licensing and Transport Canada awareness. CCMTA cross-border rules, GST/HST collection, and provincial sales tax remain the licensed carrier\'s responsibility. Bilingual disclosures align with Quebec consumer protection law.',
  },
  {
    region: 'Norway / EEA',
    body: 'Yrkestransportloven løyveplikt awareness. Statens vegvesen vehicle compliance, MVA registration with Skatteetaten, and EEA cross-border rules are the licensed flytteselskap\'s responsibility.',
  },
];

const PRIVACY = [
  { t: 'GDPR positioning', b: 'EU and UK GDPR-aligned data handling for customers and providers across all marketplace surfaces. Data subject rights honoured under Articles 15–22.' },
  { t: 'Provider declarations', b: 'Operator licence references, insurance disclosures, and tax registration are recorded at provider onboarding and surfaced to customers at coordination time.' },
  { t: 'Cross-border records', b: 'Audit-ready coordination records retained per jurisdictional retention windows for procurement, insurance, and tax purposes.' },
];

export default function CompliancePage() {
  const { setPage } = useApp();

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.01" label="Compliance positioning" />
          <h1 className="font-serif text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Compliance &amp; jurisdictional awareness
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-700 max-w-3xl">
            FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
            digital coordination platform connecting customers with independent
            licensed relocation providers across multiple jurisdictions
            worldwide. <strong>FlyttGo does not operate as a transportation
            carrier.</strong> Service providers are responsible for compliance
            with their national licensing, taxation, insurance, and regulatory
            requirements.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.02" label="Regulatory awareness" />
          <div className="grid md:grid-cols-2 gap-px bg-slate-200">
            {JURISDICTIONS.map(j => (
              <article
                key={j.region}
                className="bg-white p-8 flex flex-col gap-3 min-h-[200px]"
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-700">
                  {j.region}
                </p>
                <h3 className="font-serif text-2xl text-slate-900">
                  Jurisdictional awareness
                </h3>
                <p className="text-slate-600 leading-relaxed">{j.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.03" label="Data &amp; privacy" />
          <div className="grid md:grid-cols-3 gap-10">
            {PRIVACY.map(p => (
              <div key={p.t}>
                <h3 className="font-serif text-2xl text-white mb-3">{p.t}</h3>
                <p className="text-slate-300 leading-relaxed">{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionIndex id="GLRM.04" label="Coordination, not carriage" />
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <h2 className="font-serif text-3xl lg:text-4xl leading-tight">
              FlyttGo coordinates · Providers comply.
            </h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                FlyttGo is not a moving company, not a trucking carrier, and not
                a motor carrier. The platform is a coordination and matching
                layer for independent licensed relocation providers.
              </p>
              <p>
                Customers, providers, regulators, and procurement teams can
                reach the FlyttGo compliance desk through the contact page.
              </p>
              <div className="flex flex-wrap gap-4 mt-6">
                <button
                  onClick={() => setPage('contact')}
                  className="px-6 py-3 bg-slate-900 text-white font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-700 transition"
                >
                  Contact compliance
                </button>
                <button
                  onClick={() => setPage('terms')}
                  className="px-6 py-3 border border-slate-900 text-slate-900 font-mono text-xs uppercase tracking-[0.18em] hover:bg-slate-50 transition"
                >
                  Terms of Service
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
