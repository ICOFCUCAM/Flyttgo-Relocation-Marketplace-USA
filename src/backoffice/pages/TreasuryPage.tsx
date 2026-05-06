import { useEffect, useState } from 'react';
import { Loader2, Wallet, ShieldCheck, AlertOctagon, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchWalletBalances, fetchTreasurySummary, listProviderPayouts,
  markPayoutStatus, checkPayoutEligibility,
} from '../../accounting/service';
import type {
  ProviderPayoutScheduleRow, TreasurySummaryRow, WalletBalanceRow,
} from '../../accounting/types';

/**
 * /backoffice/treasury — operator's view of the platform's
 * financial reservoirs.
 *
 *   • Headline KPIs from v_treasury_summary
 *   • Provider wallets table with KYC badges + payout-eligibility
 *     verdict from fn_check_payout_eligibility
 *   • Escrow wallets table per booking
 *   • Pending payouts queue with one-click "mark paid" / "mark failed"
 */
export default function TreasuryPage() {
  const [summary,    setSummary]    = useState<TreasurySummaryRow[]>([]);
  const [providers,  setProviders]  = useState<WalletBalanceRow[]>([]);
  const [escrows,    setEscrows]    = useState<WalletBalanceRow[]>([]);
  const [payouts,    setPayouts]    = useState<ProviderPayoutScheduleRow[]>([]);
  const [eligibility,setEligibility]= useState<Record<string, string | null>>({});
  const [loading,    setLoading]    = useState(true);

  async function refresh() {
    try {
      const [s, p, e, q] = await Promise.all([
        fetchTreasurySummary(),
        fetchWalletBalances({ walletType: 'provider' }),
        fetchWalletBalances({ walletType: 'escrow', limit: 50 }),
        listProviderPayouts('all'),
      ]);
      setSummary(s); setProviders(p); setEscrows(e); setPayouts(q);

      /* Eligibility verdicts for the providers visible on screen. */
      const checks = await Promise.all(
        p.slice(0, 30).map(async w => [w.owner_user_id ?? '', await checkPayoutEligibility(w.owner_user_id ?? '')] as const),
      );
      setEligibility(Object.fromEntries(checks));
    } catch (err) {
      toast.error('Treasury load failed', { description: err instanceof Error ? err.message : '' });
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading treasury…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-amber-700 text-[11px] uppercase tracking-[0.22em] font-mono mb-1">BOS · Treasury</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Platform treasury</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Live wallet balances, escrow held, KYC eligibility, and the pending-payout queue. Every figure here is computed
          from the immutable journal — no shadow ledger.
        </p>
      </header>

      <SummaryStrip rows={summary} />
      <ProviderWalletsTable rows={providers} eligibility={eligibility} />
      <EscrowWalletsTable rows={escrows} />
      <PendingPayoutsQueue rows={payouts} onChanged={() => void refresh()} />
    </div>
  );
}

/* ── Summary KPIs ────────────────────────────────────── */

function SummaryStrip({ rows }: { rows: TreasurySummaryRow[] }) {
  const find = (t: TreasurySummaryRow['wallet_type']) =>
    rows.filter(r => r.wallet_type === t).reduce((s, r) => s + Number(r.balance_total ?? 0), 0);
  const escrow   = find('escrow');
  const provider = find('provider');
  const treasury = find('treasury');
  const pending  = find('pending_payouts');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi label="Escrow held"        value={escrow}   icon={<Wallet className="w-4 h-4 text-amber-600" />} />
      <Kpi label="Provider balances"  value={provider} icon={<Wallet className="w-4 h-4 text-emerald-600" />} />
      <Kpi label="Platform treasury"  value={treasury} icon={<Wallet className="w-4 h-4 text-blue-600" />} />
      <Kpi label="Pending payouts"    value={pending}  icon={<Send   className="w-4 h-4 text-slate-600" />} />
    </div>
  );
}
function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-mono mb-2">{icon}{label}</div>
      <div className="text-2xl font-extrabold tabular-nums">{Math.round(value).toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">USD-equivalent</div>
    </div>
  );
}

/* ── Provider wallets table ────────────────────────── */

const KYC_TONE: Record<string, string> = {
  approved:     'bg-emerald-100 text-emerald-700',
  submitted:    'bg-amber-100   text-amber-700',
  pending:      'bg-slate-100   text-slate-600',
  rejected:     'bg-red-100     text-red-700',
  not_required: 'bg-slate-100   text-slate-500',
};

