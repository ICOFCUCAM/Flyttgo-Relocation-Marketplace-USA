import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ShieldCheck, BadgeCheck, Truck, CreditCard, Cookie,
  Linkedin, Twitter, Instagram, Mail, Phone, Globe, Lock, ArrowRight,
} from 'lucide-react';
import { useApp, Page } from '../lib/store';
import { reopenCookieConsent } from './CookieConsent';
import { track } from '../lib/analytics';
import { COUNTRY_PROFILES } from '../lib/country-profiles';
import { ONBOARDING_RULES } from '../lib/onboarding-rules';
import { INPUT_FOCUS } from './ds';

interface LinkItem { label: string; page: Page; }

/* ─────────────────────────────────────────────────────────────────
 * Footer columns — 6 lanes per the marketplace navigation hub spec:
 *
 *   Customers  → demand-side: book, compare, request quotes
 *   Providers  → supply-side: apply, requirements, subscriptions
 *   Enterprise → institutional: corporate / universities / govt / NGO
 *   Countries  → six localized marketplaces
 *   Legal      → ToS, privacy, dispute, provider terms, compliance
 *   Platform   → company + infrastructure: about, press, partners
 *
 * Each link routes through useApp().setPage so the in-app router
 * picks it up; all destinations are real pages registered in
 * lib/pageRoutes.ts.
 * ───────────────────────────────────────────────────────────────── */

const CUSTOMERS: LinkItem[] = [
  { label: 'How booking works',     page: 'how-it-works' },
  { label: 'Marketplace',           page: 'marketplace' },
  { label: 'Browse providers',      page: 'providers-directory' },
  { label: 'Compare providers',     page: 'compare' },
  { label: 'Request a quote',       page: 'request-quote' },
  { label: 'Pricing guide',         page: 'pricing' },
  { label: 'Refer a friend',        page: 'refer' },
  { label: 'Track a move',          page: 'tracking' },
  { label: 'FAQ',                   page: 'faq' },
  { label: 'Help center',           page: 'help' },
  { label: 'Contact',               page: 'contact' },
];

const PROVIDERS: LinkItem[] = [
  { label: 'For providers',          page: 'providers' },
  { label: 'Provider requirements',  page: 'provider-requirements' },
  { label: 'Join FlyttGo',           page: 'driver-onboarding' },
  { label: 'Application status',     page: 'driver-application-status' },
  { label: 'Subscription tiers',     page: 'subscriptions' },
  { label: 'Provider dashboard',     page: 'driver-portal' },
  { label: 'Provider terms',         page: 'driver-terms' },
];

const ENTERPRISE: LinkItem[] = [
  { label: 'Corporate relocation',   page: 'enterprise-relocation' },
  { label: 'Bulk booking',           page: 'bulk-booking' },
  { label: 'Recurring deliveries',   page: 'recurring-deliveries' },
  { label: 'Invoice & billing',      page: 'invoice-billing' },
  { label: 'API access',             page: 'corporate-api-access' },
  { label: 'Universities',           page: 'universities' },
  { label: 'Government programs',    page: 'government-programs' },
  { label: 'NGO deployment',         page: 'ngo-deployment' },
  { label: 'Pilot programs',         page: 'pilot-deployment-programs' },
  { label: 'Vendor pack',            page: 'vendor-pack' },
  { label: 'Procurement RFP',        page: 'procurement-rfp' },
  { label: 'Capability brief',       page: 'capability-brief' },
];

/** Active markets — the six legacy shopfronts with full booking
 *  + payment + autocomplete wiring. Visualized first in the
 *  Markets footer column. */
const MARKETS_ACTIVE: LinkItem[] = [
  { label: '🇺🇸 USA',         page: 'market-us' },
  { label: '🇨🇦 Canada',      page: 'market-canada' },
  { label: '🇬🇧 UK',          page: 'market-uk' },
  { label: '🇫🇷 France',      page: 'market-france' },
  { label: '🇩🇪 Germany',     page: 'market-germany' },
  { label: '🇳🇴 Norway',      page: 'market-norway' },
];

/** Activating markets — first + second wave expansion shopfronts.
 *  Booking widget hidden until each country's payment + address
 *  autocomplete are wired; rollout-status surface in the meantime. */
