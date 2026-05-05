import { useMemo, useState } from 'react';
import { Star, Truck } from 'lucide-react';
import CountryPage from '../../components/global/CountryPage';
import CountrySEOSection from '../../components/seo/CountrySEOSection';
import LiveBookingTicker from '../../components/global/LiveBookingTicker';
import { useApp } from '../../lib/store';
import type { Page } from '../../lib/store';
import { PROVIDERS } from '../../lib/providers-catalogue';
import { getProviderPublicIdentity } from '../../lib/provider-identity';
import { track } from '../../lib/analytics';

/**
 * USPage — US marketplace shopfront.
 *
 * Wraps the shared <CountryPage iso2="us" .../> with US-specific
 * conversion and credibility blocks layered above and below it:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ 1. Quick-quote bar  (5 fields → /book)        │
 *   │ 2. LiveBookingTicker  (social proof)           │
 *   │ 3. USDOT / FMCSA trust strip                   │
 *   │ 4. Corporate relocation entry panel            │
 *   ├──────────────────────────────────────────────┤
 *   │ <CountryPage iso2="us" ...>                    │
 *   ├──────────────────────────────────────────────┤
 *   │ 5. US provider list — filter + sort + cards    │
 *   │ 6. Institutional readiness ribbon              │
 *   └──────────────────────────────────────────────┘
 *
 * The blocks above the hero are kept compact (single rows) so the
 * country hero still owns the visual weight at first paint.
 */
