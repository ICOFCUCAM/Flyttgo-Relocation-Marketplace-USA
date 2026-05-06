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

export interface ProviderPayoutScheduleRow {
  id:             string;
  driver_id:      string;
  booking_id:     string | null;
  amount:         number;
  currency:       string;
  status:         'scheduled' | 'processing' | 'paid' | 'failed' | 'cancelled';
  schedule_kind:  'instant' | 'weekly' | 'monthly' | 'manual';
  scheduled_for:  string;
  processed_at:   string | null;
  failure_reason: string | null;
  external_ref:   string | null;
  created_at:     string;
}

export interface FraudAlertRow {
  id:           string;
  detected_at:  string;
  severity:     'low' | 'medium' | 'high' | 'critical';
  category:     string;
  subject_type: 'booking' | 'driver' | 'customer';
  subject_id:   string;
  amount:       number | null;
  metric_value: number | null;
  message:      string;
  status:       'open' | 'reviewing' | 'dismissed' | 'confirmed_fraud';
  resolved_by:  string | null;
  resolved_at:  string | null;
}

export interface CorridorIntelligenceRow {
  country:        string;
  corridor:       string;
  bookings_total: number;
  bookings_30d:   number;
  gmv_total:      number;
  gmv_30d:        number;
  avg_value:      number;
}

export interface EarningsDistributionRow {
  bucket:            string;
  drivers_in_bucket: number;
  bucket_total:      number;
  bucket_mean:       number;
}

export interface TaxCollectedRow {
  jurisdiction:    Jurisdiction;
  fiscal_year:     number;
  fiscal_period:   number;
  tax_code:        string;
  tax_name:        string;
  rate_percent:    number | null;
  taxable_credit:  number;
  taxable_debit:   number;
}

export interface SubscriptionBillingRow {
  driver_id:           string;
  plan:                string | null;
  subscription_status: string | null;
  start_date:          string | null;
  end_date:            string | null;
  health:              'healthy' | 'expiring_soon' | 'expired' | 'cancelled';
  payments_total:      number;
  last_payment_at:     string | null;
  payments_30d:        number;
}

export interface InvoiceRow {
  booking_id:        string;
  invoice_date:      string;
  customer_id:       string;
  customer_name:     string | null;
  customer_email:    string | null;
  customer_phone:    string | null;
  country:           string | null;
  pickup_address:    string | null;
  pickup_city:       string | null;
  pickup_postcode:   string | null;
  dropoff_address:   string | null;
  dropoff_city:      string | null;
  dropoff_postcode:  string | null;
  move_date:         string | null;
  move_type:         string | null;
  van_type:          string | null;
  helpers:           number | null;
  distance_km:       number | null;
  estimated_hours:   number | null;
  actual_hours:      number | null;
  subtotal:          number;
  original_subtotal: number | null;
  payment_status:    string | null;
  status:            string | null;
  tax_amount:        number;
  tax_code:          string;
  provider_name:     string | null;
  provider_country:  string | null;
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
