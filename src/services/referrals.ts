import { supabase } from '../lib/supabase';

/**
 * Referral service. Backed by docs/install-referrals.sql which
 * defines the `referrals` table + the auto-credit trigger that fires
 * when the referee completes their first booking.
 *
 * Code-derivation note: referral codes are deterministic from the
 * referrer's user_id (computed in src/pages/ReferPage.tsx) — there is
 * no separate `referral_codes` table. To resolve a code → referrer at
 * redemption time we look up the auth.users row whose id starts with
 * the same prefix the frontend used to mint the code. Tight, no DB
 * round-trip needed for code generation.
 */

export interface ReferralRow {
  id:                  string;
  code:                string;
  referrer_user_id:    string;
  referee_user_id:     string;
  status:              'pending' | 'converted' | 'credited' | 'void';
  reward_amount_minor: number;
  currency:            string;
  booking_id:          string | null;
  created_at:          string;
  converted_at:        string | null;
  credited_at:         string | null;
}

/** Aggregated stats the ReferPage card wants to render. */
export interface ReferralStats {
  totalInvited:       number;   // referrals where this user is the referrer
  totalConverted:     number;   // status in (converted, credited)
  totalCredited:      number;   // status = credited
  totalEarnedMinor:   number;   // sum of reward_amount_minor for credited rows
  currency:           string;
}

/** Returns aggregate referral stats for the signed-in user as a
 *  REFERRER. RLS guarantees we only see rows where auth.uid() matches
 *  referrer_user_id or referee_user_id; we filter to the former. */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const { data, error } = await supabase
    .from('referrals')
    .select('status, reward_amount_minor, currency')
    .eq('referrer_user_id', userId);
  if (error) throw error;
  const rows = (data ?? []) as Array<Pick<ReferralRow, 'status' | 'reward_amount_minor' | 'currency'>>;

  const stats: ReferralStats = {
    totalInvited:     rows.length,
    totalConverted:   rows.filter(r => r.status === 'converted' || r.status === 'credited').length,
    totalCredited:    rows.filter(r => r.status === 'credited').length,
    totalEarnedMinor: rows
      .filter(r => r.status === 'credited')
      .reduce((s, r) => s + (r.reward_amount_minor ?? 0), 0),
    currency:         rows[0]?.currency ?? 'GBP',
  };
  return stats;
}

/**
 * Records a referral redemption. Called from the auth-callback
 * page after a new account confirms its email AND when a `?ref=`
 * cookie/sessionStorage value is present.
 *
 * Resolves the code to a referrer by id-prefix lookup against the
 * profiles table. Refuses to insert if:
 *   - the code resolves to no user (silent no-op — invalid link)
 *   - the resolved referrer is the same as the new user (self-refer)
 *   - a row already exists for this (referrer, referee) pair (the
 *     unique constraint will surface this; we swallow the error).
 *
 * Returns the inserted row on success, or null when nothing was
 * recorded (invalid code / duplicate / self-referral).
 */
export async function recordReferralRedemption(
  rawCode: string,
  refereeUserId: string,
): Promise<ReferralRow | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  /* Code is the first 8 chars of the referrer's user_id (uppercase,
   * with dashes stripped). Match by prefix on the profiles table. */
  const prefix = code.slice(0, 8).toLowerCase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .filter('id::text', 'ilike', `${prefix}%`)
    .limit(1)
    .maybeSingle();
  if (!profile?.id) return null;
  if (profile.id === refereeUserId) return null;   // self-referral

  const { data, error } = await supabase
    .from('referrals')
    .insert({
      code,
      referrer_user_id: profile.id,
      referee_user_id:  refereeUserId,
      /* defaults from the table:  status='pending', reward=2500, currency='GBP' */
    })
    .select()
    .single();

  /* Unique-constraint hit (already redeemed) → silent no-op. */
  if (error?.code === '23505') return null;
  if (error) throw error;
  return data as ReferralRow;
}
