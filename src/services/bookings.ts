import { z } from 'zod';
import { supabase, supabaseFunctionUrl } from '../lib/supabase';

/* Domain row types. We keep these `any` for now because Supabase has no
 * generated types in this repo — the migration to `generate_typescript_types`
 * is tracked separately. Once those land, swap `BookingRow` for the
 * generated `Tables<'bookings'>['Row']`. */
export type BookingRow = Record<string, any> & { id: string };
export type EscrowRow  = Record<string, any> & { id: string };

/**
 * Zod schema for the booking-creation payload.
 *
 * Why a schema at the service boundary: this is the single
 * customer-input mutation in the entire marketplace flow. The
 * pre-refactor inline insert trusted whatever the React component
 * sent — meaning a UI bug (or a malicious request from a tampered
 * SDK consumer once we ship a public API) could write nonsense rows.
 * Validating here means every caller — components, edge functions,
 * future SDK — runs the same checks.
 *
 * Constraints mirror the bookings table CHECKs + sensible product
 * floors (positive price, finite distance, valid email).
 */
export const CreateBookingInputSchema = z.object({
  customer: z.object({
    id:    z.string().uuid('Invalid customer id'),
    email: z.string().email('Invalid email'),
    name:  z.string().trim().min(1, 'Name required').max(120),
    phone: z.string().trim().min(3, 'Phone required').max(40),
  }),
  pickup: z.object({
    address:  z.string().trim().min(3, 'Pickup address required').max(500),
    postcode: z.string().trim().max(20),
    city:     z.string().trim().max(120),
    lat:      z.number().min(-90).max(90).nullable(),
    lng:      z.number().min(-180).max(180).nullable(),
  }),
  dropoff: z.object({
    address:  z.string().trim().min(3, 'Drop-off address required').max(500),
    postcode: z.string().trim().max(20),
    city:     z.string().trim().max(120),
    lat:      z.number().min(-90).max(90).nullable(),
    lng:      z.number().min(-180).max(180).nullable(),
  }),
  moveType:           z.string().trim().min(1, 'Move type required').max(40),
  vanType:            z.string().trim().min(1, 'Van type required').max(40),
  helpers:            z.number().int().min(0).max(10),
  additionalServices: z.array(z.string()).max(20),
  inventory:          z.record(z.number().int().min(0)),
  moveDate:           z.string().nullable(),
  moveTime:           z.string().nullable(),
  notes:              z.string().max(2000),
  distanceKm:         z.number().nonnegative().finite(),
  estimatedHours:     z.number().positive().max(48),
  priceTotal:         z.number().positive().finite(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>;

/** Atomic-ish create: validate the payload, insert the booking row,
 *  then the escrow row. The escrow insert failing is logged but
 *  doesn't roll the booking back — matches the pre-refactor behaviour. */
export async function createBookingWithEscrow(rawInput: CreateBookingInput): Promise<BookingRow> {
  /* Throw a single readable string when validation fails so the UI
   * can surface it directly. ZodError formatting is preserved in the
   * cause for debugging. */
  const parsed = CreateBookingInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path  = first.path.join('.');
    throw new Error(`${path ? `${path}: ` : ''}${first.message}`);
  }
  const input = parsed.data;

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      customer_id:     input.customer.id,
      customer_email:  input.customer.email,
      customer_name:   input.customer.name,
      customer_phone:  input.customer.phone,

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

      move_type:           input.moveType,
      van_type:            input.vanType,
      helpers:             input.helpers,
      additional_services: input.additionalServices,
      items:               input.inventory,

      move_date:      input.moveDate,
      move_time:      input.moveTime,
      customer_notes: input.notes,

      distance_km:     input.distanceKm,
      estimated_hours: input.estimatedHours,
      price_estimate:  input.priceTotal,
      original_price:  input.priceTotal,

      status:         'pending',
      payment_status: 'pending',
    })
    .select()
    .single();
  if (bookingError) throw bookingError;

  const { error: escrowError } = await supabase
    .from('escrow_payments')
    .insert({
      booking_id:      booking.id,
      amount:          input.priceTotal,
      original_amount: input.priceTotal,
      status:          'held',
    });
  if (escrowError) console.warn('Escrow insert failed:', escrowError);

  return booking as BookingRow;
}

/** Customer's bookings, newest first. Empty array if Supabase returns null. */
export async function listBookingsForCustomer(customerId: string): Promise<BookingRow[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookingRow[];
}

/** Escrow rows for many bookings, returned as a map keyed by booking_id.
 *  Used by MyBookings to render the per-row "approve adjustment" CTA
 *  without N+1 queries. */
export async function getEscrowMapForBookings(bookingIds: string[]): Promise<Record<string, EscrowRow>> {
  if (bookingIds.length === 0) return {};
  const { data, error } = await supabase
    .from('escrow_payments')
    .select('*')
    .in('booking_id', bookingIds);
  if (error) throw error;
  const map: Record<string, EscrowRow> = {};
  (data ?? []).forEach(e => { map[e.booking_id as string] = e as EscrowRow; });
  return map;
}

/** Escrow row tied to a booking, or null if none exists yet. */
export async function getEscrowForBooking(bookingId: string): Promise<EscrowRow | null> {
  const { data, error } = await supabase
    .from('escrow_payments')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return (data as EscrowRow) ?? null;
}

/** Flip the customer's confirmation flag — a DB trigger releases escrow
 *  once the driver flag is also true. */
export async function setCustomerConfirmation(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ customer_confirmation: true })
    .eq('id', bookingId);
  if (error) throw error;
}

/** Returns `true` when the driver has already confirmed this booking. */
export async function hasDriverConfirmed(bookingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bookings')
    .select('driver_confirmation')
    .eq('id', bookingId)
    .single();
  if (error) throw error;
  return data?.driver_confirmation === true;
}

/** Approve the additional-time charge on the escrow row. */
export async function approveEscrowAdjustment(escrowId: string): Promise<void> {
  const { error } = await supabase
    .from('escrow_payments')
    .update({ adjustment_approved: true })
    .eq('id', escrowId);
  if (error) throw error;
}

/** Mark a booking as cancelled. RLS on the table enforces ownership. */
export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  if (error) throw error;
}

/** Trigger the `process-payment` edge function with a release-escrow action. */
export async function releaseEscrow(bookingId: string): Promise<void> {
  const res = await fetch(supabaseFunctionUrl('process-payment'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'release_escrow', bookingId }),
  });
  if (!res.ok) throw new Error(`release_escrow failed: ${res.status}`);
}
