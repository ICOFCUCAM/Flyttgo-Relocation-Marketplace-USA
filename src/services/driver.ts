import { supabase, supabaseFunctionUrl } from '../lib/supabase';

/* ─────────────────────────────────────────────────────────────────
 * Driver service layer
 *
 * Wraps every Supabase / RPC call the DriverPortal makes. Pure
 * functions, throw on error. Components use the React Query hooks in
 * src/hooks/queries/useDriverPortal.ts to consume these.
 * ───────────────────────────────────────────────────────────────── */

export type ApplicationRow  = Record<string, any> & { id: string };
export type DriverRow       = Record<string, any> & { id: string };
export type WalletRow       = Record<string, any> & { driver_id: string };
export type JobRow          = Record<string, any> & { id: string };
export type SubscriptionRow = Record<string, any> & { id: string };
export type TransactionRow  = Record<string, any> & { id: string };

/* ── Application + driver profile ──────────────────────────────── */

export async function getDriverApplication(userId: string): Promise<ApplicationRow | null> {
  const { data, error } = await supabase
    .from('driver_applications')
    .select('id, status, rejection_reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ApplicationRow) ?? null;
}

export async function getDriverProfile(userId: string): Promise<DriverRow | null> {
  /* driver_profiles.user_id is a FK to auth.users.id. */
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as DriverRow) ?? null;
}

/* ── Subscriptions ─────────────────────────────────────────────── */

export async function getCurrentSubscription(userId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('driver_subscriptions')
    .select('*')
    .eq('driver_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SubscriptionRow) ?? null;
}

/** Client-side opportunistic expiry check. Real enforcement lives in
 *  the pg_cron job (docs/subscription-expiry-cron.sql). This only
 *  helps the visiting driver get their state updated immediately. */
export async function enforceSubscriptionExpiry(userId: string): Promise<void> {
  const { data: sub } = await supabase
    .from('driver_subscriptions')
    .select('id, driver_id, end_date, subscription_status')
    .eq('driver_id', userId)
    .eq('subscription_status', 'active')
    .maybeSingle();
  if (!sub || !sub.end_date) return;
  if (new Date(sub.end_date) >= new Date()) return;

  await supabase
    .from('driver_subscriptions')
    .update({ subscription_status: 'expired' })
    .eq('id', sub.id);
  await supabase
    .from('driver_subscriptions')
    .insert({
      driver_id:           userId,
      plan:                'free',
      subscription_status: 'active',
      start_date:          new Date().toISOString(),
      end_date:            null,
    });
}

export async function changeDriverSubscription(userId: string, planId: string): Promise<void> {
  const { error } = await supabase.rpc('change_driver_subscription', {
    p_driver_id: userId,
    p_new_plan:  planId,
  });
  if (error) throw error;
}

export async function logSubscriptionCredit(
  driverId: string,
  amount: number,
  description: string,
): Promise<void> {
  const { error } = await supabase.from('driver_wallet_transactions').insert({
    driver_id:  driverId,
    type:       'subscription_credit',
    amount,
    description,
  });
  if (error) throw error;
}

/* ── Wallet + transactions ─────────────────────────────────────── */

export async function getDriverWallet(driverId: string): Promise<WalletRow> {
  const { data, error } = await supabase
    .from('driver_wallets')
    .select('*')
    .eq('driver_id', driverId)
    .maybeSingle();
  if (error) throw error;
  return (data as WalletRow) ?? { driver_id: driverId, balance: 0, pending: 0, total_earned: 0 };
}

export async function listDriverTransactions(driverId: string): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('driver_wallet_transactions')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TransactionRow[];
}

export async function requestPayout(driverId: string, amount: number): Promise<void> {
  const { error } = await supabase.from('payout_requests').insert({ driver_id: driverId, amount });
  if (error) throw error;
}

/* ── Jobs ──────────────────────────────────────────────────────── */

export async function listDriverJobs(driverId: string): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .or(`status.eq.pending,driver_id.eq.${driverId}`);
  if (error) throw error;
  return (data ?? []) as JobRow[];
}

/** Race-safe accept: compare-and-swap UPDATE that only succeeds if
 *  the booking is still unassigned. Returns true if we won the race. */
export async function acceptJob(driverId: string, jobId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('bookings')
    .update({ driver_id: driverId, status: 'driver_assigned' })
    .eq('id', jobId)
    .is('driver_id', null)
    .select('id');
  if (error) throw error;
  return !!data && data.length > 0;
}

export async function startJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'in_transit', start_time: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw error;
}

export async function finishJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed', end_time: new Date().toISOString() })
    .eq('id', jobId);
  if (error) throw error;
  await fetch(supabaseFunctionUrl('process-payment'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'recalculate_price', bookingId: jobId }),
  });
}

export async function setDriverConfirmation(jobId: string): Promise<{ customerDone: boolean }> {
  const { error } = await supabase
    .from('bookings')
    .update({ driver_confirmation: true })
    .eq('id', jobId);
  if (error) throw error;
  const { data } = await supabase
    .from('bookings')
    .select('customer_confirmation')
    .eq('id', jobId)
    .single();
  const customerDone = data?.customer_confirmation === true;
  if (customerDone) {
    await fetch(supabaseFunctionUrl('process-payment'), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'release_escrow', bookingId: jobId }),
    });
  }
  return { customerDone };
}

export async function setDriverOnline(driverId: string, online: boolean): Promise<void> {
  const { error } = await supabase
    .from('driver_profiles')
    .update({ online })
    .eq('id', driverId);
  if (error) throw error;
}

/* ── Stripe checkout for paid plans ────────────────────────────── */

export interface CheckoutPayload {
  type:           'subscription';
  planId:         string;
  planLabel:      string;
  driverId:       string;
  userId:         string;
  amount:         number;
  amountExVat:    number;
  vatAmount:      number;
  billing:        string;
  prorationNote:  string;
  proration:      Record<string, any> | null;
  description:    string;
}

export async function createSubscriptionCheckout(payload: CheckoutPayload): Promise<{ url?: string; sessionId?: string }> {
  const res = await fetch(supabaseFunctionUrl('create-checkout-session'), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`create-checkout-session failed: ${res.status}`);
  return res.json();
}
