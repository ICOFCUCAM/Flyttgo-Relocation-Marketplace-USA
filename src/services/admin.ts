import { supabase } from '../lib/supabase';
import { safeNumber, calculateRefundAmount, REQUIRED_DOCS, DOCUMENT_TYPE_LABELS } from '../components/admin/utils';

/* ─────────────────────────────────────────────────────────────────
 * Admin service layer
 *
 * Every Supabase call the admin dashboard makes lives here. Components
 * import the typed helpers below and stay UI-only. React Query hooks
 * (src/hooks/queries/useAdminDashboard.ts) wrap these for caching,
 * mutation tracking, and realtime invalidation.
 *
 * Rows are typed as `Record<string, any>` for now because we don't
 * yet generate Supabase types in this repo — once that lands, replace
 * each Row alias with the generated `Tables<'name'>['Row']`.
 * ───────────────────────────────────────────────────────────────── */

export type DriverRow      = Record<string, any> & { id: string };
export type BookingRow     = Record<string, any> & { id: string };
export type ApplicationRow = Record<string, any> & { id: string };
export type DocumentRow    = Record<string, any> & { id: string };
export type ActivityItem   = { id: string; message: string; created_at: string };
export type TimelineEvent  = { time: string; message: string };

export type FleetCapacity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DriverStatusStats {
  online:    number;
  busy:      number;
  pending:   number;
  suspended: number;
}

export interface BookingPipeline {
  pending:        number;
  confirmed:      number;
  assigned:       number;
  inTransit:      number;
  completedToday: number;
  cancelledToday: number;
}

export interface RevenueStats {
  today:             number;
  week:              number;
  month:             number;
  totalCommission:   number;
  pendingEscrow:     number;
  releasedToDrivers: number;
}

export interface AdminDashboardSnapshot {
  drivers:                   DriverRow[];
  bookings:                  BookingRow[];
  applications:              ApplicationRow[];
  applicationDocStatus:      Record<string, string[]>;
  driverSubExpiry:           Record<string, string | null>;
  customerCount:             number;
  activeDrivers:             number;
  activeBookings:            number;
  fleetCapacity:             FleetCapacity;
  delayedBookingsCount:      number;
  highValueBookingsCount:    number;
  dispatchOverload:          boolean;
  totalRevenue:              number;
  recentActivity:            ActivityItem[];
  bookingPipeline:           BookingPipeline;
  driverStatusStats:         DriverStatusStats;
  revenueStats:              RevenueStats;
}

/* ── Subscription expiry sweep ─────────────────────────────────── */

/** Walk the active driver_subscriptions table and cancel any whose
 *  end_date has passed; suspend the corresponding driver. Side-effecty
 *  but cheap; kicked off at the start of every dashboard refresh. */
export async function enforceSubscriptionExpiry(): Promise<void> {
  const { data } = await supabase
    .from('driver_subscriptions')
    .select('driver_id, end_date')
    .eq('subscription_status', 'active');
  if (!data) return;
  for (const sub of data) {
    if (sub.end_date && new Date(sub.end_date) < new Date()) {
      await supabase
        .from('driver_subscriptions')
        .update({ subscription_status: 'cancelled' })
        .eq('driver_id', sub.driver_id);
      await supabase
        .from('driver_profiles')
        .update({ status: 'suspended' })
        .eq('user_id', sub.driver_id);
    }
  }
}

/* ── Snapshot fetcher ──────────────────────────────────────────── */

