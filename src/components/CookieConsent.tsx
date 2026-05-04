import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';

const STORAGE_KEY = 'flyttgo_cookie_consent';
export const REOPEN_CONSENT_EVENT = 'flyttgo:reopen-consent';

type Choice = 'all' | 'essential' | null;

/**
 * GDPR cookie consent banner.
 *
 * Stores the user's choice in localStorage under flyttgo_cookie_consent
 * as either 'all' (analytics OK) or 'essential' (only strictly
 * necessary cookies). Other components / scripts that want to know
 * whether they can fire analytics should call hasAnalyticsConsent().
 *
 * Also dispatches a custom 'flyttgo:consent' window event when the
 * choice changes, so a future analytics loader can subscribe to it
 * and start tracking the moment consent is granted (no full reload
 * required).
 *
 * Customers can re-open the dialog at any time via the Footer
 * "Manage cookies" link, which fires `flyttgo:reopen-consent` →
 * we reset the local choice back to null so the banner re-renders.
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'all';
}

/**
 * Imperative helper any UI can call ("Manage cookies" link in
 * Footer, a settings page, ⌘K palette action) to re-open the
 * consent dialog. Wipes the stored choice so the banner re-renders.
 */
export function reopenCookieConsent(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(REOPEN_CONSENT_EVENT));
}

export default function CookieConsent() {
  const [choice, setChoice] = useState<Choice>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(STORAGE_KEY) as Choice;
    setChoice(stored ?? null);

    /* Re-open handler — fires when the customer clicks "Manage
     * cookies" in the footer or anywhere else that calls
     * reopenCookieConsent(). Resets local state so the banner
     * re-renders with no preselected choice. */
    const onReopen = () => setChoice(null);
    window.addEventListener(REOPEN_CONSENT_EVENT, onReopen as EventListener);
    return () => window.removeEventListener(REOPEN_CONSENT_EVENT, onReopen as EventListener);
  }, []);

  const save = (value: 'all' | 'essential') => {
    window.localStorage.setItem(STORAGE_KEY, value);
    setChoice(value);
    window.dispatchEvent(new CustomEvent('flyttgo:consent', { detail: value }));
  };

  // Don't render until we've checked localStorage — avoids a flash
  // of the banner on every page load for users who already chose.
  if (!mounted) return null;
  if (choice !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5"
    >
      {/* Brand-aligned container — ink-navy header band sets the
       *  marketplace tone, white body keeps the dialog readable.
       *  Soft amber glow ring + warm shadow so the dialog reads as
       *  "FlyttGo brand surface", not as a generic GDPR banner. */}
      <div className="relative rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,23,42,0.4)] ring-1 ring-amber-300/30 overflow-hidden bg-white">
        {/* Ink-navy header band with the cookie icon as a brand
         *  motif, gradient orb behind it for the next-gen sheen. */}
        <div className="relative bg-ink-900 text-white px-5 sm:px-6 py-4 overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/40 via-fuchsia-500/10 to-transparent blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-ink-900 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                  FlyttGo · GDPR
                </p>
                <h2 className="text-sm font-extrabold text-white truncate">
                  We use cookies
                </h2>
              </div>
            </div>
            <button
              type="button"
              aria-label="Reject non-essential cookies"
              onClick={() => save('essential')}
              className="text-white/60 hover:text-white flex-shrink-0 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body. */}
        <div className="px-5 sm:px-6 py-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            FlyttGo uses essential cookies to keep you signed in and your booking flow working.
            We&apos;d also like to use analytics cookies to understand how customers use the site
            so we can make it better. You can change your choice any time.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              type="button"
              onClick={() => save('essential')}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => save('all')}
              className="flex-1 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-xl text-sm font-bold transition shadow-lg shadow-amber-500/30"
            >
              Accept all
            </button>
          </div>

          <p className="text-[10px] text-slate-400 mt-3 text-center">
            See our <a href="/privacy" className="text-amber-700 hover:underline font-semibold">privacy policy</a> for details.
          </p>
        </div>
      </div>
    </div>
  );
}
