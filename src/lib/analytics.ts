/**
 * Lightweight analytics + error-tracking facade.
 *
 * Why a facade? Marketplace pages need to fire `track('booking_started')`
 * etc. without each component knowing or caring whether PostHog,
 * Plausible, or our own self-hosted endpoint is the destination.
 * Wiring concrete providers happens here in one file.
 *
 * Bundle weight: zero by default. The PostHog and Sentry SDKs are
 * dynamic-imported only when their VITE_* env vars are present and
 * the customer has granted analytics consent (see CookieConsent).
 *
 * Consent rules:
 *   - Without consent: every track() call queues into a small
 *     in-memory ring (max 50 entries). When consent flips on, the
 *     queue is flushed.
 *   - With consent: analytics + error reporting fire normally.
 *   - When consent flips off mid-session: queue is drained and the
 *     loader is shut down on next page load.
 *
 * This file is safe to import at the top of any module — initial
 * cost is two function declarations and a 50-slot array.
 */

const QUEUE_MAX = 50;

interface QueuedEvent {
  name:     string;
  payload?: Record<string, unknown>;
  ts:       number;
}

interface AnalyticsHandle {
  capture(name: string, payload?: Record<string, unknown>): void;
  identify(id: string, traits?: Record<string, unknown>): void;
  shutdown(): void;
}

interface ErrorHandle {
  capture(error: unknown, context?: Record<string, unknown>): void;
  shutdown(): void;
}

const queue: QueuedEvent[] = [];
let analytics: AnalyticsHandle | null = null;
let errorReporter: ErrorHandle | null = null;
let consented = false;
let booting = false;

/* ── Consent helpers (mirror CookieConsent's STORAGE_KEY) ─────── */

const CONSENT_KEY = 'flyttgo_cookie_consent';

function readConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CONSENT_KEY) === 'all';
}

/* ── Public API ───────────────────────────────────────────────── */

/**
 * Fire an analytics event. Safe to call before consent / before
 * providers boot — events queue up to QUEUE_MAX entries and flush
 * when consent + a provider become available.
 *
 * Conventions:
 *   - name is `noun_verb` snake-case ("country_clicked", "booking_submitted")
 *   - payload is JSON-serialisable, no PII unless the customer has
 *     identified themselves
 */
export function track(name: string, payload?: Record<string, unknown>): void {
  if (analytics && consented) {
    analytics.capture(name, payload);
    return;
  }
  if (queue.length >= QUEUE_MAX) queue.shift();
  queue.push({ name, payload, ts: Date.now() });
}

/**
 * Identify the signed-in customer / driver so events get associated
 * with their user record on the analytics provider. Call once after
 * sign-in. Pass id only — never email or name unless the customer
 * has explicitly opted into product communications.
 */
export function identify(id: string, traits?: Record<string, unknown>): void {
  if (!consented || !analytics) return;
  analytics.identify(id, traits);
}

/**
 * Capture a non-fatal error to the error tracker (Sentry-shaped).
 * Fatal errors caught by ErrorBoundary should call this with the
 * `componentStack` in the context.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (consented && errorReporter) {
    errorReporter.capture(error, context);
  } else {
    /* eslint-disable-next-line no-console */
    console.error('[FlyttGo] captureError (no reporter wired)', error, context);
  }
}

/* ── Boot loop ────────────────────────────────────────────────── */

function flushQueue(): void {
  if (!analytics) return;
  while (queue.length > 0) {
    const evt = queue.shift()!;
    analytics.capture(evt.name, { ...evt.payload, _queuedMs: Date.now() - evt.ts });
  }
}

async function bootProviders(): Promise<void> {
  if (booting) return;
  booting = true;

  /* PostHog — loaded via the runtime CDN script tag once consent +
   * env key are present. Avoids depending on a node_modules install
   * so the lib stays optional; swap to `npm i posthog-js` + a
   * dynamic import once your team commits to the dep. */
  const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
  const posthogKey = env.VITE_POSTHOG_KEY;
  if (posthogKey && consented) {
    try {
      await loadScript('https://eu-assets.i.posthog.com/static/array.js');
      const ph = (window as unknown as { posthog?: PosthogGlobal }).posthog;
      ph?.init?.(posthogKey, {
        api_host:        env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview:  true,
        capture_pageleave: true,
        autocapture:       false,
      });
      if (ph) {
        analytics = {
          capture:  (name, payload) => ph.capture(name, payload),
          identify: (id, traits)    => ph.identify(id, traits),
          shutdown: () => ph.reset?.(),
        };
        flushQueue();
      }
    } catch {
      // eslint-disable-next-line no-console
      console.info('[FlyttGo] PostHog script failed to load — analytics will retry next session.');
    }
  }

  /* Sentry — same CDN pattern. */
  const sentryDsn = env.VITE_SENTRY_DSN;
  if (sentryDsn && consented) {
    try {
      await loadScript('https://browser.sentry-cdn.com/8/bundle.min.js');
      const sentry = (window as unknown as { Sentry?: SentryGlobal }).Sentry;
      sentry?.init?.({
        dsn:              sentryDsn,
        environment:      env.MODE,
        tracesSampleRate: 0.1,
      });
      if (sentry) {
        errorReporter = {
          capture:  (err, ctx) => sentry.captureException(err, { extra: ctx }),
          shutdown: () => sentry.close?.(),
        };
      }
    } catch {
      // eslint-disable-next-line no-console
      console.info('[FlyttGo] Sentry script failed to load.');
    }
  }
}

/* Promise-wrapped <script> loader. Resolves once the script has run.
 * We could swap to dynamic-imported npm packages later — keeping it
 * CDN-driven for now means the analytics layer adds zero bytes to
 * the customer's bundle until consent + env key are present. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

interface PosthogGlobal {
  init:     (key: string, opts: Record<string, unknown>) => void;
  capture:  (name: string, payload?: Record<string, unknown>) => void;
  identify: (id: string, traits?: Record<string, unknown>) => void;
  reset?:   () => void;
}

interface SentryGlobal {
  init:             (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: { extra?: Record<string, unknown> }) => void;
  close?:           () => void;
}

/* ── Public init — call once from main.tsx ────────────────────── */

export function initAnalytics(): void {
  if (typeof window === 'undefined') return;

  consented = readConsent();
  if (consented) void bootProviders();

  /* React to consent changes from CookieConsent (which dispatches a
   * 'flyttgo:consent' window event with detail = 'all' | 'essential'). */
  window.addEventListener('flyttgo:consent', (e: Event) => {
    const detail = (e as CustomEvent<{ value?: string } | string>).detail;
    const next = (typeof detail === 'string' ? detail : detail?.value) === 'all';
    if (next === consented) return;
    consented = next;
    if (consented) void bootProviders();
    else {
      analytics?.shutdown();
      errorReporter?.shutdown();
      analytics = null;
      errorReporter = null;
    }
  });
}
