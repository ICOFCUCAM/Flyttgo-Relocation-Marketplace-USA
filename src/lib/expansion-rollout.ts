/* ─────────────────────────────────────────────────────────────────
 * Expansion rollout — provider-density promotion logic
 *
 * Implements the four-level FlyttGo geographic rollout model
 * (see docs/marketplace-architecture.md §12):
 *
 *   LEVEL 1 — Country activation                (manual decision)
 *   LEVEL 2 — Auto city activation              (≥1 provider)
 *   LEVEL 3 — Strategic city landing pages      (anchor flag OR ≥3 providers)
 *   LEVEL 4 — Anchor / dispatch prioritization  (≥10 providers)
 *
 * Promotion thresholds:
 *   inactive  → active     when first provider registers
 *   active    → promoted   when 3rd provider registers
 *   promoted  → anchor     when 10th provider registers
 *
 * Anchor cities (designated via AnchorCity.anchorFlag) bypass the
 * density gate for `anchor` status — they're treated as anchors
 * for marketing + SEO from day one even if no provider has yet
 * registered. The density-based promotion still applies for
 * *non-anchor* cities so a tier-2 city that happens to attract a
 * cluster of providers gets promoted automatically.
 *
 * This is a pure function module — consumers (page templates,
 * dispatch matcher, sitemap generator) call computeCityStatus()
 * with a live providerCount and get the canonical status back.
 * ───────────────────────────────────────────────────────────────── */

import type { AnchorCity, CityStatus, DispatchPriority } from './expansion-cities';

export const PROMOTION_THRESHOLDS = {
  active:    1,
  promoted:  3,
  anchor:   10,
} as const;

export interface CityRolloutState {
  /** Live status — the result of feeding the static intent through
   *  the density rules. */
  status:           CityStatus;
  /** True when this city is the strategic anchor for its country
   *  (designated via AnchorCity.anchorFlag) regardless of density. */
  isStrategicAnchor: boolean;
  /** True when the city qualifies for SEO landing-page exposure —
   *  either density-promoted to `promoted`/`anchor` OR designated
   *  as a strategic anchor. */
  qualifiesForLanding: boolean;
  /** True when the city qualifies for top-of-marketplace dispatch
   *  prioritization. */
  qualifiesForDispatchPriority: boolean;
  /** Effective dispatch priority — anchor flag and density both
   *  feed in. */
  dispatchPriority: DispatchPriority;
  /** Provider count this state was computed against. */
  providerCount:    number;
}

/**
 * Compute the live rollout state for a city given a real-time
 * provider count. Strategic anchors (anchorFlag === true) lock in
 * `status: anchor` regardless of density so SEO + dispatch don't
 * regress when temporary churn drops their provider count.
 */
export function computeCityStatus(
  city: AnchorCity,
  providerCount: number,
): CityRolloutState {
  /* Strategic anchors short-circuit to anchor status. */
  if (city.anchorFlag) {
    return {
      status:           'anchor',
      isStrategicAnchor: true,
      qualifiesForLanding: true,
      qualifiesForDispatchPriority: true,
      dispatchPriority: 'high',
      providerCount,
    };
  }

  /* Density-based promotion. */
  let status: CityStatus = 'inactive';
  if (providerCount >= PROMOTION_THRESHOLDS.anchor)        status = 'anchor';
  else if (providerCount >= PROMOTION_THRESHOLDS.promoted) status = 'promoted';
  else if (providerCount >= PROMOTION_THRESHOLDS.active)   status = 'active';

  /* Dispatch priority climbs with status; non-anchor cities
   * generally cap at 'medium' until they hit the anchor threshold. */
  let dispatchPriority: DispatchPriority = city.dispatchPriority;
  if (status === 'anchor')    dispatchPriority = 'high';
  if (status === 'inactive')  dispatchPriority = 'low';

  return {
    status,
    isStrategicAnchor: false,
    qualifiesForLanding: status === 'promoted' || status === 'anchor',
    qualifiesForDispatchPriority: status === 'anchor',
    dispatchPriority,
    providerCount,
  };
}

/** Convenience — count cities at each status across a list. Used
 *  by the country-shopfront rollout panel. */
export function countByStatus(states: CityRolloutState[]): Record<CityStatus, number> {
  const counts: Record<CityStatus, number> = { inactive: 0, active: 0, promoted: 0, anchor: 0 };
  for (const s of states) counts[s.status]++;
  return counts;
}

/** Human-readable status label for the rollout panel. */
export const STATUS_LABEL: Record<CityStatus, string> = {
  inactive: 'Waitlist',
  active:   'Activating',
  promoted: 'Live · accepting bookings',
  anchor:   'Anchor city',
};

/** Status colour for the rollout panel pills. Brand-aligned: amber
 *  for active progress, emerald for verified anchor status, slate
 *  for inactive waitlist. */
export const STATUS_TONE: Record<CityStatus, { bg: string; text: string }> = {
  inactive: { bg: 'bg-slate-100',   text: 'text-slate-600'   },
  active:   { bg: 'bg-amber-50',    text: 'text-amber-800'   },
  promoted: { bg: 'bg-amber-100',   text: 'text-amber-900'   },
  anchor:   { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
};
