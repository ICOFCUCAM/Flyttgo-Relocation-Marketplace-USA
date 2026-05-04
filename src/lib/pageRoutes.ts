import type { Page } from './store';

/**
 * Bidirectional map between in-app Page ids and URL paths.
 *
 * We keep the existing setPage() API so the whole codebase doesn't
 * have to learn a router — the store layer pushes to history.pushState
 * whenever setPage runs and listens to popstate to sync the state
 * back when the user hits back / forward.
 *
 * Paths are chosen for SEO value rather than matching the Page id 1:1
 * (e.g. `driver-onboarding` → `/become-a-driver`, `subscriptions` →
 * `/driver-subscriptions`). Add to both maps when introducing a new
 * page — pathToPage falls back to 'home' for unknown paths.
 */

const PAGE_TO_PATH: Record<Page, string> = {
  /* Core flows */
  'home':                    '/',
  'booking':                 '/book',
  'payment':                 '/payment',
  'tracking':                '/track',
  'services':                '/services',
  'van-guide':               '/van-size-guide',
  'checklist':               '/moving-checklist',
  'subscriptions':           '/driver-subscriptions',
  'driver-onboarding':       '/become-a-driver',

  /* Authenticated dashboards */
  'customer-dashboard':      '/dashboard',
  'my-bookings':             '/my-bookings',
  'driver-portal':           '/driver',
  'admin':                   '/admin',
  'profile':                 '/profile',

  /* Corporate */
  'corporate':               '/business',
  'corporate-dashboard':     '/business/dashboard',
  'bulk-booking':            '/business/bulk-booking',
  'recurring-deliveries':    '/business/recurring-deliveries',
  'company-dashboard-info':  '/business/about-dashboard',
  'invoice-billing':         '/business/invoicing',
  'corporate-api-access':    '/business/api',

  /* Legal */
  'terms':                   '/terms',
  'privacy':                 '/privacy',
  'liability':               '/liability',
  'driver-terms':            '/driver-terms',

  /* Supabase auth callback (email confirmation, magic link, OAuth) */
  'auth-callback':           '/auth/callback',

  /* Driver onboarding status (pending/approved/rejected) */
  'driver-application-status': '/driver-application-status',

  /* Informational / marketing */
  'about':                   '/about',
  'contact':                 '/contact',
  'faq':                     '/faq',
  'help':                    '/help',
  'safety':                  '/safety',
  'careers':                 '/careers',
  'press':                   '/press',
  'sustainability':          '/sustainability',

  /* Marketplace repositioning surfaces (Phase 12). */
  'marketplace':             '/marketplace',
  'how-it-works':            '/how-it-works',
  'providers':               '/providers',
  'cities':                  '/cities',
  'enterprise-relocation':   '/enterprise-relocation',
  'compliance':              '/compliance',
  'partners':                '/partners',

  /* Global Logistics & Relocation Marketplace surfaces. */
  'universities':            '/universities',
  'market-us':               '/us',
  'market-canada':           '/canada',
  'market-germany':          '/germany',
  'market-france':           '/france',
  'market-uk':               '/uk',
  'market-norway':           '/norway',

  /* Expansion-country shopfronts (Phase 13). Each is a rollout-status
   * shopfront — booking widget hidden until the country's payment +
   * address autocomplete are wired. See src/lib/expansion-cities.ts. */
  'market-nl':               '/market-nl',
  'market-se':               '/market-se',
  'market-es':               '/market-es',
  'market-it':               '/market-it',
  'market-pl':               '/market-pl',
  'market-dk':               '/market-dk',
  'market-be':               '/market-be',
  'market-at':               '/market-at',
  'market-ch':               '/market-ch',
  'market-cz':               '/market-cz',

  /* Strategic-city SEO landing root. Live navigations push the full
   * /moving-<slug> URL via history.pushState; pathToPage resolves any
   * `/moving-…` path to this Page id. */
  'moving-city':             '/moving',

  /* Referral program landing. */
  'refer':                   '/refer',

  /* Provider profile (slug carried via ?slug=). */
  'provider-profile':        '/provider',

  /* Provider directory (search + filter). */
  'providers-directory':     '/providers/directory',

  /* Side-by-side provider comparison. */
  'compare':                 '/compare',

  /* Service-category landing pages. The Page→path map only holds the
   * listing root; live navigations push the full /services/<slug>
   * URL via history.pushState. */
  'service-category':        '/services',

  /* Per-corridor landing page. PAGE_TO_PATH only stores the
   * listing root; live navigations push the full
   * /corridor/<country>/<slug> URL via history.pushState. */
  'corridor':                '/corridor',

  /* US pricing transparency. */
  'pricing':                 '/pricing',

  /* Provider-facing pricing settings. */
  'provider-pricing-settings': '/driver/pricing',

  /* Public preview of country-specific onboarding requirements. */
  'provider-requirements':   '/providers/requirements',

  /* Customer quote-approval workflow. */
  'request-quote':           '/request-quote',

  /* Customer dispute filing + inbox. */
  'dispute':                 '/dispute',

  /* Institutional gateway pages. */
  'government-programs':         '/government-programs',
  'ngo-deployment':              '/ngo-deployment',
  'pilot-deployment-programs':   '/pilot-deployment-programs',
  'accept-org-invite':           '/invite',
  'vendor-pack':                 '/compliance/vendor-pack',
  'procurement-rfp':             '/procurement/rfp',
  'deployment-regions':          '/deployment-regions',
  'capability-brief':            '/resources/capability-brief',

  /* Fallback for unknown routes. No real path — pathToPage() returns
   * this id for anything it can't match. setPage('not-found') still
   * updates history.pushState to whatever URL triggered the fallback. */
  'not-found':               '/404',
};

