import { supabase } from '../lib/supabase';

/**
 * Admin analytics service. Backed by the four views in
 * docs/install-admin-analytics-views.sql. All four return small
 * pre-aggregated payloads so the dashboard doesn't run N+1 queries
 * to assemble the same numbers from raw tables.
 */

/* ── 1. KPI time-series ──────────────────────────────────────── */

export interface KpiTimeseriesRow {
  day:           string;       // YYYY-MM-DD
  bookingsCount: number;
  bookingsValue: number;
  activeDrivers: number;
}

export async function fetchKpiTimeseries(): Promise<KpiTimeseriesRow[]> {
  const { data, error } = await supabase
    .from('admin_kpi_timeseries_30d')
    .select('day, bookings_count, bookings_value, active_drivers');
  if (error) throw error;
  return (data ?? []).map(r => ({
    day:           String(r.day),
    bookingsCount: Number(r.bookings_count ?? 0),
    bookingsValue: Number(r.bookings_value ?? 0),
    activeDrivers: Number(r.active_drivers ?? 0),
  }));
}

/* ── 2. Per-country breakdown ────────────────────────────────── */

export interface CountryBreakdownRow {
  country:           string;
  bookingsTotal:     number;
  bookings30d:       number;
  bookingsCompleted: number;
  revenue30d:        number;
  driversTotal:      number;
  driversActive:     number;
  driversOnline:     number;
}

export async function fetchCountryBreakdown(): Promise<CountryBreakdownRow[]> {
  const { data, error } = await supabase
    .from('admin_country_breakdown')
    .select('country, bookings_total, bookings_30d, bookings_completed, revenue_30d, drivers_total, drivers_active, drivers_online');
  if (error) throw error;
  return (data ?? []).map(r => ({
    country:           String(r.country),
    bookingsTotal:     Number(r.bookings_total ?? 0),
    bookings30d:       Number(r.bookings_30d ?? 0),
    bookingsCompleted: Number(r.bookings_completed ?? 0),
    revenue30d:        Number(r.revenue_30d ?? 0),
    driversTotal:      Number(r.drivers_total ?? 0),
    driversActive:     Number(r.drivers_active ?? 0),
    driversOnline:     Number(r.drivers_online ?? 0),
  }));
}

/* ── 3. Acquisition funnel ───────────────────────────────────── */

export interface AcquisitionFunnel {
  applied:               number;
  approved:              number;
  active:                number;
  firstBookingCompleted: number;
}

export async function fetchAcquisitionFunnel(): Promise<AcquisitionFunnel> {
  const { data, error } = await supabase
    .from('admin_acquisition_funnel')
    .select('applied, approved, active, first_booking_completed')
    .single();
  if (error) throw error;
  return {
    applied:               Number(data?.applied ?? 0),
    approved:              Number(data?.approved ?? 0),
    active:                Number(data?.active ?? 0),
    firstBookingCompleted: Number(data?.first_booking_completed ?? 0),
  };
}

/* ── 4. Driver cohort retention ──────────────────────────────── */

export interface CohortRow {
  cohortMonth: string;       // YYYY-MM-DD (first of the month)
  cohortSize:  number;
  activeW0:    number;
  activeW1:    number;
  activeW2:    number;
  activeW3:    number;
  activeW4:    number;
}

export async function fetchDriverCohorts(): Promise<CohortRow[]> {
  const { data, error } = await supabase
    .from('admin_driver_cohort_30d')
    .select('cohort_month, cohort_size, active_w0, active_w1, active_w2, active_w3, active_w4');
  if (error) throw error;
  return (data ?? []).map(r => ({
    cohortMonth: String(r.cohort_month),
    cohortSize:  Number(r.cohort_size ?? 0),
    activeW0:    Number(r.active_w0 ?? 0),
    activeW1:    Number(r.active_w1 ?? 0),
    activeW2:    Number(r.active_w2 ?? 0),
    activeW3:    Number(r.active_w3 ?? 0),
    activeW4:    Number(r.active_w4 ?? 0),
  }));
}
