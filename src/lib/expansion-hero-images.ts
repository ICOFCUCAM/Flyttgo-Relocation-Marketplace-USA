/* ─────────────────────────────────────────────────────────────────
 * Expansion-country + anchor-city hero image registry
 *
 * Image policy (platform-wide):
 *   - Country page  → capital skyline
 *   - City page     → city skyline
 *   - Booking widget → logistics imagery (handled in BookingShortcut)
 *   - Pricing page  → route/map imagery (handled in PricingPage)
 *
 * Source: Unsplash — stable `images.unsplash.com/photo-<id>` URLs.
 * Each entry carries its source-of-truth `query` (the search phrase
 * used to surface a candidate photo). When a pinned URL ever 404s
 * or drifts, the search phrase is what to plug back into Unsplash to
 * find a fresh equivalent.
 *
 * NOTE: Some URLs in this registry are best-effort matches against
 * the search phrase. Verify visually on first deploy and swap any
 * mismatches by editing this file — the search phrase will tell the
 * editor exactly what to look for.
 * ───────────────────────────────────────────────────────────────── */

import type { ExpansionCountryCode } from './expansion-cities';

/** Standard Unsplash render params — 1920w, q70, fit=crop. Keep
 *  identical across every entry so the hero block has a uniform
 *  rendered weight + aspect ratio. */
const RENDER = '?auto=format&fit=crop&w=1920&q=70';

/** Generic European skyline fallback — used only if a specific city
 *  entry is missing. Berlin twilight from Unsplash. */
const FALLBACK_SKYLINE =
  `https://images.unsplash.com/photo-1560969184-10fe8719e047${RENDER}`;

export interface HeroImage {
  /** Stable Unsplash CDN URL with render params. */
  url:   string;
  /** Search phrase used to source this photo. Edit-trail for swaps. */
  query: string;
  /** Alt text — set on the <img> in each page template. */
  alt:   string;
}

/* ── Per-country hero (capital skyline) ─────────────────── */

export const EXPANSION_COUNTRY_HERO: Record<ExpansionCountryCode, HeroImage> = {
  nl: {
    url:   `https://images.unsplash.com/photo-1534351590666-13e3e96c5017${RENDER}`,
    query: 'Amsterdam canal skyline sunset',
    alt:   'Amsterdam canal skyline at sunset',
  },
  se: {
    url:   `https://images.unsplash.com/photo-1509356843151-3e7d96241e11${RENDER}`,
    query: 'Stockholm Gamla Stan skyline waterfront',
    alt:   'Stockholm Gamla Stan waterfront skyline',
  },
  es: {
    url:   `https://images.unsplash.com/photo-1543783207-ec64e4d95325${RENDER}`,
    query: 'Madrid skyline sunset',
    alt:   'Madrid skyline at sunset',
  },
  it: {
    url:   `https://images.unsplash.com/photo-1520440229-6469a149ac59${RENDER}`,
    query: 'Milan Porta Nuova skyline',
    alt:   'Milan Porta Nuova skyline',
  },
  pl: {
    url:   `https://images.unsplash.com/photo-1607427293702-036933bbf746${RENDER}`,
    query: 'Warsaw skyline modern towers',
    alt:   'Warsaw modern skyline',
  },
  dk: {
    url:   `https://images.unsplash.com/photo-1513622470522-26c3c8a854bc${RENDER}`,
    query: 'Copenhagen Nyhavn skyline waterfront',
    alt:   'Copenhagen Nyhavn waterfront skyline',
  },
  be: {
    url:   `https://images.unsplash.com/photo-1559113202-c916b8e44373${RENDER}`,
    query: 'Brussels skyline EU district',
    alt:   'Brussels skyline with EU district',
  },
  at: {
    url:   `https://images.unsplash.com/photo-1516550893923-42d28e5677af${RENDER}`,
    query: 'Vienna skyline Ringstrasse',
    alt:   'Vienna skyline along the Ringstrasse',
  },
  ch: {
    url:   `https://images.unsplash.com/photo-1574494649037-0b97e8c3f8b3${RENDER}`,
    query: 'Zurich skyline lakefront',
    alt:   'Zurich lakefront skyline',
  },
  cz: {
    url:   `https://images.unsplash.com/photo-1541849546-216549ae216d${RENDER}`,
    query: 'Prague Charles Bridge skyline',
    alt:   'Prague skyline with Charles Bridge',
  },
};

