/* ─────────────────────────────────────────────────────────────────
 * Country-specific provider onboarding rules.
 *
 * Pure data — defines which fields a prospective provider needs to
 * complete to register in each market, plus which ones are required
 * vs optional, plus the conditions that gate certain fields (e.g.
 * USDOT only when vehicle operation = true).
 *
 * Consumed by:
 *   - <ProviderRequirementsPage> (public preview at /providers/requirements)
 *   - <DriverOnboarding> (existing application form — wired in later
 *     PR; today the form is country-agnostic)
 *
 * Mirrors docs/install-onboarding-rules.sql so the same rules can
 * be sourced from Supabase once we move past the curated phase.
 *
 * Scope: covers the 9 markets the pricing engine supports plus
 * India (a 2026 expansion target the spec explicitly calls out).
 * Markets without curated rules fall back to UNIVERSAL_FIELDS only.
 * ───────────────────────────────────────────────────────────────── */

import type { PricingCountry } from './pricing-engine';
import type { ProviderCategorySlug } from './provider-categories';

export type OnboardingFieldSlug =
  /* Universal */
  | 'provider-name'
  | 'phone-verified'
  | 'address'
  | 'service-cities'
  | 'service-radius-km'
  | 'crew-size'
  | 'vehicle-availability'
  | 'packing-availability'
  | 'storage-availability'
  | 'availability-schedule'
  | 'insurance-confirmation'
  /* Country-specific */
  | 'usdot-number'
  | 'mc-number'
  | 'cargo-insurance'
  | 'province'
  | 'business-registration'
  | 'commercial-transport-licence'
  | 'gewerbeanmeldung'
  | 'vat-number'
  | 'siret'
  | 'business-category'
  | 'company-registration'
  | 'self-employed-status'
  | 'operator-licence-uk'
  | 'organisation-number'
  | 'trade-licence'
  | 'emirate'
  | 'cac-registration'
  | 'business-permit'
  | 'county-coverage'
  | 'gst-registration'
  | 'service-city';

export type FieldRequirement = 'required' | 'optional' | 'conditional';

export interface OnboardingField {
  slug:        OnboardingFieldSlug;
  label:       string;
  helpText?:   string;
  requirement: FieldRequirement;
  /** When requirement = 'conditional', the field shows only if the
   *  named pre-condition is true. The form uses a tiny rules engine
   *  to evaluate these against the customer's earlier answers. */
  conditionOn?: 'vehicle-operation' | 'interstate-only' | 'heavy-transport-only';
}

export interface CountryOnboardingRules {
  country:      PricingCountry | 'in';     // include India as expansion target
  countryName:  string;
  /** Country-specific subtitle — shown below the country picker on
   *  the requirements page. */
  subtitle:     string;
  /** Field set in display order. Universal fields are appended
   *  automatically by mergeWithUniversal() so this list only needs
   *  to carry the country-specific extras. */
  countryFields: OnboardingField[];
  /** Categories this country actively supports. If a category isn't
   *  listed, the registration tile is hidden for this market. */
  supportedCategories: ProviderCategorySlug[];
  /** Marketing-side note shown next to the rules — the country's
   *  general onboarding stance. */
  note?:        string;
}

/* ── Universal fields — always required regardless of country.
 *    Appended by mergeWithUniversal() so each rule entry below stays
 *    focused on the country-specific extras. */
export const UNIVERSAL_FIELDS: OnboardingField[] = [
  { slug: 'provider-name',           label: 'Provider name (company or sole trader)', requirement: 'required' },
  { slug: 'phone-verified',          label: 'Verified phone number',                   requirement: 'required',
    helpText: 'We send an SMS code to confirm.' },
  { slug: 'address',                 label: 'Operating address',                       requirement: 'required' },
  { slug: 'service-cities',          label: 'Cities you serve',                        requirement: 'required',
    helpText: 'Add up to 8 cities at registration; you can edit later.' },
  { slug: 'service-radius-km',       label: 'Service radius (km)',                     requirement: 'required',
    helpText: 'Maximum distance from your home city you accept.' },
  { slug: 'crew-size',               label: 'Crew sizes you offer',                    requirement: 'required',
    helpText: '2 / 3 / 4 / 5 movers — pick all that apply.' },
  { slug: 'vehicle-availability',    label: 'Vehicle availability',                    requirement: 'required',
    helpText: 'Truck included? Bring-your-own? Both?' },
  { slug: 'packing-availability',    label: 'Packing services',                        requirement: 'optional' },
  { slug: 'storage-availability',    label: 'Storage staging',                         requirement: 'optional' },
  { slug: 'availability-schedule',   label: 'Operating hours + days',                  requirement: 'required' },
  { slug: 'insurance-confirmation',  label: 'Insurance declaration',                   requirement: 'required',
    helpText: 'Confirm your active goods-in-transit / public liability cover.' },
];

