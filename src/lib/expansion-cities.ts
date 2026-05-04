/* ─────────────────────────────────────────────────────────────────
 * Expansion-country anchor city registry
 *
 * Architectural piece in the FlyttGo geographic rollout framework
 * (see docs/marketplace-architecture.md §12 for the four-level
 * rollout model). Drives:
 *
 *   - the /market-<cc> shopfront for each new market
 *   - /moving-<city> SEO landing pages
 *   - dispatch-gravity computation
 *   - cross-border corridor surfacing
 *   - sitemap + crawl coverage
 *
 * This file is the **registry of intent**. Real provider counts
 * live in Supabase (driver_profiles); this file ships the *initial*
 * activation states + designated-anchor flags so a city is
 * discoverable as a marketplace target even before the first
 * provider registers there. As providers register, the rollout
 * promotion logic in src/lib/expansion-rollout.ts overrides the
 * static `status` field with the live density-based status.
 *
 * Anchor selection criteria (5 per country):
 *   1. Maximum relocation demand
 *   2. Maximum provider-availability probability
 *   3. Cross-border corridor connectivity
 *   4. Logistics network density
 *   5. University / corporate relocation flow
 * ───────────────────────────────────────────────────────────────── */

export type ExpansionCountryCode =
  | 'nl' | 'se' | 'es' | 'it' | 'pl'   // first-wave expansion
  | 'dk' | 'be' | 'at' | 'ch' | 'cz';  // second-wave expansion

/** All expansion country codes (first + second wave). */
export const EXPANSION_COUNTRY_CODES: ExpansionCountryCode[] =
  ['nl', 'se', 'es', 'it', 'pl', 'dk', 'be', 'at', 'ch', 'cz'];

/** First-wave countries — prioritized for active rollout coordination. */
export const FIRST_WAVE_COUNTRIES: ExpansionCountryCode[] =
  ['nl', 'se', 'es', 'it', 'pl'];

/** Second-wave countries — discoverable but waitlisted until first
 *  wave reaches anchor density. */
export const SECOND_WAVE_COUNTRIES: ExpansionCountryCode[] =
  ['dk', 'be', 'at', 'ch', 'cz'];

export type CityStatus = 'inactive' | 'active' | 'promoted' | 'anchor';

export type DispatchPriority = 'high' | 'medium' | 'low';

export interface ExpansionCountryProfile {
  code:        ExpansionCountryCode;
  name:        string;          // 'Netherlands'
  flag:        string;          // 🇳🇱
  /** Native-language label for the eyebrow / shopfront header. */
  localLabel:  string;
  /** Currency code surfaced in the shopfront. */
  currency:    string;
  /** Locale for Intl.NumberFormat, hreflang, etc. */
  locale:      string;
  /** Rollout wave — first | second. */
  wave:        'first' | 'second';
  /** Marketing positioning headline. */
  positioning: string;
  /** Country-specific compliance / licensing label. */
  compliance:  string;
  /** Year-month rollout-window estimate. Used for the "activating
   *  Q3 2026" copy on the country shopfront. */
  activationWindow: string;
}

