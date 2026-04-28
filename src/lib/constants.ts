export const IMAGES = {
  hero: {
    truck:    'https://d64gsuwffb70l.cloudfront.net/69b48d1c24a3a59014dde38a_1773440407421_d3f9f76f.jpg',
    students: 'https://d64gsuwffb70l.cloudfront.net/69b9877aa085bb4df2a9da28_1773766787761_26698bc2.jpg',
    office:   'https://d64gsuwffb70l.cloudfront.net/69b9877aa085bb4df2a9da28_1773766806786_1db52f56.jpg',
    truck1:   'https://d64gsuwffb70l.cloudfront.net/69bc733e874094bcf729aca5_1773958078738_546d64ee.png',
    students1:'https://d64gsuwffb70l.cloudfront.net/69b4405628b40c8fdc7aad59_1773420774101_dae0e521.jpg',
    truck2:   'https://d64gsuwffb70l.cloudfront.net/69b087fd736aea2f6794825c_1773176964888_38e0b100.png',
    office1:  'https://d64gsuwffb70l.cloudfront.net/69b4405628b40c8fdc7aad59_1773420953628_819790d3.png',
  },
  vans: {
    small:  'https://d64gsuwffb70l.cloudfront.net/69b9877aa085bb4df2a9da28_1773766826645_9815a390.jpg',
    medium: 'https://d64gsuwffb70l.cloudfront.net/69b1b470fdd1af7483a60acc_1773254090722_f15449ab.jpg',
    large:  'https://d64gsuwffb70l.cloudfront.net/69b9877aa085bb4df2a9da28_1773766864624_6c352d16.jpg',
    luton:  'https://d64gsuwffb70l.cloudfront.net/69b9877aa085bb4df2a9da28_1773766884259_1c23e623.jpg',
  },
  cities: {
    newyork:     'https://d64gsuwffb70l.cloudfront.net/69b1b470fdd1af7483a60acc_1773254219729_b5ff9b2f.png',
    losangeles:  'https://d64gsuwffb70l.cloudfront.net/69b9877aa085bb4df2a9da28_1773766928662_87629067.jpg',
    chicago:     'https://d64gsuwffb70l.cloudfront.net/69b9877aa085bb4df2a9da28_1773766947844_0aef96e0.jpg',
  },
  movers: 'https://d64gsuwffb70l.cloudfront.net/69b087fd736aea2f6794825c_1773177274288_a53014fe.jpg',
};

export const HERO_SLIDES = [
  { key: 'Marketplace', image: IMAGES.hero.truck,     title: 'Relocation Marketplace Infrastructure for the United States', subtitle: 'FlyttGo connects households, businesses, and institutions with licensed moving carriers, relocation crews, storage providers, packing services, truck rental partners, and insurance options — coordinated through a single digital platform.', cta: 'Browse the Marketplace' },
  { key: 'Coordination', image: IMAGES.hero.students,  title: 'One Platform. Every Relocation Provider.',                    subtitle: 'Find labor-only crews, licensed interstate carriers, storage integrations, and packing teams in one coordination layer — with transparent pricing and FMCSA-aware verification.', cta: 'See How It Works' },
  { key: 'Enterprise',  image: IMAGES.hero.office,    title: 'Enterprise Relocation Coordination',                          subtitle: 'Workflow tools for corporate mobility programs, university housing offices, and multi-site operators. Centralized procurement, audit-ready records, consolidated billing.', cta: 'Enterprise Programs' },
  { key: 'Marketplace', image: IMAGES.hero.truck1,    title: 'Relocation Marketplace Infrastructure for the United States', subtitle: 'FlyttGo connects households, businesses, and institutions with licensed moving carriers, relocation crews, storage providers, packing services, truck rental partners, and insurance options — coordinated through a single digital platform.', cta: 'Browse the Marketplace' },
  { key: 'Coordination', image: IMAGES.hero.students1, title: 'One Platform. Every Relocation Provider.',                    subtitle: 'Find labor-only crews, licensed interstate carriers, storage integrations, and packing teams in one coordination layer — with transparent pricing and FMCSA-aware verification.', cta: 'See How It Works' },
  { key: 'Marketplace', image: IMAGES.hero.truck2,    title: 'Relocation Marketplace Infrastructure for the United States', subtitle: 'FlyttGo connects households, businesses, and institutions with licensed moving carriers, relocation crews, storage providers, packing services, truck rental partners, and insurance options — coordinated through a single digital platform.', cta: 'Browse the Marketplace' },
  { key: 'Enterprise',  image: IMAGES.hero.office,    title: 'Enterprise Relocation Coordination',                          subtitle: 'Workflow tools for corporate mobility programs, university housing offices, and multi-site operators. Centralized procurement, audit-ready records, consolidated billing.', cta: 'Enterprise Programs' },
];

