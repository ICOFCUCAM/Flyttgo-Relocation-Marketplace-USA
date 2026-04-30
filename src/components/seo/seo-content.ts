/* ─────────────────────────────────────────────────────────────────
 * SEO content for country storefront pages
 *
 * Localized headlines, paragraphs, and corridor lists keyed by
 * (countryCode, languageCode). Plain TS data so it's statically
 * crawlable in the rendered HTML — no client-only translation.
 *
 * Adding a country: add a `<countryCode>` key with at least one
 * supported language entry. Adding a language to an existing
 * country: add a sub-key under the country.
 *
 * SEO best-practice followed:
 *   - h2 in the rendered headline (component decides the tag)
 *   - plain text paragraphs, no client-only state
 *   - city corridor list rendered as h3 + <p>, semantic
 *   - native-language phrasing for FR / DE / NB so Google's locale-
 *     aware indexer treats each block as native content
 * ───────────────────────────────────────────────────────────────── */

export type SEOCountryCode = 'us' | 'ca' | 'uk' | 'fr' | 'de' | 'no';
export type SEOLanguageCode = 'en' | 'fr' | 'de' | 'nb';

export interface CorridorEntry {
  /** URL slug — kebab-cased ascii-only city pair, e.g.
   *  "new-york-boston". Stable across locales for the same
   *  country so /corridor/<country>/<slug> works for both Canada
   *  EN and Canada FR pages with the same set of slugs. */
  slug:    string;
  /** From-city display name (with native diacritics). */
  fromCity: string;
  /** To-city display name (with native diacritics). */
  toCity:   string;
  /** Pre-formatted heading, e.g. "New York → Boston movers". */
  heading: string;
  /** 1–2 sentence relocation-context paragraph. */
  body:    string;
}

export interface SEOContent {
  /** h2 — primary section headline. */
  headline:     string;
  /** Section eyebrow above the headline. */
  eyebrow:      string;
  /** Primary SEO paragraph. 80–160 words, native phrasing,
   *  uses keyword targets (licensed movers, distance-priced,
   *  escrow, corridor relocation, student / corporate). */
  paragraph:    string;
  /** Subsection headline for the corridors block. */
  corridorsHeadline: string;
  /** Corridors. Renders as accordion on mobile / 2-col on desktop. */
  corridors:    CorridorEntry[];
}

type ContentByLang = Partial<Record<SEOLanguageCode, SEOContent>>;

