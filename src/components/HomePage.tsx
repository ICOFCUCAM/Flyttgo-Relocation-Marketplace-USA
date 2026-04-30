import { Star, ShieldCheck, Truck, Clock, BadgeCheck, MapPin, Users, MessageCircle } from 'lucide-react';
import { useApp } from '../lib/store';
import type { Page, BookingCountry } from '../lib/store';
import { AnimatedNumber } from './ds';
import { track } from '../lib/analytics';
import PressStrip from './global/PressStrip';
import CarbonOffset from './global/CarbonOffset';
import TopProviders from './global/TopProviders';
import DiscoveryProvidersSection from './global/DiscoveryProvidersSection';
import PopularCorridorsSection from './global/PopularCorridorsSection';
import LiveBookingTicker from './global/LiveBookingTicker';
import EarningsSimulator from './global/EarningsSimulator';
import ReviewsCarousel from './global/ReviewsCarousel';
import HomeFAQ from './global/HomeFAQ';

/* ────────────────────────────────────────────────────────────
 *  COUNTRY SHOPFRONT METADATA
 *
 *  Each country tile shows a real cityscape photo, a flag, a
 *  starting-from price, an average rating, and a coordinated-moves
 *  count. These mimic the visual conventions of Airbnb / Booking
 *  / Vrbo so the page reads as a place to buy, not a tech doc.
 * ────────────────────────────────────────────────────────────── */

interface CountryShopfront {
  iso: BookingCountry;
  flag: string;
  name: string;
  city: string;
  fromPrice: string;
  rating: string;
  reviews: string;
  /** Unsplash CDN photo id. Stable, free for commercial use. */
  photo: string;
  badge?: string;
}

const SHOPFRONTS: CountryShopfront[] = [
  {
    iso: 'us',  flag: '🇺🇸', name: 'United States', city: 'NYC · LA · Austin · Atlanta',
    fromPrice: 'from $480',  rating: '4.9', reviews: '12,400 moves',
    photo: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=70',
    badge: 'Most popular',
  },
  {
    iso: 'ca',  flag: '🇨🇦', name: 'Canada',        city: 'Toronto · Montréal · Vancouver',
    fromPrice: 'from C$520', rating: '4.8', reviews: '3,100 moves',
    photo: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=70',
  },
  {
    iso: 'de',  flag: '🇩🇪', name: 'Germany',       city: 'Berlin · München · Hamburg',
    fromPrice: 'ab 420 €',   rating: '4.8', reviews: '2,700 Umzüge',
    photo: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=70',
  },
  {
    iso: 'fr',  flag: '🇫🇷', name: 'France',        city: 'Paris · Lyon · Marseille',
    fromPrice: 'à partir de 460 €', rating: '4.7', reviews: '2,400 déménagements',
    photo: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=70',
  },
  {
    iso: 'gb',  flag: '🇬🇧', name: 'United Kingdom', city: 'London · Manchester · Edinburgh',
    fromPrice: 'from £380',  rating: '4.8', reviews: '4,800 moves',
    photo: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&w=1200&q=70',
  },
  {
    iso: 'no',  flag: '🇳🇴', name: 'Norway',        city: 'Oslo · Bergen · Trondheim',
    fromPrice: 'fra 4 200 kr', rating: '4.9', reviews: '1,900 flyttinger',
    photo: 'https://images.unsplash.com/photo-1513415564515-763d91423bdd?auto=format&fit=crop&w=1200&q=70',
    badge: 'Home market',
  },
];

