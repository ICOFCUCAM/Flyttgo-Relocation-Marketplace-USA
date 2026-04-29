import { supabase, supabaseFunctionUrl } from '../lib/supabase';

/* Domain row types. We keep these `any` for now because Supabase has no
 * generated types in this repo — the migration to `generate_typescript_types`
 * is tracked separately. Once those land, swap `BookingRow` for the
 * generated `Tables<'bookings'>['Row']`. */
export type BookingRow = Record<string, any> & { id: string };
export type EscrowRow  = Record<string, any> & { id: string };

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
