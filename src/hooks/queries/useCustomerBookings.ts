import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBookingsForCustomer,
  getEscrowForBooking,
  getEscrowMapForBookings,
  getCustomerBookingById,
  getMostRecentPendingBooking,
  getActiveBookingForCustomer,
  findBookingByIdQuery,
  markBookingPaid,
  setCustomerConfirmation,
  hasDriverConfirmed,
  releaseEscrow,
  approveEscrowAdjustment,
  cancelBooking,
  type BookingRow,
  type EscrowRow,
} from '../../services/bookings';
import {
  createBookingCheckout,
  type BookingCheckoutInput,
} from '../../services/payments';

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

/* ── Tracking + payment surfaces ──────────────────────────────── */

const activeBookingKey  = (uid: string | null | undefined) => ['bookings', 'active', uid ?? 'anon'] as const;
const trackedBookingKey = (id: string | null) => ['bookings', 'tracked', id ?? 'none'] as const;
const paymentBookingKey = (uid: string | null | undefined, handoffId: string | null) =>
  ['bookings', 'payment', uid ?? 'anon', handoffId ?? 'recent'] as const;

/** Currently in-flight booking for a customer (anything not completed
 *  / cancelled). Used by TrackingPage to auto-load on mount. */
export function useActiveBookingForCustomer(customerId: string | null | undefined) {
  return useQuery({
    queryKey: activeBookingKey(customerId),
    enabled:  !!customerId,
    queryFn:  () => getActiveBookingForCustomer(customerId as string),
  });
}

/** Find a booking by id-prefix or full id. The query is paused until
 *  it has a search term — call .refetch() (or pass a non-empty term)
 *  when the user submits the form. */
export function useTrackingBookingSearch(idQuery: string) {
  return useQuery({
    queryKey: trackedBookingKey(idQuery || null),
    enabled:  !!idQuery,
    queryFn:  () => findBookingByIdQuery(idQuery),
  });
}

/* ── Driver lookup for the tracking page ───────────────────────── */

export interface TrackingDriverInfo {
  fullName:  string | null;
  phone:     string | null;
  status:    string | null;
  online:    boolean;
  /* Vehicle fields pulled from the driver's most-recent application
   * (driver_profiles doesn't carry vehicle data today). */
  vehicleType:         string | null;
  vehicleMake:         string | null;
  vehicleModel:        string | null;
  vehicleYear:         number | null;
  vehicleRegistration: string | null;
}

async function fetchTrackingDriver(driverUserId: string): Promise<TrackingDriverInfo | null> {
  const { supabase } = await import('../../lib/supabase');

  /* Two parallel reads: profile (live status / phone) + the most
   * recent application (vehicle info). Either can be missing — the
   * tracking page is robust to nulls. */
  const [profileRes, appRes] = await Promise.all([
    supabase.from('driver_profiles')
      .select('full_name, phone, status, online')
      .eq('user_id', driverUserId)
      .maybeSingle(),
    supabase.from('driver_applications')
      .select('vehicle_type, vehicle_model, vehicle_year, vehicle_registration')
      .eq('user_id', driverUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profileRes.data && !appRes.data) return null;

  /* vehicle_model from old applications is the legacy cram-string
   * ({category} · {make} {model} · compliance=JSON). Strip the
   * leading "{category} · " segment and the compliance suffix so
   * we can show a clean make/model. */
  let vehicleMake: string | null = null;
  let vehicleModel: string | null = null;
  if (appRes.data?.vehicle_model) {
    const cleaned = String(appRes.data.vehicle_model)
      .replace(/\s*·\s*compliance=\{[^}]*\}\s*$/, '')   // drop compliance suffix
      .split('·')                                          // split parts
      .map((s: string) => s.trim())
      .filter(Boolean);
    /* If 2+ parts, last is make/model (first is category). If 1
     * part, that's already make/model. */
    const last = cleaned[cleaned.length - 1] ?? '';
    const tokens = last.split(/\s+/);
    if (tokens.length >= 2) {
      vehicleMake  = tokens[0];
      vehicleModel = tokens.slice(1).join(' ');
    } else if (tokens.length === 1) {
      vehicleModel = tokens[0];
    }
  }

  return {
    fullName: profileRes.data?.full_name ?? null,
    phone:    profileRes.data?.phone ?? null,
    status:   profileRes.data?.status ?? null,
    online:   profileRes.data?.online ?? false,
    vehicleType:         appRes.data?.vehicle_type ?? null,
    vehicleMake,
    vehicleModel,
    vehicleYear:         appRes.data?.vehicle_year ?? null,
    vehicleRegistration: appRes.data?.vehicle_registration ?? null,
  };
}

/** Returns the driver attached to a booking, joined ad-hoc from
 *  driver_profiles + the driver's most-recent application. Used by
 *  the TrackingPage driver card. */
export function useTrackingDriver(driverUserId: string | null | undefined) {
  return useQuery<TrackingDriverInfo | null>({
    queryKey: ['tracking-driver', driverUserId],
    enabled:  !!driverUserId,
    queryFn:  () => fetchTrackingDriver(driverUserId as string),
    staleTime: 30_000,   // refetch every 30s while tracking is open
  });
}

/** Booking the PaymentPage should render: a specific id from the
 *  CustomerDashboard / MyBookings handoff, falling back to the
 *  customer's most-recent pending row when no handoff was set. */
export function useBookingForPayment(handoffId: string | null, customerId: string | null | undefined) {
  return useQuery<BookingRow | null>({
    queryKey: paymentBookingKey(customerId, handoffId),
    enabled:  !!customerId,
    queryFn: async () => {
      if (handoffId) {
        const direct = await getCustomerBookingById(handoffId, customerId as string);
        if (direct) return direct;
        /* Stale handoff id (cancelled, deleted, wrong user) — fall
         * through to the most-recent-pending fallback. */
      }
      return getMostRecentPendingBooking(customerId as string);
    },
  });
}

/** Mark booking + matching escrow row as paid-into-escrow. Used as
 *  the dev-mode fallback when the Stripe Checkout flow isn't wired. */
export function useMarkBookingPaid(customerId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, driverEarning }: { bookingId: string; driverEarning: number }) =>
      markBookingPaid(bookingId, driverEarning),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerBookingsKey(customerId) });
      qc.invalidateQueries({ queryKey: activeBookingKey(customerId) });
    },
  });
}

/** Wraps the create-checkout-session edge function. Returns the
 *  Stripe redirect URL on success. */
export function useCreateBookingCheckout() {
  return useMutation({
    mutationFn: (input: BookingCheckoutInput) => createBookingCheckout(input),
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
