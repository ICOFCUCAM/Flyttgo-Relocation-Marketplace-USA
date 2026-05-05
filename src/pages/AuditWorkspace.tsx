import { useEffect, useState } from 'react';
import { Loader2, FileDown, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { useApp } from '../lib/store';
import { INPUT_FOCUS, FOCUS_RING } from '../components/ds';

import WorkspaceShell, { type WorkspaceSection } from '../accounting/components/WorkspaceShell';
import StepUpAuthGate from '../accounting/components/StepUpAuthGate';
import {
  getMyFinanceRoles,
  getAccountingSettings,
  fetchTrialBalance, fetchGeneralLedger,
  listJournalEntries,
  listAnnotations, addAnnotation,
  listAttachments, getAttachmentSignedUrl,
} from '../accounting/service';
import { exportCsv, exportWord, exportPdf } from '../accounting/exports';
import { JURISDICTIONS } from '../accounting/templates';
import type {
  AuditAnnotationRow, GeneralLedgerRow,
  Jurisdiction, JournalEntryRow, TrialBalanceRow,
} from '../accounting/types';

/**
 * /audit — read-only auditor workspace (Phase 11).
 *
 *   AU.01  Posted Journal Entries
 *   AU.02  General Ledger
 *   AU.03  Trial Balance + Statutory exports
 *   AU.04  Attachments register
 *   AU.05  Annotations
 *
 * Auditors cannot edit, delete, or post entries. The only mutation
 * they can perform is INSERT on `audit_annotations` — comments tied
 * to a specific journal entry, used for audit findings. RLS enforces
 * the read-only contract server-side.
 */
export default function AuditWorkspace() {
  const { user, profile, loading: authLoading } = useAuth();
  const { setPage } = useApp();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isAuditor, setIsAuditor] = useState(false);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) { setAllowed(false); return undefined; }
    let cancelled = false;
    void getMyFinanceRoles(user.id).then(roles => {
      if (cancelled) return;
      setAllowed(roles.length > 0);
      setIsAuditor(roles.includes('auditor'));
    }).catch(() => { if (!cancelled) setAllowed(false); });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  /* Auditor lands on the default jurisdiction from accounting_settings.
   * Settings row itself is read-only here — the auditor can switch
   * jurisdictions via the top-bar dropdown without persisting. */
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('NO');

  useEffect(() => {
    if (!allowed) return undefined;
    void getAccountingSettings().then(s => {
      if (s) setJurisdiction(s.default_jurisdiction);
    });
    return undefined;
  }, [allowed]);

  const jurisdictionMeta = JURISDICTIONS.find(j => j.code === jurisdiction)!;

  const [entries, setEntries] = useState<JournalEntryRow[]>([]);
  const [tb,      setTb]      = useState<TrialBalanceRow[]>([]);
  const [gl,      setGl]      = useState<GeneralLedgerRow[]>([]);

  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const [es, t, g] = await Promise.all([
          listJournalEntries(jurisdiction, { limit: 100, status: 'posted' }),
          fetchTrialBalance(jurisdiction),
          fetchGeneralLedger(jurisdiction),
        ]);
        if (cancelled) return;
        setEntries(es); setTb(t); setGl(g);
      } catch (e) {
        if (!cancelled) toast.error('Audit data fetch failed', { description: e instanceof Error ? e.message : '' });
      }
    })();
    return () => { cancelled = true; };
  }, [allowed, jurisdiction]);

  if (allowed === null || authLoading) {
    return <main className="min-h-screen flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></main>;
  }
  if (!allowed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-xl font-extrabold mb-2">Not authorised</h1>
          <p className="text-sm text-slate-500 mb-5">
            The audit workspace is restricted to auditors, finance viewers, and admins.
          </p>
          <button onClick={() => setPage('home')} className="px-5 py-2.5 bg-[#0B2E59] text-white rounded-xl text-sm font-bold">
            Back to FlyttGo
          </button>
        </div>
      </main>
    );
  }

  const sections: WorkspaceSection[] = [
    {
      code: 'AU.01', label: 'Posted Journal Entries',
      body: <JournalEntriesAuditView entries={entries} canAnnotate={isAuditor} />,
    },
    {
      code: 'AU.02', label: 'General Ledger',
      actions: <LedgerExports rows={gl} jurisdiction={jurisdiction} />,
      body: <GeneralLedgerView rows={gl} />,
    },
    {
      code: 'AU.03', label: 'Trial Balance',
      actions: <TrialBalanceExports rows={tb} jurisdiction={jurisdiction} />,
      body: <TrialBalanceView rows={tb} />,
    },
    {
      code: 'AU.04', label: 'Attachments register',
      body: <AttachmentsRegister entries={entries} />,
    },
  ];

  return (
    <StepUpAuthGate workspace="audit" workspaceLabel="Audit">
    <WorkspaceShell
      workspaceLabel="Audit"
      workspaceCode="AU"
      jurisdictionLabel={`${jurisdictionMeta.display_name} · ${jurisdictionMeta.base_currency}`}
      user={profile ? { email: profile.email, full_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') } : null}
      sections={sections}
      topBarRight={
        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
          className={`bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-xs font-semibold ${INPUT_FOCUS}`}
          aria-label="Jurisdiction"
        >
          {JURISDICTIONS.map(j => <option key={j.code} value={j.code} className="text-slate-900">{j.display_name}</option>)}
        </select>
      }
    />
    </StepUpAuthGate>
  );
}

/* ── AU.01 ─────────────────────────────────────────── */

function JournalEntriesAuditView({
  entries, canAnnotate,
}: { entries: JournalEntryRow[]; canAnnotate: boolean }) {
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  if (entries.length === 0) {
    return <p className="text-slate-500 text-sm">No posted entries.</p>;
  }
  return (
    <>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
            <tr>
              <th className="text-left px-3 py-2">Number</th>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-left px-3 py-2">Reference</th>
              <th className="text-left px-3 py-2">Posted</th>
              <th />
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {entries.map(e => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-3 py-1.5 font-mono">{e.entry_number}</td>
                <td className="px-3 py-1.5">{e.entry_date}</td>
                <td className="px-3 py-1.5">{e.description}</td>
                <td className="px-3 py-1.5 text-slate-500">{e.reference || '—'}</td>
                <td className="px-3 py-1.5 text-slate-500 text-xs">
                  {e.posted_at ? new Date(e.posted_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-1.5">
                  <button onClick={() => setOpenEntryId(e.id)} className="text-xs text-[#0B2E59] hover:underline font-bold">
                    Inspect →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openEntryId && (
        <EntryInspectorModal
          entryId={openEntryId}
          canAnnotate={canAnnotate}
          onClose={() => setOpenEntryId(null)}
        />
      )}
    </>
  );
}

function EntryInspectorModal({
  entryId, canAnnotate, onClose,
}: { entryId: string; canAnnotate: boolean; onClose: () => void }) {
  const [annotations, setAnnotations] = useState<AuditAnnotationRow[]>([]);
  const [comment, setComment] = useState('');
  const [severity, setSeverity] = useState<AuditAnnotationRow['severity']>('info');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setAnnotations(await listAnnotations(entryId));
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entryId]);

  async function submit() {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await addAnnotation(entryId, comment, severity);
      setComment('');
      toast.success('Annotation added');
      void refresh();
    } catch (e) {
      toast.error('Failed', { description: e instanceof Error ? e.message : '' });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-700">AU.01 · Inspector</p>
            <h2 className="font-extrabold text-lg">Audit annotations</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 px-2">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {annotations.length === 0 ? (
            <p className="text-slate-500 text-sm">No annotations on this entry yet.</p>
          ) : (
            <ul className="space-y-2">
              {annotations.map(a => (
                <li key={a.id} className={`rounded-lg p-3 text-sm border ${
                  a.severity === 'finding' ? 'bg-red-50 border-red-200' :
                  a.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                  a.severity === 'question' ? 'bg-blue-50 border-blue-200' :
                                               'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-slate-500">{a.severity}</span>
                    <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{a.comment}</p>
                </li>
              ))}
            </ul>
          )}

          {canAnnotate ? (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-mono">Add annotation</p>
              <select value={severity} onChange={e => setSeverity(e.target.value as AuditAnnotationRow['severity'])}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                <option value="info">Info</option>
                <option value="question">Question</option>
                <option value="warning">Warning</option>
                <option value="finding">Finding</option>
              </select>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
                        placeholder="Audit note…"
                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm ${INPUT_FOCUS}`} />
              <button onClick={submit} disabled={busy || !comment.trim()}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60 ${FOCUS_RING}`}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquarePlus className="w-4 h-4" />}
                Add note
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 border-t border-slate-200 pt-4">
              You can read annotations but only auditors can add them.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── AU.02 — General ledger ────────────────────────── */

function GeneralLedgerView({ rows }: { rows: GeneralLedgerRow[] }) {
  if (rows.length === 0) return <p className="text-slate-500 text-sm">No ledger lines.</p>;
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Date</th>
            <th className="text-left  px-3 py-2">Entry</th>
            <th className="text-left  px-3 py-2">Account</th>
            <th className="text-left  px-3 py-2">Memo</th>
            <th className="text-right px-3 py-2">Debit</th>
            <th className="text-right px-3 py-2">Credit</th>
            <th className="text-right px-3 py-2">Base</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r, i) => (
            <tr key={`${r.entry_id}-${r.line_number}-${i}`} className="border-t border-slate-100">
              <td className="px-3 py-1 font-mono">{r.entry_date}</td>
              <td className="px-3 py-1 font-mono">{r.entry_number}</td>
              <td className="px-3 py-1">{r.account_code} · {r.account_name}</td>
              <td className="px-3 py-1 text-slate-500 truncate max-w-[200px]">{r.line_description ?? r.entry_description}</td>
              <td className="px-3 py-1 text-right">{r.side === 'debit'  ? Number(r.amount).toFixed(2) : ''}</td>
              <td className="px-3 py-1 text-right">{r.side === 'credit' ? Number(r.amount).toFixed(2) : ''}</td>
              <td className="px-3 py-1 text-right text-slate-500">{Number(r.amount_base_currency).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerExports({ rows, jurisdiction }: { rows: GeneralLedgerRow[]; jurisdiction: Jurisdiction }) {
  const filename = `flyttgo-general-ledger-${jurisdiction}-${new Date().toISOString().slice(0, 10)}`;
  const cols = [
    { header: 'Date',     value: (r: GeneralLedgerRow) => r.entry_date },
    { header: 'Entry',    value: (r: GeneralLedgerRow) => r.entry_number },
    { header: 'Account',  value: (r: GeneralLedgerRow) => `${r.account_code} ${r.account_name}` },
    { header: 'Side',     value: (r: GeneralLedgerRow) => r.side },
    { header: 'Amount',   value: (r: GeneralLedgerRow) => r.amount,       numeric: true },
    { header: 'Currency', value: (r: GeneralLedgerRow) => r.currency },
    { header: 'Base',     value: (r: GeneralLedgerRow) => r.amount_base_currency, numeric: true },
    { header: 'Memo',     value: (r: GeneralLedgerRow) => r.line_description ?? r.entry_description },
  ];
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => exportCsv(filename, rows, cols)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white">
        <FileDown className="w-3 h-3" /> CSV
      </button>
      <button onClick={() => exportWord(filename, `General Ledger · ${jurisdiction}`, rows, cols)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white">
        <FileDown className="w-3 h-3" /> Word
      </button>
      <button onClick={exportPdf} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white">
        <FileDown className="w-3 h-3" /> PDF
      </button>
    </div>
  );
}

/* ── AU.03 — Trial balance ─────────────────────────── */

function TrialBalanceView({ rows }: { rows: TrialBalanceRow[] }) {
  if (rows.length === 0) return <p className="text-slate-500 text-sm">No trial balance yet.</p>;
  const totals = rows.reduce((a, r) => {
    a.dr += Number(r.total_debit  ?? 0);
    a.cr += Number(r.total_credit ?? 0);
    return a;
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

function TrialBalanceExports({ rows, jurisdiction }: { rows: TrialBalanceRow[]; jurisdiction: Jurisdiction }) {
  const filename = `flyttgo-trial-balance-${jurisdiction}-${new Date().toISOString().slice(0, 10)}`;
  const cols = [
    { header: 'Code',    value: (r: TrialBalanceRow) => r.account_code },
    { header: 'Account', value: (r: TrialBalanceRow) => r.display_name },
    { header: 'Type',    value: (r: TrialBalanceRow) => r.account_type },
    { header: 'Debit',   value: (r: TrialBalanceRow) => r.total_debit,  numeric: true },
    { header: 'Credit',  value: (r: TrialBalanceRow) => r.total_credit, numeric: true },
    { header: 'Net',     value: (r: TrialBalanceRow) => r.net_balance,  numeric: true },
  ];
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => exportCsv(filename, rows, cols)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white">
        <FileDown className="w-3 h-3" /> CSV
      </button>
      <button onClick={() => exportWord(filename, `Trial Balance · ${jurisdiction}`, rows, cols)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white">
        <FileDown className="w-3 h-3" /> Word
      </button>
      <button onClick={exportPdf} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white">
        <FileDown className="w-3 h-3" /> PDF
      </button>
    </div>
  );
}

/* ── AU.04 — Attachments register ─────────────────── */

function AttachmentsRegister({ entries }: { entries: JournalEntryRow[] }) {
  const [rows, setRows] = useState<{
    entry_number: string;
    entry_date:   string;
    filename:     string;
    storage_path: string;
    size_bytes:   number;
  }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const collected: typeof rows = [];
      for (const e of entries.slice(0, 50)) {
        const att = await listAttachments(e.id);
        att.forEach(a => collected.push({
          entry_number: e.entry_number,
          entry_date:   e.entry_date,
          filename:     a.filename,
          storage_path: a.storage_path,
          size_bytes:   a.size_bytes,
        }));
      }
      if (!cancelled) { setRows(collected); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [entries]);

  if (loading) return <p className="text-slate-500 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading register…</p>;
  if (rows.length === 0) return <p className="text-slate-500 text-sm">No attachments registered.</p>;

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
          <tr>
            <th className="text-left  px-3 py-2">Entry</th>
            <th className="text-left  px-3 py-2">Date</th>
            <th className="text-left  px-3 py-2">File</th>
            <th className="text-right px-3 py-2">Size</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.entry_number}-${i}`} className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-mono">{r.entry_number}</td>
              <td className="px-3 py-1.5">{r.entry_date}</td>
              <td className="px-3 py-1.5">{r.filename}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{(r.size_bytes / 1024).toFixed(0)} KB</td>
              <td className="px-3 py-1.5 text-right">
                <button onClick={async () => {
                  const url = await getAttachmentSignedUrl(r.storage_path);
                  if (url) window.open(url, '_blank');
                }} className="text-xs text-[#0B2E59] hover:underline font-bold">
                  Open →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
