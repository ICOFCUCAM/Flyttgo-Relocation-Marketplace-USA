import React, { useEffect } from 'react';
import {
  DollarSign, Truck, Package, Building2, Users, Route, ArrowRight,
  CheckCircle2, ArrowDown, Lightbulb, type LucideIcon,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Section, Eyebrow, Pill } from '../components/ds';
import {
  US_PRICING_TIERS, formatPricingRange, MARKETPLACE_COMMISSION,
  STRATEGIC_POSITIONING, type PricingTier,
} from '../lib/us-pricing';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <PricingPage> — /pricing
 *
 * US relocation pricing transparency landing. Surfaces the canonical
 * rate tables from lib/us-pricing.ts in customer-facing copy, with
 * a side-by-side "national average vs FlyttGo" comparison per tier,
 * the marketplace commission posture, and a strategic-positioning
 * panel explaining why FlyttGo leads with labor-only + coordination.
 *
 * SEO target: long-tail intent like "moving company hourly rates",
 * "labor only movers cost", "interstate movers pricing".
 * ───────────────────────────────────────────────────────────────── */

const TIER_ICONS: Record<string, LucideIcon> = {
  'labor-only':    Users,
  'local':         Truck,
  'premium-metro': Building2,
  'packing':       Package,
  'long-distance': Route,
  'corporate':     Building2,
};

