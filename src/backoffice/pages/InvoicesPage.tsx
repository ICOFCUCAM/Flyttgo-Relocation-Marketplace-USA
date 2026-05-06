import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import {
  listInvoices, generateInvoice, setInvoiceStatus,
  type InvoiceStatus, type BosInvoice,
} from '../services/invoices-service';
import { getAccountingConfig } from '../services/accounting-service';
import { useBackofficeAuth } from '../rbac/useBackofficeAuth';
import { PERMISSIONS } from '../rbac/permissions';

const STATUS_TONE: Record<InvoiceStatus, string> = {
  draft:  'bg-slate-100 text-slate-700',
  issued: 'bg-amber-50 text-amber-800',
  paid:   'bg-emerald-50 text-emerald-700',
  void:   'bg-rose-50 text-rose-700',
};

export default function InvoicesPage() {
  const auth = useBackofficeAuth();
  const qc = useQueryClient();
  const canGenerate = auth.hasPermission(PERMISSIONS.INVOICES_GENERATE);

  const [open, setOpen] = useState(false);

  const invoices = useQuery({ queryKey: ['bos', 'invoices', 'all'], queryFn: () => listInvoices({ limit: 200 }) });
  const config   = useQuery({ queryKey: ['bos', 'accounting', 'config'], queryFn: () => getAccountingConfig() });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">Invoicing</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Invoices</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Issued invoices carry an explicit accounting-system tag so US-GAAP and EU-VAT reports filter correctly.
        </p>
      </header>

      <div className="flex justify-end">
        {canGenerate && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-md text-sm font-bold"
          >
            <Receipt size={14} /> Generate invoice
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 font-bold">Invoice #</th>
              <th className="text-left px-5 py-3 font-bold">Issued</th>
              <th className="text-left px-5 py-3 font-bold">System</th>
              <th className="text-right px-5 py-3 font-bold">Amount</th>
              <th className="text-right px-5 py-3 font-bold">Tax</th>
              <th className="text-left px-5 py-3 font-bold">Status</th>
              <th className="text-right px-5 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(invoices.data ?? []).map(inv => (
              <InvoiceRow key={inv.id} inv={inv} canGenerate={canGenerate} onChanged={async () => { await qc.invalidateQueries({ queryKey: ['bos', 'invoices'] }); }} />
            ))}
            {(invoices.data ?? []).length === 0 && !invoices.isLoading && (
              <tr><td colSpan={7} className="text-center text-sm text-slate-500 py-8">No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && config.data && (
        <GenerateInvoiceDialog
          accountingSystem={config.data.active_system}
          onClose={() => setOpen(false)}
          onCreated={async () => { setOpen(false); await qc.invalidateQueries({ queryKey: ['bos', 'invoices'] }); }}
        />
      )}
    </div>
  );
}

function InvoiceRow({ inv, canGenerate, onChanged }: { inv: BosInvoice; canGenerate: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  async function mark(status: InvoiceStatus) {
    setBusy(true);
    try { await setInvoiceStatus({ id: inv.id, status }); onChanged(); } catch { /* ignore */ }
    setBusy(false);
  }
  return (
    <tr>
      <td className="px-5 py-2 font-mono text-xs font-bold">{inv.invoice_number}</td>
      <td className="px-5 py-2 text-xs text-slate-500">{new Date(inv.issued_at).toLocaleDateString()}</td>
      <td className="px-5 py-2 text-xs">{inv.accounting_system.toUpperCase()}</td>
      <td className="px-5 py-2 text-right tabular-nums font-bold">{Number(inv.amount).toFixed(2)} {inv.currency}</td>
      <td className="px-5 py-2 text-right tabular-nums">{Number(inv.tax ?? 0).toFixed(2)}</td>
      <td className="px-5 py-2">
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${STATUS_TONE[inv.status]}`}>{inv.status}</span>
      </td>
      <td className="px-5 py-2 text-right">
        {canGenerate && inv.status === 'issued' && (
          <button onClick={() => mark('paid')} disabled={busy} className="px-2 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50">
            Mark paid
          </button>
        )}
      </td>
    </tr>
  );
}

function GenerateInvoiceDialog({
  accountingSystem, onClose, onCreated,
}: { accountingSystem: string; onClose: () => void; onCreated: () => void }) {
  const [amount, setAmount]     = useState('');
  const [tax, setTax]           = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bookingId, setBookingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true); setError('');
    try {
      await generateInvoice({
        amount:           Number(amount),
        tax:              Number(tax || 0),
        currency,
        accountingSystem,
        bookingId:        bookingId.trim() || undefined,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-extrabold mb-1 tracking-tight">Generate invoice</h2>
        <p className="text-xs text-slate-500 mb-4">Active accounting system: <strong>{accountingSystem.toUpperCase()}</strong></p>
        <div className="space-y-3 text-sm">
          <Field label="Amount">
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2" />
          </Field>
          <Field label="Tax">
            <input type="number" step="0.01" value={tax} onChange={e => setTax(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2" />
          </Field>
          <Field label="Currency">
            <input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} maxLength={3} className="w-full border border-slate-200 rounded-md px-3 py-2 uppercase" />
          </Field>
          <Field label="Booking id (optional)">
            <input value={bookingId} onChange={e => setBookingId(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 font-mono text-xs" />
          </Field>
          {error && <p className="text-rose-600 text-xs">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-md">Cancel</button>
          <button onClick={submit} disabled={busy || !amount} className="px-4 py-2 text-sm bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-md font-bold disabled:opacity-50">
            {busy ? 'Issuing…' : 'Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
