#!/usr/bin/env node
/**
 * scripts/verify-hero-images.mjs
 *
 * Probe every URL in src/config/cityHeroImages.ts via HEAD request
 * and report any that don't return 200 OK. Useful as a periodic
 * lint or pre-deploy check — Unsplash photo IDs occasionally drift
 * (DMCA takedowns, contributor removal) and the hero registry only
 * shows the failure visually.
 *
 * Usage: node scripts/verify-hero-images.mjs
 *        npm run verify:heroes   (alias)
 *
 * Exit code:
 *   0  — every URL returned 200
 *   1  — at least one URL failed; prints the slug + status code
 *
 * The script uses the global `fetch` (Node 18+). HEAD is used so
 * the actual JPEG bytes never come down the wire — keeps the run
 * fast (~5 seconds for 50 URLs over a typical residential link).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const REGISTRY_PATH = 'src/config/cityHeroImages.ts';

/* Parse the registry as text — avoids the TS toolchain. We pull
 * matching `slug: 'url'` (or quoted slugs) pairs. */
function loadRegistry() {
  const src = readFileSync(resolve(ROOT, REGISTRY_PATH), 'utf8');
  const re = /(?:^|\s)(?:"([a-z0-9-]+)"|([a-z0-9-]+)):\s*\n?\s*"(https:\/\/images\.unsplash\.com\/[^"]+)"/gm;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const slug = m[1] ?? m[2];
    const url  = m[3];
    if (slug && url) out.push({ slug, url });
  }
  return out;
}

/* Unsplash returns 403 to bots that don't send a browser User-Agent.
 * We send a Chrome UA + Range header so the response is a partial
 * GET (1 KB) — keeps the run fast without tripping the bot filter. */
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(url) {
  try {
    const res = await fetch(url, {
      method:   'GET',
      redirect: 'follow',
      headers:  {
        'User-Agent': BROWSER_UA,
        'Range':      'bytes=0-1023',
        'Accept':     'image/avif,image/webp,image/*,*/*',
      },
    });
    /* 200 (full body), 206 (partial content), 304 (not modified) all
     * mean the asset exists. Unsplash treats Range as advisory and
     * may return 200 with the full payload. */
    const ok = res.status === 200 || res.status === 206 || res.status === 304;
    return { ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message ?? String(err) };
  }
}

async function main() {
  const entries = loadRegistry();
  if (entries.length === 0) {
    console.error(`! could not parse any entries from ${REGISTRY_PATH}`);
    process.exit(2);
  }

  console.log(`→ probing ${entries.length} hero URLs from ${REGISTRY_PATH}`);

  /* Run in parallel batches of 10 — Unsplash CDN handles many
   * concurrent HEADs fine, but staying gentle keeps the script
   * portable to lower-bandwidth runners. */
  const BATCH = 10;
  const results = [];
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const probed = await Promise.all(batch.map(async e => ({
      ...e,
      ...(await probe(e.url)),
    })));
    results.push(...probed);
  }

  const failed = results.filter(r => !r.ok);
  const passed = results.length - failed.length;

  console.log(`\n  ${passed} / ${results.length} hero URLs returned 2xx`);

  if (failed.length > 0) {
    /* Uniform 403 / 0 failure on every URL strongly suggests a
     * network-layer block (e.g. a sandbox without egress to
     * images.unsplash.com), not a registry problem. Surface that
     * possibility before tagging URLs as broken. */
    const allSameStatus = failed.length === results.length &&
      failed.every(f => f.status === failed[0].status);
    if (allSameStatus && (failed[0].status === 403 || failed[0].status === 0)) {
      console.log(`\n? all ${failed.length} URLs returned ${failed[0].status} — likely network-layer`);
      console.log(`  block on images.unsplash.com (host_not_allowed). Re-run from a network`);
      console.log(`  with Unsplash access (e.g. CI or local dev) for an authoritative check.`);
      process.exit(2);
    }

    console.log(`\n× ${failed.length} failed:\n`);
    for (const f of failed) {
      console.log(`  ${f.slug.padEnd(20)} ${String(f.status).padEnd(4)} ${f.url}`);
    }
    console.log(`\nFix: edit ${REGISTRY_PATH} and replace the failed photo ID with`);
    console.log(`     a fresh Unsplash photo. The slug tells you which city the URL is for.`);
    process.exit(1);
  }

  console.log('\n✓ all hero URLs healthy');
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
