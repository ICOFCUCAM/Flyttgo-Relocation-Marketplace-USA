import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, Receipt, Wallet, Truck, Repeat, Building2,
  Landmark, Globe2, History, Download, Lock, Loader2,
  RefreshCw, ArrowDownToLine, FileText, Printer,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import {
  fetchMyFinopsAccount,
  loadFinopsOverview, loadFinopsLedger,
  loadSubscriptionRevenue, loadCurrencyBreakdown,
  listTaxModes, listFxRates, loadAuditLog,
  type FinopsAccountRow, type FinopsRole,
  type FinopsOverview, type LedgerRow, type LedgerKind,
  type SubscriptionRevenueRow, type CurrencyBreakdownRow,
  type TaxModeRow, type FxRateRow, type AuditLogRow,
} from '../lib/finops-store';
import { exportCsv, exportWordHtml, printLedger } from '../lib/finops-exports';

/* ─────────────────────────────────────────────────────────────────
 * <FinanceConsole>
 *
 * Compliance-grade Financial Operations & Audit Console.
 *
 * Three roles (resolved server-side via finops_accounts +
 * is_finops() / is_finops_writer() RPCs — the React layer just
 * mirrors the role for UI affordances):
 *
 *   super_admin — full read + write + role mgmt
 *   accountant  — read everything + post adjustments + export
 *   auditor     — read-only across the entire console
 *
 * Ten tabs per the spec:
 *
 *   Overview · Ledger · Escrow · Payouts · Subscriptions ·
 *   Enterprise · Tax · Currency · Audit · Exports
 *
 * Tabs are lazy: each section's data only loads when the operator
 * clicks it, so opening the console doesn't fan out to every RPC.
 * ───────────────────────────────────────────────────────────────── */

type Tab =
  | 'overview' | 'ledger' | 'escrow' | 'payouts' | 'subscriptions'
  | 'enterprise' | 'tax' | 'currency' | 'audit' | 'exports';

interface TabSpec { id: Tab; label: string; icon: LucideIcon; }

const TABS: TabSpec[] = [
  { id: 'overview',      label: 'Overview',           icon: Activity   },
  { id: 'ledger',        label: 'Transaction Ledger', icon: Receipt    },
  { id: 'escrow',        label: 'Escrow Monitor',     icon: Wallet     },
  { id: 'payouts',       label: 'Provider Payouts',   icon: Truck      },
  { id: 'subscriptions', label: 'Subscription Revenue', icon: Repeat   },
  { id: 'enterprise',    label: 'Enterprise Billing', icon: Building2  },
  { id: 'tax',           label: 'Tax Reports',        icon: Landmark   },
  { id: 'currency',      label: 'Currency Reports',   icon: Globe2     },
  { id: 'audit',         label: 'Audit Log',          icon: History    },
  { id: 'exports',       label: 'Export Center',      icon: Download   },
];

const ROLE_TONE: Record<FinopsRole, { bg: string; text: string; label: string }> = {
  super_admin: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Super Admin' },
  accountant:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'Accountant' },
  auditor:     { bg: 'bg-amber-100',   text: 'text-amber-800',   label: 'Auditor (read-only)' },
};

