import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDriverApplication,
  getDriverProfile,
  getCurrentSubscription,
  enforceSubscriptionExpiry,
  getDriverWallet,
  listDriverTransactions,
  listDriverJobs,
  acceptJob,
  startJob,
  finishJob,
  setDriverConfirmation,
  setDriverOnline,
  requestPayout,
  changeDriverSubscription,
  logSubscriptionCredit,
  createSubscriptionCheckout,
  type CheckoutPayload,
  type JobRow,
} from '../../services/driver';
import { safeNumber } from '../../components/driver/utils';

const applicationKey = (uid: string | null | undefined) => ['driver', 'application', uid ?? 'anon'] as const;
const profileKey     = (uid: string | null | undefined) => ['driver', 'profile',     uid ?? 'anon'] as const;
const subscriptionKey = (uid: string | null | undefined) => ['driver', 'subscription', uid ?? 'anon'] as const;
const walletKey      = (driverId: string | null | undefined) => ['driver', 'wallet',  driverId ?? 'none'] as const;
const txKey          = (driverId: string | null | undefined) => ['driver', 'tx',      driverId ?? 'none'] as const;
const jobsKey        = (driverId: string | null | undefined) => ['driver', 'jobs',    driverId ?? 'none'] as const;

export function useDriverApplication(userId: string | null | undefined) {
  return useQuery({
    queryKey: applicationKey(userId),
    enabled:  !!userId,
    queryFn:  async () => {
      /* Fire enforceSubscriptionExpiry alongside the application fetch so a
       * visiting driver gets their state corrected on first render. */
      await enforceSubscriptionExpiry(userId as string).catch(() => {});
      return getDriverApplication(userId as string);
    },
  });
}

export function useDriverProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: profileKey(userId),
    enabled:  !!userId,
    queryFn:  () => getDriverProfile(userId as string),
  });
}

export function useDriverSubscription(userId: string | null | undefined) {
  return useQuery({
    queryKey: subscriptionKey(userId),
    enabled:  !!userId,
    queryFn:  () => getCurrentSubscription(userId as string),
  });
}

export function useDriverWallet(driverId: string | null | undefined) {
  return useQuery({
    queryKey: walletKey(driverId),
    enabled:  !!driverId,
    queryFn:  () => getDriverWallet(driverId as string),
  });
}

export function useDriverTransactions(driverId: string | null | undefined) {
  return useQuery({
    queryKey: txKey(driverId),
    enabled:  !!driverId,
    queryFn:  () => listDriverTransactions(driverId as string),
  });
}

export function useDriverJobs(
  driverId: string | null | undefined,
  plan: string | null | undefined,
) {
  return useQuery<JobRow[]>({
    queryKey: [...jobsKey(driverId), plan ?? 'free'],
    enabled:  !!driverId,
    queryFn: async () => {
      const all = await listDriverJobs(driverId as string);
      /* Free-tier drivers can only see jobs ≤ $50 (price ≤ 500 in
       * pre-tax minor units). */
      const currentPlan = plan ?? 'free';
      return currentPlan === 'free'
        ? all.filter(j => safeNumber(j.price_estimate) <= 500)
        : all;
    },
  });
}

/* ── Mutations ─────────────────────────────────────────────────── */

export function useAcceptJob(driverId: string | null | undefined, plan: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => acceptJob(driverId as string, jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...jobsKey(driverId), plan ?? 'free'] }),
  });
}

export function useStartJob(driverId: string | null | undefined, plan: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => startJob(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...jobsKey(driverId), plan ?? 'free'] }),
  });
}

export function useFinishJob(driverId: string | null | undefined, plan: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => finishJob(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...jobsKey(driverId), plan ?? 'free'] }),
  });
}

export function useDriverConfirmation(driverId: string | null | undefined, plan: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => setDriverConfirmation(jobId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: [...jobsKey(driverId), plan ?? 'free'] });
      qc.invalidateQueries({ queryKey: walletKey(driverId) });
    },
  });
}

export function useToggleDriverOnline(driverId: string | null | undefined, userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (online: boolean) => setDriverOnline(driverId as string, online),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKey(userId) }),
  });
}

export function useRequestPayout(driverId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => requestPayout(driverId as string, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: walletKey(driverId) }),
  });
}

export function useChangeSubscription(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => changeDriverSubscription(userId as string, planId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: subscriptionKey(userId) });
      qc.invalidateQueries({ queryKey: profileKey(userId) });
    },
  });
}

export function useLogSubscriptionCredit() {
  return useMutation({
    mutationFn: ({ driverId, amount, description }: { driverId: string; amount: number; description: string }) =>
      logSubscriptionCredit(driverId, amount, description),
  });
}

export function useCreateSubscriptionCheckout() {
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => createSubscriptionCheckout(payload),
  });
}