export const EXPANSION_COUNTRIES: Record<ExpansionCountryCode, ExpansionCountryProfile> = {
  nl: { code: 'nl', name: 'Netherlands',     flag: '🇳🇱', localLabel: 'Nederland',         currency: 'EUR', locale: 'nl-NL', wave: 'first',  positioning: 'Marketplace activating in 2026 — anchor cities Amsterdam, Rotterdam, The Hague, Utrecht, Eindhoven.',                       compliance: 'Kiwa licensed verhuisbedrijven · BTW-registered transporteurs.',  activationWindow: '2026 Q2 — first wave' },
  se: { code: 'se', name: 'Sweden',          flag: '🇸🇪', localLabel: 'Sverige',           currency: 'SEK', locale: 'sv-SE', wave: 'first',  positioning: 'Marketplace activating in 2026 — anchor cities Stockholm, Göteborg, Malmö, Uppsala, Västerås.',                                  compliance: 'Yrkestrafiktillstånd · Transportstyrelsen-registered carriers.', activationWindow: '2026 Q2 — first wave' },
  es: { code: 'es', name: 'Spain',           flag: '🇪🇸', localLabel: 'España',            currency: 'EUR', locale: 'es-ES', wave: 'first',  positioning: 'Marketplace activating in 2026 — anchor cities Madrid, Barcelona, Valencia, Sevilla, Málaga.',                              compliance: 'Tarjeta de transporte · Ministerio de Transportes-registered carriers.', activationWindow: '2026 Q3 — first wave' },
  it: { code: 'it', name: 'Italy',           flag: '🇮🇹', localLabel: 'Italia',            currency: 'EUR', locale: 'it-IT', wave: 'first',  positioning: 'Marketplace activating in 2026 — anchor cities Milano, Roma, Torino, Bologna, Firenze.',                                    compliance: 'Albo Nazionale Autotrasportatori-registered carriers.',          activationWindow: '2026 Q3 — first wave' },
  pl: { code: 'pl', name: 'Poland',          flag: '🇵🇱', localLabel: 'Polska',            currency: 'PLN', locale: 'pl-PL', wave: 'first',  positioning: 'Marketplace activating in 2026 — anchor cities Warszawa, Kraków, Wrocław, Gdańsk, Poznań.',                                 compliance: 'Licencja krajowa transportu drogowego · GITD-registered carriers.', activationWindow: '2026 Q3 — first wave' },
  dk: { code: 'dk', name: 'Denmark',         flag: '🇩🇰', localLabel: 'Danmark',           currency: 'DKK', locale: 'da-DK', wave: 'second', positioning: 'Second-wave marketplace — waitlisting providers across København, Aarhus, Odense, Aalborg, Esbjerg.',                       compliance: 'Vejtransportlov · Trafik-, Bygge- og Boligstyrelsen-registered.',  activationWindow: '2026 Q4 — second wave' },
  be: { code: 'be', name: 'Belgium',         flag: '🇧🇪', localLabel: 'Belgique · België', currency: 'EUR', locale: 'fr-BE', wave: 'second', positioning: 'Second-wave marketplace — waitlisting providers across Brussels, Antwerp, Ghent, Leuven, Liège. Bilingual FR/NL coordination.', compliance: 'Vergunning vervoer voor eigen rekening · SPF-registered.',         activationWindow: '2026 Q4 — second wave' },
  at: { code: 'at', name: 'Austria',         flag: '🇦🇹', localLabel: 'Österreich',        currency: 'EUR', locale: 'de-AT', wave: 'second', positioning: 'Second-wave marketplace — waitlisting providers across Wien, Graz, Linz, Salzburg, Innsbruck.',                              compliance: 'GüKG / KfG · WKO-registered.',                                     activationWindow: '2026 Q4 — second wave' },
  ch: { code: 'ch', name: 'Switzerland',     flag: '🇨🇭', localLabel: 'Schweiz · Suisse',  currency: 'CHF', locale: 'de-CH', wave: 'second', positioning: 'Second-wave marketplace — waitlisting providers across Zürich, Genève, Basel, Bern, Lausanne. DE/FR/IT trilingual coordination.', compliance: 'Strassenverkehrsamt / Bundesamt für Verkehr-registered.',          activationWindow: '2027 Q1 — second wave' },
  cz: { code: 'cz', name: 'Czech Republic',  flag: '🇨🇿', localLabel: 'Česko',             currency: 'CZK', locale: 'cs-CZ', wave: 'second', positioning: 'Second-wave marketplace — waitlisting providers across Praha, Brno, Ostrava, Plzeň, Liberec.',                                compliance: 'Koncese silniční dopravy · Ministerstvo dopravy-registered.',     activationWindow: '2027 Q1 — second wave' },
};

export interface AnchorCity {
  /** URL slug — kebab-case ASCII, used for /moving-<slug>. */
  slug:                string;
  /** Display name with native diacritics. */
  city:                string;
  country:             ExpansionCountryCode;
  /** Static intent status — overridden at runtime by the
   *  density-based promotion logic when provider counts are
   *  available. */
  status:              CityStatus;
  /** Designated as a strategic anchor by FlyttGo (independent of
   *  density-based auto-promotion). Anchor cities get SEO landing
   *  pages, pricing visibility, and dispatch prioritization. */
  anchorFlag:          boolean;
  /** Initial dispatch-priority hint surfaced to the matching
   *  engine. Density rules can promote a city to high after the
   *  10-provider threshold. */
  dispatchPriority:    DispatchPriority;
  /** True when at least one major cross-border corridor passes
   *  through this city. Drives the "cross-border ready" pill on
   *  the city landing page. */
  crossBorderCorridorFlag: boolean;
  /** SEO landing copy — short paragraph rendered on /moving-<slug>. */
  paragraph:           string;
  /** Strategic role tags surfaced in the rollout status panel. */
  rationale:           string[];
  /** Optional initial provider count for testing the promotion
   *  logic. Real counts come from Supabase at runtime. */
  initialProviderCount?: number;
}

