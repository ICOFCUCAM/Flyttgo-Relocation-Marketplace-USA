import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Star, Truck, ShieldCheck, MapPin, ArrowLeft, CheckCircle2, Award,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { findServiceCategory, SERVICE_CATEGORIES, type ServiceCategory } from '../lib/service-categories';
import { PROVIDERS, type ProviderRecord } from '../lib/providers-catalogue';
import { Section, Eyebrow, Pill, EmptyState } from '../components/ds';
import AvailabilityBadge from '../components/global/AvailabilityBadge';
import AddToCompareButton from '../components/global/AddToCompareButton';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <ServiceCategoryPage> — /services/<slug>
 *
 * Slug-driven landing page that filters the provider catalogue down
 * to providers offering a given service category, plus a
 * category-specific intro, three-step explainer, and FAQ subset.
 *
 * Slug source: window.location.pathname segment 2 (`/services/long-
 * distance` → `long-distance`). Updates on popstate so the back /
 * forward buttons swap categories without a full re-mount.
 *
 * Unknown slugs render an EmptyState with links into the six known
 * categories so customers don't dead-end on a typo.
 * ───────────────────────────────────────────────────────────────── */

function readSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'services' || !parts[1]) return null;
  return parts[1];
}

export default function ServiceCategoryPage() {
  const { setPage } = useApp();
  const [slug, setSlug] = useState<string | null>(readSlug());

  /* Sync slug on popstate (back/forward) so the page swaps content
   * without re-mounting. */
  useEffect(() => {
    const onPop = () => setSlug(readSlug());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const category = findServiceCategory(slug);

  useEffect(() => {
    if (category) track('service_category_viewed', { slug: category.slug });
  }, [category]);

  /* Filter PROVIDERS by ANY-match against category.matches keywords
   * (case-insensitive substring against ProviderRecord.services). */
  const matchingProviders = useMemo<ProviderRecord[]>(() => {
    if (!category) return [];
    const keys = category.matches.map(s => s.toLowerCase());
    return PROVIDERS.filter(p =>
      p.services.some(s => keys.some(k => s.toLowerCase().includes(k))),
    );
  }, [category]);

  function openProfile(slug: string) {
    track('service_category_provider_clicked', { slug, category: category?.slug });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/provider?slug=${slug}`);
    }
    setPage('provider-profile');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  if (!category) {
    return (
      <Section tone="canvas" size="lg" containerSize="narrow">
        <EmptyState
          icon={Truck}
          title="Service category not found"
          body={
            <span>
              We couldn't find that service category. Pick one of the
              six categories below to see providers who offer it.
            </span>
          }
          primaryAction={{ label: 'See all services', onClick: () => setPage('services') }}
          secondaryAction={{ label: 'Browse providers', onClick: () => setPage('providers-directory') }}
        />
        <div className="mt-12">
          <Eyebrow>Try one of these</Eyebrow>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {SERVICE_CATEGORIES.map(c => (
              <CategoryCard key={c.slug} category={c} />
            ))}
          </div>
        </div>
      </Section>
    );
  }

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <button
          onClick={() => setPage('services')}
          className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wider mb-6 transition"
        >
          <ArrowLeft size={12} /> All services
        </button>
        <Pill tone="brand" className="mb-3"><Award size={12} /> Service category</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          {category.name}
        </h1>
        <p className="text-amber-200 text-lg font-semibold mb-2">{category.tagline}</p>
        <p className="text-white/75 max-w-2xl leading-relaxed">{category.intro}</p>
      </Section>

      {/* HOW IT WORKS */}
      <Section tone="soft" size="default">
        <Eyebrow tone="brand" className="mb-2">How it works</Eyebrow>
        <h2 className="text-2xl font-extrabold text-ink-900 mb-6">Three steps from quote to delivery</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {category.howItWorks.map((step, i) => (
            <article key={step.title} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 font-extrabold flex items-center justify-center mb-3">
                {i + 1}
              </div>
              <h3 className="font-extrabold text-ink-900 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* PROVIDERS */}
      <Section tone="canvas" size="default">
        <div className="flex items-end justify-between mb-6 gap-3">
          <div>
            <Eyebrow tone="brand" className="mb-1">Providers offering this</Eyebrow>
            <h2 className="text-2xl font-extrabold text-ink-900">
              {matchingProviders.length} verified provider{matchingProviders.length === 1 ? '' : 's'}
            </h2>
          </div>
          <button
            onClick={() => setPage('providers-directory')}
            className="text-xs font-bold text-slate-600 hover:text-brand-700 inline-flex items-center gap-1"
          >
            See full directory <ArrowRight size={12} />
          </button>
        </div>

        {matchingProviders.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No providers match this category yet"
            body={<span>We're still onboarding providers for this service. Browse the directory for related providers, or check back next month.</span>}
            primaryAction={{ label: 'Browse directory', onClick: () => setPage('providers-directory') }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {matchingProviders.map(p => (
              <article
                key={p.slug}
                onClick={() => openProfile(p.slug)}
                className="group bg-surface-soft hover:bg-white border border-slate-200 hover:border-brand-400/60 hover:shadow-medium rounded-2xl p-5 transition-base ease-marketplace cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-amber-200 flex items-center justify-center flex-shrink-0">
                      <Truck size={16} className="text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-ink-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 inline-flex items-center gap-1 truncate">
                        <span aria-hidden>{p.flag}</span>{p.city}
                      </p>
                    </div>
                  </div>
                  {p.badge && <Pill tone="brand" size="sm">{p.badge}</Pill>}
                </div>

                <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <strong>{p.rating.toFixed(2)}</strong>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-500">{p.reviews.toLocaleString()} reviews</span>
                  {p.availability && (
                    <AvailabilityBadge
                      availability={p.availability}
                      slotsLeft={p.slotsLeft}
                      size="sm"
                      className="ml-auto"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500">From</span>
                  <span className="font-extrabold text-brand-700">{p.fromPrice}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                  {p.verified.slice(0, 3).map(v => (
                    <span key={v} className="inline-flex items-center gap-1 bg-trust-50 text-trust-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                      <ShieldCheck size={10} />{v}
                    </span>
                  ))}
                </div>

                <div
                  className="mt-3 flex items-center justify-between gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => openProfile(p.slug)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-brand-700"
                  >
                    Open profile
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <AddToCompareButton
                    item={{
                      id:        p.slug,
                      name:      p.name,
                      city:      p.city,
                      flag:      p.flag,
                      rating:    p.rating,
                      reviews:   p.reviews,
                      fromPrice: p.fromPrice,
                      badge:     p.badge,
                      verified:  p.verified,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      {/* CATEGORY FAQ */}
      <Section tone="soft" size="default" containerSize="narrow">
        <Eyebrow tone="brand" className="mb-1">Common questions</Eyebrow>
        <h2 className="text-2xl font-extrabold text-ink-900 mb-6">{category.name} · FAQ</h2>
        <div className="space-y-4">
          {category.faq.map(item => (
            <details key={item.q} className="bg-white border border-slate-200 rounded-2xl p-5 group">
              <summary className="cursor-pointer font-bold text-ink-900 flex items-start justify-between gap-3 list-none">
                {item.q}
                <CheckCircle2 size={16} className="text-brand-600 flex-shrink-0 mt-0.5 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button
            onClick={() => setPage('faq')}
            className="text-sm text-slate-600 hover:text-brand-700 font-bold inline-flex items-center gap-1"
          >
            More questions on the full FAQ <ArrowRight size={14} />
          </button>
        </div>
      </Section>

      {/* RELATED CATEGORIES */}
      <Section tone="canvas" size="default">
        <Eyebrow tone="brand" className="mb-1">Other categories</Eyebrow>
        <h2 className="text-2xl font-extrabold text-ink-900 mb-6">Browse a different service</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SERVICE_CATEGORIES.filter(c => c.slug !== category.slug).map(c => (
            <CategoryCard key={c.slug} category={c} />
          ))}
        </div>
      </Section>
    </main>
  );
}

function CategoryCard({ category }: { category: ServiceCategory }) {
  function open() {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/services/${category.slug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }
  return (
    <button
      type="button"
      onClick={open}
      className="text-left bg-white hover:bg-surface-soft border border-slate-200 hover:border-brand-400/60 rounded-2xl p-5 transition-base ease-marketplace group"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-extrabold text-ink-900 group-hover:text-brand-700">
          {category.name}
        </p>
        <ArrowRight size={14} className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{category.tagline}</p>
    </button>
  );
}
