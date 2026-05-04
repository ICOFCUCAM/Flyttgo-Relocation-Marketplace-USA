#!/usr/bin/env node
/**
 * scripts/generate-sitemap.mjs
 *
 * Emits public/sitemap.xml from the canonical content sources:
 *   - src/components/seo/seo-content.ts   (per-corridor URLs)
 *   - src/lib/service-categories.ts       (per-service URLs)
 *   - static base list maintained here    (every other public page)
 *
 * Runs as a prebuild step so the sitemap is always fresh when
 * `npm run build` produces a deployable bundle. No TypeScript
 * runtime dependency — the script reads the source files as text
 * and extracts the dynamic URL keys with regex. Adding a new
 * corridor or category doesn't require touching this script —
 * just regenerate.
 *
 * Output structure follows sitemaps.org/0.9 with hreflang alternates
 * on the corridor URLs (Canada en/fr share the same slug set so the
 * pair can be linked as language siblings).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const ORIGIN = 'https://flyttgo.us';
const TODAY = new Date().toISOString().slice(0, 10);

/* ─────────────────────────────────────────────────────────────────
 * Static URL list — every page in the app except the ones we'd
 * rather Google not crawl (auth surfaces, dashboards, payment).
 * Kept here rather than parsed out of pageRoutes.ts because we
 * want explicit priority / changefreq control per URL.
 * ───────────────────────────────────────────────────────────────── */

/** @typedef {{ path: string; changefreq: string; priority: string }} StaticUrl */

/** @type {StaticUrl[]} */
const STATIC_URLS = [
  /* Top-level marketing */
  { path: '/',                     changefreq: 'weekly',  priority: '1.0' },
  { path: '/marketplace',          changefreq: 'weekly',  priority: '0.95' },
  { path: '/how-it-works',         changefreq: 'monthly', priority: '0.9' },
  { path: '/cities',               changefreq: 'monthly', priority: '0.9' },
  { path: '/services',             changefreq: 'monthly', priority: '0.9' },
  { path: '/pricing',              changefreq: 'monthly', priority: '0.9' },
  { path: '/about',                changefreq: 'monthly', priority: '0.8' },
  { path: '/contact',              changefreq: 'monthly', priority: '0.8' },
  { path: '/help',                 changefreq: 'monthly', priority: '0.7' },
  { path: '/faq',                  changefreq: 'monthly', priority: '0.7' },
  { path: '/safety',               changefreq: 'monthly', priority: '0.7' },
  { path: '/sustainability',       changefreq: 'monthly', priority: '0.6' },
  { path: '/press',                changefreq: 'monthly', priority: '0.5' },
  { path: '/careers',              changefreq: 'weekly',  priority: '0.6' },
  { path: '/refer',                changefreq: 'monthly', priority: '0.75' },
  { path: '/van-size-guide',       changefreq: 'monthly', priority: '0.8' },
  { path: '/moving-checklist',     changefreq: 'monthly', priority: '0.7' },

  /* Country shopfronts */
  { path: '/us',                   changefreq: 'weekly',  priority: '0.95' },
  { path: '/canada',               changefreq: 'weekly',  priority: '0.95' },
  { path: '/uk',                   changefreq: 'weekly',  priority: '0.95' },
  { path: '/france',               changefreq: 'weekly',  priority: '0.95' },
  { path: '/germany',              changefreq: 'weekly',  priority: '0.95' },
  { path: '/norway',               changefreq: 'weekly',  priority: '0.95' },

  /* Expansion-country shopfronts (Phase 13). First wave + second wave —
   * each is a rollout-status SEO surface; full marketplace activates
   * as providers register. */
  { path: '/market-nl',            changefreq: 'weekly',  priority: '0.85' },
  { path: '/market-se',            changefreq: 'weekly',  priority: '0.85' },
  { path: '/market-es',            changefreq: 'weekly',  priority: '0.85' },
  { path: '/market-it',            changefreq: 'weekly',  priority: '0.85' },
  { path: '/market-pl',            changefreq: 'weekly',  priority: '0.85' },
  { path: '/market-dk',            changefreq: 'weekly',  priority: '0.80' },
  { path: '/market-be',            changefreq: 'weekly',  priority: '0.80' },
  { path: '/market-at',            changefreq: 'weekly',  priority: '0.80' },
  { path: '/market-ch',            changefreq: 'weekly',  priority: '0.80' },
  { path: '/market-cz',            changefreq: 'weekly',  priority: '0.80' },

  /* Provider funnel */
  { path: '/providers',            changefreq: 'monthly', priority: '0.9' },
  { path: '/providers/directory',  changefreq: 'weekly',  priority: '0.9' },
  { path: '/providers/requirements', changefreq: 'monthly', priority: '0.85' },
  { path: '/become-a-driver',      changefreq: 'monthly', priority: '0.8' },
  { path: '/driver-subscriptions', changefreq: 'monthly', priority: '0.7' },
  { path: '/compare',              changefreq: 'weekly',  priority: '0.7' },

  /* Enterprise + institutional */
  { path: '/enterprise-relocation',          changefreq: 'monthly', priority: '0.9' },
  { path: '/universities',                    changefreq: 'monthly', priority: '0.85' },
  { path: '/government-programs',             changefreq: 'monthly', priority: '0.85' },
  { path: '/ngo-deployment',                  changefreq: 'monthly', priority: '0.85' },
  { path: '/pilot-deployment-programs',       changefreq: 'monthly', priority: '0.85' },
  { path: '/deployment-regions',              changefreq: 'monthly', priority: '0.85' },
  { path: '/compliance',                      changefreq: 'monthly', priority: '0.85' },
  { path: '/compliance/vendor-pack',          changefreq: 'monthly', priority: '0.85' },
  { path: '/procurement/rfp',                 changefreq: 'monthly', priority: '0.9' },
  { path: '/resources/capability-brief',      changefreq: 'monthly', priority: '0.8' },
  { path: '/partners',                         changefreq: 'monthly', priority: '0.85' },
  { path: '/business',                         changefreq: 'monthly', priority: '0.8' },
  { path: '/business/bulk-booking',           changefreq: 'monthly', priority: '0.6' },
  { path: '/business/recurring-deliveries',   changefreq: 'monthly', priority: '0.6' },

  /* Booking funnel — single index, not the per-step URLs */
  { path: '/book',                 changefreq: 'monthly', priority: '0.9' },
  { path: '/track',                changefreq: 'weekly',  priority: '0.8' },
  { path: '/request-quote',        changefreq: 'monthly', priority: '0.85' },

  /* Legal — yearly cadence is right; low priority because they
   * shouldn't compete with marketing pages for crawl budget. */
  { path: '/terms',                changefreq: 'yearly',  priority: '0.3' },
  { path: '/privacy',              changefreq: 'yearly',  priority: '0.3' },
  { path: '/liability',            changefreq: 'yearly',  priority: '0.3' },
  { path: '/driver-terms',         changefreq: 'yearly',  priority: '0.3' },
  { path: '/dispute',              changefreq: 'monthly', priority: '0.6' },
];