/* Inverted lookup. Built once at module load. */
const PATH_TO_PAGE: Record<string, Page> = Object.entries(PAGE_TO_PATH)
  .reduce<Record<string, Page>>((acc, [page, path]) => {
    acc[path] = page as Page;
    return acc;
  }, {});

/**
 * Per-page SEO metadata — title, meta description and a dedicated
 * OG image where we have one (otherwise we fall back to /og.svg in
 * applyPageMeta below). Everything here feeds straight into the
 * <meta> tags on navigation.
 */
export interface PageMeta {
  title:       string;
  description: string;
  image?:      string;
}

const PAGE_TITLES: Record<Page, string> = {
  'home':                    'FlyttGo Global Logistics & Relocation Marketplace',
  'marketplace':              'Marketplace · FlyttGo Global Logistics & Relocation Marketplace',
  'how-it-works':             'How It Works · FlyttGo Global Logistics & Relocation Marketplace',
  'providers':                'For Providers · FlyttGo Global Logistics & Relocation Marketplace',
  'cities':                   'Markets & Geographic Deployment · FlyttGo Global',
  'enterprise-relocation':    'Enterprise Relocation · FlyttGo Global',
  'compliance':               'Compliance & Jurisdictional Awareness · FlyttGo Global',
  'partners':                 'Partners & Ecosystem · FlyttGo Global',
  'universities':             'University Relocation · FlyttGo Global',
  'market-us':                'United States Moves & Logistics · FlyttGo Global',
  'market-canada':            'Canada Moves & Logistics · FlyttGo Global',
  'market-germany':           'Germany Moves & Logistics · FlyttGo Global',
  'market-france':            'France Moves & Logistics · FlyttGo Global',
  'market-uk':                'United Kingdom Moves & Logistics · FlyttGo Global',
  'market-norway':            'Norway Moves & Logistics · FlyttGo Global',
  'market-nl':                'Netherlands Moves & Logistics · FlyttGo Global',
  'market-se':                'Sweden Moves & Logistics · FlyttGo Global',
  'market-es':                'Spain Moves & Logistics · FlyttGo Global',
  'market-it':                'Italy Moves & Logistics · FlyttGo Global',
  'market-pl':                'Poland Moves & Logistics · FlyttGo Global',
  'market-dk':                'Denmark Moves & Logistics · FlyttGo Global',
  'market-be':                'Belgium Moves & Logistics · FlyttGo Global',
  'market-at':                'Austria Moves & Logistics · FlyttGo Global',
  'market-ch':                'Switzerland Moves & Logistics · FlyttGo Global',
  'market-cz':                'Czech Republic Moves & Logistics · FlyttGo Global',
  'moving-city':              'Moving services · FlyttGo Global',
  'refer':                    'Give £25, get £25 · FlyttGo referrals',
  'provider-profile':         'Provider profile · FlyttGo Global',
  'providers-directory':      'Browse verified providers · FlyttGo Global',
  'compare':                  'Compare providers side by side · FlyttGo Global',
  'service-category':         'Service category · FlyttGo Global',
  'corridor':                 'Relocation corridor · FlyttGo Global',
  'pricing':                  'US relocation pricing · transparent rates · FlyttGo',
  'provider-pricing-settings': 'Pricing settings · FlyttGo Provider Dashboard',
  'provider-requirements':    'Provider onboarding requirements · FlyttGo',
  'request-quote':            'Request quotes from verified providers · FlyttGo',
  'dispute':                  'File a dispute · FlyttGo',
  'government-programs':      'Government & ministry relocation programs · FlyttGo',
  'ngo-deployment':           'NGO deployment logistics · FlyttGo',
  'pilot-deployment-programs':'Pilot deployment programs · FlyttGo',
  'accept-org-invite':        'Accept organization invite · FlyttGo',
  'vendor-pack':              'Vendor compliance pack · FlyttGo',
  'procurement-rfp':          'Submit a procurement inquiry · FlyttGo',
  'deployment-regions':       'Deployment regions · FlyttGo',
  'capability-brief':         'Capability brief · FlyttGo',
  'booking':                  'Book a Move · FlyttGo Global',
  'payment':                  'Secure Payment · FlyttGo Global',
  'tracking':                 'Track Your Coordination · FlyttGo Global',
  'services':                 'Services · FlyttGo Global',
  'van-guide':                'Vehicle Size Guide · FlyttGo Global',
  'checklist':                'Relocation Checklist · FlyttGo Global',
  'subscriptions':            'Provider Subscription Plans · FlyttGo Global',
  'driver-onboarding':        'Provider Onboarding · FlyttGo Global',
  'customer-dashboard':       'Dashboard · FlyttGo Global',
  'my-bookings':              'My Coordination · FlyttGo Global',
  'driver-portal':            'Provider Portal · FlyttGo Global',
  'admin':                    'Admin · FlyttGo Global',
  'profile':                  'Profile · FlyttGo Global',
  'corporate':                'For Enterprise · FlyttGo Global',
  'corporate-dashboard':      'Enterprise Dashboard · FlyttGo Global',
  'bulk-booking':             'Bulk Coordination · FlyttGo Global',
  'recurring-deliveries':     'Recurring Coordination · FlyttGo Global',
  'company-dashboard-info':   'Enterprise Dashboard Tour · FlyttGo Global',
  'invoice-billing':          'Invoice & Billing · FlyttGo Global',
  'corporate-api-access':     'API Access · FlyttGo Global',
  'terms':                    'Terms of Service · FlyttGo Global',
  'privacy':                  'Privacy Policy · FlyttGo Global',
  'liability':                'Liability · FlyttGo Global',
  'driver-terms':             'Provider Terms · FlyttGo Global',
  'about':                    'About · FlyttGo Global',
  'contact':                  'Contact · FlyttGo Global',
  'faq':                      'FAQ · FlyttGo Global',
  'help':                     'Help Center · FlyttGo Global',
  'safety':                   'Safety & Insurance · FlyttGo Global',
  'careers':                  'Careers · FlyttGo Global',
  'press':                    'Press & Media · FlyttGo Global',
  'sustainability':           'Sustainability · FlyttGo Global',
  'auth-callback':            'Signing you in… · FlyttGo Global',
  'driver-application-status':'Provider Application Status · FlyttGo Global',
  'not-found':                'Page Not Found · FlyttGo Global',
};