export async function fetchAdminSnapshot(): Promise<AdminDashboardSnapshot> {
  await enforceSubscriptionExpiry();

  const today = new Date();
  const todayStr = today.toDateString();
  const sameMonthYear = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

  const [drvRes, bksRes, appsRes, subsRes, customersRes, driversOnlineRes, activeJobsRes,
         commissionRes, subPaymentsRes, escrowRes, latestBookingsRes] = await Promise.all([
    supabase.from('driver_profiles').select('*, driver_subscriptions(plan)'),
    supabase.from('bookings').select('*').order('created_at', { ascending: false }),
    supabase.from('driver_applications').select('*'),
    supabase.from('driver_subscriptions').select('driver_id, end_date, plan_id, subscription_status').eq('subscription_status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('driver_profiles').select('*', { count: 'exact', head: true }).eq('online', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['pending', 'confirmed', 'driver_assigned', 'in_transit']),
    supabase.from('commission_ledger').select('commission_amount, created_at'),
    supabase.from('subscription_payments').select('amount, created_at'),
    supabase.from('escrow_payments').select('status, driver_earning, created_at'),
    supabase.from('bookings').select('id, status, driver_id, created_at').order('created_at', { ascending: false }).limit(3),
  ]);

  const drivers = (drvRes.data ?? []) as DriverRow[];
  const bookings = (bksRes.data ?? []) as BookingRow[];
  const applications = (appsRes.data ?? []) as ApplicationRow[];

  /* Driver status breakdown. */
  let online = 0, busy = 0, pending = 0, suspended = 0;
  drivers.forEach(d => {
    if (d.online === true) online++;
    if (d.availability_status === 'busy' || d.is_busy === true || (d.online === true && d.status === 'active')) busy++;
    if (d.status === 'pending') pending++;
    if (d.status === 'suspended') suspended++;
  });

  /* Booking pipeline counters. */
  let pPending = 0, pConfirmed = 0, pAssigned = 0, pInTransit = 0,
      pCompletedToday = 0, pCancelledToday = 0, delayed = 0, highValue = 0;
  const now = new Date();
  bookings.forEach(b => {
    const created = new Date(b.created_at);
    const ageMin = (now.getTime() - created.getTime()) / 60_000;
    const price = safeNumber(b.price_estimate);
    if (b.status === 'pending') pPending++;
    if (b.status === 'confirmed') { pConfirmed++; if (ageMin > 10) delayed++; }
    if (b.status === 'driver_assigned') pAssigned++;
    if (b.status === 'in_transit') pInTransit++;
    if (b.status === 'completed' && created.toDateString() === todayStr) pCompletedToday++;
    if (b.status === 'cancelled' && created.toDateString() === todayStr) pCancelledToday++;
    if (price >= 3000 && (b.status === 'pending' || b.status === 'confirmed')) highValue++;
  });

  /* Application doc approvals — fetched per-app because driver_documents
   * is keyed by user_id. */
  const docMap: Record<string, string[]> = {};
  for (const app of applications) {
    const { data: docs } = await supabase
      .from('driver_documents')
      .select('document_type, verification_status')
      .eq('driver_id', app.user_id);
    docMap[app.id] = (docs ?? [])
      .filter(d => d.verification_status === 'approved')
      .map(d => d.document_type);
  }

  const driverSubExpiry: Record<string, string | null> = {};
  (subsRes.data ?? []).forEach(s => { driverSubExpiry[s.driver_id] = s.end_date ?? null; });

  /* Revenue totals. */
  let revenueSum = 0;
  let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
  let commission = 0, pendingEscrow = 0, released = 0;
  (commissionRes.data ?? []).forEach(p => {
    const created = new Date(p.created_at);
    const amt = safeNumber(p.commission_amount);
    if (created.toDateString() === todayStr) todayRevenue += amt;
    if (today.getTime() - created.getTime() < 7 * 86_400_000) weekRevenue += amt;
    if (sameMonthYear(created, today)) monthRevenue += amt;
    commission += amt;
    revenueSum += amt;
  });
  (subPaymentsRes.data ?? []).forEach(p => {
    const created = new Date(p.created_at);
    const amt = safeNumber(p.amount);
    if (created.toDateString() === todayStr) todayRevenue += amt;
    if (today.getTime() - created.getTime() < 7 * 86_400_000) weekRevenue += amt;
    if (sameMonthYear(created, today)) monthRevenue += amt;
    revenueSum += amt;
  });
  (escrowRes.data ?? []).forEach(p => {
    if (p.status === 'escrow') pendingEscrow += safeNumber(p.driver_earning);
    if (p.status === 'released') released += safeNumber(p.driver_earning);
  });

  /* Recent activity feed from latest 3 bookings. */
  const msgs: Record<string, string> = {
    pending:         '🕓 New booking requested',
    confirmed:       '✅ Booking confirmed',
    driver_assigned: '🚚 Driver assigned',
    in_transit:      '📦 Delivery in progress',
    completed:       '🎉 Booking completed',
    cancelled:       '❌ Booking cancelled',
  };
  const recentActivity: ActivityItem[] = (latestBookingsRes.data ?? [])
    .map(b => ({
      id:         `booking-${b.id}`,
      message:    msgs[b.status as string] ?? `Booking: ${b.status}`,
      created_at: b.created_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const customerCount    = customersRes.count ?? 0;
  const activeDriversNum = driversOnlineRes.count ?? 0;
  const activeBookings   = activeJobsRes.count ?? 0;

  let fleetCapacity: FleetCapacity = 'HIGH';
  if (activeDriversNum >= activeBookings) fleetCapacity = 'HIGH';
  else if (activeDriversNum >= activeBookings * 0.5) fleetCapacity = 'MEDIUM';
  else fleetCapacity = 'LOW';

  return {
    drivers,
    bookings,
    applications,
    applicationDocStatus:   docMap,
    driverSubExpiry,
    customerCount,
    activeDrivers:          activeDriversNum,
    activeBookings,
    fleetCapacity,
    delayedBookingsCount:   delayed,
    highValueBookingsCount: highValue,
    dispatchOverload:       pConfirmed > activeDriversNum,
    totalRevenue:           revenueSum,
    recentActivity,
    bookingPipeline: {
      pending:        pPending,
      confirmed:      pConfirmed,
      assigned:       pAssigned,
      inTransit:      pInTransit,
      completedToday: pCompletedToday,
      cancelledToday: pCancelledToday,
    },
    driverStatusStats: { online, busy, pending, suspended },
    revenueStats: {
      today:             todayRevenue,
      week:              weekRevenue,
      month:             monthRevenue,
      totalCommission:   commission,
      pendingEscrow,
      releasedToDrivers: released,
    },
  };
}

/* ── Booking timeline ──────────────────────────────────────────── */

export async function fetchBookingTimeline(bookingId: string): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];
  const [updates, dispatches, escrow] = await Promise.all([
    supabase.from('booking_updates').select('status, created_at').eq('booking_id', bookingId),
    supabase.from('dispatch_logs').select('response, created_at').eq('booking_id', bookingId),
    supabase.from('escrow_payments').select('status, created_at').eq('booking_id', bookingId),
  ]);
  (updates.data ?? []).forEach(u => events.push({ time: u.created_at, message: `📋 Booking status → ${u.status}` }));
  (dispatches.data ?? []).forEach(d => events.push({ time: d.created_at, message: `🚚 Dispatch: ${d.response ?? 'notified'}` }));
  (escrow.data ?? []).forEach(e => events.push({ time: e.created_at, message: `🔐 Escrow: ${e.status}` }));
  return events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

/* ── Platform settings ─────────────────────────────────────────── */

export async function fetchPlatformSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from('platform_config').select('*');
  if (!data) return {};
  const map: Record<string, string> = {};
  data.forEach(row => { map[row.config_key] = row.config_value; });
  return map;
}

export async function updatePlatformSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('platform_config')
    .update({ config_value: value })
    .eq('config_key', key);
  if (error) throw error;
}

/* ── Driver mutations ──────────────────────────────────────────── */

export async function updateDriverStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('driver_profiles').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function assignDriverPlan(driverId: string, plan: string): Promise<void> {
  const { error } = await supabase.from('driver_subscriptions').insert({ driver_id: driverId, plan });
  if (error) throw error;
}

/* ── Payment mutations ─────────────────────────────────────────── */

export async function releaseBookingPayment(booking: BookingRow): Promise<void> {
  const driverId = booking.driver_id as string;
  const driverEarning = safeNumber(booking.price_estimate);
  const { error: rpcErr } = await supabase.rpc('increment_driver_wallet', {
    p_driver_id: driverId,
    p_amount:    driverEarning,
  });
  if (rpcErr) throw rpcErr;
  await supabase.from('driver_wallet_transactions').insert({
    driver_id:  driverId,
    booking_id: booking.id,
    type:       'escrow_release',
    amount:     driverEarning,
  });
  await supabase.from('escrow_payments').update({ status: 'released' }).eq('booking_id', booking.id);
  await supabase.from('bookings').update({ payment_status: 'released' }).eq('id', booking.id);
}

export async function refundBookingPayment(booking: BookingRow): Promise<number> {
  const refundAmount = calculateRefundAmount(booking);
  if (refundAmount === 0) throw new Error('Refund not allowed at this stage.');
  const driverId = booking.driver_id as string;
  const { error: rpcErr } = await supabase.rpc('decrement_driver_wallet', {
    p_driver_id: driverId,
    p_amount:    refundAmount,
  });
  if (rpcErr) throw rpcErr;
  await supabase.from('driver_wallet_transactions').insert({
    driver_id:  driverId,
    booking_id: booking.id,
    type:       'refund_reversal',
    amount:     refundAmount,
  });
  await supabase.from('escrow_payments').update({
    status:        'refunded',
    refund_amount: refundAmount,
  }).eq('booking_id', booking.id);
  return refundAmount;
}

export async function applyManualRefundOverride(bookingId: string, percent: number): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ manual_refund_percent: percent })
    .eq('id', bookingId);
  if (error) throw error;
}

