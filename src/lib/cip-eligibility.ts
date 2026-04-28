/* ─────────────────────────────────────────────────────────────────
 * Certified Infrastructure Partner — eligibility check.
 *
 * Wraps the spec's documentation + performance thresholds into a
 * pure function any UI can call to surface the qualification badge,
 * the upgrade-blockers panel, and the admin-side approval check.
 *
 * Inputs come from the existing scoring engine (provider_reputation)
 * — we don't introduce new tracking. The provider has to *also* hit
 * the documentation gates (verification_level === 4) which the
 * existing onboarding + admin verification flow already manages.
 *
 * Pure + synchronous. Safe to call on every render.
 * ───────────────────────────────────────────────────────────────── */

import type { ProviderScoreRow } from './provider-scoring-store';

export interface CipBlocker {
  field:   string;
  current: string;
  required: string;
}

export interface CipEligibility {
  qualifies:   boolean;
  blockers:    CipBlocker[];
  /** Convenience — first blocker's user-facing one-liner. */
  primaryReason?: string;
}

/* Performance thresholds per the spec. Tune these ops-side without
 * a code release once we have enough volume to calibrate. */
export const CIP_THRESHOLDS = {
  minRating:           4.6,
  minCompletedJobs:    40,
  maxDisputeRatio:     0.05,       // ≤ 5% disputes / total jobs
  minOnTimeRate:       0.90,
  minVerificationLevel: 4,         // Premium verification tier
  /** Provider must have logged in / accepted a job in the last 30
   *  days (recent_activity_score >= 0.5 from the linear decay). */
  minRecentActivity:   0.5,
} as const;

export function checkCipEligibility(score: ProviderScoreRow | null): CipEligibility {
  const blockers: CipBlocker[] = [];

  if (!score) {
    blockers.push({
      field:    'reputation row',
      current:  'no scoring history yet',
      required: 'complete at least one rated booking',
    });
    return {
      qualifies: false,
      blockers,
      primaryReason: 'Complete your first rated booking to start qualifying.',
    };
  }

  if ((score.avg_rating ?? 0) < CIP_THRESHOLDS.minRating) {
    blockers.push({
      field:    'average rating',
      current:  (score.avg_rating ?? 0).toFixed(2),
      required: CIP_THRESHOLDS.minRating.toFixed(2),
    });
  }

  if ((score.rating_count ?? 0) < CIP_THRESHOLDS.minCompletedJobs) {
    blockers.push({
      field:    'completed rated jobs',
      current:  String(score.rating_count ?? 0),
      required: String(CIP_THRESHOLDS.minCompletedJobs),
    });
  }

  if ((score.on_time_rate ?? 0) < CIP_THRESHOLDS.minOnTimeRate) {
    blockers.push({
      field:    'on-time rate',
      current:  Math.round((score.on_time_rate ?? 0) * 100) + '%',
      required: Math.round(CIP_THRESHOLDS.minOnTimeRate * 100) + '%',
    });
  }

  if ((score.verification_level ?? 1) < CIP_THRESHOLDS.minVerificationLevel) {
    blockers.push({
      field:    'verification level',
      current:  String(score.verification_level ?? 1) + ' / 4',
      required: '4 / 4 (Premium · documents + insurance + licence verified)',
    });
  }

  if ((score.recent_activity_score ?? 1) < CIP_THRESHOLDS.minRecentActivity) {
    blockers.push({
      field:    'recent activity',
      current:  Math.round((score.recent_activity_score ?? 0) * 100) + '%',
      required: Math.round(CIP_THRESHOLDS.minRecentActivity * 100) + '%',
    });
  }

  if (score.is_suspended) {
    blockers.push({
      field:    'account status',
      current:  'suspended',
      required: 'in good standing',
    });
  }

  return {
    qualifies:    blockers.length === 0,
    blockers,
    primaryReason: blockers[0]
      ? `${blockers[0].field}: ${blockers[0].current} (need ${blockers[0].required})`
      : undefined,
  };
}
