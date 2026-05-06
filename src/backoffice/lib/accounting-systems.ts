/* ─────────────────────────────────────────────────────────────────
 * Accounting system catalogue.
 *
 * The active accounting system is stored in `bos_accounting_config`
 * (single-row table, id = 1). Each system declares fiscal-year
 * convention, default tax rate, and the export schema accountants
 * expect when they pull the ledger.
 *
 * Adding a new system is a config change — point AccountingSwitch
 * at the new id and add an entry here. The schema check constraint
 * on bos_accounting_config.active_system enforces the id literal.
 * ───────────────────────────────────────────────────────────────── */

export type AccountingSystemId = 'us_gaap' | 'eu_vat' | 'custom';

export interface AccountingSystem {
  id:               AccountingSystemId;
  label:            string;
  description:      string;
  /** Default fiscal-year start, MM-DD. */
  fiscalYearStart:  string;
  /** Default tax rate (decimal — 0.0825 = 8.25%). */
  defaultTaxRate:   number;
  /** Currency reports default to. Reports may still query in any
   *  currency; this is the report-bundle default. */
  reportCurrency:   string;
  /** Columns the system's CSV export ships. */
  exportColumns:    readonly { key: string; label: string }[];
}

const TX_BASE_COLUMNS = [
  { key: 'occurred_at',  label: 'Date' },
  { key: 'type',         label: 'Type' },
  { key: 'source',       label: 'Source' },
  { key: 'external_ref', label: 'Reference' },
  { key: 'amount',       label: 'Amount' },
  { key: 'currency',     label: 'Currency' },
  { key: 'status',       label: 'Status' },
] as const;

export const ACCOUNTING_SYSTEMS: Record<AccountingSystemId, AccountingSystem> = {
  us_gaap: {
    id:              'us_gaap',
    label:           'US GAAP',
    description:     'Generally Accepted Accounting Principles. Calendar fiscal year, sales-tax-aware, USD reporting baseline.',
    fiscalYearStart: '01-01',
    defaultTaxRate:  0,        /* US sales tax is jurisdiction-specific. */
    reportCurrency:  'USD',
    exportColumns:   TX_BASE_COLUMNS,
  },
  eu_vat: {
    id:              'eu_vat',
    label:           'EU VAT',
    description:     'EU VAT-compliant. Calendar fiscal year, country-specific VAT rates, EUR reporting baseline. Reverse-charge handling on cross-border B2B.',
    fiscalYearStart: '01-01',
    defaultTaxRate:  0.21,     /* NL standard rate as the default; per-country overrides land in metadata. */
    reportCurrency:  'EUR',
    exportColumns:   [
      ...TX_BASE_COLUMNS,
      { key: 'metadata.vat_rate',        label: 'VAT rate' },
      { key: 'metadata.vat_amount',      label: 'VAT amount' },
      { key: 'metadata.country_code',    label: 'Country' },
    ],
  },
  custom: {
    id:              'custom',
    label:           'Custom',
    description:     'Operator-defined accounting system. Use when a market needs reporting that doesn\'t fit US GAAP or EU VAT.',
    fiscalYearStart: '01-01',
    defaultTaxRate:  0,
    reportCurrency:  'USD',
    exportColumns:   TX_BASE_COLUMNS,
  },
};

export const ACCOUNTING_SYSTEM_IDS: AccountingSystemId[] = ['us_gaap', 'eu_vat', 'custom'];

export function getAccountingSystem(id: AccountingSystemId | string): AccountingSystem {
  return ACCOUNTING_SYSTEMS[(id as AccountingSystemId)] ?? ACCOUNTING_SYSTEMS.us_gaap;
}
