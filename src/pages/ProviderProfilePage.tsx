import { useEffect, useState } from 'react';
import {
  Star, ShieldCheck, Award, Truck, MapPin, Calendar, ArrowLeft,
  CheckCircle2, Building2, Clock,
} from 'lucide-react';
import { useApp } from '../lib/store';
import type { Page } from '../lib/store';
import { findProvider, PROVIDERS, type ProviderRecord } from '../lib/providers-catalogue';
import { getProviderPublicIdentity } from '../lib/provider-identity';
import { Section, Eyebrow, Pill, EmptyState } from '../components/ds';
import AddToCompareButton from '../components/global/AddToCompareButton';
import AvailabilityBadge from '../components/global/AvailabilityBadge';
import { recordRecentlyViewed } from '../lib/recently-viewed-store';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <ProviderProfilePage> — /provider?slug=...
 *
 * Reads the slug from the URL query, looks up the curated catalogue,
 * and renders a deep profile: hero with rating + verification chips,
 * about + coverage stats, services + fleet, sample jobs, review
 * list, plus a sidebar with the operator licence references and a
 * "Book this provider" CTA.
 *
 * Accepts that the catalogue is curated for now — once the shared
 * Supabase has a `providers` view ready, swap findProvider() for a
 * `useQuery(['provider', slug], ...)` and most of this page survives
 * the migration unchanged.
 * ───────────────────────────────────────────────────────────────── */

