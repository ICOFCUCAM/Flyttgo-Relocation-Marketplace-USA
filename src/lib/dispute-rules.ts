/* ─────────────────────────────────────────────────────────────────
 * Dispute system rules — typed catalogue mirroring the SQL seed in
 * docs/install-disputes.sql.
 *
 * Three layers:
 *   1. DISPUTE_CATEGORIES         — 8 standard case types
 *   2. RESOLUTION_TEMPLATES       — country × category override path
 *   3. AUTOMATION_RULES           — auto-suggest based on observable
 *                                    conditions (late >60min, no-show, …)
 *
 * Used by:
 *   - DisputePage for the customer-facing category picker
 *   - The eventual admin dashboard for the queue + suggestions
 *   - The eventual auto-suggestion edge function (the SQL has the
 *     same data so the function can run server-side)
 * ───────────────────────────────────────────────────────────────── */

import type { PricingCountry } from './pricing-engine';

export type DisputeCategorySlug =
  | 'delay'
  | 'price_mismatch'
  | 'missing_items'
  | 'damage_claim'
  | 'crew_professionalism'
  | 'service_incomplete'
  | 'wrong_vehicle_size'
  | 'other';

export type ResolutionPath =
  | 'partial_refund'
  | 'service_credit'
  | 'insurance_claim'
  | 'full_refund'
  | 'mediation';

export interface DisputeCategory {
  slug:        DisputeCategorySlug;
  label:       string;
  description: string;
  defaultPath: ResolutionPath;
  /** 1 (low) to 5 (severe) — drives admin queue priority. */
  severity:    1 | 2 | 3 | 4 | 5;
}

export const DISPUTE_CATEGORIES: DisputeCategory[] = [
  { slug: 'delay',                label: 'Delay',
    description: 'Provider arrived later than the booking window or job overran significantly.',
    defaultPath: 'service_credit',  severity: 3 },
  { slug: 'price_mismatch',       label: 'Price mismatch',
    description: 'Final invoice did not match the quoted total without prior approval.',
    defaultPath: 'partial_refund',  severity: 4 },
  { slug: 'missing_items',        label: 'Missing items',
    description: 'Inventory items were not delivered to the destination.',
    defaultPath: 'insurance_claim', severity: 5 },
  { slug: 'damage_claim',         label: 'Damage claim',
    description: 'Items arrived damaged. Routes to provider insurance workflow.',
    defaultPath: 'insurance_claim', severity: 5 },
  { slug: 'crew_professionalism', label: 'Crew professionalism',
    description: 'Crew behaviour fell below marketplace standards.',
    defaultPath: 'mediation',       severity: 2 },
  { slug: 'service_incomplete',   label: 'Service incomplete',
    description: 'Crew left before the agreed scope was finished.',
    defaultPath: 'partial_refund',  severity: 4 },
  { slug: 'wrong_vehicle_size',   label: 'Wrong vehicle size',
    description: 'Vehicle did not fit the brief — required a second trip or alternative.',
    defaultPath: 'partial_refund',  severity: 3 },
  { slug: 'other',                label: 'Other',
    description: 'Issue not captured by the standard categories — describe in evidence.',
    defaultPath: 'mediation',       severity: 3 },
];

export interface ResolutionTemplate {
  country:       PricingCountry;
  category:      DisputeCategorySlug;
  path:          ResolutionPath;
  /** Suggested refund/credit fraction; null for non-monetary paths. */
  suggestedPct?: number;
  note?:         string;
}

