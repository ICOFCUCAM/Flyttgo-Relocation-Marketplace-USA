import { supabase } from './supabase';
import type { PricingCountry } from './pricing-engine';

/* ─────────────────────────────────────────────────────────────────
 * Typed wrapper for the Smart Matching Engine RPC. See
 * docs/install-matching-engine.sql for the formula + filters.
 *
 * Three modes per the spec:
 *
 *   instant      — auto-assign (top 1)
 *   multi_quote  — 3 providers receive request; customer picks
 *   enterprise   — CIP first / Gold Pro / Gold; no Silver tiers
 *
 * Pure read RPC — safe to call on every keystroke for live preview
 * UIs (e.g. an admin dispatch console).
 * ───────────────────────────────────────────────────────────────── */

export type MatchingMode = 'instant' | 'multi_quote' | 'enterprise';

export type SpecializationTag =
  | 'apartment-relocation'
  | 'office-relocation'
  | 'corporate-relocation'
  | 'international-relocation'
  | 'student-relocation'
  | 'equipment-relocation'
  | 'long-distance'
  | 'local-moves'
  | 'packing-only'
  | 'labor-only'
  | 'storage-staging'
  | 'last-mile-freight'
  | 'climate-controlled'
  | 'fragile-handling'
  | 'piano-or-art'
  | 'corporate-it-decommission';

export interface MatchingInput {
  country:             PricingCountry;
  pickupLat?:          number;
  pickupLng?:          number;
  /** ISO date string. When set, providers with an active blackout
   *  covering this date are excluded. */
  moveDate?:           string;
  crewSize?:           2 | 3 | 4 | 5;
  needsTruck?:         boolean;
  needsPacking?:       boolean;
  needsStorage?:       boolean;
  specializationTags?: SpecializationTag[];
  /** Force-exclude Silver / Silver+ even outside enterprise mode. */
  excludeSilver?:      boolean;
  /** Skip the country compliance gate. Defaults to false (gate
   *  enforced). Used by admin diagnostic / seeding flows that need
   *  to inspect the candidate pool before approvals land. */
  skipCompliance?:     boolean;
}

export interface MatchedProviderRow {
  user_id:              string;
  match_score:          number;        // 0–100
  /** Canonical alias for match_score — used in dispatch logs. */
  provider_match_rank:  number;
  distance_km:          number;
  tier_slug:            string | null;
  tier_position:        number;
  rank_score:           number | null;
  is_cip:               boolean;
  is_top_rated:         boolean;
  /** True when the provider has every non-conditional required
   *  document approved + non-expired for this booking's country. */
  is_compliant:         boolean;
  reasons:              string[];
}

/**
 * Run the matcher. Returns the ranked candidate list — single row
 * for `instant` mode, up to 3 for `multi_quote`, up to 5 for
 * `enterprise`.
 */
export async function matchProviders(
  input: MatchingInput,
  mode:  MatchingMode = 'instant',
): Promise<MatchedProviderRow[]> {
  const payload: Record<string, unknown> = {
    country: input.country,
  };
  if (input.pickupLat != null)         payload.pickup_lat = input.pickupLat;
  if (input.pickupLng != null)         payload.pickup_lng = input.pickupLng;
  if (input.moveDate)                  payload.move_date  = input.moveDate;
  if (input.crewSize != null)          payload.crew_size = input.crewSize;
  if (input.needsTruck   != null)      payload.needs_truck   = input.needsTruck;
  if (input.needsPacking != null)      payload.needs_packing = input.needsPacking;
  if (input.needsStorage != null)      payload.needs_storage = input.needsStorage;
  if (input.specializationTags?.length) payload.specialization_tags = input.specializationTags;
  if (input.excludeSilver != null)     payload.exclude_silver  = input.excludeSilver;
  if (input.skipCompliance != null)    payload.skip_compliance = input.skipCompliance;

  const { data, error } = await supabase.rpc('match_providers_for_booking', {
    p_input: payload,
    p_mode:  mode,
  });
  if (error) throw new Error(`matchProviders failed: ${error.message}`);
  return (data ?? []) as MatchedProviderRow[];
}

/* ── Specializations CRUD (provider self-management) ───────────── */

export interface ProviderSpecializationRow {
  id:           string;
  user_id:      string;
  tag:          SpecializationTag;
  proficiency:  number;
  created_at:   string;
}

export async function listProviderSpecializations(userId: string): Promise<ProviderSpecializationRow[]> {
  const { data, error } = await supabase
    .from('provider_specializations')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(`listProviderSpecializations failed: ${error.message}`);
  return (data ?? []) as ProviderSpecializationRow[];
}

