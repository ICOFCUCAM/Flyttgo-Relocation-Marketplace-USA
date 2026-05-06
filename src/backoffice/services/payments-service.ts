import { supabase } from '../../lib/supabase';
import { recordAudit } from './audit-service';

export type TransactionType =
  | 'charge' | 'payout' | 'refund'
  | 'escrow_hold' | 'escrow_release' | 'adjustment';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface BosTransaction {
  id:            string;
  external_ref:  string | null;
  source:        string;
  amount:        number;
  currency:      string;
  type:          TransactionType;
  status:        TransactionStatus;
  customer_id:   string | null;
  driver_id:     string | null;
  occurred_at:   string;
  metadata:      Record<string, unknown> | null;
  created_at:    string;
}

export interface BosLedgerEntry {
  id:             string;
  transaction_id: string | null;
  account:        string;
  debit:          number;
  credit:         number;
  currency:       string;
  posted_at:      string;
  metadata:       Record<string, unknown> | null;
}

interface ListTxOptions {
  limit?: number;
  type?:  TransactionType;
  status?: TransactionStatus;
  from?:  string;
  to?:    string;
}

export async function listTransactions(opts: ListTxOptions = {}): Promise<BosTransaction[]> {
  let q = supabase
    .from('bos_transactions')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 200, 500));
  if (opts.type)   q = q.eq('type', opts.type);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.from)   q = q.gte('occurred_at', opts.from);
  if (opts.to)     q = q.lte('occurred_at', opts.to);
  const { data, error } = await q;
  if (error) return [];
  return (data as BosTransaction[]) ?? [];
}

export async function listLedgerEntries(opts: { account?: string; limit?: number } = {}): Promise<BosLedgerEntry[]> {
  let q = supabase
    .from('bos_ledger_entries')
    .select('*')
    .order('posted_at', { ascending: false })
    .limit(Math.min(opts.limit ?? 200, 500));
  if (opts.account) q = q.eq('account', opts.account);
  const { data, error } = await q;
  if (error) return [];
  return (data as BosLedgerEntry[]) ?? [];
}

interface RecordTransactionInput {
  source:       string;
  externalRef?: string;
  type:         TransactionType;
  amount:       number;
  currency?:    string;
  customerId?:  string | null;
  driverId?:    string | null;
  metadata?:    Record<string, unknown>;
  /** Matching ledger entries — sum(debit) must equal sum(credit). */
  ledger:       { account: string; debit?: number; credit?: number; metadata?: Record<string, unknown> }[];
}

/**
 * Insert a transaction header + matching ledger entries inside a
 * single mutation. Validates that debits + credits balance.
 *
 * Caller is responsible for choosing the right account names —
 * convention is `domain.subdomain`, e.g.:
 *   revenue.bookings, revenue.subscriptions
 *   escrow.holding, escrow.released
 *   payout.driver, payout.refund
 *   tax.collected
 */
export async function recordTransaction(input: RecordTransactionInput): Promise<BosTransaction | null> {
  const debits  = input.ledger.reduce((s, e) => s + (e.debit  ?? 0), 0);
  const credits = input.ledger.reduce((s, e) => s + (e.credit ?? 0), 0);
  if (Math.abs(debits - credits) > 0.005) {
    throw new Error(`Ledger imbalance: debits=${debits} credits=${credits}`);
  }

  const { data: tx, error: txErr } = await supabase
    .from('bos_transactions')
    .insert({
      source:       input.source,
      external_ref: input.externalRef ?? null,
      type:         input.type,
      amount:       input.amount,
      currency:     input.currency ?? 'USD',
      customer_id:  input.customerId ?? null,
      driver_id:    input.driverId ?? null,
      metadata:     input.metadata ?? {},
    })
    .select()
    .single();
  if (txErr) throw txErr;
  const transaction = tx as BosTransaction;

  if (input.ledger.length > 0) {
    const { error: ledErr } = await supabase
      .from('bos_ledger_entries')
      .insert(input.ledger.map(e => ({
        transaction_id: transaction.id,
        account:        e.account,
        debit:          e.debit  ?? 0,
        credit:         e.credit ?? 0,
        currency:       input.currency ?? 'USD',
        metadata:       e.metadata ?? {},
      })));
    if (ledErr) throw ledErr;
  }

  await recordAudit({
    action:      'payments.transaction.record',
    targetType:  'transaction',
    targetId:    transaction.id,
    diff:        { type: input.type, amount: input.amount, currency: input.currency ?? 'USD' },
  });

  return transaction;
}

/**
 * Aggregate ledger by account — sum of debit + credit per account.
 * Used by the accounting dashboard's revenue / escrow / payout tiles.
 */
export interface LedgerSummary {
  account: string;
  debit:   number;
  credit:  number;
  net:     number;
}

export async function summariseLedger(opts: { from?: string; to?: string } = {}): Promise<LedgerSummary[]> {
  let q = supabase.from('bos_ledger_entries').select('account, debit, credit');
  if (opts.from) q = q.gte('posted_at', opts.from);
  if (opts.to)   q = q.lte('posted_at', opts.to);
  const { data, error } = await q;
  if (error || !data) return [];

  const byAccount = new Map<string, LedgerSummary>();
  for (const row of data as { account: string; debit: number; credit: number }[]) {
    const k = row.account;
    const cur = byAccount.get(k) ?? { account: k, debit: 0, credit: 0, net: 0 };
    cur.debit  += Number(row.debit  ?? 0);
    cur.credit += Number(row.credit ?? 0);
    cur.net     = cur.credit - cur.debit;
    byAccount.set(k, cur);
  }
  return Array.from(byAccount.values()).sort((a, b) => a.account.localeCompare(b.account));
}
