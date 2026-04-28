/**
 * Provider-comparison store.
 *
 * Standalone tiny store (no Context, no React) so the
 * AddToCompareButton on each provider card can read/write the same
 * shortlist as the comparison drawer without prop drilling. Backed by
 * localStorage so a customer's selection survives a page reload — a
 * real shopping-cart pattern, scaled down to 3 entries.
 *
 * Subscribe via `useCompareStore()` hook in any component to re-render
 * on changes.
 *
 * Cap is 3 because side-by-side comparison breaks down past 3 columns
 * on mobile, and 3 is the marketplace convention (Bellhop, Hire-A-
 * Helper, MoveBuddha).
 */

import { useEffect, useState } from 'react';

export const COMPARE_MAX = 3;
const STORAGE_KEY = 'flyttgo_compare_v1';

/* The shape we persist. We only need the IDs + the per-card snapshot
 * fields we render in the drawer. The full provider record is fetched
 * from Supabase when the customer hits "Book this provider". */
export interface CompareItem {
  id:        string;
  name:      string;
  city:      string;
  flag:      string;
  rating:    number;
  reviews:   number;
  fromPrice: string;
  badge?:    string;
  verified?: string[];
}

type Listener = (items: CompareItem[]) => void;

const listeners = new Set<Listener>();
let cache: CompareItem[] = read();

function read(): CompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareItem[];
    return Array.isArray(parsed) ? parsed.slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

function write(next: CompareItem[]): void {
  cache = next.slice(0, COMPARE_MAX);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }
  listeners.forEach(fn => fn(cache));
}

/* ── Imperative API (call from anywhere) ───────────────── */

export function getCompare(): CompareItem[] {
  return cache;
}

export function isInCompare(id: string): boolean {
  return cache.some(c => c.id === id);
}

export function addToCompare(item: CompareItem): boolean {
  if (isInCompare(item.id)) return false;
  if (cache.length >= COMPARE_MAX) return false;
  write([...cache, item]);
  return true;
}

export function removeFromCompare(id: string): void {
  write(cache.filter(c => c.id !== id));
}

export function toggleCompare(item: CompareItem): boolean {
  return isInCompare(item.id)
    ? (removeFromCompare(item.id), false)
    : addToCompare(item);
}

export function clearCompare(): void {
  write([]);
}

/* ── React hook subscription ───────────────────────────── */

export function useCompareStore(): CompareItem[] {
  const [items, setItems] = useState<CompareItem[]>(cache);
  useEffect(() => {
    listeners.add(setItems);
    /* In case the cache changed between render and effect (concurrent
     * updates, cross-tab storage events). */
    setItems(cache);

    /* Cross-tab sync — when localStorage changes in another tab, mirror. */
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
