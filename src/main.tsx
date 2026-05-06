import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './lib/i18n'; // initialise i18next before any component renders
import './index.css';
import { initAnalytics } from './lib/analytics';

/* Boot the analytics + error-tracking facade. No-op until the
 * customer grants cookie consent AND VITE_POSTHOG_KEY / VITE_SENTRY_DSN
 * are set in the environment. Events fired before consent are queued
 * (max 50) and flushed when consent + provider become available. */
initAnalytics();

/* Register the Workbox service worker (built by vite-plugin-pwa).
 *
 * Update flow: registerType: 'prompt' in vite.config — when a new
 * SW is waiting, we surface a sonner toast asking the user to
 * reload. This avoids the silent-autoUpdate failure mode where a
 * customer mid-booking loses unsaved form state to an unannounced
 * page refresh.
 *
 * onOfflineReady fires once on first install so the user knows the
 * app is now offline-capable. Wrapped in a feature check so
 * non-secure dev / older browsers no-op silently.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void Promise.all([
    import('virtual:pwa-register'),
    import('sonner'),
  ]).then(([{ registerSW }, { toast }]) => {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(swUrl) {
        // eslint-disable-next-line no-console
        console.info('[FlyttGo] Service worker registered:', swUrl);
      },
      onOfflineReady() {
        // eslint-disable-next-line no-console
        console.info('[FlyttGo] Ready to work offline.');
        toast.success('Ready to work offline', {
          description: 'FlyttGo will keep working without a connection.',
          duration: 4000,
        });
      },
      onNeedRefresh() {
        toast.message('New version available', {
          description: 'Reload to pick up the latest FlyttGo.',
          duration: Infinity,
          action: {
            label: 'Reload',
            onClick: () => { void updateSW(true); },
          },
        });
      },
      onRegisterError(error) {
        // eslint-disable-next-line no-console
        console.warn('[FlyttGo] Service worker registration failed:', error);
      },
    });
  }).catch(() => { /* PWA plugin disabled — silently no-op */ });
}

// toFixed safety patch
const origToFixed = Number.prototype.toFixed;
Number.prototype.toFixed = function(digits?: number) {
  const n = isNaN(Number(this)) ? 0 : Number(this);
  return origToFixed.call(n, digits);
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