export const VAN_TYPES = [
  { id: 'small_van',  name: 'Small Van',   image: IMAGES.vans.small,  capacity: '105–140 ft³', payload: '1100–2000 lb', examples: ['Ford Transit Connect','Ram ProMaster City','Chevrolet City Express'], bestFor: ['Small deliveries','Student moves','Luggage transport'],        items: ['Suitcases','Small boxes','Chairs','TV'],              pricePerHour: 85 },
  { id: 'medium_van', name: 'Medium Van',  image: IMAGES.vans.medium, capacity: '210–315 ft³', payload: '2000–2600 lb', examples: ['Ford Transit Mid-Roof','Mercedes Metris','Ram ProMaster 1500'],          bestFor: ['Studio moves','Small apartment moves','Furniture delivery'],    items: ['Sofa','Fridge','Bed frame','10–15 boxes'],            pricePerHour: 115 },
  { id: 'large_van',  name: 'Large Van',   image: IMAGES.vans.large,  capacity: '385–525 ft³', payload: '2600–3300 lb', examples: ['Mercedes Sprinter','Ford Transit High-Roof','Ram ProMaster 2500'],       bestFor: ['1–2 bedroom moves','Large furniture','Storage unit transport'], items: ['Wardrobe','Dining table','Bed','25 boxes'],           pricePerHour: 150 },
  { id: 'luton_van',  name: 'Box Truck',   image: IMAGES.vans.luton,  capacity: '630–700 ft³', payload: '2200–2600 lb', examples: ['16 ft Box Truck with Liftgate'],                                          bestFor: ['2–3 bedroom house moves','Office relocation','Heavy furniture'], items: ['Beds','Wardrobes','Large sofas','35+ boxes'],         pricePerHour: 190 },
];

/**
 * Subscription plans aligned with VanMan-UK's canonical 5-tier system.
 * The plan id is the value written into `drivers.tier` on the shared
 * Supabase backend — every site (FlyttGo, Global Relocation USA,
 * VanMan-UK) uses the same identifiers so a driver registered on one
 * surface is recognised by all of them.
 */
export const SUBSCRIPTION_PLANS = [
  { id: 'silver',      name: 'Silver',      price: 0,   period: '/mo',  commissionRate: 30, dispatchPriority: 'Standard',  priorityLevel: 1, popular: false, jobVisibility: 'All jobs', features: ['30% platform commission','Standard job queue access','Verified driver badge','Goods-in-transit insurance included','Weekly BACS payout','Community support forum'] },
  { id: 'silver_plus', name: 'Silver Plus', price: 29,  period: '/day', commissionRate: 25, dispatchPriority: 'Moderate',  priorityLevel: 2, popular: false, jobVisibility: 'All jobs', features: ['25% platform commission — save 5%','Moderate dispatch priority','Silver Plus profile badge','Enhanced insurance coverage','Weekly BACS payout','24/7 driver support'] },
  { id: 'gold',        name: 'Gold',        price: 49,  period: '/day', commissionRate: 20, dispatchPriority: 'High',      priorityLevel: 3, popular: true,  jobVisibility: 'All jobs', features: ['20% platform commission','High dispatch priority','Gold profile badge & trust seal','Premium insurance coverage','Bi-weekly BACS payout','Dedicated account manager'] },
  { id: 'gold_pro',    name: 'Gold Pro',    price: 79,  period: '/mo',  commissionRate: 15, dispatchPriority: 'Very High', priorityLevel: 4, popular: false, jobVisibility: 'All jobs', features: ['15% platform commission','Very high dispatch priority','Gold Pro badge + featured listing','Corporate job access','Weekly BACS payout','Priority phone support'] },
  { id: 'elite',       name: 'Elite',       price: 129, period: '/mo',  commissionRate: 10, dispatchPriority: 'Highest',   priorityLevel: 5, popular: false, jobVisibility: 'All jobs', features: ['10% platform commission','First access to ALL jobs','Elite badge + top of marketplace','Corporate & enterprise accounts','Same-day BACS payout','Personal account manager'] },
] as const;