/**
 * Per-page meta description, keyed off the same Page id. These are
 * the strings Google, LinkedIn, WhatsApp and X use when someone
 * shares a FlyttGo link — keep them honest, specific and ~155 chars.
 */
const PAGE_DESCRIPTIONS: Record<Page, string> = {
  'home':
    "FlyttGo Global Logistics & Relocation Marketplace — worldwide digital coordination infrastructure connecting customers with licensed relocation providers, logistics partners, workforce support, storage, and mobility services across multiple jurisdictions.",
  'marketplace':
    "Browse the FlyttGo global marketplace — moving labor, licensed carrier matching, packing, storage, vehicle rental, and insurance selection across the United States, Canada, Germany, France, the United Kingdom, and Norway.",
  'how-it-works':
    "Enter relocation details, match with independent licensed providers, compare service options, select partners, and coordinate your move — all on FlyttGo's global coordination layer.",
  'providers':
    "Join FlyttGo as a licensed moving carrier, labor provider, packing crew, storage facility, vehicle rental partner, freight forwarder, international relocation coordinator, or enterprise vendor. Country-level compliance is the provider's responsibility.",
  'cities':
    "FlyttGo geographic deployment — country-level marketplace nodes across the United States, Canada, Germany, France, the United Kingdom, and Norway, with intercontinental corridors planned through 2030.",
  'enterprise-relocation':
    "Enterprise, government, and project-based relocation coordination — centralized procurement, audit trails, and consolidated invoicing for corporate mobility, public-sector workforce moves, and university housing teams.",
  'compliance':
    "FlyttGo operates as a digital coordination marketplace — not as a transportation carrier. Service providers handle FMCSA, EU, UK, and other national licensing, taxation, and insurance compliance. GDPR-aligned data handling.",
  'partners':
    "Ecosystem partners — payment rails, workforce coordination, insurance carriers, storage networks, freight forwarders, and accounting connectors integrated with the FlyttGo global marketplace.",
  'universities':
    "Student relocation corridors, housing move coordination, international arrival support, and semester mobility workflows for universities and student housing offices worldwide.",
  'market-us':
    "United States moves & logistics — FMCSA-aware carrier matching, USDOT transparency, moving labor crews, storage integration, packing, and enterprise relocation across the US marketplace.",
  'market-canada':
    "Canada moves & logistics — interprovincial carrier matching, moving labor, packing, storage, and corporate relocation coordination across the Canadian marketplace.",
  'market-germany':
    "Germany moves & logistics — Umzugsfirma carrier matching, moving labor, packing, storage, and Konzernumzug enterprise coordination across the German marketplace.",
  'market-france':
    "France moves & logistics — déménageur carrier matching, moving labor, packing, storage, and corporate déménagement coordination across the French marketplace.",
  'market-uk':
    "United Kingdom moves & logistics — Goods Vehicle Operator Licence carrier matching, moving labor, packing, storage, and enterprise relocation across the UK marketplace.",
  'market-norway':
    "Norway moves & logistics — flytteselskap carrier matching, moving labor, packing, storage, and corporate flytting coordination across the Norwegian marketplace.",
  'market-nl':
    "Netherlands moves & logistics — verhuisbedrijf carrier matching, Benelux corridor coordination, packing, storage, and corporate relocation across the Dutch marketplace.",
  'market-se':
    "Sweden moves & logistics — flyttfirma carrier matching, Nordic corridor coordination, packing, storage, and corporate flytt across the Swedish marketplace.",
  'market-es':
    "Spain moves & logistics — empresa de mudanzas carrier matching, Iberian corridor coordination, packing, storage, and corporate relocation across the Spanish marketplace.",
  'market-it':
    "Italy moves & logistics — impresa di traslochi carrier matching, Alpine + Mediterranean corridor coordination, packing, storage, and corporate trasloco across the Italian marketplace.",
  'market-pl':
    "Poland moves & logistics — firma przeprowadzkowa carrier matching, Central-Europe corridor coordination, packing, storage, and corporate przeprowadzki across the Polish marketplace.",
  'market-dk':
    "Denmark moves & logistics — flyttefirma carrier matching, Øresund corridor coordination, packing, storage, and corporate flytning across the Danish marketplace.",
  'market-be':
    "Belgium moves & logistics — verhuisfirma / société de déménagement carrier matching, EU-capital corridor coordination, packing, storage, and corporate relocation across the Belgian marketplace.",
  'market-at':
    "Austria moves & logistics — Umzugsunternehmen carrier matching, DACH + Central-Europe corridor coordination, packing, storage, and corporate Umzug across the Austrian marketplace.",
  'market-ch':
    "Switzerland moves & logistics — Umzugsfirma / entreprise de déménagement carrier matching, DACH + Alpine corridor coordination, packing, storage, and corporate relocation across the Swiss marketplace.",
  'market-cz':
    "Czech Republic moves & logistics — stěhovací firma carrier matching, Central-Europe corridor coordination, packing, storage, and corporate stěhování across the Czech marketplace.",
  'moving-city':
    "City-specific FlyttGo relocation services — verified local providers, transparent pricing, cross-border corridor connections, and escrow protection on every move.",
  'refer':
    "Invite a friend to FlyttGo — they get £25 off their first move, you get £25 in account credit when they complete it. Share your code by link, WhatsApp, email or QR.",
  'provider-profile':
    "Verified provider on the FlyttGo marketplace — see ratings, services, sample jobs, and book directly with this licensed mover.",
  'providers-directory':
    "Browse every verified mover, packer, storage and freight partner on the FlyttGo global marketplace. Filter by country, tier, and service. Sort by rating, price, or reviews.",
  'compare':
    "Compare your shortlisted FlyttGo providers side by side — rating, reviews, starting price, services, fleet, verifications, and availability — in a single table.",
  'service-category':
    "FlyttGo service category — see the providers offering this service across our six markets, with verified credentials, ratings, and instant quotes.",
  'corridor':
    "City-to-city relocation corridor on FlyttGo — licensed movers, distance-priced quotes, and escrow protection on every booking. Compare options for your route.",
  'pricing':
    "Transparent US relocation pricing — labor-only $60–$120/hr, movers + truck $120–$250/hr, packing $40–$90/hr, corporate $150–$300/hr. See what drives the price and how FlyttGo's marketplace compares to national rates.",
  'provider-pricing-settings':
    "FlyttGo provider pricing settings — set service radius, crew sizes, truck and packing availability, hourly base, and weekend multiplier overrides. Live preview of customer total + provider payout.",
  'provider-requirements':
    "Country-specific provider onboarding requirements for FlyttGo — see exactly what documents and registrations you need before you apply. Adapts to your country, category, and vehicle availability.",
  'request-quote':
    "Request competing quotes from verified FlyttGo providers — for long-distance, international, corporate, or complex labor briefs. Providers respond within 4–24 hours; you pick the winner. Escrow protected.",
  'dispute':
    "File a FlyttGo booking dispute. Standardized categories (delay · price mismatch · damage claim · missing items · service incomplete · …), country-aware resolution paths, escrow held during review, 7-day SLA.",
  'government-programs':
    "FlyttGo government & ministry relocation programs — procurement-compatible, audit-ready settlement, vendor compliance gated to Certified Infrastructure Partners. Multi-region deployment routing across our nine markets.",
  'ngo-deployment':
    "NGO and humanitarian deployment logistics on FlyttGo — refugee mobility, staff relocation, field-mission cargo with framework agreements + donor-grade audit trails.",
  'pilot-deployment-programs':
    "FlyttGo pilot deployment programs — five archetypes (municipal / university / transit-authority / marketplace-rollout / identity-integrated) for ministries and authorities exploring institutional procurement before long-form rollout.",
  'accept-org-invite':
    "Accept your FlyttGo organization invite to join your team's institutional account — relocation requests, approval workflow, and invoice billing.",
  'vendor-pack':
    "FlyttGo vendor compliance pack for procurement teams — operator entities, deployment architecture, operating regions, data handling, security, service availability, and procurement contact channel.",
  'procurement-rfp':
    "Submit a procurement inquiry to FlyttGo — for ministries, universities, NGOs, transit authorities, and enterprise mobility teams. RFP intake routes to the procurement queue with a 2-business-day SLA.",
  'deployment-regions':
    "Markets where FlyttGo settles bookings today — live coverage, partner coverage, and expansion-ready countries for institutional pilot programmes.",
  'capability-brief':
    "FlyttGo capability brief — operator governance, geographic deployment readiness, compliance + provider verification, architecture, and procurement integration patterns. Delivered tailored to your procurement context.",
  'booking':
    'Book your next move in under 3 minutes. Get an instant quote, pick a verified driver, and track your delivery live — all with escrow payment built in.',
  'payment':
    'Secure escrow checkout for your FlyttGo booking. Pay with card, Apple Pay, Google Pay or corporate invoice — money is held until the delivery is confirmed.',
  'tracking':
    'Track your FlyttGo delivery in real time. Live driver location, ETA, progress timeline and in-app chat with your driver.',
  'services':
    'From single-item deliveries to full office relocations — every FlyttGo service is run by registered US carriers with goods-in-transit insurance.',
  'van-guide':
    'Not sure what size van you need? Compare Small, Medium, Large and Luton options side-by-side and get an instant recommendation for your move.',
  'checklist':
    'The complete moving checklist for the USA. Timeline, packing order, utilities, address change — everything you need for a stress-free move.',
  'subscriptions':
    'Drive for FlyttGo and keep more of what you earn. Pick a subscription that matches your volume — lower commission, higher dispatch priority.',
  'driver-onboarding':
    'Apply to become a FlyttGo driver. Flexible hours, weekly payouts, verified jobs across the USA. Requirements, fees and application walkthrough inside.',
  'customer-dashboard':
    'Your FlyttGo dashboard — active bookings, past moves, receipts and driver tracking all in one place.',
  'my-bookings':
    'View, track and manage every FlyttGo booking from one place — with live driver location, receipts and dispute tools.',
  'driver-portal':
    'The FlyttGo driver portal — active jobs, earnings, payouts and subscription settings.',
  'admin':
    'Internal FlyttGo admin dashboard.',
  'profile':
    'Manage your FlyttGo profile, notification settings and language preferences.',
  'corporate':
    'FlyttGo for enterprises and institutions worldwide — bulk booking, recurring deliveries, consolidated invoicing and API access for US companies at every scale.',
  'corporate-dashboard':
    'The FlyttGo corporate dashboard — track delivery volume, spending and performance across your whole organisation.',
  'bulk-booking':
    'Upload multiple delivery jobs at once. Perfect for retailers, warehouses and event logistics managing dozens of drops in a single run.',
  'recurring-deliveries':
    'Set up daily, weekly or monthly delivery runs with automatic driver assignment. Ideal for scheduled freight, laundry, catering and more.',
  'company-dashboard-info':
    'Take the tour of the FlyttGo corporate dashboard — reporting, user management, invoicing and analytics.',
  'invoice-billing':
    'Consolidated monthly invoicing, tax-compliant receipts and flexible payment terms for FlyttGo business customers.',
  'corporate-api-access':
    'The FlyttGo REST API — create bookings, track deliveries and reconcile invoices straight from your ERP, WMS or e-commerce platform.',
  'terms':
    'FlyttGo Global\u2019s Terms of Service — the rules that govern using the FlyttGo marketplace as a customer or business.',
  'privacy':
    "FlyttGo\u2019s Privacy Policy. How we collect, use and protect your data under US and EU privacy law (GDPR).",
  'liability':
    'FlyttGo Global\u2019s liability terms — goods in transit cover, claim process, driver responsibilities and dispute resolution.',
  'driver-terms':
    'The FlyttGo Driver Agreement — commission, commitments, conduct and the rules for accepting jobs on the FlyttGo platform.',
  'about':
    'FlyttGo Global is the USA\u2019s #1 moving marketplace. Verified drivers, escrow payment, real-time tracking — built in New York, run by Americans.',
  'contact':
    'Get in touch with FlyttGo — phone, email, WhatsApp, office address and a contact form. Support available 7 days a week, 08:00\u201322:00.',
  'faq':
    'Answers to the most common questions about booking, payment, drivers, insurance and cancellations on FlyttGo.',
  'help':
    'Browse help articles and guides for booking, payment, safety, account management and using FlyttGo for business.',
  'safety':
    'How FlyttGo keeps you safe — 6-step driver vetting, mandatory goods-in-transit insurance, escrow payments and our damage claims process.',
  'careers':
    'Join the FlyttGo team. Open roles in engineering, design, operations, support and marketing — plus how to apply as a driver.',
  'press':
    'Press & media kit for FlyttGo — quick facts, executive bios, brand assets and press contact.',
  'sustainability':
    'How FlyttGo makes moving greener — shared routes, EV fleet incentives, reusable moving kits and carbon offset on every booking.',
  'auth-callback':
    'Confirming your FlyttGo account and signing you in. You\u2019ll be redirected to your dashboard automatically.',
  'driver-application-status':
    'Track the status of your FlyttGo driver application — pending review, approved, or rejected with next steps.',
  'not-found':
    "The page you were looking for doesn't exist. Find what you need from the FlyttGo homepage, or book a move from any of our services.",
};

