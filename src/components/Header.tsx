import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANG_STORAGE_KEY } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { useApp, Page } from '../lib/store';
import { LogIn, Bell, User as UserIcon, ArrowRight } from 'lucide-react';
import ThemeToggle from './global/ThemeToggle';
import { useNotifications } from '../hooks/useNotifications';
import type { Page as PageType } from '../lib/store';

/* ─────────────────────────────────────────────────────────────────
 * 2035 marketplace nav structure — four dropdowns + two plain links.
 *
 *   Countries   : where  · 6 localized marketplaces
 *   Services    : what   · 8 category landing pages (/services/<slug>)
 *   Providers   : supply · join, earnings, tiers, dashboard
 *   Enterprise  : high-value contracts · corporate / universities /
 *                 municipal / government / partners
 *   Pricing     : transparency
 *   How booking works : onboarding
 *
 * Dropdown items use either a Page id (in-app router) OR a path
 * (window.history pushState + service-category routing). Items are
 * plain data so the markup is purely presentational.
 * ───────────────────────────────────────────────────────────────── */

interface DropdownItem {
  label:    string;
  page?:    Page;
  /** When set, navigates to /services/<slug> via service-category route. */
  servicesSlug?: string;
  /** Optional flag emoji (countries) or symbol prefix shown left of the label. */
  prefix?:  string;
  /** Optional one-line subtitle — rendered smaller under the label
   *  to give the mega menu the Stripe / Airbnb editorial density. */
  description?: string;
}

interface NavSection {
  /** Optional eyebrow above the column. */
  eyebrow?: string;
  items:    DropdownItem[];
}

interface NavDropdown {
  key:      'countries' | 'services' | 'providers' | 'enterprise';
  label:    string;
  /** Width of the popover. Defaults to a modest fixed width if absent. */
  width?:   string;
  /** Multi-column section layout. Each section becomes one column at lg+. */
  sections: NavSection[];
  /** Optional right-rail "feature" panel — a CTA card sitting to the
   *  right of the columns. Stripe + Airbnb both anchor a featured
   *  link this way to make the mega menu feel like a marketing
   *  surface, not a sitemap. */
  feature?: {
    eyebrow:  string;
    title:    string;
    body:     string;
    cta:      { label: string; page: Page };
  };
}