/**
 * Commission and cash-deposit constants — lifted from VanMan-UK so the
 * three marketplaces compute the same numbers against the shared
 * Supabase booking row. Update only if VanMan-UK updates first.
 */
export const COMMISSION = {
  silver:            0.30,  // 30%
  silver_plus:       0.25,  // 25%
  gold:              0.20,  // 20%
  gold_pro:          0.15,  // 15%
  elite:             0.10,  // 10%
  /** Share of the booking total charged online up front when the
   *  customer chooses cash on delivery. The remainder (1 - cashDeposit)
   *  is paid in cash to the driver on completion. */
  cashDeposit:       0.30,
  /** Below this job value the platform takes 0% commission (drivers
   *  keep the full amount as a small-job incentive). */
  smallJobThreshold: 50,
};

/* Phase 1 launch cities — initial US rollout footprint.
 * Provider counts represent verified marketplace participants; bookings reflect
 * cumulative coordinated relocations.
 */
export const CITIES = [
  { name: 'Austin',    slug: 'austin',    state: 'TX', image: IMAGES.cities.newyork,    drivers: 180, bookings: '4,200+', phase: 1 },
  { name: 'Atlanta',   slug: 'atlanta',   state: 'GA', image: IMAGES.cities.chicago,    drivers: 210, bookings: '5,100+', phase: 1 },
  { name: 'Dallas',    slug: 'dallas',    state: 'TX', image: IMAGES.cities.losangeles, drivers: 240, bookings: '6,800+', phase: 1 },
  { name: 'Phoenix',   slug: 'phoenix',   state: 'AZ', image: IMAGES.cities.newyork,    drivers: 160, bookings: '3,900+', phase: 1 },
  { name: 'Charlotte', slug: 'charlotte', state: 'NC', image: IMAGES.cities.chicago,    drivers: 140, bookings: '3,200+', phase: 1 },
];

/* Marketplace coordination categories.
 * FlyttGo does not perform any of these services directly — it coordinates
 * matching between customers and licensed independent providers.
 */
export const SERVICES = [
  { name: 'Labor-Only Move Support',       icon: 'truck',      description: 'Match with vetted moving labor crews for loading, unloading, and in-home moves. Bring your own vehicle or rental.' },
  { name: 'Licensed Carrier Matching',     icon: 'sofa',       description: 'FMCSA-aware matching with USDOT-registered interstate and intrastate motor carriers for full-service relocations.' },
  { name: 'Truck Rental Coordination',     icon: 'building',   description: 'Connect with truck rental partners and reserve the right vehicle alongside your labor or carrier booking.' },
  { name: 'Packing Services',              icon: 'box',        description: 'Coordinate packing crews, materials, and crating from independent packing service providers.' },
  { name: 'Temporary Storage Integration', icon: 'graduation', description: 'Self-storage and warehouse partners integrated into the move plan for staged or interstate timelines.' },
  { name: 'Insurance Options Selection',   icon: 'clock',      description: 'Compare valuation coverage and third-party transit insurance options at the time of booking.' },
  { name: 'Corporate Relocation Workflows',icon: 'building',   description: 'Procurement, approvals, audit logs, and consolidated invoicing for HR, mobility, and operations teams.' },
  { name: 'University Relocation Support', icon: 'graduation', description: 'Move-in and move-out coordination for universities, student housing offices, and Greek organizations.' },
];

