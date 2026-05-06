/**
 * FlyttGo accounting service layer.
 *
 * Every call wraps a single Supabase query/RPC and returns typed
 * domain rows. RLS gates everything on the server (see
 * docs/install-accounting-subsystem.sql) so the client doesn't need
 * to re-check role membership before issuing a query.
 */

import { supabase } from '../lib/supabase';
import { TEMPLATES } from './templates';
import type {
  AccountRow, AccountingSettingsRow, AuditAnnotationRow,
  BalanceSheetRow, CashFlowRow, CorridorIntelligenceRow,
  EarningsDistributionRow, ExchangeRateRow, FinanceRole, FraudAlertRow,
  GeneralLedgerRow, IncomeStatementRow, InvoiceRow, Jurisdiction,
  JournalEntryRow, JournalLineRow, PostJournalEntryInput,
  ProviderPayoutRow, ProviderPayoutScheduleRow, ReconciliationRow,
  SubscriptionBillingRow, TaxCodeRow, TaxCollectedRow, TrialBalanceRow,
  TreasurySummaryRow, UsersRoleRow, VatRateRow, WalletBalanceRow,
} from './types';

/* ── Roles ───────────────────────────────────────────────────── */

export async function getMyFinanceRoles(userId: string): Promise<FinanceRole[]> {
  const { data, error } = await supabase
    .from('users_roles')
    .select('role')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map(r => r.role as FinanceRole);
}

/** Routes a user to the correct workspace based on their highest-
 *  privilege finance role. Used by /auth/callback (Phase 16). */
export function routeForFinanceRoles(roles: FinanceRole[]): 'admin' | 'accounting' | 'audit' | null {
  if (roles.includes('super_admin') || roles.includes('admin')) return 'admin';
  if (roles.includes('accountant'))                              return 'accounting';
  if (roles.includes('auditor') || roles.includes('finance_viewer')) return 'audit';
  return null;
}

export async function listUserRoles(): Promise<UsersRoleRow[]> {
  const { data, error } = await supabase.from('users_roles').select('*');
  if (error) throw error;
  return (data ?? []) as UsersRoleRow[];
}

export async function grantFinanceRole(
  userId: string, role: FinanceRole, jurisdiction = '',
): Promise<void> {
  const { error } = await supabase.from('users_roles').insert({
    user_id: userId, role, jurisdiction,
  });
  if (error) throw error;
}

export async function revokeFinanceRole(
  userId: string, role: FinanceRole, jurisdiction = '',
): Promise<void> {
  const { error } = await supabase
    .from('users_roles')
    .delete()
    .match({ user_id: userId, role, jurisdiction });
  if (error) throw error;
}

/* ── Email-based role administration ──────────────────────────
 *
 * Super-admin UI grants roles by email rather than by UUID. The
 * find_user_by_email RPC is SECURITY DEFINER + admin-gated server
 * side so non-admins can't enumerate the user table. */

export interface FinanceRoleAssignment {
  user_id:      string;
  role:         FinanceRole;
  jurisdiction: string;
  granted_at:   string;
  granted_by:   string | null;
  user_email:   string | null;
  first_name:   string | null;
  last_name:    string | null;
}

export async function findUserByEmail(email: string): Promise<{ user_id: string; email: string } | null> {
  const { data, error } = await supabase.rpc('find_user_by_email', { p_email: email.trim() });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { user_id: row.user_id as string, email: row.email as string } : null;
}

