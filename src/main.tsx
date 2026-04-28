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
 * The SW is responsible for offline support, asset cache-first, and
 * the /offline.html navigation fallback. autoUpdate mode handles new
 * deployments without a hard reload. Wrapped in a feature check so
 * non-secure dev / older browsers no-op silently. */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl) {
        // eslint-disable-next-line no-console
        console.info('[FlyttGo] Service worker registered:', swUrl);
      },
      onOfflineReady() {
        // eslint-disable-next-line no-console
        console.info('[FlyttGo] Ready to work offline.');
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
