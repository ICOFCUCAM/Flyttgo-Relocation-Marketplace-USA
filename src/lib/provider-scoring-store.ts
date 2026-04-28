import { supabase } from './supabase';

/* ─────────────────────────────────────────────────────────────────
 * Typed wrapper around the provider rating + scoring tables (see
 * docs/install-provider-scoring.sql).
 *
 * Reads:
 *   - loadProviderScore(userId)       — full score row
 *   - listProviderRatings(userId)     — public review timeline
 *   - listTopProvidersByCity(city)    — ranked provider list per city
 *
 * Writes:
 *   - submitProviderRating(...)       — customer-side
 * ───────────────────────────────────────────────────────────────── */

export type VerificationLevel = 1 | 2 | 3 | 4;

export type TrustBadgeSlug =
  | 'top-rated'
  | 'fast-response'
  | 'verified-carrier'
  | 'verified-provider'
  | 'registered-provider'
  | 'new-provider'
  | 'corporate-ready'
  | 'university-ready'
  | 'government-ready'
  | 'certified-infrastructure-partner';

export interface ProviderScoreRow {
  user_id:               string;
  rank_score:            number | null;            // 0–100
  avg_rating:            number | null;            // 0–5
  rating_count:          number;
  completion_rate:       number | null;            // 0–1
  on_time_rate:          number | null;            // 0–1
  response_speed_score:  number | null;            // 0–1
  /** Linear decay: 1.0 if active in last 24h, 0 if inactive ≥60d. */
  recent_activity_score: number | null;
  verification_level:    VerificationLevel;
  is_top_rated:          boolean;
  is_suspended:          boolean;
  warning_count_30d:     number;
  trust_badges:          TrustBadgeSlug[];
}

export interface ProviderRatingRow {
  id:                  string;
  booking_id:          string;
  provider_user_id:    string;
  customer_user_id:    string;
  punctuality:         number | null;
  professionalism:     number | null;
  communication:       number | null;
  care_of_items:       number | null;
  estimate_accuracy:   number | null;
  overall:             number | null;
  review_text:         string | null;
  created_at:          string;
}

export async function loadProviderScore(userId: string): Promise<ProviderScoreRow | null> {
  const { data, error } = await supabase
    .from('provider_reputation')
    .select('user_id, rank_score, avg_rating, rating_count, completion_rate, on_time_rate, response_speed_score, recent_activity_score, verification_level, is_top_rated, is_suspended, warning_count_30d, trust_badges')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`loadProviderScore failed: ${error.message}`);
  return (data ?? null) as ProviderScoreRow | null;
}

export async function listProviderRatings(
  providerUserId: string,
  limit: number = 20,
): Promise<ProviderRatingRow[]> {
  const { data, error } = await supabase
    .from('provider_ratings')
    .select('*')
    .eq('provider_user_id', providerUserId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listProviderRatings failed: ${error.message}`);
  return (data ?? []) as ProviderRatingRow[];
}

export interface SubmitRatingInput {
  bookingId:        string;
  providerUserId:   string;
  customerUserId:   string;
  punctuality:      number;
  professionalism:  number;
  communication:    number;
  careOfItems:      number;
  estimateAccuracy: number;
  overall:          number;
  reviewText?:      string;
}

export async function submitProviderRating(input: SubmitRatingInput): Promise<ProviderRatingRow> {
  const { data, error } = await supabase
    .from('provider_ratings')
    .insert({
      booking_id:         input.bookingId,
      provider_user_id:   input.providerUserId,
      customer_user_id:   input.customerUserId,
      punctuality:        input.punctuality,
      professionalism:    input.professionalism,
      communication:      input.communication,
      care_of_items:      input.careOfItems,
      estimate_accuracy:  input.estimateAccuracy,
      overall:            input.overall,
      review_text:        input.reviewText ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`submitProviderRating failed: ${error.message}`);
  return data as ProviderRatingRow;
}

export interface CityRankRow {
  city_slug:           string;
  user_id:             string;
  rank_score:          number;
  avg_rating:          number | null;
  rating_count:        number;
  completion_rate:     number | null;
  on_time_rate:        number | null;
  verification_level:  VerificationLevel;
  is_top_rated:        boolean;
  is_suspended:        boolean;
  trust_badges:        TrustBadgeSlug[];
  city_rank:           number;
}

export async function listTopProvidersByCity(
  citySlug: string,
  limit: number = 10,
): Promise<CityRankRow[]> {
  const { data, error } = await supabase
    .from('provider_city_rankings')
    .select('*')
    .eq('city_slug', citySlug)
    .order('city_rank', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`listTopProvidersByCity failed: ${error.message}`);
  return (data ?? []) as CityRankRow[];
}

/* ── Badge derivation — derives the active badge set from score
 *    inputs. Mirrors the spec's verification-level + threshold
 *    table. Used client-side as a fallback when trust_badges[] is
 *    empty on the row. ─────────────────────────────────────────── */

export function deriveTrustBadges(score: ProviderScoreRow): TrustBadgeSlug[] {
  const badges: TrustBadgeSlug[] = [];

  /* Verification level → tiered badge. */
  switch (score.verification_level) {
    case 4: badges.push('top-rated'); break;          // premium
    case 3: badges.push('verified-carrier'); break;
    case 2: badges.push('verified-provider'); break;
    case 1: badges.push('registered-provider'); break;
  }

  /* Threshold-based badges. */
  if (score.is_top_rated && !badges.includes('top-rated')) badges.push('top-rated');
  if (score.response_speed_score != null && score.response_speed_score >= 0.85) {
    badges.push('fast-response');
  }
  if ((score.rating_count ?? 0) < 5) badges.push('new-provider');

  /* Persisted badges from the row override the derived defaults
   * when admin has explicitly granted Corporate / University /
   * Government readiness or upgraded the provider to the
   * Certified Infrastructure Partner tier. */
  for (const b of score.trust_badges ?? []) {
    if (!badges.includes(b)) badges.push(b);
  }

  /* CIP shadows every other badge when present — sort it to front. */
  if (badges.includes('certified-infrastructure-partner')) {
    return [
      'certified-infrastructure-partner',
      ...badges.filter(b => b !== 'certified-infrastructure-partner'),
    ];
  }

  return badges;
}
