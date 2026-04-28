import { supabase } from './supabase';
import type { DisputeRow } from './disputes-store';
import type { ResolutionPath } from './dispute-rules';

/* ─────────────────────────────────────────────────────────────────
 * Admin-side helpers backed by the security-definer RPCs in
 * docs/install-dispute-completion.sql. The RPCs themselves enforce
 * is_admin() so a non-admin caller hits an exception; the client
 * doesn't have to gate.
 * ───────────────────────────────────────────────────────────────── */

export interface ProviderReputationRow {
  user_id:                string;
  dispute_count:          number;
  dispute_loss_count:     number;
  service_credits_total:  number;
  refunds_total:          number;
  reliability_score:      number;
  is_suspended:           boolean;
  flagged_at?:            string | null;
  flagged_reason?:        string | null;
  updated_at:             string;
}

/** List every dispute (admin gets the full table via RLS). Newest
 *  first; client filters to status buckets in the UI. */
export async function adminListDisputes(): Promise<DisputeRow[]> {
  const { data, error } = await supabase
    .from('disputes')
    .select('*')
    .order('filed_at', { ascending: false });
  if (error) throw new Error(`adminListDisputes failed: ${error.message}`);
  return (data ?? []) as DisputeRow[];
}

export async function adminResolveDispute(
  disputeId:  string,
  path:       ResolutionPath,
  amount:     number | null,
  pct:        number | null,
  rationale:  string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_resolve_dispute', {
    p_dispute_id: disputeId,
    p_path:       path,
    p_amount:     amount,
    p_pct:        pct,
    p_rationale:  rationale,
  });
  if (error) throw new Error(`admin_resolve_dispute failed: ${error.message}`);
}

export async function adminReleasePayout(disputeId: string, rationale: string): Promise<void> {
  const { error } = await supabase.rpc('admin_release_payout', {
    p_dispute_id: disputeId,
    p_rationale:  rationale,
  });
  if (error) throw new Error(`admin_release_payout failed: ${error.message}`);
}

export async function adminRequestEvidence(disputeId: string, rationale: string): Promise<void> {
  const { error } = await supabase.rpc('admin_request_evidence', {
    p_dispute_id: disputeId,
    p_rationale:  rationale,
  });
  if (error) throw new Error(`admin_request_evidence failed: ${error.message}`);
}

export async function adminEscalateDispute(disputeId: string, rationale: string): Promise<void> {
  const { error } = await supabase.rpc('admin_escalate_dispute', {
    p_dispute_id: disputeId,
    p_rationale:  rationale,
  });
  if (error) throw new Error(`admin_escalate_dispute failed: ${error.message}`);
}

export async function adminSetProviderSuspension(
  userId:    string,
  suspended: boolean,
  reason:    string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_provider_suspension', {
    p_user_id:   userId,
    p_suspended: suspended,
    p_reason:    reason,
  });
  if (error) throw new Error(`admin_set_provider_suspension failed: ${error.message}`);
}

/* ── Provider reputation reads ───────────────────────────────────── */

export async function loadProviderReputation(userId: string): Promise<ProviderReputationRow | null> {
  const { data, error } = await supabase
    .from('provider_reputation')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`loadProviderReputation failed: ${error.message}`);
  return (data ?? null) as ProviderReputationRow | null;
}

/** Decide which badge tone to render given a reliability score. */
export function reputationTier(score: number): 'elite' | 'strong' | 'fair' | 'watchlist' {
  if (score >= 95) return 'elite';
  if (score >= 80) return 'strong';
  if (score >= 60) return 'fair';
  return 'watchlist';
}
