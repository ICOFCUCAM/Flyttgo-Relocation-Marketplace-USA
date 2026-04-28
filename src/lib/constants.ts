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

export const SUBSCRIPTION_PLANS = [
  { id: 'free',      name: 'Free',      price: 0,   period: '',       jobVisibility: 'Jobs up to $50',  commission: { '0-50': 0 },                                  dispatchPriority: 'Standard',  priorityLevel: 1, features: ['Access to jobs up to $50','0% commission on visible jobs','Standard dispatch priority','Basic support'],                                                                                  popular: false, color: 'gray' },
  { id: 'basic',     name: 'Basic',     price: 0,   period: '',       jobVisibility: 'All jobs',         commission: { '51-150': 20, '151-500': 15, '500+': 10 },     dispatchPriority: 'Moderate',  priorityLevel: 2, features: ['Access to all jobs','Moderate dispatch priority','20% commission ($51-150)','15% commission ($151-500)','10% commission ($500+)'],                                                  popular: false, color: 'blue' },
  { id: 'pro_mini',  name: 'Pro Mini',  price: 15,  period: '/day',   jobVisibility: 'All jobs',         commission: { '51-150': 10, '151-500': 5, '500+': 4 },       dispatchPriority: 'High',      priorityLevel: 3, features: ['Access to all jobs','High dispatch priority','10% commission ($51-150)','5% commission ($151-500)','3-5% commission ($500+)','Priority support'],                                 popular: true,  color: 'green' },
  { id: 'pro',       name: 'Pro',       price: 150, period: '/month', jobVisibility: 'All jobs',         commission: { '51-150': 10, '151-500': 5, '500+': 4 },       dispatchPriority: 'Very High', priorityLevel: 4, features: ['Access to all jobs','Very high dispatch priority','10% commission ($51-150)','5% commission ($151-500)','3-5% commission ($500+)','Premium support','Priority job matching'],    popular: false, color: 'purple' },
  { id: 'unlimited', name: 'Unlimited', price: 249, period: '/month', jobVisibility: 'All jobs',         commission: { all: 0 },                                      dispatchPriority: 'Highest',   priorityLevel: 5, features: ['Access to all jobs','Highest dispatch priority','0% commission on ALL jobs','VIP support','Priority job matching','Earnings maximized'],                                                          popular: false, color: 'amber' },
];

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

