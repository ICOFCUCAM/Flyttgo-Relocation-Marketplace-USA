import { supabase } from './supabase';

/* ─────────────────────────────────────────────────────────────────
 * Typed wrapper around the corporate / government portal tables
 * (see docs/install-organizations.sql).
 *
 * Reads:
 *   - listMyOrganizations()         — orgs the signed-in user is a member of
 *   - listMyRelocationRequests(orgId)
 *   - listOrgInvoices(orgId)
 *
 * Writes:
 *   - createRelocationRequest(input) — requester-side
 *   - approveRelocationRequest(id, comment)
 *   - rejectRelocationRequest(id, comment)
 *
 * RLS does the gating; the client just calls the helpers.
 * ───────────────────────────────────────────────────────────────── */

export type OrganizationSector =
  | 'corporate' | 'enterprise' | 'university' | 'municipal'
  | 'government' | 'embassy' | 'ngo' | 'transit-authority';

export type OrganizationRole = 'owner' | 'approver' | 'requester' | 'viewer';

export type RelocationRequestStatus =
  | 'draft' | 'submitted' | 'approved' | 'rejected'
  | 'dispatched' | 'completed' | 'cancelled';

export type RelocationSegment =
  'corporate' | 'enterprise' | 'university' | 'municipal' | 'government';

export interface OrganizationRow {
  id:                   string;
  name:                 string;
  legal_name?:          string | null;
  sector:               OrganizationSector;
  country_code:         string;
  tax_registration?:    string | null;
  procurement_verified: boolean;
  billing_model:        'card' | 'invoice';
  primary_contact?:     string | null;
  primary_email?:       string | null;
  primary_phone?:       string | null;
  address?:             string | null;
  created_at:           string;
  updated_at:           string;
}

export interface OrganizationMemberRow {
  id:               string;
  organization_id:  string;
  user_id:          string;
  role:             OrganizationRole;
  department_id?:   string | null;
  invited_at:       string;
  joined_at?:       string | null;
  revoked_at?:      string | null;
}

export interface DepartmentRow {
  id:               string;
  organization_id:  string;
  name:             string;
  cost_center?:     string | null;
  monthly_budget?:  number | null;
  created_at:       string;
}

export interface OrganizationContractRow {
  id:                  string;
  organization_id:     string;
  name:                string;
  discount_pct?:       number | null;
  hourly_cap_usd?:     number | null;
  min_provider_tier?:  string | null;
  starts_at?:          string | null;
  expires_at?:         string | null;
}

export interface RelocationRequestRow {
  id:                    string;
  organization_id:       string;
  department_id?:        string | null;
  contract_id?:          string | null;
  requested_by_user_id:  string;
  brief:                 Record<string, unknown>;
  segment:               RelocationSegment;
  country:               string;
  city?:                 string | null;
  status:                RelocationRequestStatus;
  estimated_total?:      number | null;
  approved_by_user_id?:  string | null;
  approved_at?:          string | null;
  dispatched_booking_id?: string | null;
  created_at:            string;
  updated_at:            string;
}

export interface OrganizationInvoiceRow {
  id:                    string;
  organization_id:       string;
  period_start:          string;
  period_end:            string;
  department_breakdown:  Record<string, number>;
  total_amount:          number;
  currency:              string;
  status:                'draft' | 'issued' | 'paid' | 'overdue' | 'disputed' | 'void';
  external_ref?:         string | null;
  due_at?:               string | null;
  paid_at?:              string | null;
  created_at:            string;
}

/* ── Reads ───────────────────────────────────────────────────────── */