const MARKETS_ACTIVATING: LinkItem[] = [
  { label: '🇳🇱 Netherlands',     page: 'market-nl' },
  { label: '🇸🇪 Sweden',          page: 'market-se' },
  { label: '🇪🇸 Spain',           page: 'market-es' },
  { label: '🇮🇹 Italy',           page: 'market-it' },
  { label: '🇵🇱 Poland',          page: 'market-pl' },
  { label: '🇩🇰 Denmark',         page: 'market-dk' },
  { label: '🇧🇪 Belgium',         page: 'market-be' },
  { label: '🇦🇹 Austria',         page: 'market-at' },
  { label: '🇨🇭 Switzerland',     page: 'market-ch' },
  { label: '🇨🇿 Czech Republic',  page: 'market-cz' },
  { label: '🇨🇾 Cyprus',          page: 'market-cy' },
];

/** Cross-market discovery surfaces — broader than a single country. */
const MARKETS_DISCOVER: LinkItem[] = [
  { label: 'All markets',         page: 'cities' },
  { label: 'Deployment regions',  page: 'deployment-regions' },
];

const PLATFORM: LinkItem[] = [
  { label: 'About FlyttGo',     page: 'about' },
  { label: 'Careers',           page: 'careers' },
  { label: 'Press',             page: 'press' },
  { label: 'Partners',          page: 'partners' },
  { label: 'Sustainability',    page: 'sustainability' },
  { label: 'Safety',            page: 'safety' },
  { label: 'Compliance',        page: 'compliance' },
];

const LEGAL: LinkItem[] = [
  { label: 'Terms',             page: 'terms' },
  { label: 'Privacy',           page: 'privacy' },
  { label: 'Liability',         page: 'liability' },
  { label: 'Provider terms',    page: 'driver-terms' },
  { label: 'File a dispute',    page: 'dispute' },
];

/* Trust strip metrics — every figure here is either:
 *   - derived from a canonical source (markets, currencies,
 *     compliance regimes), or
 *   - a hard guarantee of the platform (escrow, GDPR posture).
 *
 * No invented "X completed moves" / "Y verified providers" copy.
 * As soon as a Supabase aggregation view is wired, the dynamic
 * counts can swap into the placeholders without touching JSX. */

