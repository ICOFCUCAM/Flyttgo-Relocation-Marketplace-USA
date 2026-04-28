import React, { useEffect, useState } from 'react';
import {
  Activity, Globe2, Users, Building2, AlertTriangle, DollarSign, Map,
  RefreshCw, Truck, PackageCheck, Warehouse, Plane, Pause,
} from 'lucide-react';
import {
  loadLiveOpsOverview, loadLiveOpsByCountry, loadProviderAvailability, loadLiveOpsRevenue,
  type LiveOpsOverview, type CountryActivityRow, type AvailabilityBucketRow,
  type RevenueSnapshot, type RevenuePeriod, type DeploymentStatus,
} from '../lib/live-ops-store';

/* ─────────────────────────────────────────────────────────────────
 * <LiveOpsControlCenter> — Mission-control admin surface
 *
 * Seven sections per the spec:
 *   1. Operations Overview        — global counts
 *   2. Regional Activity Map      — per-country breakdown
 *   3. Provider Availability      — capability heatmap (lat/lng grid)
 *   4. Enterprise Queue           — pending RFP / relocation
 *   5. Dispute Queue              — open / under-review / escalated
 *   6. Revenue Tracker            — today / week / month gross
 *   7. Deployment Status Monitor  — status pills per country
 *
 * Auto-refreshes every 30s; manual refresh button available. All
 * data flows through the live-ops RPCs in docs/install-live-ops.sql,
 * which RLS-restricts to admin callers (deployment_regions is
 * anon-readable; the rest run with caller privileges).
 * ───────────────────────────────────────────────────────────────── */

const REFRESH_INTERVAL_MS = 30_000;