export default function PricingPage() {
  const { setPage } = useApp();

  useEffect(() => {
    track('pricing_page_viewed');
  }, []);

  const hourlyTiers   = US_PRICING_TIERS.filter(t => t.isHourly);
  const flatRateTiers = US_PRICING_TIERS.filter(t => !t.isHourly);

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-3"><DollarSign size={12} /> Pricing transparency · United States</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Real US rates, no surprises.
        </h1>
        <p className="text-white/75 max-w-2xl text-lg leading-relaxed">
          National averages from BLS, MoveBuddha, HireAHelper, and MovingHelp,
          shown next to what FlyttGo's marketplace actually charges. Every
          tier has the same answer to the same question: what's included,
          what drives the price, and how the platform takes its cut.
        </p>
      </Section>

      {/* TIER ANCHOR NAV */}
      <Section tone="soft" size="sm">
        <Eyebrow tone="brand" className="mb-2">Jump to</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {US_PRICING_TIERS.map(t => {
            const Icon = TIER_ICONS[t.slug] ?? DollarSign;
            return (
              <a
                key={t.slug}
                href={`#tier-${t.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-400/60 rounded-full text-xs font-bold text-slate-700 hover:text-brand-700 transition"
              >
                <Icon size={12} />
                {t.name}
              </a>
            );
          })}
        </div>
      </Section>

      {/* HOURLY TIERS */}
      <Section tone="canvas" size="default">
        <Eyebrow tone="brand" className="mb-1">Hourly billing</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-2">Labor-only · local · premium · packing · corporate</h2>
        <p className="text-slate-600 max-w-2xl mb-8">
          The four hourly tiers cover ~85% of FlyttGo bookings in the US.
          Rates are per-hour with a two-hour minimum on every booking.
        </p>
        <div className="space-y-6">
          {hourlyTiers.map(t => <TierCard key={t.slug} tier={t} />)}
        </div>
      </Section>

      {/* FLAT-RATE / PER-MOVE TIERS */}
      <Section tone="soft" size="default">
        <Eyebrow tone="brand" className="mb-1">Per-move billing</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-2">Long-distance + interstate</h2>
        <p className="text-slate-600 max-w-2xl mb-8">
          Interstate moves don't price by the hour — they price by distance,
          volume, weight, and scope. Quotes here are binding once accepted.
        </p>
        <div className="space-y-6">
          {flatRateTiers.map(t => <TierCard key={t.slug} tier={t} />)}
        </div>
      </Section>

      {/* COMMISSION */}
      <Section tone="canvas" size="default">
        <Eyebrow tone="brand" className="mb-1">How the marketplace earns</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-4">
          {Math.round(MARKETPLACE_COMMISSION.band.min * 100)}–{Math.round(MARKETPLACE_COMMISSION.band.max * 100)}% commission · transparent
        </h2>
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-surface-soft border border-slate-200 rounded-2xl p-6">
            <p className="text-slate-700 leading-relaxed mb-4">
              FlyttGo charges providers a commission on each completed booking.
              The exact percentage depends on the provider's subscription tier
              (Silver 30% → Elite 10%) — higher tiers carry a flat monthly fee
              in exchange for a lower per-booking commission and faster
              dispatch priority.
            </p>
            <p className="text-slate-700 leading-relaxed">
              Customer-side, this is invisible: you see the all-in rate before
              you confirm, and there are no hidden marketplace fees added to
              the provider's quote. Commission is deducted from the provider's
              earnings after the booking completes.
            </p>
            <button
              onClick={() => setPage('subscriptions')}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:text-brand-600"
            >
              Provider subscription tiers <ArrowRight size={14} />
            </button>
          </div>
          <div className="lg:col-span-5 bg-brand-50 border border-brand-400/40 rounded-2xl p-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 mb-3">
              Commission worked example
            </p>
            <div className="space-y-3">
              <RowKV
                label="Customer pays the provider"
                value={`$${MARKETPLACE_COMMISSION.example.customerPays}/hr`}
              />
              <RowKV
                label="Marketplace commission band"
                value={`$${MARKETPLACE_COMMISSION.example.marketplaceKeeps.min}–$${MARKETPLACE_COMMISSION.example.marketplaceKeeps.max}/hr`}
              />
              <RowKV
                label="Provider receives"
                value={`$${MARKETPLACE_COMMISSION.example.customerPays - MARKETPLACE_COMMISSION.example.marketplaceKeeps.max}–$${MARKETPLACE_COMMISSION.example.customerPays - MARKETPLACE_COMMISSION.example.marketplaceKeeps.min}/hr`}
                highlight
              />
            </div>
            <p className="mt-4 text-[11px] text-slate-600 leading-relaxed">
              Commission compounds with subscription discounts.
              An Elite-tier provider keeps ~90% of every booking value;
              Silver-tier keeps 70%.
            </p>
          </div>
        </div>
      </Section>

      {/* STRATEGIC POSITIONING */}
      <Section tone="ink" size="default">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <Pill tone="brand" className="mb-3"><Lightbulb size={12} /> Strategic insight</Pill>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {STRATEGIC_POSITIONING.headline}
            </h2>
          </div>
          <div className="lg:col-span-7">
            <ul className="space-y-3">
              {STRATEGIC_POSITIONING.rationale.map((line, i) => (
                <li key={i} className="flex items-start gap-3 text-white/85 leading-relaxed">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 text-xs font-extrabold mt-0.5">
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* CTAs */}
      <Section tone="soft" size="default" containerSize="narrow">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-ink-900 mb-3">
            See what your move actually costs.
          </h2>
          <p className="text-slate-600 mb-6">
            The booking widget runs the same numbers against your real
            distance, crew size, and date — no commitment until you confirm.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setPage('booking')}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-ink-900 font-bold rounded-xl transition shadow-medium"
            >
              Get an instant quote
            </button>
            <button
              onClick={() => setPage('providers-directory')}
              className="px-6 py-3 bg-white border border-slate-200 text-ink-900 font-bold rounded-xl hover:border-ink-900 transition"
            >
              Browse providers
            </button>
          </div>
        </div>
      </Section>
    </main>
  );
}

function TierCard({ tier }: { tier: PricingTier }) {
  const Icon = TIER_ICONS[tier.slug] ?? DollarSign;
  return (
    <article
      id={`tier-${tier.slug}`}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden scroll-mt-24"
    >
      <header className="bg-surface-soft px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="font-extrabold text-ink-900 text-lg">{tier.name}</h3>
            <p className="text-xs text-slate-500">{tier.tagline}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">FlyttGo</p>
          <p className="text-xl font-extrabold text-ink-900">
            {formatPricingRange(tier.flyttgoRange)}
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-px bg-slate-100">
        <div className="bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            What's included
          </p>
          <ul className="space-y-1.5">
            {tier.includes.map(s => (
              <li key={s} className="text-sm text-slate-700 flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            What drives the price
          </p>
          <ul className="space-y-1.5">
            {tier.drivers.map(s => (
              <li key={s} className="text-sm text-slate-700 flex items-start gap-2">
                <ArrowDown size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-baseline justify-between text-xs flex-wrap gap-2">
        <span className="text-slate-500">
          National range: <strong className="text-slate-700">{formatPricingRange(tier.marketRange)}</strong>
        </span>
        {tier.note && (
          <span className="text-slate-500 italic max-w-xl">{tier.note}</span>
        )}
      </div>
    </article>
  );
}

function RowKV({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${highlight ? 'pt-3 border-t border-brand-400/30' : ''}`}>
      <span className="text-xs text-slate-600">{label}</span>
      <span className={`font-extrabold ${highlight ? 'text-brand-700 text-lg' : 'text-ink-900'}`}>
        {value}
      </span>
    </div>
  );
}
