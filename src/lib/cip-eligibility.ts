/* ─────────────────────────────────────────────────────────────────
 * Certified Infrastructure Partner — eligibility check.
 *
 * Wraps the spec's documentation + performance thresholds into a
 * pure function any UI can call to surface the qualification badge,
 * the upgrade-blockers panel, and the admin-side approval check.
 *
 * Two flavors:
 *
 *   checkCipEligibility(score)
 *     — Performance-only check (rating / completion / on-time /
 *       activity / suspension). Verification_level acts as a single
 *       gate that subsumes the documentation requirements.
 *
 *   checkCipEligibilityFull(score, documents)
 *     — Performance + explicit document-level gates the spec calls
 *       out: company registration, insurance, vehicle compliance,
 *       tax registration. Pass the rows from driver_documents
 *       (existing onboarding table) and we surface a per-document
 *       blocker.
 *
 * Pure + synchronous. Safe to call on every render.
 * ───────────────────────────────────────────────────────────────── */

import type { ProviderScoreRow } from './provider-scoring-store';

/** Document categories the spec explicitly requires for CIP. Maps
 *  to existing driver_documents.document_type values where
 *  available; new categories (tax_registration / vehicle_compliance)
 *  are admin-tagged on the same table. */
export type CipDocumentSlug =
  | 'company_registration'   // Gewerbeanmeldung / SIRET / CAC / etc
  | 'insurance'              // goods-in-transit / public liability cert
  | 'vehicle_compliance'     // VOSA / DMV / TÜV roadworthiness
  | 'tax_registration';      // VAT / EIN / GST

export interface DocumentStatus {
  slug:    CipDocumentSlug;
  status:  'missing' | 'pending' | 'approved' | 'rejected';
}

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

  /* Dispute ratio = lost-disputes / max(total-rated-jobs, 1).
   * Uses rating_count as the denominator since it tracks completed
   * + customer-facing jobs (the same "jobs done" the spec asks
   * about). For brand-new providers we floor the denominator at 1
   * to avoid divide-by-zero — they're shielded by the minRating /
   * minCompletedJobs gates anyway. */
  const lostDisputes  = score.dispute_loss_count ?? 0;
  const totalJobs     = Math.max(score.rating_count ?? 0, 1);
  const disputeRatio  = lostDisputes / totalJobs;
  if (disputeRatio > CIP_THRESHOLDS.maxDisputeRatio) {
    blockers.push({
      field:    'dispute ratio',
      current:  (disputeRatio * 100).toFixed(1) + '%',
      required: '≤ ' + (CIP_THRESHOLDS.maxDisputeRatio * 100).toFixed(1) + '%',
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

const DOCUMENT_LABELS: Record<CipDocumentSlug, string> = {
  company_registration: 'Company registration',
  insurance:            'Goods-in-transit / public liability insurance',
  vehicle_compliance:   'Vehicle compliance certificate',
  tax_registration:     'Tax registration',
};

/**
 * Document-level CIP eligibility — extends checkCipEligibility with
 * explicit blockers for each required document. Caller passes the
 * latest status per document slug (typically aggregated from
 * driver_documents); missing entries imply the doc hasn't been
 * uploaded.
 *
 * Used by the Subscription Plans page's CIP eligibility panel so
 * the provider sees exactly which documents to upload, not just a
 * generic "verification level 4" requirement.
 */
export function checkCipEligibilityFull(
  score:     ProviderScoreRow | null,
  documents: DocumentStatus[],
): CipEligibility {
  /* Start with the performance check. */
  const performance = checkCipEligibility(score);
  /* If the performance row's verification_level is already 4, we
   * trust the abstract gate — admins approve documents to flip
   * verification_level. The full check runs alongside for granular
   * UX feedback when the provider is mid-onboarding. */
  const blockers = [...performance.blockers];

  const requiredDocs: CipDocumentSlug[] =
    ['company_registration','insurance','vehicle_compliance','tax_registration'];

  for (const slug of requiredDocs) {
    const doc = documents.find(d => d.slug === slug);
    const status = doc?.status ?? 'missing';
    if (status === 'approved') continue;
    blockers.push({
      field:    DOCUMENT_LABELS[slug],
      current:  status,
      required: 'approved',
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