export function calculateCommission(jobPrice: number, plan: string) {
  const safePrice = Number(jobPrice ?? 0);
  if (safePrice <= 50) return { rate: 0, commission: 0, earning: safePrice };
  const planData = SUBSCRIPTION_PLANS.find(p => p.id === plan);
  if (!planData) return { rate: 0, commission: 0, earning: safePrice };
  if (plan === 'unlimited') return { rate: 0, commission: 0, earning: safePrice };
  if (plan === 'free') return { rate: -1, commission: 0, earning: 0 };
  let rate = 0;
  if (safePrice <= 150) rate = Number((planData.commission as any)['51-150'] ?? 0);
  else if (safePrice <= 500) rate = Number((planData.commission as any)['151-500'] ?? 0);
  else rate = Number((planData.commission as any)['500+'] ?? 0);
  const commission = safePrice * (rate / 100);
  return { rate, commission, earning: safePrice - commission };
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
 * REFUND POLICY
 *
 * Refunds on a cash-method booking depend on:
 *   - When the cancellation lands relative to the move (grace period).
 *     Inside the grace window → full refund of the deposit.
 *     Outside it → deposit forfeited; a portion of it goes to the
 *     driver as no-show compensation, scaled by their plan.
 *   - The driver's subscription plan. Higher tiers earn a higher
 *     share of the forfeited deposit so the cash-on-delivery model
 *     is viable for them (otherwise drivers carry the no-show risk).
 *
 * Only the cash payment method changes its behaviour here; full-card
 * bookings refund 100% inside the grace window and 0% outside (the
 * customer was already billed up front).
 * ──────────────────────────────────────────────────────────────────── */

export interface PlanRefundPolicy {
  /** Hours before the move when the deposit is still fully refundable. */
  cancellationGraceHours: number;
  /** Share of a forfeited deposit that flows to the driver (0-100). */
  noShowDriverSharePct:   number;
}

/* Plan-id → refund policy. Indexed by SUBSCRIPTION_PLANS.id so admin
 * can raise a driver's plan and instantly change their no-show
 * compensation profile without a code change. */
export const PLAN_REFUND_POLICY: Record<string, PlanRefundPolicy> = {
  /* Free plan: drivers are not on the hook for no-shows because
   * they pay no platform commission to begin with — the platform
   * keeps the entire forfeited deposit. */
  free:      { cancellationGraceHours: 24, noShowDriverSharePct:   0 },
  basic:     { cancellationGraceHours: 24, noShowDriverSharePct:  25 },
  pro_mini:  { cancellationGraceHours: 24, noShowDriverSharePct:  50 },
  pro:       { cancellationGraceHours: 24, noShowDriverSharePct:  60 },
  /* Unlimited plan: drivers pay a flat monthly subscription instead
   * of per-job commission, so they take the largest share of the
   * forfeited deposit when a customer no-shows. */
  unlimited: { cancellationGraceHours: 12, noShowDriverSharePct:  75 },
};

/**
 * Compute the refund the customer receives, plus the driver's no-show
 * compensation, for a cash-method booking.
 *
 *   subtotal           — full booking price (deposit + cashDue)
 *   hoursBeforeMove    — gap between cancel-time and the move start;
 *                        negative values are treated as "already moved"
 *                        (no refund)
 *   driverPlanId       — value of SUBSCRIPTION_PLANS[i].id
 *   paymentMethod      — 'card_full' or 'card_deposit_cash'
 *
 * Returns customerRefund + driverCompensation + platformRetention.
 * The three numbers always sum to the deposit amount.
 */
export function calculateRefund(args: {
  subtotal:        number;
  country:         BookingCountry;
  hoursBeforeMove: number;
  driverPlanId:    string;
  paymentMethod:   PaymentMethod;
}): {
  depositCharged:      number;
  cashDue:             number;
  customerRefund:      number;
  driverCompensation:  number;
  platformRetention:   number;
  insideGraceWindow:   boolean;
} {
  const policy = PLAN_REFUND_POLICY[args.driverPlanId] ?? PLAN_REFUND_POLICY.basic;
  const insideGraceWindow = args.hoursBeforeMove >= policy.cancellationGraceHours;

  const split = splitPayment(args.subtotal, args.country, args.paymentMethod);

  /* Card-only: customer pre-paid the whole amount. Full refund inside
   * the grace window, zero outside. */
  if (args.paymentMethod === 'card_full') {
    return {
      depositCharged:     split.deposit,
      cashDue:            0,
      customerRefund:     insideGraceWindow ? split.deposit : 0,
      driverCompensation: 0,
      platformRetention:  insideGraceWindow ? 0 : split.deposit,
      insideGraceWindow,
    };
  }

  /* Cash-method (30/70). */
  if (insideGraceWindow) {
    return {
      depositCharged:     split.deposit,
      cashDue:            split.cashDue,
      customerRefund:     split.deposit,
      driverCompensation: 0,
      platformRetention:  0,
      insideGraceWindow,
    };
  }

  /* Outside grace: customer forfeits the deposit. Driver gets their
   * plan-based share, platform keeps the rest. */
  const driverShare = (split.deposit * policy.noShowDriverSharePct) / 100;
  return {
    depositCharged:     split.deposit,
    cashDue:            split.cashDue,
    customerRefund:     0,
    driverCompensation: Math.round(driverShare * 100) / 100,
    platformRetention:  Math.round((split.deposit - driverShare) * 100) / 100,
    insideGraceWindow,
  };
}
