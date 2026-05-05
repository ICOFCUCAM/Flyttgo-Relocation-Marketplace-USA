import { useEffect, useMemo, useState } from 'react';
import { Loader2, FileDown, Plus, Save, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { useApp }  from '../lib/store';
import { INPUT_FOCUS, FOCUS_RING } from '../components/ds';

import WorkspaceShell, { type WorkspaceSection } from '../accounting/components/WorkspaceShell';
import {
  getMyFinanceRoles,
  getAccountingSettings, updateAccountingSettings,
  listAccounts, initializeChartOfAccounts,
  listJournalEntries, postJournalEntry,
  listTaxCodes, listExchangeRates, recordExchangeRate,
  fetchTrialBalance,
} from '../accounting/service';
import { exportCsv, exportWord, exportPdf } from '../accounting/exports';
import { JURISDICTIONS } from '../accounting/templates';
import type {
  AccountRow, AccountingSettingsRow, ExchangeRateRow,
  Jurisdiction, JournalEntryRow, PostJournalLineInput,
  TaxCodeRow, TrialBalanceRow,
} from '../accounting/types';

/**
 * /accounting — production accounting workspace.
 *
 * Sections (editorial codes per Phase 17):
 *   AC.01  Journal Entries
 *   AC.02  Chart of Accounts
 *   AC.03  Reports — Trial Balance + Statutory exports
 *   AC.04  VAT Center
 *   AC.05  Multi-currency / Exchange rates
 *   AC.06  Settings
 *
 * Gate: only users with super_admin / admin / accountant can land
 * here. Anyone else gets a "Not authorised" card with a link back
 * home (RLS enforces the same gate server-side).
 */
export default function AccountingWorkspace() {
  const { user, profile, loading: authLoading } = useAuth();
  const { setPage } = useApp();

  /* Authorisation gate. */
  const [allowed,  setAllowed]  = useState<boolean | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) { setAllowed(false); return undefined; }
    let cancelled = false;
    void getMyFinanceRoles(user.id).then(roles => {
      if (cancelled) return;
      const editor = roles.includes('super_admin') || roles.includes('admin') || roles.includes('accountant');
      const viewer = roles.includes('finance_viewer');
      setAllowed(editor || viewer);
      setReadOnly(!editor && viewer);
    }).catch(() => { if (!cancelled) setAllowed(false); });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  /* Settings + jurisdiction context. */
  const [settings,    setSettings]    = useState<AccountingSettingsRow | null>(null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('NO');

  useEffect(() => {
    if (!allowed) return undefined;
    void getAccountingSettings().then(s => {
      if (s) {
        setSettings(s);
        setJurisdiction(s.default_jurisdiction);
      }
    });
    return undefined;
  }, [allowed]);

  const jurisdictionMeta = JURISDICTIONS.find(j => j.code === jurisdiction)!;

  /* Domain data. */
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [entries,  setEntries]  = useState<JournalEntryRow[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCodeRow[]>([]);
  const [tb,       setTb]       = useState<TrialBalanceRow[]>([]);
  const [fxRows,   setFxRows]   = useState<ExchangeRateRow[]>([]);

  async function refreshAll() {
    if (!allowed) return;
    try {
      const [accs, ents, txs, tbRows, fx] = await Promise.all([
        listAccounts(jurisdiction),
        listJournalEntries(jurisdiction, { limit: 50 }),
        listTaxCodes(jurisdiction === 'IFRS' ? 'IFRS' : jurisdiction),
        fetchTrialBalance(jurisdiction),
        listExchangeRates(),
      ]);
      setAccounts(accs); setEntries(ents); setTaxCodes(txs); setTb(tbRows); setFxRows(fx);
    } catch (e) {
      toast.error('Refresh failed', { description: e instanceof Error ? e.message : '' });
    }
  }

  useEffect(() => { void refreshAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [allowed, jurisdiction]);

  if (allowed === null || authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </main>
    );
  }
  if (!allowed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-extrabold mb-2">Not authorised</h1>
          <p className="text-sm text-slate-500 mb-5">
            The accounting workspace is restricted to admins, accountants, and approved finance viewers.
          </p>
          <button onClick={() => setPage('home')} className="px-5 py-2.5 bg-[#0B2E59] text-white rounded-xl text-sm font-bold">
            Back to FlyttGo
          </button>
        </div>
      </main>
    );
  }

  const jurisdictionLabel = `${jurisdictionMeta.display_name} · ${jurisdictionMeta.base_currency}`;

  const sections: WorkspaceSection[] = [
    {
      code: 'AC.01', label: 'Journal Entries',
      actions: !readOnly && (
        <NewJournalEntryButton
          jurisdiction={jurisdiction}
          accounts={accounts}
          taxCodes={taxCodes}
          baseCurrency={settings?.base_currency ?? 'USD'}
          onPosted={() => { void refreshAll(); }}
        />
      ),
      body: <JournalLog entries={entries} jurisdictionMeta={jurisdictionMeta} />,
    },
    {
      code: 'AC.02', label: 'Chart of Accounts',
      actions: !readOnly && (
        <button
          onClick={async () => {
            const n = await initializeChartOfAccounts(jurisdiction);
            toast.success(`Imported ${n} statutory accounts`);
            void refreshAll();
          }}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 ${FOCUS_RING}`}
        >
          Initialize template
        </button>
      ),
      body: <ChartOfAccountsTable accounts={accounts} />,
    },
    {
      code: 'AC.03', label: 'Reports',
      actions: <ReportExports trialBalance={tb} jurisdiction={jurisdiction} />,
      body: <TrialBalanceView rows={tb} />,
    },
    {
      code: 'AC.04', label: 'VAT Center',
      body: <VatCenter taxCodes={taxCodes} />,
    },
    {
      code: 'AC.05', label: 'Multi-currency',
      actions: !readOnly && <FxQuickAdd baseCurrency={settings?.base_currency ?? 'USD'} onSaved={() => { void refreshAll(); }} />,
      body: <FxRatesTable rows={fxRows} />,
    },
    {
      code: 'AC.06', label: 'Settings',
      body: settings && (
        <SettingsPanel
          settings={settings}
          readOnly={readOnly}
          onSaved={(s) => { setSettings(s); setJurisdiction(s.default_jurisdiction); }}
        />
      ),
    },
  ];

  return (
    <WorkspaceShell
      workspaceLabel="Accounting"
      workspaceCode="AC"
      jurisdictionLabel={jurisdictionLabel}
      user={profile ? { email: profile.email, full_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') } : null}
      sections={sections}
      topBarRight={
        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
          className={`bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-xs font-semibold ${INPUT_FOCUS}`}
          aria-label="Jurisdiction"
        >
          {JURISDICTIONS.map(j => (
            <option key={j.code} value={j.code} className="text-slate-900">
              {j.display_name}
            </option>
          ))}
        </select>
      }
    />
  );
}

/* ── AC.01 — Journal log table ───────────────────────────── */

function JournalLog({
  entries,
  jurisdictionMeta,
}: { entries: JournalEntryRow[]; jurisdictionMeta: typeof JURISDICTIONS[number] }) {
  if (entries.length === 0) {
    return <p className="text-slate-500 text-sm">No journal entries posted yet for {jurisdictionMeta.display_name}.</p>;
  }
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">
            <th className="text-left  px-3 py-2">Number</th>
            <th className="text-left  px-3 py-2">Date</th>
            <th className="text-left  px-3 py-2">Description</th>
            <th className="text-left  px-3 py-2">Reference</th>
            <th className="text-left  px-3 py-2">Status</th>
            <th className="text-left  px-3 py-2">Posted</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {entries.map(e => (
            <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-3 py-2 font-mono">{e.entry_number}</td>
              <td className="px-3 py-2">{e.entry_date}</td>
              <td className="px-3 py-2">{e.description}</td>
              <td className="px-3 py-2 text-slate-500">{e.reference || '—'}</td>
              <td className="px-3 py-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  e.status === 'posted'   ? 'bg-emerald-100 text-emerald-700' :
                  e.status === 'draft'    ? 'bg-slate-100 text-slate-600' :
                  e.status === 'reversed' ? 'bg-red-100 text-red-700' :
                                             'bg-amber-100 text-amber-700'
                }`}>{e.status}</span>
              </td>
              <td className="px-3 py-2 text-slate-500 text-xs">
                {e.posted_at ? new Date(e.posted_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── AC.01 — New journal entry button + modal ───────────── */

function NewJournalEntryButton({
  jurisdiction, accounts, taxCodes, baseCurrency, onPosted,
}: {
  jurisdiction: Jurisdiction;
  accounts:     AccountRow[];
  taxCodes:     TaxCodeRow[];
  baseCurrency: string;
  onPosted:     () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#0B2E59] hover:bg-[#0F3558] text-white ${FOCUS_RING}`}
      >
        <Plus className="w-3.5 h-3.5" /> New entry
      </button>
      {open && (
        <NewJournalEntryModal
          jurisdiction={jurisdiction}
          accounts={accounts}
          taxCodes={taxCodes}
          baseCurrency={baseCurrency}
          onClose={() => setOpen(false)}
          onPosted={() => { setOpen(false); onPosted(); }}
        />
      )}
    </>
  );
}

interface DraftLine {
  accountId:   string;
  side:        'debit' | 'credit';
  amount:      string;
  currency:    string;
  fxRate:      string;
  taxCodeId:   string;
  description: string;
}

const EMPTY_LINE = (defaultCurrency: string): DraftLine => ({
  accountId: '', side: 'debit', amount: '', currency: defaultCurrency,
  fxRate: '1', taxCodeId: '', description: '',
});

function NewJournalEntryModal({
  jurisdiction, accounts, taxCodes, baseCurrency, onClose, onPosted,
}: {
  jurisdiction: Jurisdiction;
  accounts:     AccountRow[];
  taxCodes:     TaxCodeRow[];
  baseCurrency: string;
  onClose:      () => void;
  onPosted:     () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [entryNumber, setEntryNumber] = useState('');
  const [entryDate,   setEntryDate]   = useState(today);
  const [description, setDescription] = useState('');
  const [reference,   setReference]   = useState('');
  const [lines, setLines] = useState<DraftLine[]>([
    EMPTY_LINE(baseCurrency), EMPTY_LINE(baseCurrency),
  ]);
  const [busy, setBusy] = useState(false);

  function patchLine(i: number, patch: Partial<DraftLine>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  const totals = useMemo(() => {
    let dr = 0, cr = 0;
    for (const l of lines) {
      const amt = (Number(l.amount) || 0) * (Number(l.fxRate) || 1);
      if (l.side === 'debit') dr += amt; else cr += amt;
    }
    return { dr, cr, balanced: Math.abs(dr - cr) < 0.01 && dr > 0 };
  }, [lines]);

  async function submit() {
    if (!entryNumber.trim() || !description.trim()) {
      toast.error('Entry number + description required'); return;
    }
    if (!totals.balanced) {
      toast.error('Entry not balanced', { description: 'Σ debits must equal Σ credits in base currency.' });
      return;
    }
    if (lines.some(l => !l.accountId || !l.amount)) {
      toast.error('Every line needs an account and an amount'); return;
    }
    setBusy(true);
    try {
      const payload: PostJournalLineInput[] = lines.map(l => ({
        account_id:    l.accountId,
        side:          l.side,
        amount:        Number(l.amount),
        currency:      l.currency,
        exchange_rate: Number(l.fxRate) || 1,
        base_currency: baseCurrency,
        tax_code_id:   l.taxCodeId || null,
        description:   l.description || null,
      }));
      await postJournalEntry({
        jurisdiction, entry_number: entryNumber, entry_date: entryDate,
        description, reference: reference || null, lines: payload,
      });
      toast.success(`Entry ${entryNumber} posted`);
      onPosted();
    } catch (e) {
      toast.error('Post failed', { description: e instanceof Error ? e.message : '' });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-700">AC.01 · New entry</p>
            <h2 className="font-extrabold text-lg">Post journal entry</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 px-2">✕</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Entry number *" value={entryNumber} onChange={setEntryNumber} />
            <Field label="Date *" type="date" value={entryDate} onChange={setEntryDate} />
            <Field label="Reference" value={reference} onChange={setReference} className="sm:col-span-2" />
            <Field label="Description *" value={description} onChange={setDescription} className="sm:col-span-4" />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left  px-2 py-2">Account</th>
                  <th className="text-left  px-2 py-2">Side</th>
                  <th className="text-right px-2 py-2">Amount</th>
                  <th className="text-left  px-2 py-2">Ccy</th>
                  <th className="text-right px-2 py-2">FX → {baseCurrency}</th>
                  <th className="text-left  px-2 py-2">Tax</th>
                  <th className="text-left  px-2 py-2">Memo</th>
                  <th />
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {lines.map((l, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-2 py-1">
                      <select value={l.accountId} onChange={e => patchLine(i, { accountId: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs">
                        <option value="">— select —</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.code} · {a.display_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select value={l.side} onChange={e => patchLine(i, { side: e.target.value as 'debit' | 'credit' })}
                              className="px-2 py-1 border border-slate-200 rounded text-xs">
                        <option value="debit">DR</option><option value="credit">CR</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input type="number" step="0.01" value={l.amount} onChange={e => patchLine(i, { amount: e.target.value })}
                             className="w-24 px-2 py-1 border border-slate-200 rounded text-xs text-right" />
                    </td>
                    <td className="px-2 py-1">
                      <input value={l.currency} onChange={e => patchLine(i, { currency: e.target.value.toUpperCase() })}
                             className="w-14 px-2 py-1 border border-slate-200 rounded text-xs uppercase" />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input type="number" step="0.0001" value={l.fxRate} onChange={e => patchLine(i, { fxRate: e.target.value })}
                             className="w-20 px-2 py-1 border border-slate-200 rounded text-xs text-right" />
                    </td>
                    <td className="px-2 py-1">
                      <select value={l.taxCodeId} onChange={e => patchLine(i, { taxCodeId: e.target.value })}
                              className="px-2 py-1 border border-slate-200 rounded text-xs">
                        <option value="">—</option>
                        {taxCodes.map(t => (
                          <option key={t.id} value={t.id}>{t.code}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input value={l.description} onChange={e => patchLine(i, { description: e.target.value })}
                             className="w-full px-2 py-1 border border-slate-200 rounded text-xs" />
                    </td>
                    <td className="px-2 py-1 text-right">
                      {lines.length > 2 && (
                        <button onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-red-600 text-xs">×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                  <td className="px-2 py-2 text-xs" colSpan={2}>Totals (in {baseCurrency})</td>
                  <td className="px-2 py-2 text-right tabular-nums">DR {totals.dr.toFixed(2)}</td>
                  <td colSpan={2} className="px-2 py-2 text-right tabular-nums">CR {totals.cr.toFixed(2)}</td>
                  <td colSpan={3} className={`px-2 py-2 text-xs ${totals.balanced ? 'text-emerald-700' : 'text-red-600'}`}>
                    {totals.balanced ? 'Balanced ✓' : `Δ ${(totals.dr - totals.cr).toFixed(2)}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button onClick={() => setLines(prev => [...prev, EMPTY_LINE(baseCurrency)])}
                  className="text-xs text-[#0B2E59] font-bold hover:underline">
            + Add line
          </button>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={submit} disabled={busy || !totals.balanced}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Post entry
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', className = '',
}: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1 font-mono">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
             className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm ${INPUT_FOCUS}`} />
    </label>
  );
}

/* ── AC.02 — CoA table ─────────────────────────────────── */

function ChartOfAccountsTable({ accounts }: { accounts: AccountRow[] }) {
  if (accounts.length === 0) {
    return <p className="text-slate-500 text-sm">No accounts yet — click <strong>Initialize template</strong> to load the statutory chart for this jurisdiction.</p>;
  }
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Code</th>
            <th className="text-left  px-3 py-2">Name</th>
            <th className="text-left  px-3 py-2">Type</th>
            <th className="text-left  px-3 py-2">Statutory</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(a => (
            <tr key={a.id} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-mono">{a.code}</td>
              <td className="px-3 py-1.5">{a.display_name}</td>
              <td className="px-3 py-1.5 capitalize text-slate-500">{a.account_type}</td>
              <td className="px-3 py-1.5">{a.is_statutory ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── AC.03 — Trial balance ────────────────────────────── */

function TrialBalanceView({ rows }: { rows: TrialBalanceRow[] }) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm">No posted entries yet — the trial balance will populate as journals are posted.</p>;
  }
  const totals = rows.reduce((acc, r) => {
    acc.dr += Number(r.total_debit  ?? 0);
    acc.cr += Number(r.total_credit ?? 0);
    return acc;
  }, { dr: 0, cr: 0 });

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Code</th>
            <th className="text-left  px-3 py-2">Account</th>
            <th className="text-left  px-3 py-2">Type</th>
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
              <td className="px-3 py-1.5 text-right">{Number(r.total_debit  ?? 0).toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right">{Number(r.total_credit ?? 0).toFixed(2)}</td>
              <td className="px-3 py-1.5 text-right font-bold">{Number(r.net_balance ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 border-t border-slate-200 font-bold">
            <td colSpan={3} className="px-3 py-2 text-xs">TOTALS</td>
            <td className="px-3 py-2 text-right">{totals.dr.toFixed(2)}</td>
            <td className="px-3 py-2 text-right">{totals.cr.toFixed(2)}</td>
            <td className="px-3 py-2 text-right">
              <span className={Math.abs(totals.dr - totals.cr) < 0.01 ? 'text-emerald-700' : 'text-red-600'}>
                {Math.abs(totals.dr - totals.cr) < 0.01 ? 'Balanced ✓' : (totals.dr - totals.cr).toFixed(2)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ReportExports({ trialBalance, jurisdiction }: { trialBalance: TrialBalanceRow[]; jurisdiction: Jurisdiction }) {
  const filename = `flyttgo-trial-balance-${jurisdiction}-${new Date().toISOString().slice(0, 10)}`;
  const cols = [
    { header: 'Code',       value: (r: TrialBalanceRow) => r.account_code },
    { header: 'Account',    value: (r: TrialBalanceRow) => r.display_name },
    { header: 'Type',       value: (r: TrialBalanceRow) => r.account_type },
    { header: 'Debit',      value: (r: TrialBalanceRow) => r.total_debit,  numeric: true },
    { header: 'Credit',     value: (r: TrialBalanceRow) => r.total_credit, numeric: true },
    { header: 'Net',        value: (r: TrialBalanceRow) => r.net_balance,  numeric: true },
  ];
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => exportCsv(filename, trialBalance, cols)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white">
        <FileDown className="w-3 h-3" /> CSV
      </button>
      <button onClick={() => exportWord(filename, `Trial Balance · ${jurisdiction}`, trialBalance, cols)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white">
        <FileDown className="w-3 h-3" /> Word
      </button>
      <button onClick={() => exportPdf()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white">
        <FileDown className="w-3 h-3" /> PDF
      </button>
    </div>
  );
}

/* ── AC.04 — VAT center ──────────────────────────────── */

function VatCenter({ taxCodes }: { taxCodes: TaxCodeRow[] }) {
  if (taxCodes.length === 0) return <p className="text-slate-500 text-sm">No tax codes for this jurisdiction.</p>;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left px-3 py-2">Code</th>
            <th className="text-left px-3 py-2">Name</th>
            <th className="text-left px-3 py-2">Category</th>
          </tr>
        </thead>
        <tbody>
          {taxCodes.map(t => (
            <tr key={t.id} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-mono">{t.code}</td>
              <td className="px-3 py-1.5">{t.display_name}</td>
              <td className="px-3 py-1.5 text-slate-500">{t.category.replace('_', ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── AC.05 — FX ──────────────────────────────────────── */

function FxRatesTable({ rows }: { rows: ExchangeRateRow[] }) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm">No exchange rates recorded.</p>;
  }
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">From</th>
            <th className="text-left  px-3 py-2">To</th>
            <th className="text-right px-3 py-2">Rate</th>
            <th className="text-left  px-3 py-2">Effective</th>
            <th className="text-left  px-3 py-2">Source</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map(r => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-mono">{r.from_currency}</td>
              <td className="px-3 py-1.5 font-mono">{r.to_currency}</td>
              <td className="px-3 py-1.5 text-right">{Number(r.rate).toFixed(4)}</td>
              <td className="px-3 py-1.5">{r.effective_date}</td>
              <td className="px-3 py-1.5 text-slate-500">{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FxQuickAdd({ baseCurrency, onSaved }: { baseCurrency: string; onSaved: () => void }) {
  const [from, setFrom] = useState('NOK');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!from.trim() || !rate.trim()) return;
    setBusy(true);
    try {
      await recordExchangeRate(from.toUpperCase(), baseCurrency, Number(rate), date);
      toast.success('FX rate saved');
      setRate('');
      onSaved();
    } catch (e) {
      toast.error('Save failed', { description: e instanceof Error ? e.message : '' });
    } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center gap-2">
      <input value={from} onChange={e => setFrom(e.target.value.toUpperCase())} placeholder="From"
             className="w-16 px-2 py-1 rounded border border-slate-200 text-xs uppercase" />
      <span className="text-slate-400 text-xs">→ {baseCurrency}</span>
      <input type="number" step="0.0001" value={rate} onChange={e => setRate(e.target.value)} placeholder="Rate"
             className="w-24 px-2 py-1 rounded border border-slate-200 text-xs text-right" />
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
             className="px-2 py-1 rounded border border-slate-200 text-xs" />
      <button onClick={save} disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        Save
      </button>
    </div>
  );
}

/* ── AC.06 — Settings panel ──────────────────────────── */

function SettingsPanel({
  settings, readOnly, onSaved,
}: { settings: AccountingSettingsRow; readOnly: boolean; onSaved: (s: AccountingSettingsRow) => void }) {
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy]   = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  async function save() {
    setBusy(true);
    try {
      await updateAccountingSettings({
        default_jurisdiction:    draft.default_jurisdiction,
        base_currency:           draft.base_currency,
        fiscal_year_start_month: draft.fiscal_year_start_month,
        vat_reporting_period:    draft.vat_reporting_period,
      });
      toast.success('Settings saved');
      onSaved(draft);
    } catch (e) {
      toast.error('Save failed', { description: e instanceof Error ? e.message : '' });
    } finally { setBusy(false); }
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
      <Field label="Default jurisdiction" value={draft.default_jurisdiction}
             onChange={(v) => setDraft({ ...draft, default_jurisdiction: v as Jurisdiction })} />
      <Field label="Base currency" value={draft.base_currency}
             onChange={(v) => setDraft({ ...draft, base_currency: v.toUpperCase() })} />
      <Field label="Fiscal year start month (1–12)" type="number" value={String(draft.fiscal_year_start_month)}
             onChange={(v) => setDraft({ ...draft, fiscal_year_start_month: Math.max(1, Math.min(12, Number(v) || 1)) })} />
      <Field label="VAT reporting period" value={draft.vat_reporting_period}
             onChange={(v) => setDraft({ ...draft, vat_reporting_period: (v as AccountingSettingsRow['vat_reporting_period']) })} />
      <div className="sm:col-span-2">
        <button onClick={save} disabled={!dirty || busy || readOnly}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <SettingsIcon className="w-4 h-4" />}
          Save settings
        </button>
      </div>
    </div>
  );
}