const NAV_DROPDOWNS: NavDropdown[] = [
  /* Countries — all 16 markets surfaced as four columns: Active (NA),
   *  Active (EU), Activating wave 1, Activating wave 2. Right-rail
   *  feature points at the country index page. */
  {
    key:   'countries',
    label: 'Countries',
    width: 'w-[64rem]',
    sections: [
      {
        eyebrow: 'Active · North America',
        items: [
          { label: 'United States',  page: 'market-us',     prefix: '🇺🇸', description: 'NYC · LA · Austin · Atlanta' },
          { label: 'Canada',         page: 'market-canada', prefix: '🇨🇦', description: 'Toronto · Montréal · Vancouver' },
        ],
      },
      {
        eyebrow: 'Active · Europe',
        items: [
          { label: 'United Kingdom', page: 'market-uk',     prefix: '🇬🇧', description: 'London · Manchester · Edinburgh' },
          { label: 'France',         page: 'market-france', prefix: '🇫🇷', description: 'Paris · Lyon · Marseille' },
          { label: 'Germany',        page: 'market-germany',prefix: '🇩🇪', description: 'Berlin · München · Hamburg' },
          { label: 'Norway',         page: 'market-norway', prefix: '🇳🇴', description: 'Oslo · Bergen · Trondheim' },
        ],
      },
      {
        eyebrow: 'Activating · Wave 1',
        items: [
          { label: 'Netherlands',    page: 'market-nl',     prefix: '🇳🇱', description: 'Amsterdam · Rotterdam · The Hague' },
          { label: 'Sweden',         page: 'market-se',     prefix: '🇸🇪', description: 'Stockholm · Göteborg · Malmö' },
          { label: 'Spain',          page: 'market-es',     prefix: '🇪🇸', description: 'Madrid · Barcelona · Valencia' },
          { label: 'Italy',          page: 'market-it',     prefix: '🇮🇹', description: 'Milano · Roma · Torino' },
          { label: 'Poland',         page: 'market-pl',     prefix: '🇵🇱', description: 'Warszawa · Kraków · Wrocław' },
        ],
      },
      {
        eyebrow: 'Activating · Wave 2',
        items: [
          { label: 'Denmark',        page: 'market-dk',     prefix: '🇩🇰', description: 'København · Aarhus · Odense' },
          { label: 'Belgium',        page: 'market-be',     prefix: '🇧🇪', description: 'Brussels · Antwerp · Ghent' },
          { label: 'Austria',        page: 'market-at',     prefix: '🇦🇹', description: 'Wien · Graz · Linz' },
          { label: 'Switzerland',    page: 'market-ch',     prefix: '🇨🇭', description: 'Zürich · Genève · Basel' },
          { label: 'Czech Republic', page: 'market-cz',     prefix: '🇨🇿', description: 'Praha · Brno · Ostrava' },
        ],
      },
    ],
    feature: {
      eyebrow: '16 markets',
      title:   '6 live + 10 activating',
      body:    'Active markets ship full booking + escrow today. Activating markets surface 5 anchor cities each with rollout-status SEO landings; provider density unlocks bookings on a per-city threshold.',
      cta:     { label: 'See all marketplaces →', page: 'cities' },
    },
  },

  /* Services — 8 categories grouped into two thematic columns. */
  {
    key:   'services',
    label: 'Services',
    width: 'w-[48rem]',
    sections: [
      {
        eyebrow: 'Residential',
        items: [
          { label: 'Local moves',           servicesSlug: 'local',         description: 'Same-city, often same-day' },
          { label: 'Long-distance moves',   servicesSlug: 'long-distance', description: 'Inter-state · cross-country' },
          { label: 'International relocation', servicesSlug: 'international', description: 'Customs-aware, door-to-door' },
          { label: 'Student moves',         servicesSlug: 'student',       description: 'Term-aware, campus-verified' },
        ],
      },
      {
        eyebrow: 'Commercial · Specialised',
        items: [
          { label: 'Office relocation',     servicesSlug: 'office',        description: 'Weekend windows · IT decommission' },
          { label: 'Packing services',      servicesSlug: 'packing',       description: 'Full · partial · fragile crating' },
          { label: 'Storage',               servicesSlug: 'storage',       description: 'Short-term + long-term staging' },
          { label: 'Truck rental',          servicesSlug: 'truck-rental',  description: 'DIY-friendly with optional crew' },
        ],
      },
    ],
    feature: {
      eyebrow: 'Pricing engine',
      title:   'Distance-priced, country-baselined',
      body:    'Every category quote routes through the unified pricing engine. Real OSRM distance, metro surge, and tier multipliers — transparent before you confirm.',
      cta:     { label: 'See the pricing engine →', page: 'pricing' },
    },
  },

  /* Providers — supply-side funnel. */
  {
    key:   'providers',
    label: 'Providers',
    width: 'w-[44rem]',
    sections: [
      {
        eyebrow: 'Apply + earn',
        items: [
          { label: 'Join FlyttGo',         page: 'driver-onboarding', description: 'Apply in 5 minutes; document upload + tier choice' },
          { label: 'Earnings simulator',   page: 'providers',         description: 'Project monthly income by country, tier, and corridor' },
          { label: 'Subscription tiers',   page: 'subscriptions',     description: 'Silver → Elite · lower commission, higher dispatch priority' },
        ],
      },
      {
        eyebrow: 'Operate',
        items: [
          { label: 'Provider dashboard',   page: 'driver-portal',          description: 'Jobs · payouts · subscription · documents' },
          { label: 'Compliance requirements', page: 'provider-requirements', description: 'Country-specific licensing, insurance, vehicle' },
        ],
      },
    ],
    feature: {
      eyebrow: 'For new applicants',
      title:   'Approval typically in 24–48 hours',
      body:    'Tier choice unlocks immediately on document approval. Cash and Stripe payouts available across all six markets.',
      cta:     { label: 'Apply as a provider →', page: 'driver-onboarding' },
    },
  },

  /* Enterprise — institutional vertical. */
  {
    key:   'enterprise',
    label: 'Enterprise',
    width: 'w-[48rem]',
    sections: [
      {
        eyebrow: 'Workforce + students',
        items: [
          { label: 'Corporate relocation', page: 'enterprise-relocation',     description: 'Talent mobility · multi-country packages · HRIS audit' },
          { label: 'Universities',         page: 'universities',              description: 'Move-in · move-out · semester corridors' },
        ],
      },
      {
        eyebrow: 'Public sector',
        items: [
          { label: 'Municipal relocation', page: 'pilot-deployment-programs', description: 'Municipal workforce moves · framework agreements' },
          { label: 'Government mobility',  page: 'government-programs',       description: 'CIP-vetted vendors · audit-ready logs · RFP-ready' },
          { label: 'Partner integrations', page: 'partners',                  description: 'API access · embedded checkout · referral payouts' },
        ],
      },
    ],
    feature: {
      eyebrow: 'Procurement-ready',
      title:   'Submit an RFP — vendor pack on request',
      body:    'Capability brief, vendor compliance pack, and framework-pricing examples available before procurement starts.',
      cta:     { label: 'Submit an RFP →', page: 'procurement-rfp' },
    },
  },
];

