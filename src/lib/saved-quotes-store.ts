/**
 * Saved-quotes store.
 *
 * Marketplace customers research a move 4–7 times before they book.
 * This store lets them save the brief — pickup, drop-off, country,
 * payment method, indicative total — so it's still here when they
 * come back.
 *
 * Same shape as compare-store: imperative API + useSavedQuotesStore()
 * React hook, localStorage-persisted, cross-tab synced. Capped at
 * SAVED_MAX entries so the UI doesn't blow out and a hostile script
 * can't run the customer's localStorage to MB.
 */

import { useEffect, useState } from 'react';
import type { BookingCountry, PaymentMethod } from './store';

export const SAVED_MAX = 10;
const STORAGE_KEY = 'flyttgo_saved_quotes_v1';

export interface SavedQuote {
  id:              string;            // local UUID
  savedAt:         number;            // ms epoch
  country:         BookingCountry;
  pickupAddress:   string;
  dropoffAddress:  string;
  moveDate?:       string;
  paymentMethod:   PaymentMethod;
  indicativeTotal: number;
  depositAmount:   number;
  cashDueAmount:   number;
  distanceKm?:     number | null;
  durationMinutes?: number | null;
  /** Customer-supplied label so multiple quotes are easy to tell apart. */
  label?:          string;
}

type Listener = (quotes: SavedQuote[]) => void;
const listeners = new Set<Listener>();
let cache: SavedQuote[] = read();

function read(): SavedQuote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedQuote[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(q => q && typeof q.id === 'string')
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, SAVED_MAX);
  } catch {
    return [];
  }
}

function write(next: SavedQuote[]): void {
  cache = next.slice(0, SAVED_MAX);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }
  listeners.forEach(fn => fn(cache));
}

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `q_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

/* ── Imperative API ──────────────────────────────────────────── */

export function getSavedQuotes(): SavedQuote[] {
  return cache;
}

export function saveQuote(input: Omit<SavedQuote, 'id' | 'savedAt'>): SavedQuote {
  const quote: SavedQuote = { ...input, id: newId(), savedAt: Date.now() };
  write([quote, ...cache]);
  return quote;
}

export function removeSavedQuote(id: string): void {
  write(cache.filter(q => q.id !== id));
}

export function renameSavedQuote(id: string, label: string): void {
  write(cache.map(q => q.id === id ? { ...q, label } : q));
}

export function clearSavedQuotes(): void {
  write([]);
}

/* ── React hook ──────────────────────────────────────────────── */

export function useSavedQuotesStore(): SavedQuote[] {
  const [quotes, setQuotes] = useState<SavedQuote[]>(cache);
  useEffect(() => {
    listeners.add(setQuotes);
    setQuotes(cache);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      cache = read();
      setQuotes(cache);
    };
    window.addEventListener('storage', onStorage);

    return () => {
      listeners.delete(setQuotes);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return quotes;
}

/**
 * Format the savedAt epoch as a relative-time label ("just now",
 * "5m ago", "2h ago", "3d ago"). Cheap, no date-fns dep.
 */
export function relativeTimeFromMs(ms: number): string {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60)        return 'just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400)    return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604_800)   return `${Math.floor(diff / 86_400)}d ago`;
  return new Date(ms).toLocaleDateString();
}
