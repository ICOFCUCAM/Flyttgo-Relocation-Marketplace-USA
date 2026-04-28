import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    /* Workbox-driven service worker.
     *
     *   - Auto-update mode: when a new SW is detected we update in
     *     the background and reload on next navigation. The PWA
     *     install prompt component handles "new version available"
     *     messaging.
     *   - Precache: every JS / CSS / font / image emitted by the
     *     build (Workbox computes this from the manifest).
     *   - Runtime cache:
     *       · /api / Supabase / Stripe → NetworkFirst with 5s
     *         timeout so the customer never sees stale booking data
     *       · Unsplash + Google Fonts → CacheFirst (immutable URLs)
     *       · Nominatim address suggestions → StaleWhileRevalidate
     *         so typing the same address twice in a session is
     *         instant
     *   - Offline fallback: any failed navigation falls through to
     *     /offline.html which we ship as a static asset.
     *
     * Disabled in dev (the SW would shadow HMR). Run `npm run build &&
     * npm run preview` to test offline behaviour locally. */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.svg',
        'og.svg',
        'robots.txt',
      ],
      manifest: false, // we ship our own /public/manifest.json
      workbox: {
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/auth\/callback/,
          /^\/admin/,
          /^\/_/,
        ],
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z0-9.-]+\.supabase\.co\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.stripe\.com\/.*$/i,
            handler: 'NetworkOnly', // never cache Stripe API responses
          },
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'nominatim-suggestions',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /* Manual chunk splitting. Without this, every third-party
         * package ends up in a single ~600 kB `index.js` chunk that
         * invalidates on every app-code change and wastes customer
         * bandwidth. Splitting by category gives us:
         *
         *   - react-vendor         ~140 kB — rarely changes
         *   - supabase-vendor      ~100 kB — rarely changes
         *   - i18n-vendor          ~50 kB  — rarely changes
         *   - ui-vendor            ~180 kB — rarely changes
         *   - index                ~100 kB — app code, changes on every deploy
         *
         * Returning customers keep the vendor chunks in browser cache
         * across deploys, so the "new version" download is smaller
         * and page loads are faster. */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          /* React core and hooks — changes very rarely. */
          if (id.includes('/react/')
              || id.includes('/react-dom/')
              || id.includes('/scheduler/')
              || id.includes('/react-router')) {
            return 'react-vendor';
          }

          /* Supabase client + its WebSocket/realtime deps. */
          if (id.includes('@supabase/')
              || id.includes('/postgrest-js/')
              || id.includes('/realtime-js/')) {
            return 'supabase-vendor';
          }

          /* i18n: react-i18next + i18next + language detector. */
          if (id.includes('/i18next')
              || id.includes('/react-i18next/')) {
            return 'i18n-vendor';
          }

          /* Radix UI + shadcn bits + lucide icons. Pretty chunky. */
          if (id.includes('@radix-ui/')
              || id.includes('/lucide-react/')
              || id.includes('/class-variance-authority/')
              || id.includes('/clsx/')
              || id.includes('/tailwind-merge/')) {
            return 'ui-vendor';
          }

          /* React Query — used across dashboards. */
          if (id.includes('@tanstack/')) {
            return 'query-vendor';
          }

          /* Everything else in node_modules ends up in a generic
           * 'vendor' bundle so we don't accidentally leave
           * anything uncategorised back in the main index chunk. */
          return 'vendor';
        },
      },
    },
    /* We've split the bundle, so the 500 kB warning threshold is
     * redundant — raise it slightly so the build isn't flagged for
     * non-actionable warnings. */
    chunkSizeWarningLimit: 800,
  },
}));