/* Four-language switcher across the marketplace. The codebase
 * supports EN / NB (Norwegian Bokmål) / DE / FR via locale files
 * in src/lib/locales — each language is a real i18next bundle.
 * The active language id stored here mirrors what i18next holds;
 * the Header switcher writes through to i18n.changeLanguage() so
 * the booking flow + country pages stay in sync.
 *
 * UI labels keep "NO" for Norwegian even though i18next stores
 * 'nb' — the storefronts and customers think in country terms,
 * not language codes. */
type Lang = 'en' | 'nb' | 'de' | 'fr' | 'nl' | 'sv' | 'es' | 'it' | 'pl' | 'da' | 'cs';

interface LangOption {
  /** i18next language id. */
  code:  Lang;
  /** Two-letter UI label shown next to the globe icon. */
  short: string;
  /** Full label inside the popover. */
  label: string;
  /** Flag emoji for the popover row. */
  flag:  string;
}

/** 11 languages: English baseline + 10 country-shopfront locales.
 *  Order: legacy-market languages first, then expansion languages
 *  in wave order so the popover reads as the rollout-status sitemap
 *  the rest of the app already exposes. */
const LANG_OPTIONS: LangOption[] = [
  /* Legacy-market languages */
  { code: 'en', short: 'EN', label: 'English',   flag: '🇬🇧' },
  { code: 'fr', short: 'FR', label: 'Français',  flag: '🇫🇷' },
  { code: 'de', short: 'DE', label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'nb', short: 'NO', label: 'Norsk',     flag: '🇳🇴' },
  /* Expansion — first wave */
  { code: 'nl', short: 'NL', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', short: 'SV', label: 'Svenska',    flag: '🇸🇪' },
  { code: 'es', short: 'ES', label: 'Español',    flag: '🇪🇸' },
  { code: 'it', short: 'IT', label: 'Italiano',   flag: '🇮🇹' },
  { code: 'pl', short: 'PL', label: 'Polski',     flag: '🇵🇱' },
  /* Expansion — second wave */
  { code: 'da', short: 'DA', label: 'Dansk',      flag: '🇩🇰' },
  { code: 'cs', short: 'CS', label: 'Čeština',    flag: '🇨🇿' },
];

/* Moving tools + corporate links are built inside the component
 * body (via useMemo) so they have access to t() for translation.
 * The const arrays that used to live here at module scope were
 * hardcoded English and didn't respond to the language switcher. */

/* Tiny "5m ago" / "2h ago" / "3d ago" formatter for the notifications
 * dropdown. Avoids pulling in date-fns just for one string. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60)        return 'just now';
  if (diffSec < 3600)      return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86_400)    return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604_800)   return `${Math.floor(diffSec / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Header() {
  const { profile, signOut, user } = useAuth();
  const { setPage, currentPage, setShowAuthModal, setAuthMode } = useApp();
  const { t, i18n: i18nInstance } = useTranslation();
  const [mobileOpen,    setMobileOpen]    = useState(false);
  /* Single open-nav-dropdown state — exclusive across the four
   * Countries / Services / Providers / Enterprise dropdowns so only
   * one is ever open at a time. */
  const [openDropdown,  setOpenDropdown]  = useState<NavDropdown['key'] | null>(null);
  const [langOpen,      setLangOpen]      = useState(false);
  const [userMenuOpen,  setUserMenuOpen]  = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [scrolled,      setScrolled]      = useState(false);
  const lang: Lang = (() => {
    const c = i18nInstance.language;
    /* Direct match against the supported locale set. */
    const supported: Lang[] = ['en', 'nb', 'de', 'fr', 'nl', 'sv', 'es', 'it', 'pl', 'da', 'cs'];
    if ((supported as string[]).includes(c)) return c as Lang;
    /* Legacy 'no' label maps to 'nb' (the actual locale id). */
    if (c === 'no') return 'nb';
    return 'en';
  })();
  const activeLang = LANG_OPTIONS.find(l => l.code === lang) ?? LANG_OPTIONS[0];
  const headerRef = useRef<HTMLElement>(null);
  /* Two refs for the language switcher: the button lives inside the
   * scroll-collapsing top bar (overflow-hidden), while the popover is
   * rendered as a sibling of that bar so it escapes the clip. Outside
   * click detection has to check both nodes. */
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const langPopRef = useRef<HTMLDivElement>(null);

  /* Real-time notifications for the bell icon. Returns an empty list
   * silently if the notifications table / RLS / publication aren't
   * applied yet (see docs/notifications-migration.sql). */
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id ?? null);

  // Scroll-aware top strip (shrinks after 40px)
  useEffect(() => {
    const onScroll = () => {
      const s = window.scrollY > 40;
      setScrolled(s);
      /* When the top bar collapses out of view, force-close any open
       * language dropdown so its popover doesn't hang in mid-air. */
      if (s) setLangOpen(false);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Sync <html lang> with the active language whenever it changes. */
  useEffect(() => {
    if (typeof document !== 'undefined') {
      /* Norwegian Bokmål is 'nb' in the Lang union, not 'no'; the
       * latter is the country code, not a locale tag. Comparing to
       * 'no' was always false — the pre-existing typo here meant
       * Norwegian visitors were tagged as en-US. */
      document.documentElement.lang = lang === 'nb' ? 'nb-NO' : 'en';
    }
  }, [lang]);

  // Outside-click closes all open dropdowns
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) closeAll();
      const inLangBtn = langBtnRef.current?.contains(target) ?? false;
      const inLangPop = langPopRef.current?.contains(target) ?? false;
      if (!inLangBtn && !inLangPop) setLangOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function closeAll() {
    setUserMenuOpen(false);
    setOpenDropdown(null);
    setNotifOpen(false);
  }

  function toggle(which: 'user' | 'notif') {
    setOpenDropdown(null);
    setUserMenuOpen(which === 'user'       ? (s) => !s : false);
    setNotifOpen(which === 'notif'         ? (s) => !s : false);
  }

  function toggleDropdown(key: NavDropdown['key']) {
    setUserMenuOpen(false);
    setNotifOpen(false);
    setOpenDropdown(prev => prev === key ? null : key);
  }

  function handleNav(page: Page) { setPage(page); setMobileOpen(false); closeAll(); }

  /* Dropdown-item activation. Service-category items push a path so
   * ServiceCategoryPage can read its slug from the URL; Page-id items
   * route through the in-app store. */
  function handleDropdownItem(item: DropdownItem) {
    if (item.servicesSlug) {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/services/${item.servicesSlug}`);
      }
      setPage('service-category');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } else if (item.page) {
      setPage(item.page);
    }
    setMobileOpen(false);
    closeAll();
  }

  function openSignIn() {
    setAuthMode('signin');
    setShowAuthModal(true);
    setMobileOpen(false);
    closeAll();
  }

  function openSignUp() {
    setAuthMode('signup');
    setShowAuthModal(true);
    setMobileOpen(false);
    closeAll();
  }

  function chooseLang(l: Lang) {
    void i18n.changeLanguage(l);
    setLangOpen(false);
    if (typeof window !== 'undefined') window.localStorage.setItem(LANG_STORAGE_KEY, l);
    /* Sync <html lang="…"> for SEO + assistive tech. Map the i18next
     * code to a BCP-47 tag with the dominant region for each locale. */
    if (typeof document !== 'undefined') {
      const BCP47: Record<Lang, string> = {
        en: 'en',
        fr: 'fr-FR',
        de: 'de-DE',
        nb: 'nb-NO',
        nl: 'nl-NL',
        sv: 'sv-SE',
        es: 'es-ES',
        it: 'it-IT',
        pl: 'pl-PL',
        da: 'da-DK',
        cs: 'cs-CZ',
      };
      document.documentElement.lang = BCP47[l] ?? 'en';
    }
  }

  const chevron = (open: boolean) => (
    <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
    </svg>
  );

  return (
    <>
    {/* Mobile drawer backdrop — full-viewport blur + dim layer behind
     *  the slide-right drawer. Click-through to close. Sits at z-30
     *  so it covers the page but stays under the drawer (z-40). */}
    {mobileOpen && (
      <div
        className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-md z-30 animate-[fade-in_200ms_ease-out]"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
    )}
    <header ref={headerRef} className="sticky top-0 z-40 shadow-md">

      {/* Wrapper hosts the top bar AND the language popover as
       * siblings, so the popover escapes the top bar's overflow-hidden
       * clip. Relative so the popover can absolutely position itself
       * beneath the top bar. */}
      <div className="relative">
        {/* TOP BAR — collapses on scroll */}
        <div
          className={`bg-[#1A365D] text-white overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
            scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-9 text-xs">
              <div className="flex items-center gap-4">
                <a href="tel:+447432112438" className="flex items-center gap-1.5 text-white/80 hover:text-white transition">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  +44 7432 112438
                </a>
                <span className="text-white/30 hidden sm:block">|</span>
                <span className="text-white/70 hidden sm:block">{t('header.tagline')}</span>
              </div>
              <button
                ref={langBtnRef}
                onClick={() => setLangOpen((o) => !o)}
                className="flex items-center gap-1.5 text-white/80 hover:text-white transition text-xs font-semibold"
                aria-haspopup="true"
                aria-expanded={langOpen}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
                </svg>
                <span aria-hidden="true">{activeLang.flag}</span>
                {activeLang.short}
                {chevron(langOpen)}
              </button>
            </div>
          </div>
        </div>

        {/* Language popover — sibling of the collapsing bar so
         * overflow-hidden can't clip it. Lists all four supported
         * languages: EN / FR / DE / NO. */}
        {langOpen && !scrolled && (
          <div ref={langPopRef} className="absolute inset-x-0 top-9 z-50 pointer-events-none">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
              <div className="pointer-events-auto w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 mt-1">
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.code}
                    onClick={() => chooseLang(opt.code)}
                    className={`w-full text-left px-4 py-2 text-sm transition flex items-center gap-2 ${
                      lang === opt.code
                        ? 'text-amber-700 font-semibold bg-amber-50'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span aria-hidden="true">{opt.flag}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN NAV — glass + soft shadow, deeper navy text on a
       *  translucent white wash. Backdrop blur kicks in once the
       *  page has scrolled past the top bar so the nav reads as
       *  floating over content. */}
      <div className={`backdrop-blur-md border-b border-slate-200/60 transition-shadow ${
        scrolled
          ? 'bg-white/85 shadow-[0_4px_30px_rgba(15,23,42,0.08)]'
          : 'bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo — brand-aligned: amber icon-tile on ink-navy ring,
             *  matches the marketplace banner palette so the logo
             *  doesn't read as a different product than the rest of
             *  the site. */}
            <button onClick={() => handleNav('home')} className="flex items-center gap-2.5 flex-shrink-0 mr-4 lg:mr-10 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30 ring-1 ring-amber-400/40">
                <svg className="w-5 h-5 text-ink-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1 2 1 2-1 2 1 2-1zm0 0l2 1 2-1 2 1V6a1 1 0 00-1-1h-4"/>
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">Flytt<span className="text-amber-600">Go</span></span>
                <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-slate-500 mt-0.5 font-semibold">Global relocation marketplace</span>
              </div>
            </button>

            {/* Desktop nav — 2035 marketplace hierarchy.
             *  Four dropdowns + two plain links. The dropdowns are
             *  click-triggered (accessible without hover) and only
             *  one can be open at a time. */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
              {NAV_DROPDOWNS.map(d => {
                const isOpen = openDropdown === d.key;
                const hasFeature = Boolean(d.feature);
                return (
                  <div key={d.key} className="relative">
                    <button
                      onClick={() => toggleDropdown(d.key)}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      className={`flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                        isOpen
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {d.label}{chevron(isOpen)}
                    </button>
                    {isOpen && (
                      <div
                        className={`absolute top-full left-0 mt-2 ${d.width ?? 'w-72'} bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] border border-slate-200/70 z-50 backdrop-blur-md overflow-hidden`}
                      >
                        <div className={`grid ${hasFeature ? 'grid-cols-12' : 'grid-cols-1'} gap-0`}>
                          {/* Section columns — 2/3 of the popover width
                           *  when a feature panel is present, full
                           *  width otherwise. Each section becomes one
                           *  column at lg+. */}
                          <div className={`${hasFeature ? 'col-span-8' : 'col-span-1'} p-4 grid ${
                            d.sections.length >= 4 ? 'grid-cols-4 gap-x-2' :
                            d.sections.length === 3 ? 'grid-cols-3 gap-x-2' :
                            d.sections.length === 2 ? 'grid-cols-2 gap-x-2' :
                                                      'grid-cols-1'
                          }`}>
                            {d.sections.map((s, si) => (
                              <div key={si} className="space-y-0.5">
                                {s.eyebrow && (
                                  <p className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">
                                    {s.eyebrow}
                                  </p>
                                )}
                                {s.items.map(it => (
                                  <button
                                    key={it.label}
                                    onClick={() => handleDropdownItem(it)}
                                    className="group w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 transition flex items-start gap-2.5"
                                  >
                                    {it.prefix && (
                                      <span className="text-xl leading-none flex-shrink-0 mt-0.5" aria-hidden="true">
                                        {it.prefix}
                                      </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-semibold text-slate-800 group-hover:text-amber-700 truncate">
                                        {it.label}
                                      </span>
                                      {it.description && (
                                        <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                                          {it.description}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>

                          {/* Feature panel — Stripe-style anchored CTA
                           *  card on the right rail. Brand-aligned amber
                           *  + ink-navy. */}
                          {hasFeature && d.feature && (
                            <div className="col-span-4 bg-gradient-to-br from-amber-50 to-white border-l border-slate-100 p-5 flex flex-col">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-700 font-bold mb-2">
                                {d.feature.eyebrow}
                              </p>
                              <p className="text-sm font-extrabold text-slate-900 leading-snug mb-2">
                                {d.feature.title}
                              </p>
                              <p className="text-xs text-slate-600 leading-relaxed flex-1">
                                {d.feature.body}
                              </p>
                              <button
                                onClick={() => { handleNav(d.feature!.cta.page); }}
                                className="mt-4 inline-flex items-center gap-1 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-bold shadow-sm transition self-start"
                              >
                                {d.feature.cta.label}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Plain links — 'How booking works' stays in the top
               *  nav as a single-line conversion explainer. Pricing
               *  was removed: it's surfaced as 'Pricing guide' in the
               *  footer Customers column where transparency-curious
               *  customers naturally look, and the marketplace tier
               *  pricing for providers lives at /driver-subscriptions. */}
              <button
                onClick={() => handleNav('how-it-works')}
                aria-current={currentPage === 'how-it-works' ? 'page' : undefined}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                  currentPage === 'how-it-works'
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                How booking works
              </button>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* ⌘K command palette discovery hint. Dispatching the
                  same keyboard combo via a synthetic KeyboardEvent
                  would be brittle — instead we fire a custom event
                  that AppLayout's listener can pick up. */}
              <button
                type="button"
                onClick={() => {
                  /* Mirror the keydown handler in AppLayout. */
                  const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                  window.dispatchEvent(evt);
                }}
                aria-label="Search FlyttGo (Command K)"
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-base ease-marketplace text-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
                <span className="font-mono text-[10px] border border-slate-300 rounded px-1 py-0.5">⌘K</span>
              </button>
              {/* Theme toggle — Light / Dark / System. Hidden <md to
                  preserve nav real estate; mobile menu drawer carries
                  the same control. */}
              <div className="hidden md:block">
                <ThemeToggle compact />
              </div>
              {/* Primary CTA — "Get instant price →" replaces the
               *  generic "Book now". Logistics-grade language; routes
               *  into the booking flow with the country defaulted from
               *  bookingData.country. Visible on every breakpoint —
               *  shorter "Get price →" label on mobile to save space. */}
              <button
                onClick={() => handleNav('booking')}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-amber-500/30"
              >
                <span className="hidden sm:inline">Get instant price</span>
                <span className="sm:hidden">Get price</span>
                <ArrowRight size={14} />
              </button>

              {/* Notifications bell — signed-in only. Subscribes to
               * the notifications table over Supabase Realtime; flips
               * a red dot on the bell when there's anything unread. */}
              {user && profile && (
                <div className="relative">
                  <button
                    onClick={() => {
                      const willOpen = !notifOpen;
                      toggle('notif');
                      if (willOpen) markAllRead();
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition relative"
                    aria-label={unreadCount > 0 ? `${t('header.notifications')} (${unreadCount})` : t('header.notifications')}
                  >
                    <Bell className="w-5 h-5 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                    )}
                  </button>
                  {notifOpen && (
                    <div
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                      role="dialog"
                      aria-label={t('header.notifications')}
                      aria-live="polite"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">{t('header.notifications')}</h3>
                        {notifications.length > 0 && (
                          <span className="text-[10px] text-gray-400">{notifications.length} most recent</span>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="py-10 px-4 text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">{t('header.notificationsEmpty')}</p>
                          <p className="text-xs text-gray-400 mt-1">{t('header.notificationsHint')}</p>
                        </div>
                      ) : (
                        <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                          {notifications.map((n) => (
                            <li key={n.id}>
                              <button
                                onClick={() => {
                                  if (n.link_page) handleNav(n.link_page as PageType);
                                  else closeAll();
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3"
                              >
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.read_at ? 'bg-transparent' : 'bg-emerald-500'}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{n.title}</div>
                                  {n.body && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>}
                                  <div className="text-[10px] text-gray-400 mt-1">{relativeTime(n.created_at)}</div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {user && profile ? (
                <div className="relative">
                  <button onClick={() => toggle('user')} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold text-sm flex-shrink-0">
                      {(profile.first_name?.[0] || 'U').toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {profile.role === 'admin' ? 'FLYTTGO' : profile.first_name || 'User'}
                    </span>
                    {chevron(userMenuOpen)}
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {profile.role === 'admin' ? 'FLYTTGO Dashboard' : `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{profile.email}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded uppercase tracking-wide">
                          {profile.role}
                        </span>
                      </div>
                      <button onClick={() => handleNav('profile')} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        {t('header.profile')}
                      </button>
                      {profile.role === 'customer' && (<>
                        <button onClick={() => handleNav('customer-dashboard')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">{t('header.dashboard')}</button>
                        <button onClick={() => handleNav('my-bookings')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">{t('header.myBookings')}</button>
                      </>)}
                      {profile.role === 'driver' && (
                        <button onClick={() => handleNav('driver-portal')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">{t('header.driverPortal')}</button>
                      )}
                      {profile.role === 'admin' && (
                        <button onClick={() => handleNav('admin')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">{t('header.adminDash')}</button>
                      )}
                      <hr className="my-1 border-gray-100"/>
                      <button onClick={() => { signOut(); setPage('home'); closeAll(); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition font-medium">{t('header.signOut')}</button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={openSignIn}
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    <LogIn className="w-4 h-4" />
                    {t('header.signIn')}
                  </button>
                </>
              )}

              <button onClick={() => setMobileOpen((o) => !o)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition">
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MOBILE DRAWER — slides in from the right, modern marketplace
       *  pattern. Sits as a fixed-positioned aside outside the sticky
       *  header flow so it can cover the viewport. The blur backdrop
       *  declared at the top of this file dims the page beneath. */}
      <aside
        id="header-mobile-drawer"
        className={`lg:hidden fixed top-0 right-0 z-40 h-full w-[88%] max-w-sm bg-white shadow-[0_0_60px_rgba(15,23,42,0.25)] flex flex-col transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!mobileOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <span className="text-sm font-bold text-slate-900 uppercase tracking-[0.18em]">Menu</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Drawer content — scroll independently. */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {NAV_DROPDOWNS.map(d => (
            <div key={d.key} className="pt-2">
              <p className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">
                {d.label}
              </p>
              {d.sections.flatMap(s => s.items).map(it => (
                <button
                  key={it.label}
                  onClick={() => handleDropdownItem(it)}
                  className="block w-full text-left px-3 py-2 text-sm rounded-lg text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition"
                >
                  {it.prefix && <span className="mr-2" aria-hidden="true">{it.prefix}</span>}
                  {it.label}
                </button>
              ))}
            </div>
          ))}

          <div className="pt-3 border-t border-slate-100">
            {/* Pricing intentionally not in the mobile menu — it
             *  reaches the Pricing page via the footer Customers
             *  column ('Pricing guide'), keeping the mobile menu
             *  focused on the main conversion paths. */}
            <button
              onClick={() => handleNav('how-it-works')}
              aria-current={currentPage === 'how-it-works' ? 'page' : undefined}
              className={`block w-full text-left px-3 py-2.5 text-sm font-semibold rounded-lg ${currentPage === 'how-it-works' ? 'bg-amber-50 text-amber-700' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              How booking works
            </button>
          </div>

          {/* Language switcher — surfaced inline in the drawer per spec.
           *  Sticky-acts via i18n.changeLanguage so the booking flow
           *  picks up the choice. */}
          <div className="pt-3 border-t border-slate-100">
            <p className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">
              Language
            </p>
            <div className="px-1 grid grid-cols-2 gap-1.5">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.code}
                  onClick={() => chooseLang(opt.code)}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${
                    lang === opt.code
                      ? 'bg-amber-50 border-amber-300 text-amber-700 font-semibold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span aria-hidden="true">{opt.flag}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!user && (
            <div className="pt-3 border-t border-slate-100 space-y-1.5 px-1">
              <button
                onClick={openSignIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
              >
                <LogIn className="w-4 h-4" />
                {t('header.signIn')}
              </button>
              <button
                onClick={openSignUp}
                className="w-full py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition"
              >
                {t('header.signUp')}
              </button>
            </div>
          )}
        </div>

        {/* Pinned CTA at the bottom of the drawer for thumb-reach. */}
        <div className="border-t border-slate-200 p-4">
          <button
            onClick={() => handleNav('booking')}
            className="block w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-sm font-bold text-center shadow-lg shadow-amber-500/30 transition"
          >
            Get instant price →
          </button>
        </div>
      </aside>

    </header>
    </>
  );
}
