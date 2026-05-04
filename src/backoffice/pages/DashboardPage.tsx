import { useQuery } from '@tanstack/react-query';
import { Globe, Wallet, Receipt, ScrollText } from 'lucide-react';
import { listMarketRollout } from '../services/market-rollout-service';
import { listTransactions } from '../services/payments-service';
import { listInvoices } from '../services/invoices-service';
import { listAudit } from '../services/audit-service';
import { useBackofficeAuth } from '../rbac/useBackofficeAuth';

export default function DashboardPage() {
  const auth = useBackofficeAuth();

  const markets = useQuery({ queryKey: ['bos', 'markets', 'all'], queryFn: () => listMarketRollout() });
  const txs     = useQuery({ queryKey: ['bos', 'tx', 'recent'],   queryFn: () => listTransactions({ limit: 50 }), enabled: auth.hasPermission('payments.view') });
  const invs    = useQuery({ queryKey: ['bos', 'inv', 'recent'],  queryFn: () => listInvoices({ limit: 50 }),     enabled: auth.hasPermission('invoices.view') });
  const audits  = useQuery({ queryKey: ['bos', 'audit', 'recent'],queryFn: () => listAudit({ limit: 10 }),         enabled: auth.hasPermission('audit.view') });

  const liveCount     = (markets.data ?? []).filter(m => m.status === 'live').length;
  const pilotCount    = (markets.data ?? []).filter(m => m.status === 'pilot').length;
  const lockedCount   = (markets.data ?? []).filter(m => m.status === 'locked').length;
  const txTotal       = (txs.data     ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const invTotal      = (invs.data    ?? []).reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">FlyttGo Back Office</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Operator dashboard</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Welcome{auth.roles[0] ? `, ${auth.roles[0]}` : ''}. Overview of every BOS-tracked surface in one place.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Globe}
          label="Markets"
          primary={`${liveCount} live`}
          secondary={`${pilotCount} pilot · ${lockedCount} locked`}
        />
        {auth.hasPermission('payments.view') && (
          <KpiCard
            icon={Wallet}
            label="Recent transactions"
            primary={(txs.data?.length ?? 0).toString()}
            secondary={`Σ ${txTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`}
          />
        )}
        {auth.hasPermission('invoices.view') && (
          <KpiCard
            icon={Receipt}
            label="Recent invoices"
            primary={(invs.data?.length ?? 0).toString()}
            secondary={`Σ ${invTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`}
          />
        )}
        {auth.hasPermission('audit.view') && (
          <KpiCard
            icon={ScrollText}
            label="Audit events"
            primary={(audits.data?.length ?? 0).toString()}
            secondary="Last 10 captured"
          />
        )}
      </div>

      {auth.hasPermission('audit.view') && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Recent audit events</h2>
          {(audits.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 py-3">No audit events yet — actions will populate as operators use the back office.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {(audits.data ?? []).slice(0, 10).map(a => (
                <li key={a.id} className="py-2 flex items-baseline gap-3">
                  <span className="font-mono text-xs text-slate-400 w-32 flex-shrink-0">
                    {new Date(a.occurred_at).toLocaleString()}
                  </span>
                  <span className="font-semibold text-slate-800">{a.action}</span>
                  {a.target_type && (
                    <span className="text-xs text-slate-500">
                      {a.target_type}{a.target_id ? `:${a.target_id.slice(0, 8)}` : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, primary, secondary,
}: { icon: typeof Globe; label: string; primary: string; secondary: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
          <Icon size={16} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900">{primary}</p>
      <p className="text-xs text-slate-500 mt-1">{secondary}</p>
    </div>
  );
}
