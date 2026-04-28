/* ─────────────────────────────────────────────────────────────────
 * US relocation marketplace pricing intelligence.
 *
 * Canonical, customer-facing rate ranges anchored on real US market
 * data (BLS, MoveBuddha, HireAHelper, MovingHelp). Used by the
 * /pricing transparency page and surfaced per-category on the six
 * service-category landing pages.
 *
 * NOT the booking calculator's source of truth — that lives in
 * lib/constants.ts (PRICING) and the calculate-price edge function.
 * This module is a public-facing transparency layer so customers
 * can see what FlyttGo's marketplace pricing reflects against
 * national averages before they commit to a booking.
 *
 * If you update a tier here, also reconsider:
 *   - PRICING.hourlyRates in constants.ts (calculator inputs)
 *   - the per-category copy on ServiceCategoryPage
 *   - the marketing-side claims on PricingPage / FAQ
 * ───────────────────────────────────────────────────────────────── */

export interface PricingRange {
  min:    number;
  max:    number;
  /** USD by default. Reserved for future country expansion. */
  ccy?:   'USD';
  /** "/hr per mover", "/hr per crew", "flat", "per move" — copy hint. */
  unit:   string;
}

export interface PricingTier {
  /** URL-safe slug — also used to cross-reference from
   *  ServiceCategory.pricingTier in service-categories.ts. */
  slug:        string;
  name:        string;
  /** Short marketing tagline. */
  tagline:     string;
  /** Per-mover or per-crew rate range that customers should expect. */
  marketRange: PricingRange;
  /** What FlyttGo specifically targets (curated, may differ from
   *  the broader market range). Customers see this as "On FlyttGo:". */
  flyttgoRange: PricingRange;
  /** What's typically included in the rate. */
  includes:    string[];
  /** Common cost drivers customers should know about. */
  drivers:     string[];
  /** Hourly model? Some categories (long-distance) are flat/per-move. */
  isHourly:    boolean;
  /** Optional note shown beneath the range card. */
  note?:       string;
}