export default function FinanceConsole() {
  const { user } = useAuth();
  const [account, setAccount]   = useState<FinopsAccountRow | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);
  const [tab,     setTab]       = useState<Tab>('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMyFinopsAccount()
      .then(row => { if (!cancelled) { setAccount(row); setError(null); } })
      .catch(err => { if (!cancelled) setError(err?.message ?? 'Could not load FinOps account'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const isWriter = useMemo(
    () => account?.role === 'super_admin' || account?.role === 'accountant',
    [account],
  );

  if (!user) {
    return (
      <NotAuthorized
        title="Sign in required"
        body="The Financial Operations Console is restricted to authenticated FinOps roles."
      />
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading Financial Operations Console…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        <p className="font-semibold mb-1">Could not load console</p>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  if (!account) {
    return (
      <NotAuthorized
        title="No FinOps role assigned"
        body="Your account does not have a Financial Operations role. A super_admin must add a row to finops_accounts before you can access this console."
      />
    );
  }

  const tone = ROLE_TONE[account.role];

  return (
    <div className="space-y-6">
      {/* Header — identity + role + base scope */}
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-600" />
            Financial Operations &amp; Audit Console
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Compliance-grade ledger, payouts, FX, and audit trail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tone.bg} ${tone.text}`}>
            {tone.label}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Base · {account.base_currency}
          </span>
          {account.country_scope && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
              Scope · {account.country_scope.toUpperCase()}
            </span>
          )}
        </div>
      </header>

      {/* Auditor banner — emphasises read-only */}
      {account.role === 'auditor' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-800">
          <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Read-only mode</p>
            <p className="text-xs">All write actions are disabled. RLS enforces this server-side — your changes would be rejected even if the UI exposed them.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="flex flex-wrap gap-1.5 bg-white border border-gray-100 rounded-xl p-1.5">
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                active ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Tab body — each section is its own component so the data
       * fetch is scoped to the visible tab and the Overview's RPC
       * calls don't pre-empt the Ledger's pagination state. */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 min-h-[400px]">
        {tab === 'overview'      && <OverviewTab />}
        {tab === 'ledger'        && <LedgerTab />}
        {tab === 'escrow'        && <EscrowTab />}
        {tab === 'payouts'       && <PayoutsTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'enterprise'    && <EnterpriseTab />}
        {tab === 'tax'           && <TaxTab />}
        {tab === 'currency'      && <CurrencyTab />}
        {tab === 'audit'         && <AuditTab />}
        {tab === 'exports'       && <ExportsTab />}
      </div>
    </div>
  );
}

/* ── Common helpers ─────────────────────────────────────────── */

function fmt(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

function fmtTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

/* ── Overview tab ───────────────────────────────────────────── */

function OverviewTab() {
  const [data,    setData]    = useState<FinopsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<7 | 30 | 90>(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFinopsOverview(isoDaysAgo(period), nowIso())
      .then(d => { if (!cancelled) setData(d); })
      .catch(err => { if (!cancelled) toast.error('Could not load overview', { description: err?.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Financial Overview</h3>
        <div className="flex gap-1.5">
          {([7, 30, 90] as const).map(d => (
            <button key={d} onClick={() => setPeriod(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                period === d ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              Last {d}d
            </button>
          ))}
        </div>
      </header>

      {loading || !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Gross revenue (USD)"      value={fmt(data.gross_revenue_usd)}       tone="emerald" />
            <Stat label="Provider payouts"          value={fmt(data.gross_payouts_usd)}        />
            <Stat label="Platform commissions"      value={fmt(data.platform_commissions_usd)} tone="emerald" />
            <Stat label="Enterprise invoices"       value={fmt(data.enterprise_invoices_usd)}  tone="violet" />
            <Stat label="Subscription revenue"      value={fmt(data.gross_subscriptions_usd)}  tone="blue" />
            <Stat label="Refunds"                   value={fmt(data.gross_refunds_usd)}        tone="red" />
            <Stat label="Escrow held"               value={fmt(data.escrow_held_usd)}          tone="amber" />
            <Stat label="Escrow released"           value={fmt(data.escrow_released_usd)}      />
            <Stat label="Transactions"              value={data.transaction_count.toString()}  />
            <Stat label="Currencies seen"           value={(data.currencies_seen ?? []).join(' · ') || '—'} />
          </div>
          <p className="text-[11px] text-gray-400">
            Window: {fmtTimestamp(data.window_from)} → {fmtTimestamp(data.window_to)} · generated {fmtTimestamp(data.generated_at)}
          </p>
        </>
      )}
    </section>
  );
}

/* Re-usable stat card. */
function Stat({ label, value, tone = 'slate' }: {
  label: string; value: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'violet';
}) {
  const TONE: Record<string, string> = {
    slate:'text-gray-900', emerald:'text-emerald-700', amber:'text-amber-700',
    red:'text-red-600', blue:'text-blue-700', violet:'text-violet-700',
  };
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
      <p className={`text-xl font-extrabold truncate ${TONE[tone]}`} title={value}>{value}</p>
    </div>
  );
}

/* ── Ledger tab ─────────────────────────────────────────────── */

const LEDGER_KINDS: { value: LedgerKind | ''; label: string }[] = [
  { value: '',                     label: 'All kinds' },
  { value: 'customer_payment',     label: 'Customer payments' },
  { value: 'provider_payout',      label: 'Provider payouts' },
  { value: 'escrow_hold',          label: 'Escrow holds' },
  { value: 'escrow_release',       label: 'Escrow releases' },
  { value: 'refund',               label: 'Refunds' },
  { value: 'subscription_payment', label: 'Subscription payments' },
  { value: 'commission',           label: 'Platform commission' },
  { value: 'enterprise_invoice',   label: 'Enterprise invoices' },
];

const KIND_TONE: Record<string, string> = {
  customer_payment:     'bg-emerald-100 text-emerald-800',
  provider_payout:      'bg-blue-100    text-blue-800',
  escrow_hold:          'bg-amber-100   text-amber-800',
  escrow_release:       'bg-violet-100  text-violet-800',
  refund:               'bg-red-100     text-red-800',
  subscription_payment: 'bg-slate-100   text-slate-800',
  commission:           'bg-emerald-50  text-emerald-700',
  enterprise_invoice:   'bg-violet-50   text-violet-700',
};

const LEDGER_COLUMNS = [
  { header: 'Occurred at',     value: (r: LedgerRow) => fmtTimestamp(r.occurred_at) },
  { header: 'Kind',            value: (r: LedgerRow) => r.kind },
  { header: 'Reference',       value: (r: LedgerRow) => r.reference_id },
  { header: 'Country',         value: (r: LedgerRow) => r.country_code },
  { header: 'Currency',        value: (r: LedgerRow) => r.currency },
  { header: 'Amount (orig.)',  value: (r: LedgerRow) => Number(r.amount_original).toFixed(2) },
  { header: 'Amount (USD)',    value: (r: LedgerRow) => Number(r.amount_usd).toFixed(2) },
  { header: 'FX → USD',        value: (r: LedgerRow) => Number(r.fx_rate_to_usd).toFixed(6) },
  { header: 'Status',          value: (r: LedgerRow) => r.status },
];

function LedgerTab() {
  const [rows,    setRows]    = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind,    setKind]    = useState<LedgerKind | ''>('');
  const [currency,setCurrency]= useState<string>('');
  const [days,    setDays]    = useState<7 | 30 | 90 | 365>(30);

  async function fetchRows() {
    setLoading(true);
    try {
      const data = await loadFinopsLedger({
        fromIso: isoDaysAgo(days),
        toIso:   nowIso(),
        kind:    kind || undefined,
        currency: currency || undefined,
        limit:   500,
      });
      setRows(data);
    } catch (err: any) {
      toast.error('Could not load ledger', { description: err?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchRows(); /* eslint-disable-next-line */ }, [kind, currency, days]);

  const meta = {
    'Period':   `last ${days} days`,
    'Kind':     kind || 'all',
    'Currency': currency || 'all',
    'Rows':     rows.length.toString(),
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Marketplace Transaction Ledger</h3>
        <button
          onClick={fetchRows}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-xs">
        <select value={kind} onChange={e => setKind(e.target.value as LedgerKind | '')}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white">
          {LEDGER_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <select value={currency} onChange={e => setCurrency(e.target.value)}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white">
          <option value="">All currencies</option>
          {['USD','EUR','GBP','NOK','KES','NGN','AED','INR','CAD'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={days} onChange={e => setDays(Number(e.target.value) as 7 | 30 | 90 | 365)}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 365 days</option>
        </select>
        <span className="flex-1" />
        {/* Per-tab quick exports — full Export Center is separate. */}
        <button
          onClick={() => exportCsv(`ledger-${days}d.csv`, LEDGER_COLUMNS, rows)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowDownToLine size={12} /> CSV
        </button>
        <button
          onClick={() => exportWordHtml(`ledger-${days}d.doc`, 'Marketplace Transaction Ledger', LEDGER_COLUMNS, rows, meta)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
        >
          <FileText size={12} /> Word
        </button>
        <button
          onClick={() => printLedger('Marketplace Transaction Ledger', LEDGER_COLUMNS, rows, meta)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Printer size={12} /> Print / PDF
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No transactions match these filters.</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                {LEDGER_COLUMNS.map(c => <th key={c.header} className="text-left px-2 py-2 font-semibold">{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={`${r.kind}-${r.reference_id}`} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-2 py-2 whitespace-nowrap text-gray-700">{fmtTimestamp(r.occurred_at)}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-semibold ${KIND_TONE[r.kind] || 'bg-gray-100 text-gray-700'}`}>
                      {r.kind.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-[10px] text-gray-600 max-w-[140px] truncate" title={r.reference_id}>
                    {r.reference_id}
                  </td>
                  <td className="px-2 py-2">{r.country_code}</td>
                  <td className="px-2 py-2">{r.currency}</td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums">{Number(r.amount_original).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{Number(r.amount_usd).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-500">{Number(r.fx_rate_to_usd).toFixed(6)}</td>
                  <td className="px-2 py-2 text-gray-700">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Escrow tab ─────────────────────────────────────────────── */

function EscrowTab() {
  const [rows,    setRows]    = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    /* Pull every escrow row in the last 90d — separate calls for
     * hold + release + refund so the totals card has the breakdown. */
    Promise.all([
      loadFinopsLedger({ kind: 'escrow_hold',    fromIso: isoDaysAgo(90), limit: 500 }),
      loadFinopsLedger({ kind: 'escrow_release', fromIso: isoDaysAgo(90), limit: 500 }),
      loadFinopsLedger({ kind: 'refund',         fromIso: isoDaysAgo(90), limit: 500 }),
    ])
      .then(([hold, release, refund]) => {
        if (cancelled) return;
        setRows([...hold, ...release, ...refund].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)));
      })
      .catch(err => { if (!cancelled) toast.error('Could not load escrow', { description: err?.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => ({
    held:     rows.filter(r => r.kind === 'escrow_hold'   ).reduce((s, r) => s + Number(r.amount_usd), 0),
    released: rows.filter(r => r.kind === 'escrow_release').reduce((s, r) => s + Number(r.amount_usd), 0),
    refunded: rows.filter(r => r.kind === 'refund'        ).reduce((s, r) => s + Number(r.amount_usd), 0),
  }), [rows]);

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Escrow Monitoring Panel</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Currently held"   value={fmt(totals.held)}     tone="amber" />
        <Stat label="Released"          value={fmt(totals.released)} tone="emerald" />
        <Stat label="Refunded"          value={fmt(totals.refunded)} tone="red" />
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="text-left px-2 py-2">Occurred</th>
                <th className="text-left px-2 py-2">Kind</th>
                <th className="text-left px-2 py-2">Booking</th>
                <th className="text-right px-2 py-2">Amount (USD)</th>
                <th className="text-left px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map(r => (
                <tr key={`${r.kind}-${r.reference_id}`} className="border-b border-gray-50">
                  <td className="px-2 py-2 whitespace-nowrap">{fmtTimestamp(r.occurred_at)}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-semibold ${KIND_TONE[r.kind]}`}>
                      {r.kind.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-mono text-[10px] truncate max-w-[140px]">{r.booking_id ?? '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmt(Number(r.amount_usd))}</td>
                  <td className="px-2 py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Provider Payouts tab ───────────────────────────────────── */

const PAYOUT_COLUMNS = [
  { header: 'Occurred at', value: (r: LedgerRow) => fmtTimestamp(r.occurred_at) },
  { header: 'Provider',    value: (r: LedgerRow) => r.provider_user_id ?? '—' },
  { header: 'Reference',   value: (r: LedgerRow) => r.reference_id },
  { header: 'Amount (USD)', value: (r: LedgerRow) => Number(r.amount_usd).toFixed(2) },
  { header: 'Type / status', value: (r: LedgerRow) => r.status },
];

function PayoutsTab() {
  const [rows,    setRows]    = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState<7 | 30 | 90 | 365>(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadFinopsLedger({ kind: 'provider_payout', fromIso: isoDaysAgo(days), limit: 500 })
      .then(d => { if (!cancelled) setRows(d); })
      .catch(err => { if (!cancelled) toast.error('Could not load payouts', { description: err?.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  /* Group by status to give the operator a sense of the queue
   * shape — pending vs. completed vs. dispute-held. */
  const byStatus = useMemo(() => {
    const map: Record<string, { count: number; usd: number }> = {};
    for (const r of rows) {
      map[r.status] ??= { count: 0, usd: 0 };
      map[r.status].count += 1;
      map[r.status].usd   += Number(r.amount_usd);
    }
    return map;
  }, [rows]);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Provider Payout Engine</h3>
        <div className="flex gap-1.5">
          {([7, 30, 90, 365] as const).map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                days === d ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {d === 365 ? 'Last year' : `Last ${d}d`}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.keys(byStatus).length === 0 ? (
          <Stat label="No payout activity" value="—" />
        ) : (
          Object.entries(byStatus).map(([status, { count, usd }]) => (
            <Stat key={status} label={`${status} · ${count}`} value={fmt(usd)} />
          ))
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => exportCsv(`payouts-${days}d.csv`, PAYOUT_COLUMNS, rows)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <ArrowDownToLine size={12} /> CSV
        </button>
        <button onClick={() => exportWordHtml(`payouts-${days}d.doc`, 'Provider Payouts', PAYOUT_COLUMNS, rows)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <FileText size={12} /> Word
        </button>
        <button onClick={() => printLedger('Provider Payouts', PAYOUT_COLUMNS, rows)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <Printer size={12} /> Print / PDF
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No payouts in this window.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="text-left px-2 py-2">Occurred</th>
                <th className="text-left px-2 py-2">Provider</th>
                <th className="text-left px-2 py-2">Reference</th>
                <th className="text-right px-2 py-2">Amount (USD)</th>
                <th className="text-left px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map(r => (
                <tr key={r.reference_id} className="border-b border-gray-50">
                  <td className="px-2 py-2 whitespace-nowrap">{fmtTimestamp(r.occurred_at)}</td>
                  <td className="px-2 py-2 font-mono text-[10px] truncate max-w-[140px]">{r.provider_user_id ?? '—'}</td>
                  <td className="px-2 py-2 font-mono text-[10px] truncate max-w-[140px]">{r.reference_id}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmt(Number(r.amount_usd))}</td>
                  <td className="px-2 py-2">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Subscription Revenue tab ───────────────────────────────── */

function SubscriptionsTab() {
  const [rows,    setRows]    = useState<SubscriptionRevenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadSubscriptionRevenue()
      .then(d => { if (!cancelled) setRows(d); })
      .catch(err => { if (!cancelled) toast.error('Could not load subscriptions', { description: err?.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const totalMonthly = rows.reduce((s, r) => s + Number(r.monthly_usd), 0);

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Subscription Revenue Tracker</h3>

      <Stat label="Estimated MRR (USD)" value={fmt(totalMonthly)} tone="emerald" />

      {loading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="text-left px-2 py-2">Tier</th>
                <th className="text-right px-2 py-2">Active providers</th>
                <th className="text-right px-2 py-2">Monthly recurring (USD)</th>
                <th className="text-right px-2 py-2">% of MRR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.tier_slug} className="border-b border-gray-50">
                  <td className="px-2 py-2 font-semibold text-gray-900">{r.display_name}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.active_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmt(Number(r.monthly_usd))}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-500">
                    {totalMonthly > 0 ? `${((Number(r.monthly_usd) / totalMonthly) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Currency Reports tab ───────────────────────────────────── */

function CurrencyTab() {
  const [rows,     setRows]     = useState<CurrencyBreakdownRow[]>([]);
  const [fxRates,  setFxRates]  = useState<FxRateRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [days,     setDays]     = useState<7 | 30 | 90 | 365>(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      loadCurrencyBreakdown(isoDaysAgo(days), nowIso()),
      listFxRates(),
    ])
      .then(([breakdown, fx]) => {
        if (cancelled) return;
        setRows(breakdown);
        setFxRates(fx);
      })
      .catch(err => { if (!cancelled) toast.error('Could not load currency report', { description: err?.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Multi-Currency Reporting Engine</h3>
        <div className="flex gap-1.5">
          {([7, 30, 90, 365] as const).map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                days === d ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {d === 365 ? 'Last year' : `Last ${d}d`}
            </button>
          ))}
        </div>
      </header>

      {/* Breakdown */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">Gross by currency</p>
        {loading ? (
          <div className="space-y-2 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="text-left px-2 py-2">Currency</th>
                <th className="text-right px-2 py-2">Tx count</th>
                <th className="text-right px-2 py-2">Gross (original)</th>
                <th className="text-right px-2 py-2">Gross (USD)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.currency} className="border-b border-gray-50">
                  <td className="px-2 py-2 font-bold">{r.currency}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.transaction_count}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{Number(r.gross_original).toFixed(2)} {r.currency}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmt(Number(r.gross_usd))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Latest FX snapshot table */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold mb-2">FX rate snapshots (most recent per currency)</p>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <th className="text-left px-2 py-2">Currency</th>
              <th className="text-right px-2 py-2">Rate → USD</th>
              <th className="text-left px-2 py-2">Effective from</th>
              <th className="text-left px-2 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {dedupeLatestPerCurrency(fxRates).map(r => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="px-2 py-2 font-bold">{r.currency}</td>
                <td className="px-2 py-2 text-right tabular-nums font-mono">{Number(r.rate_to_usd).toFixed(6)}</td>
                <td className="px-2 py-2">{fmtTimestamp(r.starts_at)}</td>
                <td className="px-2 py-2 text-gray-500">{r.source ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function dedupeLatestPerCurrency(rows: FxRateRow[]): FxRateRow[] {
  const seen = new Set<string>();
  const out: FxRateRow[] = [];
  for (const r of rows) {     // already sorted DESC by starts_at from the RPC
    if (seen.has(r.currency)) continue;
    seen.add(r.currency);
    out.push(r);
  }
  return out;
}

/* ── Tax Reports tab ────────────────────────────────────────── */

const TAX_MODE_TONE: Record<string, string> = {
  sales_tax_added:      'bg-blue-100    text-blue-800',
  vat_included:         'bg-emerald-100 text-emerald-800',
  mva_included:         'bg-emerald-100 text-emerald-800',
  gst_included:         'bg-violet-100  text-violet-800',
  provider_responsible: 'bg-amber-100   text-amber-800',
  none:                 'bg-slate-100   text-slate-700',
};

function TaxTab() {
  const [rows,    setRows]    = useState<TaxModeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTaxModes()
      .then(d => { if (!cancelled) setRows(d); })
      .catch(err => { if (!cancelled) toast.error('Could not load tax modes', { description: err?.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Country Tax-Mode Engine</h3>

      {loading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <th className="text-left px-2 py-2">Country</th>
                <th className="text-left px-2 py-2">Tax mode</th>
                <th className="text-right px-2 py-2">Default rate</th>
                <th className="text-left px-2 py-2">Display label</th>
                <th className="text-left px-2 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.country_code} className="border-b border-gray-50">
                  <td className="px-2 py-2 font-mono uppercase font-bold">{r.country_code}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${TAX_MODE_TONE[r.tax_mode] || 'bg-gray-100 text-gray-700'}`}>
                      {r.tax_mode.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {r.default_rate != null ? `${(Number(r.default_rate) * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-2 py-2">{r.display_label ?? '—'}</td>
                  <td className="px-2 py-2 text-gray-500">{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ── Enterprise Billing tab ─────────────────────────────────── */

const ENTERPRISE_COLUMNS = [
  { header: 'Occurred',     value: (r: LedgerRow) => fmtTimestamp(r.occurred_at) },
  { header: 'Reference',    value: (r: LedgerRow) => r.reference_id },
  { header: 'Country',      value: (r: LedgerRow) => r.country_code },
  { header: 'Currency',     value: (r: LedgerRow) => r.currency },
  { header: 'Amount (USD)', value: (r: LedgerRow) => Number(r.amount_usd).toFixed(2) },
  { header: 'Status',       value: (r: LedgerRow) => r.status },
];

function EnterpriseTab() {
  const [invoices,      setInvoices]      = useState<LedgerRow[]>([]);
  const [subRevenue,    setSubRevenue]    = useState<LedgerRow[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    /* Enterprise revenue = organization_invoices stream (the real
     * institutional invoices) + the subscription stream from
     * Gold Pro / CIP-tier providers (procurement-grade access). */
    Promise.all([
      loadFinopsLedger({ kind: 'enterprise_invoice',  fromIso: isoDaysAgo(365), limit: 500 }),
      loadFinopsLedger({ kind: 'subscription_payment', fromIso: isoDaysAgo(365), limit: 500 }),
    ])
      .then(([inv, sub]) => {
        if (cancelled) return;
        setInvoices(inv);
        setSubRevenue(sub);
      })
      .catch(err => { if (!cancelled) toast.error('Could not load enterprise billing', { description: err?.message }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const invoiceTotal = invoices.reduce((s, r) => s + Number(r.amount_usd), 0);
  const subTotal     = subRevenue.reduce((s, r) => s + Number(r.amount_usd), 0);
  const totalUsd     = invoiceTotal + subTotal;

  /* Combined feed for the table — invoices first (the primary
   * institutional revenue), tier subscriptions secondary. */
  const rows = useMemo(() => [...invoices, ...subRevenue], [invoices, subRevenue]);

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Enterprise Billing Tracker</h3>
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-800">
        <p className="font-semibold mb-0.5">Procurement-grade revenue stream</p>
        <p className="text-xs">
          <code>organization_invoices</code> (department-rolled monthly statements) plus
          tier-subscription revenue from Gold Pro and Certified Infrastructure Partner
          accounts. Invoice <code>period_start</code> drives the occurred-at so January
          invoices land in January's report regardless of when they were finalised.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Enterprise invoices · last year" value={fmt(invoiceTotal)} tone="violet" />
        <Stat label="Tier subscriptions · last year"  value={fmt(subTotal)}     tone="blue"   />
        <Stat label="Combined enterprise revenue"      value={fmt(totalUsd)}     tone="emerald"/>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => exportCsv('enterprise-billing.csv', ENTERPRISE_COLUMNS, rows)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <ArrowDownToLine size={12} /> CSV
        </button>
        <button onClick={() => exportWordHtml('enterprise-billing.doc', 'Enterprise Billing', ENTERPRISE_COLUMNS, rows)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <FileText size={12} /> Word
        </button>
        <button onClick={() => printLedger('Enterprise Billing', ENTERPRISE_COLUMNS, rows)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <Printer size={12} /> Print / PDF
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No enterprise billing in this window.</p>
      ) : (
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
              {ENTERPRISE_COLUMNS.map(c => <th key={c.header} className="text-left px-2 py-2 font-semibold">{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map(r => (
              <tr key={r.reference_id} className="border-b border-gray-50">
                {ENTERPRISE_COLUMNS.map(c => (
                  <td key={c.header} className="px-2 py-2 text-gray-700">{String(c.value(r))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ── Audit Log tab ──────────────────────────────────────────── */

const AUDIT_OP_TONE: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-blue-100    text-blue-800',
  DELETE: 'bg-red-100     text-red-800',
};

function AuditTab() {
  const [rows,    setRows]    = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [table,   setTable]   = useState<string>('');
  const [expanded, setExpanded] = useState<number | null>(null);

  async function fetchRows() {
    setLoading(true);
    try {
      const data = await loadAuditLog({ table: table || undefined, limit: 200 });
      setRows(data);
    } catch (err: any) {
      toast.error('Could not load audit log', { description: err?.message });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void fetchRows(); /* eslint-disable-next-line */ }, [table]);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Append-Only Audit Log</h3>
        <button onClick={fetchRows}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-3">
        <Lock size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Tamper-evident</p>
          <p className="text-xs">DB triggers append every change to <code>financial_audit_log</code>. RLS blocks UPDATE / DELETE — no role can rewrite history.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <select value={table} onChange={e => setTable(e.target.value)}
          className="px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white">
          <option value="">All tables</option>
          {['bookings', 'escrow_payments', 'driver_wallet_transactions', 'driver_subscriptions', 'organization_invoices'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No audit entries match these filters.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {rows.map(r => (
            <li key={r.id}>
              <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${AUDIT_OP_TONE[r.op]}`}>{r.op}</span>
                <span className="font-mono text-xs text-gray-700">{r.table_name}</span>
                <span className="font-mono text-[10px] text-gray-500 truncate max-w-[180px]">{r.record_id}</span>
                <span className="flex-1" />
                <span className="text-xs text-gray-500">{r.actor_role ?? '—'}</span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtTimestamp(r.created_at)}</span>
              </button>
              {expanded === r.id && (
                <div className="px-4 pb-3 pt-1 grid sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">Before</p>
                    <pre className="bg-red-50 text-red-900 p-2 rounded overflow-x-auto max-h-48">{JSON.stringify(r.before_value, null, 2) || '—'}</pre>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">After</p>
                    <pre className="bg-emerald-50 text-emerald-900 p-2 rounded overflow-x-auto max-h-48">{JSON.stringify(r.after_value, null, 2) || '—'}</pre>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Export Center tab ──────────────────────────────────────── */

interface ExportRecipe {
  id:       string;
  title:    string;
  body:     string;
  fetch:    () => Promise<{ rows: unknown[]; columns: { header: string; value: (r: unknown) => string }[] }>;
}

function ExportsTab() {
  const [busyId, setBusyId] = useState<string | null>(null);

  /* Recipes wrap each section's fetch + columns so the operator
   * can re-run any export in any format from a single screen. */
  const recipes: ExportRecipe[] = [
    {
      id:    'ledger-30d',
      title: 'Marketplace Transaction Ledger · last 30 days',
      body:  'Customer payments, payouts, escrow, refunds, subscription payments — unified shape with FX-snapshot USD conversion.',
      fetch: async () => {
        const rows = await loadFinopsLedger({ fromIso: isoDaysAgo(30), limit: 1000 });
        return {
          rows,
          columns: LEDGER_COLUMNS as unknown as { header: string; value: (r: unknown) => string }[],
        };
      },
    },
    {
      id:    'payouts-90d',
      title: 'Provider Payouts · last 90 days',
      body:  'Wallet credits, payout requests, dispute-held payouts.',
      fetch: async () => {
        const rows = await loadFinopsLedger({ kind: 'provider_payout', fromIso: isoDaysAgo(90), limit: 1000 });
        return {
          rows,
          columns: PAYOUT_COLUMNS as unknown as { header: string; value: (r: unknown) => string }[],
        };
      },
    },
    {
      id:    'enterprise-365d',
      title: 'Enterprise Billing · last year',
      body:  'Subscription payments + standalone enterprise invoices.',
      fetch: async () => {
        const rows = await loadFinopsLedger({ kind: 'subscription_payment', fromIso: isoDaysAgo(365), limit: 1000 });
        return {
          rows,
          columns: ENTERPRISE_COLUMNS as unknown as { header: string; value: (r: unknown) => string }[],
        };
      },
    },
  ];

  async function run(id: string, format: 'csv' | 'word' | 'print') {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    setBusyId(id + ':' + format);
    try {
      const { rows, columns } = await recipe.fetch();
      const filename = `${recipe.id}.${format === 'word' ? 'doc' : 'csv'}`;
      if (format === 'csv')   exportCsv(filename, columns as never, rows as never);
      if (format === 'word')  exportWordHtml(filename, recipe.title, columns as never, rows as never);
      if (format === 'print') printLedger(recipe.title, columns as never, rows as never);
      toast.success('Export ready', { description: recipe.title });
    } catch (err: any) {
      toast.error('Could not export', { description: err?.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Export Center</h3>

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">
        <p className="font-semibold text-slate-900 mb-0.5">Compliance-ready output formats</p>
        <ul className="text-xs space-y-0.5 mt-1">
          <li>· <strong>CSV</strong> — Excel / Sheets / SAP / NetSuite imports. UTF-8 BOM included for non-Latin currencies.</li>
          <li>· <strong>Word (.doc)</strong> — Microsoft Office-compatible HTML with auditable styling.</li>
          <li>· <strong>Print / PDF</strong> — print-styled window; save to PDF via the browser's print dialog.</li>
        </ul>
      </div>

      <div className="space-y-2">
        {recipes.map(recipe => (
          <article key={recipe.id} className="border border-gray-100 rounded-xl p-4 flex items-center gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm">{recipe.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{recipe.body}</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => run(recipe.id, 'csv')} disabled={busyId !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <ArrowDownToLine size={12} />
                {busyId === recipe.id + ':csv' ? '…' : 'CSV'}
              </button>
              <button onClick={() => run(recipe.id, 'word')} disabled={busyId !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <FileText size={12} />
                {busyId === recipe.id + ':word' ? '…' : 'Word'}
              </button>
              <button onClick={() => run(recipe.id, 'print')} disabled={busyId !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <Printer size={12} />
                {busyId === recipe.id + ':print' ? '…' : 'Print / PDF'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotAuthorized({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Lock className="w-5 h-5 text-amber-700" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{body}</p>
    </div>
  );
}
