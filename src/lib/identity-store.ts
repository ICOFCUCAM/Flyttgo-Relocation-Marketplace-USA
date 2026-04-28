import { supabase } from './supabase';

/* ─────────────────────────────────────────────────────────────────
 * Identity & Trust Layer store
 *
 * Typed wrappers around docs/install-identity-trust-layer.sql:
 *
 *   identity_verifications        — per-user × per-kind ledger
 *   identity_federation_providers — eIDAS / BankID / SSO / SAML
 *                                    scaffolding
 *   country_identity_requirements — alias view onto
 *                                    onboarding_country_fields
 *   platform_roles                — RBAC reference catalogue
 *   compute_trust_level / meets_trust_level
 *                                  — single source of truth for
 *                                    routing + RLS gating
 *
 * Trust levels (1–7):
 *   1 Registered User
 *   2 Verified User                — email or phone confirmed
 *   3 Verified Business            — business registration
 *   4 Verified Carrier             — vehicle + insurance
 *   5 Certified Infrastructure Partner (CIP) — paid tier
 *   6 Institutional Account        — university / enterprise org
 *   7 Government Account           — .gov SSO or admin-flagged tier
 * ───────────────────────────────────────────────────────────────── */

export type VerificationKind =
  | 'email' | 'phone' | 'id_document' | 'business_registration'
  | 'vehicle' | 'insurance' | 'tax_status' | 'address_proof'
  | 'sso_federation';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface IdentityVerificationRow {
  id:             string;
  user_id:        string;
  kind:           VerificationKind;
  status:         VerificationStatus;
  reference:      string | null;
  evidence_url:   string | null;
  country_code:   string | null;
  federated_via:  string | null;
  expires_at:     string | null;
  rejection_note: string | null;
  reviewed_by:    string | null;
  reviewed_at:    string | null;
  created_at:     string;
  updated_at:     string;
}

export type FederationScope =
  | 'individual' | 'business' | 'university' | 'government' | 'enterprise_saml';

export interface FederationProviderRow {
  id:            string;
  slug:          string;
  display_name:  string;
  scope:         FederationScope;
  auth_protocol: 'oidc' | 'saml' | 'oauth2' | 'custom';
  issuer_url:    string | null;
  jwks_url:      string | null;
  country_code:  string | null;
  is_active:     boolean;
  mints_level:   number;
  notes:         string | null;
}

export interface CountryRequirementRow {
  country_code:     string;
  requirement_slug: string;
  label:            string;
  help_text:        string | null;
  requirement:      'required' | 'conditional' | 'optional';
  condition_on:     string | null;
  position:         number;
}

export type RoleGroup = 'platform' | 'provider' | 'organization' | 'support';

export interface PlatformRoleRow {
  slug:            string;
  group_label:     RoleGroup;
  display_name:    string;
  description:     string | null;
  min_trust_level: number;
  position:        number;
}

/* ── Verification CRUD ─────────────────────────────────────── */

/** List the signed-in user's own verification rows. RLS filters
 *  for them automatically. */
export async function listMyVerifications(userId: string): Promise<IdentityVerificationRow[]> {
  const { data, error } = await supabase
    .from('identity_verifications')
    .select('*')
    .eq('user_id', userId)
    .order('kind');
  if (error) throw new Error(`listMyVerifications failed: ${error.message}`);
  return (data ?? []) as IdentityVerificationRow[];
}

/** Admin-side: list every verification matching a status filter
 *  for the review queue. */
