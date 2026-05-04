/* ─────────────────────────────────────────────────────────────────
 * Cross-border relocation corridor map
 *
 * High-frequency international relocation routes the marketplace
 * surfaces on both ends — city landing pages, route preview hints,
 * and dispatch priority. Drives the "cross-border ready" pill on
 * /moving-<city> pages and the corridor strip on country shopfronts.
 *
 * This file is the **registry of intent**: corridors we treat as
 * strategic infrastructure. The OSRM-backed pricing engine doesn't
 * care about borders, but the customer-facing surface does — a
 * customer in Amsterdam looking at "moving to" should see Brussels
 * surfaced as a 1-click option, not buried under intra-NL cities.
 *
 * Slug pairs are stable so /corridor/<from>-<to> URLs work both
 * as marketing landing pages and as deep-links from city pages.
 * ───────────────────────────────────────────────────────────────── */

import type { ExpansionCountryCode } from './expansion-cities';

/** Marketplace country codes — both existing markets and expansion
 *  countries. Used as endpoints on cross-border corridors. */
export type MarketCountryCode =
  | 'us' | 'ca' | 'gb' | 'fr' | 'de' | 'no'   // existing
  | ExpansionCountryCode;                      // expansion

export interface CrossBorderCorridor {
  /** Stable slug — `<from-city>-<to-city>` in kebab-case ASCII. */
  slug:        string;
  fromCity:    string;
  fromCountry: MarketCountryCode;
  toCity:      string;
  toCountry:   MarketCountryCode;
  /** True when this is a high-frequency relocation route worth
   *  surfacing on both endpoints' city landing pages. */
  isHighFrequency: boolean;
  /** One-line context surfaced on the city landing page. */
  description: string;
  /** Approximate driving distance in km (OSRM-derived; baseline
   *  for the route preview pill). */
  distanceKm:  number;
  /** Approximate one-way drive time in minutes. */
  driveMinutes: number;
  /** Whether the corridor connects an expansion country to an
   *  existing market — used for rollout-priority signalling. */
  bridgesToExistingMarket: boolean;
}

