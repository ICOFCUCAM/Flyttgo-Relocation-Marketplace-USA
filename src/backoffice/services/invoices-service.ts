import { supabase } from '../../lib/supabase';
import { recordAudit } from './audit-service';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';

export interface BosInvoice {
  id:                 string;
  invoice_number:     string;
  booking_id:         string | null;
  customer_id:        string | null;
  amount:             number;
  tax:                number | null;
  currency:           string;
  accounting_system:  string;
  status:             InvoiceStatus;
  issued_at:          string;
  paid_at:            string | null;
  pdf_url:            string | null;
  metadata:           Record<string, unknown> | null;
}

export async function listInvoices(opts: { status?: InvoiceStatus; limit?: number } = {}): Promise<BosInvoice[]> {
  let q = supabase
    .from('bos_invoices')
    .select('*')
    .order('issued_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 200, 500));
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) return [];
  return (data as BosInvoice[]) ?? [];
}

interface CreateInvoiceInput {
  bookingId?:        string;
  customerId?:       string;
  amount:            number;
  tax?:              number;
  currency?:         string;
  accountingSystem:  string;
  metadata?:         Record<string, unknown>;
}

/**
 * Generate a new invoice. Invoice number is composed
 * deterministically from the issue date + a running sequence so
 * accountants get a chronological, gap-free series. The DB unique
 * constraint on `invoice_number` guards against double-submits.
 */
export async function generateInvoice(input: CreateInvoiceInput): Promise<BosInvoice> {
  /* Compose the next invoice number — yyyymm-NNNN. Per-month
   * sequence is read from the count of existing invoices in the
   * current month + 1. Imperfect (a race could mint a duplicate)
   * but the DB unique constraint catches it; caller can retry. */
  const now = new Date();
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const { count } = await supabase
    .from('bos_invoices')
    .select('id', { count: 'exact', head: true })
    .gte('issued_at', monthStart);
  const seq = String((count ?? 0) + 1).padStart(4, '0');
  const invoice_number = `INV-${yyyymm}-${seq}`;

  const { data, error } = await supabase
    .from('bos_invoices')
    .insert({
      invoice_number,
      booking_id:        input.bookingId ?? null,
      customer_id:       input.customerId ?? null,
      amount:            input.amount,
      tax:               input.tax ?? 0,
      currency:          input.currency ?? 'USD',
      accounting_system: input.accountingSystem,
      status:            'issued',
      metadata:          input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw error;

  await recordAudit({
    action:      'invoices.generate',
    targetType:  'invoice',
    targetId:    (data as BosInvoice).id,
    diff:        { invoice_number, amount: input.amount, accounting_system: input.accountingSystem },
  });

  return data as BosInvoice;
}

export async function setInvoiceStatus(input: { id: string; status: InvoiceStatus }): Promise<void> {
  const patch: Record<string, unknown> = { status: input.status };
  if (input.status === 'paid') patch.paid_at = new Date().toISOString();
  const { error } = await supabase.from('bos_invoices').update(patch).eq('id', input.id);
  if (error) throw error;
  await recordAudit({
    action:      'invoices.status.set',
    targetType:  'invoice',
    targetId:    input.id,
    diff:        { status: input.status },
  });
}
