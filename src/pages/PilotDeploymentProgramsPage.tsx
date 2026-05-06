import {
  Rocket, Landmark, GraduationCap, Truck, Globe2, Sparkles,
  ArrowRight, type LucideIcon,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Section, Pill } from '../components/ds';
import { COMPLIANCE_DISCLOSURE } from '../lib/onboarding-rules';

/* ─────────────────────────────────────────────────────────────────
 * <PilotDeploymentProgramsPage> — /pilot-deployment-programs
 *
 * Public surface for ministries / municipalities / authorities
 * exploring pilot frameworks before committing to a long-form
 * procurement. Five archetypes the spec calls out, each with a
 * realistic engagement window + success-criteria summary.
 * ───────────────────────────────────────────────────────────────── */

const PILOTS: {
  slug:         string;
  title:        string;
  icon:         LucideIcon;
  duration:     string;
  body:         string;
  successCriteria: string[];
}[] = [
  {
    slug:     'municipal-relocation',
    title:    'Municipal relocation pilots',
    icon:     Landmark,
    duration: '12 weeks',
    body:     'County / municipal-level workforce relocation under a single framework agreement. Ideal for cities standing up a new office building, library system, or municipal-employee mobility program.',
    successCriteria: [
      '95%+ on-time dispatch',
      'Cost-savings benchmark vs. legacy vendor',
      'Audit-ready settlement export',
    ],
  },
  {
    slug:     'university-logistics',
    title:    'University logistics pilots',
    icon:     GraduationCap,
    duration: '1 academic semester',
    body:     'Student housing cohorts, lab equipment moves, international-arrival routing. Run through a single contract with one consolidated end-of-semester invoice.',
    successCriteria: [
      'Zero missed semester deadlines',
      'Cohort-level dispatch visibility',
      'International arrival concierge integrated',
    ],
  },
  {
    slug:     'transit-authority',
    title:    'Transit authority pilots',
    icon:     Truck,
    duration: '6 months',
    body:     'Stations, depots, and fleet logistics moves coordinated alongside regulator-approved carriers. Audit-ready settlement matched to procurement reporting cadence.',
    successCriteria: [
      'Operational SLA adherence',
      'Provider compliance audit trail',
      'Multi-region coordination tested',
    ],
  },
  {
    slug:     'marketplace-rollout',
    title:    'Marketplace rollout pilots',
    icon:     Globe2,
    duration: '6–9 months',
    body:     'Coordinated commercial-relocation rollouts in newly-licensed regions. The platform onboards local Certified Infrastructure Partners + provides the routing + escrow layer.',
    successCriteria: [
      'Local CIP onboarding cadence',
      'Customer-side conversion benchmark',
      'Country-specific compliance gates verified',
    ],
  },
  {
    slug:     'identity-integrated',
    title:    'Identity-integrated relocation',
    icon:     Sparkles,
    duration: '9 months',
    body:     'Mobility programs tied to national ID / e-ID systems. Used by ministries integrating relocation services into citizen-services portals.',
    successCriteria: [
      'OAuth / OIDC integration ready',
      'Per-citizen audit log',
      'Programmatic eligibility verification',
    ],
  },
];

export default function PilotDeploymentProgramsPage() {
  const { setPage } = useApp();
  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><Rocket size={12} /> Pilot deployment programs</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Pilot first. Scale later.
        </h1>
        <p className="text-white/75 max-w-2xl text-lg leading-relaxed">
          Five pilot archetypes purpose-built for institutional procurement.
          Each runs against a defined success-criteria framework and
          converts into a long-form agreement on satisfactory outcomes.
        </p>
      </Section>

      {/* COMPLIANCE */}
      <Section tone="warm" size="sm">
        <div className="flex items-start gap-3 bg-white border border-amber-300/60 rounded-2xl p-5 max-w-4xl">
          <Sparkles size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-ink-900 block mb-1">Pilot framework</strong>
            Every pilot runs under a fixed scope + success-criteria document.
            Settlement is escrow-protected; either side can pause for
            mediation under the platform dispute system. {COMPLIANCE_DISCLOSURE}
          </p>
        </div>
      </Section>

      {/* PILOTS */}
      <Section tone="canvas" size="default">
        <div className="space-y-6">
          {PILOTS.map(pilot => (
            <article
              key={pilot.slug}
              className="bg-surface-soft border border-slate-200 rounded-2xl overflow-hidden"
            >
              <header className="px-6 py-5 bg-white border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <pilot.icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-ink-900 text-lg">{pilot.title}</h3>
                    <p className="text-xs text-slate-500">{pilot.duration} · success-criteria framework</p>
                  </div>
                </div>
              </header>
              <div className="p-6">
                <p className="text-sm text-slate-700 leading-relaxed mb-5">{pilot.body}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Success criteria
                </p>
                <ul className="space-y-1.5">
                  {pilot.successCriteria.map(s => (
                    <li key={s} className="text-sm text-slate-700 flex items-start gap-2">
                      <ArrowRight size={14} className="text-brand-600 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section tone="soft" size="default" containerSize="narrow">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-ink-900 mb-3">
            Discuss a pilot.
          </h2>
          <p className="text-slate-600 mb-6">
            Pilots typically scope in 2–4 weeks; activation is 4 weeks after
            framework-agreement signature. Reach out to the partnerships team
            to start the conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setPage('contact')}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition shadow-medium"
            >
              Contact partnerships
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