function ProviderWalletsTable({
  rows, eligibility,
}: { rows: WalletBalanceRow[]; eligibility: Record<string, string | null> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold">Provider wallets</h2>
        <span className="text-xs text-slate-500">{rows.length} wallets</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
            <tr>
              <th className="text-left  px-3 py-2">Virtual ID</th>
              <th className="text-left  px-3 py-2">Owner</th>
              <th className="text-left  px-3 py-2">Currency</th>
              <th className="text-left  px-3 py-2">KYC</th>
              <th className="text-right px-3 py-2">Balance</th>
              <th className="text-left  px-3 py-2">Eligibility</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No provider wallets yet.</td></tr>
            ) : rows.map(w => {
              const verdict = eligibility[w.owner_user_id ?? ''];
              const eligible = verdict == null;
              return (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-mono text-xs">{w.virtual_account_id}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{(w.owner_user_id ?? '').slice(0, 8)}…</td>
                  <td className="px-3 py-1.5">{w.currency}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${KYC_TONE[w.kyc_status] ?? KYC_TONE.pending}`}>
                      {w.kyc_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold">{Number(w.wallet_balance).toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-xs">
                    {eligible ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ShieldCheck className="w-3 h-3" /> ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600" title={verdict ?? ''}>
                        <AlertOctagon className="w-3 h-3" /> {verdict}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Escrow wallets table ───────────────────────── */

function EscrowWalletsTable({ rows }: { rows: WalletBalanceRow[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold">Escrow wallets · top 50 by balance</h2>
        <span className="text-xs text-slate-500">{rows.length} wallets</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
            <tr>
              <th className="text-left  px-3 py-2">Virtual ID</th>
              <th className="text-left  px-3 py-2">Booking</th>
              <th className="text-left  px-3 py-2">Currency</th>
              <th className="text-right px-3 py-2">Held</th>
              <th className="text-left  px-3 py-2">Last activity</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No funded escrow wallets.</td></tr>
            ) : rows.filter(r => r.wallet_balance > 0).slice(0, 50).map(w => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="px-3 py-1.5 font-mono text-xs">{w.virtual_account_id}</td>
                <td className="px-3 py-1.5 font-mono text-xs">{(w.booking_id ?? '').slice(0, 8)}…</td>
                <td className="px-3 py-1.5">{w.currency}</td>
                <td className="px-3 py-1.5 text-right font-bold">{Number(w.wallet_balance).toFixed(2)}</td>
                <td className="px-3 py-1.5 text-xs text-slate-500">
                  {w.last_transaction_at ? new Date(w.last_transaction_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Pending payouts queue ───────────────────── */

const PAYOUT_TONE: Record<ProviderPayoutScheduleRow['status'], string> = {
  scheduled:  'bg-slate-100   text-slate-600',
  processing: 'bg-blue-100    text-blue-700',
  paid:       'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100     text-red-700',
  cancelled:  'bg-slate-100   text-slate-500',
};

function PendingPayoutsQueue({
  rows, onChanged,
}: { rows: ProviderPayoutScheduleRow[]; onChanged: () => void }) {
  async function transition(id: string, next: ProviderPayoutScheduleRow['status']) {
    try {
      await markPayoutStatus(id, next);
      toast.success(`Marked ${next}`);
      onChanged();
    } catch (e) {
      toast.error('Update failed', { description: e instanceof Error ? e.message : '' });
    }
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="font-bold">Payout queue</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
            <tr>
              <th className="text-left  px-3 py-2">Driver</th>
              <th className="text-left  px-3 py-2">Booking</th>
              <th className="text-right px-3 py-2">Amount</th>
              <th className="text-left  px-3 py-2">Status</th>
              <th className="text-left  px-3 py-2">Scheduled</th>
              <th className="text-left  px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No payouts queued.</td></tr>
            ) : rows.map(p => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-1.5 font-mono text-xs">{p.driver_id.slice(0, 8)}…</td>
                <td className="px-3 py-1.5 font-mono text-xs">{(p.booking_id ?? '').slice(0, 8) || '—'}</td>
                <td className="px-3 py-1.5 text-right">{Number(p.amount).toFixed(2)} {p.currency}</td>
                <td className="px-3 py-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${PAYOUT_TONE[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs text-slate-500">{new Date(p.scheduled_for).toLocaleDateString()}</td>
                <td className="px-3 py-1.5">
                  {(p.status === 'scheduled' || p.status === 'processing') && (
                    <div className="flex gap-1.5">
                      <button onClick={() => transition(p.id, 'paid')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded">
                        Paid
                      </button>
                      <button onClick={() => transition(p.id, 'failed')}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded">
                        Failed
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
