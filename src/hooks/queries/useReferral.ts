import { useQuery } from '@tanstack/react-query';
import { getReferralStats, type ReferralStats } from '../../services/referrals';

const FALLBACK: ReferralStats = {
  totalInvited:     0,
  totalConverted:   0,
  totalCredited:    0,
  totalEarnedMinor: 0,
  currency:         'GBP',
};

export function useReferralStats(userId: string | null | undefined) {
  return useQuery<ReferralStats>({
    queryKey: ['referrals', 'stats', userId ?? 'anon'],
    enabled:  !!userId,
    queryFn:  () => getReferralStats(userId as string),
    /* Stats only update when a referee completes a booking — refetch
     * every 60s while the page is open to catch the trigger fire. */
    refetchInterval: 60_000,
    initialData: FALLBACK,
  });
}
