import { useMemo, useState } from 'react';
import { TrendingUp, MapPin, Users, BarChart3 } from 'lucide-react';
import { useApp } from '../lib/store';
import { FOCUS_RING, INPUT_FOCUS } from '../components/ds';
import { usePublicDriverEarnings } from '../hooks/usePublicDriverEarnings';
import { COUNTRY_PROFILES, findCountryProfile } from '../lib/country-profiles';
import type { PricingCountry } from '../lib/pricing-engine';

/**
 * Public driver-earnings page (acquisition funnel #2).
 *
 * Anonymized, view-backed aggregates per city in the prospect's
 * chosen market — drivers comparing platforms see real local
 * payout numbers BEFORE they sign up. The view (small-sample
 * threshold ≥3 drivers / ≥8 payouts per city) guarantees no
 * single-driver income leak even though the page is unauthenticated.
 */
export default function DriverEarningsPage() {
  const { setPage } = useApp();
  const [country, setCountry] = useState<PricingCountry>('us');
  const profile = findCountryProfile(country);
  const { rows, loading } = usePublicDriverEarnings(country.toUpperCase());

  /* Top-of-page summary: median across the country's covered cities,
   * plus how many cities + drivers we're aggregating. Reads as a
   * "your market is liquid" trust signal. */
  const summary = useMemo(() => {
    if (rows.length === 0) {
      return { medianAcrossCities: 0, totalDrivers: 0, totalPayouts90d: 0 };
    }
    const medians = rows.map(r => r.earningsMedian).sort((a, b) => a - b);
    const mid     = Math.floor(medians.length / 2);
    const med     = medians.length % 2 === 0
      ? Math.round((medians[mid - 1] + medians[mid]) / 2)
      : medians[mid];
    return {
      medianAcrossCities: med,
      totalDrivers:       rows.reduce((s, r) => s + r.driversActive, 0),
      totalPayouts90d:    rows.reduce((s, r) => s + r.earningsSum90d, 0),
    };
  }, [rows]);

  return (
    <main className="bg-slate-50 min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0b1f3a] via-[#0b1f3a] to-[#1a4a8a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-amber-300 text-[11px] font-bold tracking-[0.18em] uppercase mb-3">
            Driver earnings · live data
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">
            What drivers actually earn on FlyttGo
          </h1>
          <p className="text-white/70 max-w-2xl text-lg mb-8">
            Aggregate per-city payouts from the last 90 days. No marketing
            numbers — these are real escrow releases pulled live from the
            platform. Pick a market to see what your local corridor pays.
          </p>

          {/* Market selector */}
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-white/60 text-sm">Market:</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as PricingCountry)}
              className={`bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2.5 text-sm font-semibold appearance-none ${INPUT_FOCUS}`}
            >
              {COUNTRY_PROFILES.map(p => (
                <option key={p.code} value={p.code} className="text-slate-900">
                  {p.flag} {p.name} ({p.currency})
                </option>
              ))}
            </select>
            <button
              onClick={() => setPage('driver-onboarding')}
              className={`ml-auto inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition ${FOCUS_RING}`}
            >
              Apply to drive →
            </button>
          </div>
        </div>
      </section>

      {/* Summary KPIs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label={`Median payout · ${profile.name}`}
            value={loading ? '…' : fmt(summary.medianAcrossCities, profile.currency)}
            sub="across covered cities"
          />
          <KpiCard
            icon={<Users className="w-5 h-5" />}
            label="Active drivers"
            value={loading ? '…' : summary.totalDrivers.toLocaleString()}
            sub="payouts in last 90 days"
          />
          <KpiCard
            icon={<BarChart3 className="w-5 h-5" />}
            label="Total paid out · 90d"
            value={loading ? '…' : fmt(summary.totalPayouts90d, profile.currency)}
            sub="to drivers in this market"
          />
        </div>
      </section>

      {/* City breakdown */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-slate-900">Earnings by city</h2>
            <span className="text-xs text-slate-400 ml-auto">
              Cities with ≥3 active drivers and ≥8 payouts in the window.
            </span>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Loading market data…</div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-700 font-semibold mb-1">No payouts yet in this market</p>
              <p className="text-slate-500 text-sm">
                {profile.flag} {profile.name} is in earlier rollout phase. Be one
                of the first drivers to capture the corridor.
              </p>
              <button
                onClick={() => setPage('driver-onboarding')}
                className="mt-4 inline-flex items-center gap-2 bg-[#0B2E59] text-white px-5 py-2.5 rounded-xl text-sm font-bold"
              >
                Apply now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-6 py-3">City</th>
                    <th className="text-right px-6 py-3">Active drivers</th>
                    <th className="text-right px-6 py-3">Median / payout</th>
                    <th className="text-right px-6 py-3">Top 25% / payout</th>
                    <th className="text-right px-6 py-3">Payouts · 90d</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={`${r.country}-${r.city}`} className="border-t border-gray-100 hover:bg-slate-50">
                      <td className="px-6 py-3 font-semibold text-slate-900">{r.city}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{r.driversActive}</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">{fmt(r.earningsMedian, profile.currency)}</td>
                      <td className="px-6 py-3 text-right text-emerald-600 font-semibold">{fmt(r.earningsP75, profile.currency)}</td>
                      <td className="px-6 py-3 text-right text-slate-500">{r.payoutsTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-4 max-w-3xl">
          Earnings shown are per-payout amounts (a single completed booking)
          in the local market currency. Drivers typically complete several
          payouts per active week. Subscription tier and commission rate
          affect take-home — see the <button onClick={() => setPage('subscriptions')} className="underline hover:text-slate-600">tier comparison</button> for the math.
        </p>
      </section>
    </main>
  );
}

function KpiCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 text-amber-600 mb-2">{icon}<span className="text-xs font-bold uppercase tracking-wider">{label}</span></div>
      <div className="text-3xl font-extrabold text-slate-900">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

function fmt(amount: number, currency: string): string {
  if (!amount) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}
