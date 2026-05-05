import { useEffect, useState } from 'react';
import { Loader2, FileDown } from 'lucide-react';
import {
  fetchTrialBalance, fetchIncomeStatement, fetchBalanceSheet,
} from '../service';
import { exportCsv, exportWord, exportPdf } from '../exports';
import type {
  BalanceSheetRow, IncomeStatementRow, Jurisdiction, TrialBalanceRow,
} from '../types';

type Tab = 'tb' | 'is' | 'bs';

/**
 * AC.03 Reports — three tabbed statutory views: trial balance,
 * income statement, balance sheet. All read from SQL views so the
 * numbers are reproducible and consistent with the auditor's view.
 *
 * Export buttons (CSV / Word / PDF) operate on whichever tab is
 * active so the file matches what the operator sees.
 */
export default function StatutoryReports({ jurisdiction }: { jurisdiction: Jurisdiction }) {
  const [tab, setTab] = useState<Tab>('tb');
  const [tb, setTb] = useState<TrialBalanceRow[]>([]);
  const [is, setIs] = useState<IncomeStatementRow[]>([]);
  const [bs, setBs] = useState<BalanceSheetRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [t, i, b] = await Promise.all([
          fetchTrialBalance(jurisdiction),
          fetchIncomeStatement(jurisdiction),
          fetchBalanceSheet(jurisdiction),
        ]);
        if (cancelled) return;
        setTb(t); setIs(i); setBs(b);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [jurisdiction]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
          {([
            { id: 'tb' as Tab, label: 'Trial Balance' },
            { id: 'is' as Tab, label: 'Income Statement' },
            { id: 'bs' as Tab, label: 'Balance Sheet' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 transition ${
                tab === t.id ? 'bg-[#0B2E59] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <ReportExportButtons
          jurisdiction={jurisdiction}
          tab={tab}
          tbRows={tb} isRows={is} bsRows={bs}
        />
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      ) : tab === 'tb' ? <TrialBalanceTable rows={tb} />
        : tab === 'is' ? <IncomeStatementTable rows={is} />
        : <BalanceSheetTable rows={bs} />}
    </div>
  );
}

/* ── Trial balance table ───────────────────────────────── */

function TrialBalanceTable({ rows }: { rows: TrialBalanceRow[] }) {
  if (rows.length === 0) return <p className="text-slate-500 text-sm">No posted entries yet.</p>;
  const totals = rows.reduce((a, r) => {
    a.dr += Number(r.total_debit ?? 0); a.cr += Number(r.total_credit ?? 0); return a;
  }, { dr: 0, cr: 0 });
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left px-3 py-2">Code</th>
            <th className="text-left px-3 py-2">Account</th>
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-right px-3 py-2">Debit</th>
            <th className="text-right px-3 py-2">Credit</th>
            <th className="text-right px-3 py-2">Net</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map(r => (
            <tr key={r.account_code} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-mono">{r.account_code}</td>
              <td className="px-3 py-1.5">{r.display_name}</td>
              <td className="px-3 py-1.5 capitalize text-slate-500">{r.account_type}</td>
              <td className="px-3 py-1.5 text-right">{Number(r.total_debit).toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right">{Number(r.total_credit).toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right font-bold">{Number(r.net_balance).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 border-t border-slate-200 font-bold">
            <td colSpan={3} className="px-3 py-2 text-xs">TOTALS</td>
            <td className="px-3 py-2 text-right">{totals.dr.toFixed(2)}</td>
            <td className="px-3 py-2 text-right">{totals.cr.toFixed(2)}</td>
            <td className={`px-3 py-2 text-right ${Math.abs(totals.dr - totals.cr) < 0.01 ? 'text-emerald-700' : 'text-red-600'}`}>
              {Math.abs(totals.dr - totals.cr) < 0.01 ? 'Balanced ✓' : (totals.dr - totals.cr).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ── Income statement table ───────────────────────────── */

function IncomeStatementTable({ rows }: { rows: IncomeStatementRow[] }) {
  if (rows.length === 0) return <p className="text-slate-500 text-sm">No revenue or expense entries posted yet.</p>;
  const income  = rows.filter(r => r.account_type === 'income');
  const expense = rows.filter(r => r.account_type === 'expense');
  const totalIncome  = income.reduce((s, r) => s + Number(r.period_total ?? 0), 0);
  const totalExpense = expense.reduce((s, r) => s + Number(r.period_total ?? 0), 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Code</th>
            <th className="text-left  px-3 py-2">Account</th>
            <th className="text-right px-3 py-2">Year</th>
            <th className="text-right px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          <SectionHeader label="Revenue" />
          {income.map(r => (
            <tr key={`i-${r.account_code}-${r.fiscal_year}`} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-mono">{r.account_code}</td>
              <td className="px-3 py-1.5">{r.account_name}</td>
              <td className="px-3 py-1.5 text-right text-slate-500">{r.fiscal_year}</td>
              <td className="px-3 py-1.5 text-right font-bold">{Number(r.period_total).toFixed(2)}</td>
            </tr>
          ))}
          <Subtotal label="Total revenue" value={totalIncome} />

          <SectionHeader label="Expenses" />
          {expense.map(r => (
            <tr key={`e-${r.account_code}-${r.fiscal_year}`} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-mono">{r.account_code}</td>
              <td className="px-3 py-1.5">{r.account_name}</td>
              <td className="px-3 py-1.5 text-right text-slate-500">{r.fiscal_year}</td>
              <td className="px-3 py-1.5 text-right font-bold">{Number(r.period_total).toFixed(2)}</td>
            </tr>
          ))}
          <Subtotal label="Total expenses" value={totalExpense} />
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-300 font-extrabold">
            <td colSpan={3} className="px-3 py-2 text-sm">NET INCOME</td>
            <td className={`px-3 py-2 text-right ${net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {net.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ── Balance sheet table ──────────────────────────────── */

function BalanceSheetTable({ rows }: { rows: BalanceSheetRow[] }) {
  if (rows.length === 0) return <p className="text-slate-500 text-sm">No balance-sheet activity posted yet.</p>;
  const groups = {
    asset:     rows.filter(r => r.account_type === 'asset'),
    liability: rows.filter(r => r.account_type === 'liability'),
    equity:    rows.filter(r => r.account_type === 'equity'),
  };
  const sum = (rs: BalanceSheetRow[]) => rs.reduce((s, r) => s + Number(r.balance_total ?? 0), 0);
  const totalAssets        = sum(groups.asset);
  const totalLiabilities   = sum(groups.liability);
  const totalEquity        = sum(groups.equity);
  const liabPlusEquity     = totalLiabilities + totalEquity;
  const balanced           = Math.abs(totalAssets - liabPlusEquity) < 0.01;

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Code</th>
            <th className="text-left  px-3 py-2">Account</th>
            <th className="text-right px-3 py-2">Balance</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {(['asset','liability','equity'] as const).map(group => (
            <Block key={group} label={group} rows={groups[group]} />
          ))}
          <SectionHeader label="" />
          <tr className="bg-slate-100 font-bold">
            <td colSpan={2} className="px-3 py-2">Total assets</td>
            <td className="px-3 py-2 text-right">{totalAssets.toFixed(2)}</td>
          </tr>
          <tr className="bg-slate-100 font-bold">
            <td colSpan={2} className="px-3 py-2">Total liabilities + equity</td>
            <td className="px-3 py-2 text-right">{liabPlusEquity.toFixed(2)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 font-extrabold">
            <td colSpan={2} className="px-3 py-2 text-sm">BALANCE</td>
            <td className={`px-3 py-2 text-right ${balanced ? 'text-emerald-700' : 'text-red-700'}`}>
              {balanced ? 'Balanced ✓' : (totalAssets - liabPlusEquity).toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Block({ label, rows }: { label: string; rows: BalanceSheetRow[] }) {
  if (rows.length === 0) return null;
  return (
    <>
      <SectionHeader label={label} />
      {rows.map(r => (
        <tr key={`${label}-${r.account_code}`} className="border-t border-slate-100">
          <td className="px-3 py-1.5 font-mono">{r.account_code}</td>
          <td className="px-3 py-1.5">{r.account_name}</td>
          <td className="px-3 py-1.5 text-right">{Number(r.balance_total).toFixed(2)}</td>
        </tr>
      ))}
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-slate-50 text-[10px] uppercase tracking-[0.18em] font-mono text-slate-500">
      <td colSpan={4} className="px-3 py-1.5">{label}</td>
    </tr>
  );
}
function Subtotal({ label, value }: { label: string; value: number }) {
  return (
    <tr className="border-t border-slate-200 font-bold">
      <td colSpan={3} className="px-3 py-1.5">{label}</td>
      <td className="px-3 py-1.5 text-right">{value.toFixed(2)}</td>
    </tr>
  );
}

/* ── Export buttons ─────────────────────────────────── */

function ReportExportButtons({
  jurisdiction, tab, tbRows, isRows, bsRows,
}: {
  jurisdiction: Jurisdiction; tab: Tab;
  tbRows: TrialBalanceRow[]; isRows: IncomeStatementRow[]; bsRows: BalanceSheetRow[];
}) {
  const today = new Date().toISOString().slice(0, 10);

  function exportFor(format: 'csv' | 'word' | 'pdf') {
    if (format === 'pdf') { exportPdf(); return; }
    if (tab === 'tb') {
      const cols = [
        { header: 'Code',    value: (r: TrialBalanceRow) => r.account_code },
        { header: 'Account', value: (r: TrialBalanceRow) => r.display_name },
        { header: 'Type',    value: (r: TrialBalanceRow) => r.account_type },
        { header: 'Debit',   value: (r: TrialBalanceRow) => r.total_debit,  numeric: true },
        { header: 'Credit',  value: (r: TrialBalanceRow) => r.total_credit, numeric: true },
        { header: 'Net',     value: (r: TrialBalanceRow) => r.net_balance,  numeric: true },
      ];
      const fname = `flyttgo-trial-balance-${jurisdiction}-${today}`;
      if (format === 'csv') exportCsv(fname, tbRows, cols);
      else                  exportWord(fname, `Trial Balance · ${jurisdiction}`, tbRows, cols);
    } else if (tab === 'is') {
      const cols = [
        { header: 'Code',    value: (r: IncomeStatementRow) => r.account_code },
        { header: 'Account', value: (r: IncomeStatementRow) => r.account_name },
        { header: 'Type',    value: (r: IncomeStatementRow) => r.account_type },
        { header: 'Year',    value: (r: IncomeStatementRow) => r.fiscal_year, numeric: true },
        { header: 'Total',   value: (r: IncomeStatementRow) => r.period_total, numeric: true },
      ];
      const fname = `flyttgo-income-statement-${jurisdiction}-${today}`;
      if (format === 'csv') exportCsv(fname, isRows, cols);
      else                  exportWord(fname, `Income Statement · ${jurisdiction}`, isRows, cols);
    } else {
      const cols = [
        { header: 'Code',    value: (r: BalanceSheetRow) => r.account_code },
        { header: 'Account', value: (r: BalanceSheetRow) => r.account_name },
        { header: 'Type',    value: (r: BalanceSheetRow) => r.account_type },
        { header: 'Balance', value: (r: BalanceSheetRow) => r.balance_total, numeric: true },
      ];
      const fname = `flyttgo-balance-sheet-${jurisdiction}-${today}`;
      if (format === 'csv') exportCsv(fname, bsRows, cols);
      else                  exportWord(fname, `Balance Sheet · ${jurisdiction}`, bsRows, cols);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => exportFor('csv')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white">
        <FileDown className="w-3 h-3" /> CSV
      </button>
      <button onClick={() => exportFor('word')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white">
        <FileDown className="w-3 h-3" /> Word
      </button>
      <button onClick={() => exportFor('pdf')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white">
        <FileDown className="w-3 h-3" /> PDF
      </button>
    </div>
  );
}
