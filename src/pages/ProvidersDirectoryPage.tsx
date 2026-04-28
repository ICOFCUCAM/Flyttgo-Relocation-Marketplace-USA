import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Star, ShieldCheck, Award, Truck, ArrowRight, X, SlidersHorizontal,
  ArrowDownAZ, TrendingDown, TrendingUp,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { PROVIDERS, type ProviderRecord } from '../lib/providers-catalogue';
import type { BookingCountry } from '../lib/store';
import { Section, Eyebrow, Pill, EmptyState } from '../components/ds';
import AddToCompareButton from '../components/global/AddToCompareButton';
import AvailabilityBadge from '../components/global/AvailabilityBadge';
import RecentlyViewedRail from '../components/global/RecentlyViewedRail';
import { track } from '../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <ProvidersDirectoryPage> — /providers/directory
 *
 * Searchable + filterable index over the provider catalogue. Reads
 * the same source-of-truth (lib/providers-catalogue) as the home
 * grid + the per-provider profile page so a record edit shows up on
 * three surfaces.
 *
 * Filters:
 *   - text   (matches name, city, services, fleet, about — case-insensitive)
 *   - country (chip row, multi-select; empty = all)
 *   - tier   (chip row, multi-select)
 *   - service (chip row, multi-select; reads union from catalogue)
 *
 * Sort:
 *   rating desc | reviews desc | price asc (parsed from fromPrice)
 *
 * Filters + sort are persisted to the URL query so a customer can
 * share a filtered view ("…?country=de,fr&tier=Gold&sort=rating").
 * ───────────────────────────────────────────────────────────────── */

type SortKey = 'rating' | 'reviews' | 'price';

const COUNTRY_LABELS: Record<BookingCountry, string> = {
  us: 'United States',
  ca: 'Canada',
  gb: 'United Kingdom',
  de: 'Germany',
  fr: 'France',
  no: 'Norway',
};

const COUNTRY_FLAGS: Record<BookingCountry, string> = {
  us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', no: '🇳🇴',
};

/* Crude price parser — pulls the first numeric run out of the
 * fromPrice string ("from $480" → 480, "fra 4 200 kr" → 4200,
 * "à partir de 460 €" → 460). Used only for sort ordering, never
 * displayed to the customer. */
function parsePrice(s: string): number {
  const m = s.replace(/\s+/g, '').match(/(\d[\d.,]*)/);
  if (!m) return Number.POSITIVE_INFINITY;
  return Number(m[1].replace(/[.,]/g, '')) || Number.POSITIVE_INFINITY;
}