export const TESTIMONIALS = [
  { name: 'Emily Johnson',  city: 'Austin',    rating: 5, text: 'FlyttGo matched us with a vetted labor crew in under 30 minutes. Transparent pricing and the audit trail made expense reporting trivial.' },
  { name: 'Michael Chen',   city: 'Dallas',    rating: 5, text: 'We coordinate dozens of corporate relocations a quarter through FlyttGo. The provider variety and consolidated billing are unmatched.' },
  { name: 'Jessica Martinez',city: 'Atlanta',   rating: 5, text: 'University housing used the platform for 1,200 student move-ins. The compliance disclosures kept procurement happy.' },
  { name: 'David Wilson',   city: 'Phoenix',   rating: 4, text: 'Great marketplace for finding licensed interstate carriers with USDOT verification. Made our cross-state move stress-free.' },
];

export const HOW_IT_WORKS = [
  { step: 1, title: 'Describe Your Relocation',     description: 'Origin, destination, scope, and timeline. The marketplace generates a coordinated plan across labor, carrier, storage, and packing categories.' },
  { step: 2, title: 'Compare Verified Providers',   description: 'See licensed carriers with USDOT/MC numbers, vetted labor crews, and rated independent providers — with transparent line-item pricing.' },
  { step: 3, title: 'Book & Coordinate Securely',   description: 'Funds are held in escrow until the provider confirms completion. Insurance options are disclosed before booking.' },
  { step: 4, title: 'Track & Document',             description: 'Real-time coordination, status updates, and an audit-ready record retained for procurement, insurance, and tax purposes.' },
];

/* Geographic rollout plan — published expansion timeline for the platform. */
export const ROLLOUT_PHASES = [
  { phase: 1, label: 'Live now',     timeline: '2026',      cities: ['Austin','Atlanta','Dallas','Phoenix','Charlotte'] },
  { phase: 2, label: 'In activation', timeline: '2026 H2',  cities: ['Nashville','Tampa','Denver','Raleigh','Salt Lake City'] },
  { phase: 3, label: 'Planned',       timeline: '2027 H1',  cities: ['Houston','Orlando','Indianapolis','Columbus','Kansas City'] },
  { phase: 4, label: 'Expansion',     timeline: '2027 H2+', cities: ['Northeast corridor','West Coast metros','Mountain West','Pacific Northwest'] },
];

/* Marketplace participant categories. */
export const PARTICIPANTS = [
  { id: 'household_local',     label: 'Households relocating locally',  icon: 'home' },
  { id: 'household_interstate',label: 'Interstate movers',              icon: 'route' },
  { id: 'licensed_carrier',    label: 'Licensed moving carriers',        icon: 'truck' },
  { id: 'crew',                label: 'Independent relocation crews',    icon: 'users' },
  { id: 'storage',             label: 'Self-storage providers',          icon: 'box' },
  { id: 'university',          label: 'Universities & student housing',  icon: 'graduation' },
  { id: 'corporate',           label: 'Corporate relocation programs',   icon: 'building' },
];

export const PRICING = {
  hourlyRates: {
    '1_driver_van':  { min: 85,  max: 95  },
    '2_movers_van':  { min: 115, max: 130 },
    '3_movers_van':  { min: 150, max: 190 },
  },
  minimumHours: 2,
  // Distances are in miles for the US market.
  distancePricing: { includedKm: 12, extraPerKm: 1.3 },
  extras: { extra_helper: 35, furniture_assembly: 25, cleaning: 40, parking_assistance: 20, packing_service: 50, furniture_dismantling: 30 },
  // Sales tax varies by US state. Set 0 here; calculate per-state at checkout.
  vat: 0,
};

/**
 * Commission for a job value, given the driver's plan id. Mirrors
 * VanMan-UK's calculateCommission so the released-escrow trigger and
 * the customer-facing earning preview compute identical numbers.
 *
 *   - Below COMMISSION.smallJobThreshold the platform takes 0%
 *   - Otherwise the rate is the plan's commissionRate (silver=30%,
 *     silver_plus=25%, gold=20%, gold_pro=15%, elite=10%)
 *
 * Returns { rate, commission, earning } where rate is a percentage
 * (not a decimal) — kept for backward compat with the consumer UI.
 */
