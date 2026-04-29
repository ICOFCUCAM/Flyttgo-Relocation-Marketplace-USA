import { supabase, supabaseFunctionUrl } from '../lib/supabase';

/* Domain row types. We keep these `any` for now because Supabase has no
 * generated types in this repo — the migration to `generate_typescript_types`
 * is tracked separately. Once those land, swap `BookingRow` for the
 * generated `Tables<'bookings'>['Row']`. */
export type BookingRow = Record<string, any> & { id: string };
export type EscrowRow  = Record<string, any> & { id: string };

export interface CreateBookingInput {
  customer: { id: string; email: string; name: string; phone: string };
  pickup:  {
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
  moveType:           string;
  vanType:            string;
  helpers:            number;
  additionalServices: string[];
  inventory:          Record<string, number>;
  moveDate:           string | null;
  moveTime:           string | null;
  notes:              string;
  distanceKm:         number;
  estimatedHours:     number;
  priceTotal:         number;
}

/** Atomic-ish create: insert the booking row, then the escrow row. The
 *  escrow insert failing is logged but doesn't roll the booking back —
 *  matches the pre-refactor behaviour. */
export async function createBookingWithEscrow(input: CreateBookingInput): Promise<BookingRow> {
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
