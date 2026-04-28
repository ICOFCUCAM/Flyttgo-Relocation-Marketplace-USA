import React from 'react';
import {
  FileText, Download, ShieldCheck, Building2, Globe2, Database,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Section, Eyebrow, Pill } from '../components/ds';
import InstitutionalCTAs from '../components/global/InstitutionalCTAs';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <CapabilityBriefPage> — /resources/capability-brief
 *
 * Procurement-team capability briefing landing. Lists what's in the
 * capability brief, lets the visitor request the PDF (or read an
 * online-rendered version), and pushes them onward to RFP /
 * vendor-pack / pilot programmes.
 *
 * The PDF artefact itself is generated out-of-band by the
 * partnerships team — we deliver-on-request rather than serving an
 * uncontrolled download to keep the document in sync with the
 * customer's procurement context.
 * ───────────────────────────────────────────────────────────────── */

interface BriefSection {
  icon:  LucideIcon;
  title: string;
  body:  string;
}

const BRIEF_SECTIONS: BriefSection[] = [
  {
    icon:  Building2,
    title: '1. Operator entities + governance',
    body:  'Two registered legal entities (Wankong LLC · Delaware; FlyttGo Technologies Group · Norway). Coordination-layer posture; provider compliance is the responsibility of the licensed providers operating on the marketplace.',
  },
  {
    icon:  Globe2,
    title: '2. Geographic deployment readiness',
    body:  'Live coverage in 6 markets (US/CA/GB/DE/FR/NO); partner coverage in 3 (AE/NG/KE); expansion-ready in 4 (CM/UG/ET/IN). Country-aware pricing engine + tax modes seeded for every live market.',
  },
  {
    icon:  ShieldCheck,
    title: '3. Compliance + provider verification',
    body:  'Country-specific onboarding rules (USDOT/MC for US carriers; SIRET for FR; Gewerbeanmeldung for DE; trade licence for AE; CAC for NG; etc.). 4-tier provider verification with a Certified Infrastructure Partner tier for institutional procurement.',
  },
  {
    icon:  Database,
    title: '4. Architecture + data handling',
    body:  'Supabase-native data plane with row-level security on every table, audit history on disputes + payouts, multi-gateway adaptive payments (Stripe + Flutterwave + Paystack + Razorpay + PayPal + M-Pesa), 9-layer pricing engine, structured 6-category provider rating system.',
  },
  {
    icon:  FileText,
    title: '5. Procurement integration patterns',
    body:  'Framework-agreement pricing (discount % or hourly cap); department-level cost-centre breakdowns on monthly invoices; multi-step approval workflows; auto-dispatch routing to CIP providers first, then Gold Pro, then Gold.',
  },
];

export default function CapabilityBriefPage() {
  const { setPage } = useApp();
  function requestDownload() {
    track('capability_brief_requested');
    /* The PDF is delivered out-of-band so the partnerships team can
     * tailor the brief per customer. Routing to /procurement/rfp
     * captures the request via the existing intake form with the
     * "Download capability brief" deployment_type pre-loaded. */
    setPage('procurement-rfp');
  }

  return (
    <main className="bg-white text-ink-900">
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><FileText size={12} /> Capability brief</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Government Digital Infrastructure Capability Brief
        </h1>
        <p className="text-white/75 max-w-2xl text-lg leading-relaxed">
          The deeper procurement-team briefing covering operator governance,
          deployment readiness, compliance posture, architecture, and
          institutional integration patterns. Delivered tailored to your
          procurement context.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            onClick={requestDownload}
            className="inline-flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-ink-900 font-bold rounded-xl shadow-medium transition"
          >
            <Download size={14} />
            Request capability brief
          </button>
          <InstitutionalCTAs only={['submit-procurement-inquiry','schedule-infrastructure-discussion']} />
        </div>
      </Section>

      <Section tone="canvas" size="default">
        <Eyebrow tone="brand" className="mb-1">What's in the brief</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-6">
          Five sections · ~14 pages
        </h2>
        <div className="space-y-4">
          {BRIEF_SECTIONS.map(s => (
            <article key={s.title} className="bg-surface-soft border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
              <span className="inline-flex w-10 h-10 rounded-xl bg-brand-50 text-brand-600 items-center justify-center flex-shrink-0">
                <s.icon size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="font-extrabold text-ink-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="warm" size="default" containerSize="narrow">
        <div className="bg-white border border-amber-300/60 rounded-2xl p-6">
          <Eyebrow tone="brand" className="mb-1">Why we deliver on request</Eyebrow>
          <p className="text-sm text-slate-700 leading-relaxed mb-4">
            Procurement teams typically need the brief tailored to their
            jurisdiction (e.g. ZPO clauses for German ministries; FOIA
            references for US municipalities; donor-grade audit excerpts for
            NGOs). Submitting a procurement inquiry lets us match the brief
            to your context before sending — and it kicks off the
            infrastructure discussion conversation in parallel.
          </p>
          <button
            onClick={requestDownload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition"
          >
            <Download size={14} />
            Request the brief now
          </button>
        </div>
      </Section>
    </main>
  );
}
