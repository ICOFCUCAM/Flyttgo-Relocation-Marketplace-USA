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

/* ─────────────────────────────────────────────────────────────────
 * Popular corridors per country — chip pairs with indicative
 * starting prices.
 *
 * Surfaced on the country hero as the "Popular X moves" row. Prices
 * are starting-from estimates anchored to the same per-country
 * baseline the live calculator uses (lib/pricing-engine/data.ts);
 * they're not a guarantee, so the chip text reads "from $X". The
 * `from` / `to` strings double as the search query when the chip is
 * tapped — same downstream as the legacy POPULAR_CITIES chips.
 *
 * Extending: keep 4–6 entries per country so the row wraps cleanly
 * on mobile.
 * ───────────────────────────────────────────────────────────────── */

export interface PopularCorridor {
  from:  string;
  to:    string;
  /** Display string, e.g. "from $520" or "ab 380 €". Must match the
   *  country's currency to feel native. */
  price: string;
}

export const POPULAR_CORRIDORS: Record<BookingCountry, PopularCorridor[]> = {
  us: [
    { from: 'New York',    to: 'Boston',      price: 'from $520' },
    { from: 'Dallas',      to: 'Austin',      price: 'from $280' },
    { from: 'Los Angeles', to: 'San Diego',   price: 'from $340' },
    { from: 'Chicago',     to: 'Detroit',     price: 'from $620' },
    { from: 'Phoenix',     to: 'Las Vegas',   price: 'from $480' },
    { from: 'Atlanta',     to: 'Charlotte',   price: 'from $390' },
  ],
  ca: [
    { from: 'Toronto',     to: 'Montréal',    price: 'from C$540' },
    { from: 'Vancouver',   to: 'Calgary',     price: 'from C$680' },
    { from: 'Ottawa',      to: 'Toronto',     price: 'from C$320' },
    { from: 'Edmonton',    to: 'Calgary',     price: 'from C$240' },
    { from: 'Halifax',     to: 'Moncton',     price: 'from C$280' },
  ],
  gb: [
    { from: 'London',      to: 'Manchester',  price: 'from £390' },
    { from: 'Birmingham',  to: 'London',      price: 'from £280' },
    { from: 'Edinburgh',   to: 'Glasgow',     price: 'from £180' },
    { from: 'Leeds',       to: 'Manchester',  price: 'from £170' },
    { from: 'Bristol',     to: 'London',      price: 'from £290' },
  ],
  de: [
    { from: 'Berlin',      to: 'Hamburg',     price: 'ab 320 €' },
    { from: 'München',     to: 'Stuttgart',   price: 'ab 280 €' },
    { from: 'Frankfurt',   to: 'Köln',        price: 'ab 240 €' },
    { from: 'Düsseldorf',  to: 'Hamburg',     price: 'ab 360 €' },
    { from: 'Berlin',      to: 'München',     price: 'ab 480 €' },
  ],
  fr: [
    { from: 'Paris',       to: 'Lyon',        price: 'à partir de 360 €' },
    { from: 'Marseille',   to: 'Nice',        price: 'à partir de 240 €' },
    { from: 'Bordeaux',    to: 'Toulouse',    price: 'à partir de 220 €' },
    { from: 'Lille',       to: 'Paris',       price: 'à partir de 280 €' },
    { from: 'Lyon',        to: 'Marseille',   price: 'à partir de 320 €' },
  ],
  no: [
    { from: 'Oslo',        to: 'Bergen',      price: 'fra 4 800 kr' },
    { from: 'Trondheim',   to: 'Oslo',        price: 'fra 5 200 kr' },
    { from: 'Stavanger',   to: 'Bergen',      price: 'fra 3 600 kr' },
    { from: 'Drammen',     to: 'Oslo',        price: 'fra 1 800 kr' },
    { from: 'Tromsø',      to: 'Bodø',        price: 'fra 4 200 kr' },
  ],
};

/* ─────────────────────────────────────────────────────────────────
 * Per-country compliance pills surfaced under the hero headline.
 * Tells US visitors "USDOT", UK visitors "GVOL", DE visitors
 * "Spediteur" — the regulator each market actually recognises.
 * Plus the universal "Escrow-secured" + cover amount.
 * ───────────────────────────────────────────────────────────────── */

export const COUNTRY_COMPLIANCE_PILLS: Record<BookingCountry, string[]> = {
  us: ['USDOT licensed carriers',  'FMCSA compliant',                '$50,000 cargo coverage',     'Escrow-secured'],
  ca: ['NSC certified carriers',   'Provincial licensed',            'C$60,000 cargo coverage',    'Escrow-secured'],
  gb: ['GVOL UK operators',        'BAR Advance Payment Guarantee',  '£40,000 goods-in-transit',   'Escrow-secured'],
  de: ['Lizenzierte Spediteure',   'GüKG-konform',                   '40 000 € Schadensschutz',    'Treuhand-gesichert'],
  fr: ['Transporteurs licenciés',  'Conforme LOTI',                  '40 000 € de couverture',     'Paiement séquestre'],
  no: ['Løyve-sertifisert',        'Yrkestransportloven',            '400 000 kr forsikring',      'Escrow-sikret'],
};

/* ─────────────────────────────────────────────────────────────────
 * Indicative provider-supply count per country — shown as social
 * proof in the hero ("312 licensed movers available this week").
 * Eventually a Supabase view aggregating driver_profiles +
 * driver_subscriptions can replace this curated table.
 * ───────────────────────────────────────────────────────────────── */

export const PROVIDER_AVAILABILITY_THIS_WEEK: Record<BookingCountry, number> = {
  us: 312, ca: 84, gb: 196, de: 142, fr: 118, no: 47,
};