/* ── Compliance disclosure — shown above every onboarding form
 *    regardless of country. Required to keep the marketplace's
 *    coordination-layer posture clear. */
export const COMPLIANCE_DISCLOSURE =
  "FlyttGo operates as a digital coordination marketplace connecting " +
  "customers with independent relocation service providers. Service " +
  "providers are responsible for compliance with their national " +
  "licensing, taxation, insurance, and regulatory obligations.";

/* ── Per-country rules ──────────────────────────────────────────── */

export const ONBOARDING_RULES: CountryOnboardingRules[] = [
  {
    country: 'us', countryName: 'United States',
    subtitle: 'FMCSA-aware. Labor-only providers don\'t need a USDOT — registered carriers do.',
    countryFields: [
      { slug: 'usdot-number',
        label: 'USDOT number',
        requirement: 'conditional', conditionOn: 'vehicle-operation',
        helpText: 'Required for any provider operating commercial motor vehicles. fmcsa.dot.gov/registration' },
      { slug: 'mc-number',
        label: 'MC number',
        requirement: 'conditional', conditionOn: 'interstate-only',
        helpText: 'Required for interstate household-goods carriers. Apply via the FMCSA Unified Registration System.' },
      { slug: 'cargo-insurance',
        label: 'Cargo insurance certificate',
        requirement: 'conditional', conditionOn: 'vehicle-operation',
        helpText: 'BMC-91 / BMC-91X for HHG carriers; minimum $750k liability.' },
    ],
    supportedCategories: [
      'licensed-carrier','moving-labor','packing','storage','vehicle-rental',
      'freight-forwarding','international-relocation','university-relocation','corporate-relocation',
    ],
    note: 'Sales tax is the provider\'s responsibility per state. FlyttGo doesn\'t collect sales tax on the provider\'s behalf.',
  },
  {
    country: 'ca', countryName: 'Canada',
    subtitle: 'Province-led licensing. Most labor crews don\'t need a commercial transport licence.',
    countryFields: [
      { slug: 'province',
        label: 'Province of operation',          requirement: 'required' },
      { slug: 'business-registration',
        label: 'Business registration number',   requirement: 'required',
        helpText: 'Federal or provincial corporation number, or sole-proprietor BN.' },
      { slug: 'commercial-transport-licence',
        label: 'Commercial transport licence',
        requirement: 'conditional', conditionOn: 'heavy-transport-only',
        helpText: 'Required in some provinces for vehicles over 4,500 kg GVWR.' },
    ],
    supportedCategories: [
      'licensed-carrier','moving-labor','packing','storage','vehicle-rental',
      'freight-forwarding','international-relocation','university-relocation','corporate-relocation',
    ],
  },
  {
    country: 'gb', countryName: 'United Kingdom',
    subtitle: 'GVOL operator licensing for vehicles >3.5t — most labor crews run unlicensed.',
    countryFields: [
      { slug: 'company-registration',
        label: 'Companies House registration',   requirement: 'optional',
        helpText: 'Sole traders can skip this and tick the self-employed declaration instead.' },
      { slug: 'self-employed-status',
        label: 'Self-employed status declaration', requirement: 'optional' },
      { slug: 'operator-licence-uk',
        label: 'GVOL operator licence',
        requirement: 'conditional', conditionOn: 'heavy-transport-only',
        helpText: 'Required for vehicles over 3.5t. Apply via the Traffic Commissioner.' },
    ],
    supportedCategories: [
      'licensed-carrier','moving-labor','packing','storage','vehicle-rental',
      'freight-forwarding','international-relocation','university-relocation','corporate-relocation',
    ],
  },
  {
    country: 'de', countryName: 'Germany',
    subtitle: 'Strict regulatory environment — Gewerbeanmeldung is the entry ticket.',
    countryFields: [
      { slug: 'gewerbeanmeldung',
        label: 'Gewerbeanmeldung',                requirement: 'required',
        helpText: 'Business registration with your local Gewerbeamt.' },
      { slug: 'vat-number',
        label: 'USt-IdNr (VAT number)',           requirement: 'optional',
        helpText: 'Optional at early stage — can be added once turnover exceeds Kleinunternehmer threshold.' },
    ],
    supportedCategories: [
      'licensed-carrier','packing','storage','vehicle-rental',
      'freight-forwarding','international-relocation','corporate-relocation',
    ],
    note: 'GüKG-licensed Umzugsfirma required for interstate moves over 3.5t.',
  },
  {
    country: 'fr', countryName: 'France',
    subtitle: 'SIRET-driven. Inscription au registre des transporteurs for full carriers.',
    countryFields: [
      { slug: 'siret',
        label: 'SIRET number',                    requirement: 'required',
        helpText: 'Établissement registration. 14 digits.' },
      { slug: 'business-category',
        label: 'Code APE / NAF',                  requirement: 'required',
        helpText: '52.10A (storage), 52.29B (transport auxiliaries), 49.41B (freight road transport), 81.22Z (cleaning), etc.' },
    ],
    supportedCategories: [
      'licensed-carrier','packing','storage','vehicle-rental',
      'freight-forwarding','international-relocation','corporate-relocation',
    ],
  },
  {
    country: 'no', countryName: 'Norway',
    subtitle: 'Yrkestransportløyve required for commercial transport. Premium market — strong vetting.',
    countryFields: [
      { slug: 'organisation-number',
        label: 'Organisasjonsnummer',             requirement: 'required',
        helpText: 'Brønnøysundregistrene. 9 digits.' },
    ],
    supportedCategories: [
      'licensed-carrier','packing','storage','vehicle-rental',
      'freight-forwarding','international-relocation','corporate-relocation',
    ],
  },
  {
    country: 'ae', countryName: 'United Arab Emirates',
    subtitle: 'Trade licence + Emirate registration. Corporate-sponsored sector dominates.',
    countryFields: [
      { slug: 'trade-licence',
        label: 'Trade licence number',            requirement: 'required',
        helpText: 'Issued by the Department of Economic Development in your Emirate.' },
      { slug: 'emirate',
        label: 'Emirate of operation',            requirement: 'required',
        helpText: 'Dubai / Abu Dhabi / Sharjah / Ajman / Ras Al Khaimah / Fujairah / Umm Al Quwain.' },
    ],
    supportedCategories: [
      'licensed-carrier','packing','storage','vehicle-rental',
      'freight-forwarding','international-relocation','corporate-relocation',
    ],
  },
  {
    country: 'ng', countryName: 'Nigeria',
    subtitle: 'Marketplace-first onboarding. CAC registration optional at the early stage.',
    countryFields: [
      { slug: 'cac-registration',
        label: 'CAC registration',                requirement: 'optional',
        helpText: 'Corporate Affairs Commission. Optional at early stage; required to access corporate accounts.' },
    ],
    supportedCategories: [
      'moving-labor','licensed-carrier','vehicle-rental','university-relocation','corporate-relocation',
    ],
  },
  {
    country: 'ke', countryName: 'Kenya',
    subtitle: 'County-level coverage. Business permit is the entry ticket.',
    countryFields: [
      { slug: 'business-permit',
        label: 'County business permit',          requirement: 'required',
        helpText: 'Issued by your county government. Renew annually.' },
      { slug: 'county-coverage',
        label: 'Counties served',                 requirement: 'required',
        helpText: 'Pick the counties you cover — 47 in Kenya.' },
    ],
    supportedCategories: [
      'moving-labor','licensed-carrier','vehicle-rental','corporate-relocation',
    ],
  },
  {
    country: 'in', countryName: 'India',
    subtitle: 'Flexible onboarding for the launch phase — GST optional below threshold.',
    countryFields: [
      { slug: 'gst-registration',
        label: 'GST registration',                requirement: 'optional',
        helpText: 'Optional for providers under the ₹20 lakh turnover threshold; mandatory above.' },
      { slug: 'service-city',
        label: 'Service city',                    requirement: 'required' },
    ],
    supportedCategories: [
      'moving-labor','packing','vehicle-rental','university-relocation','corporate-relocation',
    ],
  },
];