/** Page id → canonical URL path. */
export function pageToPath(page: Page): string {
  return PAGE_TO_PATH[page] ?? '/';
}

/** Page id → meta description. */
export function pageDescription(page: Page): string {
  return PAGE_DESCRIPTIONS[page] ?? PAGE_DESCRIPTIONS.home;
}

/** Page id → structured SEO meta bundle (title + description). */
export function pageMeta(page: Page): PageMeta {
  return {
    title:       pageTitle(page),
    description: pageDescription(page),
  };
}

/**
 * Apply page meta to the document head. Updates <title>, meta
 * description, canonical link, OpenGraph and Twitter tags in place.
 * Creates missing tags if they're not already in index.html so
 * deep-linked pages still get the right head from a cold load.
 */
export function applyPageMeta(page: Page): void {
  if (typeof document === 'undefined') return;
  const meta  = pageMeta(page);
  const path  = pageToPath(page);
  const url   = `https://flyttgo.us${path === '/' ? '' : path}`;
  const image = 'https://flyttgo.us/og.svg';

  document.title = meta.title;
  upsertMeta('name',     'description',      meta.description);
  upsertLink('canonical', url);

  upsertMeta('property', 'og:title',        meta.title);
  upsertMeta('property', 'og:description',  meta.description);
  upsertMeta('property', 'og:url',          url);
  upsertMeta('property', 'og:image',        image);
  upsertMeta('property', 'og:type',         'website');
  upsertMeta('property', 'og:site_name',    'FlyttGo Global Logistics & Relocation Marketplace');

  upsertMeta('name',     'twitter:card',        'summary_large_image');
  upsertMeta('name',     'twitter:title',        meta.title);
  upsertMeta('name',     'twitter:description',  meta.description);
  upsertMeta('name',     'twitter:image',        image);
}