export const US_PRICING_TIERS: PricingTier[] = [
  {
    slug:    'labor-only',
    name:    'Labor-only crews (no truck)',
    tagline: 'Most common entry-level service · highest booking frequency',
    marketRange:  { min: 40, max: 100, unit: '/hr per mover',  ccy: 'USD' },
    flyttgoRange: { min: 60, max: 120, unit: '/hr per mover',  ccy: 'USD' },
    includes: [
      'Loading + unloading muscle',
      'Moving blankets, straps, and dollies',
      'Furniture protection during transit',
      'Two-hour minimum on every booking',
    ],
    drivers: [
      'Crew size (2 / 3 / 4 movers)',
      'Stairs, elevator access, long carries',
      'Hourly rate × time used (not flat-quoted)',
    ],
    isHourly: true,
    note:     'Customer brings their own truck or rental. Two movers handle most studio/1-bed apartments; three+ recommended for larger homes.',
  },
  {
    slug:    'local',
    name:    'Movers + truck · local moves',
    tagline: 'Standard local service across all US metros',
    marketRange:  { min: 80,  max: 125, unit: '/hr per crew', ccy: 'USD' },
    flyttgoRange: { min: 120, max: 250, unit: '/hr per crew', ccy: 'USD' },
    includes: [
      '2-mover crew + moving truck',
      'Basic equipment + materials',
      'Goods-in-transit insurance up to $50k per booking',
      'Live ETA + on-arrival tracking',
    ],
    drivers: [
      'Truck size (16 ft / 24 ft / 26 ft)',
      'Local mileage + fuel surcharge',
      'Stairs / parking access',
      'Insurance coverage tier',
    ],
    isHourly: true,
  },
  {
    slug:    'premium-metro',
    name:    'Premium metro rates',
    tagline: 'NYC / LA / Boston / DC / SF — higher labor + insurance costs',
    marketRange:  { min: 95,  max: 180, unit: '/hr per mover', ccy: 'USD' },
    flyttgoRange: { min: 110, max: 220, unit: '/hr per mover', ccy: 'USD' },
    includes: [
      'Metro-licensed crew (city-specific permits)',
      'Building COI (certificate of insurance)',
      'Concierge / doorman coordination',
      'Off-hours and weekend availability',
    ],
    drivers: [
      'Building requirements (COI, freight elevator)',
      'Parking permit / loading-zone reservation',
      'Walkup vs elevator',
      'After-hours surcharge',
    ],
    isHourly: true,
    note:     'Major metro areas typically run 30–60% above the national average for the same crew size due to labor costs, insurance, and permit complexity.',
  },
  {
    slug:    'packing',
    name:    'Packing services',
    tagline: 'Full-pack, partial-pack, fragile-only crating',
    marketRange:  { min: 35, max: 85, unit: '/hr per packer', ccy: 'USD' },
    flyttgoRange: { min: 40, max: 90, unit: '/hr per packer', ccy: 'USD' },
    includes: [
      'Boxes, paper, tape, fragile-wrap (materials cost added)',
      'Itemised inventory + photo log',
      'Fragile-item protection + crating',
      'Customer signs off inventory before truck loads',
    ],
    drivers: [
      'Pack scope (full / kitchen-only / fragile-only)',
      'Materials volume',
      'Crating for high-value items',
    ],
    isHourly: true,
    note:     'Often billed separately from the move itself. Many customers book a packing-only crew the day before move day.',
  },
  {
    slug:    'long-distance',
    name:    'Long-distance / interstate',
    tagline: 'Cross-state moves — not billed hourly',
    marketRange:  { min: 2_500, max: 10_000, unit: 'per move', ccy: 'USD' },
    flyttgoRange: { min: 1_800, max: 9_500,  unit: 'per move', ccy: 'USD' },
    includes: [
      'FMCSA-registered interstate carrier (USDOT + MC numbers)',
      'Goods-in-transit insurance',
      'Live load tracking + ETA',
      'Escrow protection until delivery confirmed',
    ],
    drivers: [
      'Distance (miles + interstate corridor)',
      'Volume + weight of shipment',
      'Storage staging between origin + destination',
      'Valuation-coverage tier',
      'Scheduling flexibility (peak vs off-peak)',
    ],
    isHourly: false,
    note:     'Interstate moves are priced by distance × volume × weight × scope, not by the hour. Peak season (May–August) typically adds 15–25% on top of the off-peak quote.',
  },
  {
    slug:    'corporate',
    name:    'Corporate relocation coordination',
    tagline: 'Workforce mobility · enterprise margins',
    marketRange:  { min: 125, max: 300, unit: '/hr per coordinator', ccy: 'USD' },
    flyttgoRange: { min: 150, max: 300, unit: '/hr per coordinator', ccy: 'USD' },
    includes: [
      'Single point of contact for HR / Mobility',
      'Audit-ready expense reporting + tagged cost centres',
      'Supplier orchestration (movers, storage, freight, temp housing)',
      'Compliance + duty-of-care documentation',
    ],
    drivers: [
      'Headcount + relocation calendar density',
      'International leg (visa, customs, lift-vans)',
      'Storage chaining between origin + destination',
      'SLA tier (response time, dedicated account manager)',
    ],
    isHourly: true,
    note:     'Corporate relocation is FlyttGo\'s highest-margin segment. Accounts run on either monthly retainer or hourly billing depending on volume.',
  },
];

export function findPricingTier(slug: string | null | undefined): PricingTier | undefined {
  if (!slug) return undefined;
  return US_PRICING_TIERS.find(t => t.slug === slug);
}

/** Format a PricingRange for display ("$60–$120/hr per mover"). */
export function formatPricingRange(r: PricingRange): string {
  const fmt = (n: number) => `$${n.toLocaleString('en-US')}`;
  return `${fmt(r.min)}–${fmt(r.max)}${r.unit}`;
}

/* ── Marketplace commission posture ───────────────────────────────
 * The platform's commission band — surfaced on the pricing page
 * for transparency, and used by FAQ copy. The driver-facing detail
 * (per-tier %) lives in COMMISSION + SUBSCRIPTION_PLANS in
 * lib/constants.ts; this is the customer-facing summary. */
export const MARKETPLACE_COMMISSION = {
  band:    { min: 0.10, max: 0.25 },
  example: { customerPays: 180, marketplaceKeeps: { min: 18, max: 45 } },
};

/* ── Strategic positioning copy ───────────────────────────────────
 * Used on /pricing to explain why FlyttGo leads with labor-only +
 * coordination instead of full-service moving — directly mirrors
 * the strategic insight the data points to. */
export const STRATEGIC_POSITIONING = {
  headline: 'The biggest US relocation opportunity is coordination, not hauling.',
  rationale: [
    'Labor-only crews onboard in days, not months — no FMCSA carrier registration required.',
    'Lower insurance exposure than full-service interstate carriers.',
    'Higher booking frequency → more reviews → higher trust signals → better matching.',
    'Enterprise relocation coordination carries the highest per-hour margin in the stack.',
  ],
};
