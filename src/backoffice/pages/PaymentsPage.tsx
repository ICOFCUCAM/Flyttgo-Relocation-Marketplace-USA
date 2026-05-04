import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  listTransactions, summariseLedger,
  type TransactionType, type TransactionStatus,
} from '../services/payments-service';

const TYPE_FILTERS: (TransactionType | 'all')[] = [
  'all', 'charge', 'payout', 'refund', 'escrow_hold', 'escrow_release', 'adjustment',
];

const STATUS_TONE: Record<TransactionStatus, string> = {
  pending:   'bg-amber-50 text-amber-800',
  completed: 'bg-emerald-50 text-emerald-700',
  failed:    'bg-rose-50 text-rose-700',
  reversed:  'bg-slate-100 text-slate-700',
};

function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch { return `${currency} ${n.toFixed(2)}`; }
}

export default function PaymentsPage() {
  const [type, setType] = useState<TransactionType | 'all'>('all');

  const txs = useQuery({
    queryKey: ['bos', 'tx', type],
    queryFn:  () => listTransactions({ limit: 200, type: type === 'all' ? undefined : type }),
  });

  const summary = useQuery({
    queryKey: ['bos', 'ledger', 'summary'],
    queryFn:  () => summariseLedger({}),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">Central payments</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Transactions &amp; ledger</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Every customer charge, driver payout, refund, and escrow movement is captured as a
          transaction with matching debit / credit ledger entries. Reports query the ledger
          by account.
        </p>
      </header>

      {/* Ledger summary */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Ledger summary by account</h2>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-5 py-3 font-bold">Account</th>
                <th className="text-right px-5 py-3 font-bold">Debit</th>
                <th className="text-right px-5 py-3 font-bold">Credit</th>
                <th className="text-right px-5 py-3 font-bold">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(summary.data ?? []).map(s => (
                <tr key={s.account}>
                  <td className="px-5 py-2 font-mono text-xs text-slate-800">{s.account}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{s.debit.toFixed(2)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{s.credit.toFixed(2)}</td>
                  <td className={`px-5 py-2 text-right tabular-nums font-bold ${s.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {s.net.toFixed(2)}
                  </td>
                </tr>
              ))}
              {(summary.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="text-center text-sm text-slate-500 py-6">No ledger entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transactions */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent transactions</h2>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FILTERS.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  type === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-5 py-3 font-bold">Occurred</th>
                <th className="text-left px-5 py-3 font-bold">Type</th>
                <th className="text-left px-5 py-3 font-bold">Source</th>
                <th className="text-left px-5 py-3 font-bold">Reference</th>
                <th className="text-right px-5 py-3 font-bold">Amount</th>
                <th className="text-left px-5 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(txs.data ?? []).map(t => (
                <tr key={t.id}>
                  <td className="px-5 py-2 text-xs text-slate-500">{new Date(t.occurred_at).toLocaleString()}</td>
                  <td className="px-5 py-2 font-mono text-xs">{t.type.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-2 text-xs">{t.source}</td>
                  <td className="px-5 py-2 font-mono text-xs text-slate-500">{t.external_ref ?? '—'}</td>
                  <td className="px-5 py-2 text-right tabular-nums font-bold">{fmtMoney(Number(t.amount), t.currency)}</td>
                  <td className="px-5 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${STATUS_TONE[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(txs.data ?? []).length === 0 && !txs.isLoading && (
                <tr><td colSpan={6} className="text-center text-sm text-slate-500 py-8">No transactions match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