export async function listVerificationQueue(
  status: VerificationStatus | 'all' = 'pending',
  limit = 50,
): Promise<IdentityVerificationRow[]> {
  let q = supabase
    .from('identity_verifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(`listVerificationQueue failed: ${error.message}`);
  return (data ?? []) as IdentityVerificationRow[];
}

export interface SubmitVerificationInput {
  userId:       string;
  kind:         VerificationKind;
  reference?:   string;
  evidenceUrl?: string;
  countryCode?: string;
  expiresAt?:   string;
}

/** Provider-side submission. Status always lands as 'pending'; only
 *  admin can flip to 'approved'. Server-side RLS enforces this. */
export async function submitVerification(input: SubmitVerificationInput): Promise<IdentityVerificationRow> {
  const { data, error } = await supabase
    .from('identity_verifications')
    .upsert({
      user_id:       input.userId,
      kind:          input.kind,
      status:        'pending',
      reference:     input.reference     ?? null,
      evidence_url:  input.evidenceUrl   ?? null,
      country_code:  input.countryCode   ?? null,
      expires_at:    input.expiresAt     ?? null,
      rejection_note: null,
    }, { onConflict: 'user_id,kind,country_code' })
    .select()
    .single();
  if (error) throw new Error(`submitVerification failed: ${error.message}`);
  return data as IdentityVerificationRow;
}

/** Admin-only: approve / reject. RLS rejects non-admin writers. */
export async function reviewVerification(
  id: string,
  action: 'approve' | 'reject',
  rejectionNote?: string,
): Promise<void> {
  const patch = action === 'approve'
    ? { status: 'approved' as VerificationStatus, rejection_note: null,
        reviewed_at: new Date().toISOString() }
    : { status: 'rejected' as VerificationStatus, rejection_note: rejectionNote ?? null,
        reviewed_at: new Date().toISOString() };
  const { error } = await supabase
    .from('identity_verifications')
    .update(patch)
    .eq('id', id);
  if (error) throw new Error(`reviewVerification failed: ${error.message}`);
}

/** Compute the user's effective trust level (1–7). Reads the
 *  single-source-of-truth RPC so the value matches what the
 *  matcher uses for routing. */
export async function fetchTrustLevel(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('compute_trust_level', { p_user_id: userId });
  if (error) throw new Error(`fetchTrustLevel failed: ${error.message}`);
  return Number(data) || 1;
}

export async function listFederationProviders(): Promise<FederationProviderRow[]> {
  const { data, error } = await supabase
    .from('identity_federation_providers')
    .select('*')
    .order('display_name');
  if (error) throw new Error(`listFederationProviders failed: ${error.message}`);
  return (data ?? []) as FederationProviderRow[];
}

export async function listCountryRequirements(country?: string): Promise<CountryRequirementRow[]> {
  let q = supabase.from('country_identity_requirements').select('*').order('position');
  if (country) q = q.eq('country_code', country);
  const { data, error } = await q;
  if (error) throw new Error(`listCountryRequirements failed: ${error.message}`);
  return (data ?? []) as CountryRequirementRow[];
}

export async function listPlatformRoles(): Promise<PlatformRoleRow[]> {
  const { data, error } = await supabase
    .from('platform_roles')
    .select('*')
    .order('position');
  if (error) throw new Error(`listPlatformRoles failed: ${error.message}`);
  return (data ?? []) as PlatformRoleRow[];
}

/* ── Trust level metadata (client-side display) ────────────── */

export const TRUST_LEVEL_LABEL: Record<number, string> = {
  1: 'Registered User',
  2: 'Verified User',
  3: 'Verified Business',
  4: 'Verified Carrier',
  5: 'Certified Infrastructure Partner',
  6: 'Institutional Account',
  7: 'Government Account',
};

export const TRUST_LEVEL_TONE: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-slate-100',   text: 'text-slate-700' },
  2: { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  3: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  4: { bg: 'bg-blue-100',    text: 'text-blue-800' },
  5: { bg: 'bg-amber-100',   text: 'text-amber-800' },
  6: { bg: 'bg-violet-100',  text: 'text-violet-800' },
  7: { bg: 'bg-red-100',     text: 'text-red-800' },
};

export const VERIFICATION_KIND_LABEL: Record<VerificationKind, string> = {
  email:                 'Email',
  phone:                 'Phone',
  id_document:           'ID document',
  business_registration: 'Business registration',
  vehicle:               'Vehicle',
  insurance:             'Insurance',
  tax_status:            'Tax status',
  address_proof:         'Address proof',
  sso_federation:        'SSO federation',
};