function upsertMeta(keyAttr: 'name' | 'property', keyValue: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${keyAttr}="${keyValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(keyAttr, keyValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * URL path → page id. Trailing slashes are ignored (so `/about/` and
 * `/about` both resolve). Unknown paths return 'home' so the router
 * defaults to the landing page.
 */
export function pathToPage(path: string): Page {
  if (!path) return 'home';
  const normalised = path === '/' ? '/' : path.replace(/\/+$/, '');
  /* Service category pages: /services/<slug> resolves to the
   * service-category page; ServiceCategoryPage reads the slug from
   * window.location.pathname. The bare /services keeps mapping to
   * the existing services listing. */
  if (normalised.startsWith('/services/') && normalised.length > '/services/'.length) {
    return 'service-category';
  }
  /* Corridor pages: /corridor/<country>/<slug> resolves to the
   * corridor page; CorridorPage reads country + slug from
   * window.location.pathname. The bare /corridor falls through to
   * not-found because there is no corridor index page. */
  if (normalised.startsWith('/corridor/') && normalised.length > '/corridor/'.length) {
    return 'corridor';
  }
  /* Strategic-city landing pages: /moving-<slug> resolves to the
   * moving-city page; MovingCityPage reads the slug from
   * window.location.pathname and looks it up in ANCHOR_CITIES. The
   * bare /moving keeps mapping to the moving-city listing. */
  if (normalised.startsWith('/moving-') && normalised.length > '/moving-'.length) {
    return 'moving-city';
  }
  /* Unknown paths resolve to 'not-found' rather than silently
   * serving the homepage. NotFoundPage sets robots=noindex so
   * Google doesn't index the garbage URL, and the user sees a
   * proper 404 instead of a confusing home view. */
  return PATH_TO_PAGE[normalised] ?? 'not-found';
}

/** Page id → browser tab title. */
export function pageTitle(page: Page): string {
  return PAGE_TITLES[page] ?? 'FlyttGo Global';
}