/* ── Dispatch ──────────────────────────────────────────────────── */

export async function manualDispatchBooking(bookingId: string, driverId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ driver_id: driverId, status: 'driver_assigned' })
    .eq('id', bookingId);
  if (error) throw error;
}

export interface AutoDispatchResult {
  success:      boolean;
  reason?:      string;
  driver_id?:   string;
  driver_name?: string;
  score?:       number;
  distance_km?: number;
  same_city?:   boolean;
}

export async function autoDispatchBooking(bookingId: string): Promise<AutoDispatchResult> {
  const { data, error } = await supabase.rpc('dispatch_assign_best_driver', { p_booking_id: bookingId });
  if (error) throw error;
  return (data ?? { success: false, reason: 'unknown' }) as AutoDispatchResult;
}

export async function reclaimStaleDispatches(timeoutMinutes = 5): Promise<number> {
  const { data, error } = await supabase.rpc('reclaim_stale_dispatches', { p_timeout_minutes: timeoutMinutes });
  if (error) throw error;
  return Number(data ?? 0);
}

/* ── Driver applications ───────────────────────────────────────── */

export interface ReviewApplicationInput {
  applicationId:    string;
  action:           'approved' | 'rejected' | string;
  reviewerUserId:   string;
  rejectionReason?: string | null;
}