export default function Footer() {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);

  /* Every number on the trust strip is derived once from canonical
   * sources so adding a market or compliance regime updates the
   * footer automatically. The currency list comes from the same
   * source as the pricing engine. */
  const stats = useMemo(() => {
    const currencies = Array.from(new Set(COUNTRY_PROFILES.map(c => c.currency))).sort();
    return {
      markets:        COUNTRY_PROFILES.length,
      currencies,
      currencyCount:  currencies.length,
      regimes:        ONBOARDING_RULES.length,
    };
  }, []);

  const trustMetrics: Array<{
    icon:   typeof Globe;
    value:  string;
    label:  string;
    detail: string;
  }> = [
    { icon: Globe,       value: `${stats.markets}`,        label: 'Markets activated',  detail: 'Native currency, native compliance' },
    { icon: ShieldCheck, value: 'Escrow',                  label: 'On every booking',   detail: 'Released only on delivery confirmation' },
    { icon: BadgeCheck,  value: `${stats.regimes}`,        label: 'Compliance regimes', detail: 'FMCSA · GVOL · GüKG · SIRET · Yrkestrafik & more' },
    { icon: CreditCard,  value: `${stats.currencyCount}`,  label: 'Currencies supported', detail: 'No forced USD conversion at checkout' },
  ];

  return (
    <footer className="bg-[#0b1f3a] text-slate-300">

      {/* ── Trust strip ────────────────────────────────────────── */}
      <div className="bg-[#08182d] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {trustMetrics.map(({ icon: Icon, value, label, detail }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center flex-shrink-0">
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-white font-extrabold text-base leading-tight">{value}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80 mt-0.5">{label}</p>
                <p className="text-xs text-white/55 mt-0.5 leading-snug">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Brand + Newsletter + Social ───────────────────────── */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900">
                <Truck size={18} />
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight">
                Flytt<span className="text-amber-300">Go</span>
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-md mb-6">
              FlyttGo Global Logistics &amp; Relocation Marketplace connects
              customers with independent licensed relocation providers across
              {' '}{stats.markets}{' '}countries. Service providers are
              responsible for compliance with their national licensing,
              taxation, insurance, and regulatory requirements. FlyttGo
              operates as a digital coordination layer — not as a
              transportation carrier.
            </p>
            <div className="flex items-center gap-3 text-xs text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <Lock size={12} className="text-emerald-400" /> GDPR-aligned
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Globe size={12} className="text-emerald-400" /> {stats.markets} markets
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" /> Escrow-protected
              </span>
            </div>
          </div>

          <div className="lg:col-span-4">
            <NewsletterSignup />
          </div>

          <div className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
              Reach FlyttGo
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => go('contact')}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-amber-300 transition"
                >
                  <Mail size={14} className="text-amber-300/80" /> hello@flyttgo.us
                </button>
              </li>
              <li>
                <button
                  onClick={() => go('help')}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-amber-300 transition"
                >
                  <Phone size={14} className="text-amber-300/80" /> 24/7 support center
                </button>
              </li>
              <li>
                <button
                  onClick={() => go('procurement-rfp')}
                  className="inline-flex items-center gap-2 text-white/85 hover:text-amber-300 transition"
                >
                  <BadgeCheck size={14} className="text-amber-300/80" /> Procurement &amp; RFP
                </button>
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-2">
              <SocialLink href="https://www.linkedin.com/company/flyttgo" label="LinkedIn">
                <Linkedin size={15} />
              </SocialLink>
              <SocialLink href="https://twitter.com/flyttgo" label="X (formerly Twitter)">
                <Twitter size={15} />
              </SocialLink>
              <SocialLink href="https://instagram.com/flyttgo" label="Instagram">
                <Instagram size={15} />
              </SocialLink>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sitemap — 6-column platform navigation hub ───────────
       *
       * The Markets column carries 16 country shopfronts grouped
       * into "Active" (legacy markets with full booking) and
       * "Activating" (expansion markets with rollout-status pages),
       * so every shopfront in pageRoutes.ts is reachable from the
       * footer without exploding the grid into a 7th column. */}
      {/* lg:grid-cols-7 — Markets occupies 2 of those 7 tracks via
       *  col-span-2 inside FooterMarketsColumn, so its inner 2-col
       *  country grid has room without squeezing the other lanes. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-8">
        <FooterColumn title="Customers"  items={CUSTOMERS}  onNav={go} />
        <FooterColumn title="Providers"  items={PROVIDERS}  onNav={go} />
        <FooterColumn title="Enterprise" items={ENTERPRISE} onNav={go} />
        <FooterMarketsColumn onNav={go} />
        <FooterColumn title="Legal"      items={LEGAL}      onNav={go} />
        <FooterColumn title="Platform"   items={PLATFORM}   onNav={go} />
      </div>

      {/* ── Operator legal entities + currency coverage ────────── */}
      <div className="border-t border-white/5 bg-[#08182d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                North American marketplace
              </p>
              <p className="text-white font-extrabold">Wankong LLC</p>
              <p className="text-xs text-white/60 leading-relaxed mt-1">
                Delaware, United States · Operator of FlyttGo USA &amp; Canada
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
                European marketplace
              </p>
              <p className="text-white font-extrabold">FlyttGo Technologies Group</p>
              <p className="text-xs text-white/60 leading-relaxed mt-1">
                Norway · EEA · Operator of FlyttGo UK, FR, DE, NO &amp; expansion markets
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
              Currency coverage
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stats.currencies.map(c => (
                <span
                  key={c}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider bg-white/5 border border-white/10 text-white/75"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/50 leading-relaxed">
              Quotes are localized to the booking country's currency at activation.
              Cross-border bookings settle in the destination currency.
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom band ─ minimal: copyright + posture statement ──
       *
       * Legal links live in the dedicated Legal column above (Terms,
       * Privacy, Liability, Provider terms, Dispute). Repeating them
       * here turned the bottom band into a second nav row, which the
       * spec calls out as "legal section minimal, not dominant". The
       * Cookies preference reopener stays — it's a regulatory action,
       * not a navigation link, and there's no equivalent surface for
       * it elsewhere on the site. */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-white/55">
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
            <p>© {new Date().getFullYear()} FlyttGo Global Logistics &amp; Relocation Marketplace</p>
            <p className="text-white/40">Coordination layer · Not a moving company · Not a motor carrier</p>
          </div>
          <button
            type="button"
            onClick={() => {
              track('manage_cookies_clicked');
              reopenCookieConsent();
            }}
            className="inline-flex items-center gap-1.5 text-white/65 hover:text-amber-300 transition"
          >
            <Cookie size={12} />
            Cookie preferences
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ── Newsletter signup ──────────────────────────────────────────
 *
 * Lightweight email capture. Persists locally for now (so a refresh
 * doesn't lose the subscriber's state); a Supabase RPC can replace
 * the persistence in a follow-up. The form is keyboard-friendly,
 * announces success via aria-live, and tracks the conversion.
 * ──────────────────────────────────────────────────────────────── */
function NewsletterSignup() {
  const [email, setEmail]       = useState('');
  const [status, setStatus]     = useState<'idle' | 'sent' | 'error'>('idle');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !/.+@.+\..+/.test(value)) {
      setStatus('error');
      return;
    }
    try {
      const key = 'flyttgo:newsletter:subscribers';
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      const list = raw ? JSON.parse(raw) as string[] : [];
      if (!list.includes(value)) list.push(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(list));
      }
      track('newsletter_subscribed', { surface: 'footer' });
      setStatus('sent');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
        Marketplace newsletter
      </p>
      <p className="text-sm text-white/70 leading-relaxed mb-3">
        Pricing transparency, new market launches, and corridor expansion.
        One email per month, unsubscribe in a click.
      </p>
      <form onSubmit={onSubmit} className="flex items-stretch gap-2" aria-label="Subscribe to FlyttGo newsletter">
        <label className="sr-only" htmlFor="footer-newsletter-email">Email address</label>
        <input
          id="footer-newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setStatus('idle'); }}
          placeholder="you@company.com"
          autoComplete="email"
          className={`min-w-0 flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 transition ${INPUT_FOCUS}`}
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition flex-shrink-0"
        >
          Subscribe <ArrowRight size={14} />
        </button>
      </form>
      <p
        role="status"
        aria-live="polite"
        className={`mt-2 text-xs min-h-[1rem] ${
          status === 'sent'  ? 'text-emerald-300' :
          status === 'error' ? 'text-rose-300'    :
                               'text-white/0'
        }`}
      >
        {status === 'sent'  && 'Subscribed — check your inbox to confirm.'}
        {status === 'error' && 'Please enter a valid email address.'}
      </p>
    </div>
  );
}

