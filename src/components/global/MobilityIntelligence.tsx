import { useMemo } from 'react';
import { TrendingUp, ArrowRight, Calendar, MapPin } from 'lucide-react';
import { CROSS_BORDER_CORRIDORS } from '../../lib/cross-border-corridors';
import { EXPANSION_CITIES } from '../../lib/expansion-cities';
import { useApp } from '../../lib/store';
import { track } from '../../lib/analytics';
import { FOCUS_RING } from '../ds';

/**
 * <MobilityIntelligence>
 *
 * Public, anonymized mobility insights surface. The marketplace
 * carries a registry of cross-border corridors and anchor cities
 * already; this component turns that registry into a customer-facing
 * read on platform activity:
 *
 *   - Active corridors count + 4 highest-traffic pairs as chips
 *   - Anchor-city count
 *   - Seasonal indicator (peak window for relocation demand)
 *
 * No personal data, no booking-level disclosure — only aggregate
 * counts derived from the canonical registries. As live booking
 * data lands in Supabase, the season window can swap for a
 * dynamic top-corridor query without changing the UI shape.
 */
export default function MobilityIntelligence() {
  const { setPage } = useApp();

  const stats = useMemo(() => {
    const allCorridors = CROSS_BORDER_CORRIDORS;
    const highFreq     = allCorridors.filter(c => c.isHighFrequency);
    const anchorCities = EXPANSION_CITIES.filter(c => c.anchorFlag);
    return {
      corridorsTotal:    allCorridors.length,
      highFreqCorridors: highFreq.slice(0, 4),
      anchorCount:       anchorCities.length,
    };
  }, []);

  /* Peak demand window — tied to the relocation calendar (May–Aug
   * is the universal high-volume corridor window across markets:
   * US summer move season, EU university intake, Nordic moving
   * permits clustering before fall). Static for now; a Supabase
   * view over completed bookings can replace this later. */
  const peakWindow = 'May → August';
  const peakNote   = 'Plan 4–6 weeks ahead for corridor moves';

  function openMarketplace() {
    track('mobility_intel_cta_clicked');
    setPage('marketplace');
  }

  return (
    <section
      aria-label="Mobility intelligence"
      className="bg-[#fafaf7] border-b border-slate-200/70"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="flex items-end justify-between mb-8 gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 mb-2">
              Mobility intelligence
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How people are moving across the network
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              Anonymised view of corridor activity and seasonal patterns —
              derived from the active rollout registry. No customer or provider
              data is exposed.
            </p>
          </div>
          <button
            type="button"
            onClick={openMarketplace}
            className={`hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 hover:text-amber-600 transition rounded ${FOCUS_RING}`}
          >
            Explore marketplace <ArrowRight size={14} />
          </button>
        </div>

        {/* Three-stat row + corridor chip row beneath. */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Stat
            icon={TrendingUp}
            value={`${stats.corridorsTotal}`}
            label="Cross-border corridors"
            caption="Tracked across the active + activating markets"
          />
          <Stat
            icon={MapPin}
            value={`${stats.anchorCount}`}
            label="Anchor cities"
            caption="Designated dispatch hubs in expansion markets"
          />
          <Stat
            icon={Calendar}
            value={peakWindow}
            label="Peak relocation window"
            caption={peakNote}
          />
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            High-frequency corridors
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.highFreqCorridors.map(c => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  track('mobility_intel_corridor_clicked', { slug: c.slug });
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', `/corridor/${c.slug}`);
                  }
                  setPage('corridor');
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className={`inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition ${FOCUS_RING}`}
                aria-label={`Open ${c.fromCity} to ${c.toCity} corridor`}
              >
                {c.fromCity}
                <ArrowRight size={11} className="text-slate-400" />
                {c.toCity}
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-amber-100 text-amber-800 uppercase">
                  {c.fromCountry} → {c.toCountry}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon, value, label, caption,
}: {
  icon:    typeof TrendingUp;
  value:   string;
  label:   string;
  caption: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-amber-500" aria-hidden="true" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{caption}</p>
    </div>
  );
}
