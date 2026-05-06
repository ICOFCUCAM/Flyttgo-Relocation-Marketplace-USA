import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, MapPin, Users, Receipt } from 'lucide-react';
import {
  fetchTopCorridors, fetchEarningsDistribution, fetchTaxCollected,
  fetchSubscriptionBilling,
} from '../service';
import type {
  CorridorIntelligenceRow, EarningsDistributionRow,
  Jurisdiction, SubscriptionBillingRow, TaxCollectedRow,
} from '../types';

/**
 * AC.08 Financial intelligence — four panels read from the views
 * shipped in install-financial-infrastructure.sql:
 *
 *   - Top corridors by GMV (last 30 days)
 *   - Provider earnings distribution (5 buckets)
 *   - Tax collected by jurisdiction + period
 *   - Subscription billing health
 */
export default function IntelligenceSection({
  jurisdiction,
}: { jurisdiction: Jurisdiction }) {
  return (
    <div className="space-y-6">
      <TopCorridorsCard />
      <div className="grid lg:grid-cols-2 gap-4">
        <EarningsDistributionCard />
        <SubscriptionHealthCard />
      </div>
      <TaxCollectedCard jurisdiction={jurisdiction} />
    </div>
  );
}

/* ── Top corridors ───────────────────────────────────── */

function TopCorridorsCard() {
  const [rows, setRows] = useState<CorridorIntelligenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchTopCorridors().then(setRows).finally(() => setLoading(false)); }, []);

  return (
    <Card icon={<MapPin className="w-4 h-4" />} title="Top corridors · last 30 days">
      {loading ? <Loading /> : rows.length === 0 ? <Empty>No corridor activity yet.</Empty> : (
        <table className="w-full text-sm tabular-nums">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
            <tr>
              <th className="text-left  px-2 py-1.5">Country</th>
              <th className="text-left  px-2 py-1.5">Corridor</th>
              <th className="text-right px-2 py-1.5">Bookings · 30d</th>
              <th className="text-right px-2 py-1.5">GMV · 30d</th>
              <th className="text-right px-2 py-1.5">Avg value</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map(r => (
              <tr key={`${r.country}-${r.corridor}`} className="border-t border-slate-100">
                <td className="px-2 py-1 font-mono uppercase text-xs">{r.country}</td>
                <td className="px-2 py-1">{r.corridor}</td>
                <td className="px-2 py-1 text-right">{r.bookings_30d}</td>
                <td className="px-2 py-1 text-right font-bold">{Math.round(Number(r.gmv_30d)).toLocaleString()}</td>
                <td className="px-2 py-1 text-right text-slate-500">{Math.round(Number(r.avg_value)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* ── Provider earnings distribution ────────────────── */

function EarningsDistributionCard() {
  const [rows, setRows] = useState<EarningsDistributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchEarningsDistribution().then(setRows).finally(() => setLoading(false)); }, []);

  const max = Math.max(...rows.map(r => r.drivers_in_bucket), 1);

  return (
    <Card icon={<Users className="w-4 h-4" />} title="Provider earnings · last 90 days">
      {loading ? <Loading /> : rows.length === 0 ? <Empty>No payouts in the last 90 days.</Empty> : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.bucket}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                <span className="font-mono">{r.bucket}</span>
                <span className="text-slate-500">
                  {r.drivers_in_bucket} driver{r.drivers_in_bucket === 1 ? '' : 's'} ·
                  mean {Math.round(Number(r.bucket_mean)).toLocaleString()}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded">
                <div
                  className="h-full bg-emerald-500 rounded transition-all"
                  style={{ width: `${Math.max((r.drivers_in_bucket / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Subscription health ─────────────────────────── */

function SubscriptionHealthCard() {
  const [rows, setRows] = useState<SubscriptionBillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchSubscriptionBilling().then(setRows).finally(() => setLoading(false)); }, []);

  const summary = rows.reduce((acc, r) => {
    acc.total++;
    if (r.health === 'expired')        acc.expired++;
    if (r.health === 'expiring_soon')  acc.expiring++;
    if (r.health === 'cancelled')      acc.cancelled++;
    if (r.health === 'healthy')        acc.healthy++;
    return acc;
  }, { total: 0, healthy: 0, expiring: 0, expired: 0, cancelled: 0 });

  return (
    <Card icon={<TrendingUp className="w-4 h-4" />} title="Subscription billing health">
      {loading ? <Loading /> : (
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Healthy"     value={summary.healthy}   tone="text-emerald-700" />
          <Stat label="Expiring"    value={summary.expiring}  tone="text-amber-700" />
          <Stat label="Expired"     value={summary.expired}   tone="text-red-700" />
          <Stat label="Cancelled"   value={summary.cancelled} tone="text-slate-500" />
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className={`text-2xl font-extrabold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

/* ── Tax collected ─────────────────────────────── */

function TaxCollectedCard({ jurisdiction }: { jurisdiction: Jurisdiction }) {
  const [rows, setRows] = useState<TaxCollectedRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    void fetchTaxCollected(jurisdiction).then(setRows).finally(() => setLoading(false));
  }, [jurisdiction]);

  return (
    <Card icon={<Receipt className="w-4 h-4" />} title={`Tax collected · ${jurisdiction}`}>
      {loading ? <Loading /> : rows.length === 0 ? <Empty>No tax-flagged journal lines yet for {jurisdiction}.</Empty> : (
        <table className="w-full text-sm tabular-nums">
          <thead className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
            <tr>
              <th className="text-left  px-2 py-1.5">Period</th>
              <th className="text-left  px-2 py-1.5">Code</th>
              <th className="text-right px-2 py-1.5">Rate</th>
              <th className="text-right px-2 py-1.5">Output VAT</th>
              <th className="text-right px-2 py-1.5">Input VAT</th>
              <th className="text-right px-2 py-1.5">Net liability</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const net = Number(r.taxable_credit ?? 0) - Number(r.taxable_debit ?? 0);
              return (
                <tr key={`${r.fiscal_year}-${r.fiscal_period}-${r.tax_code}`} className="border-t border-slate-100">
                  <td className="px-2 py-1 font-mono text-xs">{r.fiscal_year}/{String(r.fiscal_period).padStart(2, '0')}</td>
                  <td className="px-2 py-1">{r.tax_code}</td>
                  <td className="px-2 py-1 text-right">{r.rate_percent != null ? `${r.rate_percent}%` : '—'}</td>
                  <td className="px-2 py-1 text-right">{Number(r.taxable_credit).toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{Number(r.taxable_debit).toFixed(2)}</td>
                  <td className="px-2 py-1 text-right font-bold">{net.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/* ── helpers ─────────────────────────────────── */

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 text-slate-700">
        {icon}
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
function Loading() {
  return <p className="text-slate-500 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-500 text-sm">{children}</p>;
}
