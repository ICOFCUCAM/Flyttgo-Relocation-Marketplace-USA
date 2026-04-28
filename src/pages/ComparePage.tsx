import React, { useEffect, useMemo } from 'react';
import {
  Star, ShieldCheck, Award, Truck, X, ArrowRight, GitCompare, MapPin, Clock,
} from 'lucide-react';
import { useApp } from '../lib/store';
import {
  useCompareStore, removeFromCompare, clearCompare, COMPARE_MAX,
} from '../lib/compare-store';
import { findProvider } from '../lib/providers-catalogue';
import { Section, Eyebrow, Pill, EmptyState } from '../components/ds';
import AvailabilityBadge from '../components/global/AvailabilityBadge';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <ComparePage> — /compare
 *
 * Full-page side-by-side comparison of every provider in the compare
 * shortlist. Reads two sources:
 *   1. compare-store         — the shortlist (3 max), with snapshot
 *                              fields persisted at add-time
 *   2. providers-catalogue   — fetched per-slug for the deeper rows
 *                              (services, fleet, coverage, yearsActive,
 *                              about, availability)
 *
 * Layout is a single horizontal-scroll table on mobile + a fixed-grid
 * card row on lg+ . Keeps the user inside the marketplace navigation
 * (no modal trap) so they can navigate to a profile + come back with
 * the back button.
 * ───────────────────────────────────────────────────────────────── */

export default function ComparePage() {
  const items = useCompareStore();
  const { setPage } = useApp();

  useEffect(() => {
    track('compare_page_viewed', { count: items.length });
  }, [items.length]);

  /* Hydrate each shortlist item with its full catalogue record so we
   * can show the deeper rows. Items whose catalogue entry has been
   * removed fall back to their snapshot. */
  const enriched = useMemo(
    () => items.map(it => ({
      ...it,
      record: findProvider(it.id),
    })),
    [items],
  );

  function openProfile(slug: string) {
    track('compare_provider_clicked', { slug });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/provider?slug=${slug}`);
    }
    setPage('provider-profile');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  if (items.length === 0) {
    return (
      <Section tone="canvas" size="lg" containerSize="narrow">
        <EmptyState
          icon={GitCompare}
          title="Your compare list is empty"
          body={
            <span>
              Add up to {COMPARE_MAX} providers from the home grid or directory
              and they'll line up here side by side — rating, price, services,
              verifications, and live availability all in one table.
            </span>
          }
          primaryAction={{ label: 'Browse providers', onClick: () => setPage('providers-directory') }}
          secondaryAction={{ label: 'See top-rated', onClick: () => setPage('home') }}
        />
      </Section>
    );
  }

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Pill tone="brand" className="mb-3"><GitCompare size={12} /> Side-by-side</Pill>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05]">
              Compare your shortlist
            </h1>
            <p className="text-white/75 mt-2 max-w-xl">
              {items.length} of {COMPARE_MAX} providers selected. Open a profile
              to read reviews + sample jobs, or remove a row to swap in a
              different provider.
            </p>
          </div>
          <button
            onClick={() => { clearCompare(); track('compare_cleared'); }}
            className="text-xs text-white/60 hover:text-rose-300 underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      </Section>

      {/* GRID */}
      <Section tone="soft" size="default">
        <div className={`grid gap-5 ${items.length === 1 ? 'sm:grid-cols-1 max-w-md' : items.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {enriched.map(({ record, ...it }) => {
            const r = record;
            return (
              <article
                key={it.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
              >
                <header className="bg-surface-soft px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink-900 truncate">{it.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <span aria-hidden>{it.flag}</span>{it.city}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCompare(it.id)}
                    aria-label={`Remove ${it.name}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </header>

                <Row label="Rating">
                  <span className="inline-flex items-center gap-1">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <strong>{it.rating.toFixed(2)}</strong>
                    <span className="text-slate-500 text-xs">· {it.reviews.toLocaleString()}</span>
                  </span>
                </Row>

                <Row label="Booking from">
                  <span className="font-extrabold text-brand-700">{it.fromPrice}</span>
                </Row>

                {it.badge && (
                  <Row label="Tier">
                    <Pill tone="brand" size="sm"><Award size={10} />{it.badge}</Pill>
                  </Row>
                )}

                {r?.availability && (
                  <Row label="Availability">
                    <AvailabilityBadge
                      availability={r.availability}
                      slotsLeft={r.slotsLeft}
                      size="sm"
                    />
                  </Row>
                )}

                {r?.coverage && (
                  <Row label="Coverage">
                    <span className="text-xs inline-flex items-start gap-1">
                      <MapPin size={11} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      {r.coverage}
                    </span>
                  </Row>
                )}

                {r?.yearsActive != null && (
                  <Row label="On marketplace">
                    <span className="text-xs inline-flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {r.yearsActive} years
                    </span>
                  </Row>
                )}

                <Row label="Services">
                  <div className="flex flex-wrap gap-1">
                    {(r?.services ?? []).slice(0, 4).map(s => (
                      <span key={s} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                    {(r?.services?.length ?? 0) > 4 && (
                      <span className="text-[10px] text-slate-400">
                        +{(r!.services.length) - 4} more
                      </span>
                    )}
                  </div>
                </Row>

                <Row label="Fleet">
                  <div className="flex flex-col gap-1 text-xs text-slate-600">
                    {(r?.fleet ?? []).slice(0, 3).map(f => (
                      <span key={f} className="inline-flex items-center gap-1">
                        <Truck size={11} className="text-slate-400" />
                        {f}
                      </span>
                    ))}
                  </div>
                </Row>

                <Row label="Verified">
                  <div className="flex flex-wrap gap-1">
                    {(it.verified ?? []).map(v => (
                      <span key={v} className="inline-flex items-center gap-1 bg-trust-50 text-trust-600 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                        <ShieldCheck size={9} />
                        {v}
                      </span>
                    ))}
                  </div>
                </Row>

                <footer className="mt-auto p-4 border-t border-slate-100 bg-surface-soft">
                  <button
                    type="button"
                    onClick={() => openProfile(it.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-ink-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
                  >
                    Open profile
                    <ArrowRight size={12} />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>

        {items.length < COMPARE_MAX && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setPage('providers-directory')}
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-700 font-bold underline-offset-2 hover:underline"
            >
              <Eyebrow tone="brand" className="mb-0">Add another</Eyebrow>
              {COMPARE_MAX - items.length} more slot{COMPARE_MAX - items.length === 1 ? '' : 's'} available · browse the directory
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </Section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-slate-100 last:border-b-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
