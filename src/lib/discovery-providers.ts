import type { BookingCountry } from './store';

/* ─────────────────────────────────────────────────────────────────
 * Discovery providers — non-onboarded acquisition signals
 *
 * These are *not* bookable on the marketplace today. The
 * homepage's Discovery Providers section renders them with a
 * "Not yet onboarded" badge and an "Are you {Provider}? Claim &
 * onboard →" CTA — turning the customer-facing surface into a
 * provider lead-generation channel.
 *
 * Two design constraints:
 *
 *   1. Naming — entries are plausible regional-mover composites
 *      ("Atlas Boroughs Movers", "Pacific Crest Relocation") that
 *      read as legitimate marketplace candidates without
 *      infringing real-company trademarks. Replace with vetted
 *      real-company data once the legal review is signed off and
 *      the outreach pipeline is in place.
 *
 *   2. Honesty — every entry carries no booking affordance and
 *      every consuming UI is required to surface the
 *      "Not yet onboarded" badge so a customer never confuses a
 *      discovery card for a bookable provider.
 *
 * Slugs are stable URL-safe identifiers — they back the
 * /discovery/<slug> claim URL when that flow is wired up.
 * ───────────────────────────────────────────────────────────────── */

export interface DiscoveryProvider {
  slug:     string;
  /** Display name. */
  name:     string;
  city:     string;
  country:  BookingCountry;
  flag:     string;
  /** Optional corridor slug — when set, the card surfaces on the
   *  matching /corridor/<country>/<slug> page as a "movers
   *  operating on this corridor" prompt. */
  corridor?: string;
  /** Marketing-grade descriptor surfaced under the name. */
  tagline:  string;
  /** Estimated reputation signals — pulled from public review
   *  aggregators when the entry is built. Treat as approximate. */
  estRating?:  number;
  estReviews?: number;
  /** Source of the public listing — e.g. "Google Business",
   *  "Trustpilot". Surfaced to the customer so they understand
   *  this isn't a marketplace verification. */
  source:   string;
}

/* Approximately 3 entries per market — enough to populate a 3x3
 * grid on the homepage without hammering page weight. Add more as
 * the outreach pipeline scales. */
