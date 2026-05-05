import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, ShieldCheck, FileCheck, FileText, AlertTriangle,
  Truck, Globe2, type LucideIcon,
} from 'lucide-react';
import { useApp } from '../lib/store';
import {
  ONBOARDING_RULES, findOnboardingRules, mergeWithUniversal,
  applyConditions, COMPLIANCE_DISCLOSURE,
  type OnboardingCountryCode, type OnboardingField,
} from '../lib/onboarding-rules';
import {
  PROVIDER_CATEGORIES, findProviderCategory, type ProviderCategorySlug,
} from '../lib/provider-categories';
import { Section, Eyebrow, Pill , INPUT_FOCUS} from '../components/ds';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <ProviderRequirementsPage> — /providers/requirements
 *
 * Public preview surface that lets a prospective provider see
 * exactly what they need to register *before* they hit the
 * application form. Three inputs:
 *
 *   1. Country  — drives which country-specific fields apply
 *   2. Category — drives whether vehicle / licensing fields surface
 *   3. Vehicle? — explicit override for prospects who want to opt
 *                 into / out of the vehicle compliance block
 *
 * Output is the merged field list (universal + country-specific +
 * conditional) with required vs optional badges, plus the global
 * compliance disclosure pinned at the top so the platform's
 * coordination-layer posture is unambiguous.
 *
 * Reads + renders are pure — no Supabase calls — so the page works
 * for unauthenticated visitors who haven't yet signed up.
 * ───────────────────────────────────────────────────────────────── */

const COUNTRY_FLAGS: Record<OnboardingCountryCode, string> = {
  us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷',
  no: '🇳🇴', ng: '🇳🇬', ke: '🇰🇪', ae: '🇦🇪', in: '🇮🇳',
};