export const ANCHOR_CITIES: AnchorCity[] = [
  /* ── Netherlands ──────────────────────────────────────────── */
  { slug: 'amsterdam',  city: 'Amsterdam',  country: 'nl', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Anchor relocation gateway for the Netherlands. Cross-border corridor connector to Brussels, Berlin, and Paris. High provider density expected from licensed Kiwa-registered verhuizers.',
    rationale: ['Highest expat + corporate relocation demand in NL', 'Direct corridor to Brussels (BE) + Berlin (DE) + Paris (FR)', 'University of Amsterdam + Vrije Universiteit student flows', 'Schiphol logistics hub'] },
  { slug: 'rotterdam',  city: 'Rotterdam',  country: 'nl', status: 'promoted', anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Europe\'s largest port — heavy logistics density, frequent business + worker relocations. Corridor to Antwerp and the Ruhr.',
    rationale: ['Port-of-Rotterdam logistics density', 'Erasmus University student flow', 'Direct corridor to Antwerp (BE)', 'Pilot energy / shipping corporate relocations'] },
  { slug: 'the-hague',  city: 'The Hague',  country: 'nl', status: 'active',   anchorFlag: true, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Diplomatic + international-organisation relocation centre — ICC, Eurojust, Europol staff moves coordinate through the marketplace.',
    rationale: ['Diplomatic + IO relocation flow', 'Leiden University corridor', 'Government workforce moves'] },
  { slug: 'utrecht',    city: 'Utrecht',    country: 'nl', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Central NL university city — Utrecht University residence-hall windows drive seasonal demand peaks.',
    rationale: ['Utrecht University student flow', 'Central NL geographic anchor'] },
  { slug: 'eindhoven',  city: 'Eindhoven',  country: 'nl', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Tech-corridor relocation hub — ASML / Philips / High Tech Campus drives engineering-talent moves into and out of the city.',
    rationale: ['ASML + Philips engineering relocations', 'Tech-corridor density'] },

  /* ── Sweden ──────────────────────────────────────────────── */
  { slug: 'stockholm',  city: 'Stockholm',  country: 'se', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Sweden\'s relocation gateway — Nordic corridor connector to Oslo, Copenhagen, and Helsinki. High demand from tech + corporate relocation flows.',
    rationale: ['Highest relocation demand in SE', 'Nordic corridor connector to Oslo + Copenhagen', 'KTH + Stockholm University student flows', 'Spotify / Klarna / tech-corporate relocations'] },
  { slug: 'gothenburg', city: 'Göteborg',   country: 'se', status: 'promoted', anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Swedish west-coast port + Volvo industrial corridor. Direct ferry-route corridor to Frederikshavn (DK).',
    rationale: ['Volvo + AstraZeneca industrial relocations', 'Cross-border ferry corridor to Denmark', 'Chalmers University flows'] },
  { slug: 'malmo',      city: 'Malmö',      country: 'se', status: 'promoted', anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Öresund-bridge gateway — daily Malmö ↔ Copenhagen relocation corridor for cross-border workers.',
    rationale: ['Öresund corridor — direct DK connection', 'Cross-Nordic worker mobility', 'Lund University adjacency'] },
  { slug: 'uppsala',    city: 'Uppsala',    country: 'se', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Uppsala University — Scandinavia\'s oldest, drives seasonal student-mobility peaks every September and June.',
    rationale: ['Uppsala University student flow', 'Stockholm-region commuter belt'] },
  { slug: 'vasteras',   city: 'Västerås',   country: 'se', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Lake Mälaren industrial anchor — ABB + automation-corporate relocation flow, Mälardalen University seasonal student moves.',
    rationale: ['ABB + automation-corporate flow', 'Mälardalen University student flow', 'Stockholm-region commuter corridor'] },

  /* ── Spain ───────────────────────────────────────────────── */
  { slug: 'madrid',     city: 'Madrid',     country: 'es', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: false,
    paragraph: 'Spain\'s capital marketplace anchor — financial-district + government-workforce relocation flows. National corridor to Barcelona, Valencia, Sevilla.',
    rationale: ['Highest relocation demand in ES', 'Government + financial workforce moves', 'IE Business School + UCM student flows', 'Madrid-Barajas logistics hub'] },
  { slug: 'barcelona',  city: 'Barcelona',  country: 'es', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: false,
    paragraph: 'Mediterranean tech-hub — high expat density, Catalonia corporate relocation flows, port-side logistics.',
    rationale: ['Tech expat density (Glovo / Travelperk / Wallapop)', 'Mediterranean corridor connector', 'Universitat de Barcelona + ESADE flows'] },
  { slug: 'valencia',   city: 'Valencia',   country: 'es', status: 'promoted', anchorFlag: true, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Mediterranean coast relocation corridor — fast-growing remote-worker influx, port logistics density.',
    rationale: ['Remote-worker relocation surge 2024-2026', 'Universitat de València flows', 'Port-of-Valencia logistics'] },
  { slug: 'seville',    city: 'Sevilla',    country: 'es', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Andalucía relocation anchor — government + university density, Córdoba and Málaga corridor connector.',
    rationale: ['Andalucía government workforce', 'Universidad de Sevilla flow'] },
  { slug: 'malaga',     city: 'Málaga',     country: 'es', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Costa del Sol relocation anchor — fast-growing tech + remote-worker influx, Málaga port logistics density, Andalucía corridor connector.',
    rationale: ['Tech-hub remote-worker relocation surge', 'Port-of-Málaga logistics density', 'Costa del Sol expat + corporate flow'] },

  /* ── Italy ───────────────────────────────────────────────── */
  { slug: 'milan',      city: 'Milano',     country: 'it', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Italy\'s relocation gateway — fashion + finance + tech corporate density. Cross-border corridor to Zürich (CH) and Lyon (FR).',
    rationale: ['Highest relocation demand in IT', 'Corridor to Zürich (CH) + Lyon (FR)', 'Bocconi + Politecnico flows', 'Fashion + finance corporate moves'] },
  { slug: 'rome',       city: 'Roma',       country: 'it', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: false,
    paragraph: 'Italian capital — government + diplomatic + university relocation flows. National corridor connector.',
    rationale: ['Government + diplomatic workforce', 'La Sapienza + LUISS flows', 'National corridor connector'] },
  { slug: 'turin',      city: 'Torino',     country: 'it', status: 'promoted', anchorFlag: true, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'Industrial + automotive anchor — Fiat / Stellantis density. Cross-border corridor to Lyon (FR) and Genève (CH).',
    rationale: ['Stellantis + automotive corporate relocations', 'Alpine corridor to FR / CH', 'Politecnico di Torino flow'] },
  { slug: 'bologna',    city: 'Bologna',    country: 'it', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Università di Bologna — Europe\'s oldest, drives substantial student-mobility seasonality.',
    rationale: ['Università di Bologna student flow', 'Emilia-Romagna corporate density'] },
  { slug: 'florence',   city: 'Firenze',    country: 'it', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Tuscany cultural-corporate anchor — luxury fashion + study-abroad relocation flow.',
    rationale: ['Study-abroad student flow (NYU Florence et al.)', 'Luxury-sector corporate moves'] },

  /* ── Poland ──────────────────────────────────────────────── */
  { slug: 'warsaw',     city: 'Warszawa',   country: 'pl', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Poland\'s capital marketplace anchor — corporate + IT-services relocation density. Corridor to Berlin (DE) + Vienna (AT).',
    rationale: ['Highest relocation demand in PL', 'Corridor to Berlin + Vienna', 'University of Warsaw flow', 'IT-services corporate moves'] },
  { slug: 'krakow',     city: 'Kraków',     country: 'pl', status: 'promoted', anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Cultural + academic capital — Jagiellonian University, large IT-services + shared-services density.',
    rationale: ['Jagiellonian University flow', 'IT shared-services hub (Capgemini, etc.)', 'Corridor to Vienna + Bratislava'] },
  { slug: 'wroclaw',    city: 'Wrocław',    country: 'pl', status: 'promoted', anchorFlag: true, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'Silesian relocation anchor — cross-border corridor to Prague (CZ) and Berlin (DE).',
    rationale: ['Cross-border corridor to Prague + Berlin', 'University of Wrocław', 'Industrial / automotive density'] },
  { slug: 'gdansk',     city: 'Gdańsk',     country: 'pl', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'Baltic-coast port + tech anchor — corridor to Stockholm + Copenhagen via ferry.',
    rationale: ['Tri-City tech relocation', 'Baltic ferry corridor to SE / DK'] },
  { slug: 'poznan',     city: 'Poznań',     country: 'pl', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'West-Poland anchor — corridor to Berlin (DE), trade-fair + corporate relocation density.',
    rationale: ['Trade-fair (Targi Poznańskie) corporate flow', 'Corridor to Berlin'] },

  /* ── Denmark ─────────────────────────────────────────────── */
  { slug: 'copenhagen', city: 'København',  country: 'dk', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Denmark\'s capital marketplace anchor — Öresund corridor to Malmö, daily cross-border workforce moves.',
    rationale: ['Öresund corridor — direct SE connection', 'Highest relocation demand in DK', 'Copenhagen Business School + KU flows'] },
  { slug: 'aarhus',     city: 'Aarhus',     country: 'dk', status: 'promoted', anchorFlag: true, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Jutland anchor — Aarhus University + corporate density, Denmark\'s second relocation centre.',
    rationale: ['Aarhus University flow', 'Jutland corporate density'] },
  { slug: 'odense',     city: 'Odense',     country: 'dk', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Funen anchor — University of Southern Denmark + robotics-corporate relocation flow.',
    rationale: ['SDU student flow', 'Universal Robots / robotics-corporate moves'] },
  { slug: 'aalborg',    city: 'Aalborg',    country: 'dk', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'North-Jutland anchor — Aalborg University + offshore-energy corporate flow.',
    rationale: ['Offshore-energy corporate density', 'Aalborg University flow'] },
  { slug: 'esbjerg',    city: 'Esbjerg',    country: 'dk', status: 'inactive', anchorFlag: false, dispatchPriority: 'low',    crossBorderCorridorFlag: false,
    paragraph: 'Esbjerg port + offshore-wind logistics anchor — early waitlist tier.',
    rationale: ['Port-of-Esbjerg offshore-wind logistics'] },

  /* ── Belgium ─────────────────────────────────────────────── */
  { slug: 'brussels',   city: 'Brussels',   country: 'be', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'EU capital — bilingual FR/NL marketplace anchor. Cross-border corridors to Amsterdam, Paris, Köln.',
    rationale: ['EU institutional + diplomatic relocation flow', 'Trilingual corridor — FR / NL / EN', 'ULB + KU Leuven Brussels flows'] },
  { slug: 'antwerp',    city: 'Antwerp',    country: 'be', status: 'promoted', anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Flemish port + diamond + chemicals corporate density. Corridor to Rotterdam.',
    rationale: ['Port-of-Antwerp logistics density', 'Direct corridor to Rotterdam', 'Universiteit Antwerpen flow'] },
  { slug: 'ghent',      city: 'Ghent',      country: 'be', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Flemish university + bio-tech anchor — UGent flow, port-of-Ghent corporate density.',
    rationale: ['Universiteit Gent flow', 'Bio-tech corporate density'] },
  { slug: 'liege',      city: 'Liège',      country: 'be', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'Wallonian anchor — corridor to Aachen (DE) + Maastricht (NL).',
    rationale: ['Tri-border corridor connector', 'Université de Liège flow'] },
  { slug: 'leuven',     city: 'Leuven',     country: 'be', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Flemish university + biotech anchor — KU Leuven flow, IMEC + life-sciences corporate density on the Brussels axis.',
    rationale: ['KU Leuven student flow', 'IMEC + biotech corporate moves', 'Brussels-axis commuter corridor'] },

  /* ── Austria ─────────────────────────────────────────────── */
  { slug: 'vienna',     city: 'Wien',       country: 'at', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Austria\'s capital marketplace anchor — Habsburg-corridor connector to Warsaw, Prague, Bratislava, Budapest.',
    rationale: ['Highest relocation demand in AT', 'Central European corridor connector', 'Universität Wien + WU Wien flows'] },
  { slug: 'graz',       city: 'Graz',       country: 'at', status: 'promoted', anchorFlag: true, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Styrian anchor — TU Graz + automotive (Magna Steyr) corporate density.',
    rationale: ['Magna Steyr + automotive corporate flow', 'TU Graz student flow'] },
  { slug: 'linz',       city: 'Linz',       country: 'at', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Upper-Austria industrial anchor — voestalpine + KTM density.',
    rationale: ['Industrial corporate relocation', 'JKU student flow'] },
  { slug: 'salzburg',   city: 'Salzburg',   country: 'at', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'Bavarian-border anchor — corridor to München + Innsbruck.',
    rationale: ['Cross-border corridor to München', 'Tourism + cultural corporate flow'] },
  { slug: 'innsbruck',  city: 'Innsbruck',  country: 'at', status: 'inactive', anchorFlag: false, dispatchPriority: 'low',    crossBorderCorridorFlag: true,
    paragraph: 'Tyrolean Alpine anchor — corridor to München + Bolzano (IT).',
    rationale: ['Alpine cross-border corridor', 'Universität Innsbruck flow'] },

  /* ── Switzerland ─────────────────────────────────────────── */
  { slug: 'zurich',     city: 'Zürich',     country: 'ch', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Swiss financial capital — DACH-corridor anchor connecting München, Milano, Stuttgart. Highest expat density in CH.',
    rationale: ['Highest relocation demand in CH', 'DACH-corridor anchor', 'ETH Zürich + UZH flows', 'Banking + insurance corporate moves'] },
  { slug: 'geneva',     city: 'Genève',     country: 'ch', status: 'promoted', anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'International-organisation gateway — UN, WTO, WHO staff moves. Cross-border corridor to Lyon + Annecy.',
    rationale: ['UN + WHO + WTO institutional flow', 'Cross-border corridor to FR', 'CERN + diplomatic moves'] },
  { slug: 'basel',      city: 'Basel',      country: 'ch', status: 'promoted', anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Pharma + chemicals corporate density (Roche, Novartis). Tri-border corridor to Mulhouse (FR) + Freiburg (DE).',
    rationale: ['Pharma corporate relocation density', 'Tri-border corridor (CH/FR/DE)', 'Universität Basel flow'] },
  { slug: 'bern',       city: 'Bern',       country: 'ch', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Federal capital + government workforce moves — Universität Bern flow.',
    rationale: ['Federal government workforce', 'Universität Bern flow'] },
  { slug: 'lausanne',   city: 'Lausanne',   country: 'ch', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: false,
    paragraph: 'Romandie anchor — EPFL + IMD + multinationals (Nestlé, Logitech).',
    rationale: ['EPFL + IMD student/exec flow', 'Nestlé + Logitech corporate moves'] },

  /* ── Czech Republic ──────────────────────────────────────── */
  { slug: 'prague',     city: 'Praha',      country: 'cz', status: 'anchor',   anchorFlag: true, dispatchPriority: 'high',   crossBorderCorridorFlag: true,
    paragraph: 'Czech capital marketplace anchor — corridor to Berlin, Wien, Wrocław. Major IT shared-services density.',
    rationale: ['Highest relocation demand in CZ', 'Cross-border corridor to DE / AT / PL', 'Charles University flow', 'IT shared-services hub'] },
  { slug: 'brno',       city: 'Brno',       country: 'cz', status: 'promoted', anchorFlag: true, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'Moravian anchor — Masaryk University + IT corporate density. Corridor to Wien + Bratislava.',
    rationale: ['Masaryk University flow', 'Corridor to Wien + Bratislava', 'IT corporate density (Red Hat, IBM)'] },
  { slug: 'ostrava',    city: 'Ostrava',    country: 'cz', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'Industrial-Silesia anchor — corridor to Kraków + Katowice.',
    rationale: ['Cross-border corridor to PL', 'Industrial + automotive corporate'] },
  { slug: 'plzen',      city: 'Plzeň',      country: 'cz', status: 'active',   anchorFlag: false, dispatchPriority: 'medium', crossBorderCorridorFlag: true,
    paragraph: 'Western-Bohemia anchor — corridor to Nürnberg + München.',
    rationale: ['Corridor to Bavaria', 'Škoda + automotive corporate'] },
  { slug: 'liberec',    city: 'Liberec',    country: 'cz', status: 'inactive', anchorFlag: false, dispatchPriority: 'low',    crossBorderCorridorFlag: true,
    paragraph: 'North-Bohemia anchor — corridor to Dresden + Wrocław.',
    rationale: ['Tri-border corridor (CZ/DE/PL)'] },
];

/* ── Lookup helpers ──────────────────────────────────────── */

export function findExpansionCountry(code: string): ExpansionCountryProfile | null {
  return EXPANSION_COUNTRIES[code as ExpansionCountryCode] ?? null;
}

export function citiesForCountry(code: ExpansionCountryCode): AnchorCity[] {
  return ANCHOR_CITIES.filter(c => c.country === code);
}

export function findCityBySlug(slug: string): AnchorCity | null {
  return ANCHOR_CITIES.find(c => c.slug === slug) ?? null;
}

export function isExpansionCountryCode(code: string): code is ExpansionCountryCode {
  return EXPANSION_COUNTRY_CODES.includes(code as ExpansionCountryCode);
}
