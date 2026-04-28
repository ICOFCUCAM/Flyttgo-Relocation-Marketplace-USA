import { supabase } from './supabase';
import type { PricingCountry } from './pricing-engine';

/* ─────────────────────────────────────────────────────────────────
 * Typed wrapper for the Smart Matching Engine RPC. See
 * docs/install-matching-engine.sql for the formula + filters.
 *
 * Three modes per the spec:
 *
 *   instant      — auto-assign (top 1)
 *   multi_quote  — 3 providers receive request; customer picks
 *   enterprise   — CIP first / Gold Pro / Gold; no Silver tiers
 *
 * Pure read RPC — safe to call on every keystroke for live preview
 * UIs (e.g. an admin dispatch console).
 * ───────────────────────────────────────────────────────────────── */

export type MatchingMode = 'instant' | 'multi_quote' | 'enterprise';

export type SpecializationTag =
  | 'apartment-relocation'
  | 'office-relocation'
  | 'corporate-relocation'
  | 'international-relocation'
  | 'student-relocation'
  | 'equipment-relocation'
  | 'long-distance'
  | 'local-moves'
  | 'packing-only'
  | 'labor-only'
  | 'storage-staging'
  | 'last-mile-freight'
  | 'climate-controlled'
  | 'fragile-handling'
  | 'piano-or-art'
  | 'corporate-it-decommission';

export interface MatchingInput {
  country:             PricingCountry;
  pickupLat?:          number;
  pickupLng?:          number;
  crewSize?:           2 | 3 | 4 | 5;
  needsTruck?:         boolean;
  needsPacking?:       boolean;
  needsStorage?:       boolean;
  specializationTags?: SpecializationTag[];
  /** Force-exclude Silver / Silver+ even outside enterprise mode. */
  excludeSilver?:      boolean;
}

export interface MatchedProviderRow {
  user_id:        string;
  match_score:    number;        // 0–100
  distance_km:    number;
  tier_slug:      string | null;
  tier_position:  number;
  rank_score:     number | null;
  is_cip:         boolean;
  is_top_rated:   boolean;
  reasons:        string[];
}

/**
 * Run the matcher. Returns the ranked candidate list — single row
 * for `instant` mode, up to 3 for `multi_quote`, up to 5 for
 * `enterprise`.
 */
export async function matchProviders(
  input: MatchingInput,
  mode:  MatchingMode = 'instant',
): Promise<MatchedProviderRow[]> {
  const payload: Record<string, unknown> = {
    country: input.country,
  };
  if (input.pickupLat != null)         payload.pickup_lat = input.pickupLat;
  if (input.pickupLng != null)         payload.pickup_lng = input.pickupLng;
  if (input.crewSize != null)          payload.crew_size = input.crewSize;
  if (input.needsTruck   != null)      payload.needs_truck   = input.needsTruck;
  if (input.needsPacking != null)      payload.needs_packing = input.needsPacking;
  if (input.needsStorage != null)      payload.needs_storage = input.needsStorage;
  if (input.specializationTags?.length) payload.specialization_tags = input.specializationTags;
  if (input.excludeSilver != null)     payload.exclude_silver = input.excludeSilver;

  const { data, error } = await supabase.rpc('match_providers_for_booking', {
    p_input: payload,
    p_mode:  mode,
  });
  if (error) throw new Error(`matchProviders failed: ${error.message}`);
  return (data ?? []) as MatchedProviderRow[];
}

/* ── Specializations CRUD (provider self-management) ───────────── */

export interface ProviderSpecializationRow {
  id:           string;
  user_id:      string;
  tag:          SpecializationTag;
  proficiency:  number;
  created_at:   string;
}

export async function listProviderSpecializations(userId: string): Promise<ProviderSpecializationRow[]> {
  const { data, error } = await supabase
    .from('provider_specializations')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(`listProviderSpecializations failed: ${error.message}`);
  return (data ?? []) as ProviderSpecializationRow[];
}

export async function setProviderSpecialization(
  userId: string, tag: SpecializationTag, proficiency: number = 3,
): Promise<void> {
  const { error } = await supabase
    .from('provider_specializations')
    .upsert(
      { user_id: userId, tag, proficiency },
      { onConflict: 'user_id,tag' },
    );
  if (error) throw new Error(`setProviderSpecialization failed: ${error.message}`);
}

export async function removeProviderSpecialization(
  userId: string, tag: SpecializationTag,
): Promise<void> {
  const { error } = await supabase
    .from('provider_specializations')
    .delete()
    .eq('user_id', userId).eq('tag', tag);
  if (error) throw new Error(`removeProviderSpecialization failed: ${error.message}`);
}
