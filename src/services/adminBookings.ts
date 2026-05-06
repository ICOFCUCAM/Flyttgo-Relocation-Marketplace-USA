import { supabase } from '../lib/supabase';
import { callEdgeFunction } from './_edge';
import type { BookingRow } from '../lib/database.types';

/**
 * Admin booking management. Powers the AdminDashboard "Create
 * booking" + "Edit booking" + (super-admin-only) "Delete" actions
 * and the customer-side approve/decline of staged admin edits.
 *
 * All RLS gating lives in docs/install-admin-bookings-rbac.sql:
 *   - `bookings_admin_insert` / `bookings_admin_update` allow
 *     INSERT/UPDATE for any user with profiles.role = 'admin'.
 *   - `bookings_super_admin_delete` requires is_super_admin = true.
 *   - approve_pending_admin_edit() / decline_pending_admin_edit() /
 *     delete_user_account() are SECURITY DEFINER RPCs that re-check
 *     the caller's role server-side.
 */

/* ── Types ────────────────────────────────────────────────────── */

export interface AdminCreateBookingInput {
  customer: {
    /** Existing auth.users.id of the customer the booking is for. */
    id:    string;
    email: string;
    name:  string;
    phone: string;
  };
  pickup: {
    address:  string;
    postcode: string;
    city:     string;
    lat:      number | null;
    lng:      number | null;
  };
  dropoff: {
    address:  string;
    postcode: string;
    city:     string;
    lat:      number | null;
    lng:      number | null;
  };
  vanType:        string;
  helpers:        number;
  moveDate:       string | null;
  moveTime:       string | null;
  notes:          string;
  priceTotal:     number;
  /** ISO-2 country code of the shopfront. Used by the
   *  Geography panel to attribute the row to the right market. */
  country?:       string | null;
}

/** Whitelist of fields an admin can stage as a pending edit. The
 *  RPC enforces the same set server-side; keeping the type here so
 *  the UI can't even render fields that won't merge. */
export interface AdminPendingEditPatch {
  pickup_address?:    string;
  pickup_city?:       string;
  pickup_postcode?:   string;
  dropoff_address?:   string;
  dropoff_city?:      string;
  dropoff_postcode?:  string;
  move_date?:         string;
  move_time?:         string;
  van_type?:          string;
  helpers?:           number;
  customer_notes?:    string;
  price_estimate?:    number;
}

/* ── Create booking on behalf of a customer ──────────────────── */

/**
 * Admin-created booking. Inserts the row with payment_status =
 * 'pending' + created_by_admin = true, then fires off a payment-link
 * email so the customer settles it on their own time.
 *
 * Returns the inserted booking row. The email failing is logged but
 * doesn't roll the booking back — the admin can resend manually
 * from the admin UI.
 */
export async function createBookingForCustomer(
  input: AdminCreateBookingInput,
  adminUserId: string,
): Promise<BookingRow> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      customer_id:    input.customer.id,
      customer_email: input.customer.email,
      customer_name:  input.customer.name,
      customer_phone: input.customer.phone,

      pickup_address:  input.pickup.address,
      pickup_postcode: input.pickup.postcode,
      pickup_city:     input.pickup.city,
      pickup_lat:      input.pickup.lat,
      pickup_lng:      input.pickup.lng,

      dropoff_address:  input.dropoff.address,
      dropoff_postcode: input.dropoff.postcode,
      dropoff_city:     input.dropoff.city,
      dropoff_lat:      input.dropoff.lat,
      dropoff_lng:      input.dropoff.lng,

      van_type:        input.vanType,
      helpers:         input.helpers,
      move_date:       input.moveDate,
      move_time:       input.moveTime,
      customer_notes:  input.notes,
      price_estimate:  input.priceTotal,
      original_price:  input.priceTotal,

      status:         'pending',
      payment_status: 'pending',

      created_by_admin:         true,
      created_by_admin_user_id: adminUserId,

      booking_country: input.country ? input.country.toUpperCase() : null,
    })
    .select()
    .single();
  if (error) throw error;

  /* Fire-and-log the email — don't fail the create if SMTP is down. */
  void callEdgeFunction('send-booking-email', {
    template: 'admin_payment_link',
    to:       input.customer.email,
    bookingId: data.id,
    data: {
      pickupAddress:  input.pickup.address,
      dropoffAddress: input.dropoff.address,
      moveDate:       input.moveDate ?? 'TBC',
      price:          input.priceTotal,
      paymentLink:    `https://flyttgo.com/payment?bookingId=${data.id}`,
    },
  }).catch((e) => console.warn('admin payment-link email failed:', e));

  return data as BookingRow;
}