export type OnboardingCountryCode = CountryOnboardingRules['country'];

export function findOnboardingRules(country: OnboardingCountryCode): CountryOnboardingRules | undefined {
  return ONBOARDING_RULES.find(r => r.country === country);
}

/**
 * Merge the universal field set with a country's country-specific
 * fields, returning the full ordered list a registration form needs
 * to render. Country fields appear after the universal block so the
 * customer's first answers are familiar regardless of market.
 */
export function mergeWithUniversal(rules: CountryOnboardingRules): OnboardingField[] {
  return [...UNIVERSAL_FIELDS, ...rules.countryFields];
}

/**
 * Filter a merged field list by the customer's earlier answers.
 * Conditional fields show only when their condition predicate
 * resolves true.
 */
export interface OnboardingState {
  vehicleOperation:    boolean;
  interstateOnly?:     boolean;
  heavyTransportOnly?: boolean;
}

export function applyConditions(
  fields:  OnboardingField[],
  state:   OnboardingState,
): OnboardingField[] {
  return fields.filter(f => {
    if (f.requirement !== 'conditional') return true;
    switch (f.conditionOn) {
      case 'vehicle-operation':    return state.vehicleOperation;
      case 'interstate-only':      return Boolean(state.interstateOnly);
      case 'heavy-transport-only': return Boolean(state.heavyTransportOnly);
      default:                     return true;
    }
  });
}
