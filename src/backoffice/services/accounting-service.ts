import { supabase } from '../../lib/supabase';
import { recordAudit } from './audit-service';
import type { AccountingSystemId } from '../lib/accounting-systems';

export interface AccountingConfig {
  id:                 number;
  active_system:      AccountingSystemId;
  fiscal_year_start:  string | null;
  default_tax_rate:   number | null;
  updated_at:         string;
  updated_by:         string | null;
}

export async function getAccountingConfig(): Promise<AccountingConfig | null> {
  const { data, error } = await supabase
    .from('bos_accounting_config')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) return null;
  return data as AccountingConfig;
}

export async function setActiveAccountingSystem(input: {
  system: AccountingSystemId;
  defaultTaxRate?: number;
  fiscalYearStart?: string;
}): Promise<void> {
  const { data: before } = await supabase
    .from('bos_accounting_config')
    .select('active_system, default_tax_rate, fiscal_year_start')
    .eq('id', 1)
    .single();

  const patch: Record<string, unknown> = {
    active_system: input.system,
    updated_at:    new Date().toISOString(),
  };
  if (input.defaultTaxRate !== undefined)   patch.default_tax_rate   = input.defaultTaxRate;
  if (input.fiscalYearStart !== undefined)  patch.fiscal_year_start  = input.fiscalYearStart;

  const { data: { user } } = await supabase.auth.getUser();
  patch.updated_by = user?.id ?? null;

  const { error } = await supabase.from('bos_accounting_config').update(patch).eq('id', 1);
  if (error) throw error;

  await recordAudit({
    action:      'accounting.system.switch',
    targetType:  'accounting_config',
    targetId:    '1',
    diff:        { before, after: { ...before, ...patch } },
  });
}