export function calculateCommission(jobValue: number, planId: string) {
  const safeValue = Number(jobValue ?? 0);
  if (safeValue <= COMMISSION.smallJobThreshold) {
    return { rate: 0, commission: 0, earning: safeValue };
  }
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
  const rate = plan?.commissionRate ?? 30; // silver default
  const commission = Math.round(safeValue * (rate / 100));
  return { rate, commission, earning: safeValue - commission };
}

export function calculatePrice(vanType: string, hours: number, distanceKm: number, helpers: number, extras: string[]) {
  const van = VAN_TYPES.find(v => v.id === vanType);
  const safeHours = Math.max(hours ?? 0, PRICING.minimumHours);
  const extraKm = Math.max(0, distanceKm - PRICING.distancePricing.includedKm);
  const basePrice = (van?.pricePerHour ?? 85) * safeHours;
  const distanceCharge = extraKm * PRICING.distancePricing.extraPerKm;
  const helpersCharge = helpers * PRICING.extras.extra_helper * safeHours;
  const extrasCharge = extras.reduce((sum, extra) => sum + ((PRICING.extras as any)[extra] ?? 0), 0);
  const subtotal = basePrice + distanceCharge + helpersCharge + extrasCharge;
  const vat = subtotal * PRICING.vat;
  return { basePrice, distanceCharge, helpersCharge, extrasCharge, subtotal, vat, total: subtotal + vat };
}

export function recommendVan(totalVolume: number): string {
  if (totalVolume <= 4) return 'small_van';
  if (totalVolume <= 9) return 'medium_van';
  if (totalVolume <= 15) return 'large_van';
  return 'luton_van';
}

export const INVENTORY_ITEMS: Record<string, { name: string; volume: number; weight: number }[]> = {
  'Living Room': [
    { name: 'Sofa (3-seater)', volume: 1.44, weight: 60 }, { name: 'Sofa (2-seater)', volume: 1.0, weight: 40 },
    { name: 'Armchair', volume: 0.6, weight: 25 }, { name: 'Coffee Table', volume: 0.3, weight: 15 },
    { name: 'TV Stand', volume: 0.4, weight: 20 }, { name: 'Bookshelf', volume: 0.8, weight: 35 },
    { name: 'TV (Large)', volume: 0.15, weight: 10 },
  ],
  'Kitchen': [
    { name: 'Fridge/Freezer', volume: 0.8, weight: 70 }, { name: 'Washing Machine', volume: 0.5, weight: 80 },
    { name: 'Dishwasher', volume: 0.4, weight: 50 }, { name: 'Microwave', volume: 0.05, weight: 12 },
    { name: 'Dining Table', volume: 0.6, weight: 30 }, { name: 'Dining Chair', volume: 0.15, weight: 5 },
  ],
  'Bedroom': [
    { name: 'Double Bed', volume: 1.2, weight: 50 }, { name: 'Single Bed', volume: 0.8, weight: 30 },
    { name: 'Wardrobe (Large)', volume: 1.5, weight: 70 }, { name: 'Wardrobe (Small)', volume: 0.8, weight: 40 },
    { name: 'Chest of Drawers', volume: 0.5, weight: 30 }, { name: 'Bedside Table', volume: 0.1, weight: 8 },
    { name: 'Desk', volume: 0.5, weight: 25 },
  ],
  'Packing': [
    { name: 'Moving Box (Small)', volume: 0.03, weight: 5 }, { name: 'Moving Box (Medium)', volume: 0.06, weight: 10 },
    { name: 'Moving Box (Large)', volume: 0.1, weight: 15 }, { name: 'Suitcase', volume: 0.08, weight: 15 },
  ],
  'Office': [
    { name: 'Office Desk', volume: 0.8, weight: 35 }, { name: 'Office Chair', volume: 0.4, weight: 15 },
    { name: 'Filing Cabinet', volume: 0.3, weight: 25 }, { name: 'Monitor', volume: 0.05, weight: 5 },
    { name: 'Printer', volume: 0.1, weight: 10 },
  ],
  'Garden': [
    { name: 'Garden Table', volume: 0.5, weight: 20 }, { name: 'Garden Chair', volume: 0.2, weight: 5 },
    { name: 'BBQ Grill', volume: 0.4, weight: 25 }, { name: 'Plant Pot (Large)', volume: 0.1, weight: 15 },
  ],
};

