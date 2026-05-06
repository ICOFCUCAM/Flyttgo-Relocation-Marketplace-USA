import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCcw } from 'lucide-react';
import { listTransactions, summariseLedger } from '../services/payments-service';
import { getAccountingConfig, setActiveAccountingSystem } from '../services/accounting-service';
import {
  ACCOUNTING_SYSTEM_IDS, getAccountingSystem, type AccountingSystemId,
} from '../lib/accounting-systems';
import { toCSV, downloadCSV } from '../lib/csv';
import { useBackofficeAuth } from '../rbac/useBackofficeAuth';
import { PERMISSIONS } from '../rbac/permissions';

export default function AccountingPage() {
  const auth = useBackofficeAuth();
  const qc = useQueryClient();
  const canExport = auth.hasPermission(PERMISSIONS.ACCOUNTING_EXPORT);
  const canConfig = auth.hasPermission(PERMISSIONS.ACCOUNTING_CONFIG);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const config  = useQuery({ queryKey: ['bos', 'accounting', 'config'],  queryFn: () => getAccountingConfig() });
  const summary = useQuery({ queryKey: ['bos', 'accounting', 'summary'], queryFn: () => summariseLedger({}) });

  const activeId = (config.data?.active_system ?? 'us_gaap') as AccountingSystemId;
  const system   = getAccountingSystem(activeId);

  async function exportCSV() {
    const txs = await listTransactions({ limit: 500 });
    const csv = toCSV(
      txs as unknown as Record<string, unknown>[],
      system.exportColumns as { key: string; label: string }[],
    );
    const filename = `flyttgo-${system.id}-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(filename, csv);
  }

  async function switchSystem(next: AccountingSystemId) {
    if (next === activeId) return;
    setBusy(true);
    setError('');
    try {
      await setActiveAccountingSystem({ system: next });
      await qc.invalidateQueries({ queryKey: ['bos', 'accounting'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to switch accounting system');
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">{system.label}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Accounting</h1>
        <p className="text-slate-600 mt-1 text-sm">
          {system.description}
        </p>
      </header>

      {/* System switch */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active accounting system</h2>
            <p className="text-lg font-extrabold mt-1">{system.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Fiscal year: <strong>{system.fiscalYearStart}</strong> · Default tax rate: <strong>{(system.defaultTaxRate * 100).toFixed(2)}%</strong> · Reports in <strong>{system.reportCurrency}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              disabled={!canConfig || busy}
              value={activeId}
              onChange={e => switchSystem(e.target.value as AccountingSystemId)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {ACCOUNTING_SYSTEM_IDS.map(id => (
                <option key={id} value={id}>{getAccountingSystem(id).label}</option>
              ))}
            </select>
            {!canConfig && <span className="text-xs text-slate-400">View only</span>}
          </div>
        </div>
        {error && <p className="text-rose-600 text-sm mt-2">{error}</p>}
      </section>

      {/* Ledger summary */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ledger summary</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['bos', 'accounting', 'summary'] })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50"
            >
              <RefreshCcw size={12} /> Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-md font-bold disabled:opacity-50"
              title={canExport ? 'Download CSV' : 'Requires accounting.export'}
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>

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
                  <td className="px-5 py-2 font-mono text-xs">{s.account}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{s.debit.toFixed(2)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{s.credit.toFixed(2)}</td>
                  <td className={`px-5 py-2 text-right tabular-nums font-bold ${s.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{s.net.toFixed(2)}</td>
                </tr>
              ))}
              {(summary.data ?? []).length === 0 && (
                <tr><td colSpan={4} className="text-center text-sm text-slate-500 py-6">No ledger entries yet — recorded once the first booking settles through bos_transactions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
