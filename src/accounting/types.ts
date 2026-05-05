/* Domain types shared across the accounting subsystem. */

export type Jurisdiction      = 'NO' | 'GB' | 'US' | 'IFRS' | 'PLATFORM';
export type AccountType       = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type JournalStatus     = 'draft' | 'posted' | 'reversed' | 'adjusted';
export type FinanceRole       = 'super_admin' | 'admin' | 'accountant' | 'auditor' | 'finance_viewer';
export type AnnotationSeverity = 'info' | 'warning' | 'question' | 'finding';

export interface AccountRow {
  id:           string;
  jurisdiction: Jurisdiction;
  code:         string;
  display_name: string;
  account_type: AccountType;
  parent_code:  string | null;
  is_statutory: boolean;
  is_archived:  boolean;
  description:  string | null;
  created_at:   string;
  updated_at:   string;
}

export type JournalSourceType =
  | 'manual'
  | 'booking_escrow_held'
  | 'booking_escrow_released'
  | 'booking_refund'
  | 'subscription_payment'
  | 'adjustment';

export interface JournalEntryRow {
  id:             string;
  jurisdiction:   Jurisdiction;
  entry_number:   string;
  entry_date:     string;
  description:    string;
  reference:      string | null;
  status:         JournalStatus;
  fiscal_year:    number;
  fiscal_period:  number;
  created_by:     string | null;
  posted_by:      string | null;
  posted_at:      string | null;
  reversed_by_id: string | null;
  source_type:    JournalSourceType | null;
  source_id:      string | null;
  created_at:     string;
  updated_at:     string;
}

export interface CashFlowRow {
  jurisdiction:     Jurisdiction;
  fiscal_year:      number;
  fiscal_period:    number;
  entry_date:       string;
  entry_id:         string;
  description:      string;
  source_type:      JournalSourceType | null;
  cash_delta:       number;
  activity_section: 'operating' | 'investing' | 'financing';
}

export interface ProviderPayoutRow {
  driver_id:      string;
  driver_name:    string | null;
  driver_country: string | null;
  month:          string;
  payout_count:   number;
  gross_paid:     number;
  credits_issued: number;
  total_movement: number;
}

export interface ReconciliationRow {
  booking_id:         string;
  booking_created_at: string;
  payment_status:     string;
  booking_amount:     number;
  entry_id:           string | null;
  posted_at:          string | null;
  source_type:        JournalSourceType | null;
  ledger_debit:       number;
  ledger_credit:      number;
  has_mismatch:       boolean;
}

export interface JournalLineRow {
  id:                   string;
  entry_id:             string;
  line_number:          number;
  account_id:           string;
  side:                 'debit' | 'credit';
  amount:               number;
  currency:             string;
  exchange_rate:        number;
  base_currency:        string;
  amount_base_currency: number;
  tax_code_id:          string | null;
  description:          string | null;
  created_at:           string;
}

export interface TaxCodeRow {
  id:           string;
  jurisdiction: string;
  code:         string;
  display_name: string;
  category:     'vat' | 'sales_tax' | 'withholding' | 'exempt' | 'reverse_charge' | 'zero_rated';
}

export interface VatRateRow {
  id:             string;
  tax_code_id:    string;
  rate_percent:   number;
  effective_from: string;
  effective_to:   string | null;
}

export interface ExchangeRateRow {
  id:             string;
  from_currency:  string;
  to_currency:    string;
  rate:           number;
  effective_date: string;
  source:         string;
}

export interface AccountingSettingsRow {
  id:                       1;
  default_jurisdiction:     Jurisdiction;
  base_currency:            string;
  fiscal_year_start_month:  number;
  vat_reporting_period:     'monthly' | 'bimonthly' | 'quarterly' | 'annual';
  updated_at:               string;
  updated_by:               string | null;
}

export interface UsersRoleRow {
  user_id:      string;
  role:         FinanceRole;
  jurisdiction: string;
  granted_by:   string | null;
  granted_at:   string;
}

export interface AuditAnnotationRow {
  id:         string;
  entry_id:   string;
  auditor_id: string;
  comment:    string;
  severity:   AnnotationSeverity;
  resolved:   boolean;
  created_at: string;
}

export interface IncomeStatementRow {
  jurisdiction:  Jurisdiction;
  fiscal_year:   number;
  account_type:  'income' | 'expense';
  account_code:  string;
  account_name:  string;
  base_currency: string;
  credit_total:  number;
  debit_total:   number;
  period_total:  number;
}

export interface BalanceSheetRow {
  jurisdiction:  Jurisdiction;
  account_type:  'asset' | 'liability' | 'equity';
  account_code:  string;
  account_name:  string;
  base_currency: string;
  debit_total:   number;
  credit_total:  number;
  balance_total: number;
}

export interface TrialBalanceRow {
  jurisdiction:   Jurisdiction;
  account_code:   string;
  display_name:   string;
  account_type:   AccountType;
  total_debit:    number;
  total_credit:   number;
  net_balance:    number;
  base_currency:  string;
}

export interface GeneralLedgerRow {
  entry_id:             string;
  jurisdiction:         Jurisdiction;
  entry_number:         string;
  entry_date:           string;
  entry_description:    string;
  status:               JournalStatus;
  line_number:          number;
  account_code:         string;
  account_name:         string;
  account_type:         AccountType;
  side:                 'debit' | 'credit';
  amount:               number;
  currency:             string;
  exchange_rate:        number;
  base_currency:        string;
  amount_base_currency: number;
  /** SQL view aliases l.description as line_description so the
   *  general ledger row has both the entry-level description
   *  (entry_description) and the line-level memo (line_description). */
  line_description:     string | null;
}

/** Payload accepted by the post_journal_entry RPC. */
export interface PostJournalLineInput {
  account_id:    string;
  side:          'debit' | 'credit';
  amount:        number;
  currency:      string;
  exchange_rate: number;
  base_currency: string;
  tax_code_id?:  string | null;
  description?:  string | null;
}

export interface PostJournalEntryInput {
  jurisdiction:  Jurisdiction;
  entry_number:  string;
  entry_date:    string;
  description:   string;
  reference?:    string | null;
  lines:         PostJournalLineInput[];
}