/* ─────────────────────────────────────────────────────────────────
 * Dynamic URL extractors — pull slugs out of the source-of-truth
 * data files via regex. Less robust than a real TS import, but
 * has zero build dependency and is trivially debuggable.
 * ───────────────────────────────────────────────────────────────── */

function readSource(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

/** Extract corridor (countryCode, slug) pairs from seo-content.ts.
 *  The source has a Record<SEOCountryCode, ContentByLang> shape;
 *  we walk each top-level country block and collect every `slug:`
 *  literal under it. Slugs are stable across locales so we de-dupe
 *  by (country, slug). */
function extractCorridors() {
  const src = readSource('src/components/seo/seo-content.ts');
  const out = []; // { country, slug }
  const COUNTRIES = ['us', 'ca', 'uk', 'fr', 'de', 'no'];

  for (const country of COUNTRIES) {
    /* Top-level country keys are indented exactly 2 spaces in
     * seo-content.ts; nested language keys (en/fr/de/nb) live at
     * 4 spaces. Anchoring the regex to "^  <country>: {" with the
     * multiline flag prevents the matcher from mistaking the
     * nested `fr: {` inside Canada for the top-level France
     * country block — which is what was dropping Canada-FR
     * corridors from the output. The lookahead uses the same
     * 2-space anchor so it only stops at the next top-level
     * country. */
    const others = COUNTRIES.filter(c => c !== country).join('|');
    const startRe = new RegExp(`^  ${country}: \\{[\\s\\S]*?(?=^  (?:${others}): \\{|^\\};)`, 'm');
    const m = src.match(startRe);
    if (!m) continue;

    const block = m[0];
    /* Within the block grab every `slug: '...'`. Each slug appears
     * once per corridor entry. */
    const slugRe = /slug:\s*'([a-z0-9-]+)'/g;
    const seen = new Set();
    let s;
    while ((s = slugRe.exec(block)) !== null) {
      if (!seen.has(s[1])) {
        seen.add(s[1]);
        out.push({ country, slug: s[1] });
      }
    }
  }
  return out;
}

/** Extract anchor city slugs from expansion-cities.ts. Each anchor
 *  city ships a /moving-<slug> SEO landing page. We pick up every
 *  `slug:` literal at the top level of the ANCHOR_CITIES array. */
function extractAnchorCitySlugs() {
  const src = readSource('src/lib/expansion-cities.ts');
  const slugRe = /\{\s*slug:\s*'([a-z0-9-]+)'/g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = slugRe.exec(src)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

/** Extract cross-border corridor slugs from cross-border-corridors.ts.
 *  Each corridor ships a /corridor/<fromCountry>/<slug> SEO landing
 *  page (the existing /corridor/ route already covers these). We
 *  collect (fromCountry, slug) pairs. */
function extractCrossBorderCorridors() {
  const src = readSource('src/lib/cross-border-corridors.ts');
  const re = /\{\s*slug:\s*'([a-z0-9-]+)'[\s\S]*?fromCountry:\s*'([a-z]{2})'/g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(src)) !== null) {
    const key = `${m[2]}/${m[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ country: m[2], slug: m[1] });
    }
  }
  return out;
}

/** Extract category slugs from service-categories.ts. */
function extractServiceCategories() {
  const src = readSource('src/lib/service-categories.ts');
  const slugRe = /slug:\s*'([a-z0-9-]+)'/g;
  const out = [];
  let m;
  while ((m = slugRe.exec(src)) !== null) {
    out.push(m[1]);
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────
 * XML emission
 * ───────────────────────────────────────────────────────────────── */

function urlNode({ path, changefreq, priority, alternates }) {
  const lines = [
    `  <url>`,
    `    <loc>${ORIGIN}${path}</loc>`,
    `    <lastmod>${TODAY}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
  ];
  if (alternates) {
    for (const alt of alternates) {
      lines.push(`    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${ORIGIN}${alt.path}" />`);
    }
  }
  lines.push(`  </url>`);
  return lines.join('\n');
}

function buildUrlSet(urls, comment) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- ${comment} -->`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join('\n');
}

function buildSitemapIndex(files) {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!--`,
    `  FlyttGo sitemap index — entry point Google reads first.`,
    `  Each <sitemap> below is a category-scoped urlset; splitting`,
    `  them lets Google crawl each surface independently and gives us`,
    `  per-category lastmod that doesn't churn on every static-page`,
    `  edit.`,
    `-->`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...files.map(f => [
      `  <sitemap>`,
      `    <loc>${ORIGIN}/${f}</loc>`,
      `    <lastmod>${TODAY}</lastmod>`,
      `  </sitemap>`,
    ].join('\n')),
    `</sitemapindex>`,
    ``,
  ].join('\n');
}