/** Resend the payment link to the customer's email. */
export async function resendPaymentLink(bookingId: string): Promise<void> {
  const { data, error } = await supabase
    .from('bookings')
    .select('customer_email, pickup_address, dropoff_address, move_date, price_estimate')
    .eq('id', bookingId)
    .single();
  if (error) throw error;
  if (!data?.customer_email) throw new Error('Booking has no customer email');

  await callEdgeFunction('send-booking-email', {
    template: 'admin_payment_link',
    to:       data.customer_email,
    bookingId,
    data: {
      pickupAddress:  data.pickup_address,
      dropoffAddress: data.dropoff_address,
      moveDate:       data.move_date ?? 'TBC',
      price:          data.price_estimate,
      paymentLink:    `https://flyttgo.com/payment?bookingId=${bookingId}`,
    },
  });
}

/* ── Stage an edit for customer approval ─────────────────────── */

/**
 * Stage admin changes on a booking. The patch lands in
 * `pending_admin_edits` jsonb; the live columns are unchanged until
 * the customer approves via approve_pending_admin_edit RPC.
 */
export async function requestBookingEdit(
  bookingId:    string,
  adminUserId:  string,
  patch:        AdminPendingEditPatch,
): Promise<void> {
  if (Object.keys(patch).length === 0) {
    throw new Error('No fields to update');
  }
  const { error } = await supabase
    .from('bookings')
    .update({
      pending_admin_edits:        patch,
      pending_edit_status:        'pending_customer_approval',
      pending_edit_requested_by:  adminUserId,
      pending_edit_requested_at:  new Date().toISOString(),
      pending_edit_resolved_at:   null,
    })
    .eq('id', bookingId);
  if (error) throw error;

  /* Look up the customer's email so the function can send. We
   * already have the booking id; one round-trip beats stuffing the
   * email through the patch payload. */
  const { data: row } = await supabase
    .from('bookings')
    .select('customer_email')
    .eq('id', bookingId)
    .maybeSingle();

  if (row?.customer_email) {
    void callEdgeFunction('send-booking-email', {
      template: 'admin_edit_request',
      to:       row.customer_email,
      bookingId,
      data: {
        bookingId,
        reviewLink: `https://flyttgo.com/dashboard?confirm=${bookingId}`,
      },
    }).catch((e) => console.warn('admin edit-request email failed:', e));
  }
}

/* ── Customer approve/decline ──────────────────────────────── */

export async function customerApproveEdit(bookingId: string): Promise<BookingRow> {
  const { data, error } = await supabase.rpc('approve_pending_admin_edit', {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  return data as BookingRow;
}

export async function customerDeclineEdit(bookingId: string): Promise<BookingRow> {
  const { data, error } = await supabase.rpc('decline_pending_admin_edit', {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  return data as BookingRow;
}

/* ── Super-admin destructive ops ──────────────────────────── */

/** RLS rejects this for non-super admins — the function returns
 *  PostgreSQL error 42501 which we surface as a readable message. */
export async function superAdminDeleteBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId);
  if (error) throw new Error(
    error.code === '42501'
      ? 'Only super-admins can delete bookings'
      : error.message
  );
}

/** Calls the SECURITY DEFINER delete_user_account RPC which double-
 *  checks the super-admin gate. Cascades into profile + driver
 *  records via the auth.users FKs. */
export async function superAdminDeleteAccount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_user_account', {
    p_user_id: userId,
  });
  if (error) throw new Error(
    error.message?.includes('not authorised')
      ? 'Only super-admins can delete accounts'
      : (error.message ?? 'Account deletion failed')
  );
}

/* ── Pending-edit fetch (customer side) ───────────────────── */

/** Returns the customer's bookings that have a pending admin edit
 *  awaiting their approval. Used by the dashboard banner. */
export async function listPendingAdminEditsForCustomer(
  customerId: string,
): Promise<BookingRow[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .eq('pending_edit_status', 'pending_customer_approval')
    .order('pending_edit_requested_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookingRow[];
}