export const PROPERTY_PRESETS: Record<string, Record<string, number>> = {
  'Studio':       { 'Single Bed': 1, 'Wardrobe (Small)': 1, 'Desk': 1, 'Moving Box (Medium)': 10, 'Suitcase': 2 },
  '1 Bedroom':    { 'Double Bed': 1, 'Wardrobe (Large)': 1, 'Sofa (2-seater)': 1, 'Dining Table': 1, 'Fridge/Freezer': 1, 'Moving Box (Medium)': 15 },
  '2 Bedrooms':   { 'Double Bed': 2, 'Wardrobe (Large)': 2, 'Sofa (3-seater)': 1, 'Dining Table': 1, 'Fridge/Freezer': 1, 'Washing Machine': 1, 'Moving Box (Medium)': 25 },
  '3 Bedrooms':   { 'Double Bed': 2, 'Single Bed': 1, 'Wardrobe (Large)': 3, 'Sofa (3-seater)': 1, 'Armchair': 2, 'Dining Table': 1, 'Fridge/Freezer': 1, 'Washing Machine': 1, 'Dishwasher': 1, 'Moving Box (Large)': 35 },
  'Office Move':  { 'Office Desk': 4, 'Office Chair': 4, 'Filing Cabinet': 2, 'Monitor': 4, 'Printer': 1, 'Moving Box (Large)': 20 },
};

/* ──────────────────────────────────────────────────────────────────────
 * GLOBAL — FlyttGo Global Logistics & Relocation Marketplace constants.
 *
 * These power the homepage, country deployment pages, and the global
 * navigation surfaces. Kept separate from the legacy USA constants
 * above so the in-app booking flow keeps reading the same shapes it
 * was built against.
 * ──────────────────────────────────────────────────────────────────── */

import type { Page } from './store';

export interface GlobalService {
  code:        string;
  title:       string;
  description: string;
}

/* Phase 5 — Marketplace service architecture (global service stack). */
export const GLOBAL_SERVICES: GlobalService[] = [
  { code: 'GLRM/SVC.01', title: 'Licensed moving carrier matching',          description: 'Country-licensed carrier matching — USDOT/MC, GüKG, GVOL, registre des transporteurs, yrkestransportløyve, provincial / federal Canadian permits.' },
  { code: 'GLRM/SVC.02', title: 'Moving labor marketplace coordination',     description: 'Independent labor crews for loading, unloading, and in-home moves matched against the relocation brief.' },
  { code: 'GLRM/SVC.03', title: 'Packing services coordination',             description: 'Packing crews, materials, and crating from independent providers integrated into the coordinated relocation.' },
  { code: 'GLRM/SVC.04', title: 'Storage partner integration',               description: 'Self-storage, bonded warehouse, and staged-storage partners integrated into the move plan.' },
  { code: 'GLRM/SVC.05', title: 'Truck rental partner coordination',         description: 'Vehicle rental partners reserved alongside labor and carrier coordination.' },
  { code: 'GLRM/SVC.06', title: 'Insurance selection compatibility layer',   description: 'Compare valuation coverage and third-party transit insurance options at coordination time.' },
  { code: 'GLRM/SVC.07', title: 'Corporate relocation workflows',            description: 'Procurement, approvals, audit logs, and consolidated invoicing for HR, mobility, and operations teams.' },
  { code: 'GLRM/SVC.08', title: 'Student relocation workflows',              description: 'Move-in, move-out, semester mobility, and international arrival corridors for universities.' },
  { code: 'GLRM/SVC.09', title: 'Municipal relocation coordination support', description: 'Public-sector and municipal workforce relocation coordination with bonded providers and audit-ready records.' },
];

export interface GlobalMarket {
  iso:        string;
  name:       string;
  route:      Page;
  phaseLabel: string;
  tagline:    string;
}