export default function ProvidersDirectoryPage() {
  const { setPage } = useApp();

  const [text,      setText]      = useState('');
  const [countries, setCountries] = useState<BookingCountry[]>([]);
  const [tiers,     setTiers]     = useState<string[]>([]);
  const [services,  setServices]  = useState<string[]>([]);
  const [sort,      setSort]      = useState<SortKey>('rating');

  /* Typeahead state — Wave 32. The dropdown opens on focus + non-empty
   * text and renders the top 5 catalogue matches as a click-through
   * shortcut to the profile. ArrowUp/ArrowDown/Enter handle keyboard
   * navigation; Escape closes without clearing the text. */
  const [taOpen,    setTaOpen]    = useState(false);
  const [taActive,  setTaActive]  = useState(0);
  const taRef = useRef<HTMLDivElement>(null);

  /* Hydrate from URL on mount + persist on change. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('q'))         setText(sp.get('q') ?? '');
    if (sp.get('country'))   setCountries(sp.get('country')!.split(',').filter(Boolean) as BookingCountry[]);
    if (sp.get('tier'))      setTiers(sp.get('tier')!.split(',').filter(Boolean));
    if (sp.get('service'))   setServices(sp.get('service')!.split(',').filter(Boolean));
    if (sp.get('sort'))      setSort((sp.get('sort') as SortKey) ?? 'rating');
    track('providers_directory_viewed');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    text          ? sp.set('q', text)              : sp.delete('q');
    countries.length ? sp.set('country', countries.join(',')) : sp.delete('country');
    tiers.length     ? sp.set('tier',    tiers.join(','))     : sp.delete('tier');
    services.length  ? sp.set('service', services.join(','))  : sp.delete('service');
    sort !== 'rating' ? sp.set('sort', sort) : sp.delete('sort');
    const qs = sp.toString();
    const target = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    if (target !== window.location.pathname + window.location.search) {
      window.history.replaceState({}, '', target);
    }
  }, [text, countries, tiers, services, sort]);

  /* Catalogue-derived chip vocabularies. */
  const allTiers    = useMemo(() => Array.from(new Set(PROVIDERS.map(p => p.badge).filter(Boolean) as string[])).sort(), []);
  const allServices = useMemo(() => {
    const set = new Set<string>();
    PROVIDERS.forEach(p => p.services.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, []);

  /* Filter + sort. */
  const results = useMemo(() => {
    const q = text.trim().toLowerCase();
    let list = PROVIDERS.filter(p => {
      if (countries.length && !countries.includes(p.country)) return false;
      if (tiers.length     && (!p.badge || !tiers.includes(p.badge))) return false;
      if (services.length  && !services.every(s => p.services.includes(s))) return false;
      if (q) {
        const hay = [
          p.name, p.city, p.country, p.badge ?? '',
          p.about, ...p.services, ...p.fleet, ...p.verified,
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = list.sort((a, b) => {
      if (sort === 'rating')  return b.rating - a.rating;
      if (sort === 'reviews') return b.reviews - a.reviews;
      return parsePrice(a.fromPrice) - parsePrice(b.fromPrice);
    });
    return list;
  }, [text, countries, tiers, services, sort]);

  /* Top 5 typeahead candidates. Looser-matching than the main filter
   * (just name + city + service substring) so the dropdown surfaces
   * options the customer might not have considered for the active
   * country/tier/service chips. */
  const typeaheadCandidates = useMemo<ProviderRecord[]>(() => {
    const q = text.trim().toLowerCase();
    if (q.length < 2) return [];
    return PROVIDERS
      .map(p => {
        const hay = `${p.name} ${p.city} ${p.services.join(' ')}`.toLowerCase();
        const i   = hay.indexOf(q);
        if (i < 0) return null;
        /* Earlier matches score higher; name-prefix beats city-prefix
         * beats service-substring. */
        const namePrefix = p.name.toLowerCase().startsWith(q) ? 100 : 0;
        const cityPrefix = p.city.toLowerCase().startsWith(q) ? 50  : 0;
        return { p, score: namePrefix + cityPrefix - i };
      })
      .filter((x): x is { p: ProviderRecord; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.p);
  }, [text]);

  /* Click-outside closes the dropdown. */
  useEffect(() => {
    if (!taOpen) return;
    const onDown = (e: MouseEvent) => {
      if (taRef.current && !taRef.current.contains(e.target as Node)) {
        setTaOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [taOpen]);

  /* Reset the active row whenever the candidate set changes. */
  useEffect(() => { setTaActive(0); }, [text]);

  function toggle<T extends string>(value: T, list: T[], set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);
  }

  function clearAll() {
    setText('');
    setCountries([]);
    setTiers([]);
    setServices([]);
    setSort('rating');
    track('providers_directory_cleared');
  }

  function openProfile(slug: string) {
    track('directory_provider_clicked', { slug });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/provider?slug=${slug}`);
    }
    setPage('provider-profile');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  const filterCount = countries.length + tiers.length + services.length + (text ? 1 : 0);

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <Pill tone="brand" className="mb-4"><SlidersHorizontal size={12} /> Provider directory</Pill>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          Browse every verified provider
        </h1>
        <p className="text-white/75 max-w-2xl">
          Filter by country, tier, or service category. Sort by rating, review
          count, or starting price. Click any provider to open the full profile,
          or add up to three to compare side-by-side.
        </p>

        {/* Search bar with typeahead dropdown (Wave 32) */}
        <div className="mt-7 max-w-2xl relative" ref={taRef}>
          <div className="flex items-center gap-3 bg-white rounded-xl shadow-medium px-4 py-3 text-ink-900">
            <Search size={18} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              role="combobox"
              aria-expanded={taOpen && typeaheadCandidates.length > 0}
              aria-controls="providers-typeahead-listbox"
              aria-activedescendant={
                taOpen && typeaheadCandidates[taActive]
                  ? `ta-${typeaheadCandidates[taActive].slug}` : undefined
              }
              value={text}
              onChange={e => { setText(e.target.value); setTaOpen(true); }}
              onFocus={() => setTaOpen(true)}
              onKeyDown={e => {
                if (!taOpen || typeaheadCandidates.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setTaActive(a => Math.min(a + 1, typeaheadCandidates.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setTaActive(a => Math.max(a - 1, 0));
                } else if (e.key === 'Enter') {
                  const pick = typeaheadCandidates[taActive];
                  if (pick) {
                    e.preventDefault();
                    setTaOpen(false);
                    track('directory_typeahead_selected', { slug: pick.slug, query: text });
                    openProfile(pick.slug);
                  }
                } else if (e.key === 'Escape') {
                  setTaOpen(false);
                }
              }}
              placeholder="Search by name, city, vehicle, or service…"
              className="flex-1 bg-transparent outline-none text-sm placeholder-slate-400"
            />
            {text && (
              <button
                onClick={() => { setText(''); setTaOpen(false); }}
                aria-label="Clear search"
                className="p-1 rounded text-slate-400 hover:text-ink-900"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {taOpen && typeaheadCandidates.length > 0 && (
            <ul
              id="providers-typeahead-listbox"
              role="listbox"
              className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-elevated overflow-hidden z-30 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              {typeaheadCandidates.map((p, i) => {
                const isActive = i === taActive;
                return (
                  <li
                    id={`ta-${p.slug}`}
                    key={p.slug}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setTaActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setTaOpen(false);
                      track('directory_typeahead_selected', { slug: p.slug, query: text });
                      openProfile(p.slug);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isActive ? 'bg-brand-50' : 'bg-white hover:bg-surface-soft'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-50 to-amber-200 flex items-center justify-center flex-shrink-0">
                      <Truck size={14} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 inline-flex items-center gap-1 truncate">
                        <span aria-hidden>{p.flag}</span>{p.city}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-xs font-bold text-brand-700">{p.fromPrice}</span>
                      <span className="text-[10px] text-slate-500 inline-flex items-center gap-0.5">
                        <Star size={9} className="fill-amber-400 text-amber-400" />
                        {p.rating.toFixed(2)}
                      </span>
                    </div>
                  </li>
                );
              })}
              <li className="px-4 py-2 bg-surface-soft border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                <span>↑↓ navigate · ⏎ open profile · Esc close</span>
                <span>{typeaheadCandidates.length} match{typeaheadCandidates.length === 1 ? '' : 'es'}</span>
              </li>
            </ul>
          )}
        </div>
      </Section>

      {/* RECENTLY VIEWED — surfaces the customer's browsing history
          right above the filters so they can resume a profile in one
          click. Self-suppresses for first-time visitors. */}
      <RecentlyViewedRail />

      {/* FILTERS */}
      <Section tone="soft" size="sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Eyebrow tone="brand" className="mb-0">Filters</Eyebrow>
            {filterCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-slate-500 hover:text-danger-600 underline underline-offset-2"
              >
                Clear all ({filterCount})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Sort by</span>
            {[
              { id: 'rating',  label: 'Rating',  Icon: Star },
              { id: 'reviews', label: 'Reviews', Icon: TrendingUp },
              { id: 'price',   label: 'Price',   Icon: TrendingDown },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setSort(opt.id as SortKey)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-base ease-marketplace ${
                  sort === opt.id ? 'bg-ink-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-ink-900 hover:text-ink-900'
                }`}
              >
                <opt.Icon size={12} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Country chips */}
        <FilterRow label="Country">
          {(Object.keys(COUNTRY_LABELS) as BookingCountry[]).map(c => (
            <Chip
              key={c}
              active={countries.includes(c)}
              onClick={() => toggle(c, countries, setCountries)}
              icon={<span aria-hidden>{COUNTRY_FLAGS[c]}</span>}
              label={COUNTRY_LABELS[c]}
            />
          ))}
        </FilterRow>

        {/* Tier chips */}
        <FilterRow label="Tier">
          {allTiers.map(t => (
            <Chip
              key={t}
              active={tiers.includes(t)}
              onClick={() => toggle(t, tiers, setTiers)}
              icon={<Award size={12} />}
              label={t}
            />
          ))}
        </FilterRow>

        {/* Service chips */}
        <FilterRow label="Service">
          {allServices.map(s => (
            <Chip
              key={s}
              active={services.includes(s)}
              onClick={() => toggle(s, services, setServices)}
              label={s}
            />
          ))}
        </FilterRow>
      </Section>

      {/* RESULTS */}
      <Section tone="canvas">
        <div className="flex items-baseline justify-between mb-6">
          <p className="text-sm text-slate-500">
            <strong className="text-ink-900">{results.length}</strong>{' '}
            {results.length === 1 ? 'provider' : 'providers'}
            {filterCount > 0 && ` matching ${filterCount} filter${filterCount === 1 ? '' : 's'}`}
          </p>
          <p className="text-xs text-slate-400 inline-flex items-center gap-1">
            <ArrowDownAZ size={12} />
            Sorted by {sort === 'rating' ? 'highest rating' : sort === 'reviews' ? 'most reviews' : 'lowest price'}
          </p>
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No providers match those filters"
            body={<span>Try removing a chip, broadening the country selection, or clearing the search box.</span>}
            primaryAction={{ label: 'Clear filters', onClick: clearAll }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map(p => (
              <ProviderCard key={p.slug} provider={p} onOpen={openProfile} />
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}

/* ── Local helpers ───────────────────────────────────────────── */

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-base ease-marketplace ${
        active
          ? 'bg-ink-900 text-white'
          : 'bg-white border border-slate-200 text-slate-700 hover:border-ink-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ProviderCard({ provider: p, onOpen }: { provider: ProviderRecord; onOpen: (slug: string) => void }) {
  return (
    <article
      onClick={() => onOpen(p.slug)}
      className="group bg-surface-soft hover:bg-white border border-slate-200 hover:border-brand-400/60 hover:shadow-medium rounded-2xl p-5 transition-base ease-marketplace cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-amber-200 flex items-center justify-center flex-shrink-0">
            <Truck size={20} className="text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-ink-900 leading-tight truncate">{p.name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
              <span aria-hidden>{p.flag}</span>{p.city}
            </p>
          </div>
        </div>
        {p.badge && <Pill tone="brand" size="sm"><Award size={10} />{p.badge}</Pill>}
      </div>

      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
        {p.about}
      </p>

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
        <span className="text-xs text-slate-500">Booking from</span>
        <span className="font-extrabold text-brand-700">{p.fromPrice}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-200">
        {p.verified.slice(0, 3).map(v => (
          <span key={v} className="inline-flex items-center gap-1 bg-trust-50 text-trust-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
            <ShieldCheck size={10} />
            {v}
          </span>
        ))}
      </div>

      <div
        className="mt-3 flex items-center justify-between gap-2"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpen(p.slug)}
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
  );
}