export default function ProviderProfilePage() {
  const { setPage, setBookingData } = useApp();
  const [slug, setSlug] = useState<string | null>(null);

  /* Read slug from the URL on every navigation. The Page-enum router
   * doesn't expose params; we pull it out of window.location. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = new URLSearchParams(window.location.search).get('slug');
    setSlug(next);
    if (next) track('provider_profile_viewed', { slug: next });
  }, []);

  const provider = slug ? findProvider(slug) : undefined;

  /* Record this view in the recently-viewed store so the home rail
   * can surface it next time the customer visits. Runs after we
   * confirm the provider exists, to avoid persisting bad slugs. */
  useEffect(() => {
    if (!provider) return;
    /* Recently-viewed rail also uses the white-label identity so
     * the masking is consistent everywhere a customer sees the
     * provider before booking. */
    const id = getProviderPublicIdentity(provider);
    recordRecentlyViewed({
      slug:      provider.slug,
      name:      id.displayName,
      city:      id.region,
      flag:      provider.flag,
      rating:    provider.rating,
      reviews:   provider.reviews,
      fromPrice: provider.fromPrice,
      badge:     id.tierLabel,
    });
  }, [provider]);

  if (!provider) {
    return (
      <Section tone="canvas" size="lg" containerSize="narrow">
        <EmptyState
          icon={Building2}
          title="Provider not found"
          body={
            <span>
              We couldn't find a provider with that slug. They may have
              left the marketplace, or you may have followed an old link.
            </span>
          }
          primaryAction={{ label: 'Browse top providers', onClick: () => setPage('home') }}
          secondaryAction={{ label: 'See compliance frame', onClick: () => setPage('compliance') }}
        />

        <div className="mt-12">
          <Eyebrow>Try one of these</Eyebrow>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {PROVIDERS.slice(0, 6).map(p => (
              <ProviderTile key={p.slug} provider={p} />
            ))}
          </div>
        </div>
      </Section>
    );
  }

  function bookProvider() {
    if (!provider) return;
    track('provider_profile_book_clicked', { slug: provider.slug });
    setBookingData({
      country: provider.country,
      step: 1,
    });
    setPage('booking' as Page);
  }

  /* Public identity — the FlyttGo white-label display layer.
   * Real provider name is hidden until booking confirmation. */
  const identity = getProviderPublicIdentity(provider);

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="lg">
        <button
          onClick={() => setPage('home' as Page)}
          className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-sm font-semibold mb-6"
        >
          <ArrowLeft size={14} /> Back to providers
        </button>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <span className="text-3xl leading-none" aria-hidden>{provider.flag}</span>
              <Pill tone="brand">
                {provider.country.toUpperCase()} · {identity.region}
              </Pill>
              <Pill tone="trust">
                <Award size={10} /> {identity.tierLabel} tier
              </Pill>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                {identity.operatorId}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-3 text-white">
              {identity.displayName}
            </h1>
            <p className="text-amber-200 text-sm font-semibold mb-5 inline-flex items-center gap-2">
              <ShieldCheck size={14} />
              Operator identity revealed at booking confirmation
            </p>
            <p className="text-lg text-white/75 leading-relaxed max-w-2xl mb-7">
              {provider.about}
            </p>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-white/80 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Star size={14} className="fill-amber-300 text-amber-300" />
                <strong className="text-white">{provider.rating.toFixed(2)}</strong>
                <span className="text-white/70">· {provider.reviews.toLocaleString()} reviews</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} className="text-amber-300" />
                <strong className="text-white">{provider.yearsActive}</strong>
                <span className="text-white/70">years on the marketplace</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-amber-300" />
                <span className="text-white/70">{provider.coverage}</span>
              </span>
            </div>
          </div>

          {/* Side card — book + compare + verifications */}
          <aside className="lg:col-span-4 bg-white rounded-2xl shadow-elevated text-ink-900 overflow-hidden">
            <div className="bg-amber-50 px-5 py-4 border-b border-amber-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-amber-700 font-bold">Booking from</p>
                  <p className="text-3xl font-extrabold text-ink-900 mt-1">{provider.fromPrice}</p>
                </div>
                {provider.availability && (
                  <AvailabilityBadge
                    availability={provider.availability}
                    slotsLeft={provider.slotsLeft}
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Indicative · final price computed in the booking flow.</p>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={bookProvider}
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 bg-brand-500 hover:bg-brand-600 text-ink-900 rounded-xl font-bold transition-base ease-marketplace shadow-soft"
              >
                <Truck size={16} /> Book this provider
              </button>
              <AddToCompareButton
                item={{
                  id:        provider.slug,
                  name:      identity.displayName,
                  city:      identity.region,
                  flag:      provider.flag,
                  rating:    provider.rating,
                  reviews:   provider.reviews,
                  fromPrice: provider.fromPrice,
                  badge:     identity.tierLabel,
                  verified:  provider.verified,
                }}
                className="w-full justify-center py-2.5"
              />

              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Verifications</p>
                <ul className="grid grid-cols-1 gap-1.5">
                  {provider.verified.map(v => (
                    <li key={v} className="inline-flex items-center gap-1.5 text-xs text-trust-600 font-bold">
                      <ShieldCheck size={12} /> {v}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Operator licences</p>
                <dl className="space-y-1.5 text-xs">
                  {provider.licences.map(l => (
                    <div key={l.label} className="flex items-baseline justify-between gap-2">
                      <dt className="text-slate-500">{l.label}</dt>
                      <dd className="font-mono text-ink-900 text-right">{l.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </aside>
        </div>
      </Section>

      {/* SERVICES + FLEET */}
      <Section tone="canvas" containerSize="default">
        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            <Eyebrow>What they do</Eyebrow>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-5">Services</h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {provider.services.map(s => (
                <li key={s} className="inline-flex items-center gap-2 px-3 py-2 bg-surface-soft border border-slate-200 rounded-xl text-sm">
                  <CheckCircle2 size={14} className="text-trust-600 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow>What they drive</Eyebrow>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-5">Fleet</h2>
            <ul className="grid gap-2">
              {provider.fleet.map(f => (
                <li key={f} className="inline-flex items-center gap-2 px-3 py-2 bg-surface-soft border border-slate-200 rounded-xl text-sm">
                  <Truck size={14} className="text-brand-600 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* SAMPLE JOBS */}
      <Section tone="soft">
        <Eyebrow>Recently completed</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-6">Sample jobs</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {provider.sampleJobs.map((j, idx) => (
            <article key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {j.date}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <strong className="text-ink-900">{j.rating.toFixed(1)}</strong>
                </span>
              </div>
              <p className="text-sm font-bold text-ink-900">{j.route}</p>
              <p className="text-xs text-slate-500 mt-1">{j.van}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* REVIEWS */}
      <Section tone="canvas">
        <Eyebrow>What customers say</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-6">
          Reviews · {provider.rating.toFixed(2)} from {provider.reviews.toLocaleString()}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {provider.reviewsList.map((r, idx) => (
            <article key={idx} className="bg-surface-soft border border-slate-200 rounded-2xl p-5">
              <div className="flex gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < Math.floor(r.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">"{r.text}"</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <strong className="text-ink-900">{r.name}</strong>
                <span>{r.date}</span>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* RELATED PROVIDERS */}
      <Section tone="soft">
        <Eyebrow>Compare nearby</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-6">Other top-rated providers</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROVIDERS.filter(p => p.slug !== provider.slug).slice(0, 3).map(p => (
            <ProviderTile key={p.slug} provider={p} />
          ))}
        </div>
      </Section>
    </main>
  );
}

function ProviderTile({ provider }: { provider: ProviderRecord }) {
  const { setPage } = useApp();
  function go() {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/provider?slug=${provider.slug}`);
    }
    setPage('provider-profile');
    /* Force a re-mount so the slug effect re-runs. */
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }
  /* Sibling-provider card also masks identity. */
  const id = getProviderPublicIdentity(provider);
  return (
    <button
      onClick={go}
      className="text-left bg-white border border-slate-200 hover:border-brand-400/60 hover:shadow-medium rounded-2xl p-4 transition-base ease-marketplace"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl leading-none" aria-hidden>{provider.flag}</span>
        <span className="font-extrabold text-ink-900 truncate">{id.displayName}</span>
      </div>
      <p className="text-xs text-slate-500 mb-2">{id.region}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          <strong>{provider.rating.toFixed(2)}</strong>
        </span>
        <span className="font-bold text-brand-700">{provider.fromPrice}</span>
      </div>
    </button>
  );
}