/* Phase 4 — Country deployment pages. Routes match pageRoutes.ts. */
export const GLOBAL_MARKETS: GlobalMarket[] = [
  { iso: 'US', name: 'United States',  route: 'market-us',      phaseLabel: 'Phase 1 · Live',              tagline: 'FMCSA-aware carrier matching, moving labor, packing, storage, and enterprise relocation.' },
  { iso: 'CA', name: 'Canada',         route: 'market-canada',  phaseLabel: 'Phase 2 · Activating',        tagline: 'Interprovincial carrier matching, bilingual marketplace surfaces, and corporate relocation.' },
  { iso: 'DE', name: 'Germany',        route: 'market-germany', phaseLabel: 'Phase 3 · European corridor', tagline: 'GüKG-licensed Umzugsfirma matching, moving labor, packing, and Konzernumzug workflows.' },
  { iso: 'FR', name: 'France',         route: 'market-france',  phaseLabel: 'Phase 3 · European corridor', tagline: 'Déménageur matching, moving labor, packing, and corporate déménagement coordination.' },
  { iso: 'GB', name: 'United Kingdom', route: 'market-uk',      phaseLabel: 'Phase 3 · European corridor', tagline: 'GVOL operator matching, moving labor, packing, storage, and enterprise relocation.' },
  { iso: 'NO', name: 'Norway',         route: 'market-norway',  phaseLabel: 'Phase 3 · Home market',       tagline: 'Yrkestransportløyve flytteselskap matching, flyttehjelp, packing, and corporate flytting.' },
];

export interface GlobalRolloutPhase {
  phase:    string;
  timeline: string;
  scope:    string;
}

/* Phase 8 — Global rollout structure panel. */
export const GLOBAL_ROLLOUT: GlobalRolloutPhase[] = [
  { phase: 'Phase 1', timeline: '2026',     scope: 'United States marketplace rollout — Austin, Atlanta, Dallas, Phoenix, Charlotte, with progressive activation across additional metros.' },
  { phase: 'Phase 2', timeline: '2026 H2',  scope: 'Canada integration — Toronto, Montreal, Vancouver, Calgary, Ottawa, Edmonton, with bilingual marketplace surfaces.' },
  { phase: 'Phase 3', timeline: '2027 H1',  scope: 'European relocation corridors — Norway (home market), United Kingdom, Germany, France, with provider onboarding across major metros.' },
  { phase: 'Phase 4', timeline: '2027 H2+', scope: 'Intercontinental relocation corridors — Africa to Europe, Europe to United States, Africa to United States, deployed through 2030 and beyond.' },
];

/* Phase 6 — Provider onboarding categories (global). */
export const GLOBAL_PROVIDER_CATEGORIES = [
  'Licensed moving carrier',
  'Moving labor provider',
  'Packing services provider',
  'Storage facility partner',
  'Vehicle rental partner',
  'Freight forwarding partner',
  'International relocation coordinator',
  'University relocation partner',
  'Corporate relocation vendor',
];

/* ──────────────────────────────────────────────────────────────────────
 * COUNTRY PAYMENT POLICY
 *
 * Per-country payment configuration. Each country sets its own:
 *   - currency / currencySymbol  → formatting on the booking widget
 *   - cashEnabled                → whether the "Pay with cash" option
 *                                  is offered at all (some markets we
 *                                  may want to launch card-only first)
 *   - depositPct                 → portion charged online up front via
 *                                  Stripe (or local card processor) when
 *                                  the customer picks the cash option
 *   - cashOnDeliveryPct          → portion paid in cash to the driver
 *                                  on completion (always 100 - depositPct)
 *   - minDeposit                 → currency-relative floor; protects
 *                                  short low-value bookings from a deposit
 *                                  too small to cover Stripe's fee
 *
 * Default policy across all six markets: 30% online deposit,
 * 70% cash on delivery, mirroring the VanMan-UK pattern.
 * Tweak per country from the dashboard once we have real data.
 * ──────────────────────────────────────────────────────────────────── */

import type { BookingCountry } from './store';

export interface CountryPaymentPolicy {
  currency:           string;
  currencySymbol:     string;
  cashEnabled:        boolean;
  depositPct:         number;   // 0-100
  cashOnDeliveryPct:  number;   // 0-100  (depositPct + this === 100)
  minDeposit:         number;   // floor amount in the local currency
}

