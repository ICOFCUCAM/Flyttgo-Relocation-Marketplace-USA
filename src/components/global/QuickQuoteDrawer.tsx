import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import BookingShortcut from './BookingShortcut';
import { useApp } from '../../lib/store';
import type { BookingCountry } from '../../lib/store';
import {
  QUICK_QUOTE_OPEN_EVENT, QUICK_QUOTE_CLOSE_EVENT,
  type QuickQuoteOpenDetail,
} from '../../lib/quick-quote';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <QuickQuoteDrawer> — right-side slide-over wrapping BookingShortcut.
 *
 * Mounted globally in AppLayout so any CTA — sticky bar, mobile nav,
 * command palette, footer — can pop the booking widget without
 * navigating away from the page the customer is reading.
 *
 * Country state:
 *   - opens with the country supplied via openQuickQuote({ country })
 *   - falls back to bookingData.country (set by country shopfront
 *     navigations)
 *   - exposes a small flag-chip switcher so the customer can flip
 *     market without closing
 *
 * Submit handoff:
 *   - BookingShortcut writes to bookingData and calls setPage('booking'),
 *     which closes the drawer (effect on currentPage) and lands the
 *     customer in the full booking flow with their inputs intact.
 * ───────────────────────────────────────────────────────────────── */

const COUNTRIES: { code: BookingCountry; flag: string; label: string }[] = [
  { code: 'us', flag: '🇺🇸', label: 'United States' },
  { code: 'ca', flag: '🇨🇦', label: 'Canada' },
  { code: 'gb', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'de', flag: '🇩🇪', label: 'Germany' },
  { code: 'fr', flag: '🇫🇷', label: 'France' },
  { code: 'no', flag: '🇳🇴', label: 'Norway' },
];

export default function QuickQuoteDrawer() {
  const { bookingData, currentPage } = useApp();
  const [open,    setOpen]    = useState(false);
  const [country, setCountry] = useState<BookingCountry>(bookingData.country ?? 'us');

  /* Listen for global open / close events. */
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<QuickQuoteOpenDetail>).detail ?? {};
      const next   = detail.country ?? bookingData.country ?? 'us';
      setCountry(next);
      setOpen(true);
      track('quick_quote_opened', { country: next, source: detail.source });
    };
    const onClose = () => setOpen(false);
    window.addEventListener(QUICK_QUOTE_OPEN_EVENT,  onOpen  as EventListener);
    window.addEventListener(QUICK_QUOTE_CLOSE_EVENT, onClose as EventListener);
    return () => {
      window.removeEventListener(QUICK_QUOTE_OPEN_EVENT,  onOpen  as EventListener);
      window.removeEventListener(QUICK_QUOTE_CLOSE_EVENT, onClose as EventListener);
    };
  }, [bookingData.country]);

  /* Close on Esc. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* Auto-close when the customer ends up on the booking flow itself —
   * BookingShortcut.submit() calls setPage('booking') and we don't
   * want the drawer floating over the full booking page. */
  useEffect(() => {
    if (currentPage === 'booking' || currentPage === 'payment') setOpen(false);
  }, [currentPage]);

  /* Lock body scroll while open. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Get a quick quote"
      className="fixed inset-0 z-50 flex"
    >
      <button
        type="button"
        aria-label="Close quote drawer"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      />

      <aside className="ml-auto relative w-full sm:max-w-lg h-full bg-surface-soft shadow-2xl border-l border-slate-200 overflow-y-auto animate-in slide-in-from-right duration-200">
        <header className="sticky top-0 z-10 bg-surface-soft/95 backdrop-blur border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-600">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600">Quick quote</p>
              <p className="text-sm font-extrabold text-ink-900 truncate">
                Compare licensed providers in 60 seconds
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="p-2 rounded-lg text-slate-500 hover:text-ink-900 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>

        {/* Country chip switcher */}
        <div className="px-5 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Market
          </p>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map(c => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setCountry(c.code);
                  track('quick_quote_country_switched', { country: c.code });
                }}
                aria-pressed={country === c.code}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-base ease-marketplace ${
                  country === c.code
                    ? 'bg-ink-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-ink-900'
                }`}
              >
                <span aria-hidden>{c.flag}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* Re-mount on country change so BookingShortcut resets its
              local pickup/dropoff state — addresses from one country
              don't make sense in another. */}
          <BookingShortcut key={country} country={country} compact />
        </div>
      </aside>
    </div>
  );
}
