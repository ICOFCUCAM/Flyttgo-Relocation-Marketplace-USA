import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBookingsForCustomer,
  getEscrowForBooking,
  getEscrowMapForBookings,
  setCustomerConfirmation,
  hasDriverConfirmed,
  releaseEscrow,
  approveEscrowAdjustment,
  cancelBooking,
  type BookingRow,
  type EscrowRow,
} from '../../services/bookings';

/** Booking-status values where the trip is still live. */
const ACTIVE_STATUSES = (b: BookingRow) =>
  !['completed', 'cancelled'].includes(String(b.status));

const customerBookingsKey = (customerId: string | null | undefined) =>
  ['bookings', 'customer', customerId ?? 'anon'] as const;

const escrowKey = (bookingId: string | null | undefined) =>
  ['escrow', bookingId ?? 'none'] as const;

const escrowMapKey = (customerId: string | null | undefined) =>
  ['escrow', 'map', customerId ?? 'anon'] as const;

export interface CustomerBookingsView {
  bookings: BookingRow[];
  recent:   BookingRow[];
  active:   BookingRow | null;
  stats: {
    total:     number;
    active:    number;
    completed: number;
    spent:     number;
  };
}

export function useCustomerBookings(customerId: string | null | undefined) {
  return useQuery<CustomerBookingsView>({
    queryKey: customerBookingsKey(customerId),
    enabled:  !!customerId,
    queryFn: async () => {
      const bookings = await listBookingsForCustomer(customerId as string);
      const active = bookings.find(ACTIVE_STATUSES) ?? null;
      const spent = bookings.reduce((sum, b) => {
        const v = Number(b.final_price ?? b.original_price ?? b.price_estimate ?? 0);
        return sum + (Number.isNaN(v) ? 0 : v);
      }, 0);
      return {
        bookings,
        recent:  bookings.slice(0, 5),
        active,
        stats: {
          total:     bookings.length,
          active:    bookings.filter(ACTIVE_STATUSES).length,
          completed: bookings.filter(b => b.status === 'completed').length,
          spent,
        },
      };
    },
  });
}

export function useActiveBookingEscrow(bookingId: string | null | undefined) {
  return useQuery({
    queryKey: escrowKey(bookingId),
    enabled:  !!bookingId,
    queryFn:  () => getEscrowForBooking(bookingId as string),
  });
}

/** All bookings for a customer + an escrow-map keyed by booking_id.
 *  Powers MyBookings without N+1 queries. */
export function useMyBookings(customerId: string | null | undefined) {
  const bookingsQuery = useQuery<BookingRow[]>({
    queryKey: customerBookingsKey(customerId),
    enabled:  !!customerId,
    queryFn:  () => listBookingsForCustomer(customerId as string),
  });
  const ids = bookingsQuery.data?.map(b => b.id) ?? [];
  const escrowQuery = useQuery<Record<string, EscrowRow>>({
    queryKey: [...escrowMapKey(customerId), ids.join(',')],
    enabled:  !!customerId && ids.length > 0,
    queryFn:  () => getEscrowMapForBookings(ids),
  });
  return {
    bookings:    bookingsQuery.data ?? [],
    escrowMap:   escrowQuery.data ?? {},
    isLoading:   bookingsQuery.isLoading,
  };
}

export function useConfirmCompletion(customerId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      await setCustomerConfirmation(bookingId);
      const driverDone = await hasDriverConfirmed(bookingId);
      if (driverDone) await releaseEscrow(bookingId);
      return { driverDone };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerBookingsKey(customerId) });
    },
  });
}

export function useApproveEscrowAdjustment(customerId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (escrowId: string) => approveEscrowAdjustment(escrowId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerBookingsKey(customerId) });
      qc.invalidateQueries({ queryKey: ['escrow'] });
    },
  });
}

export function useCancelBooking(customerId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => cancelBooking(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerBookingsKey(customerId) });
    },
  });
}