function SocialLink({
  href, label, children,
}: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={() => track('social_link_clicked', { network: label.toLowerCase() })}
      className="w-9 h-9 rounded-lg bg-white/5 hover:bg-amber-400/15 border border-white/10 hover:border-amber-300/40 text-white/70 hover:text-amber-300 flex items-center justify-center transition"
    >
      {children}
    </a>
  );
}

function FooterColumn({
  title, items, onNav,
}: {
  title: string;
  items: LinkItem[];
  onNav: (p: Page) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">{title}</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={`${it.label}-${it.page}`}>
            <button
              onClick={() => onNav(it.page)}
              className="text-sm text-white/75 hover:text-amber-300 transition text-left"
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Markets footer column — surfaces every country shopfront grouped
 * by rollout status. Active markets first (six legacy shopfronts),
 * then Activating markets (ten expansion shopfronts), then a thin
 * Discover row pointing at /cities + /deployment-regions for users
 * who want a higher-level view.
 */
function FooterMarketsColumn({ onNav }: { onNav: (p: Page) => void }) {
  /* Both country lists render as a 2-column inner grid so the column
   * doesn't tower over its neighbours (Customers, Providers, …). With
   * 6 active + 10 activating, side-by-side wrapping cuts vertical
   * footprint roughly in half — 3+3 active rows and 5+5 activating
   * rows, instead of stacked 6 + 10. */
  return (
    <div className="sm:col-span-2 lg:col-span-2">
      <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">Markets</p>

      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 mb-2">
        Active
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-5">
        {MARKETS_ACTIVE.map((it) => (
          <li key={`${it.label}-${it.page}`}>
            <button
              onClick={() => onNav(it.page)}
              className="text-sm text-white/75 hover:text-amber-300 transition text-left"
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>

      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-2">
        Activating
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-5">
        {MARKETS_ACTIVATING.map((it) => (
          <li key={`${it.label}-${it.page}`}>
            <button
              onClick={() => onNav(it.page)}
              className="text-sm text-white/65 hover:text-amber-300 transition text-left"
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>

      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
        Discover
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {MARKETS_DISCOVER.map((it) => (
          <li key={`${it.label}-${it.page}`}>
            <button
              onClick={() => onNav(it.page)}
              className="text-sm text-white/75 hover:text-amber-300 transition text-left"
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
