/* ─────────────────────────────────────────────────────────────────
 * BOS sub-routing
 *
 * The whole back-office sits behind a single Page id ('backoffice')
 * in the global store. Inside, pages are addressed by URL slug —
 * /backoffice/markets, /backoffice/payments, etc. — parsed from
 * window.location.pathname and dispatched by index.tsx.
 *
 * The sub-router is intentionally lo-fi (no react-router) to match
 * the rest of the app's "URL is just a slug" pattern (see
 * ServiceCategoryPage / CorridorPage / MovingCityPage).
 * ───────────────────────────────────────────────────────────────── */

export const BOS_SLUGS = [
  'dashboard',
  'markets',
  'payments',
  'accounting',
  /* `audit` = the auditor-facing read-only workspace (annotations,
   * GL inspector, attachments register). Distinct from `audit-log`
   * which is the platform-wide append-only mutation log. */
  'audit',
  /* Treasury layer — wallet balances, escrow held, payout queue,
   * KYC status. Distinct from `payments` (which is the central
   * payment-processor view) and `accounting` (the ledger). */
  'treasury',
  'invoices',
  'super-admin',
  'audit-log',
  'feature-flags',
] as const;

export type BosSlug = typeof BOS_SLUGS[number];

const SLUG_SET: ReadonlySet<string> = new Set(BOS_SLUGS);

export function readBosSlug(pathname?: string): BosSlug {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const m = path.match(/^\/backoffice(?:\/([a-z0-9-]+))?\/?$/i);
  if (!m) return 'dashboard';
  const seg = m[1]?.toLowerCase();
  if (seg && SLUG_SET.has(seg)) return seg as BosSlug;
  return 'dashboard';
}

export function bosSlugPath(slug: BosSlug): string {
  return slug === 'dashboard' ? '/backoffice' : `/backoffice/${slug}`;
}
