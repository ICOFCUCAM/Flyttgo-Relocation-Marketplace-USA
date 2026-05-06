import { useMemo } from 'react';
import { Globe, ShieldCheck, Banknote, Building2 } from 'lucide-react';
import { COUNTRY_PROFILES } from '../../lib/country-profiles';
import { usePublicMarketplaceStats } from '../../hooks/usePublicMarketplaceStats';

/**
 * <GlobalPresence>
 *
 * "At-a-glance" stats panel that sits directly below the home-page
 * hero. Reads as infrastructure, not marketing — counts come from
 * the live rollout configuration (COUNTRY_PROFILES) so the panel
 * stays accurate as new markets unlock.
 *
 * Four signals, each picked because they map to a concrete trust
 * lever a relocation customer cares about:
 *
 *   1. Live markets       — proves the platform is global, not a
 *                            single-country app pretending to scale.
 *   2. Currencies         — proves payments aren't forced through USD;
 *                            providers and customers transact natively.
 *   3. Compliance regimes — proves regulatory awareness (FMCSA, GVOL,
 *                            GüKG, SIRET, etc.). Differentiates from
 *                            generic moving aggregators that pretend
 *                            licensing is the customer's problem.
 *   4. Escrow protection  — single hard guarantee customers can act on.
 *
 * Visual posture: minimal, clean numbers + tiny icon + caption.
 * Numbers animate when the panel scrolls into view (out of scope
 * here — wiring left to a follow-up if desired).
 */
export default function GlobalPresence() {
  /* Two sources, composed:
   *   - rollout config (COUNTRY_PROFILES) for the structural counts
   *     that don't move minute-to-minute (markets, currencies)
   *   - live SQL view for the operational counts the platform's
   *     activity actually reflects (approved providers, recent
   *     bookings). Falls back to config-derived numbers in the
   *     fraction of a second before the network round-trip lands. */
  const live   = usePublicMarketplaceStats();
  const config = useMemo(() => ({
    countries:   COUNTRY_PROFILES.length,
    currencies:  new Set(COUNTRY_PROFILES.map(c => c.currency)).size,
  }), []);

  const items = [
    {
      icon:  Globe,
      value: `${live.countriesTotal || config.countries}`,
      label: 'Markets activated',
      caption: 'Across North America, Europe, MENA & Africa',
    },
    {
      icon:  Banknote,
      value: `${live.currenciesTotal || config.currencies}`,
      label: 'Currencies supported',
      caption: 'Native settlement, no forced USD conversion',
    },
    {
      icon:  ShieldCheck,
      value: '11',
      label: 'Compliance regimes',
      caption: 'FMCSA · GVOL · GüKG · SIRET · Yrkestrafik & more',
    },
    {
      icon:  Building2,
      value: '100%',
      label: 'Escrow-protected bookings',
      caption: 'Funds held until the move is complete',
    },
  ];

  return (
    <section
      aria-label="Global presence"
      className="bg-white border-y border-slate-200/70"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {items.map(({ icon: Icon, value, label, caption }) => (
            <div key={label} className="flex flex-col">
              <Icon size={18} className="text-amber-500 mb-3" aria-hidden="true" />
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {value}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{label}</div>
              <div className="mt-1 text-xs text-slate-500 leading-relaxed">{caption}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