export const CROSS_BORDER_CORRIDORS: CrossBorderCorridor[] = [
  /* ── Hub-of-Europe corridors ─────────────────────────────── */
  { slug: 'amsterdam-brussels', fromCity: 'Amsterdam',  fromCountry: 'nl',
    toCity: 'Brussels',  toCountry: 'be', isHighFrequency: true,  bridgesToExistingMarket: false,
    description: 'Daily Benelux relocation corridor. Bilingual NL/FR coordination on the Brussels end.',
    distanceKm: 210, driveMinutes: 145 },
  { slug: 'brussels-paris',     fromCity: 'Brussels',   fromCountry: 'be',
    toCity: 'Paris',     toCountry: 'fr', isHighFrequency: true,  bridgesToExistingMarket: true,
    description: 'EU-capital to French capital — diplomatic + corporate relocation flow.',
    distanceKm: 320, driveMinutes: 210 },
  { slug: 'amsterdam-berlin',   fromCity: 'Amsterdam',  fromCountry: 'nl',
    toCity: 'Berlin',    toCountry: 'de', isHighFrequency: true,  bridgesToExistingMarket: true,
    description: 'NL → DE corridor — tech-talent + corporate relocations along the A30/A2.',
    distanceKm: 660, driveMinutes: 380 },
  { slug: 'rotterdam-antwerp',  fromCity: 'Rotterdam',  fromCountry: 'nl',
    toCity: 'Antwerp',   toCountry: 'be', isHighFrequency: true,  bridgesToExistingMarket: false,
    description: 'Port-to-port logistics corridor. Frequent freight + worker relocations.',
    distanceKm: 100, driveMinutes: 70 },

  /* ── Nordic corridors ────────────────────────────────────── */
  { slug: 'stockholm-oslo',     fromCity: 'Stockholm',  fromCountry: 'se',
    toCity: 'Oslo',      toCountry: 'no', isHighFrequency: true,  bridgesToExistingMarket: true,
    description: 'Daily Nordic-capital corridor. SE ↔ NO worker mobility + tech-corporate moves.',
    distanceKm: 525, driveMinutes: 380 },
  { slug: 'copenhagen-stockholm', fromCity: 'København', fromCountry: 'dk',
    toCity: 'Stockholm', toCountry: 'se', isHighFrequency: true,  bridgesToExistingMarket: false,
    description: 'DK → SE corridor — government + corporate workforce moves.',
    distanceKm: 660, driveMinutes: 410 },
  { slug: 'copenhagen-malmo',   fromCity: 'København',  fromCountry: 'dk',
    toCity: 'Malmö',     toCountry: 'se', isHighFrequency: true,  bridgesToExistingMarket: false,
    description: 'Öresund-bridge daily corridor — cross-border workforce + relocation flow.',
    distanceKm: 45,  driveMinutes: 40 },
  { slug: 'gothenburg-copenhagen', fromCity: 'Göteborg', fromCountry: 'se',
    toCity: 'København', toCountry: 'dk', isHighFrequency: false, bridgesToExistingMarket: false,
    description: 'West-Sweden to Denmark via ferry corridor.',
    distanceKm: 320, driveMinutes: 270 },

  /* ── DACH + Alpine corridors ─────────────────────────────── */
  { slug: 'milan-zurich',       fromCity: 'Milano',     fromCountry: 'it',
    toCity: 'Zürich',    toCountry: 'ch', isHighFrequency: true,  bridgesToExistingMarket: false,
    description: 'IT → CH Alpine corridor — finance + pharma corporate relocation.',
    distanceKm: 295, driveMinutes: 195 },
  { slug: 'zurich-munich',      fromCity: 'Zürich',     fromCountry: 'ch',
    toCity: 'München',   toCountry: 'de', isHighFrequency: true,  bridgesToExistingMarket: true,
    description: 'CH → DE DACH-corridor — banking + insurance + automotive moves.',
    distanceKm: 305, driveMinutes: 210 },
  { slug: 'salzburg-munich',    fromCity: 'Salzburg',   fromCountry: 'at',
    toCity: 'München',   toCountry: 'de', isHighFrequency: true,  bridgesToExistingMarket: true,
    description: 'Bavarian-border corridor — daily AT ↔ DE worker mobility.',
    distanceKm: 145, driveMinutes: 95 },
  { slug: 'innsbruck-munich',   fromCity: 'Innsbruck',  fromCountry: 'at',
    toCity: 'München',   toCountry: 'de', isHighFrequency: false, bridgesToExistingMarket: true,
    description: 'Tyrolean Alpine corridor — university + tourism mobility.',
    distanceKm: 165, driveMinutes: 130 },
  { slug: 'basel-freiburg',     fromCity: 'Basel',      fromCountry: 'ch',
    toCity: 'Freiburg',  toCountry: 'de', isHighFrequency: false, bridgesToExistingMarket: true,
    description: 'Tri-border CH/DE/FR corridor — pharma + corporate moves.',
    distanceKm: 70,  driveMinutes: 60 },
  { slug: 'geneva-lyon',        fromCity: 'Genève',     fromCountry: 'ch',
    toCity: 'Lyon',      toCountry: 'fr', isHighFrequency: true,  bridgesToExistingMarket: true,
    description: 'CH → FR corridor — institutional + corporate moves through Annecy.',
    distanceKm: 150, driveMinutes: 110 },

  /* ── Central + Eastern Europe corridors ──────────────────── */
  { slug: 'warsaw-vienna',      fromCity: 'Warszawa',   fromCountry: 'pl',
    toCity: 'Wien',      toCountry: 'at', isHighFrequency: true,  bridgesToExistingMarket: false,
    description: 'Central European corridor — corporate + IT-services relocation flow.',
    distanceKm: 685, driveMinutes: 420 },
  { slug: 'prague-berlin',      fromCity: 'Praha',      fromCountry: 'cz',
    toCity: 'Berlin',    toCountry: 'de', isHighFrequency: true,  bridgesToExistingMarket: true,
    description: 'CZ → DE corridor — tech-talent + IT-services moves along the D8/A17.',
    distanceKm: 350, driveMinutes: 230 },
  { slug: 'prague-vienna',      fromCity: 'Praha',      fromCountry: 'cz',
    toCity: 'Wien',      toCountry: 'at', isHighFrequency: true,  bridgesToExistingMarket: false,
    description: 'CZ → AT corridor — Habsburg-axis corporate + university moves.',
    distanceKm: 335, driveMinutes: 215 },
  { slug: 'wroclaw-prague',     fromCity: 'Wrocław',    fromCountry: 'pl',
    toCity: 'Praha',     toCountry: 'cz', isHighFrequency: false, bridgesToExistingMarket: false,
    description: 'Silesia ↔ Bohemia corridor — automotive + IT corporate relocations.',
    distanceKm: 270, driveMinutes: 180 },
  { slug: 'krakow-vienna',      fromCity: 'Kraków',     fromCountry: 'pl',
    toCity: 'Wien',      toCountry: 'at', isHighFrequency: false, bridgesToExistingMarket: false,
    description: 'PL → AT corridor — university + IT shared-services moves.',
    distanceKm: 460, driveMinutes: 295 },

  /* ── Mediterranean + Iberian corridors ───────────────────── */
  { slug: 'madrid-barcelona',   fromCity: 'Madrid',     fromCountry: 'es',
    toCity: 'Barcelona', toCountry: 'es', isHighFrequency: true,  bridgesToExistingMarket: false,
    description: 'High-frequency intra-Iberian corridor (national, surfaced for completeness).',
    distanceKm: 620, driveMinutes: 380 },
  { slug: 'bilbao-bordeaux',    fromCity: 'Bilbao',     fromCountry: 'es',
    toCity: 'Bordeaux',  toCountry: 'fr', isHighFrequency: false, bridgesToExistingMarket: true,
    description: 'Iberian-French Atlantic corridor — industrial + corporate moves.',
    distanceKm: 305, driveMinutes: 210 },
  { slug: 'milan-lyon',         fromCity: 'Milano',     fromCountry: 'it',
    toCity: 'Lyon',      toCountry: 'fr', isHighFrequency: false, bridgesToExistingMarket: true,
    description: 'Lombardy → Auvergne-Rhône-Alpes corridor through the Alps.',
    distanceKm: 480, driveMinutes: 330 },
];

/* ── Lookup helpers ──────────────────────────────────────── */

/** Return all corridors that touch the given city slug. */
export function corridorsForCity(citySlug: string): CrossBorderCorridor[] {
  /* Match on either endpoint's city slug — matches against
   * fromCity / toCity by slugifying the display name. */
  const target = citySlug.toLowerCase();
  return CROSS_BORDER_CORRIDORS.filter(c => {
    const fromSlug = slugifyCity(c.fromCity);
    const toSlug   = slugifyCity(c.toCity);
    return fromSlug === target || toSlug === target;
  });
}

/** Return all corridors that touch the given country (either end). */
export function corridorsForCountry(country: MarketCountryCode): CrossBorderCorridor[] {
  return CROSS_BORDER_CORRIDORS.filter(c => c.fromCountry === country || c.toCountry === country);
}

/** Map a display city name back to its kebab-case slug. */
export function slugifyCity(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Find a corridor by its stable slug. */
export function findCorridor(slug: string): CrossBorderCorridor | null {
  return CROSS_BORDER_CORRIDORS.find(c => c.slug === slug) ?? null;
}