/* ────────────────────────────────────────────────────────────
 *  HOMEPAGE
 * ────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const { setPage } = useApp();
  const go = (p: Page) => setPage(p);

  return (
    <main className="bg-white text-slate-900">
      {/* ─── HERO ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background photo with warm overlay + a soft amber/violet
         *  gradient orb. The orb is purely decorative — sits behind
         *  the headline, blurred to the point of being a glow rather
         *  than a shape, and signals "next-gen" without competing
         *  with the photo. Pointer-events disabled so it never
         *  intercepts a click on the country picker. */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1920&q=70"
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f3a]/95 via-[#0b1f3a]/85 to-[#0b1f3a]/70" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-amber-400/30 via-fuchsia-500/15 to-transparent blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-24 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-sky-400/20 via-emerald-400/10 to-transparent blur-3xl"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <Star size={12} className="fill-amber-400 text-amber-400" />
              </span>
              <span>
                4.8 average ·{' '}
                <AnimatedNumber value={27000} format={(n: number) => `${Math.round(n).toLocaleString()}+`} />
                {' '}moves coordinated · 6 countries
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-5">
              Move anywhere.<br />
              <span className="text-amber-300">Book a licensed mover in 60&nbsp;seconds.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/85 leading-relaxed max-w-2xl mb-6">
              Compare licensed movers, labour crews, packers, storage and rental
              partners in six countries. Transparent prices, escrow protection
              on every booking, real reviews from real customers.
            </p>

            {/* Enterprise + university CTAs — activates the institutional
             *  revenue channel directly from the hero. */}
            <div className="flex flex-wrap gap-3 mb-8">
              <button
                onClick={() => { track('home_enterprise_cta_clicked'); go('enterprise-relocation'); }}
                className="bg-white text-slate-900 px-5 py-3 rounded-xl font-bold hover:bg-slate-100 transition"
              >
                Enterprise relocation →
              </button>
              <button
                onClick={() => { track('home_universities_cta_clicked'); go('universities'); }}
                className="bg-white/10 border border-white/20 text-white px-5 py-3 rounded-xl font-bold hover:bg-white/20 transition"
              >
                Student moves →
              </button>
            </div>
          </div>

          {/* Formal country picker — primary entry per Section 2 of
           *  the marketplace spec. Six large-flag chips routing into
           *  each country's localised marketplace. Hover glow + fast
           *  click targets (py-4 = 64-px touch surface) so the country
           *  decision is friction-free on mobile. */}
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-w-4xl mb-4">
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <div>
                <p className="text-base font-bold text-slate-900">Pick the country you’re moving in</p>
                <p className="text-xs text-slate-500 mt-0.5">Each country opens its own booking portal.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                Insured up to $50,000
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SHOPFRONTS.map(s => (
                <button
                  key={s.iso}
                  onClick={() => { track('country_tile_clicked', { country: s.iso, surface: 'home-hero' }); go(`market-${s.iso}` as Page); }}
                  className="group flex flex-col items-center justify-center gap-2 py-4 rounded-xl border border-transparent hover:border-amber-300 hover:bg-amber-50 hover:shadow-[0_8px_24px_-8px_rgba(245,158,11,0.55)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label={`Go to ${s.name} marketplace`}
                >
                  <span className="text-4xl sm:text-5xl leading-none transition-transform group-hover:scale-110">{s.flag}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-700 group-hover:text-amber-700 uppercase tracking-wide">
                    {s.iso.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick-booking entry removed — the formal country picker
           *  above is the primary conversion path; the per-country
           *  shopfronts host the full address widget with autocomplete
           *  + OSRM distance preview. */}

          {/* Trust strip */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl">
            {[
              { icon: BadgeCheck, label: 'Verified licensed movers' },
              { icon: ShieldCheck, label: 'Escrow on every booking' },
              { icon: Truck,       label: 'Live driver tracking' },
              { icon: MessageCircle, label: '24/7 support' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-white/85 text-xs sm:text-sm">
                <Icon size={18} className="text-amber-300 flex-shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Live marketplace activity ticker — surfaces "someone in
           *  Austin booked 3 minutes ago" social proof under the trust
           *  strip. The component self-suppresses on touch devices and
           *  in low-traffic windows. */}
          <div className="mt-6 max-w-3xl">
            <LiveBookingTicker />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
       *   The homepage now follows the marketplace-narrative spec:
       *
       *     1  Hero (with country selector chip grid above)
       *     2  Categories — "What you can book"
       *     3  Popular corridors — flagship per country, links to
       *        /corridor/<country>/<slug> SEO landing pages
       *     4  Top verified providers — onboarded, instant-bookable
       *     5  Discovery providers — non-onboarded acquisition
       *        signals with claim-listing CTAs
       *     6  Country marketplace cards — photo-grid exploration
       *        of the six country storefronts
       *     7  Press / trust strip
       *     8  Reviews carousel (standalone)
       *     9  Carbon offset
       *    10  Earnings simulator
       *    11  FAQ (standalone)
       *    12+ Trust stats · Provider CTA · Final CTA
       *
       *   Featured-providers tier (between Top + Discovery in the
       *   spec) is held back as a future expansion — the curated
       *   PROVIDERS catalogue is small enough that splitting it
       *   into Top vs Featured today creates artificial scarcity.
       *   The DiscoveryProvidersSection's "claim & onboard" CTAs
       *   already serve the supply-acquisition role the Featured
       *   tier was meant to occupy.
       * ───────────────────────────────────────────────────────── */}

      {/* ─── 2 · CATEGORIES ─ "What you can book" ───────────── */}
      <section className="bg-[#fafaf7] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-[0.18em] mb-3">What you can book</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Every kind of move, one marketplace.
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { slug: 'local',         title: 'Local moves',           sub: 'Same-city',                   photo: 'https://images.unsplash.com/photo-1568010967-7c3a4e0a59f7?auto=format&fit=crop&w=600&q=70' },
              { slug: 'long-distance', title: 'Long-distance moves',   sub: 'Inter-state / Cross-country', photo: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=70' },
              { slug: 'international', title: 'International moves',   sub: 'Cross-border',                photo: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=70' },
              { slug: 'office',        title: 'Office relocation',     sub: 'For businesses',              photo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=70' },
              { slug: 'packing',       title: 'Packing services',      sub: 'Full / Partial',              photo: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=70' },
              { slug: 'storage',       title: 'Storage solutions',     sub: 'Self & bonded',               photo: 'https://images.unsplash.com/photo-1591375372226-9aa92be1d6f4?auto=format&fit=crop&w=600&q=70' },
              { slug: 'truck-rental',  title: 'Truck rental',          sub: 'DIY-friendly',                photo: 'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=600&q=70' },
              { slug: 'student',       title: 'Student moves',         sub: 'University corridors',        photo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=70' },
            ] as const).map(c => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  track('home_category_clicked', { category: c.title, slug: c.slug });
                  if (typeof window !== 'undefined') {
                    window.history.pushState({}, '', `/services/${c.slug}`);
                  }
                  go('service-category');
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="relative h-48 rounded-2xl overflow-hidden group cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                <img src={c.photo} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{c.sub}</p>
                  <h3 className="text-lg font-extrabold leading-tight">{c.title}</h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3 · POPULAR CORRIDORS ─────────────────────────── */}
      <PopularCorridorsSection />

      {/* ─── 4 · TOP VERIFIED PROVIDERS ────────────────────── */}
      <div className="bg-white pt-12 pb-0 text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-fuchsia-50 border border-amber-200 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
          </span>
          AI-routed dispatch · Live OSRM pricing
        </span>
      </div>
      <TopProviders />

      {/* ─── 5 · DISCOVERY PROVIDERS (exploration tier) ─────
       *   Non-onboarded movers surfaced as acquisition signals.
       *   Every card carries the "Not yet onboarded" badge and a
       *   provider-funnel CTA — never a booking action. */}
      <DiscoveryProvidersSection />

      {/* ─── 6 · COUNTRY MARKETPLACE CARDS ──────────────────
       *   Photo-grid country shopfronts. Tile click routes into
       *   the localised /market-<iso> shopfront. */}
      <section className="bg-[#fafaf7] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div>
              <p className="text-amber-600 text-xs font-bold uppercase tracking-[0.18em] mb-2">
                Country marketplaces
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
                Where are you moving?
              </h2>
              <p className="mt-3 text-slate-600 text-base sm:text-lg max-w-2xl">
                Every country opens its own marketplace with licensed local providers,
                country-scoped address search, and the local language.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SHOPFRONTS.map(s => (
              <button
                key={s.iso}
                onClick={() => { track('country_tile_clicked', { country: s.iso, surface: 'home' }); go(`market-${s.iso}` as Page); }}
                className="group relative text-left bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-amber-300 hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={s.photo}
                    alt={`${s.name} cityscape`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-2xl leading-none">{s.flag}</span>
                    {s.badge && (
                      <span className="bg-amber-400 text-slate-900 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <p className="text-xs font-bold text-amber-300">
                      Instant price available
                    </p>
                    <p className="text-xs font-medium uppercase tracking-wider opacity-90">
                      {s.iso.toUpperCase()} marketplace
                    </p>
                    <h3 className="text-2xl font-extrabold leading-tight">
                      {s.name}
                    </h3>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate">{s.city}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star size={16} className="fill-amber-400 text-amber-400" />
                      <span className="font-bold text-slate-900">{s.rating}</span>
                      <span className="text-sm text-slate-500">· {s.reviews}</span>
                    </div>
                    <span className="text-sm font-extrabold text-amber-700">{s.fromPrice}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-slate-900 group-hover:text-amber-700">
                    Open the {s.name} shopfront
                    <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7 · PRESS / TRUST STRIP ───────────────────────── */}
      <PressStrip />

      {/* ─── 8 · REVIEWS CAROUSEL (standalone) ─────────────── */}
      <ReviewsCarousel />

      {/* ─── 9 · CARBON OFFSET ─────────────────────────────── */}
      <CarbonOffset />

      {/* ─── 10 · EARNINGS SIMULATOR ────────────────────────
       *   Supply-side acquisition lever sits below the social-proof
       *   block so customers see income transparency right before
       *   the FAQ closing. Same component the /providers page mounts. */}
      <EarningsSimulator />

      {/* ─── 11 · FAQ (standalone) ──────────────────────────
       *   Last informational block before the closing trust /
       *   provider / final-CTA stack. */}
      <HomeFAQ />

      {/* ─── POSITION 11 ─ TRUST STATS STRIP ────────────────
       *   Live KPI bar showing marketplace strength with a pulsing
       *   "Live marketplace" indicator. */}
      <section className="bg-ink-900 text-white py-12 sm:py-14 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              Live marketplace
            </span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Truck,       n: 27000, format: (n: number) => `${Math.round(n).toLocaleString()}+`, label: 'Moves coordinated' },
              { icon: Users,       n: 5400,  format: (n: number) => `${Math.round(n).toLocaleString()}+`, label: 'Verified licensed providers' },
              { icon: ShieldCheck, n: 50,    format: (n: number) => `$${Math.round(n)}k`,                  label: 'Insurance per booking' },
              { icon: Clock,       n: 60,    format: (n: number) => `< ${Math.round(n)}s`,                 label: 'Average quote time' },
            ].map(({ icon: Icon, n, format, label }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-400/20 text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold tabular-nums">
                    <AnimatedNumber value={n} format={format} />
                  </p>
                  <p className="text-sm text-white/70">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── POSITION 12 ─ PROVIDER ONBOARDING CTA ──────────
       *   Supply-side acquisition surface with subscription tiers. */}
      <section className="bg-[#0b1f3a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                For movers · packers · storage operators
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4">
                Drive for FlyttGo. Keep up to <span className="text-amber-300">90%</span> of every job.
              </h2>
              <p className="text-base lg:text-lg text-white/75 leading-relaxed max-w-2xl mb-6">
                Pick a subscription tier — Silver, Silver Plus, Gold, Gold Pro,
                or Elite — and unlock lower commission, higher dispatch
                priority, and corporate job access in the country you operate
                in. Approval typically takes 24–48 hours after document upload.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => go('driver-onboarding')}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl shadow-lg shadow-amber-500/25 transition"
                >
                  Apply as a provider
                </button>
                <button
                  onClick={() => go('subscriptions')}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition"
                >
                  See subscription tiers →
                </button>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { tier: 'Silver',      commission: '30%', perk: 'Free · standard queue' },
                  { tier: 'Silver Plus', commission: '25%', perk: '£29/day · moderate priority' },
                  { tier: 'Gold',        commission: '20%', perk: '£49/day · high priority', popular: true },
                  { tier: 'Gold Pro',    commission: '15%', perk: '£79/mo · very high' },
                  { tier: 'Elite',       commission: '10%', perk: '£129/mo · first access' },
                ].map(t => (
                  <div
                    key={t.tier}
                    className={`rounded-xl p-4 border transition ${
                      t.popular
                        ? 'bg-amber-400/15 border-amber-400/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">{t.tier}</p>
                    <p className="text-2xl font-extrabold text-white mt-1">{t.commission}</p>
                    <p className="text-[11px] text-white/60 mt-0.5 leading-snug">{t.perk}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────── */}
      <section className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Ready to move? Pick your country.
          </h2>
          <p className="text-slate-800 max-w-2xl mx-auto leading-relaxed mb-8">
            Six countries. Licensed local providers. The local language. One marketplace.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {SHOPFRONTS.map(s => (
              <button
                key={s.iso}
                onClick={() => { track('country_tile_clicked', { country: s.iso, surface: 'home' }); go(`market-${s.iso}` as Page); }}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-900 hover:text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg transition"
              >
                <span aria-hidden>{s.flag}</span>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
