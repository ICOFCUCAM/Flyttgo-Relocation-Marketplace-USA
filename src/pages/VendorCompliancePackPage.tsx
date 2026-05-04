import {
  ShieldCheck, Building2, Globe2, Database, Lock, Activity,
  Mail, type LucideIcon,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Section, Eyebrow, Pill } from '../components/ds';
import { COUNTRY_PROFILES } from '../lib/country-profiles';
import InstitutionalCTAs from '../components/global/InstitutionalCTAs';

/* ─────────────────────────────────────────────────────────────────
 * <VendorCompliancePackPage> — /compliance/vendor-pack
 *
 * Public-facing vendor compliance pack the procurement team can
 * point ministries / universities / NGOs at when they ask "are
 * you procurement-compatible?". Mirrors what most government
 * procurement teams expect to see in a vendor briefing pack:
 *
 *   - Company registration details
 *   - Operating regions
 *   - Deployment architecture overview
 *   - Data handling posture
 *   - Security alignment posture
 *   - Service availability description
 *   - Procurement contact channel
 *
 * Links out to the RFP submission page + the capability-brief
 * download for the deeper engagement.
 * ───────────────────────────────────────────────────────────────── */

interface PackSection {
  icon:  LucideIcon;
  title: string;
  body:  string;
  bullets: string[];
}

const PACK_SECTIONS: PackSection[] = [
  {
    icon:  Building2,
    title: 'Company registration details',
    body:  'FlyttGo operates two complementary legal entities split by hemisphere. Both are registered, tax-compliant, and operate under written commercial terms with every provider on the marketplace.',
    bullets: [
      'North-American marketplace operator: Wankong LLC · Delaware, United States',
      'EEA marketplace operator: FlyttGo Technologies Group · Norway',
      'Active in 9 markets · expansion-ready in 6 more (see /deployment-regions)',
    ],
  },
  {
    icon:  Globe2,
    title: 'Operating regions',
    body:  'Live deployment across nine markets with locally-licensed providers, country-aware pricing, and country-specific tax handling.',
    bullets: [
      `${COUNTRY_PROFILES.length} live markets with country-adaptive pricing engine`,
      'Multi-region routing within each country (city tiers seeded for ~95 cities)',
      'Provider routing prioritises Certified Infrastructure Partners, then Gold Pro, then the rest',
    ],
  },
  {
    icon:  Activity,
    title: 'Deployment architecture overview',
    body:  'Coordination-layer architecture — FlyttGo orchestrates booking · escrow · dispute resolution · provider scoring; the regulated relocation services are performed by independent licensed providers.',
    bullets: [
      'Supabase-native data plane (Postgres + Realtime + RLS)',
      'Multi-gateway adaptive payments (Stripe + Flutterwave + Paystack + Razorpay + PayPal + M-Pesa)',
      '9-layer pricing engine + dispute system + provider scoring engine — every layer typed + auditable',
      'Country-specific onboarding rules surface only the documents that apply per market',
    ],
  },
  {
    icon:  Database,
    title: 'Data handling posture',
    body:  'Customer + organization data is scoped per-row by Postgres RLS. Provider documents land in a private storage bucket; admins access them through audit-logged signed-URL flows.',
    bullets: [
      'Row-level security on every customer / organization / provider table',
      'PII minimised — addresses are only persisted on confirmed bookings',
      'GDPR-compatible cookie consent + analytics-on-consent posture',
      'Customer audit trail: every dispute / approval / payout written to immutable history tables',
    ],
  },
  {
    icon:  Lock,
    title: 'Security alignment posture',
    body:  'Defensive posture by default — sensitive routes guarded by Supabase Auth + JWT + RLS. Admin-only RPCs are SECURITY DEFINER with pinned search_path; service-role keys are not embedded in the client bundle.',
    bullets: [
      'TLS-only in production; HSTS preloaded on the consumer marketplace',
      'Stripe + provider-side gateways handle PAN data — FlyttGo never stores card numbers',
      'Escrow protection on every booking; funds held in platform custody until completion + dispute window',
      'Idempotent settlement RPCs prevent double-charge / double-payout under retry',
    ],
  },
  {
    icon:  ShieldCheck,
    title: 'Service availability description',
    body:  'Coordination services run on a managed cloud provider (Supabase + Vercel) with multi-region redundancy. Uptime targets are stricter for the dispatch + payment paths than for marketing surfaces.',
    bullets: [
      'Dispatch + payment processing on the hot path with regional failover',
      'Marketing surfaces served from a global CDN edge',
      'Status reporting available on request for institutional accounts',
      'SLA terms negotiated per framework agreement (see /procurement/rfp)',
    ],
  },
];

export default function VendorCompliancePackPage() {
  const { setPage } = useApp();
  return (
    <main className="bg-white text-ink-900">
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><ShieldCheck size={12} /> Vendor compliance pack</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Procurement-compatible vendor briefing.
        </h1>
        <p className="text-white/75 max-w-2xl text-lg leading-relaxed">
          The pack ministries, universities, NGOs, and enterprise procurement
          teams ask for before engaging a logistics platform. Everything in
          one place; deeper documentation available on request.
        </p>
        <div className="mt-7">
          <InstitutionalCTAs
            only={['submit-procurement-inquiry','download-capability-brief','schedule-infrastructure-discussion']}
            emphasizePrimary
          />
        </div>
      </Section>

      <Section tone="canvas" size="default">
        <div className="space-y-6">
          {PACK_SECTIONS.map(s => (
            <article key={s.title} className="bg-surface-soft border border-slate-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <span className="inline-flex w-10 h-10 rounded-xl bg-brand-50 text-brand-600 items-center justify-center flex-shrink-0">
                  <s.icon size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-ink-900 mb-1">{s.title}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{s.body}</p>
                  <ul className="space-y-1.5">
                    {s.bullets.map(b => (
                      <li key={b} className="text-sm text-slate-700 flex items-start gap-2">
                        <ShieldCheck size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section tone="warm" size="default" containerSize="narrow">
        <div className="bg-white border border-amber-300/60 rounded-2xl p-6">
          <Eyebrow tone="brand" className="mb-1"><Mail size={11} className="inline mr-1" /> Procurement contact channel</Eyebrow>
          <h2 className="text-2xl font-extrabold text-ink-900 mb-2">Direct line for procurement teams</h2>
          <p className="text-slate-700 mb-4 leading-relaxed">
            Submissions via /procurement/rfp route to a dedicated procurement
            queue (not the consumer support inbox) and receive a 2-business-day
            triage response. For framework-agreement engagements we follow up
            with an infrastructure discussion to scope the pilot.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setPage('procurement-rfp')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition"
            >
              Submit a procurement inquiry
            </button>
            <button
              onClick={() => setPage('capability-brief')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-ink-900 font-bold rounded-xl hover:border-ink-900 transition"
            >
              Download capability brief
            </button>
          </div>
        </div>
      </Section>
    </main>
  );
}
