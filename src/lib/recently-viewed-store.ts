/**
 * Recently-viewed providers store.
 *
 * Tracks the last N provider profiles a customer has opened so we can
 * surface a "Pick up where you left off" rail on the home / directory
 * pages. Mirrors the compare-store pattern: imperative API + React
 * hook + localStorage cross-tab sync. No Context needed — any
 * component (ProviderProfilePage, TopProviders, the directory) can
 * write a record without prop drilling.
 *
 * We cap at 6 entries so the rail fits a single row on desktop /
 * scroll-snap row on mobile.
 */

import { useEffect, useState } from 'react';

export const RECENTLY_VIEWED_MAX = 6;
const STORAGE_KEY = 'flyttgo_recently_viewed_v1';

/** Snapshot of a provider profile, stored at view-time so the rail
 *  doesn't need a fresh catalogue lookup to render. */
export interface RecentlyViewedItem {
  slug:      string;
  name:      string;
  city:      string;
  flag:      string;
  rating:    number;
  reviews:   number;
  fromPrice: string;
  badge?:    string;
  /** ISO timestamp the customer opened this profile. Used to sort
   *  + decide what to evict when we hit RECENTLY_VIEWED_MAX. */
  viewedAt:  string;
}

type Listener = (items: RecentlyViewedItem[]) => void;

const listeners = new Set<Listener>();
let cache: RecentlyViewedItem[] = read();

function read(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentlyViewedItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(x => x && typeof x.slug === 'string')
      .slice(0, RECENTLY_VIEWED_MAX);
  } catch {
    return [];
  }
}

function write(next: RecentlyViewedItem[]): void {
  cache = next.slice(0, RECENTLY_VIEWED_MAX);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }
  listeners.forEach(fn => fn(cache));
}

/* ── Imperative API ────────────────────────────────────── */

export function getRecentlyViewed(): RecentlyViewedItem[] {
  return cache;
}

/**
 * Record a provider view. Moves the slug to the front of the list
 * (refreshing its viewedAt) so the most recent view is always first.
 */
export function recordRecentlyViewed(item: Omit<RecentlyViewedItem, 'viewedAt'>): void {
  const now    = new Date().toISOString();
  const others = cache.filter(c => c.slug !== item.slug);
  write([{ ...item, viewedAt: now }, ...others]);
}

export function clearRecentlyViewed(): void {
  write([]);
}

export function removeRecentlyViewed(slug: string): void {
  write(cache.filter(c => c.slug !== slug));
}

/* ── React hook subscription ───────────────────────────── */

export function useRecentlyViewedStore(): RecentlyViewedItem[] {
  const [items, setItems] = useState<RecentlyViewedItem[]>(cache);
  useEffect(() => {
    listeners.add(setItems);
    setItems(cache);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      cache = read();
      setItems(cache);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      listeners.delete(setItems);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return items;
}
