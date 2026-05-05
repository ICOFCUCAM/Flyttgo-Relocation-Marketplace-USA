import { Fragment, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { useApp } from '../lib/store';
import { supabase } from '../lib/supabase';
import MarketplaceBanner from './banners/MarketplaceBanner';
import {
  findOnboardingRules, applyConditions,
  COMPLIANCE_DISCLOSURE,
  ONBOARDING_RULES,
  type OnboardingCountryCode,
} from '../lib/onboarding-rules';
import { POPULAR_CITIES } from '../lib/popular-cities';
import { ANCHOR_CITIES } from '../lib/expansion-cities';
import type { BookingCountry } from '../lib/store';

const VEHICLE_TYPES = [
  { id: 'small_van', label: 'Small Van (3–4 m³)', examples: 'Ford Transit Connect, VW Caddy' },
  { id: 'medium_van', label: 'Medium Van (6–9 m³)', examples: 'Ford Transit Custom, Mercedes Vito' },
  { id: 'large_van', label: 'Large Van (11–15 m³)', examples: 'Mercedes Sprinter, Ford Transit LWB' },
  { id: 'luton_van', label: 'Luton Van (18–20 m³)', examples: 'Luton Box Truck with Tail Lift' },
];

/**
 * Phase 6 — Provider onboarding categories.
 *
 * Every applicant declares which marketplace category they operate in.
 * Vehicle and document collection still happens in steps 2/3 because
 * licensed carriers and labor providers need to surface that data, but
 * the category choice is what the marketplace records as the
 * application's primary classification.
 */
const PROVIDER_CATEGORIES = [
  { id: 'licensed_moving_carrier',         label: 'Licensed moving carrier',          desc: 'USDOT/MC, GüKG, GVOL, registre des transporteurs, yrkestransportløyve, or equivalent national operator licence.' },
  { id: 'moving_labor_provider',           label: 'Moving labor provider',            desc: 'Independent labor crews for loading, unloading, and in-home moves.' },
  { id: 'packing_services_provider',       label: 'Packing services provider',        desc: 'Packing crews, materials, and crating from independent providers.' },
  { id: 'storage_facility_partner',        label: 'Storage facility partner',         desc: 'Self-storage, bonded warehouse, or staged-storage operator.' },
  { id: 'vehicle_rental_partner',          label: 'Vehicle rental partner',           desc: 'Truck and van rental operators integrated alongside coordinated relocations.' },
  { id: 'freight_forwarding_partner',      label: 'Freight forwarding partner',       desc: 'Cross-border freight, customs documentation coordination, and consolidation.' },
  { id: 'international_relocation_coordinator', label: 'International relocation coordinator', desc: 'End-to-end origin- and arrival-country relocation orchestration.' },
  { id: 'university_relocation_partner',   label: 'University relocation partner',    desc: 'Student move-in / move-out, residence hall windows, semester mobility.' },
  { id: 'corporate_relocation_vendor',     label: 'Corporate relocation vendor',      desc: 'Talent mobility, project relocation, consolidated procurement workflows.' },
];

/* ── Documents collected in step 3 ──────────────────────────────────
 * Each key is the canonical document_type value we write to
 * driver_documents. The admin dashboard approval flow already reads
 * those exact strings (see AdminDashboard REQUIRED_DOCS), so we stay
 * aligned by not renaming them. */
/** Flag emojis keyed on the lowercase country code in ONBOARDING_RULES.
 *  Lookup-only — the rules file holds the canonical name + compliance
 *  fields, this just decorates the dropdown. Add a row when introducing
 *  a new country to onboarding-rules.ts. */
const COUNTRY_FLAG: Record<string, string> = {
  us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', no: '🇳🇴',
  ae: '🇦🇪', ng: '🇳🇬', ke: '🇰🇪', in: '🇮🇳',
  nl: '🇳🇱', se: '🇸🇪', dk: '🇩🇰', at: '🇦🇹', be: '🇧🇪',
  es: '🇪🇸', it: '🇮🇹', pl: '🇵🇱', cz: '🇨🇿', cy: '🇨🇾',
};

const DOCUMENT_TYPES = [
  { key: 'driver_license',       label: "Driver's License",   desc: 'Valid US or EU/EEA driver\u2019s license (front + back)' },
  { key: 'insurance',             label: 'Vehicle Insurance',  desc: 'Comprehensive insurance covering commercial use' },
  { key: 'vehicle_registration', label: 'Vehicle Registration', desc: 'Current vehicle registration document' },
  { key: 'identity_document',    label: 'ID / Passport',      desc: 'Government-issued photo ID or passport' },
  { key: 'vehicle_photo',        label: 'Vehicle Photo',      desc: 'Clear exterior photo of the vehicle you will use for jobs' },
] as const;
type DocumentType = typeof DOCUMENT_TYPES[number]['key'];

/** Sanitise a filename segment. We don't trust the uploader's filename
 *  so we rebuild the storage path from {user_id}/{document_type}.{ext}
 *  and only preserve the extension from the original name. */
function extensionOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : 'bin';
}