function buildSitemaps() {
  const corridors = extractCorridors();
  const categories = extractServiceCategories();
  const movingCities = extractAnchorCitySlugs();
  const crossBorderCorridors = extractCrossBorderCorridors();

  /* ── sitemap-static.xml — top-level marketing surfaces ──── */
  const staticUrls = STATIC_URLS.map(urlNode);

  /* ── sitemap-services.xml — service category landings ──── */
  const categoryUrls = categories.map(slug => urlNode({
    path:       `/services/${slug}`,
    changefreq: 'monthly',
    priority:   '0.85',
  }));

  /* ── sitemap-cities.xml — anchor city landings ─────────── */
  const movingCityUrls = movingCities.map(slug => urlNode({
    path:       `/moving-${slug}`,
    changefreq: 'weekly',
    priority:   '0.80',
  }));

  /* ── sitemap-corridors.xml — corridor landings (legacy +
   *    cross-border, same /corridor/<country>/<slug> URL shape) */
  const corridorUrls = corridors.map(({ country, slug }) => urlNode({
    path:       `/corridor/${country}/${slug}`,
    changefreq: 'monthly',
    priority:   '0.85',
  }));
  const crossBorderUrls = crossBorderCorridors.map(({ country, slug }) => urlNode({
    path:       `/corridor/${country}/${slug}`,
    changefreq: 'monthly',
    priority:   '0.80',
  }));

  return {
    'sitemap-static.xml':    buildUrlSet(staticUrls,    `Static pages — ${staticUrls.length} entries`),
    'sitemap-services.xml':  buildUrlSet(categoryUrls,  `Service category landings — ${categoryUrls.length} entries`),
    'sitemap-cities.xml':    buildUrlSet(movingCityUrls, `Strategic-city landings — ${movingCityUrls.length} entries`),
    'sitemap-corridors.xml': buildUrlSet([...corridorUrls, ...crossBorderUrls],
      `Corridor landings — ${corridorUrls.length + crossBorderUrls.length} entries`),
    counts: {
      static:    staticUrls.length,
      services:  categoryUrls.length,
      cities:    movingCityUrls.length,
      corridors: corridorUrls.length + crossBorderUrls.length,
    },
  };
}

const built = buildSitemaps();
const fileNames = ['sitemap-static.xml', 'sitemap-services.xml', 'sitemap-cities.xml', 'sitemap-corridors.xml'];

for (const name of fileNames) {
  writeFileSync(resolve(ROOT, 'public', name), built[name], 'utf8');
}

/* sitemap.xml is the index — Google's robots.txt + Search Console
 * point here, and it fans out to the four sub-sitemaps. */
writeFileSync(resolve(ROOT, 'public/sitemap.xml'), buildSitemapIndex(fileNames), 'utf8');

console.log(`✓ sitemap index written → public/sitemap.xml`);
console.log(`  - sitemap-static.xml    (${built.counts.static} URLs)`);
console.log(`  - sitemap-services.xml  (${built.counts.services} URLs)`);
console.log(`  - sitemap-cities.xml    (${built.counts.cities} URLs)`);
console.log(`  - sitemap-corridors.xml (${built.counts.corridors} URLs)`);
