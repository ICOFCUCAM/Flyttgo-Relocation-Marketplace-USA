import { supabase } from './supabase';

/* ─────────────────────────────────────────────────────────────────
 * Financial Operations & Audit Console store
 *
 * Typed wrappers around the docs/install-finops-console.sql RPCs.
 *
 * Roles (mirrored on the React side via fetchFinopsAccount):
 *   super_admin  — full read + write + role management
 *   accountant   — read everything + post adjustments + export
 *   auditor      — read-only across the whole console
 *
 * The role gate is enforced server-side by every RPC via
 * is_finops() / is_finops_writer() — the React dashboard only
 * controls UI affordances, never trust.
 * ───────────────────────────────────────────────────────────────── */

export type FinopsRole = 'super_admin' | 'accountant' | 'auditor';

export interface FinopsAccountRow {
  user_id:        string;
  role:           FinopsRole;
  country_scope:  string | null;
  display_name:   string | null;
  locale:         string;
  base_currency:  string;
  created_at:     string;
  updated_at:     string;
}

export type LedgerKind =
  | 'customer_payment' | 'provider_payout' | 'escrow_hold' | 'escrow_release'
  | 'refund' | 'subscription_payment' | 'commission' | 'enterprise_invoice';

export interface LedgerRow {
  kind:              LedgerKind;
  reference_id:      string;
  booking_id:        string | null;
  provider_user_id:  string | null;
  customer_user_id:  string | null;
  country_code:      string;
  currency:          string;
  amount_original:   number;
  amount_usd:        number;
  fx_rate_to_usd:    number;
  status:            string;
  occurred_at:       string;
}

export interface FinopsOverview {
  window_from:                 string;
  window_to:                   string;
  gross_revenue_usd:           number;
  gross_payouts_usd:           number;
  gross_subscriptions_usd:     number;
  gross_refunds_usd:           number;
  escrow_held_usd:             number;
  escrow_released_usd:         number;
  platform_commissions_usd:    number;
  enterprise_invoices_usd:     number;
  transaction_count:           number;
  currencies_seen:             string[];
  generated_at:                string;
}

export interface SubscriptionRevenueRow {
  tier_slug:      string;
  display_name:   string;
  active_count:   number;
  monthly_usd:    number;
}

export interface CurrencyBreakdownRow {
  currency:           string;
  transaction_count:  number;
  gross_original:     number;
  gross_usd:          number;
}

export interface TaxModeRow {
  country_code:  string;
  tax_mode:      string;
  default_rate:  number | null;
  display_label: string | null;
  notes:         string | null;
  updated_at:    string;
}

export interface FxRateRow {
  id:           number;
  currency:     string;
  rate_to_usd:  number;
  starts_at:    string;
  ends_at:      string | null;
  source:       string | null;
  created_at:   string;
}

export interface AuditLogRow {
  id:           number;
  table_name:   string;
  record_id:    string;
  op:           'INSERT' | 'UPDATE' | 'DELETE';
  before_value: Record<string, unknown> | null;
  after_value:  Record<string, unknown> | null;
  actor_id:     string | null;
  actor_role:   string | null;
  created_at:   string;
}

/* ── Role lookups ───────────────────────────────────────────── */

/** Resolve the calling user's FinOps account row, or null if they
 *  don't have one. is_admin() does NOT auto-promote — admins
 *  without an explicit finops_accounts row see no console. */
export async function fetchMyFinopsAccount(): Promise<FinopsAccountRow | null> {
  const { data, error } = await supabase
    .from('finops_accounts')
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`fetchMyFinopsAccount failed: ${error.message}`);
  return (data ?? null) as FinopsAccountRow | null;
}

/* ── Overview / KPIs ────────────────────────────────────────── */

export async function loadFinopsOverview(fromIso: string, toIso: string): Promise<FinopsOverview> {
  const { data, error } = await supabase.rpc('finops_overview', { p_from: fromIso, p_to: toIso });
  if (error) throw new Error(`loadFinopsOverview failed: ${error.message}`);
  return data as FinopsOverview;
}

/* ── Ledger ─────────────────────────────────────────────────── */

export interface LedgerFilter {
  fromIso?:   string;
  toIso?:     string;
  kind?:      LedgerKind;
  currency?:  string;
  country?:   string;
  limit?:     number;
  offset?:    number;
}

export async function loadFinopsLedger(filter: LedgerFilter = {}): Promise<LedgerRow[]> {
  const { data, error } = await supabase.rpc('finops_ledger', {
    p_from:     filter.fromIso  ?? new Date(Date.now() - 30 * 86_400_000).toISOString(),
    p_to:       filter.toIso    ?? new Date().toISOString(),
    p_kind:     filter.kind     ?? null,
    p_currency: filter.currency ?? null,
    p_country:  filter.country  ?? null,
    p_limit:    filter.limit    ?? 100,
    p_offset:   filter.offset   ?? 0,
  });
  if (error) throw new Error(`loadFinopsLedger failed: ${error.message}`);
  return (data ?? []) as LedgerRow[];
}

/* ── Subscription / Currency / Tax / FX ─────────────────────── */

export async function loadSubscriptionRevenue(): Promise<SubscriptionRevenueRow[]> {
  const { data, error } = await supabase.rpc('finops_subscription_revenue');
  if (error) throw new Error(`loadSubscriptionRevenue failed: ${error.message}`);
  return (data ?? []) as SubscriptionRevenueRow[];
}

export async function loadCurrencyBreakdown(fromIso: string, toIso: string): Promise<CurrencyBreakdownRow[]> {
  const { data, error } = await supabase.rpc('finops_currency_breakdown', { p_from: fromIso, p_to: toIso });
  if (error) throw new Error(`loadCurrencyBreakdown failed: ${error.message}`);
  return (data ?? []) as CurrencyBreakdownRow[];
}

export async function listTaxModes(): Promise<TaxModeRow[]> {
  const { data, error } = await supabase
    .from('tax_mode_by_country')
    .select('*')
    .order('country_code');
  if (error) throw new Error(`listTaxModes failed: ${error.message}`);
  return (data ?? []) as TaxModeRow[];
}

export async function listFxRates(): Promise<FxRateRow[]> {
  const { data, error } = await supabase
    .from('fx_rates')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`listFxRates failed: ${error.message}`);
  return (data ?? []) as FxRateRow[];
}

/* ── Audit log ──────────────────────────────────────────────── */

export interface AuditFilter {
  table?:   string;
  record?:  string;
  limit?:   number;
  offset?:  number;
}

export async function loadAuditLog(filter: AuditFilter = {}): Promise<AuditLogRow[]> {
  const { data, error } = await supabase.rpc('finops_audit_log', {
    p_table:  filter.table  ?? null,
    p_record: filter.record ?? null,
    p_limit:  filter.limit  ?? 200,
    p_offset: filter.offset ?? 0,
  });
  if (error) throw new Error(`loadAuditLog failed: ${error.message}`);
  return (data ?? []) as AuditLogRow[];
}
