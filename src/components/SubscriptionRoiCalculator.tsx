import { useMemo, useState } from 'react';
import { Calculator, ArrowRight } from 'lucide-react';
import { INPUT_FOCUS } from './ds';
import {
  SUBSCRIPTION_TIERS, findTier, localPriceForTier, type SubscriptionTier,
} from '../lib/subscription-tiers';
import { findCountryProfile } from '../lib/country-profiles';
import type { PricingCountry } from '../lib/pricing-engine';
import { usePublicDriverEarnings } from '../hooks/usePublicDriverEarnings';

/**
 * Subscription ROI calculator — interactive widget on /driver-subscriptions.
 *
 * Drivers slide a "monthly bookings" input and instantly see:
 *   - Subscription cost per month at the chosen tier
 *   - Estimated gross + commission cut + net take-home
 *   - Breakeven bookings vs the free Silver tier
 *
 * The per-payout estimate auto-pulls from the same public earnings
 * view powering /driver-earnings, so the math stays grounded in real
 * platform data instead of marketing assumptions. Falls back to a
 * conservative per-tier baseline if the view returns nothing for
 * the chosen market.
 */
export default function SubscriptionRoiCalculator({
  country,
  defaultTier = 'gold',
}: {
  country: PricingCountry;
  defaultTier?: SubscriptionTier['slug'];
}) {
  const [monthlyBookings, setMonthlyBookings] = useState(20);
  const [tierSlug,        setTierSlug]        = useState(defaultTier);
  const tier    = findTier(tierSlug);
  const profile = findCountryProfile(country);
  const { rows } = usePublicDriverEarnings(country.toUpperCase());

  /* Use the country-wide median payout from the live earnings view
   * as the per-booking baseline. Drops back to a tier-implied
   * baseline if the market has no data yet (newly-launched country). */
  const livePerPayout = useMemo(() => {
    if (rows.length === 0) return 0;
    const medians = rows.map(r => r.earningsMedian).sort((a, b) => a - b);
    return medians[Math.floor(medians.length / 2)] ?? 0;
  }, [rows]);

  const fallbackPerPayout = Math.round(180 * (profile.usdRate || 1));
  const perPayout         = livePerPayout || fallbackPerPayout;

  /* Math. Cost is monthly — daily-cadence tiers multiply by 30. */
  const monthlyCost = (() => {
    const local = localPriceForTier(tier, country);
    return tier.cadence === 'daily' ? local.amount * 30 : local.amount;
  })();
  const gross    = monthlyBookings * perPayout;
  const platform = Math.round(gross * tier.commissionPct);
  const net      = gross - platform - monthlyCost;

  /* Free Silver compare-against. */
  const silver         = findTier('silver');
  const silverNet      = gross - Math.round(gross * silver.commissionPct);
  const monthlyUplift  = net - silverNet;
  const breakeven      = monthlyUplift > 0
    ? Math.ceil(monthlyCost / Math.max(perPayout * (silver.commissionPct - tier.commissionPct), 1))
    : null;

  return (
    <div className="bg-gradient-to-br from-[#0b1f3a] via-[#0b1f3a] to-[#1a4a8a] rounded-2xl p-6 sm:p-8 text-white shadow-xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-amber-400/20 border border-amber-400/40 w-10 h-10 rounded-xl flex items-center justify-center">
          <Calculator className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Subscription ROI calculator</h3>
          <p className="text-white/60 text-xs">
            Per-payout figures pulled live from the {profile.flag} {profile.name} market
            {livePerPayout ? ' · real platform data' : ' · tier-implied baseline'}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
            Bookings per month
          </label>
          <input
            type="range" min={1} max={120} value={monthlyBookings}
            onChange={(e) => setMonthlyBookings(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
          <div className="flex justify-between text-xs text-white/50 mt-1">
            <span>1</span>
            <span className="text-amber-300 font-bold text-base">{monthlyBookings}</span>
            <span>120</span>
          </div>
        </div>
        <div>
          <label className="block text-white/70 text-xs font-bold uppercase tracking-wider mb-2">
            Tier
          </label>
          <select
            value={tierSlug}
            onChange={(e) => setTierSlug(e.target.value as SubscriptionTier['slug'])}
            className={`w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-semibold ${INPUT_FOCUS}`}
          >
            {SUBSCRIPTION_TIERS.map(t => (
              <option key={t.slug} value={t.slug} className="text-slate-900">
                {t.displayName} — {Math.round(t.commissionPct * 100)}% commission
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Math grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Subscription / mo"   value={fmt(monthlyCost, profile.currency)} tone="neutral" />
        <Stat label="Gross / mo"          value={fmt(gross,       profile.currency)} tone="neutral" />
        <Stat label="Platform commission" value={`–${fmt(platform, profile.currency)}`} tone="warning" />
        <Stat label="Take-home / mo"      value={fmt(net,         profile.currency)} tone="success" highlight />
      </div>

      {breakeven !== null ? (
        <div className="bg-emerald-500/15 border border-emerald-400/40 rounded-xl p-4 flex items-center gap-3">
          <ArrowRight className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <p className="text-sm text-emerald-100">
            Break even on the <strong>{tier.displayName}</strong> subscription at <strong>~{breakeven} bookings</strong>/month vs free Silver.
            At {monthlyBookings} bookings, you keep an extra <strong>{fmt(Math.max(monthlyUplift, 0), profile.currency)}</strong> per month.
          </p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/70">
          Free Silver gives you the same take-home at this volume. Upgrade once you're hitting more bookings.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone, highlight }: {
  label: string; value: string; tone: 'neutral' | 'success' | 'warning'; highlight?: boolean;
}) {
  const color =
    tone === 'success' ? 'text-emerald-300' :
    tone === 'warning' ? 'text-amber-300' :
                          'text-white';
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'bg-emerald-500/15 border border-emerald-400/40' : 'bg-white/5 border border-white/10'}`}>
      <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1">{label}</div>
      <div className={`font-bold text-lg ${color}`}>{value}</div>
    </div>
  );
}

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}
