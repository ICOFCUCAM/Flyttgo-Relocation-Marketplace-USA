import React, { useState } from 'react';
import {
  Send, Loader2, CheckCircle2, ShieldCheck, Upload, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../lib/store';
import { Section, Eyebrow, Pill } from '../components/ds';
import {
  submitRfp, uploadRfpAttachment,
  type RfpSector, type RfpTimeline, type RfpBudgetRange,
} from '../lib/procurement-store';
import { COUNTRY_PROFILES } from '../lib/country-profiles';
import { COMPLIANCE_DISCLOSURE } from '../lib/onboarding-rules';

/* ─────────────────────────────────────────────────────────────────
 * <RFPSubmissionPage> — /procurement/rfp
 *
 * Public, anon-allowed procurement intake. Sender doesn't need to
 * sign in (the rfp_submissions row stamps NULL for
 * submitted_by_user_id when anon, the platform's procurement queue
 * picks it up via admin reads).
 *
 * Form fields per the spec:
 *   - organization name *
 *   - country *
 *   - sector *
 *   - deployment type *
 *   - timeline *
 *   - budget range (optional)
 *   - document upload (optional) — uploaded to rfp-attachments bucket
 *   - contact person + email + phone
 *   - notes (optional)
 *
 * On success → confirmation block with "we'll respond within
 * 2 business days" + a "Submit another" reset.
 * ───────────────────────────────────────────────────────────────── */

const SECTORS: { value: RfpSector; label: string }[] = [
  { value: 'corporate',         label: 'Corporate · workforce mobility' },
  { value: 'enterprise',        label: 'Enterprise relocation' },
  { value: 'university',        label: 'University / higher education' },
  { value: 'municipal',         label: 'Municipal / city authority' },
  { value: 'government',        label: 'Government / ministry' },
  { value: 'embassy',           label: 'Embassy / consulate' },
  { value: 'ngo',               label: 'NGO / humanitarian' },
  { value: 'transit-authority', label: 'Transit authority' },
  { value: 'other',             label: 'Other' },
];

const TIMELINES: { value: RfpTimeline; label: string }[] = [
  { value: 'asap',  label: 'ASAP (within 30 days)' },
  { value: '30d',   label: 'Within 1 month' },
  { value: '90d',   label: 'Within 3 months' },
  { value: '6m',    label: 'Within 6 months' },
  { value: '12m+',  label: '12+ months · framework planning' },
];

const BUDGETS: { value: RfpBudgetRange; label: string }[] = [
  { value: '0-25k',     label: 'Under $25,000' },
  { value: '25-100k',   label: '$25,000 – $100,000' },
  { value: '100-500k',  label: '$100,000 – $500,000' },
  { value: '500k+',     label: '$500,000+' },
];

export default function RFPSubmissionPage() {
  const { setPage } = useApp();

  const [organizationName, setOrganizationName] = useState('');
  const [country,          setCountry]          = useState('us');
  const [sector,           setSector]           = useState<RfpSector>('government');
  const [deploymentType,   setDeploymentType]   = useState('');
  const [timeline,         setTimeline]         = useState<RfpTimeline>('90d');
  const [budgetRange,      setBudgetRange]      = useState<RfpBudgetRange | ''>('');
  const [contactPerson,    setContactPerson]    = useState('');
  const [contactEmail,     setContactEmail]     = useState('');
  const [contactPhone,     setContactPhone]     = useState('');
  const [notes,            setNotes]            = useState('');
  const [file,             setFile]             = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  async function handleSubmit() {
    if (!organizationName.trim() || !contactPerson.trim() || !contactEmail.trim() || !deploymentType.trim()) {
      toast.error('Please complete the required fields'); return;
    }
    setSubmitting(true);
    try {
      let documentUrl: string | undefined;
      if (file) documentUrl = await uploadRfpAttachment(file);

      await submitRfp({
        organizationName,
        country,
        sector,
        deploymentType,
        timeline,
        budgetRangeUsd: budgetRange || undefined,
        documentUrl,
        contactPerson,
        contactEmail,
        contactPhone:   contactPhone || undefined,
        notes:          notes || undefined,
      });
      setSubmitted(true);
      toast.success('Procurement inquiry received', {
        description: 'We respond within 2 business days.',
      });
    } catch (err) {
      toast.error('Submission failed', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setOrganizationName(''); setDeploymentType(''); setBudgetRange('');
    setContactPerson(''); setContactEmail(''); setContactPhone('');
    setNotes(''); setFile(null);
    setSubmitted(false);
  }

  return (
    <main className="bg-white text-ink-900">
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><Send size={12} /> Procurement intake</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Submit a procurement inquiry.
        </h1>
        <p className="text-white/75 max-w-2xl text-lg leading-relaxed">
          For ministries, universities, NGOs, transit authorities, and
          enterprise HR / mobility teams. Use this form to request a
          solution brief, start a pilot, or kick off framework-agreement
          procurement. We respond within 2 business days.
        </p>
      </Section>

      <Section tone="warm" size="sm">
        <div className="flex items-start gap-3 bg-white border border-amber-300/60 rounded-2xl p-5 max-w-4xl">
          <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-ink-900 block mb-1">Procurement queue · institutional handling</strong>
            {COMPLIANCE_DISCLOSURE} Submissions go to the platform's
            procurement team rather than the consumer support inbox.
          </p>
        </div>
      </Section>

      {submitted ? (
        <Section tone="canvas" size="default" containerSize="narrow">
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-8 text-center">
            <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold text-ink-900 mb-2">Inquiry received.</h2>
            <p className="text-slate-700 mb-5 max-w-lg mx-auto">
              We've routed your submission to the procurement team. Expect a
              response within 2 business days at <strong>{contactEmail}</strong>.
              For pilot programmes the next step is typically a 30-minute
              infrastructure discussion to scope the engagement.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="px-5 py-2.5 bg-ink-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
              >
                Submit another
              </button>
              <button
                onClick={() => setPage('pilot-deployment-programs')}
                className="px-5 py-2.5 bg-white border border-slate-200 text-ink-900 font-bold rounded-xl hover:border-ink-900 transition"
              >
                See pilot programmes
              </button>
            </div>
          </div>
        </Section>
      ) : (
        <Section tone="canvas" size="default" containerSize="default">
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <Eyebrow tone="brand">Inquiry form</Eyebrow>

              <Field label="Organization name *">
                <input value={organizationName} onChange={e => setOrganizationName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Country *">
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {COUNTRY_PROFILES.map(p => (
                      <option key={p.code} value={p.code}>{p.flag} {p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Sector *">
                  <select value={sector} onChange={e => setSector(e.target.value as RfpSector)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Deployment type *">
                <input value={deploymentType} onChange={e => setDeploymentType(e.target.value)}
                  placeholder="e.g. Pilot programme · Framework procurement · Single relocation campaign"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Timeline *">
                  <select value={timeline} onChange={e => setTimeline(e.target.value as RfpTimeline)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {TIMELINES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Budget range (optional)">
                  <select value={budgetRange} onChange={e => setBudgetRange(e.target.value as RfpBudgetRange | '')}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    <option value="">Not disclosed</option>
                    {BUDGETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Brief / RFP / framework draft (optional)">
                <label className="flex items-center gap-3 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-ink-900 transition">
                  <Upload size={14} className="text-slate-400" />
                  <span className="text-sm text-slate-700 truncate">
                    {file ? file.name : 'Click to attach (PDF / DOCX / images, ≤ 20 MB)'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md,image/*"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Contact person *">
                  <input value={contactPerson} onChange={e => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </Field>
                <Field label="Contact email *">
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </Field>
              </div>
              <Field label="Contact phone (optional)">
                <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </Field>

              <Field label="Notes (optional)">
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anything else procurement should know — scope, integration constraints, success criteria."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </Field>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-ink-900 font-bold rounded-xl shadow-medium transition"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {submitting ? 'Submitting…' : 'Submit inquiry'}
              </button>
            </div>

            <aside className="lg:col-span-4 bg-amber-50 border border-amber-200 rounded-2xl p-6 self-start">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">
                What happens next
              </p>
              <ol className="space-y-3 text-sm text-slate-700 mb-5">
                <Step n={1} body="Procurement team triages the inquiry within 1 business day." />
                <Step n={2} body="Match to engagement model (pilot · framework · direct booking)." />
                <Step n={3} body="Schedule infrastructure discussion + send capability brief." />
                <Step n={4} body="Pilot scope or framework agreement signed." />
                <Step n={5} body="CIP-tier providers dispatched on first booking." />
              </ol>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Anonymous submissions are fine — we'll only ever email the
                contact you list. Adding your organization domain in the
                contact email accelerates triage.
              </p>
            </aside>
          </div>
        </Section>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Step({ n, body }: { n: number; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs font-extrabold">
        {n}
      </span>
      <span className="leading-relaxed">{body}</span>
    </li>
  );
}
