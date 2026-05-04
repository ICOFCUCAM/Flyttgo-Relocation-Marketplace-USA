#!/usr/bin/env node
/**
 * scripts/generate-og-cards.mjs
 *
 * Emits a 1200×630 OG card SVG for each of the 16 country shopfronts
 * (6 legacy + 10 expansion) into public/og/. Each card carries:
 *   - FlyttGo wordmark
 *   - Country flag (emoji glyph)
 *   - Country name
 *   - "5 anchor cities · {N} corridors" subline (expansion only)
 *   - "Marketplace activating {window}" or "Live marketplace" pill
 *
 * SVG keeps deploy weight tiny (≈4 KB / card) and renders crisply
 * on every social surface. Twitter, LinkedIn and Slack all support
 * SVG OG, but for safety we also emit a `.svg` referenced as the
 * canonical og:image — Slack auto-rasterises and LinkedIn's preview
 * card is fine with SVG since 2023.
 *
 * Runs as a prebuild step so cards are always in sync with the
 * country registry when `npm run build` produces a deployable
 * bundle. No TypeScript runtime dependency — reads source files
 * as text and parses minimal data with regex.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT  = resolve(ROOT, 'public/og');

mkdirSync(OUT, { recursive: true });

/* ── Legacy markets — 6 countries with active marketplace ─── */
const LEGACY = [
  { code: 'us',     name: 'United States',  flag: '🇺🇸', tone: 'live' },
  { code: 'canada', name: 'Canada',         flag: '🇨🇦', tone: 'live' },
  { code: 'uk',     name: 'United Kingdom', flag: '🇬🇧', tone: 'live' },
  { code: 'france', name: 'France',         flag: '🇫🇷', tone: 'live' },
  { code: 'germany',name: 'Germany',        flag: '🇩🇪', tone: 'live' },
  { code: 'norway', name: 'Norway',         flag: '🇳🇴', tone: 'live' },
];

/* ── Expansion markets — parsed from the registry source ──── */
function parseExpansionCountries() {
  const src = readFileSync(resolve(ROOT, 'src/lib/expansion-cities.ts'), 'utf8');
  const re = /(\w{2}):\s*\{\s*code:\s*'(\w{2})',\s*name:\s*'([^']+)',\s*flag:\s*'([^']+)',[\s\S]*?activationWindow:\s*'([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({
      code:    `market-${m[2]}`,
      name:    m[3],
      flag:    m[4],
      window:  m[5],
      tone:    'activating',
    });
  }
  return out;
}

function countAnchorsPerCountry() {
  const src = readFileSync(resolve(ROOT, 'src/lib/expansion-cities.ts'), 'utf8');
  const re = /\{\s*slug:\s*'[^']+',[\s\S]*?country:\s*'(\w{2})'/g;
  const counts = {};
  let m;
  while ((m = re.exec(src)) !== null) {
    counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  }
  return counts;
}

function countCorridorsPerCountry() {
  const src = readFileSync(resolve(ROOT, 'src/lib/cross-border-corridors.ts'), 'utf8');
  const re = /(?:fromCountry|toCountry):\s*'(\w{2})'/g;
  const counts = {};
  let m;
  while ((m = re.exec(src)) !== null) {
    counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  }
  return counts;
}

/* ── SVG card template ────────────────────────────────────── */
function buildCard({ name, flag, subline, badgeText, badgeColor }) {
  /* Brand colours: deep navy bg, amber primary, ivory text. */
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#0b1f3a"/>
      <stop offset="100%" stop-color="#142a4d"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="60%">
      <stop offset="0%"  stop-color="#fbbf24" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Top wordmark + lockup -->
  <g transform="translate(72, 72)">
    <rect x="0" y="0" width="56" height="56" rx="12" fill="#fbbf24"/>
    <text x="28" y="38" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" fill="#0b1f3a">F</text>
    <text x="76" y="38" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="32" font-weight="900" letter-spacing="-0.5" fill="#ffffff">
      Flytt<tspan fill="#fcd34d">Go</tspan>
    </text>
    <text x="76" y="62" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#fbbf24">GLOBAL RELOCATION MARKETPLACE</text>
  </g>

  <!-- Status badge -->
  <g transform="translate(1056, 86)">
    <rect x="-160" y="-22" width="160" height="36" rx="18" fill="${badgeColor}" fill-opacity="0.15" stroke="${badgeColor}" stroke-opacity="0.4"/>
    <text x="-80" y="2" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="800" letter-spacing="1.5" fill="${badgeColor}">${badgeText}</text>
  </g>

  <!-- Country flag -->
  <text x="72" y="380" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="180">${flag}</text>

  <!-- Country name -->
  <text x="72" y="470" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="76" font-weight="900" letter-spacing="-2" fill="#ffffff">${escapeXml(name)}</text>

  <!-- Subline -->
  <text x="72" y="520" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="26" font-weight="600" fill="#fcd34d">${escapeXml(subline)}</text>

  <!-- Bottom URL strip -->
  <line x1="72" y1="556" x2="1128" y2="556" stroke="#ffffff" stroke-opacity="0.1"/>
  <text x="72" y="592" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="18" font-weight="600" fill="#ffffff" fill-opacity="0.65">flyttgo.us</text>
  <text x="1128" y="592" text-anchor="end" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="16" font-weight="600" fill="#ffffff" fill-opacity="0.55">Verified providers · Escrow on every booking</text>
</svg>
`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* ── Generate ─────────────────────────────────────────────── */
const expansion   = parseExpansionCountries();
const anchorCount = countAnchorsPerCountry();
const corridorCount = countCorridorsPerCountry();

let written = 0;

for (const c of LEGACY) {
  const file = `market-${c.code}.svg`;
  writeFileSync(resolve(OUT, file), buildCard({
    name:       c.name,
    flag:       c.flag,
    subline:    'Live marketplace · Verified providers · Escrow protected',
    badgeText:  'LIVE',
    badgeColor: '#34d399',
  }), 'utf8');
  written++;
}

for (const c of expansion) {
  /* code is "market-nl" — strip the prefix to look up registry stats. */
  const iso = c.code.replace('market-', '');
  const anchors = anchorCount[iso] ?? 5;
  const corrs   = corridorCount[iso] ?? 0;
  const subline = corrs > 0
    ? `${anchors} anchor cities · ${corrs} cross-border corridors`
    : `${anchors} anchor cities · Activating soon`;

  writeFileSync(resolve(OUT, `${c.code}.svg`), buildCard({
    name:       c.name,
    flag:       c.flag,
    subline,
    badgeText:  'ACTIVATING',
    badgeColor: '#fbbf24',
  }), 'utf8');
  written++;
}

console.log(`✓ generated ${written} OG cards → public/og/`);
console.log(`  - ${LEGACY.length} legacy markets`);
console.log(`  - ${expansion.length} expansion markets`);