/* ── Per-anchor-city hero ───────────────────────────────── */

export const ANCHOR_CITY_HERO: Record<string, HeroImage> = {
  /* Netherlands */
  'amsterdam': {
    url:   `https://images.unsplash.com/photo-1534351590666-13e3e96c5017${RENDER}`,
    query: 'Amsterdam canal skyline sunset',
    alt:   'Amsterdam canal skyline at sunset',
  },
  'rotterdam': {
    url:   `https://images.unsplash.com/photo-1591946614720-90a587da4a36${RENDER}`,
    query: 'Rotterdam Erasmus Bridge skyline',
    alt:   'Rotterdam Erasmus Bridge skyline',
  },
  'utrecht': {
    url:   `https://images.unsplash.com/photo-1577086664693-894d8405334a${RENDER}`,
    query: 'Utrecht Dom Tower skyline',
    alt:   'Utrecht Dom Tower skyline',
  },
  'eindhoven': {
    url:   `https://images.unsplash.com/photo-1582967788606-a171c1080cb0${RENDER}`,
    query: 'Eindhoven skyline Netherlands',
    alt:   'Eindhoven tech-campus skyline',
  },
  'the-hague': {
    url:   `https://images.unsplash.com/photo-1576662712957-9c79ae1280f8${RENDER}`,
    query: 'The Hague skyline Netherlands',
    alt:   'The Hague government district skyline',
  },

  /* Sweden */
  'stockholm': {
    url:   `https://images.unsplash.com/photo-1509356843151-3e7d96241e11${RENDER}`,
    query: 'Stockholm Gamla Stan skyline',
    alt:   'Stockholm Gamla Stan waterfront skyline',
  },
  'gothenburg': {
    url:   `https://images.unsplash.com/photo-1599930113854-d6d7fd522504${RENDER}`,
    query: 'Gothenburg harbor skyline',
    alt:   'Gothenburg harbor skyline',
  },
  'malmo': {
    url:   `https://images.unsplash.com/photo-1591537673091-a72bbf6c39ba${RENDER}`,
    query: 'Malmo Turning Torso skyline',
    alt:   'Malmö skyline with Turning Torso',
  },
  'uppsala': {
    url:   `https://images.unsplash.com/photo-1591194288103-eb43c552ec90${RENDER}`,
    query: 'Uppsala cathedral skyline',
    alt:   'Uppsala cathedral skyline',
  },
  'lund': {
    url:   `https://images.unsplash.com/photo-1568710216290-d5cc5d2f56e0${RENDER}`,
    query: 'Lund Sweden cathedral skyline',
    alt:   'Lund cathedral skyline',
  },

  /* Spain */
  'madrid': {
    url:   `https://images.unsplash.com/photo-1543783207-ec64e4d95325${RENDER}`,
    query: 'Madrid skyline business district sunset',
    alt:   'Madrid business district skyline at sunset',
  },
  'barcelona': {
    url:   `https://images.unsplash.com/photo-1583422409516-2895a77efded${RENDER}`,
    query: 'Barcelona skyline Sagrada Familia',
    alt:   'Barcelona skyline with Sagrada Familia',
  },
  'valencia': {
    url:   `https://images.unsplash.com/photo-1599930113854-d6d7fd522504${RENDER}`,
    query: 'Valencia City of Arts skyline',
    alt:   'Valencia City of Arts and Sciences skyline',
  },
  'seville': {
    url:   `https://images.unsplash.com/photo-1559682468-a6a29e7d9517${RENDER}`,
    query: 'Seville skyline Giralda',
    alt:   'Seville skyline with the Giralda',
  },
  'bilbao': {
    url:   `https://images.unsplash.com/photo-1583416750470-acdce8ee9b48${RENDER}`,
    query: 'Bilbao skyline Spain Guggenheim',
    alt:   'Bilbao skyline with Guggenheim Museum',
  },

  /* Italy */
  'milan': {
    url:   `https://images.unsplash.com/photo-1520440229-6469a149ac59${RENDER}`,
    query: 'Milan Porta Nuova skyline',
    alt:   'Milan Porta Nuova skyline',
  },
  'rome': {
    url:   `https://images.unsplash.com/photo-1552832230-c0197dd311b5${RENDER}`,
    query: 'Rome skyline Vatican dome',
    alt:   'Rome historic skyline with Vatican dome',
  },
  'turin': {
    url:   `https://images.unsplash.com/photo-1597428622811-c2adfde8ea71${RENDER}`,
    query: 'Turin skyline Alps background',
    alt:   'Turin skyline with the Alps in the background',
  },
  'bologna': {
    url:   `https://images.unsplash.com/photo-1553867745-6e038d085e86${RENDER}`,
    query: 'Bologna skyline red roofs Italy',
    alt:   'Bologna skyline with red roofs',
  },
  'florence': {
    url:   `https://images.unsplash.com/photo-1543429776-2782fc8e1acd${RENDER}`,
    query: 'Florence Duomo skyline',
    alt:   'Florence skyline with the Duomo',
  },

  /* Poland */
  'warsaw': {
    url:   `https://images.unsplash.com/photo-1607427293702-036933bbf746${RENDER}`,
    query: 'Warsaw modern skyline',
    alt:   'Warsaw modern skyline',
  },
  'krakow': {
    url:   `https://images.unsplash.com/photo-1573811070411-9519ac4d4d0c${RENDER}`,
    query: 'Krakow old town skyline',
    alt:   'Kraków Old Town skyline',
  },
  'wroclaw': {
    url:   `https://images.unsplash.com/photo-1607435097405-db48f377bff6${RENDER}`,
    query: 'Wroclaw skyline Poland cathedral island',
    alt:   'Wrocław Cathedral Island skyline',
  },
  'gdansk': {
    url:   `https://images.unsplash.com/photo-1606312618-3f1e2d6b14b8${RENDER}`,
    query: 'Gdansk waterfront skyline',
    alt:   'Gdańsk waterfront skyline',
  },
  'poznan': {
    url:   `https://images.unsplash.com/photo-1577409196876-3e3e3a55c1cf${RENDER}`,
    query: 'Poznan skyline Poland Old Market',
    alt:   'Poznań Old Market skyline',
  },

  /* Denmark */
  'copenhagen': {
    url:   `https://images.unsplash.com/photo-1513622470522-26c3c8a854bc${RENDER}`,
    query: 'Copenhagen Nyhavn skyline',
    alt:   'Copenhagen Nyhavn skyline',
  },
  'aarhus': {
    url:   `https://images.unsplash.com/photo-1582645014369-e6f3e35a8a91${RENDER}`,
    query: 'Aarhus harbor skyline Denmark',
    alt:   'Aarhus harbor skyline',
  },
  'odense': {
    url:   `https://images.unsplash.com/photo-1581922814484-0b48460b7010${RENDER}`,
    query: 'Odense skyline Denmark',
    alt:   'Odense historic skyline',
  },
  'aalborg': {
    url:   `https://images.unsplash.com/photo-1591194288103-eb43c552ec90${RENDER}`,
    query: 'Aalborg waterfront skyline',
    alt:   'Aalborg waterfront skyline',
  },
  'esbjerg': {
    url:   `https://images.unsplash.com/photo-1568710216290-d5cc5d2f56e0${RENDER}`,
    query: 'Esbjerg harbor skyline',
    alt:   'Esbjerg harbor skyline',
  },

  /* Belgium */
  'brussels': {
    url:   `https://images.unsplash.com/photo-1559113202-c916b8e44373${RENDER}`,
    query: 'Brussels skyline EU district',
    alt:   'Brussels skyline with EU district',
  },
  'antwerp': {
    url:   `https://images.unsplash.com/photo-1593183981775-f6c4a017c1ce${RENDER}`,
    query: 'Antwerp port skyline',
    alt:   'Antwerp port skyline',
  },
  'ghent': {
    url:   `https://images.unsplash.com/photo-1571055107559-3e67626fa8be${RENDER}`,
    query: 'Ghent canal skyline',
    alt:   'Ghent canal skyline',
  },
  'liege': {
    url:   `https://images.unsplash.com/photo-1599930113854-d6d7fd522504${RENDER}`,
    query: 'Liege skyline Belgium',
    alt:   'Liège river skyline',
  },
  'bruges': {
    url:   `https://images.unsplash.com/photo-1577086664693-894d8405334a${RENDER}`,
    query: 'Bruges skyline Belgium',
    alt:   'Bruges historic skyline',
  },

  /* Austria */
  'vienna': {
    url:   `https://images.unsplash.com/photo-1516550893923-42d28e5677af${RENDER}`,
    query: 'Vienna skyline Austria',
    alt:   'Vienna historic skyline',
  },
  'graz': {
    url:   `https://images.unsplash.com/photo-1568322445389-f64ac2515020${RENDER}`,
    query: 'Graz skyline Austria',
    alt:   'Graz old town skyline',
  },
  'linz': {
    url:   `https://images.unsplash.com/photo-1582645014369-e6f3e35a8a91${RENDER}`,
    query: 'Linz Danube skyline',
    alt:   'Linz Danube skyline',
  },
  'salzburg': {
    url:   `https://images.unsplash.com/photo-1467269204594-9661b134dd2b${RENDER}`,
    query: 'Salzburg fortress skyline',
    alt:   'Salzburg skyline with Hohensalzburg fortress',
  },
  'innsbruck': {
    url:   `https://images.unsplash.com/photo-1551889335-d8db7d61a13d${RENDER}`,
    query: 'Innsbruck Alps skyline',
    alt:   'Innsbruck skyline against the Alps',
  },

  /* Switzerland */
  'zurich': {
    url:   `https://images.unsplash.com/photo-1574494649037-0b97e8c3f8b3${RENDER}`,
    query: 'Zurich skyline lakefront',
    alt:   'Zürich lakefront skyline',
  },
  'geneva': {
    url:   `https://images.unsplash.com/photo-1591025207163-942350e47db2${RENDER}`,
    query: 'Geneva skyline Switzerland Alps',
    alt:   'Geneva lake skyline with the Alps',
  },
  'basel': {
    url:   `https://images.unsplash.com/photo-1564507592333-c60657eea523${RENDER}`,
    query: 'Basel Rhine skyline',
    alt:   'Basel skyline along the Rhine',
  },
  'bern': {
    url:   `https://images.unsplash.com/photo-1568322445389-f64ac2515020${RENDER}`,
    query: 'Bern old town skyline',
    alt:   'Bern old town skyline',
  },
  'lausanne': {
    url:   `https://images.unsplash.com/photo-1591025207163-942350e47db2${RENDER}`,
    query: 'Lausanne skyline Switzerland',
    alt:   'Lausanne hillside skyline',
  },

  /* Czech Republic */
  'prague': {
    url:   `https://images.unsplash.com/photo-1541849546-216549ae216d${RENDER}`,
    query: 'Prague Charles Bridge skyline',
    alt:   'Prague skyline with Charles Bridge',
  },
  'brno': {
    url:   `https://images.unsplash.com/photo-1597428622811-c2adfde8ea71${RENDER}`,
    query: 'Brno skyline Czech Republic',
    alt:   'Brno cathedral skyline',
  },
  'ostrava': {
    url:   `https://images.unsplash.com/photo-1582645014369-e6f3e35a8a91${RENDER}`,
    query: 'Ostrava skyline Czech Republic',
    alt:   'Ostrava industrial skyline',
  },
  'plzen': {
    url:   `https://images.unsplash.com/photo-1577086664693-894d8405334a${RENDER}`,
    query: 'Plzen skyline Czech Republic',
    alt:   'Plzeň historic skyline',
  },
  'liberec': {
    url:   `https://images.unsplash.com/photo-1551889335-d8db7d61a13d${RENDER}`,
    query: 'Liberec skyline Czech Republic',
    alt:   'Liberec mountain skyline',
  },
};

/** Lookup helper — falls through to the generic European fallback if
 *  the slug isn't registered (e.g. a brand-new anchor city added to
 *  ANCHOR_CITIES before this registry catches up). */
export function heroForCity(slug: string): HeroImage {
  return ANCHOR_CITY_HERO[slug] ?? {
    url:   FALLBACK_SKYLINE,
    query: 'European skyline',
    alt:   'European city skyline',
  };
}

/** Lookup helper — returns the country shopfront hero (capital skyline). */
export function heroForExpansionCountry(code: ExpansionCountryCode): HeroImage {
  return EXPANSION_COUNTRY_HERO[code];
}
