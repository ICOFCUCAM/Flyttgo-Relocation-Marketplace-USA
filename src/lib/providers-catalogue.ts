import type { BookingCountry } from './store';

/**
 * Provider catalogue (Wave 21).
 *
 * Curated list of marketplace providers used by both TopProviders
 * (home grid) and the new ProviderProfilePage. The shape mirrors what
 * a `providers` Supabase view will eventually return, so swapping
 * curated → live is a one-call change in each consumer.
 *
 * Slugs are URL-safe, hyphenated, lowercase. They double as the
 * catalogue id since they're stable across deploys.
 */

export interface ProviderRecord {
  slug:        string;
  name:        string;
  city:        string;
  country:     BookingCountry;
  flag:        string;
  rating:      number;
  reviews:     number;
  fromPrice:   string;
  badge?:      string;
  verified:    string[];
  /** One-paragraph profile blurb in the provider's marketing voice. */
  about:       string;
  /** Service categories this provider performs. */
  services:    string[];
  /** Vehicles in fleet (illustrative). */
  fleet:       string[];
  /** Operator licence references surfaced for transparency. */
  licences:    { label: string; value: string }[];
  /** Sample completed jobs — short, datestamped, anonymous. */
  sampleJobs:  { date: string; route: string; van: string; rating: number }[];
  /** Shortlisted reviews. */
  reviewsList: { name: string; date: string; rating: number; text: string }[];
  /** Coverage radius (string, illustrative). */
  coverage:    string;
  /** Years operating. */
  yearsActive: number;
  /** Live availability indicator surfaced on cards + profile.
   *
   *   - 'available_now' : free slot in the next 24 h
   *   - 'books_fast'    : usually books out within 48 h of publish
   *   - 'slots_left'    : limited capacity this week (carries `slotsLeft`)
   *   - 'busy'          : fully booked, joining waitlist
   *
   * In production this is computed by an edge function from the
   * provider's accepted-jobs feed against their declared capacity.
   * For now we curate per record so the UX is wired end-to-end. */
  availability?: 'available_now' | 'books_fast' | 'slots_left' | 'busy';
  /** Optional integer slot count, used when availability='slots_left'. */
  slotsLeft?:    number;
}