export default function USPage() {
  const { setPage, setBookingData } = useApp();
  const go = (p: Page) => setPage(p);

  /* Quick-quote bar state. We forward the values to BookingFlow via
   * setBookingData so the funnel opens with the customer's inputs
   * already filled in. */
  const [pickupZip,   setPickupZip]   = useState('');
  const [dropoffZip,  setDropoffZip]  = useState('');
  const [moveDate,    setMoveDate]    = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');

  function startQuote() {
    track('us_market_quick_quote_submitted', {
      hasPickup:  !!pickupZip,
      hasDropoff: !!dropoffZip,
      hasDate:    !!moveDate,
      propertyType,
    });
    setBookingData({
      country:         'us',
      pickupAddress:   pickupZip,
      pickupPostcode:  pickupZip,
      dropoffAddress:  dropoffZip,
      dropoffPostcode: dropoffZip,
      moveDate,
      propertyType,
    });
    go('booking');
  }

  /* Stash ZIPs in the store on every keystroke so the homepage / hero
   * provider cards can render dynamic dispatch-style pricing without
   * waiting for the customer to click "Get price". Cheap (single
   * setBookingData call per change) and tracked under the existing
   * BookingData.{pickup,dropoff}Postcode fields. */
  function syncPickupZip(z: string) {
    setPickupZip(z);
    setBookingData({ pickupPostcode: z, pickupAddress: z });
  }
  function syncDropoffZip(z: string) {
    setDropoffZip(z);
    setBookingData({ dropoffPostcode: z, dropoffAddress: z });
  }

  return (
    <>
      {/* ─── TOP BAND — quick quote + ticker + trust + corporate ──
       *   Compact stack so the rich hero in <CountryPage> still
       *   owns the first viewport on desktop. */}
      <section className="bg-[#fafaf7] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Upgrade 1 — instant quote bar */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <p className="text-sm font-bold text-slate-900 mb-2">
              Get instant US moving price
            </p>
            <div className="grid md:grid-cols-5 gap-2">
              <input
                value={pickupZip}
                onChange={e => syncPickupZip(e.target.value)}
                placeholder="Pickup ZIP"
                aria-label="Pickup ZIP"
                inputMode="numeric"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              />
              <input
                value={dropoffZip}
                onChange={e => syncDropoffZip(e.target.value)}
                placeholder="Delivery ZIP"
                aria-label="Delivery ZIP"
                inputMode="numeric"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              />
              <input
                type="date"
                value={moveDate}
                onChange={e => setMoveDate(e.target.value)}
                aria-label="Move date"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              />
              <select
                value={propertyType}
                onChange={e => setPropertyType(e.target.value)}
                aria-label="Property type"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
              >
                <option>Apartment</option>
                <option>House</option>
                <option>Office</option>
                <option>Storage</option>
              </select>
              <button
                onClick={startQuote}
                className={`bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-lg px-4 py-2 text-sm transition ${FOCUS_RING}`}
              >
                Get price →
              </button>
            </div>
            {/* Upgrade 9 — distance estimator preview */}
            <p className="text-xs text-emerald-600 mt-2 font-medium">
              Example: Austin → Dallas ≈ $620 · 3 movers · 1 truck
            </p>
          </div>

          {/* Upgrade 4 — live marketplace activity ticker */}
          <LiveBookingTicker />

          {/* Upgrade 2 — USDOT compliance trust strip */}
          <div className="bg-slate-900 text-white rounded-xl px-6 py-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold justify-center">
              <span>USDOT licensed carriers</span>
              <span>FMCSA compliant</span>
              <span>$50,000 cargo insurance</span>
              <span>Escrow-secured payments</span>
            </div>
          </div>

          {/* Upgrade 5 — corporate relocation entry panel */}
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-2">
              Moving employees or students?
            </h3>
            <p className="text-sm text-slate-700 mb-3">
              FlyttGo supports HR relocation programs, universities,
              municipalities and government mobility frameworks.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { track('us_market_enterprise_clicked'); go('enterprise-relocation'); }}
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-4 py-2 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                Enterprise relocation →
              </button>
              <button
                onClick={() => { track('us_market_universities_clicked'); go('universities'); }}
                className={`bg-white border border-amber-200 hover:bg-amber-100 text-slate-900 font-bold px-4 py-2 rounded-lg transition ${FOCUS_RING}`}
              >
                University programs →
              </button>
            </div>
          </section>
        </div>
      </section>

      {/* ─── Existing rich CountryPage hero + sections ─────────────── */}
      <CountryPage
        seoSlot={<CountrySEOSection countryCode="us" languageCode="en" />}
        iso2="us" flag="🇺🇸"
        name="United States"
        localLabel="United States deployment node"
        positioning="The US marketplace coordinates labor-only crews, USDOT-licensed interstate carriers, packing services, storage networks, vehicle rental partners, and insurance options across all fifty states. FlyttGo is the coordination layer; the relocation itself is performed by independent licensed providers."
        rolloutPhase="Phase 1 of the global rollout. Live deployment in Austin, Atlanta, Dallas, Phoenix, and Charlotte, with progressive activation of Phase 2 metros through 2026 H2."
        compliance="FMCSA-aware verification. USDOT and MC numbers are surfaced for licensed motor carriers at provider onboarding. Sales tax, surety bonds, and FMCSA-mandated insurance are the licensed carrier's responsibility, not the marketplace's."
        services={[
          { title: 'Labor-only move support', description: 'Match with vetted moving labor crews for loading, unloading, and in-home moves. Bring your own vehicle or rental.' },
          { title: 'Licensed carrier matching', description: 'FMCSA-aware matching with USDOT-registered interstate and intrastate motor carriers for full-service relocations.' },
          { title: 'Truck rental coordination', description: 'Connect with truck rental partners and reserve the right vehicle alongside your labor or carrier booking.' },
          { title: 'Packing services', description: 'Coordinate packing crews, materials, and crating from independent packing service providers.' },
          { title: 'Storage partner integration', description: 'Self-storage and warehouse partners integrated into the move plan for staged or interstate timelines.' },
          { title: 'Insurance selection', description: 'Compare valuation coverage and third-party transit insurance options at the time of booking.' },
          { title: 'Enterprise relocation', description: 'Procurement, approvals, audit logs, and consolidated invoicing for HR, mobility, and operations teams.' },
          { title: 'University relocation', description: 'Move-in, move-out, and semester mobility coordination for universities and student housing offices.' },
        ]}
        providers={[
          { label: 'Licensed moving carrier (USDOT/MC)' },
          { label: 'Moving labor provider' },
          { label: 'Packing services provider' },
          { label: 'Storage facility partner' },
          { label: 'Vehicle rental partner' },
          { label: 'Freight forwarding partner' },
          { label: 'International relocation coordinator' },
          { label: 'University relocation partner' },
          { label: 'Corporate relocation vendor' },
        ]}
        operator="Wankong LLC (Delaware, United States)"
        specs={[
          { label: 'ISO code', value: 'US' },
          { label: 'Currency', value: 'USD' },
          { label: 'Jurisdiction', value: 'Federal · 50 states' },
          { label: 'Carrier framework', value: 'FMCSA / USDOT' },
          { label: 'Rollout phase', value: 'Phase 1 — Live' },
        ]}
        regions={['Austin, TX','Atlanta, GA','Dallas, TX','Phoenix, AZ','Charlotte, NC','Nashville, TN','Tampa, FL','Denver, CO']}
      />

      {/* ─── US PROVIDER LIST — filter + sort + cards ─────────────── */}
      <USProviderList go={go} />

      {/* ─── Upgrade 10 — institutional readiness ribbon ─────────── */}
      <section className="py-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-semibold text-slate-500">
            <span>Corporate relocation ready</span>
            <span>University corridors supported</span>
            <span>Municipality frameworks enabled</span>
            <span>Government mobility compliant</span>
          </div>
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * USProviderList
 *
 * Implements upgrades 3 (filter chips), 6 (sort dropdown), 7
 * (verification badges) and 8 (per-card book button) in one block.
 *
 * Source: src/lib/providers-catalogue, filtered to country='us'.
 * ───────────────────────────────────────────────────────────────── */

type SortKey = 'best' | 'price' | 'rating' | 'fastest';
type FilterKey = 'available_week' | 'under_800' | 'rating_4_8' | 'long_distance';

const FILTER_BTN =
  `px-4 py-2 rounded-full border text-sm font-semibold transition ${FOCUS_RING}`;

const BADGE =
  'text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-medium';

function USProviderList({ go }: { go: (p: Page) => void }) {
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set());
  const [sort,    setSort]    = useState<SortKey>('best');

  function toggleFilter(k: FilterKey) {
    setFilters(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  /* Crude but transparent price parser — pulls the first numeric run
   * out of the fromPrice string ("from $480" → 480). The same trick
   * the providers-directory page uses. */
  function parsePrice(s: string): number {
    const m = s.replace(/\s+/g, '').match(/(\d[\d.,]*)/);
    if (!m) return Number.POSITIVE_INFINITY;
    return Number(m[1].replace(/[.,]/g, '')) || Number.POSITIVE_INFINITY;
  }

  const providers = useMemo(() => {
    let list = PROVIDERS.filter(p => p.country === 'us');

    if (filters.has('available_week')) {
      list = list.filter(p => p.availability === 'available_now' || p.availability === 'slots_left');
    }
    if (filters.has('under_800')) {
      list = list.filter(p => parsePrice(p.fromPrice) < 800);
    }
    if (filters.has('rating_4_8')) {
      list = list.filter(p => p.rating >= 4.8);
    }
    if (filters.has('long_distance')) {
      list = list.filter(p => p.services.some(s => /long.?distance|interstate|cross.?country/i.test(s)));
    }

    const sorted = [...list];
    if (sort === 'price')        sorted.sort((a, b) => parsePrice(a.fromPrice) - parsePrice(b.fromPrice));
    else if (sort === 'rating')  sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === 'fastest') sorted.sort((a, b) => availabilityRank(a.availability) - availabilityRank(b.availability));
    /* 'best' = catalogue order. */

    return sorted;
  }, [filters, sort]);

  return (
    <section className="bg-[#fafaf7] py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
            US licensed providers
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Compare {providers.length} verified mover{providers.length === 1 ? '' : 's'}
          </h2>
        </div>

        {/* Upgrade 3 — filter chips */}
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter providers">
          <FilterChip active={filters.has('available_week')} onClick={() => toggleFilter('available_week')}>
            Available this week
          </FilterChip>
          <FilterChip active={filters.has('under_800')} onClick={() => toggleFilter('under_800')}>
            Under $800
          </FilterChip>
          <FilterChip active={filters.has('rating_4_8')} onClick={() => toggleFilter('rating_4_8')}>
            4.8+ rated
          </FilterChip>
          <FilterChip active={filters.has('long_distance')} onClick={() => toggleFilter('long_distance')}>
            Long-distance specialists
          </FilterChip>
        </div>

        {/* Upgrade 6 — sort dropdown */}
        <div className="flex justify-end mb-6">
          <label htmlFor="us-provider-sort" className="sr-only">Sort providers</label>
          <select
            id="us-provider-sort"
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none"
          >
            <option value="best">Sort: Best match</option>
            <option value="price">Lowest price</option>
            <option value="rating">Highest rated</option>
            <option value="fastest">Fastest availability</option>
          </select>
        </div>

        {providers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">
            No providers match your filters. Try removing one to widen the search.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {providers.map(p => {
              /* Mask the raw provider name behind the public identity
               * (FG-US-XXX-Y). Customers see a stable opaque handle
               * pre-booking; the brand name is unlocked in the
               * confirmation flow once escrow is funded. */
              const id = getProviderPublicIdentity(p);
              return (
              <article key={p.slug} className="bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition flex flex-col p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{id.displayName}</h3>
                  {p.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-1 rounded-md flex-shrink-0 ml-2">
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-3">{p.city}</p>

                <div className="flex items-center gap-3 mb-3 text-sm">
                  <span className="flex items-center gap-1">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <strong className="text-slate-900">{p.rating}</strong>
                    <span className="text-slate-500">({p.reviews})</span>
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Truck size={14} className="text-slate-400" />
                    <span className="text-xs">{p.fromPrice}</span>
                  </span>
                </div>

                {/* Upgrade 7 — verification badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={BADGE}>USDOT verified</span>
                  <span className={BADGE}>Insured</span>
                  <span className={BADGE}>Background checked</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 flex-1 mb-4">
                  {p.about}
                </p>

                {/* Upgrade 8 — instant booking on every card */}
                <button
                  onClick={() => {
                    track('us_provider_card_book_clicked', { slug: p.slug });
                    go('booking');
                  }}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-2 rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                  Book this mover →
                </button>
              </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${FILTER_BTN} ${
        active
          ? 'border-amber-400 bg-amber-50 text-amber-800'
          : 'border-slate-200 text-slate-600 hover:border-amber-400 hover:bg-amber-50'
      }`}
    >
      {children}
    </button>
  );
}

function availabilityRank(a: string | undefined): number {
  switch (a) {
    case 'available_now': return 0;
    case 'books_fast':    return 1;
    case 'slots_left':    return 2;
    case 'busy':          return 3;
    default:              return 4;
  }
}