export const SEO_CONTENT: Record<SEOCountryCode, ContentByLang> = {
  /* ── United States ──────────────────────────────────────── */
  us: {
    en: {
      eyebrow:  'United States',
      headline: 'Licensed movers across the United States',
      paragraph:
        'FlyttGo coordinates relocations with USDOT- and FMCSA-registered carriers across all 50 states. Every quote on the platform is distance-priced — drive-time, corridor demand, and metro surge multipliers are computed from real OSRM road-network data, not flat estimates. Bookings are escrow-protected: funds clear to the carrier only after the customer confirms delivery, and goods-in-transit insurance is held by every dispatched provider for at least $50,000. Long-distance corridor relocations between the Northeast, Midwest, Sun Belt, and the West Coast are coordinated end-to-end through one platform, including student moves to and from major U.S. universities and corporate relocations under enterprise framework agreements.',
      corridorsHeadline: 'Popular U.S. relocation corridors',
      corridors: [
        { slug: 'new-york-boston',     fromCity: 'New York',    toCity: 'Boston',
          heading: 'New York → Boston movers',
          body:    'Northeast intercity corridor with regular interstate dispatch — Manhattan, Brooklyn, and Queens to Greater Boston in a single insured transit, typically 5–7 hours by road.' },
        { slug: 'dallas-austin',       fromCity: 'Dallas',      toCity: 'Austin',
          heading: 'Dallas → Austin movers',
          body:    'Texas Triangle corridor with same-day and next-day windows. Licensed Texas-DOT and USDOT-registered carriers across DFW and Austin metros.' },
        { slug: 'los-angeles-san-diego', fromCity: 'Los Angeles', toCity: 'San Diego',
          heading: 'Los Angeles → San Diego movers',
          body:    'Southern California coastal corridor — short-haul interstate, regular labor-only crews available alongside full-service relocation, escrow-protected.' },
        { slug: 'chicago-detroit',     fromCity: 'Chicago',     toCity: 'Detroit',
          heading: 'Chicago → Detroit movers',
          body:    'Midwest cross-state corridor between Cook County and Wayne County with FMCSA-registered carriers offering both same-day and overnight transit options.' },
        { slug: 'atlanta-charlotte',   fromCity: 'Atlanta',     toCity: 'Charlotte',
          heading: 'Atlanta → Charlotte movers',
          body:    'Southeast corridor along I-85 with corporate and student-mobility carriers serving the Research Triangle and the Atlanta metro.' },
      ],
    },
  },

  /* ── Canada ─────────────────────────────────────────────── */
  ca: {
    en: {
      eyebrow:  'Canada',
      headline: 'Compare licensed movers across Canada',
      paragraph:
        'FlyttGo connects Canadian customers with federally compliant moving companies across every province. Each carrier is licensed under the National Safety Code and provincial transport authorities, with goods-in-transit insurance held at the provider level. Distance-based quotes are computed from real road distance, with corridor-specific demand multipliers for the Toronto–Montréal, Vancouver–Calgary, and Atlantic Canada corridors. Bookings are escrow-protected — funds release only after the customer confirms delivery, and bilingual coordination is available across English- and French-speaking provinces. University corridor relocations and corporate workforce moves under framework agreements are supported through the same booking flow.',
      corridorsHeadline: 'Popular Canadian relocation corridors',
      corridors: [
        { slug: 'toronto-montreal',     fromCity: 'Toronto',   toCity: 'Montréal',
          heading: 'Toronto → Montréal movers',
          body:    'Cross-province ON–QC corridor with bilingual dispatch and federally compliant carriers operating along the 401.' },
        { slug: 'vancouver-calgary',    fromCity: 'Vancouver', toCity: 'Calgary',
          heading: 'Vancouver → Calgary movers',
          body:    'Cross-Rockies BC–AB corridor with insured long-haul carriers; weather-aware scheduling for winter months.' },
        { slug: 'ottawa-toronto',       fromCity: 'Ottawa',    toCity: 'Toronto',
          heading: 'Ottawa → Toronto movers',
          body:    'National Capital to Greater Toronto Area — short-haul intercity with same-week availability.' },
        { slug: 'montreal-quebec-city', fromCity: 'Montréal',  toCity: 'Québec City',
          heading: 'Montréal → Québec City movers',
          body:    'Intra-Québec corridor with French-speaking dispatchers and Québec transport-authority licensed carriers.' },
      ],
    },
    fr: {
      eyebrow:  'Canada',
      headline: 'Comparez des déménageurs agréés partout au Canada',
      paragraph:
        'FlyttGo met en relation les clients canadiens avec des entreprises de déménagement conformes aux réglementations fédérales et provinciales, dans toutes les provinces. Chaque transporteur est agréé selon le Code canadien de sécurité et les autorités de transport provinciales, avec une assurance marchandises en transit détenue au niveau du prestataire. Les devis sont calculés selon la distance réelle, avec des multiplicateurs de corridor pour les axes Toronto–Montréal, Vancouver–Calgary et le Canada atlantique. Les réservations sont protégées par séquestre : les fonds ne sont versés au transporteur qu’après confirmation de la livraison. Coordination bilingue, déménagements étudiants vers les universités et déménagements d’entreprise sous accords-cadres pris en charge par la même plateforme.',
      corridorsHeadline: 'Corridors de déménagement populaires au Canada',
      corridors: [
        { slug: 'montreal-toronto',     fromCity: 'Montréal',  toCity: 'Toronto',
          heading: 'Montréal → Toronto déménagement',
          body:    'Corridor interprovincial QC–ON le long de la 401, dispatch bilingue et transporteurs conformes aux normes fédérales.' },
        { slug: 'quebec-montreal',      fromCity: 'Québec',    toCity: 'Montréal',
          heading: 'Québec → Montréal déménagement',
          body:    'Corridor intra-Québec avec des dispatcheurs francophones et des transporteurs agréés par la SAAQ-T.' },
        { slug: 'vancouver-calgary',    fromCity: 'Vancouver', toCity: 'Calgary',
          heading: 'Vancouver → Calgary déménagement',
          body:    'Corridor BC–AB à travers les Rocheuses, transporteurs longue distance assurés et planification adaptée à l’hiver.' },
        { slug: 'ottawa-toronto',       fromCity: 'Ottawa',    toCity: 'Toronto',
          heading: 'Ottawa → Toronto déménagement',
          body:    'De la capitale nationale au Grand Toronto — courte distance interurbaine avec disponibilité dans la semaine.' },
      ],
    },
  },

  /* ── United Kingdom ─────────────────────────────────────── */
  uk: {
    en: {
      eyebrow:  'United Kingdom',
      headline: 'Licensed removal companies across the United Kingdom',
      paragraph:
        'FlyttGo coordinates removals with GVOL-licensed UK operators across England, Scotland, Wales, and Northern Ireland. Every quote is distance-priced using real road-network data, with corridor-specific multipliers for the M1, M6, and Edinburgh–Glasgow routes. Bookings are escrow-protected — funds clear to the operator only after the customer confirms delivery — and goods-in-transit insurance is held at the operator level on every dispatched move. Student relocation around UK universities, corporate relocation under enterprise framework agreements, and same-day local removals across Greater London are coordinated through one booking flow.',
      corridorsHeadline: 'Popular UK relocation corridors',
      corridors: [
        { slug: 'london-manchester',    fromCity: 'London',     toCity: 'Manchester',
          heading: 'London → Manchester removals',
          body:    'M1/M6 corridor with regular intercity dispatch and GVOL-licensed operators serving Greater London and Greater Manchester.' },
        { slug: 'london-birmingham',    fromCity: 'London',     toCity: 'Birmingham',
          heading: 'London → Birmingham removals',
          body:    'Midlands corridor along the M40 — short-haul intercity removal with same-week availability across both metros.' },
        { slug: 'leeds-london',         fromCity: 'Leeds',      toCity: 'London',
          heading: 'Leeds → London removals',
          body:    'Yorkshire to Greater London corridor with overnight transit and licensed long-distance operators.' },
        { slug: 'edinburgh-glasgow',    fromCity: 'Edinburgh',  toCity: 'Glasgow',
          heading: 'Edinburgh → Glasgow removals',
          body:    'Central Belt intra-Scotland removal corridor — short-haul transit with same-day local availability.' },
      ],
    },
  },

  /* ── France ─────────────────────────────────────────────── */
  fr: {
    fr: {
      eyebrow:  'France',
      headline: 'Déménageurs agréés partout en France',
      paragraph:
        'FlyttGo met en relation les clients français avec des entreprises de déménagement inscrites au registre des transporteurs et titulaires d’une licence de transport intérieur. Chaque devis est calculé en fonction de la distance réelle et des multiplicateurs de corridor pour les axes Paris–Lyon, Marseille–Nice et la côte atlantique. Les réservations sont sécurisées par séquestre : les fonds ne sont libérés au transporteur qu’après confirmation de la livraison par le client. Couverture marchandises en transit assurée par chaque prestataire, accompagnement bilingue, déménagements étudiants vers les grandes universités françaises et déménagements d’entreprise sous accords-cadres pris en charge par la même plateforme.',
      corridorsHeadline: 'Corridors de déménagement populaires en France',
      corridors: [
        { slug: 'paris-lyon',           fromCity: 'Paris',      toCity: 'Lyon',
          heading: 'Paris → Lyon déménagement',
          body:    'Corridor Île-de-France–Auvergne-Rhône-Alpes le long de l’A6/A7, transporteurs agréés et dispatch sous 48 h.' },
        { slug: 'paris-bordeaux',       fromCity: 'Paris',      toCity: 'Bordeaux',
          heading: 'Paris → Bordeaux déménagement',
          body:    'Corridor Île-de-France–Nouvelle-Aquitaine avec transporteurs longue distance assurés.' },
        { slug: 'marseille-nice',       fromCity: 'Marseille',  toCity: 'Nice',
          heading: 'Marseille → Nice déménagement',
          body:    'Corridor Côte d’Azur — courte distance interurbaine avec disponibilité jour-même.' },
        { slug: 'lyon-toulouse',        fromCity: 'Lyon',       toCity: 'Toulouse',
          heading: 'Lyon → Toulouse déménagement',
          body:    'Corridor sud-est sud-ouest, transporteurs conformes au registre des transporteurs et planification adaptée.' },
      ],
    },
  },

  /* ── Germany ────────────────────────────────────────────── */
  de: {
    de: {
      eyebrow:  'Deutschland',
      headline: 'Zugelassene Umzugsunternehmen in ganz Deutschland vergleichen',
      paragraph:
        'FlyttGo bringt Kunden in Deutschland mit nach GüKG zugelassenen Umzugsunternehmen in allen 16 Bundesländern zusammen. Jedes Angebot ist entfernungsbasiert — reale Streckendaten und Korridor-Multiplikatoren für Berlin–München, Hamburg–Berlin und das Rhein-Main-Gebiet fließen in die Preisberechnung ein. Buchungen sind treuhandgeschützt: Die Auszahlung an den Anbieter erfolgt erst, nachdem der Kunde die Lieferung bestätigt hat. Eine Warenversicherung wird vom jeweiligen Anbieter mit mindestens 50.000 € pro Buchung gehalten. Studentische Umzüge zu deutschen Universitäten und Firmenumzüge im Rahmen von Vereinbarungen mit Großkunden werden über denselben Buchungsprozess koordiniert.',
      corridorsHeadline: 'Beliebte Umzugskorridore in Deutschland',
      corridors: [
        { slug: 'berlin-muenchen',      fromCity: 'Berlin',     toCity: 'München',
          heading: 'Berlin → München Umzug',
          body:    'Nord-Süd-Korridor entlang der A9 mit GüKG-zugelassenen Spediteuren und regelmäßigen Inter­stadt-Verbindungen.' },
        { slug: 'hamburg-berlin',       fromCity: 'Hamburg',    toCity: 'Berlin',
          heading: 'Hamburg → Berlin Umzug',
          body:    'Norddeutscher Korridor mit kurzer Fahrtzeit über die A24 — versicherte Spediteure und Same-Week-Verfügbarkeit.' },
        { slug: 'frankfurt-koeln',      fromCity: 'Frankfurt',  toCity: 'Köln',
          heading: 'Frankfurt → Köln Umzug',
          body:    'Rhein-Main bis Rheinland — kurze Strecke entlang der A3 mit versicherter Same-Day-Verfügbarkeit.' },
        { slug: 'stuttgart-muenchen',   fromCity: 'Stuttgart',  toCity: 'München',
          heading: 'Stuttgart → München Umzug',
          body:    'Süddeutscher Korridor zwischen Baden-Württemberg und Bayern, Spediteure mit Güter­schadenversicherung.' },
      ],
    },
  },

  /* ── Norway ─────────────────────────────────────────────── */
  no: {
    nb: {
      eyebrow:  'Norge',
      headline: 'Lisensierte flyttefirmaer over hele Norge',
      paragraph:
        'FlyttGo kobler norske kunder med flyttefirmaer som har yrkestransportløyve og er registrert hos Statens vegvesen. Hvert tilbud er avstandsbasert — reell veidata og korridor-multiplikatorer for Oslo–Bergen, Oslo–Trondheim og kysten på Vestlandet inngår i prisen. Bestillinger er sikret med deponering: pengene utbetales til transportøren først når kunden har bekreftet leveringen. Hver leverandør holder transportforsikring på minst 500 000 kr per booking. Studentflyttinger til norske universiteter og bedriftsflyttinger under rammeavtaler håndteres gjennom samme bestillingsprosess.',
      corridorsHeadline: 'Populære flyttekorridorer i Norge',
      corridors: [
        { slug: 'oslo-bergen',          fromCity: 'Oslo',       toCity: 'Bergen',
          heading: 'Oslo → Bergen flytting',
          body:    'Korridor mellom Østlandet og Vestlandet med lisensierte langtransportører — værbevisst planlegging om vinteren.' },
        { slug: 'oslo-trondheim',       fromCity: 'Oslo',       toCity: 'Trondheim',
          heading: 'Oslo → Trondheim flytting',
          body:    'Korridor gjennom Gudbrandsdalen og Dovrefjell, langdistansetransport med forsikringsdekning på minst 500 000 kr.' },
        { slug: 'bergen-stavanger',     fromCity: 'Bergen',     toCity: 'Stavanger',
          heading: 'Bergen → Stavanger flytting',
          body:    'Vestlandet-korridoren langs E39 — kort kysttransport med samme uke tilgjengelighet.' },
        { slug: 'trondheim-oslo',       fromCity: 'Trondheim',  toCity: 'Oslo',
          heading: 'Trondheim → Oslo flytting',
          body:    'Returkorridor sørover med lisensierte transportører og fleksible avgangstider.' },
      ],
    },
  },
};