export interface ReviewApplicationResult {
  activated:    boolean;
  missingDocs?: string[];
}

/** Approve or reject an application. On approval, also activates the
 *  driver_profile if all REQUIRED_DOCS are approved; otherwise reports
 *  back which docs are missing so the UI can surface them. */
export async function reviewDriverApplication(
  input: ReviewApplicationInput,
): Promise<ReviewApplicationResult> {
  const { data: app } = await supabase
    .from('driver_applications')
    .select('*')
    .eq('id', input.applicationId)
    .single();
  if (!app) throw new Error('Application not found');

  const reviewPayload: Record<string, any> = {
    status:           input.action,
    reviewed_by:      input.reviewerUserId,
    reviewed_at:      new Date().toISOString(),
    rejection_reason: input.action === 'rejected' ? (input.rejectionReason ?? null) : null,
  };

  await supabase.from('driver_applications').update(reviewPayload).eq('id', input.applicationId);
  if (input.action !== 'approved') return { activated: false };

  const { data: docs } = await supabase
    .from('driver_documents')
    .select('document_type, verification_status')
    .eq('driver_id', app.user_id);
  const approvedDocs = (docs ?? [])
    .filter(d => d.verification_status === 'approved')
    .map(d => d.document_type as string);
  const missing = REQUIRED_DOCS.filter(doc => !approvedDocs.includes(doc));
  if (missing.length > 0) {
    return {
      activated:   false,
      missingDocs: missing.map(d => DOCUMENT_TYPE_LABELS[d] ?? d),
    };
  }

  await supabase.from('driver_profiles').insert({
    user_id:   app.user_id,
    full_name: `${app.first_name} ${app.last_name}`,
    phone:     app.phone,
    status:    'approved',
    online:    false,
  });
  return { activated: true };
}

export async function fetchApplicationDocuments(applicationId: string, userId: string): Promise<DocumentRow[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('driver_documents')
    .select('id, document_type, file_url, verification_status, uploaded_at')
    .eq('driver_id', userId)
    .order('uploaded_at', { ascending: true });
  void applicationId;
  return error || !data ? [] : (data as DocumentRow[]);
}

export function getDocumentPublicUrl(storagePath: string): string {
  return supabase.storage.from('driver-documents').getPublicUrl(storagePath).data.publicUrl;
}

export async function setDocumentVerification(documentId: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await supabase
    .from('driver_documents')
    .update({ verification_status: status })
    .eq('id', documentId);
  if (error) throw error;
}

/* ── Realtime ──────────────────────────────────────────────────── */

/** Subscribe to changes across the admin-relevant tables. The
 *  callback fires (debounced via the caller) when any row changes;
 *  caller is expected to invalidate React Query caches. */
export function subscribeAdminTables(onChange: () => void): () => void {
  const tables = [
    'bookings', 'driver_profiles', 'driver_applications',
    'escrow_payments', 'driver_wallet_transactions', 'driver_subscriptions',
  ];
  const channels = tables.map(table =>
    supabase
      .channel(`admin-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange())
      .subscribe(),
  );
  return () => channels.forEach(c => supabase.removeChannel(c));
}
