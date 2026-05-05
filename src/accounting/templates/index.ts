/**
 * Chart-of-accounts templates per jurisdiction.
 *
 * Loaded by the AccountingWorkspace's "Initialize chart of accounts"
 * action when an accountant first selects a jurisdiction. Each
 * template is a flat array of account specs that gets bulk-inserted
 * into the `accounts` table.
 *
 *   NO   - Norwegian Standard Kontoplan (subset; full plan has 1000+ codes)
 *   GB   - UK GAAP / FRS 102 commercial chart
 *   US   - US GAAP / typical SMB chart
 *   IFRS - IFRS-aligned international chart for cross-border filings
 *
 * `is_statutory: true` marks accounts that the regulator expects to
 * exist for filings — the UI prevents deletion (Phase 4 spec).
 *
 * The full kontoplan / GAAP / IFRS plans are 4-digit hierarchies
 * with 200+ leaf accounts. This file ships the production-critical
 * statutory subset (revenue, COGS, payroll, VAT, fixed assets,
 * receivables, payables, equity, banking) so the platform is
 * shippable; admins can extend per organisation via the workspace.
 */

import type { AccountType } from '../types';

export interface AccountTemplate {
  code:          string;
  display_name:  string;
  account_type:  AccountType;
  parent_code?:  string;
  is_statutory?: boolean;
  description?:  string;
}

/* ── Norway · Standard Kontoplan (SAF-T compatible) ─────────────── */
export const COA_NO: AccountTemplate[] = [
  /* 10xx — Immaterielle eiendeler / Anleggsmidler */
  { code: '1000', display_name: 'Forskning og utvikling',          account_type: 'asset',     is_statutory: true },
  { code: '1080', display_name: 'Goodwill',                        account_type: 'asset',     is_statutory: true },
  { code: '1200', display_name: 'Maskiner og anlegg',              account_type: 'asset',     is_statutory: true },
  { code: '1230', display_name: 'Biler og transportmidler',        account_type: 'asset',     is_statutory: true },
  { code: '1280', display_name: 'Kontormaskiner',                  account_type: 'asset' },
  /* 15xx — Kortsiktige fordringer */
  { code: '1500', display_name: 'Kundefordringer',                 account_type: 'asset',     is_statutory: true },
  { code: '1530', display_name: 'Opptjent inntekt',                account_type: 'asset' },
  /* 19xx — Bank / kasse */
  { code: '1900', display_name: 'Kontanter',                       account_type: 'asset' },
  { code: '1920', display_name: 'Bankinnskudd',                    account_type: 'asset',     is_statutory: true },
  { code: '1950', display_name: 'Bankinnskudd skattetrekk',        account_type: 'asset',     is_statutory: true },
  /* 20xx — Egenkapital */
  { code: '2000', display_name: 'Aksjekapital',                    account_type: 'equity',    is_statutory: true },
  { code: '2050', display_name: 'Annen egenkapital',               account_type: 'equity',    is_statutory: true },
  /* 24xx — Leverandørgjeld */
  { code: '2400', display_name: 'Leverandørgjeld',                 account_type: 'liability', is_statutory: true },
  /* 27xx — MVA */
  { code: '2700', display_name: 'Utgående merverdiavgift høy sats',account_type: 'liability', is_statutory: true },
  { code: '2710', display_name: 'Inngående merverdiavgift høy sats',account_type: 'asset',    is_statutory: true },
  { code: '2740', display_name: 'Oppgjørskonto merverdiavgift',    account_type: 'liability', is_statutory: true },
  /* 28xx — Skatt */
  { code: '2800', display_name: 'Avsatt utbytte',                  account_type: 'liability' },
  { code: '2860', display_name: 'Skattetrekk',                     account_type: 'liability', is_statutory: true },
  /* 30xx — Salgsinntekter */
  { code: '3000', display_name: 'Salgsinntekt høy sats',           account_type: 'income',    is_statutory: true },
  { code: '3100', display_name: 'Salgsinntekt fritatt',            account_type: 'income',    is_statutory: true },
  /* 40xx — Varekostnad */
  { code: '4300', display_name: 'Innkjøp av tjenester',            account_type: 'expense',   is_statutory: true },
  /* 50xx — Lønn */
  { code: '5000', display_name: 'Lønn til ansatte',                account_type: 'expense',   is_statutory: true },
  { code: '5400', display_name: 'Arbeidsgiveravgift',              account_type: 'expense',   is_statutory: true },
  /* 65xx — Driftskostnader */
  { code: '6300', display_name: 'Leie lokaler',                    account_type: 'expense' },
  { code: '6500', display_name: 'IT-kostnader',                    account_type: 'expense' },
  { code: '6800', display_name: 'Kontorrekvisita',                 account_type: 'expense' },
  /* 73xx — Salgs- og reklamekostnad */
  { code: '7320', display_name: 'Reklamekostnad',                  account_type: 'expense' },
  /* 80xx — Finansposter */
  { code: '8050', display_name: 'Renteinntekter',                  account_type: 'income' },
  { code: '8150', display_name: 'Rentekostnader',                  account_type: 'expense' },
];