/**
 * Resolve which (country, language) bucket to render. If the
 * requested language doesn't exist for the country, falls back to
 * the country's first available language. Returns null only when
 * the country code is unknown.
 */
export function resolveSEOContent(
  countryCode: SEOCountryCode,
  languageCode: SEOLanguageCode,
): SEOContent | null {
  const langs = SEO_CONTENT[countryCode];
  if (!langs) return null;
  if (langs[languageCode]) return langs[languageCode]!;
  /* Fallback to whatever language is defined first for the country. */
  const first = Object.values(langs)[0];
  return first ?? null;
}

/**
 * Look up a single corridor by (country, slug). Used by the
 * /corridor/<country>/<slug> page to resolve the city-pair plus
 * the surrounding country context. Returns the corridor entry, the
 * resolved language bucket it came from (so the page renders in
 * the right native language), and the corridor's siblings — used
 * to render the "Other corridors" related-content block.
 */
export interface CorridorLookupResult {
  countryCode:  SEOCountryCode;
  languageCode: SEOLanguageCode;
  content:      SEOContent;
  corridor:     CorridorEntry;
  /** All other corridors in the same (country, language) bucket. */
  siblings:     CorridorEntry[];
}

export function findCorridor(
  countryCode: SEOCountryCode,
  slug:        string,
  preferredLang?: SEOLanguageCode,
): CorridorLookupResult | null {
  const langs = SEO_CONTENT[countryCode];
  if (!langs) return null;

  /* Try the preferred language first; fall back to any registered
   * language for the country. Slugs are stable across locales for
   * the same country (Canada en + fr share the same slug set so
   * /corridor/ca/toronto-montreal works in both). */
  const langOrder: SEOLanguageCode[] = preferredLang
    ? [preferredLang, ...(Object.keys(langs) as SEOLanguageCode[]).filter(l => l !== preferredLang)]
    : Object.keys(langs) as SEOLanguageCode[];

  for (const lang of langOrder) {
    const bucket = langs[lang];
    if (!bucket) continue;
    const corridor = bucket.corridors.find(c => c.slug === slug);
    if (corridor) {
      return {
        countryCode,
        languageCode: lang,
        content:      bucket,
        corridor,
        siblings:     bucket.corridors.filter(c => c.slug !== slug),
      };
    }
  }
  return null;
}