export const PROVIDERS: ProviderRecord[] = [
  {
    slug:      'big-apple-movers-co',
    name:      'Big Apple Movers Co.',
    city:      'New York City, NY',
    country:   'us',
    flag:      '🇺🇸',
    rating:    4.95,
    reviews:   2_180,
    fromPrice: 'from $480',
    badge:     'Elite',
    verified:  ['USDOT', '$50k cargo', 'Bonded'],
    about:     'Family-run interstate carrier serving the New York tri-state area since 2014. USDOT-registered, FMCSA-tracked, and the only Elite-tier carrier on the FlyttGo NYC roster. Full-pack, partial-pack, and labor-only crews on call seven days a week.',
    services:  ['Long-distance moves', 'Local moves', 'Office relocation', 'Packing', 'Storage staging'],
    fleet:     ['16 ft box truck × 4', '24 ft box truck × 6', 'Sprinter cargo van × 3'],
    licences:  [
      { label: 'USDOT',           value: '3142709' },
      { label: 'MC #',            value: '109344-C' },
      { label: 'Insurance limit', value: '$50,000 cargo / $1M general liability' },
    ],
    sampleJobs: [
      { date: '2026-04-18', route: 'Brooklyn → Manhattan',     van: '16 ft box', rating: 5 },
      { date: '2026-04-17', route: 'Williamsburg → Hoboken',   van: '24 ft box', rating: 5 },
      { date: '2026-04-15', route: 'Upper West Side → Queens', van: 'Sprinter',  rating: 4.5 },
    ],
    reviewsList: [
      { name: 'Olivia R.', date: '2 days ago',  rating: 5,   text: 'Three-bed brownstone in 6 hours. Polite, on time, and the price held to the cent. Sixth time I have used them.' },
      { name: 'Daniel K.', date: '5 days ago',  rating: 5,   text: 'They padded the antique sideboard like it was their own. Faultless.' },
      { name: 'Priya S.',  date: '1 week ago',  rating: 4.5, text: 'Great crew; tip jar would have been nice on the booking form.' },
    ],
    coverage:    'Five boroughs · NJ · CT · PA · MA',
    yearsActive: 12,
    availability: 'books_fast',
  },
  {
    slug:      'london-lift-and-shift',
    name:      'London Lift & Shift Ltd.',
    city:      'London, UK',
    country:   'gb',
    flag:      '🇬🇧',
    rating:    4.92,
    reviews:   1_640,
    fromPrice: 'from £380',
    badge:     'Gold Pro',
    verified:  ['GVOL', 'BAR APG', '£75k goods cover'],
    about:     'A London-only crew of 12 with five years on the FlyttGo platform and a perfect on-time record this year. We specialise in narrow-stair walk-ups and same-day Zone-1-to-Zone-1 moves.',
    services:  ['Local moves', 'Office relocation', 'Same-day delivery', 'Packing'],
    fleet:     ['Luton box × 5', 'LWB Sprinter × 4', 'SWB Transit × 2'],
    licences:  [
      { label: 'GVOL operator',  value: 'OF1234567' },
      { label: 'BAR APG member', value: 'BAR/APG/4421' },
      { label: 'Insurance',      value: '£75,000 goods-in-transit / £2M PL' },
    ],
    sampleJobs: [
      { date: '2026-04-18', route: 'Camden → Shoreditch', van: 'Luton',    rating: 5 },
      { date: '2026-04-17', route: 'Battersea → Wapping', van: 'Sprinter', rating: 5 },
      { date: '2026-04-15', route: 'Hackney → Kingston',  van: 'Luton',    rating: 4.5 },
    ],
    reviewsList: [
      { name: 'Hannah W.', date: '3 days ago',  rating: 5, text: 'Took a piano up four flights without breaking sweat. Charged the original quote.' },
      { name: 'Jamal A.',  date: '1 week ago',  rating: 5, text: 'Booked at 9am, moving by 11am. London at its best.' },
    ],
    coverage:    'All London zones · M25 corridor',
    yearsActive: 5,
    availability: 'slots_left',
    slotsLeft:    3,
  },
  {
    slug:      'oslo-flyttebyra',
    name:      'Oslo Flyttebyrå AS',
    city:      'Oslo, NO',
    country:   'no',
    flag:      '🇳🇴',
    rating:    4.97,
    reviews:   1_120,
    fromPrice: 'fra 4 200 kr',
    badge:     'Home market',
    verified:  ['Yrkesløyve', 'NHO', '500 000 kr forsikring'],
    about:     'Et norsk flyttebyrå med løyve og full forsikringsdekning. Dekker hele Østlandet, Bergen og Stavanger. Snakker norsk, engelsk, polsk og litauisk.',
    services:  ['Lokal flytting', 'Bedriftsflytting', 'Pakking', 'Lager'],
    fleet:     ['Mercedes Sprinter × 6', 'Iveco Daily × 3'],
    licences:  [
      { label: 'Yrkesløyve',     value: 'NO 887 654 321 MVA' },
      { label: 'NHO Transport',  value: 'Medlem siden 2018' },
      { label: 'Forsikring',     value: '500 000 kr per oppdrag' },
    ],
    sampleJobs: [
      { date: '2026-04-18', route: 'Frogner → Bergen',  van: 'Sprinter',     rating: 5 },
      { date: '2026-04-17', route: 'Grünerløkka → Tøyen', van: 'Iveco Daily', rating: 5 },
    ],
    reviewsList: [
      { name: 'Erik H.',  date: '2 dager siden',  rating: 5, text: 'Profesjonelle, raske og hyggelige. Anbefales!' },
      { name: 'Maria L.', date: '1 uke siden',    rating: 5, text: 'Flyttingen tok halvparten av tiden jeg hadde forventet.' },
    ],
    coverage:    'Oslo, Akershus, Bergen, Stavanger, Trondheim',
    yearsActive: 8,
    availability: 'available_now',
  },
  {
    slug:      'berlin-umzugsprofis',
    name:      'Berlin Umzugsprofis',
    city:      'Berlin, DE',
    country:   'de',
    flag:      '🇩🇪',
    rating:    4.89,
    reviews:   1_350,
    fromPrice: 'ab 420 €',
    badge:     'Gold',
    verified:  ['GüKG', 'BAG-Lizenz', '50 000 € Versicherung'],
    about:     'Lizenzierte Berliner Umzugsfirma mit BAG-Konzession seit 2017. Spezialisiert auf Konzernumzüge und studentische Umzüge zwischen Berlin und München.',
    services:  ['Lokale Umzüge', 'Konzernumzug', 'Verpackung', 'Lagerlösungen'],
    fleet:     ['Mercedes Atego 7,5t × 3', 'Mercedes Sprinter × 5'],
    licences:  [
      { label: 'GüKG-Konzession', value: 'DE BL-1287/2017' },
      { label: 'BAG',             value: 'Lizenz #44872' },
      { label: 'Versicherung',    value: '50 000 € pro Umzug' },
    ],
    sampleJobs: [
      { date: '2026-04-18', route: 'Mitte → Kreuzberg',     van: 'Sprinter',  rating: 5 },
      { date: '2026-04-17', route: 'Charlottenburg → Pankow', van: 'Atego',    rating: 4.5 },
    ],
    reviewsList: [
      { name: 'Lukas M.',   date: '4 Tage',  rating: 5, text: 'Pünktlich, vorsichtig, fairer Preis. Genau das, was Berlin braucht.' },
      { name: 'Sabine K.',  date: '1 Woche', rating: 5, text: 'Haben unseren Konzernumzug in einer Woche koordiniert.' },
    ],
    coverage:    'Berlin · Brandenburg · München · Hamburg · Köln',
    yearsActive: 9,
    availability: 'books_fast',
  },
  {
    slug:      'demenageurs-ile-de-france',
    name:      'Déménageurs Île-de-France',
    city:      'Paris, FR',
    country:   'fr',
    flag:      '🇫🇷',
    rating:    4.86,
    reviews:   1_080,
    fromPrice: 'à partir de 460 €',
    badge:     'Gold',
    verified:  ['Registre', 'Capacité', '50 000 € assurance'],
    about:     'Société de déménagement parisienne inscrite au registre des transporteurs depuis 2016. Équipes bilingues français-anglais pour les expatriés.',
    services:  ['Déménagement local', 'Déménagement entreprise', 'Emballage', 'Stockage'],
    fleet:     ['Renault Master × 6', 'Iveco Daily 35S × 3'],
    licences:  [
      { label: 'Registre',         value: 'FR-IDF-002218' },
      { label: 'Attestation',      value: 'Capacité de transport intérieur' },
      { label: 'Assurance',        value: '50 000 € par déménagement' },
    ],
    sampleJobs: [
      { date: '2026-04-18', route: 'Paris 15 → Lyon',        van: 'Master',     rating: 5 },
      { date: '2026-04-17', route: 'Paris 11 → Versailles',   van: 'Iveco Daily', rating: 4.5 },
    ],
    reviewsList: [
      { name: 'Sophie D.', date: '3 jours',   rating: 5, text: 'Devis instantané, tarif tenu, équipe charmante.' },
      { name: 'Antoine R.', date: '1 semaine', rating: 5, text: 'Premier déménagement sans stress de ma vie.' },
    ],
    coverage:    'Île-de-France · Lyon · Marseille · Bordeaux',
    yearsActive: 10,
    availability: 'slots_left',
    slotsLeft:    2,
  },
  {
    slug:      'maple-move-co',
    name:      'Maple Move Co.',
    city:      'Toronto, CA',
    country:   'ca',
    flag:      '🇨🇦',
    rating:    4.88,
    reviews:   880,
    fromPrice: 'from C$520',
    badge:     'Bilingual',
    verified:  ['Provincial', 'Bilingual', '$60k cargo'],
    about:     'Bilingual (English / French) interprovincial mover based in Toronto with a satellite team in Montréal. CCMTA-compliant for cross-provincial relocations.',
    services:  ['Long-distance moves', 'Local moves', 'Bilingual coordination'],
    fleet:     ['Freightliner M2 × 2', 'Sprinter cargo × 4'],
    licences:  [
      { label: 'ON Provincial', value: 'IRP-CA-118832' },
      { label: 'CCMTA',         value: 'Compliant since 2019' },
      { label: 'Insurance',     value: 'C$60,000 cargo' },
    ],
    sampleJobs: [
      { date: '2026-04-18', route: 'Toronto → Montréal',  van: 'Freightliner M2', rating: 5 },
      { date: '2026-04-17', route: 'Toronto → Ottawa',     van: 'Sprinter',        rating: 4.5 },
    ],
    reviewsList: [
      { name: 'Ava T.', date: '5 days ago', rating: 5, text: 'Crew switched to French the moment we crossed into Quebec. Felt thoughtful.' },
    ],
    coverage:    'Ontario · Québec · Maritimes',
    yearsActive: 7,
    availability: 'available_now',
  },
];

export function findProvider(slug: string | null | undefined): ProviderRecord | undefined {
  if (!slug) return undefined;
  return PROVIDERS.find(p => p.slug === slug);
}