export default function DriverOnboarding() {
  const { user, profile } = useAuth();
  const { setPage, setShowAuthModal, setAuthMode } = useApp();
  const { t } = useTranslation();

  /* Steps list — built inside the component so titles translate
   * when the language changes. */
  const STEPS = [
    { id: 1, title: t('driverOnboarding.stepPersonal'),   desc: t('driverOnboarding.stepPersonalDesc') },
    { id: 2, title: t('driverOnboarding.stepVehicle'),    desc: t('driverOnboarding.stepVehicleDesc') },
    { id: 3, title: t('driverOnboarding.stepDocuments'),  desc: t('driverOnboarding.stepDocumentsDesc') },
    { id: 4, title: t('driverOnboarding.stepReview'),     desc: t('driverOnboarding.stepReviewDesc') },
  ];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Personal + provider category (Phase 6)
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState<string>('');
  const [providerCategory, setProviderCategory] = useState('');
  /* Country-specific compliance answers — keyed by the rule's
   * field slug (e.g. 'usdot-number', 'siret', 'gewerbeanmeldung').
   * Persisted as JSON appended to vehicle_model so we don't need a
   * schema migration; the admin dashboard renders the full string. */
  const [complianceAnswers, setComplianceAnswers] = useState<Record<string, string>>({});
  /* Vehicle-operation toggle drives the rules engine's conditional
   * gating (USDOT, GVOL, etc. only surface when this is true). */
  const [operatesVehicles, setOperatesVehicles] = useState(true);

  // Step 2 — Vehicle
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  // Step 3 — Documents (real file uploads, one per required type)
  const [docFiles, setDocFiles] = useState<Record<DocumentType, File | null>>({
    driver_license:       null,
    insurance:            null,
    vehicle_registration: null,
    identity_document:    null,
    vehicle_photo:        null,
  });

  // Step 4 — Terms
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  function setDocFile(key: DocumentType, file: File | null) {
    setDocFiles(prev => ({ ...prev, [key]: file }));
  }

  /* Resolve the country-specific compliance fields the customer
   * actually needs to fill in. Country code from the picker is the
   * uppercase ISO-2 the form has used historically; the rules engine
   * keys on lowercase, so we lowercase before lookup. */
  const countrySpecificFields = useMemo(() => {
    if (!country) return [];
    const lower = country.toLowerCase() as OnboardingCountryCode;
    const rules = findOnboardingRules(lower);
    if (!rules) return [];
    /* Heavy-transport gates the GVOL / commercial-licence fields when
     * the applicant declared they operate vehicles AND picked a
     * carrier-style category. */
    const heavy = operatesVehicles &&
      ['licensed_moving_carrier','vehicle_rental_partner','freight_forwarding_partner'].includes(providerCategory);
    /* Interstate is US-only and only when the carrier flag is set. */
    const interstate = country === 'US' && providerCategory === 'licensed_moving_carrier' && operatesVehicles;
    return applyConditions(rules.countryFields, {
      vehicleOperation:    operatesVehicles,
      heavyTransportOnly:  heavy,
      interstateOnly:      interstate,
    });
  }, [country, providerCategory, operatesVehicles]);

  function setComplianceField(slug: string, value: string) {
    setComplianceAnswers(prev => ({ ...prev, [slug]: value }));
  }

  /* Upload every selected file to the driver-documents bucket under
   * `${user.id}/${document_type}.${ext}`. Using the user id as the
   * first folder segment matches the storage RLS policy installed
   * in docs/fix-driver-onboarding-pipeline.sql (only the owning
   * driver can write into their own folder). Returns a list of rows
   * to insert into driver_documents afterwards. */
  async function uploadDocuments(): Promise<{
    document_type: DocumentType;
    file_url: string;
  }[]> {
    if (!user) throw new Error('Not signed in');

    const rows: { document_type: DocumentType; file_url: string }[] = [];

    for (const doc of DOCUMENT_TYPES) {
      const file = docFiles[doc.key];
      if (!file) continue;

      const path = `${user.id}/${doc.key}.${extensionOf(file.name)}`;

      const { error: uploadError } = await supabase
        .storage
        .from('driver-documents')
        .upload(path, file, {
          upsert:       true,   // re-submission overwrites the previous file
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      /* We store the raw storage path in driver_documents.file_url
       * rather than a signed / public URL, because the admin panel
       * already resolves it via supabase.storage.from(bucket)
       * .getPublicUrl(path) when rendering the preview. Keeping
       * the path keeps the row agnostic to bucket visibility
       * settings. */
      rows.push({ document_type: doc.key, file_url: path });
    }

    return rows;
  }

  async function handleSubmit() {
    if (!user) {
      /* Silent-return was masking the most common failure mode —
       * the operator filled out four steps without signing up. Be
       * explicit so they can fix it. */
      setError('Please sign in or create an account before submitting.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      /* 1. Upload files to storage. Do this BEFORE inserting the
       *    driver_applications row so a failed upload doesn't leave
       *    an application row pointing at files that don't exist. */
      const uploadedDocs = await uploadDocuments();

      /* 2. Insert the application row. driver_applications columns:
       *    user_id, email, first_name, last_name, phone, address,
       *    license_number, license_expiry, years_experience,
       *    vehicle_type, vehicle_model, vehicle_year (int),
       *    vehicle_registration, cargo_capacity, city, zone, status,
       *    plus structured compliance columns added by
       *    docs/install-application-compliance-columns.sql. */
      const categoryLabel = PROVIDER_CATEGORIES.find(c => c.id === providerCategory)?.label ?? '';

      /* Compliance routing — known onboarding slugs map to dedicated
       * columns. Unmapped slugs (province, business-permit, etc.)
       * are still serialised into the cram-string suffix on
       * vehicle_model so we don't lose data on jurisdictions that
       * don't yet have first-class columns. The reader in
       * src/lib/application-compliance.ts prefers structured
       * columns; the parser is the legacy fallback. */
      const SLUG_TO_COL: Record<string, string> = {
        'usdot-number':                'usdot_number',
        'mc-number':                   'mc_number',
        'cargo-insurance':             'cargo_insurance',
        'operator-licence-uk':         'gvol_number',
        'gewerbeanmeldung':            'gukg_licence',
        'commercial-transport-licence': 'ca_provincial_licence',
        'siret':                       'siret',
        'vat-number':                  'tva',
        'organisation-number':         'yrkestransport',
      };

      const structuredCompliance: Record<string, string> = {};
      const unmappedCompliance:   Record<string, string> = {};
      for (const [slug, raw] of Object.entries(complianceAnswers)) {
        const trimmed = (raw ?? '').trim();
        if (!trimmed) continue;
        const col = SLUG_TO_COL[slug];
        if (col) structuredCompliance[col] = trimmed;
        else     unmappedCompliance[slug]  = trimmed;
      }

      /* Cram-string suffix only carries unmapped slugs now. When
       * every supported jurisdiction has a column, this branch
       * collapses and we can write a clean vehicle_model. */
      const unmappedEntries  = Object.entries(unmappedCompliance);
      const complianceSuffix = unmappedEntries.length > 0
        ? `· compliance=${JSON.stringify(Object.fromEntries(unmappedEntries))}`
        : '';
      const vehicleField  = [categoryLabel, `${vehicleMake} ${vehicleModel}`.trim(), complianceSuffix]
        .filter(Boolean)
        .join(' · ');

      /* Insert with tolerant fallback. PostgREST rejects inserts
       * referencing columns that don't exist (400 PGRST204), so
       * the first attempt sends the structured columns; if the
       * migration in docs/install-application-compliance-columns.
       * sql hasn't been applied yet we retry with just the legacy
       * columns. Either way the cram-string carries the same
       * compliance data so no data is lost.
       *
       * Once the migration is universally applied, drop the
       * fallback branch + unmappedCompliance suffix.
       */
      const legacyRow = {
        user_id: user.id,
        email: user.email ?? null,
        first_name: firstName,
        last_name: lastName,
        phone,
        city,
        zone: country || null,
        vehicle_type: vehicleType,
        vehicle_model: vehicleField,
        vehicle_year: vehicleYear ? parseInt(vehicleYear, 10) : null,
        vehicle_registration: licensePlate,
        status: 'pending',
      };
      const structuredRow = {
        ...legacyRow,
        provider_category: providerCategory || null,
        ...structuredCompliance,
      };

      let appError: Error | null = null;
      const firstAttempt = await supabase.from('driver_applications').insert(structuredRow);
      if (firstAttempt.error) {
        /* PGRST204 = "Could not find the X column of Y in the
         * schema cache". We treat any column-shape error as a
         * signal the migration hasn't applied and retry legacy. */
        const msg = (firstAttempt.error.message ?? '').toLowerCase();
        const looksLikeMissingColumn =
          msg.includes('column') ||
          firstAttempt.error.code === 'PGRST204' ||
          firstAttempt.error.code === '42703';
        if (looksLikeMissingColumn) {
          const retry = await supabase.from('driver_applications').insert(legacyRow);
          appError = retry.error as Error | null;
        } else {
          appError = firstAttempt.error as Error | null;
        }
      }

      if (appError) throw appError;

      /* 3. Insert one driver_documents row per uploaded file so
       *    the admin dashboard can review them. driver_documents is
       *    keyed on driver_id = auth user id (see AdminDashboard),
       *    not application_id, so we write user.id there. */
      if (uploadedDocs.length > 0) {
        const { error: docsError } = await supabase
          .from('driver_documents')
          .insert(
            uploadedDocs.map(d => ({
              driver_id:           user.id,
              document_type:       d.document_type,
              file_url:            d.file_url,
              verification_status: 'pending',
            }))
          );

        if (docsError) throw docsError;
      }

      /* 4. profiles.role is NOT updated from the client anymore —
       *    the sync_profile_role_on_driver_approval trigger on
       *    driver_profiles now handles it automatically the moment
       *    the admin approves the application. No more best-effort
       *    client-side role update that silently fails under RLS. */

      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.');
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('driverOnboarding.successTitle')}</h2>
          <p className="text-gray-600 mb-6">
            {t('driverOnboarding.successBody')}
          </p>
          <div className="bg-emerald-50 rounded-xl p-4 mb-6 text-sm text-emerald-700">
            <p className="font-semibold mb-1">{t('driverOnboarding.successWhatNext')}</p>
            <ul className="space-y-1 text-left list-disc pl-4">
              <li>{t('driverOnboarding.successStep1')}</li>
              <li>{t('driverOnboarding.successStep2')}</li>
              <li>{t('driverOnboarding.successStep3')}</li>
              <li>{t('driverOnboarding.successStep4')}</li>
            </ul>
          </div>
          <button
            onClick={() => setPage('driver-application-status')}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
          >
            Check application status →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MarketplaceBanner
        variant="inverse"
        eyebrow="Provider onboarding"
        breadcrumb={{ id: 'GLRM.05', label: 'Apply as a provider' }}
        headline={<>Drive for Flytt<span className="text-amber-300">Go</span>. Country-licensed dispatch.</>}
        lead={t('driverOnboarding.heroSubtitle')}
        compliancePills={[
          { label: 'USDOT / GVOL / GüKG eligible' },
          { label: 'Document-verified' },
          { label: 'Escrow-protected payouts' },
          { label: 'Tier-based commission' },
        ]}
      />

      {/* Coordination-layer disclosure — sits below the banner so the
          platform's posture is unambiguous before any field is touched. */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <p className="text-slate-600 text-sm leading-relaxed">
            FlyttGo Global Logistics &amp; Relocation Marketplace operates as a
            digital coordination platform connecting customers with independent
            licensed relocation providers across multiple jurisdictions worldwide.
            Service providers are responsible for compliance with their national
            licensing, taxation, insurance, and regulatory requirements.
          </p>
        </div>
      </div>

      {/* Compliance disclosure — pinned above the step indicator so
          the platform's coordination-layer posture is unambiguous
          before anyone fills in the first field. */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <ShieldCheck size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900 block mb-0.5">
              Coordination layer · not a moving company
            </strong>
            {COMPLIANCE_DISCLOSURE}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((s, i) => (
            <Fragment key={s.id}>
              {i > 0 && (
                <div className={`flex-1 h-0.5 mx-2 ${step > s.id - 1 ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              )}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step === s.id ? 'bg-emerald-600 text-white shadow-lg' :
                  step > s.id ? 'bg-emerald-100 text-emerald-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.id ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s.id}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1 hidden sm:block">{s.title}</div>
              </div>
            </Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {error && (
            <div role="alert" className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
              <span>{error}</span>
              {/* When the failure mode is the unauthenticated submit,
               *  surface the sign-in CTA inline so the operator
               *  doesn't have to hunt for it in the header. The error
               *  copy is the trigger — exact match keeps it scoped. */}
              {!user && error.startsWith('Please sign in') && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                    className="px-3 py-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-md text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    Create account
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 1 — Personal Info */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{t('driverOnboarding.personalTitle')}</h2>
              <p className="text-gray-500 text-sm mb-6">{t('driverOnboarding.personalSubtitle')}</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverOnboarding.firstName')}</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverOnboarding.lastName')}</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverOnboarding.phoneLabel')}</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 XXX XX XXX"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country of operation</label>
                    <select value={country} onChange={e => { setCountry(e.target.value as typeof country); setCity(''); }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white">
                      <option value="">Select country</option>
                      {/* Driven by ONBOARDING_RULES so adding a new
                       *  country in src/lib/onboarding-rules.ts unlocks
                       *  it on the driver form automatically. Ordered
                       *  by display name for predictable UX. */}
                      {[...ONBOARDING_RULES]
                        .sort((a, b) => a.countryName.localeCompare(b.countryName))
                        .map(r => (
                          <option key={r.country} value={r.country.toUpperCase()}>
                            {COUNTRY_FLAG[r.country] ?? ''} {r.countryName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverOnboarding.cityLabel')}</label>
                    {(() => {
                      /* Per-country city list. Active markets pull from
                       *  POPULAR_CITIES (the curated shopfront set);
                       *  expansion markets pull from ANCHOR_CITIES
                       *  (5 anchor cities per country). When neither
                       *  has a list (AE/NG/KE/IN) or the driver picks
                       *  "Other", fall back to free-text. */
                      const lc = country.toLowerCase();
                      const popular = POPULAR_CITIES[lc as BookingCountry] ?? [];
                      const anchor = ANCHOR_CITIES.filter(c => c.country === lc).map(c => c.city);
                      const list = popular.length > 0 ? popular : anchor;
                      const inList = list.includes(city);
                      const useFreeText = list.length === 0 || (city && !inList);
                      if (useFreeText) {
                        return (
                          <input
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            placeholder="City / metro"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                          />
                        );
                      }
                      return (
                        <select
                          value={city}
                          onChange={e => setCity(e.target.value === '__other' ? ' ' : e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                        >
                          <option value="">Select city</option>
                          {list.map(c => <option key={c} value={c}>{c}</option>)}
                          <option value="__other">Other (type below)</option>
                        </select>
                      );
                    })()}
                  </div>
                </div>

                {/* Provider category selector — Phase 6 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider category</label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select the marketplace category your business operates in. You can activate
                    additional categories from the provider portal after the application is approved.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {PROVIDER_CATEGORIES.map(c => (
                      <label
                        key={c.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          providerCategory === c.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="providerCategory"
                          value={c.id}
                          checked={providerCategory === c.id}
                          onChange={() => setProviderCategory(c.id)}
                          className="mt-1 accent-emerald-600"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-gray-900">{c.label}</span>
                          <span className="block text-xs text-gray-500 leading-relaxed mt-0.5">{c.desc}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Operates vehicles toggle — drives which compliance
                    fields the country-specific block surfaces. */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Do you operate vehicles?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Drives which licensing fields apply (e.g. USDOT for US carriers, GVOL for UK heavy transport).
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOperatesVehicles(true)}
                      aria-pressed={operatesVehicles}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                        operatesVehicles
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      Yes — I operate vehicles
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperatesVehicles(false)}
                      aria-pressed={!operatesVehicles}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                        !operatesVehicles
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      No — labor only
                    </button>
                  </div>
                </div>

                {/* Country-specific compliance fields — surfaced
                    dynamically from ONBOARDING_RULES based on the
                    selected country + category + vehicle answer. */}
                {country && countrySpecificFields.length > 0 && (
                  <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
                      {country} compliance
                    </p>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                      Enter what you have today — fields marked optional can be added later.
                    </p>
                    <div className="space-y-3">
                      {countrySpecificFields.map(f => {
                        const reqLabel = f.requirement === 'required'    ? 'Required' :
                                         f.requirement === 'conditional' ? 'Required for you' :
                                                                            'Optional';
                        const reqTone  = f.requirement === 'required'    ? 'bg-rose-100 text-rose-700' :
                                         f.requirement === 'conditional' ? 'bg-amber-100 text-amber-700' :
                                                                            'bg-gray-100 text-gray-600';
                        return (
                          <div key={f.slug}>
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <label htmlFor={`compliance-${f.slug}`} className="text-sm font-medium text-gray-700">{f.label}</label>
                              <span className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-1.5 py-0.5 flex-shrink-0 ${reqTone}`}>
                                {reqLabel}
                              </span>
                            </div>
                            <input
                              id={`compliance-${f.slug}`}
                              value={complianceAnswers[f.slug] ?? ''}
                              onChange={e => setComplianceField(f.slug, e.target.value)}
                              placeholder={f.helpText ?? ''}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                            />
                            {f.helpText && (
                              <p className="text-[11px] text-gray-500 mt-1">{f.helpText}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (firstName && lastName && phone && city && country && providerCategory) {
                    /* Block step transition when a hard-required country
                     * field is empty — conditional-required + optional
                     * fields can still be skipped. */
                    const missing = countrySpecificFields.find(
                      f => f.requirement === 'required' && !(complianceAnswers[f.slug] ?? '').trim(),
                    );
                    if (missing) {
                      setError(`${country} requires "${missing.label}" before you can continue.`);
                      return;
                    }
                    setError('');
                    setStep(2);
                  } else {
                    setError('Please complete every field, including country and provider category.');
                  }
                }}
                className="w-full mt-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
              >
                {t('driverOnboarding.continueBtn')}
              </button>
            </div>
          )}

          {/* STEP 2 — Vehicle */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{t('driverOnboarding.vehicleTitle')}</h2>
              <p className="text-gray-500 text-sm mb-6">{t('driverOnboarding.vehicleSubtitle')}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('driverOnboarding.vehicleType')}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VEHICLE_TYPES.map(v => (
                      <button key={v.id} onClick={() => setVehicleType(v.id)}
                        className={`text-left p-4 rounded-xl border-2 transition ${
                          vehicleType === v.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className="font-medium text-sm text-gray-900">{v.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{v.examples}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverOnboarding.vehicleMake')}</label>
                    <input value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="e.g. Mercedes"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverOnboarding.vehicleModel')}</label>
                    <input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="e.g. Sprinter"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverOnboarding.vehicleYear')}</label>
                    <input value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} placeholder="e.g. 2020"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverOnboarding.licensePlate')}</label>
                    <input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="e.g. AB 12345"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition">{t('driverOnboarding.backBtn')}</button>
                <button
                  onClick={() => {
                    if (vehicleType && vehicleMake && vehicleModel && vehicleYear && licensePlate) {
                      setError('');
                      setStep(3);
                    } else {
                      setError(t('driverOnboarding.errFillVehicle'));
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
                >
                  {t('driverOnboarding.continueBtn')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Documents (real file uploads) */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Documents</h2>
              <p className="text-gray-500 text-sm mb-6">
                Upload clear photos or scans of each document. Accepted formats: JPG, PNG, PDF. Max 10&nbsp;MB per file. Files are uploaded securely to your private folder and only reviewed by the FlyttGo approvals team.
              </p>
              <div className="space-y-3">
                {DOCUMENT_TYPES.map(doc => {
                  const file = docFiles[doc.key];
                  return (
                    <div key={doc.key} className="p-4 rounded-xl border border-gray-200">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm">{doc.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{doc.desc}</div>
                        </div>
                        {file && (
                          <span className="flex-shrink-0 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-1 rounded">
                            ✓ Ready
                          </span>
                        )}
                      </div>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          onChange={e => {
                            const f = e.target.files?.[0] ?? null;
                            if (f && f.size > 10 * 1024 * 1024) {
                              setError('File too large (max 10 MB). Please upload a smaller file.');
                              return;
                            }
                            setError('');
                            setDocFile(doc.key, f);
                          }}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                            file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700
                            hover:file:bg-emerald-100 cursor-pointer"
                        />
                        {file && (
                          <div className="text-xs text-gray-500 mt-2 truncate">
                            {file.name} &middot; {(file.size / 1024 / 1024).toFixed(2)}&nbsp;MB
                          </div>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition">{t('driverOnboarding.backBtn')}</button>
                <button
                  onClick={() => {
                    /* All four document types are required. Keep this
                     * strict so the admin reviewer always has the full
                     * package to look at. */
                    const missing = DOCUMENT_TYPES.filter(d => !docFiles[d.key]).map(d => d.label);
                    if (missing.length === 0) {
                      setStep(4);
                      setError('');
                    } else {
                      setError(`Please upload: ${missing.join(', ')}`);
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
                >
                  {t('driverOnboarding.continueBtn')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Submit</h2>
              <p className="text-gray-500 text-sm mb-6">Please review your information before submitting</p>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Personal Info</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Name:</span> <span className="font-medium">{firstName} {lastName}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{phone}</span></div>
                    <div><span className="text-gray-500">Country:</span> <span className="font-medium">{country || '—'}</span></div>
                    <div><span className="text-gray-500">City:</span> <span className="font-medium">{city}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">Provider category:</span> <span className="font-medium">{PROVIDER_CATEGORIES.find(c => c.id === providerCategory)?.label || '—'}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vehicle</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Type:</span> <span className="font-medium">{VEHICLE_TYPES.find(v => v.id === vehicleType)?.label || '—'}</span></div>
                    <div><span className="text-gray-500">Make/Model:</span> <span className="font-medium">{vehicleMake} {vehicleModel}</span></div>
                    <div><span className="text-gray-500">Year:</span> <span className="font-medium">{vehicleYear}</span></div>
                    <div><span className="text-gray-500">Plate:</span> <span className="font-medium">{licensePlate}</span></div>
                  </div>
                </div>
                <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer">
                  <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    I agree to the <button className="text-emerald-600 underline">Terms of Service</button> and <button className="text-emerald-600 underline">Driver Agreement</button>. I confirm all information provided is accurate.
                  </span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(3)} className="px-6 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition">{t('driverOnboarding.backBtn')}</button>
                <button
                  onClick={() => { if (acceptedTerms) handleSubmit(); else setError('Please accept the terms to continue.'); }}
                  disabled={loading}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? t('driverOnboarding.submittingBtn') : t('driverOnboarding.submitBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