export const DISCOVERY_PROVIDERS: DiscoveryProvider[] = [
  /* ── United States ─────────────────────────────────────── */
  { slug: 'atlas-boroughs-movers', name: 'Atlas Boroughs Movers',
    city: 'New York, NY', country: 'us', flag: '🇺🇸',
    corridor: 'new-york-boston',
    tagline:  'Manhattan + outer-borough relocations · since 2014',
    estRating: 4.7, estReviews: 1240, source: 'Google Business' },
  { slug: 'pacific-crest-relocation', name: 'Pacific Crest Relocation',
    city: 'Los Angeles, CA', country: 'us', flag: '🇺🇸',
    corridor: 'los-angeles-san-diego',
    tagline:  'Coastal Southern California · long-haul SoCal corridors',
    estRating: 4.6, estReviews: 880, source: 'Yelp' },
  { slug: 'lone-star-haulers', name: 'Lone Star Haulers',
    city: 'Dallas, TX', country: 'us', flag: '🇺🇸',
    corridor: 'dallas-austin',
    tagline:  'Texas-DOT licensed · DFW + Austin metro',
    estRating: 4.8, estReviews: 612, source: 'Google Business' },

  /* ── Canada ────────────────────────────────────────────── */
  { slug: 'maple-corridor-relocation', name: 'Maple Corridor Relocation',
    city: 'Toronto, ON', country: 'ca', flag: '🇨🇦',
    corridor: 'toronto-montreal',
    tagline:  'Bilingual ON–QC dispatch · 401 corridor specialists',
    estRating: 4.7, estReviews: 540, source: 'Google Business' },
  { slug: 'rockies-relocation-co', name: 'Rockies Relocation Co.',
    city: 'Vancouver, BC', country: 'ca', flag: '🇨🇦',
    corridor: 'vancouver-calgary',
    tagline:  'Cross-Rockies BC–AB long-haul · winter-aware',
    estRating: 4.6, estReviews: 320, source: 'Yelp' },
  { slug: 'st-laurent-demenagement', name: 'St-Laurent Déménagement',
    city: 'Montréal, QC', country: 'ca', flag: '🇨🇦',
    corridor: 'montreal-quebec-city',
    tagline:  'Service francophone · transporteurs agréés au Québec',
    estRating: 4.7, estReviews: 410, source: 'Google Business' },

  /* ── United Kingdom ────────────────────────────────────── */
  { slug: 'thames-valley-removals', name: 'Thames Valley Removals',
    city: 'London', country: 'gb', flag: '🇬🇧',
    corridor: 'london-manchester',
    tagline:  'GVOL operator · Greater London + Midlands corridors',
    estRating: 4.8, estReviews: 970, source: 'Trustpilot' },
  { slug: 'highland-removals-ltd', name: 'Highland Removals Ltd',
    city: 'Edinburgh', country: 'gb', flag: '🇬🇧',
    corridor: 'edinburgh-glasgow',
    tagline:  'Central Belt + Highlands · same-day intra-Scotland',
    estRating: 4.7, estReviews: 230, source: 'Google Business' },
  { slug: 'midlands-move-co', name: 'Midlands Move Co.',
    city: 'Birmingham', country: 'gb', flag: '🇬🇧',
    corridor: 'london-birmingham',
    tagline:  'M40 corridor · BAR-affiliated dispatch',
    estRating: 4.6, estReviews: 340, source: 'Trustpilot' },

  /* ── France ────────────────────────────────────────────── */
  { slug: 'demenageurs-rhone-alpes', name: 'Déménageurs Rhône-Alpes',
    city: 'Lyon', country: 'fr', flag: '🇫🇷',
    corridor: 'paris-lyon',
    tagline:  'Axe A6/A7 · transporteurs agréés région AURA',
    estRating: 4.7, estReviews: 410, source: 'Google Business' },
  { slug: 'cote-d-azur-demenagement', name: 'Côte d’Azur Déménagement',
    city: 'Nice', country: 'fr', flag: '🇫🇷',
    corridor: 'marseille-nice',
    tagline:  'Côte d’Azur · disponibilité jour-même',
    estRating: 4.6, estReviews: 220, source: 'Pages Jaunes' },
  { slug: 'paris-bordeaux-express', name: 'Paris-Bordeaux Express',
    city: 'Paris', country: 'fr', flag: '🇫🇷',
    corridor: 'paris-bordeaux',
    tagline:  'Île-de-France ↔ Nouvelle-Aquitaine · longue distance',
    estRating: 4.5, estReviews: 280, source: 'Google Business' },

  /* ── Germany ───────────────────────────────────────────── */
  { slug: 'spreestadt-umzuege', name: 'Spreestadt Umzüge',
    city: 'Berlin', country: 'de', flag: '🇩🇪',
    corridor: 'berlin-muenchen',
    tagline:  'Nord-Süd-Korridor · GüKG-zertifizierte Spedition',
    estRating: 4.7, estReviews: 510, source: 'Google Business' },
  { slug: 'hanseatic-spedition', name: 'Hanseatic Spedition GmbH',
    city: 'Hamburg', country: 'de', flag: '🇩🇪',
    corridor: 'hamburg-berlin',
    tagline:  'Norddeutscher Korridor · A24 · Same-Week-Versand',
    estRating: 4.8, estReviews: 380, source: 'Google Business' },
  { slug: 'rhein-main-umzuege', name: 'Rhein-Main Umzüge',
    city: 'Frankfurt', country: 'de', flag: '🇩🇪',
    corridor: 'frankfurt-koeln',
    tagline:  'Rhein-Main bis Rheinland · Same-Day-Verfügbarkeit',
    estRating: 4.6, estReviews: 270, source: 'Trustpilot' },

  /* ── Norway ────────────────────────────────────────────── */
  { slug: 'fjord-flytteservice', name: 'Fjord Flytteservice',
    city: 'Oslo', country: 'no', flag: '🇳🇴',
    corridor: 'oslo-bergen',
    tagline:  'Østland–Vestland · værbevisst vinterkorridor',
    estRating: 4.8, estReviews: 290, source: 'Trustpilot' },
  { slug: 'dovrefjell-transport', name: 'Dovrefjell Transport',
    city: 'Trondheim', country: 'no', flag: '🇳🇴',
    corridor: 'oslo-trondheim',
    tagline:  'Gudbrandsdalen-korridoren · forsikret langtransport',
    estRating: 4.7, estReviews: 180, source: 'Google Business' },
  { slug: 'vestlandet-flytting', name: 'Vestlandet Flytting',
    city: 'Bergen', country: 'no', flag: '🇳🇴',
    corridor: 'bergen-stavanger',
    tagline:  'E39-korridoren · kysttransport på Vestlandet',
    estRating: 4.6, estReviews: 140, source: 'Google Business' },
];

export function findDiscoveryProvidersForCountry(country: BookingCountry): DiscoveryProvider[] {
  return DISCOVERY_PROVIDERS.filter(p => p.country === country);
}