const STATUS_TONE: Record<DeploymentStatus, { bg: string; text: string; ring: string; label: string }> = {
  operational: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Operational' },
  expanding:   { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    label: 'Expanding' },
  pilot:       { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   label: 'Pilot stage' },
  partner:     { bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200',  label: 'Partner-supported' },
  planned:     { bg: 'bg-slate-100',  text: 'text-slate-600',   ring: 'ring-slate-200',   label: 'Planned' },
};

function fmtUsd(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return '$0';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`;
  return `$${Math.round(v).toLocaleString()}`;
}

export default function LiveOpsControlCenter() {
  const [overview,   setOverview]   = useState<LiveOpsOverview | null>(null);
  const [byCountry,  setByCountry]  = useState<CountryActivityRow[]>([]);
  const [availability, setAvailability] = useState<AvailabilityBucketRow[]>([]);
  const [revenue,    setRevenue]    = useState<RevenueSnapshot | null>(null);
  const [period,     setPeriod]     = useState<RevenuePeriod>('today');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  async function fetchAll(period: RevenuePeriod) {
    setError(null);
    try {
      const [ov, bc, av, rv] = await Promise.all([
        loadLiveOpsOverview(),
        loadLiveOpsByCountry(),
        loadProviderAvailability(),
        loadLiveOpsRevenue(period),
      ]);
      setOverview(ov);
      setByCountry(bc);
      setAvailability(av);
      setRevenue(rv);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Could not load Live Ops data');
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchAll(period).finally(() => setLoading(false));
    const id = window.setInterval(() => fetchAll(period), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAll(period);
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-white rounded-xl border border-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
        <p className="font-semibold mb-1">Could not load Live Ops</p>
        <p className="text-xs">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-600" />
            Mission Control
          </h2>
          <p className="text-sm text-gray-500">
            Real-time platform signal · {lastFetched ? `Refreshed ${lastFetched.toLocaleTimeString()}` : 'loading…'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* 1. Operations Overview ─────────────────────────────────── */}
      <Section title="Operations Overview" icon={<Activity className="w-4 h-4" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Active jobs"          value={overview?.active_jobs ?? 0} tone="emerald" />
          <Stat label="Pending bookings"     value={overview?.pending_bookings ?? 0} tone="amber" />
          <Stat label="Booked today"         value={overview?.bookings_today ?? 0} />
          <Stat label="Scheduled tomorrow"   value={overview?.bookings_tomorrow ?? 0} />
          <Stat label="Pending applications" value={overview?.pending_applications ?? 0} tone="blue" />
          <Stat label="Open disputes"        value={overview?.open_disputes ?? 0} tone={overview && overview.open_disputes > 0 ? 'red' : 'slate'} />
          <Stat label="Open RFPs (7d)"       value={overview?.rfp_submissions_7d ?? 0} tone="violet" />
          <Stat label="Active paid subs"     value={overview?.active_paid_subscriptions ?? 0} />
          <Stat label="New apps (7d)"        value={overview?.new_provider_applications_7d ?? 0} />
          <Stat label="Open relocations"     value={overview?.open_relocation_requests ?? 0} tone="violet" />
          <Stat label="Gross today"          value={fmtUsd(overview?.gross_bookings_today_usd)} />
          <Stat label="Gross 7-day"          value={fmtUsd(overview?.gross_bookings_week_usd)} />
        </div>
      </Section>

      {/* 2. Regional Activity Map ──────────────────────────────── */}
      <Section title="Regional Activity Map" icon={<Globe2 className="w-4 h-4" />} subtitle="Per-country signal across every seeded deployment">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {byCountry.map(row => {
            const tone = STATUS_TONE[row.status];
            return (
              <article key={row.country_code} className={`bg-white border rounded-xl p-4 ring-1 ${tone.ring}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{row.flag}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{row.display_name}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{row.region}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tone.bg} ${tone.text}`}>
                    {tone.label}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-1.5 text-xs">
                  <Row label="Active jobs"   value={row.active_jobs} />
                  <Row label="Pending"       value={row.pending_bookings} />
                  <Row label="Enterprise"    value={row.enterprise_pending} />
                  <Row label="Disputes"      value={row.open_disputes} highlight={row.open_disputes > 0} />
                  <Row label="Onboarding"    value={row.providers_onboarding} />
                </dl>
              </article>
            );
          })}
        </div>
      </Section>

      {/* 3. Provider Availability Heatmap ──────────────────────── */}
      <Section title="Provider Availability" icon={<Map className="w-4 h-4" />} subtitle="Capability counts bucketed by 1° lat/lng grid">
        {availability.length === 0 ? (
          <p className="text-sm text-gray-500">No provider rows with home-base coordinates yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="text-left py-2 font-semibold">Grid (lat, lng)</th>
                  <th className="text-right py-2 font-semibold"><Users size={10} className="inline" /> Providers</th>
                  <th className="text-right py-2 font-semibold"><Truck size={10} className="inline" /> Trucks</th>
                  <th className="text-right py-2 font-semibold"><PackageCheck size={10} className="inline" /> Packing</th>
                  <th className="text-right py-2 font-semibold"><Warehouse size={10} className="inline" /> Storage</th>
                  <th className="text-right py-2 font-semibold"><Pause size={10} className="inline" /> On vacation</th>
                </tr>
              </thead>
              <tbody>
                {availability.slice(0, 20).map(row => (
                  <tr key={row.bucket} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs text-gray-700">{row.bucket}</td>
                    <td className="py-2 text-right font-semibold">{row.provider_count}</td>
                    <td className="py-2 text-right">{row.truck_count}</td>
                    <td className="py-2 text-right">{row.packing_count}</td>
                    <td className="py-2 text-right">{row.storage_count}</td>
                    <td className="py-2 text-right text-amber-600">{row.vacation_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {availability.length > 20 && (
              <p className="text-xs text-gray-400 mt-2 text-right">{availability.length - 20} more buckets …</p>
            )}
          </div>
        )}
      </Section>

      {/* 4. Enterprise Queue ───────────────────────────────────── */}
      <Section title="Enterprise Queue" icon={<Building2 className="w-4 h-4" />} subtitle="RFPs, government / NGO / corporate relocation requests — never mixed with consumer bookings">
        <div className="grid sm:grid-cols-3 gap-3">
          <Stat label="Open relocation requests" value={overview?.open_relocation_requests ?? 0} tone="violet" />
          <Stat label="RFPs (last 7 days)"        value={overview?.rfp_submissions_7d ?? 0} tone="violet" />
          <Stat label="Pilot countries active"    value={byCountry.filter(c => c.status === 'pilot').length} tone="amber" />
        </div>
      </Section>

      {/* 5. Dispute Queue ──────────────────────────────────────── */}
      <Section title="Dispute Queue" icon={<AlertTriangle className="w-4 h-4" />} subtitle="Open + escalated cases by region">
        {byCountry.filter(c => c.open_disputes > 0).length === 0 ? (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 inline-block">
            No open disputes. Trust quality green.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-100">
            {byCountry.filter(c => c.open_disputes > 0).map(row => (
              <li key={row.country_code} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{row.flag}</span>
                  <span className="text-sm font-semibold text-gray-900">{row.display_name}</span>
                  <span className="text-[10px] text-gray-500">{row.region}</span>
                </div>
                <span className="text-sm font-bold text-red-600">
                  {row.open_disputes} open
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 6. Revenue Activity Tracker ───────────────────────────── */}
      <Section title="Revenue Activity" icon={<DollarSign className="w-4 h-4" />} subtitle="Booking gross + subscription gross — naive USD aggregate">
        <div className="flex gap-2 mb-3 flex-wrap">
          {(['today', 'week', 'month'] as RevenuePeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                period === p ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={`Bookings (${revenue?.booking_count ?? 0})`} value={fmtUsd(revenue?.gross_bookings_usd)} tone="emerald" />
          <Stat label="New subscriptions" value={fmtUsd(revenue?.gross_subscriptions_usd)} tone="blue" />
          <Stat label="Total gross"       value={fmtUsd(revenue?.gross_total_usd)} />
          <Stat label="Since"             value={revenue?.since ?? '—'} />
        </div>
      </Section>

      {/* 7. Deployment Status Monitor ──────────────────────────── */}
      <Section title="Deployment Status Monitor" icon={<Plane className="w-4 h-4" />} subtitle="Coverage tier per country — drives the public readiness strip">
        <div className="flex flex-wrap gap-2">
          {byCountry.map(c => {
            const tone = STATUS_TONE[c.status];
            return (
              <span
                key={c.country_code}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${tone.bg} ${tone.text}`}
                title={`${c.display_name} · ${tone.label}`}
              >
                <span>{c.flag}</span>
                <span>{c.display_name}</span>
                <span className="opacity-60">· {tone.label}</span>
              </span>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* ── Internal layout helpers ────────────────────────────────── */

function Section({
  title, icon, subtitle, children,
}: {
  title:    string;
  icon:     React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="text-emerald-600">{icon}</span>
          {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Stat({
  label, value, tone = 'slate',
}: {
  label: string;
  value: number | string;
  tone?: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'violet';
}) {
  const TONE: Record<string, string> = {
    slate:   'text-gray-900',
    emerald: 'text-emerald-700',
    amber:   'text-amber-700',
    red:     'text-red-600',
    blue:    'text-blue-700',
    violet:  'text-violet-700',
  };
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5 truncate">{label}</p>
      <p className={`text-xl font-extrabold ${TONE[tone]}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-1">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</dd>
    </div>
  );
}