export const RESOLUTION_TEMPLATES: ResolutionTemplate[] = [
  // USA — refund-driven
  { country: 'us', category: 'delay',          path: 'partial_refund',  suggestedPct: 0.10, note: '10% refund per overrun hour > 60 min' },
  { country: 'us', category: 'price_mismatch', path: 'full_refund',     suggestedPct: 1.00, note: 'Charge above quote without consent → full delta refund' },
  { country: 'us', category: 'damage_claim',   path: 'insurance_claim',                     note: 'Route to FMCSA-aware carrier insurance + BMC-91' },

  // EU — documentation-driven
  { country: 'de', category: 'delay',          path: 'mediation',                           note: 'Documentation required before refund — ZPO §286' },
  { country: 'de', category: 'damage_claim',   path: 'insurance_claim',                     note: 'Verkehrshaftpflicht claim' },
  { country: 'fr', category: 'delay',          path: 'mediation',                           note: 'Recours amiable obligatoire avant remboursement' },

  // UK — mediation-driven
  { country: 'gb', category: 'delay',          path: 'mediation',                           note: 'Mediation default; small claims if unresolved' },
  { country: 'gb', category: 'damage_claim',   path: 'insurance_claim',                     note: 'BAR insurance bond claim path' },

  // Africa — negotiation-driven
  { country: 'ng', category: 'delay',          path: 'service_credit',  suggestedPct: 0.10, note: 'Service credit preferred; cash refund only on escalation' },
  { country: 'ke', category: 'delay',          path: 'service_credit',  suggestedPct: 0.10, note: 'Service credit preferred; cash refund only on escalation' },

  // Middle East — contract-driven
  { country: 'ae', category: 'delay',          path: 'mediation',                           note: 'Defer to corporate SLA terms first' },
];

/** Resolve the recommended path for a (country, category) pair. */
export function resolvePath(
  country:  PricingCountry,
  category: DisputeCategorySlug,
): { path: ResolutionPath; pct?: number; note?: string } {
  const tpl = RESOLUTION_TEMPLATES.find(
    t => t.country === country && t.category === category,
  );
  if (tpl) return { path: tpl.path, pct: tpl.suggestedPct, note: tpl.note };

  /* Fall back to category default. */
  const cat = DISPUTE_CATEGORIES.find(c => c.slug === category);
  return { path: cat?.defaultPath ?? 'mediation' };
}

/* ── Automation rules ─────────────────────────────────────────── */

export interface AutomationRule {
  slug:           string;
  conditionKey:   string;
  threshold:      number;
  /** 'none' = no penalty / refund. */
  suggestedPath:  ResolutionPath | 'none';
  suggestedPct?:  number;
  description:    string;
  enabled:        boolean;
}

export const AUTOMATION_RULES: AutomationRule[] = [
  { slug: 'late-under-30',     conditionKey: 'provider_late_minutes',     threshold: 30,  suggestedPath: 'none',           description: 'Late by less than 30 min → no penalty.', enabled: true },
  { slug: 'late-30-to-60',     conditionKey: 'provider_late_minutes',     threshold: 60,  suggestedPath: 'service_credit', suggestedPct: 0.05, description: 'Late 30–60 min → 5% service credit.', enabled: true },
  { slug: 'late-over-60',      conditionKey: 'provider_late_minutes',     threshold: 60,  suggestedPath: 'partial_refund', suggestedPct: 0.10, description: 'Late more than 60 min → 10% refund.', enabled: true },
  { slug: 'no-show',           conditionKey: 'provider_no_show',          threshold: 1,   suggestedPath: 'full_refund',    suggestedPct: 1.00, description: 'Provider no-show → full refund auto-recommended.', enabled: true },
  { slug: 'repeated-disputes', conditionKey: 'customer_dispute_count_30d', threshold: 3,  suggestedPath: 'mediation',      description: 'Customer has filed 3+ disputes in 30 days → manual review required.', enabled: true },
];

/** Evaluate the automation rules against an observable signal map.
 *  Returns the strongest matching rule (highest threshold met) or
 *  null if nothing fires. */
export function evaluateAutomation(
  signals: Record<string, number>,
): AutomationRule | null {
  let best: AutomationRule | null = null;
  for (const rule of AUTOMATION_RULES) {
    if (!rule.enabled) continue;
    const value = signals[rule.conditionKey];
    if (value == null) continue;
    if (value >= rule.threshold) {
      if (!best || rule.threshold > best.threshold) best = rule;
    }
  }
  return best;
}
