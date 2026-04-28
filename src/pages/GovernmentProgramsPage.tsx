import React from 'react';
import {
  Landmark, FileCheck, ShieldCheck, ArrowRight, MapPin, Clock,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Section, Eyebrow, Pill } from '../components/ds';
import { COMPLIANCE_DISCLOSURE } from '../lib/onboarding-rules';
import InstitutionalCTAs from '../components/global/InstitutionalCTAs';

/* ─────────────────────────────────────────────────────────────────
 * <GovernmentProgramsPage> — /government-programs
 *
 * Institutional gateway for government / ministry / municipal /
 * embassy / transit-authority procurement teams. Procurement-style
 * messaging, audit-ready posture, framework-agreement language.
 *
 * Calls out:
 *   - Vendor compliance filtering (Certified Infrastructure Partner
 *     tier surfaces first via find_eligible_providers_for_segment).
 *   - Multi-region deployment routing.
 *   - Audit-ready transaction logs (escrow + dispute audit trail).
 *   - Framework-agreement pricing via organization_contracts.
 * ───────────────────────────────────────────────────────────────── */

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShieldCheck,
    title: 'Vendor compliance filtering',
    body:  'Bookings route only to Certified Infrastructure Partners — verified registration, insurance, vehicle compliance, and tax registration on file.' },
  { icon: FileCheck,
    title: 'Procurement workflow compatibility',
    body:  'Multi-step approval workflow with audit trail per request. Department-scoped requesters submit; designated approvers release dispatch.' },
  { icon: Clock,
    title: 'Audit-ready transaction logs',
    body:  'Every booking carries the escrow timeline, dispute history, and final settlement on a tamper-evident record. Export to CSV / PDF for procurement.' },
  { icon: MapPin,
    title: 'Multi-region deployment routing',
    body:  'Cross-state / cross-emirate / cross-county deployments coordinated under a single contract. CIP providers in each region surface first.' },
  { icon: Landmark,
    title: 'Framework-agreement pricing',
    body:  'Pre-negotiated discount % or hourly cap per framework. Drawn-down via department cost-centres; monthly invoicing rolled up by period.' },
];

const PILOT_PROGRAMS: { slug: string; title: string; body: string }[] = [
  { slug: 'municipal-relocation',
    title: 'Municipal relocation pilots',
    body:  'County / municipal-level workforce relocation with regional CIP providers under one framework.' },
  { slug: 'transit-authority',
    title: 'Transit authority pilots',
    body:  'Stations / depots / fleet logistics moves under audit-ready settlement.' },
  { slug: 'identity-integrated',
    title: 'Identity-integrated relocation',
    body:  'Mobility programs tied to national ID / e-ID systems — ready for ministerial integration.' },
  { slug: 'marketplace-rollout',
    title: 'Marketplace rollout pilots',
    body:  'Pilot deployments coordinating commercial relocation in newly-licensed regions.' },
];

export default function GovernmentProgramsPage() {
  const { setPage } = useApp();
  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><Landmark size={12} /> Government & ministry programs</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Procurement-compatible relocation logistics.
        </h1>
        <p className="text-white/75 max-w-2xl text-lg leading-relaxed">
          FlyttGo operates as a digital coordination platform for government,
          ministerial, municipal, and embassy relocation programs. Vendor
          compliance, audit-ready settlement, and framework-agreement pricing
          land out-of-the-box.
        </p>
        <div className="mt-7">
          <InstitutionalCTAs emphasizePrimary />
        </div>
      </Section>

      {/* COMPLIANCE DISCLOSURE */}
      <Section tone="warm" size="sm">
        <div className="flex items-start gap-3 bg-white border border-amber-300/60 rounded-2xl p-5 max-w-4xl">
          <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-ink-900 block mb-1">Coordination layer · vendor compliance gated</strong>
            {COMPLIANCE_DISCLOSURE} Government bookings route only to Certified
            Infrastructure Partners with verified registration, insurance, and
            vehicle compliance on file.
          </p>
        </div>
      </Section>

      {/* FEATURES */}
      <Section tone="canvas" size="default">
        <Eyebrow tone="brand" className="mb-1">Why ministries pick FlyttGo</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-8">
          Five capabilities procurement teams expect.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* PILOT PROGRAMS */}
      <Section tone="soft" size="default">
        <Eyebrow tone="brand" className="mb-1">Active pilot frameworks</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-8">
          Pilot deployment programs.
        </h2>
        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          {PILOT_PROGRAMS.map(p => (
            <article key={p.slug} className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-extrabold text-ink-900 mb-1">{p.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
            </article>
          ))}
        </div>
        <button
          onClick={() => setPage('pilot-deployment-programs')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:text-brand-600"
        >
          See all pilot programs <ArrowRight size={14} />
        </button>
      </Section>

      {/* CTAs */}
      <Section tone="canvas" size="default" containerSize="narrow">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-ink-900 mb-3">
            Coordinate a procurement-grade pilot.
          </h2>
          <p className="text-slate-600 mb-6">
            Reach out to partnerships@flyttgo.com or open a corporate account
            to start a framework-agreement engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setPage('corporate')}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition shadow-medium"
            >
              Open a corporate account
            </button>
            <button
              onClick={() => setPage('compliance')}
              className="px-6 py-3 bg-white border border-slate-200 text-ink-900 font-bold rounded-xl hover:border-ink-900 transition"
            >
              See compliance frame
            </button>
          </div>
        </div>
      </Section>
    </main>
  );
}