export async function setProviderSpecialization(
  userId: string, tag: SpecializationTag, proficiency: number = 3,
): Promise<void> {
  const { error } = await supabase
    .from('provider_specializations')
    .upsert(
      { user_id: userId, tag, proficiency },
      { onConflict: 'user_id,tag' },
    );
  if (error) throw new Error(`setProviderSpecialization failed: ${error.message}`);
}

export async function removeProviderSpecialization(
  userId: string, tag: SpecializationTag,
): Promise<void> {
  const { error } = await supabase
    .from('provider_specializations')
    .delete()
    .eq('user_id', userId).eq('tag', tag);
  if (error) throw new Error(`removeProviderSpecialization failed: ${error.message}`);
}

/* ── Compliance documents (per-country) ───────────────────────────
 *
 * Backs the matcher's country-compliance gate. One row per
 * (provider, country, document slug). Slug references the
 * onboarding_country_fields table — see install-onboarding-rules.sql
 * for the canonical list of required docs per country.
 *
 * Status lifecycle:
 *   pending  → admin reviews
 *   approved → counts toward the compliance gate (until expires_at)
 *   rejected → provider must resubmit; doesn't satisfy the gate
 *   expired  → cron-flipped once expires_at lapses
 * ──────────────────────────────────────────────────────────────── */

export type ComplianceDocStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ComplianceDocRow {
  id:              string;
  user_id:         string;
  country_code:    string;
  document_slug:   string;
  status:          ComplianceDocStatus;
  file_url:        string | null;
  reference:       string | null;
  expires_at:      string | null;
  rejection_note:  string | null;
  created_at:      string;
  updated_at:      string;
}

export interface ComplianceStatus {
  is_compliant:       boolean;
  missing_required:   string[];
  expired_required:   string[];
  rejected_required:  string[];
}

export async function listComplianceDocuments(
  userId: string, country?: PricingCountry,
): Promise<ComplianceDocRow[]> {
  let q = supabase.from('provider_compliance_documents').select('*').eq('user_id', userId);
  if (country) q = q.eq('country_code', country);
  const { data, error } = await q.order('document_slug', { ascending: true });
  if (error) throw new Error(`listComplianceDocuments failed: ${error.message}`);
  return (data ?? []) as ComplianceDocRow[];
}

export interface SubmitComplianceDocInput {
  userId:        string;
  country:       PricingCountry;
  documentSlug:  string;
  fileUrl?:      string;
  reference?:    string;
  expiresAt?:    string;     // ISO date
}

/** Provider-side submission. Status always lands as 'pending' — only
 *  admin can flip to 'approved'. */
export async function submitComplianceDocument(
  input: SubmitComplianceDocInput,
): Promise<ComplianceDocRow> {
  const { data, error } = await supabase
    .from('provider_compliance_documents')
    .upsert({
      user_id:        input.userId,
      country_code:   input.country,
      document_slug:  input.documentSlug,
      status:         'pending',
      file_url:       input.fileUrl ?? null,
      reference:      input.reference ?? null,
      expires_at:     input.expiresAt ?? null,
      rejection_note: null,
    }, { onConflict: 'user_id,country_code,document_slug' })
    .select()
    .single();
  if (error) throw new Error(`submitComplianceDocument failed: ${error.message}`);
  return data as ComplianceDocRow;
}

/** Admin-only — flips a submission to approved / rejected. RLS
 *  enforces is_admin() on the underlying table. */
export async function reviewComplianceDocument(
  docId: string,
  action: 'approve' | 'reject',
  rejectionNote?: string,
): Promise<void> {
  const patch = action === 'approve'
    ? { status: 'approved' as ComplianceDocStatus, rejection_note: null }
    : { status: 'rejected' as ComplianceDocStatus, rejection_note: rejectionNote ?? null };
  const { error } = await supabase
    .from('provider_compliance_documents')
    .update(patch)
    .eq('id', docId);
  if (error) throw new Error(`reviewComplianceDocument failed: ${error.message}`);
}

/** Resolve compliance state for a single (provider, country) pair.
 *  Same source of truth the matcher uses for its hard gate. */
export async function fetchComplianceStatus(
  userId: string, country: PricingCountry,
): Promise<ComplianceStatus> {
  const { data, error } = await supabase.rpc('provider_compliance_status', {
    p_user_id: userId,
    p_country: country,
  });
  if (error) throw new Error(`fetchComplianceStatus failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    is_compliant:      Boolean(row?.is_compliant),
    missing_required:  (row?.missing_required  ?? []) as string[],
    expired_required:  (row?.expired_required  ?? []) as string[],
    rejected_required: (row?.rejected_required ?? []) as string[],
  };
}
