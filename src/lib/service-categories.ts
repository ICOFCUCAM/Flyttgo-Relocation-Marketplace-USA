/* ─────────────────────────────────────────────────────────────────
 * Service category catalogue.
 *
 * Each category is a curated landing page at /services/<slug> showing
 * providers offering that service category, a category-specific intro,
 * and a how-it-works panel tuned to the service. The `matches` array
 * is matched against ProviderRecord.services entries (case-insensitive
 * substring) so a provider is shown on every category whose service
 * keywords overlap their declared services list.
 * ───────────────────────────────────────────────────────────────── */

export interface ServiceCategory {
  slug:        string;
  name:        string;
  /** Short marketing tagline for the hero. */
  tagline:     string;
  /** 1–2 sentence intro paragraph. */
  intro:       string;
  /** Strings matched against ProviderRecord.services. Case-insensitive
   *  substring match, OR semantics — any hit qualifies. */
  matches:     string[];
  /** Three short steps tuned to this service. */
  howItWorks:  { title: string; body: string }[];
  /** Two FAQ entries specific to this service. */
  faq:         { q: string; a: string }[];
  /** Pricing tier slug from us-pricing.ts. Used by ServiceCategoryPage
   *  to render the typical-rate card in the hero. */
  pricingTier?: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    slug:    'long-distance',
    name:    'Long-distance moves',
    tagline: 'Cross-state and cross-border relocations, coordinated end-to-end',
    intro:   "Long-distance moves coordinated through licensed interstate carriers. Every provider on this list is FMCSA-registered (US), GVOL-licensed (UK), or holds the equivalent operator-licence in their market. Get a binding quote, watch the load on a live map, and pay only after delivery is confirmed.",
    matches: ['long-distance', 'interstate'],
    howItWorks: [
      { title: 'Get a binding quote',  body: 'Enter pickup + dropoff. Our pricing engine factors road distance, drive time, and fuel surcharge per market.' },
      { title: 'Pick a licensed carrier', body: 'Every carrier on the shortlist is registered with the national operator-licence body — USDOT, GVOL, GüKG, AT-LICENCE.' },
      { title: 'Track + pay on delivery', body: 'Live ETA on the map. Funds sit in escrow until you confirm everything arrived.' },
    ],
    faq: [
      { q: 'How long does an interstate move take?', a: 'Typically 1–3 days transit per 1,000 km. The exact ETA is computed at quote time from the OSRM road-network distance.' },
      { q: 'Are my goods insured in transit?',       a: 'Every long-distance carrier on FlyttGo holds goods-in-transit insurance with a per-booking limit of $50k or local equivalent. You can purchase additional valuation cover at checkout.' },
    ],
    pricingTier: 'long-distance',
  },
  {
    slug:    'local',
    name:    'Local moves',
    tagline: 'Same-city moves, often same-day or next-day',
    intro:   "Local moves inside a single city or metro region. Most providers can fit you in within 24–48 hours during off-peak season; same-day slots are common in our six core markets. Book by the hour with a transparent two-hour minimum.",
    matches: ['local moves', 'local'],
    howItWorks: [
      { title: 'Book in 60 seconds',     body: 'Pick your van size, your date, and a time window. The widget shows the indicative total before you submit.' },
      { title: 'Driver confirms within an hour', body: 'Drivers see new bookings in real time. Most are confirmed within 60 minutes during business hours.' },
      { title: 'Door-to-door in one trip', body: 'Most local moves complete in 2–4 hours. Pay only the time used, not a flat-rate inflated quote.' },
    ],
    faq: [
      { q: 'Can I book same-day?',       a: 'Yes — most local providers accept same-day bookings up until 14:00. Outside-hours bookings carry a small surcharge shown upfront.' },
      { q: 'How is the price calculated?', a: 'Hourly rate × time used, plus a one-off call-out fee. The widget shows the per-country base + per-km coefficient transparently.' },
    ],
    pricingTier: 'local',
  },
  {
    slug:    'packing',
    name:    'Packing services',
    tagline: 'Full-pack, partial-pack, and crating crews',
    intro:   "Packing crews who pack, label, and crate everything you don't want to box yourself. Includes materials (boxes, paper, tape, blankets), fragile-item protection, and full inventory records. Add it to a same-day booking or schedule a packing-only crew the day before.",
    matches: ['packing', 'crating', 'pack'],
    howItWorks: [
      { title: 'Choose pack scope',  body: 'Full-pack, kitchen-only, fragile-only — the booking flow lets you scope it to your budget.' },
      { title: 'Crew arrives prepared', body: 'Materials brought by the crew. You don\'t need to source boxes, paper, or tape yourself.' },
      { title: 'Inventory list signed off', body: 'Every box numbered + photographed. You sign the inventory before the truck loads.' },
    ],
    faq: [
      { q: 'Can I just buy packing materials?', a: 'Yes — most providers will deliver flat-pack boxes and materials without a packing crew. Add it as an extra service in the booking flow.' },
      { q: 'Are valuables / artwork crated?',  a: 'Provider-dependent. Filter the directory for "Crating" to see crews with that capability listed in their service grid.' },
    ],
    pricingTier: 'packing',
  },
  {
    slug:    'storage',
    name:    'Storage staging',
    tagline: 'Short-term and long-term storage between move dates',
    intro:   "Storage between two move dates — for staged interstate moves, between-leases gaps, or extended-trip travelers. Climate-controlled units, 24/7 access partners, and integrated load-and-store crews so you only pay one provider end-to-end.",
    matches: ['storage', 'self-storage'],
    howItWorks: [
      { title: 'Pick your unit size', body: 'Most providers list small / medium / large unit options; the widget surfaces the matching catalogue at booking time.' },
      { title: 'Single-crew load + drive', body: 'Same crew that packs you out drives the load to the storage facility — no double handling.' },
      { title: 'Recall when ready',   body: 'Schedule the recall move from your dashboard. Many providers offer a discount on the second leg if booked together.' },
    ],
    faq: [
      { q: 'How long can I store?',           a: 'Most providers offer minimum 30-day blocks with monthly renewal. No long lock-in unless you opt for the discounted annual rate.' },
      { q: 'Are climate-controlled units listed?', a: 'Yes — provider profiles flag climate-controlled / temperature-stable facilities under the Fleet section.' },
    ],
  },
  {
    slug:    'office',
    name:    'Office relocation',
    tagline: 'Workplace moves with weekend / out-of-hours options',
    intro:   "Workplace relocations done over a weekend or after-hours so the team is back at desks Monday morning. Includes IT decommissioning, asset tagging, secure document transit, and certificate-of-destruction options for old hardware.",
    matches: ['office', 'office relocation', 'workplace'],
    howItWorks: [
      { title: 'Site survey before quote',   body: 'Office moves get a free in-person or video survey so the quote reflects every workstation, server rack, and meeting room.' },
      { title: 'Weekend window scheduling',  body: 'Out-of-hours and weekend windows are the default — your team comes in Monday to a fitted-out new office.' },
      { title: 'Asset tag + insurance',      body: 'Every item tagged, insured at full replacement value, and reconciled at delivery. Audit trail for finance.' },
    ],
    faq: [
      { q: 'Do you handle IT decommissioning?', a: 'Yes — many office providers also handle WEEE-compliant disposal and certificate-of-destruction for end-of-life hardware.' },
      { q: 'Can you provide a single invoice for HR + IT + Finance?', a: 'Yes. The corporate dashboard splits a single booking into tagged cost centres so each department gets the slice they need.' },
    ],
    pricingTier: 'corporate',
  },
  {
    slug:    'labor-only',
    name:    'Labor-only crews',
    tagline: 'Loading, unloading, and in-home muscle without the truck',
    intro:   "Bring your own truck or rental — providers send the crew. Common for U-Haul / Penske rentals, in-home rearrangement, garage / loft loading days, or moving heavy items between rooms. Hourly billing with a two-hour minimum.",
    matches: ['labor-only', 'labor only', 'laboronly', 'labour'],
    howItWorks: [
      { title: 'Reserve your truck rental', body: 'Book your rental separately. The booking flow asks for the pickup window so the crew arrives when the truck does.' },
      { title: 'Pick crew size',            body: 'Two helpers handle most studio / 1-bed apartments. Three+ recommended for 3-bed houses or heavy-furniture days.' },
      { title: 'Hourly billing',            body: 'Two-hour minimum. The booking flow shows the per-hour rate per market — no surprise charges at completion.' },
    ],
    faq: [
      { q: 'Will the crew also drive my rental?', a: 'Provider-dependent. Filter the directory for "Driver included" — most labor-only crews are loaders only, not drivers.' },
      { q: 'Do they bring blankets + dollies?',   a: 'Yes — every labor-only crew comes equipped with moving blankets, straps, and at least one wheeled dolly.' },
    ],
    pricingTier: 'labor-only',
  },
  {
    slug:    'international',
    name:    'International relocation',
    tagline: 'Cross-border relocations with customs + freight forwarding',
    intro:   "Cross-border relocations coordinated through licensed international freight forwarders. Air, sea, and road consolidation; HS-code customs clearance; door-to-door insured transit; and a dedicated coordinator for every shipment.",
    matches: ['international', 'cross-border', 'freight forwarding'],
    howItWorks: [
      { title: 'Customs-aware quote',  body: 'Quote includes export packing, customs clearance, and destination-country duties so the price you see is the price you pay.' },
      { title: 'Mode + transit choice', body: 'Air for speed, sea container for volume, consolidated road for the EU. Side-by-side timeline and price.' },
      { title: 'Door-to-door tracking', body: 'One coordinator from origin pickup to destination delivery; live status on every leg.' },
    ],
    faq: [
      { q: 'Do you handle customs paperwork?',     a: 'Yes — every international provider on FlyttGo employs licensed customs brokers and submits the EAD/MRN, ENS, and destination clearance docs on your behalf.' },
      { q: 'How is duty + tax calculated?',        a: "Duty is computed from the destination country's tariff schedule against the inventory HS-codes; the quote shows it as a separate line so you can budget accurately." },
    ],
    pricingTier: 'long-distance',
  },
  {
    slug:    'truck-rental',
    name:    'Truck rental',
    tagline: 'DIY-friendly trucks with optional crew add-ons',
    intro:   "Rent a truck, drive yourself, save the labour line on your quote. Box trucks, lutons, and panel vans across all six markets — partnered with U-Haul, Penske, Enterprise, Sixt, and Movecar so you book through one funnel.",
    matches: ['truck rental', 'rental', 'self-drive'],
    howItWorks: [
      { title: 'Pick truck + window',  body: 'Same booking flow as a full-service move; pick "Truck rental only" for the truck on its own.' },
      { title: 'Add a loading crew',   body: 'Most renters add a 2-helper labour-only crew at the pickup end — booking flow surfaces local crews automatically.' },
      { title: 'One-way returns',      body: 'One-way drop-off at any partner depot in the destination city; hourly + daily mileage shown upfront.' },
    ],
    faq: [
      { q: 'Do I need a special licence?',         a: 'For trucks under 3.5t / 7.5t (depending on market) a standard car licence is sufficient; the booking flow checks against the country licence rules at quote time.' },
      { q: 'Is insurance included?',               a: 'Liability + damage waiver included; full goods-in-transit cover is an optional upsell at checkout.' },
    ],
    pricingTier: 'local',
  },
  {
    slug:    'student',
    name:    'Student relocation',
    tagline: 'University-corridor moves, term-aware scheduling, summer-storage included',
    intro:   "Relocations for students moving in / out of halls, between universities, or onto a year abroad. Term-aware scheduling, university-corridor pricing, summer-storage add-ons, and ID-verified providers around campus zones.",
    matches: ['student', 'university', 'campus'],
    howItWorks: [
      { title: 'Term-aware date picker', body: 'Booking flow flags peak move-in / move-out windows so you avoid surge pricing during freshers week.' },
      { title: 'Summer-storage option',  body: 'Pack out before exams, recall when term resumes — providers offer 3 / 6 / 12-week storage blocks at student rates.' },
      { title: 'Verified campus crews',  body: 'Providers in the Student tier are ID-verified for halls of residence and follow university security check-in procedures.' },
    ],
    faq: [
      { q: 'Do you have a student discount?',      a: 'Yes — verified .edu / .ac.uk / university email addresses unlock a 10% Welcome credit on the first booking.' },
      { q: 'Can I pack a single room?',            a: 'Single-room moves are the typical student booking; the widget defaults to "1 room" so you get an indicative total in seconds.' },
    ],
    pricingTier: 'local',
  },
];

export function findServiceCategory(slug: string | null | undefined): ServiceCategory | undefined {
  if (!slug) return undefined;
  return SERVICE_CATEGORIES.find(c => c.slug === slug);
}
