-- ─────────────────────────────────────────────────────────────────
-- install-admin-analytics-views.sql
--
-- Powers the upgraded Operations Control Center on AdminDashboard:
--
--   1. admin_kpi_timeseries_30d    — bookings + revenue + active
--                                    drivers per day for the last
--                                    30 days (sparklines)
--   2. admin_country_breakdown     — per-country KPI rollup
--                                    (bookings + revenue + drivers)
--   3. admin_acquisition_funnel    — application → approved → online
--                                    → first-booking conversion %
--   4. admin_driver_cohort_30d     — driver retention by signup
--                                    month, "still active in week N"
--
-- security_invoker = true on every view so RLS still applies. The
-- AdminDashboard surface is already gated to role='admin' at the
-- React Query layer; the views just expose pre-aggregated columns
-- so the dashboard doesn't run N+1 queries.
--
-- Companion code:
--   src/services/adminAnalytics.ts
--   src/hooks/queries/useAdminAnalytics.ts
--   src/components/admin/analytics/*
--
-- Idempotent — drop + recreate.
-- ─────────────────────────────────────────────────────────────────

/* ── 1. Daily KPI time-series (last 30 days) ──────────────────── */

drop view if exists public.admin_kpi_timeseries_30d cascade;

create view public.admin_kpi_timeseries_30d
  with (security_invoker = true) as
with day_axis as (
  select generate_series(
    (current_date - interval '29 days')::date,
    current_date,
    interval '1 day'
  )::date as day
),
bookings_daily as (
  select date_trunc('day', created_at)::date as day,
         count(*)                              as bookings_count,
         coalesce(sum(coalesce(final_price, price_estimate, 0)), 0) as bookings_value
    from public.bookings
   where created_at >= current_date - interval '30 days'
   group by 1
),
drivers_daily as (
  /* "active drivers" on a given day = drivers who had a booking
   * either created or completed that day. Approximation; close
   * enough for the daily strip-chart. */
  select date_trunc('day', b.created_at)::date as day,
         count(distinct b.driver_id)             as active_drivers
    from public.bookings b
   where b.driver_id is not null
     and b.created_at >= current_date - interval '30 days'
   group by 1
)
select
  d.day,
  coalesce(b.bookings_count, 0)  as bookings_count,
  coalesce(b.bookings_value, 0)  as bookings_value,
  coalesce(dd.active_drivers, 0) as active_drivers
from day_axis d
left join bookings_daily b on b.day = d.day
left join drivers_daily dd on dd.day = d.day
order by d.day;

grant select on public.admin_kpi_timeseries_30d to authenticated;

/* ── 2. Per-country KPI breakdown ─────────────────────────────── */

drop view if exists public.admin_country_breakdown cascade;

create view public.admin_country_breakdown
  with (security_invoker = true) as
with bookings_by_country as (
  select coalesce(booking_country, 'unknown')         as country,
         count(*)                                      as bookings_total,
         count(*) filter (where created_at > now() - interval '30 days') as bookings_30d,
         count(*) filter (where status = 'completed')  as bookings_completed,
         coalesce(sum(coalesce(final_price, price_estimate, 0)) filter (
           where created_at > now() - interval '30 days'
         ), 0)                                        as revenue_30d
    from public.bookings
   group by 1
),
drivers_by_country as (
  select coalesce(zone, 'unknown') as country,
         count(*)                                     as drivers_total,
         count(*) filter (where status = 'active')    as drivers_active,
         count(*) filter (where online = true)        as drivers_online
    from public.driver_profiles
   group by 1
)
select
  coalesce(b.country, d.country, 'unknown')   as country,
  coalesce(b.bookings_total, 0)               as bookings_total,
  coalesce(b.bookings_30d, 0)                 as bookings_30d,
  coalesce(b.bookings_completed, 0)           as bookings_completed,
  coalesce(b.revenue_30d, 0)                  as revenue_30d,
  coalesce(d.drivers_total, 0)                as drivers_total,
  coalesce(d.drivers_active, 0)               as drivers_active,
  coalesce(d.drivers_online, 0)               as drivers_online
from bookings_by_country b
full outer join drivers_by_country d on lower(d.country) = lower(b.country)
order by bookings_30d desc, drivers_total desc;

grant select on public.admin_country_breakdown to authenticated;

/* ── 3. Acquisition funnel ───────────────────────────────────── */

drop view if exists public.admin_acquisition_funnel cascade;

create view public.admin_acquisition_funnel
  with (security_invoker = true) as
with apps as (
  select count(*) as total                                     from public.driver_applications
), approved as (
  select count(*) as total                                     from public.driver_applications
   where status = 'approved'
), online_drivers as (
  select count(*) as total                                     from public.driver_profiles
   where status = 'active'
), first_booking as (
  select count(distinct driver_id) as total                    from public.bookings
   where driver_id is not null
)
select
  apps.total           as applied,
  approved.total       as approved,
  online_drivers.total as active,
  first_booking.total  as first_booking_completed
from apps, approved, online_drivers, first_booking;

grant select on public.admin_acquisition_funnel to authenticated;

/* ── 4. Driver cohort retention ──────────────────────────────── */

drop view if exists public.admin_driver_cohort_30d cascade;

create view public.admin_driver_cohort_30d
  with (security_invoker = true) as
with driver_signup as (
  /* Use the application's created_at as cohort anchor since the
   * driver_profiles row may be back-filled at approval time. */
  select user_id,
         date_trunc('month', min(created_at))::date as cohort_month
    from public.driver_applications
   group by user_id
),
driver_activity as (
  select b.driver_id,
         date_trunc('week', b.created_at)::date as activity_week
    from public.bookings b
   where b.driver_id is not null
   group by b.driver_id, date_trunc('week', b.created_at)
)
select
  s.cohort_month,
  count(distinct s.user_id)                                   as cohort_size,
  count(distinct case when a.activity_week = s.cohort_month                     then s.user_id end) as active_w0,
  count(distinct case when a.activity_week = s.cohort_month + interval '7 days'  then s.user_id end) as active_w1,
  count(distinct case when a.activity_week = s.cohort_month + interval '14 days' then s.user_id end) as active_w2,
  count(distinct case when a.activity_week = s.cohort_month + interval '21 days' then s.user_id end) as active_w3,
  count(distinct case when a.activity_week = s.cohort_month + interval '28 days' then s.user_id end) as active_w4
from driver_signup s
left join driver_activity a on a.driver_id = s.user_id
group by s.cohort_month
order by s.cohort_month desc
limit 12;

grant select on public.admin_driver_cohort_30d to authenticated;

-- Sanity:
-- select * from public.admin_kpi_timeseries_30d order by day desc limit 5;
-- select * from public.admin_country_breakdown limit 10;
-- select * from public.admin_acquisition_funnel;
-- select * from public.admin_driver_cohort_30d;
