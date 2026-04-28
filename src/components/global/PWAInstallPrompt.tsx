import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

/**
 * Custom PWA install prompt.
 *
 * Listens for the `beforeinstallprompt` event the browser fires when
 * the manifest qualifies for install. Suppresses the browser's mini
 * infobar (preventDefault) and surfaces our own toast — a small
 * marketplace-tinted card with an "Install app" CTA.
 *
 * - Dismissed once → suppressed for 30 days via localStorage.
 * - Already installed (display-mode: standalone) → never shows.
 * - iOS Safari doesn't fire the event but we surface a soft hint
 *   ("Tap Share → Add to Home Screen") for iOS users on the home
 *   page after 20 seconds.
 */

const STORAGE_KEY = 'flyttgo_pwa_prompt_dismissed_at';
const COOLDOWN_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [evt,    setEvt]    = useState<BeforeInstallPromptEvent | null>(null);
  const [iosTip, setIosTip] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    /* Already installed → never show. */
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    /* Honour the cooldown if recently dismissed. */
    const dismissedAt = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) return;

    const onBefore = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBefore);

    /* iOS Safari fallback — show a soft hint after 20s on the
     * marketing surfaces. UA-sniffing is the practical path here;
     * iOS Safari intentionally never fires beforeinstallprompt. */
    const ua = navigator.userAgent;
    const isIOSSafari = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIOSSafari) {
      iosTimer = setTimeout(() => setIosTip(true), 20000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
  }

  async function install() {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    setEvt(null);
    if (outcome === 'accepted') {
      setHidden(true);
    } else {
      dismiss();
    }
  }

  if (hidden || (!evt && !iosTip)) return null;

  return (
    <div
      role="dialog"
      aria-label="Install FlyttGo app"
      className="fixed bottom-20 lg:bottom-4 inset-x-3 sm:left-auto sm:right-4 sm:w-80 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 animate-in slide-in-from-bottom-2 duration-300"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
      >
        <X size={14} />
      </button>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
          <Smartphone size={20} />
        </div>
        <div>
          <p className="font-extrabold text-slate-900 text-sm leading-tight">Install FlyttGo</p>
          <p className="text-xs text-slate-500 mt-0.5">Quotes, tracking, support — one tap from your home screen.</p>
        </div>
      </div>
      {evt ? (
        <button
          onClick={install}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-sm transition"
        >
          <Download size={14} /> Install app
        </button>
      ) : (
        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">
          Tap the <strong>Share</strong> button in Safari, then{' '}
          <strong>Add to Home Screen</strong> to install FlyttGo.
        </p>
      )}
    </div>
  );
}