export async function listRoleAssignments(): Promise<FinanceRoleAssignment[]> {
  const { data, error } = await supabase
    .from('v_finance_role_assignments')
    .select('*')
    .order('granted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FinanceRoleAssignment[];
}

/** Grant a role by email — convenience wrapper around
 *  findUserByEmail + grantFinanceRole. Throws "User not found" if
 *  no auth.users row matches. */
export async function grantFinanceRoleByEmail(
  email: string, role: FinanceRole, jurisdiction = '',
): Promise<{ user_id: string; email: string }> {
  const found = await findUserByEmail(email);
  if (!found) throw new Error(`No user found for ${email}`);
  await grantFinanceRole(found.user_id, role, jurisdiction);
  return found;
}

/* ── Settings ────────────────────────────────────────────────── */

export async function getAccountingSettings(): Promise<AccountingSettingsRow | null> {
  const { data, error } = await supabase
    .from('accounting_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return (data as AccountingSettingsRow) ?? null;
}

export async function updateAccountingSettings(
  patch: Partial<Omit<AccountingSettingsRow, 'id' | 'updated_at'>>,
): Promise<void> {
  const { error } = await supabase
    .from('accounting_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
}

/* ── Chart of accounts ──────────────────────────────────────── */

export async function listAccounts(jurisdiction: Jurisdiction): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('jurisdiction', jurisdiction)
    .order('code');
  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

/**
 * Bulk-inserts the canned chart-of-accounts template for the chosen
 * jurisdiction. Skips codes that already exist (unique constraint
 * on (jurisdiction, code) prevents duplicates).
 */
export async function initializeChartOfAccounts(jurisdiction: Jurisdiction): Promise<number> {
  const template = TEMPLATES[jurisdiction] ?? [];
  if (template.length === 0) return 0;

  const rows = template.map(t => ({
    jurisdiction,
    code:         t.code,
    display_name: t.display_name,
    account_type: t.account_type,
    parent_code:  t.parent_code ?? null,
    is_statutory: t.is_statutory ?? false,
    description:  t.description ?? null,
  }));

  /* upsert on (jurisdiction, code) so re-running the action only
   * inserts the missing rows. */
  const { error, data } = await supabase
    .from('accounts')
    .upsert(rows, { onConflict: 'jurisdiction,code', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function archiveAccount(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('is_statutory', false);     // statutory accounts can't be archived (Phase 4 spec)
  if (error) throw error;
}

/* ── Journal entries ────────────────────────────────────────── */

export async function listJournalEntries(
  jurisdiction: Jurisdiction,
  opts: { limit?: number; status?: 'posted' | 'draft' } = {},
): Promise<JournalEntryRow[]> {
  let q = supabase
    .from('journal_entries')
    .select('*')
    .eq('jurisdiction', jurisdiction)
    .order('entry_date', { ascending: false })
    .order('entry_number', { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as JournalEntryRow[];
}

export async function getJournalEntryWithLines(entryId: string): Promise<{
  entry: JournalEntryRow;
  lines: JournalLineRow[];
}> {
  const [entryRes, linesRes] = await Promise.all([
    supabase.from('journal_entries').select('*').eq('id', entryId).single(),
    supabase.from('journal_lines').select('*').eq('entry_id', entryId).order('line_number'),
  ]);
  if (entryRes.error) throw entryRes.error;
  if (linesRes.error) throw linesRes.error;
  return {
    entry: entryRes.data as JournalEntryRow,
    lines: (linesRes.data ?? []) as JournalLineRow[],
  };
}

/** Atomic post — defers to the post_journal_entry RPC which
 *  enforces double-entry balance server-side. */
export async function postJournalEntry(input: PostJournalEntryInput): Promise<string> {
  const { data, error } = await supabase.rpc('post_journal_entry', {
    p_jurisdiction: input.jurisdiction,
    p_entry_number: input.entry_number,
    p_entry_date:   input.entry_date,
    p_description:  input.description,
    p_reference:    input.reference ?? null,
    p_lines:        input.lines as unknown as Record<string, unknown>[],
  });
  if (error) throw error;
  return data as string;
}

/* ── Tax codes / VAT / FX ──────────────────────────────────── */

export async function listTaxCodes(jurisdiction: string): Promise<TaxCodeRow[]> {
  const { data, error } = await supabase
    .from('tax_codes')
    .select('*')
    .eq('jurisdiction', jurisdiction)
    .order('code');
  if (error) throw error;
  return (data ?? []) as TaxCodeRow[];
}

export async function listVatRates(): Promise<VatRateRow[]> {
  const { data, error } = await supabase
    .from('vat_rates')
    .select('*')
    .order('effective_from', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VatRateRow[];
}

export async function listExchangeRates(): Promise<ExchangeRateRow[]> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('effective_date', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ExchangeRateRow[];
}

export async function recordExchangeRate(
  from_currency: string, to_currency: string, rate: number, effective_date: string,
): Promise<void> {
  const { error } = await supabase
    .from('exchange_rates')
    .upsert(
      { from_currency, to_currency, rate, effective_date, source: 'manual' },
      { onConflict: 'from_currency,to_currency,effective_date' },
    );
  if (error) throw error;
}

/* ── Reports ─────────────────────────────────────────────────── */

export async function fetchTrialBalance(jurisdiction: Jurisdiction): Promise<TrialBalanceRow[]> {
  const { data, error } = await supabase
    .from('v_trial_balance')
    .select('*')
    .eq('jurisdiction', jurisdiction);
  if (error) throw error;
  return (data ?? []) as TrialBalanceRow[];
}

export async function fetchIncomeStatement(
  jurisdiction: Jurisdiction, fiscalYear?: number,
): Promise<IncomeStatementRow[]> {
  let q = supabase.from('v_income_statement').select('*').eq('jurisdiction', jurisdiction);
  if (fiscalYear) q = q.eq('fiscal_year', fiscalYear);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as IncomeStatementRow[];
}

export async function fetchBalanceSheet(jurisdiction: Jurisdiction): Promise<BalanceSheetRow[]> {
  const { data, error } = await supabase
    .from('v_balance_sheet')
    .select('*')
    .eq('jurisdiction', jurisdiction);
  if (error) throw error;
  return (data ?? []) as BalanceSheetRow[];
}

/* ── Auto-posting reports (Phase: financial engine) ───────── */

export async function fetchCashFlow(jurisdiction: Jurisdiction = 'PLATFORM'): Promise<CashFlowRow[]> {
  const { data, error } = await supabase
    .from('v_cash_flow_statement')
    .select('*')
    .eq('jurisdiction', jurisdiction)
    .order('entry_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CashFlowRow[];
}

export async function fetchProviderPayouts(): Promise<ProviderPayoutRow[]> {
  const { data, error } = await supabase
    .from('v_provider_payouts')
    .select('*');
  if (error) throw error;
  return (data ?? []) as ProviderPayoutRow[];
}

export async function fetchReconciliation(): Promise<ReconciliationRow[]> {
  const { data, error } = await supabase
    .from('v_payment_reconciliation')
    .select('*')
    .limit(500);
  if (error) throw error;
  return (data ?? []) as ReconciliationRow[];
}

/* ── Financial-infrastructure (Phase 2) ─────────────────── */

export async function listFraudAlerts(
  status: FraudAlertRow['status'] | 'all' = 'open',
): Promise<FraudAlertRow[]> {
  let q = supabase.from('fraud_alerts').select('*').order('detected_at', { ascending: false }).limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as FraudAlertRow[];
}

export async function runFraudScan(): Promise<number> {
  const { data, error } = await supabase.rpc('fn_run_fraud_scan');
  if (error) throw error;
  return Number(data ?? 0);
}

export async function updateFraudAlertStatus(
  id: string, status: FraudAlertRow['status'],
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'dismissed' || status === 'confirmed_fraud') {
    patch.resolved_at = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) patch.resolved_by = user.id;
  }
  const { error } = await supabase.from('fraud_alerts').update(patch).eq('id', id);
  if (error) throw error;
}

export async function listProviderPayouts(
  status: ProviderPayoutScheduleRow['status'] | 'all' = 'all',
): Promise<ProviderPayoutScheduleRow[]> {
  let q = supabase.from('provider_payouts').select('*').order('scheduled_for', { ascending: false }).limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ProviderPayoutScheduleRow[];
}

export async function schedulePayout(input: {
  driverId:     string;
  amount:       number;
  currency?:    string;
  bookingId?:   string;
  scheduleKind?: ProviderPayoutScheduleRow['schedule_kind'];
  scheduledFor?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('provider_payouts')
    .insert({
      driver_id:     input.driverId,
      booking_id:    input.bookingId ?? null,
      amount:        input.amount,
      currency:      input.currency ?? 'USD',
      schedule_kind: input.scheduleKind ?? 'instant',
      scheduled_for: input.scheduledFor ?? new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function markPayoutStatus(
  payoutId: string, status: ProviderPayoutScheduleRow['status'], opts: { reason?: string; externalRef?: string } = {},
): Promise<void> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'paid' || status === 'failed') patch.processed_at = new Date().toISOString();
  if (opts.reason)      patch.failure_reason = opts.reason;
  if (opts.externalRef) patch.external_ref   = opts.externalRef;
  const { error } = await supabase.from('provider_payouts').update(patch).eq('id', payoutId);
  if (error) throw error;
}

export async function fetchTopCorridors(): Promise<CorridorIntelligenceRow[]> {
  const { data, error } = await supabase.from('v_top_corridors').select('*');
  if (error) throw error;
  return (data ?? []) as CorridorIntelligenceRow[];
}

export async function fetchEarningsDistribution(): Promise<EarningsDistributionRow[]> {
  const { data, error } = await supabase.from('v_provider_earnings_distribution').select('*');
  if (error) throw error;
  return (data ?? []) as EarningsDistributionRow[];
}

export async function fetchTaxCollected(jurisdiction: Jurisdiction): Promise<TaxCollectedRow[]> {
  const { data, error } = await supabase
    .from('v_tax_collected')
    .select('*')
    .eq('jurisdiction', jurisdiction);
  if (error) throw error;
  return (data ?? []) as TaxCollectedRow[];
}

export async function fetchSubscriptionBilling(): Promise<SubscriptionBillingRow[]> {
  const { data, error } = await supabase
    .from('v_subscription_billing_status')
    .select('*');
  if (error) throw error;
  return (data ?? []) as SubscriptionBillingRow[];
}

/* ── Treasury (Phase: wallets + balances + KYC) ──────────── */

export async function fetchWalletBalances(opts: {
  walletType?: WalletBalanceRow['wallet_type'];
  ownerId?:    string;
  limit?:      number;
} = {}): Promise<WalletBalanceRow[]> {
  let q = supabase.from('v_wallet_balances').select('*');
  if (opts.walletType) q = q.eq('wallet_type', opts.walletType);
  if (opts.ownerId)    q = q.eq('owner_user_id', opts.ownerId);
  q = q.order('wallet_balance', { ascending: false }).limit(opts.limit ?? 200);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WalletBalanceRow[];
}

export async function fetchTreasurySummary(): Promise<TreasurySummaryRow[]> {
  const { data, error } = await supabase.from('v_treasury_summary').select('*');
  if (error) throw error;
  return (data ?? []) as TreasurySummaryRow[];
}

export async function checkPayoutEligibility(driverId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('fn_check_payout_eligibility', { p_driver_id: driverId });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function fetchInvoiceForBooking(bookingId: string): Promise<InvoiceRow | null> {
  const { data, error } = await supabase
    .from('v_invoice_lines')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return (data as InvoiceRow) ?? null;
}

export async function fetchGeneralLedger(
  jurisdiction: Jurisdiction, opts: { from?: string; to?: string } = {},
): Promise<GeneralLedgerRow[]> {
  let q = supabase
    .from('v_general_ledger')
    .select('*')
    .eq('jurisdiction', jurisdiction);
  if (opts.from) q = q.gte('entry_date', opts.from);
  if (opts.to)   q = q.lte('entry_date', opts.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GeneralLedgerRow[];
}

/* ── Auditor annotations ────────────────────────────────────── */

export async function listAnnotations(entryId: string): Promise<AuditAnnotationRow[]> {
  const { data, error } = await supabase
    .from('audit_annotations')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AuditAnnotationRow[];
}

export async function addAnnotation(
  entryId: string, comment: string, severity: AuditAnnotationRow['severity'],
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');
  const { error } = await supabase
    .from('audit_annotations')
    .insert({ entry_id: entryId, auditor_id: user.id, comment, severity });
  if (error) throw error;
}

export async function resolveAnnotation(annotationId: string): Promise<void> {
  const { error } = await supabase
    .from('audit_annotations')
    .update({ resolved: true })
    .eq('id', annotationId);
  if (error) throw error;
}

/* ── Attachments ──────────────────────────────────────────── */

const BUCKET = 'accounting-attachments';

export async function uploadAttachment(
  entryId: string, file: File,
): Promise<{ id: string; path: string }> {
  const path = `${entryId}/${Date.now()}-${file.name}`;
  const upload = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (upload.error) throw upload.error;

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('accounting_attachments')
    .insert({
      entry_id:     entryId,
      storage_path: path,
      filename:     file.name,
      mime_type:    file.type || 'application/octet-stream',
      size_bytes:   file.size,
      uploaded_by:  user?.id ?? null,
    })
    .select('id, storage_path')
    .single();
  if (error) throw error;
  return { id: data.id as string, path: data.storage_path as string };
}

export async function getAttachmentSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 5);
  return data?.signedUrl ?? null;
}

export async function listAttachments(entryId: string): Promise<{
  id: string; filename: string; mime_type: string; size_bytes: number;
  storage_path: string; uploaded_at: string;
}[]> {
  const { data, error } = await supabase
    .from('accounting_attachments')
    .select('id, filename, mime_type, size_bytes, storage_path, uploaded_at')
    .eq('entry_id', entryId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string; filename: string; mime_type: string; size_bytes: number;
    storage_path: string; uploaded_at: string;
  }>;
}