/* ── United Kingdom · UK GAAP / FRS 102 ─────────────────────────── */
export const COA_GB: AccountTemplate[] = [
  /* 0xxx — Fixed assets */
  { code: '0010', display_name: 'Goodwill',                        account_type: 'asset',     is_statutory: true },
  { code: '0030', display_name: 'Land and buildings',              account_type: 'asset',     is_statutory: true },
  { code: '0050', display_name: 'Plant and machinery',             account_type: 'asset',     is_statutory: true },
  { code: '0070', display_name: 'Office equipment',                account_type: 'asset' },
  { code: '0090', display_name: 'Motor vehicles',                  account_type: 'asset' },
  /* 1xxx — Current assets */
  { code: '1100', display_name: 'Trade debtors',                   account_type: 'asset',     is_statutory: true },
  { code: '1200', display_name: 'Bank current account',            account_type: 'asset',     is_statutory: true },
  { code: '1230', display_name: 'Petty cash',                      account_type: 'asset' },
  /* 2xxx — Current liabilities */
  { code: '2100', display_name: 'Trade creditors',                 account_type: 'liability', is_statutory: true },
  { code: '2200', display_name: 'VAT control account',             account_type: 'liability', is_statutory: true },
  { code: '2210', display_name: 'PAYE & NIC control',              account_type: 'liability', is_statutory: true },
  { code: '2220', display_name: 'Corporation tax',                 account_type: 'liability', is_statutory: true },
  /* 3xxx — Capital and reserves */
  { code: '3000', display_name: 'Share capital',                   account_type: 'equity',    is_statutory: true },
  { code: '3100', display_name: 'Profit and loss account',         account_type: 'equity',    is_statutory: true },
  /* 4xxx — Sales */
  { code: '4000', display_name: 'Sales — standard rate',           account_type: 'income',    is_statutory: true },
  { code: '4010', display_name: 'Sales — zero rate',               account_type: 'income',    is_statutory: true },
  { code: '4020', display_name: 'Sales — exempt',                  account_type: 'income' },
  /* 5xxx — Cost of sales */
  { code: '5000', display_name: 'Materials purchased',             account_type: 'expense' },
  { code: '5100', display_name: 'Subcontractor costs',             account_type: 'expense' },
  /* 7xxx — Overheads */
  { code: '7000', display_name: 'Gross wages',                     account_type: 'expense',   is_statutory: true },
  { code: '7006', display_name: 'Employer NIC',                    account_type: 'expense',   is_statutory: true },
  { code: '7100', display_name: 'Rent',                            account_type: 'expense' },
  { code: '7501', display_name: 'Postage and carriage',            account_type: 'expense' },
  { code: '7600', display_name: 'Legal and professional fees',     account_type: 'expense' },
  { code: '7901', display_name: 'Bank interest received',          account_type: 'income' },
  { code: '7903', display_name: 'Bank charges',                    account_type: 'expense' },
];

/* ── United States · US GAAP commercial chart ───────────────────── */
export const COA_US: AccountTemplate[] = [
  /* 1xxx — Current assets */
  { code: '1010', display_name: 'Cash — operating',                account_type: 'asset',     is_statutory: true },
  { code: '1100', display_name: 'Accounts receivable',             account_type: 'asset',     is_statutory: true },
  { code: '1200', display_name: 'Inventory',                       account_type: 'asset' },
  { code: '1500', display_name: 'Prepaid expenses',                account_type: 'asset' },
  /* 1700-1900 — Fixed assets */
  { code: '1700', display_name: 'Equipment',                       account_type: 'asset',     is_statutory: true },
  { code: '1710', display_name: 'Vehicles',                        account_type: 'asset' },
  { code: '1750', display_name: 'Accumulated depreciation',        account_type: 'asset',     is_statutory: true },
  /* 2xxx — Current liabilities */
  { code: '2010', display_name: 'Accounts payable',                account_type: 'liability', is_statutory: true },
  { code: '2110', display_name: 'Sales tax payable',               account_type: 'liability', is_statutory: true },
  { code: '2200', display_name: 'Payroll liabilities',             account_type: 'liability', is_statutory: true },
  { code: '2300', display_name: 'Federal income tax payable',      account_type: 'liability', is_statutory: true },
  /* 3xxx — Equity */
  { code: '3000', display_name: 'Common stock',                    account_type: 'equity',    is_statutory: true },
  { code: '3100', display_name: 'Retained earnings',               account_type: 'equity',    is_statutory: true },
  /* 4xxx — Revenue */
  { code: '4000', display_name: 'Service revenue',                 account_type: 'income',    is_statutory: true },
  { code: '4500', display_name: 'Interest income',                 account_type: 'income' },
  /* 5xxx — Cost of revenue */
  { code: '5000', display_name: 'Cost of services',                account_type: 'expense',   is_statutory: true },
  /* 6xxx — Operating expenses */
  { code: '6000', display_name: 'Salaries and wages',              account_type: 'expense',   is_statutory: true },
  { code: '6010', display_name: 'Payroll taxes',                   account_type: 'expense',   is_statutory: true },
  { code: '6100', display_name: 'Rent',                            account_type: 'expense' },
  { code: '6200', display_name: 'Software and subscriptions',      account_type: 'expense' },
  { code: '6500', display_name: 'Professional fees',               account_type: 'expense' },
  { code: '6900', display_name: 'Bank fees',                       account_type: 'expense' },
];

