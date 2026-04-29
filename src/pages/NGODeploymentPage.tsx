import {
  Heart, Globe2, ShieldCheck, ArrowRight, Truck, FileCheck,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Section, Eyebrow, Pill } from '../components/ds';
import { COMPLIANCE_DISCLOSURE } from '../lib/onboarding-rules';
import InstitutionalCTAs from '../components/global/InstitutionalCTAs';

/* ─────────────────────────────────────────────────────────────────
 * <NGODeploymentPage> — /ngo-deployment
 *
 * Institutional gateway for non-government deployment programs:
 * humanitarian relocation, refugee mobility, field-mission
 * logistics. NGO procurement teams expect framework-agreement
 * pricing + audit-ready settlement; the same plumbing as the
 * government surface, scoped to humanitarian language.
 * ───────────────────────────────────────────────────────────────── */

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Globe2,
    title: 'Multi-region field deployment',
    body:  'Cross-border refugee + staff relocation coordinated under one contract. CIP providers in each region surface first.' },
  { icon: ShieldCheck,
    title: 'Vendor compliance + duty of care',
    body:  'Every dispatched provider is insured, licensed, and tier-vetted. Goods-in-transit cover and dispute-resolution SLAs included.' },
  { icon: FileCheck,
    title: 'Donor-grade audit logs',
    body:  'Every booking carries an immutable settlement trail — exportable for donor reporting + grant audit.' },
  { icon: Truck,
    title: 'Field-mission logistics',
    body:  'Equipment / cargo / staff moves with single-line-item billing. Roll up by mission, country, or grant.' },
];

export default function NGODeploymentPage() {
  const { setPage } = useApp();
  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><Heart size={12} /> NGO deployment logistics</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Field-mission logistics, donor-grade audit.
        </h1>
        <p className="text-white/75 max-w-2xl text-lg leading-relaxed">
          NGO and humanitarian programs use FlyttGo to coordinate refugee
          mobility, staff relocation, and field-mission cargo across our nine
          markets. Framework agreements + Certified Infrastructure Partner
          tier + escrow settlement land out-of-the-box.
        </p>
        <div className="mt-7">
          <InstitutionalCTAs
            only={['submit-procurement-inquiry','start-pilot-deployment','download-capability-brief']}
            emphasizePrimary
          />
        </div>
      </Section>

      {/* COMPLIANCE */}
      <Section tone="warm" size="sm">
        <div className="flex items-start gap-3 bg-white border border-amber-300/60 rounded-2xl p-5 max-w-4xl">
          <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-ink-900 block mb-1">Coordination layer · NGO procurement-ready</strong>
            {COMPLIANCE_DISCLOSURE}
          </p>
        </div>
      </Section>

      {/* FEATURES */}
      <Section tone="canvas" size="default">
        <Eyebrow tone="brand" className="mb-1">Why NGOs run on FlyttGo</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-8">
          Capabilities tuned to humanitarian operations.
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map(f => (
            <article key={f.title} className="bg-surface-soft border border-slate-200 rounded-2xl p-5">
              <span className="inline-flex w-10 h-10 rounded-xl bg-brand-50 text-brand-600 items-center justify-center mb-3">
                <f.icon size={18} />
              </span>
              <h3 className="font-extrabold text-ink-900 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section tone="soft" size="default" containerSize="narrow">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-ink-900 mb-3">
            Set up your NGO account.
          </h2>
          <p className="text-slate-600 mb-6">
            Account onboarding takes ~48 hours including framework-agreement
            pricing + designated approver setup.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setPage('corporate')}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition shadow-medium"
            >
              Open an institutional account
            </button>
            <button
              onClick={() => setPage('government-programs')}
              className="px-6 py-3 bg-white border border-slate-200 text-ink-900 font-bold rounded-xl hover:border-ink-900 transition inline-flex items-center justify-center gap-1.5"
            >
              Government programs <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </Section>
    </main>
  );
}