export const COUNTRY_PAYMENT: Record<BookingCountry, CountryPaymentPolicy> = {
  us: { currency: 'USD', currencySymbol: '$',  cashEnabled: true,  depositPct: 30, cashOnDeliveryPct: 70, minDeposit:   50 },
  ca: { currency: 'CAD', currencySymbol: 'C$', cashEnabled: true,  depositPct: 30, cashOnDeliveryPct: 70, minDeposit:   60 },
  gb: { currency: 'GBP', currencySymbol: '£',  cashEnabled: true,  depositPct: 30, cashOnDeliveryPct: 70, minDeposit:   40 },
  de: { currency: 'EUR', currencySymbol: '€',  cashEnabled: true,  depositPct: 30, cashOnDeliveryPct: 70, minDeposit:   45 },
  fr: { currency: 'EUR', currencySymbol: '€',  cashEnabled: true,  depositPct: 30, cashOnDeliveryPct: 70, minDeposit:   45 },
  /* Norway: cash flagged off by default (high-trust card market;
   * many Norwegian movers prefer Vipps). Flip to true if commercially
   * required. */
  no: { currency: 'NOK', currencySymbol: 'kr', cashEnabled: false, depositPct: 30, cashOnDeliveryPct: 70, minDeposit: 500 },
};

/**
 * Format an amount in the country's currency. Uses Intl.NumberFormat
 * so 1234.56 reads as "$1,234.56" in en-US, "1.234,56 €" in de-DE,
 * "1 234,56 kr" in nb-NO, etc. Falls back to a manual symbol prefix
 * if Intl isn't available.
 */
export function formatCurrency(amount: number, country: BookingCountry): string {
  const policy = COUNTRY_PAYMENT[country];
  const locale =
    country === 'de' ? 'de-DE' :
    country === 'fr' ? 'fr-FR' :
    country === 'no' ? 'nb-NO' :
    country === 'gb' ? 'en-GB' :
    country === 'ca' ? 'en-CA' :
                       'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style:    'currency',
      currency: policy.currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${policy.currencySymbol}${Math.round(amount).toLocaleString()}`;
  }
}

/**
 * Split a total price into the deposit + cash-on-delivery amounts
 * for the customer's selected payment method. Card-only callers get
 * the full amount as deposit and 0 as cash. Cash callers get the
 * country's deposit %, floored at COUNTRY_PAYMENT.minDeposit.
 */
export type PaymentMethod = 'card_full' | 'card_deposit_cash';

export function splitPayment(
  total:    number,
  country:  BookingCountry,
  method:   PaymentMethod,
): { deposit: number; cashDue: number } {
  if (method === 'card_full') return { deposit: total, cashDue: 0 };
  const policy   = COUNTRY_PAYMENT[country];
  const rawDep   = (total * policy.depositPct) / 100;
  const deposit  = Math.max(rawDep, policy.minDeposit);
  const cashDue  = Math.max(0, total - deposit);
  return {
    deposit: Math.round(deposit * 100) / 100,
    cashDue: Math.round(cashDue * 100) / 100,
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * REFUND POLICY (admin-flow, lifted from VanMan-UK)
 *
 * VanMan-UK does NOT use a per-plan automatic refund retention model.
 * Refunds run through the SQL functions installed by the
 * escrow_management_migration.sql migration on the shared Supabase:
 *
 *   release_escrow_manually(booking_id)  — admin releases held funds
 *                                          to the driver wallet;
 *                                          commission is deducted at
 *                                          the driver's tier rate
 *                                          (see COMMISSION above).
 *   refund_escrow_manually(booking_id)   — admin reverses the driver's
 *                                          pending balance and marks
 *                                          the booking refunded; the
 *                                          actual Stripe refund is
 *                                          initiated separately from
 *                                          the Stripe Dashboard.
 *
 * The cash-deposit (30%) is the only amount the platform ever holds
 * on a cash booking — the remaining 70% is paid in cash to the driver
 * on completion and is outside the platform's escrow.
 *
 * If a customer cancels a cash booking before the move, admin runs
 * refund_escrow_manually + issues a Stripe refund of the deposit.
 * If they no-show, admin runs release_escrow_manually so the driver
 * keeps their deposit share net of commission.
 * ──────────────────────────────────────────────────────────────────── */