/* ── IFRS · International commercial chart ──────────────────────── */
export const COA_IFRS: AccountTemplate[] = [
  /* Statement of financial position — assets */
  { code: 'A.10', display_name: 'Cash and cash equivalents',                   account_type: 'asset',     is_statutory: true },
  { code: 'A.20', display_name: 'Trade and other receivables',                 account_type: 'asset',     is_statutory: true },
  { code: 'A.30', display_name: 'Inventories',                                 account_type: 'asset' },
  { code: 'A.40', display_name: 'Property, plant and equipment',               account_type: 'asset',     is_statutory: true },
  { code: 'A.50', display_name: 'Intangible assets',                           account_type: 'asset',     is_statutory: true },
  { code: 'A.60', display_name: 'Right-of-use assets',                         account_type: 'asset' },
  /* Statement of financial position — liabilities */
  { code: 'L.10', display_name: 'Trade and other payables',                    account_type: 'liability', is_statutory: true },
  { code: 'L.20', display_name: 'Tax liabilities',                             account_type: 'liability', is_statutory: true },
  { code: 'L.30', display_name: 'Lease liabilities',                           account_type: 'liability' },
  { code: 'L.40', display_name: 'Borrowings',                                  account_type: 'liability' },
  /* Equity */
  { code: 'E.10', display_name: 'Issued capital',                              account_type: 'equity',    is_statutory: true },
  { code: 'E.20', display_name: 'Retained earnings',                           account_type: 'equity',    is_statutory: true },
  { code: 'E.30', display_name: 'Other reserves',                              account_type: 'equity' },
  /* Income */
  { code: 'I.10', display_name: 'Revenue from contracts with customers',       account_type: 'income',    is_statutory: true },
  { code: 'I.20', display_name: 'Other operating income',                      account_type: 'income' },
  { code: 'I.50', display_name: 'Finance income',                              account_type: 'income' },
  /* Expenses */
  { code: 'X.10', display_name: 'Cost of sales',                               account_type: 'expense',   is_statutory: true },
  { code: 'X.20', display_name: 'Employee benefits expense',                   account_type: 'expense',   is_statutory: true },
  { code: 'X.30', display_name: 'Depreciation and amortisation',               account_type: 'expense',   is_statutory: true },
  { code: 'X.40', display_name: 'Other operating expenses',                    account_type: 'expense' },
  { code: 'X.50', display_name: 'Finance costs',                               account_type: 'expense' },
  { code: 'X.60', display_name: 'Income tax expense',                          account_type: 'expense',   is_statutory: true },
];

export const TEMPLATES: Record<string, AccountTemplate[]> = {
  NO:   COA_NO,
  GB:   COA_GB,
  US:   COA_US,
  IFRS: COA_IFRS,
};

export interface JurisdictionMeta {
  code:          'NO' | 'GB' | 'US' | 'IFRS';
  display_name:  string;
  base_currency: string;
  locale:        string;
  vat_regime:    'NO' | 'GB' | 'US' | 'IFRS';
}

export const JURISDICTIONS: JurisdictionMeta[] = [
  { code: 'NO',   display_name: 'Norway',                base_currency: 'NOK', locale: 'nb-NO', vat_regime: 'NO'   },
  { code: 'GB',   display_name: 'United Kingdom',        base_currency: 'GBP', locale: 'en-GB', vat_regime: 'GB'   },
  { code: 'US',   display_name: 'United States',         base_currency: 'USD', locale: 'en-US', vat_regime: 'US'   },
  { code: 'IFRS', display_name: 'IFRS (international)',  base_currency: 'USD', locale: 'en',    vat_regime: 'IFRS' },
];
