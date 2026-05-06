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

/* ─────────────────────────────────────────────────────────────────
 * Shareable-quote URL helpers
 *
 * Encodes a quote into a URL-safe base64 string so a customer can
 * forward "https://flyttgo.com/?q=ABC123…" to a partner / spouse /
 * housemate. The recipient lands on the home page; an effect in
 * AppLayout (see Wave 19 wiring) decodes the param, drops the
 * quote into their local store, and routes them to the matching
 * country shopfront so they can review and book.
 *
 * No PII inside — we only round-trip the brief (country, addresses,
 * total, split, distance). The quote id and savedAt are regenerated
 * on the recipient's side because they're now /that customer's/
 * record, not the sender's.
 * ───────────────────────────────────────────────────────────────── */

export type SharedQuotePayload = Omit<SavedQuote, 'id' | 'savedAt'>;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return (typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64'))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const std = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = typeof atob !== 'undefined' ? atob(std) : Buffer.from(std, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encode a quote into a URL-safe base64 token. */
export function encodeSharedQuote(payload: SharedQuotePayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytes);
}

/** Decode the `?q=` URL param into a quote payload. Returns null if
 *  the token is missing / malformed / fails the shape check. */
export function decodeSharedQuote(token: string | null | undefined): SharedQuotePayload | null {
  if (!token) return null;
  try {
    const bytes = fromBase64Url(token);
    const json  = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<SharedQuotePayload>;
    if (!parsed || typeof parsed !== 'object') return null;
    /* Minimum viable shape — anything else missing is fine, the
     * country shopfront will fall back to defaults. */
    if (!parsed.country || !parsed.pickupAddress || !parsed.dropoffAddress
        || typeof parsed.indicativeTotal !== 'number') return null;
    return parsed as SharedQuotePayload;
  } catch {
    return null;
  }
}

/** Build the canonical share URL for a saved quote. */
export function buildShareUrl(quote: SavedQuote, base = 'https://flyttgo.com'): string {
  const token = encodeSharedQuote({
    country:         quote.country,
    pickupAddress:   quote.pickupAddress,
    dropoffAddress:  quote.dropoffAddress,
    moveDate:        quote.moveDate,
    paymentMethod:   quote.paymentMethod,
    indicativeTotal: quote.indicativeTotal,
    depositAmount:   quote.depositAmount,
    cashDueAmount:   quote.cashDueAmount,
    distanceKm:      quote.distanceKm,
    durationMinutes: quote.durationMinutes,
    label:           quote.label,
  });
  return `${base}/?q=${token}`;
}