export default function ProviderRequirementsPage() {
  const { setPage } = useApp();

  const [country,        setCountry]        = useState<OnboardingCountryCode>('us');
  const [category,       setCategory]       = useState<ProviderCategorySlug>('moving-labor');
  /* Vehicle defaults to the category's typical operating profile.
   * Customer can override via the toggle. */
  const [vehicleOverride, setVehicleOverride] = useState<boolean | null>(null);

  useEffect(() => {
    track('provider_requirements_viewed', { country, category });
  }, [country, category]);

  const rules    = findOnboardingRules(country);
  const cat      = findProviderCategory(category);
  const vehicle  = vehicleOverride ?? cat?.defaultVehicleOperation ?? false;

  const fields: OnboardingField[] = useMemo(() => {
    if (!rules) return [];
    return applyConditions(
      mergeWithUniversal(rules),
      {
        vehicleOperation:    vehicle,
        /* Heuristic: licensed-carrier registrations imply heavy
         * transport (the licensing fields surface); other categories
         * default to false unless we know otherwise. */
        heavyTransportOnly:  cat?.defaultLicensingRequired === true && vehicle,
        /* Interstate is US-only and surfaces when the customer
         * registers as a licensed-carrier. */
        interstateOnly:      country === 'us' && category === 'licensed-carrier' && vehicle,
      },
    );
  }, [rules, vehicle, cat, country, category]);

  const required = fields.filter(f => f.requirement === 'required').length;
  const optional = fields.filter(f => f.requirement === 'optional').length;
  /* Conditional fields rendered as required after applyConditions
   * filters them in. */
  const surfaced = fields.filter(f => f.requirement === 'conditional').length;

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><FileCheck size={12} /> Provider requirements</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          See exactly what you need before you apply.
        </h1>
        <p className="text-white/75 max-w-2xl">
          Onboarding rules adapt to your country, category, and whether you
          operate vehicles. Pick the three inputs below — we'll surface only
          the fields that actually apply to you.
        </p>
      </Section>

      {/* COMPLIANCE DISCLOSURE — pinned at the top of the requirements
          flow so the platform's posture is unambiguous before anyone
          submits their first answer. */}
      <Section tone="warm" size="sm">
        <div className="flex items-start gap-3 bg-white border border-amber-300/60 rounded-2xl p-5 max-w-4xl">
          <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong className="text-ink-900 block mb-1">Coordination layer · not a moving company</strong>
            {COMPLIANCE_DISCLOSURE}
          </p>
        </div>
      </Section>

      {/* INPUTS + OUTPUT */}
      <Section tone="canvas" size="default">
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 space-y-5">
            {/* Country */}
            <FieldGroup label="Country" icon={Globe2}>
              <select
                value={country}
                onChange={e => setCountry(e.target.value as OnboardingCountryCode)}
                className={`w-full px-3 py-2 text-sm border border-slate-300 rounded-lg ${INPUT_FOCUS} bg-white`}
              >
                {ONBOARDING_RULES.map(r => (
                  <option key={r.country} value={r.country}>
                    {COUNTRY_FLAGS[r.country]} {r.countryName}
                  </option>
                ))}
              </select>
              {rules?.subtitle && (
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{rules.subtitle}</p>
              )}
            </FieldGroup>

            {/* Category */}
            <FieldGroup label="Provider category" icon={FileText}>
              <div className="space-y-1.5">
                {PROVIDER_CATEGORIES
                  .filter(c => !rules || rules.supportedCategories.includes(c.slug))
                  .map(c => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => {
                        setCategory(c.slug);
                        /* Reset the vehicle override so the new
                         * category's default takes effect. */
                        setVehicleOverride(null);
                      }}
                      aria-pressed={category === c.slug}
                      className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition ${
                        category === c.slug
                          ? 'bg-ink-900 text-white border-ink-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-ink-900'
                      }`}
                    >
                      <c.icon size={16} className={category === c.slug ? 'text-amber-300 flex-shrink-0 mt-0.5' : 'text-slate-400 flex-shrink-0 mt-0.5'} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{c.name}</p>
                        <p className={`text-[11px] ${category === c.slug ? 'text-white/70' : 'text-slate-500'} leading-snug`}>{c.description}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </FieldGroup>

            {/* Vehicle override */}
            <FieldGroup label="Vehicle operation" icon={Truck}>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setVehicleOverride(true)}
                  aria-pressed={vehicle === true}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition ${
                    vehicle === true
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  Yes — I operate vehicles
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleOverride(false)}
                  aria-pressed={vehicle === false}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition ${
                    vehicle === false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  No — labor only
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {cat?.defaultVehicleOperation
                  ? 'Default for this category: vehicles included.'
                  : 'Default for this category: labor-only.'}
              </p>
            </FieldGroup>

            <button
              onClick={() => {
                track('provider_requirements_apply_clicked', { country, category, vehicle });
                setPage('driver-onboarding');
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition shadow-medium"
            >
              Start application
              <ArrowRight size={14} />
            </button>
          </div>

          {/* OUTPUT — required + optional fields */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-baseline justify-between flex-wrap gap-3 mb-5">
              <Eyebrow tone="brand" className="mb-0">What you'll need</Eyebrow>
              <p className="text-xs text-slate-500">
                <strong className="text-ink-900">{required + surfaced}</strong> required ·{' '}
                <strong className="text-ink-900">{optional}</strong> optional
              </p>
            </div>

            {fields.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 inline-flex items-center gap-2">
                <AlertTriangle size={14} />
                We don't have curated requirements for this market yet.
                Universal fields apply.
              </div>
            ) : (
              <ul className="space-y-2">
                {fields.map(f => (
                  <FieldRow key={f.slug} field={f} />
                ))}
              </ul>
            )}

            {rules?.note && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <strong className="text-ink-900">Country note · </strong>
                  {rules.note}
                </p>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* COUNTRY GRID — quick scan of every supported market */}
      <Section tone="soft" size="default">
        <Eyebrow tone="brand" className="mb-1">Every market we onboard in</Eyebrow>
        <h2 className="text-2xl font-extrabold text-ink-900 mb-6">
          {ONBOARDING_RULES.length} markets · adaptive rules engine
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ONBOARDING_RULES.map(r => (
            <button
              key={r.country}
              onClick={() => setCountry(r.country)}
              className={`text-left bg-white hover:bg-amber-50 border rounded-2xl p-4 transition ${
                country === r.country
                  ? 'border-brand-400'
                  : 'border-slate-200 hover:border-brand-400/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span aria-hidden className="text-lg">{COUNTRY_FLAGS[r.country]}</span>
                <p className="font-extrabold text-ink-900">{r.countryName}</p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{r.subtitle}</p>
            </button>
          ))}
        </div>
      </Section>
    </main>
  );
}

function FieldGroup({ label, icon: Icon, children }: {
  label: string; icon?: LucideIcon; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 inline-flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-slate-400" />}
        {label}
      </p>
      {children}
    </div>
  );
}

function FieldRow({ field }: { field: OnboardingField }) {
  const tone =
    field.requirement === 'required'    ? 'bg-rose-50 text-rose-700' :
    field.requirement === 'conditional' ? 'bg-amber-50 text-amber-700' :
                                          'bg-slate-100 text-slate-600';
  const label =
    field.requirement === 'required'    ? 'REQUIRED' :
    field.requirement === 'conditional' ? 'REQUIRED FOR YOU' :
                                          'OPTIONAL';
  return (
    <li className="flex items-start gap-3 px-3 py-3 bg-surface-soft rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink-900">{field.label}</p>
        {field.helpText && (
          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{field.helpText}</p>
        )}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-1 flex-shrink-0 ${tone}`}>
        {label}
      </span>
    </li>
  );
}
