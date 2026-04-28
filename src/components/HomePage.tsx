import React from 'react';
import { Star, ShieldCheck, Truck, Clock, BadgeCheck, MapPin, Users, MessageCircle } from 'lucide-react';
import { useApp } from '../lib/store';
import type { Page, BookingCountry } from '../lib/store';
import { AnimatedNumber } from './ds';
import { track } from '../lib/analytics';
import LiveBookingTicker from './global/LiveBookingTicker';
import PressStrip from './global/PressStrip';
import DeploymentReadinessStrip from './global/DeploymentReadinessStrip';
import WorldDeploymentMap from './global/WorldDeploymentMap';
import PlatformOrbitDiagram from './global/PlatformOrbitDiagram';
import WhyFlyttGo from './global/WhyFlyttGo';
import HomeFAQ from './global/HomeFAQ';
import SmartMatchingSection from './global/SmartMatchingSection';
import CarbonOffset from './global/CarbonOffset';
import TopProviders from './global/TopProviders';
import RecentlyViewedRail from './global/RecentlyViewedRail';

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
        {/* Background photo with warm overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1920&q=70"
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f3a]/95 via-[#0b1f3a]/85 to-[#0b1f3a]/70" />
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
              <span>4.8 average · 27,000+ moves coordinated · 6 countries</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-5">
              Move anywhere.<br />
              <span className="text-amber-300">Book a licensed mover in 60&nbsp;seconds.</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/85 leading-relaxed max-w-2xl mb-8">
              Compare licensed movers, labour crews, packers, storage and rental
              partners in six countries. Transparent prices, escrow protection
              on every booking, real reviews from real customers.
            </p>
          </div>

          {/* Country picker — primary CTA */}
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Pick the country you’re moving in</p>
                <p className="text-xs text-slate-500">Each country opens its own booking portal in the local language.</p>
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
                  onClick={() => { track('country_tile_clicked', { country: s.iso, surface: 'home' }); go(`market-${s.iso}` as Page); }}
                  className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl hover:bg-amber-50 hover:ring-1 hover:ring-amber-300 transition group"
                  aria-label={`Go to ${s.name} marketplace`}
                >
                  <span className="text-3xl leading-none">{s.flag}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-700 group-hover:text-amber-700 uppercase tracking-wide">
                    {s.iso.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </div>

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
        </div>
      </section>

      {/* ─── COUNTRY SHOPFRONTS ──────────────────────────── */}
      <section className="bg-[#fafaf7] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div>
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

      {/* ─── HOW IT WORKS ──────────────────────────────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Three steps. One stress-free move.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                n: '1',
                title: 'Tell us about your move',
                body: 'Pickup, drop-off, date — country-scoped address search makes it easy.',
                photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=70',
              },
              {
                n: '2',
                title: 'Compare verified providers',
                body: 'Licensed movers, labour crews, packers — with prices, ratings, and real reviews.',
                photo: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=70',
              },
              {
                n: '3',
                title: 'Book in 60 seconds',
                body: 'Pay under escrow, track your move live, and rate the team after delivery.',
                photo: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=70',
              },
            ].map(s => (
              <article key={s.n} className="group">
                <div className="relative h-56 rounded-2xl overflow-hidden mb-5">
                  <img src={s.photo} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center text-xl font-extrabold shadow-lg">
                    {s.n}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-600 leading-relaxed">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SERVICE CATEGORIES ──────────────────────────── */}
      <section className="bg-[#fafaf7] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-3">What you can book</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Every kind of move, one marketplace.
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Local moves',           sub: 'Same-city',         photo: 'https://images.unsplash.com/photo-1568010967-7c3a4e0a59f7?auto=format&fit=crop&w=600&q=70' },
              { title: 'Long-distance moves',   sub: 'Inter-state / Cross-country', photo: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=70' },
              { title: 'International moves',   sub: 'Cross-border',      photo: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=70' },
              { title: 'Office relocation',     sub: 'For businesses',    photo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=70' },
              { title: 'Packing services',      sub: 'Full / Partial',    photo: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=70' },
              { title: 'Storage solutions',     sub: 'Self & bonded',     photo: 'https://images.unsplash.com/photo-1591375372226-9aa92be1d6f4?auto=format&fit=crop&w=600&q=70' },
              { title: 'Truck rental',          sub: 'DIY-friendly',      photo: 'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=600&q=70' },
              { title: 'Student moves',         sub: 'University corridors', photo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=70' },
            ].map(c => (
              <div key={c.title} className="relative h-48 rounded-2xl overflow-hidden group cursor-pointer">
                <img src={c.photo} alt="" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{c.sub}</p>
                  <h3 className="text-lg font-extrabold leading-tight">{c.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DEPLOYMENT READINESS STRIP ────────────────────────
          Public-facing institutional credibility — shows operational
          / partner / pilot status per country, sourced from the
          same deployment_regions table the admin Mission Control
          uses, so messaging stays in sync automatically. */}
      <DeploymentReadinessStrip />

      {/* ─── GLOBAL COVERAGE EXPANSION MAP ───────────────────
          SVG-only world map centred on the Oslo HQ with animated
          arcs to every operational region, plus a legend, hover
          tooltips, and a status strip. Reads from the same
          deployment_regions table as the strip above. */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <header className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600 font-bold mb-2">
              Global infrastructure
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
              Operational across two continents · expanding into a third
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              Headquartered in Oslo. Operational marketplace in 6 markets, expanding network in
              7, pilot deployment in 5. Hover any node for the live status.
            </p>
          </header>
          <WorldDeploymentMap />
        </div>
      </section>

      {/* ─── PLATFORM ECOSYSTEM ORBIT ─────────────────────────
          Visual system map of FlyttGoTech Core + the eight modules
          around it. Reads as a platform infrastructure ecosystem
          — what governments, universities, and procurement readers
          recognise instantly. Pure SVG, no external dependency. */}
      <section className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <header className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600 font-bold mb-2">
              Platform architecture
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
              FlyttGoTech Core orchestrates eight interoperable modules
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              Hover any module for its scope and institutional relevance. The outer halo
              shows our deployment compatibility — SaaS, PaaS, IaaS, sovereign-ready.
            </p>
          </header>
          <PlatformOrbitDiagram />
          <p className="mt-8 text-sm sm:text-base text-slate-700 max-w-3xl mx-auto text-center leading-relaxed">
            <span className="font-semibold text-slate-900">FlyttGoTech Core</span> orchestrates
            interoperable mobility infrastructure modules supporting enterprise, university,
            municipal, and national-scale deployment environments.
          </p>
        </div>
      </section>

      {/* ─── PRESS STRIP ───────────────────────────────────── */}
      <PressStrip />

      {/* ─── SMART MATCHING (2030 AI angle) ────────────────── */}
      <SmartMatchingSection />

      {/* ─── WHY FLYTTGO ───────────────────────────────────── */}
      <WhyFlyttGo />

      {/* ─── RECENTLY VIEWED (Wave 25) ───────────────────────
          Renders only if the customer has opened a provider profile
          before — otherwise self-suppresses, so first-time visitors
          don't see an empty rail. */}
      <RecentlyViewedRail />

      {/* ─── TOP-RATED PROVIDERS ───────────────────────────── */}
      <TopProviders />

      {/* ─── CARBON OFFSET ─────────────────────────────────── */}
      <CarbonOffset />

      {/* ─── REVIEWS ──────────────────────────────────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-3">Real customers, real moves</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              4.8 average from 27,000+ moves
            </h2>
            <div className="mt-4 inline-flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5">
              <span className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-emerald-600 text-emerald-600" />)}
              </span>
              <span className="text-sm font-bold text-emerald-700">Trustpilot</span>
              <span className="text-sm text-emerald-700">·</span>
              <span className="text-sm text-emerald-700">4.8 / 5 from 12,800+ reviews</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Emily Johnson',  city: 'Austin → Atlanta',         flag: '🇺🇸', text: 'Booked a licensed long-distance carrier in under five minutes. The price held, escrow released exactly when the team finished unloading.' },
              { name: 'Lukas Müller',   city: 'Berlin → München',         flag: '🇩🇪', text: 'Drei Anbieter im Vergleich, faire Preise, transparente Versicherung. Genau das, was Umzüge in Deutschland gebraucht haben.' },
              { name: 'Sophie Dubois',  city: 'Paris → Lyon',             flag: '🇫🇷', text: 'Devis instantané, déménageurs licenciés, paiement sécurisé. Le déménagement le plus simple que j’ai jamais fait.' },
              { name: 'James Walker',   city: 'London → Manchester',      flag: '🇬🇧', text: 'Used the cash-on-delivery option for our office move. Slick — 30% online, the rest paid in cash to a brilliant GVOL operator.' },
              { name: 'Erik Hansen',    city: 'Oslo → Bergen',            flag: '🇳🇴', text: 'Norsk språk gjennom hele bestillingen. Lisensiert flytteselskap, sporing i sanntid, raskt utbetalt fra escrow.' },
              { name: 'Ava Tremblay',   city: 'Toronto → Montréal',       flag: '🇨🇦', text: 'Bilingual coordination across two provinces, federally compliant carrier, transparent total — no surprises at the dock.' },
              { name: 'Marco Drechsler', city: 'Hamburg → München',       flag: '🇩🇪', text: 'Konzernumzug für 18 Mitarbeiter in einer Buchung. Audit-Trail war Gold wert für unsere Procurement-Abteilung.' },
              { name: 'Olivia Reyes',   city: 'Brooklyn → LA',            flag: '🇺🇸', text: 'Cross-country with a USDOT carrier, full $50k goods-in-transit cover, real-time GPS the whole way. Five stars, no hesitation.' },
              { name: 'Camille Bernard', city: 'Marseille → Bordeaux',    flag: '🇫🇷', text: 'Calcul de prix instantané, déménageur noté 4,9, escrow libéré dès que j’ai confirmé à l’arrivée. Très professionnel.' },
            ].map(r => (
              <article key={r.name} className="bg-[#fafaf7] rounded-2xl p-6 border border-slate-100 hover:shadow-lg hover:border-amber-200 transition">
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} size={16} className="fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-700 leading-relaxed mb-5">“{r.text}”</p>
                <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      {r.name}
                      <span aria-hidden className="text-base leading-none">{r.flag}</span>
                    </p>
                    <p className="text-xs text-slate-500">{r.city}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────── */}
      <HomeFAQ />

      {/* ─── TRUST + STATS ───────────────────────────────── */}
      <section className="bg-ink-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <p className="text-2xl sm:text-3xl font-extrabold">
                    <AnimatedNumber value={n} format={format} />
                  </p>
                  <p className="text-sm text-white/70">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PROVIDERS-SIDE CTA — balance the marketplace ─── */}
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
