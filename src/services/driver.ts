import { z } from 'zod';
import { supabase } from '../lib/supabase';
import {
  ZUuid, ZShortString, ZMoneyMajor, ZMoneyMinor,
  ZDriverPlan, parseOrThrow,
} from './_schemas';
import { callEdgeFunction } from './_edge';

/* ─────────────────────────────────────────────────────────────────
 * Driver service layer
 *
 * Wraps every Supabase / RPC call the DriverPortal makes. Pure
 * functions, throw on error. Components use the React Query hooks in
 * src/hooks/queries/useDriverPortal.ts to consume these.
 * ───────────────────────────────────────────────────────────────── */

import type {
  DriverApplicationRow as ApplicationRow,
  DriverProfileRow as DriverRow,
  DriverWalletRow as WalletRow,
  BookingRow as JobRow,
  DriverSubscriptionRow as SubscriptionRow,
  DriverWalletTransactionRow as TransactionRow,
} from '../lib/database.types';

export type { ApplicationRow, DriverRow, WalletRow, JobRow, SubscriptionRow, TransactionRow };

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

export const ChangeDriverSubscriptionSchema = z.object({
  userId: ZUuid,
  planId: ZDriverPlan,
});

export async function changeDriverSubscription(userId: string, planId: string): Promise<void> {
  const v = parseOrThrow(ChangeDriverSubscriptionSchema, { userId, planId });
  const { error } = await supabase.rpc('change_driver_subscription', {
    p_driver_id: v.userId,
    p_new_plan:  v.planId,
  });
  if (error) throw error;
}

export const LogSubscriptionCreditSchema = z.object({
  driverId:    ZUuid,
  amount:      ZMoneyMajor,
  description: ZShortString('description', 500),
});

export async function logSubscriptionCredit(
  driverId: string,
  amount: number,
  description: string,
): Promise<void> {
  const v = parseOrThrow(LogSubscriptionCreditSchema, { driverId, amount, description });
  const { error } = await supabase.from('driver_wallet_transactions').insert({
    driver_id:   v.driverId,
    type:        'subscription_credit',
    amount:      v.amount,
    description: v.description,
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
  if (data) return data as WalletRow;
  /* Brand-new driver — no wallet row yet. Return a synthetic empty
   * shape so the UI can render zeros without optional-chaining every
   * field. The fake `id` makes the row easy to spot if it ever leaks
   * into a write path (which it shouldn't — service callers only
   * read). */
  return {
    id:           '00000000-0000-0000-0000-000000000000',
    driver_id:    driverId,
    balance:      0,
    pending:      0,
    total_earned: 0,
    created_at:   new Date(0).toISOString(),
    updated_at:   null,
  };
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

export const RequestPayoutSchema = z.object({
  driverId: ZUuid,
  amount:   ZMoneyMajor,
});

export async function requestPayout(driverId: string, amount: number): Promise<void> {
  const v = parseOrThrow(RequestPayoutSchema, { driverId, amount });
  const { error } = await supabase.from('payout_requests').insert({ driver_id: v.driverId, amount: v.amount });
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
  /* recalculate_price runs server-side and is gated on
   * auth.uid() === bookings.driver_id by the edge function. */
  await callEdgeFunction('process-payment', { action: 'recalculate_price', bookingId: jobId });
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
    /* release_escrow is gated on caller-identity inside the edge
     * function — only the booking's customer or driver can fire it. */
    await callEdgeFunction('process-payment', { action: 'release_escrow', bookingId: jobId });
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

export const SubscriptionCheckoutPayloadSchema = z.object({
  type:           z.literal('subscription'),
  planId:         ZDriverPlan,
  planLabel:      ZShortString('planLabel', 80),
  driverId:       ZUuid,
  userId:         ZUuid,
  amount:         z.number().nonnegative().finite(),
  amountExVat:    z.number().nonnegative().finite(),
  vatAmount:      ZMoneyMinor,
  billing:        z.string().max(40),
  prorationNote:  z.string().max(500),
  proration:      z.record(z.unknown()).nullable(),
  description:    ZShortString('description', 500),
  /** Lowercase ISO-4217 currency code Stripe expects. The
   *  create-checkout-session edge function accepts usd/eur/gbp/nok/
   *  sek/dkk/cad/aed/ngn/kes; defaults to 'usd' if omitted to keep
   *  legacy callers working. */
  currency:       z.string().toLowerCase().min(3).max(3).optional(),
});
export type CheckoutPayload = z.infer<typeof SubscriptionCheckoutPayloadSchema>;

export async function createSubscriptionCheckout(rawPayload: CheckoutPayload): Promise<{ url?: string; sessionId?: string }> {
  const payload = parseOrThrow(SubscriptionCheckoutPayloadSchema, rawPayload);
  return callEdgeFunction('create-checkout-session', payload);
}
