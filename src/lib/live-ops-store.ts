import { supabase } from './supabase';

/* ─────────────────────────────────────────────────────────────────
 * Live Operations Control Center store
 *
 * Typed wrappers around the docs/install-live-ops.sql RPCs:
 *
 *   live_ops_overview()             — global counts envelope
 *   live_ops_by_country()           — per-country activity rows
 *   live_ops_provider_availability  — capability heatmap (lat/lng grid)
 *   live_ops_revenue(period)        — today / week / month gross
 *
 * Plus a thin reader for the public deployment_regions table that
 * powers the homepage readiness strip.
 *
 * All RPCs are STABLE and side-effect-free; safe to poll on a 30s
 * interval from the admin shell. RLS keeps the bookings/disputes/
 * RFP counts admin-only without us having to enforce it client-side.
 * ───────────────────────────────────────────────────────────────── */

export type DeploymentStatus =
  | 'operational' | 'expanding' | 'pilot' | 'partner' | 'planned';

export interface DeploymentRegionRow {
  country_code:   string;
  display_name:   string;
  flag:           string | null;
  status:         DeploymentStatus;
  region:         string;
  blurb:          string | null;
  position:       number;
  updated_at:     string;
}

export interface LiveOpsOverview {
  active_jobs:                    number;
  pending_bookings:               number;
  bookings_today:                 number;
  bookings_tomorrow:              number;
  new_provider_applications_7d:   number;
  pending_applications:           number;
  open_relocation_requests:       number;
  rfp_submissions_7d:             number;
  open_disputes:                  number;
  active_paid_subscriptions:      number;
  gross_bookings_today_usd:       number;
  gross_bookings_week_usd:        number;
  generated_at:                   string;
}

export interface CountryActivityRow {
  country_code:          string;
  display_name:          string;
  flag:                  string | null;
  status:                DeploymentStatus;
  region:                string;
  active_jobs:           number;
  pending_bookings:      number;
  enterprise_pending:    number;
  open_disputes:         number;
  providers_onboarding:  number;
}

export interface AvailabilityBucketRow {
  bucket:           string;     // "lat,lng" 1° grid
  provider_count:   number;
  truck_count:      number;
  packing_count:    number;
  storage_count:    number;
  vacation_count:   number;
}

export type RevenuePeriod = 'today' | 'week' | 'month';

export interface RevenueSnapshot {
  period:                  RevenuePeriod;
  since:                   string;
  booking_count:           number;
  gross_bookings_usd:      number;
  gross_subscriptions_usd: number;
  gross_total_usd:         number;
  generated_at:            string;
}

/* ── RPC wrappers ─────────────────────────────────────────────── */

export async function loadLiveOpsOverview(): Promise<LiveOpsOverview> {
  const { data, error } = await supabase.rpc('live_ops_overview');
  if (error) throw new Error(`loadLiveOpsOverview failed: ${error.message}`);
  return data as LiveOpsOverview;
}

export async function loadLiveOpsByCountry(): Promise<CountryActivityRow[]> {
  const { data, error } = await supabase.rpc('live_ops_by_country');
  if (error) throw new Error(`loadLiveOpsByCountry failed: ${error.message}`);
  return (data ?? []) as CountryActivityRow[];
}

export async function loadProviderAvailability(country?: string): Promise<AvailabilityBucketRow[]> {
  const { data, error } = await supabase.rpc('live_ops_provider_availability', {
    p_country: country ?? null,
  });
  if (error) throw new Error(`loadProviderAvailability failed: ${error.message}`);
  return (data ?? []) as AvailabilityBucketRow[];
}

export async function loadLiveOpsRevenue(period: RevenuePeriod = 'today'): Promise<RevenueSnapshot> {
  const { data, error } = await supabase.rpc('live_ops_revenue', { p_period: period });
  if (error) throw new Error(`loadLiveOpsRevenue failed: ${error.message}`);
  return data as RevenueSnapshot;
}

/** Public — anon-readable. Used by the homepage readiness strip. */
export async function listDeploymentRegions(): Promise<DeploymentRegionRow[]> {
  const { data, error } = await supabase
    .from('deployment_regions')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw new Error(`listDeploymentRegions failed: ${error.message}`);
  return (data ?? []) as DeploymentRegionRow[];
}
