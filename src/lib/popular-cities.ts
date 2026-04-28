import type { BookingCountry } from './store';

/* ─────────────────────────────────────────────────────────────────
 * Popular cities per country shopfront.
 *
 * Surfaced as a chip row below the hero copy on each country market
 * page. Clicking a chip routes to /providers/directory pre-filtered
 * by country with the city name in the search query — the directory's
 * text search hits ProviderRecord.city, so the result set narrows to
 * providers serving that city without any new filter dimension.
 *
 * Curated for now; a future Supabase view (`provider_city_coverage`)
 * can be queried for the same shape.
 * ───────────────────────────────────────────────────────────────── */

export const POPULAR_CITIES: Record<BookingCountry, string[]> = {
  us: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Atlanta', 'Dallas', 'Boston'],
  ca: ['Toronto', 'Montréal', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton', 'Halifax'],
  gb: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Edinburgh', 'Glasgow'],
  de: ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf'],
  fr: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Nice'],
  no: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Tromsø'],
};
