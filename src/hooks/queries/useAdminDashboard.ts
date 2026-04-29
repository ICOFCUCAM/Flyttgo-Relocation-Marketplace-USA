import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminSnapshot,
  fetchPlatformSettings,
  fetchBookingTimeline,
  fetchApplicationDocuments,
  updatePlatformSetting,
  updateDriverStatus,
  assignDriverPlan,
  releaseBookingPayment,
  refundBookingPayment,
  applyManualRefundOverride,
  manualDispatchBooking,
  autoDispatchBooking,
  reclaimStaleDispatches,
  reviewDriverApplication,
  setDocumentVerification,
  subscribeAdminTables,
  type BookingRow,
  type ReviewApplicationInput,
} from '../../services/admin';

const SNAPSHOT_KEY  = ['admin', 'snapshot'] as const;
const SETTINGS_KEY  = ['admin', 'settings'] as const;
const TIMELINE_KEY  = (id: string | null) => ['admin', 'timeline', id ?? 'none'] as const;
const APP_DOCS_KEY  = (id: string | null) => ['admin', 'app-docs', id ?? 'none'] as const;

/** Top-level dashboard snapshot. Subscribes to realtime changes and
 *  invalidates the cache (debounced) so the dashboard stays live. */
export function useAdminSnapshot(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeAdminTables(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        qc.invalidateQueries({ queryKey: SNAPSHOT_KEY });
      }, 800);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, qc]);

  return useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn:  fetchAdminSnapshot,
    enabled,
  });
}

export function usePlatformSettings(enabled: boolean) {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn:  fetchPlatformSettings,
    enabled,
  });
}

export function useBookingTimeline(bookingId: string | null) {
  return useQuery({
    queryKey: TIMELINE_KEY(bookingId),
    queryFn:  () => fetchBookingTimeline(bookingId as string),
    enabled:  !!bookingId,
  });
}

export function useApplicationDocuments(applicationId: string | null, userId: string | null) {
  return useQuery({
    queryKey: APP_DOCS_KEY(applicationId),
    queryFn:  () => fetchApplicationDocuments(applicationId as string, userId as string),
    enabled:  !!applicationId && !!userId,
  });
}

/* ── Mutations ─────────────────────────────────────────────────── */

function invalidateDashboard(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: SNAPSHOT_KEY });
}

export function useUpdateDriverStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateDriverStatus(id, status),
    onSuccess:  () => invalidateDashboard(qc),
  });
}

export function useAssignDriverPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ driverId, plan }: { driverId: string; plan: string }) => assignDriverPlan(driverId, plan),
    onSuccess:  () => invalidateDashboard(qc),
  });
}

export function useReleaseBookingPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (booking: BookingRow) => releaseBookingPayment(booking),
    onSuccess:  () => invalidateDashboard(qc),
  });
}

export function useRefundBookingPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (booking: BookingRow) => refundBookingPayment(booking),
    onSuccess:  () => invalidateDashboard(qc),
  });
}

export function useApplyManualRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, percent }: { bookingId: string; percent: number }) =>
      applyManualRefundOverride(bookingId, percent),
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useManualDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, driverId }: { bookingId: string; driverId: string }) =>
      manualDispatchBooking(bookingId, driverId),
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useAutoDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => autoDispatchBooking(bookingId),
    onSuccess:  () => invalidateDashboard(qc),
  });
}

export function useReclaimStaleDispatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reclaimStaleDispatches(5),
    onSuccess:  () => invalidateDashboard(qc),
  });
}

export function useReviewApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewApplicationInput) => reviewDriverApplication(input),
    onSuccess:  () => invalidateDashboard(qc),
  });
}

export function useUpdatePlatformSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updatePlatformSetting(key, value),
    onSuccess: (_data, vars) => {
      const previous = qc.getQueryData<Record<string, string>>(SETTINGS_KEY) ?? {};
      qc.setQueryData<Record<string, string>>(SETTINGS_KEY, { ...previous, [vars.key]: vars.value });
    },
  });
}

export function useSetDocumentVerification(applicationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, status }: { documentId: string; status: 'approved' | 'rejected' }) =>
      setDocumentVerification(documentId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APP_DOCS_KEY(applicationId) });
      invalidateDashboard(qc);
    },
  });
}