export async function listMyOrganizations(userId: string): Promise<OrganizationRow[]> {
  /* organization_members RLS lets us SELECT every membership row;
   * we then fetch the orgs in one round-trip via .in(). */
  const { data: memberships, error: mErr } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .is('revoked_at', null);
  if (mErr) throw new Error(`listMyOrganizations members failed: ${mErr.message}`);
  const ids = (memberships ?? []).map(m => m.organization_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .in('id', ids)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw new Error(`listMyOrganizations failed: ${error.message}`);
  return (data ?? []) as OrganizationRow[];
}

export async function listMyOrgMemberships(userId: string): Promise<OrganizationMemberRow[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null);
  if (error) throw new Error(`listMyOrgMemberships failed: ${error.message}`);
  return (data ?? []) as OrganizationMemberRow[];
}

export async function listRelocationRequests(orgId: string): Promise<RelocationRequestRow[]> {
  const { data, error } = await supabase
    .from('relocation_requests')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listRelocationRequests failed: ${error.message}`);
  return (data ?? []) as RelocationRequestRow[];
}

export async function listOrgInvoices(orgId: string): Promise<OrganizationInvoiceRow[]> {
  const { data, error } = await supabase
    .from('organization_invoices')
    .select('*')
    .eq('organization_id', orgId)
    .order('period_start', { ascending: false });
  if (error) throw new Error(`listOrgInvoices failed: ${error.message}`);
  return (data ?? []) as OrganizationInvoiceRow[];
}

export async function listDepartments(orgId: string): Promise<DepartmentRow[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true });
  if (error) throw new Error(`listDepartments failed: ${error.message}`);
  return (data ?? []) as DepartmentRow[];
}

export async function listOrgContracts(orgId: string): Promise<OrganizationContractRow[]> {
  const { data, error } = await supabase
    .from('organization_contracts')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw new Error(`listOrgContracts failed: ${error.message}`);
  return (data ?? []) as OrganizationContractRow[];
}

/* ── Writes ──────────────────────────────────────────────────────── */

export interface CreateRelocationRequestInput {
  organizationId:     string;
  departmentId?:      string;
  contractId?:        string;
  requestedByUserId:  string;
  brief:              Record<string, unknown>;
  segment:            RelocationSegment;
  country:            string;
  city?:              string;
  estimatedTotal?:    number;
}

export async function createRelocationRequest(input: CreateRelocationRequestInput): Promise<RelocationRequestRow> {
  const { data, error } = await supabase
    .from('relocation_requests')
    .insert({
      organization_id:      input.organizationId,
      department_id:        input.departmentId ?? null,
      contract_id:          input.contractId ?? null,
      requested_by_user_id: input.requestedByUserId,
      brief:                input.brief,
      segment:              input.segment,
      country:              input.country,
      city:                 input.city ?? null,
      estimated_total:      input.estimatedTotal ?? null,
      status:               'submitted',
    })
    .select()
    .single();
  if (error) throw new Error(`createRelocationRequest failed: ${error.message}`);

  /* Audit row for the submission. */
  await supabase
    .from('relocation_request_approvals')
    .insert({
      request_id:    data.id,
      actor_user_id: input.requestedByUserId,
      action:        'submitted',
    });

  return data as RelocationRequestRow;
}

export async function approveRelocationRequest(
  requestId: string, actorUserId: string, comment?: string,
): Promise<void> {
  const { error: e1 } = await supabase
    .from('relocation_requests')
    .update({
      status:              'approved',
      approved_by_user_id: actorUserId,
      approved_at:         new Date().toISOString(),
    })
    .eq('id', requestId);
  if (e1) throw new Error(`approveRelocationRequest failed: ${e1.message}`);

  await supabase
    .from('relocation_request_approvals')
    .insert({
      request_id:    requestId,
      actor_user_id: actorUserId,
      action:        'approved',
      comment:       comment ?? null,
    });
}

export async function rejectRelocationRequest(
  requestId: string, actorUserId: string, comment: string,
): Promise<void> {
  const { error: e1 } = await supabase
    .from('relocation_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId);
  if (e1) throw new Error(`rejectRelocationRequest failed: ${e1.message}`);

  await supabase
    .from('relocation_request_approvals')
    .insert({
      request_id:    requestId,
      actor_user_id: actorUserId,
      action:        'rejected',
      comment,
    });
}
