-- ─────────────────────────────────────────────────────────────────
-- install-driver-demand-heatmap.sql
--
-- Backs the driver-portal Overview tab's <DemandHeatmap> component
-- with a 30-day rolling aggregate of bookings by pickup_city per
-- country. Drivers query it scoped to their own country so they
-- can position themselves near high-demand corridors for the
-- highest dispatch rate.
--
-- security_invoker = true so the view inherits the underlying
-- bookings RLS. Authenticated drivers see aggregate counts only —
-- no PII (no customer names, no booking IDs) is exposed; the view
-- selects city + counts only.
--
-- TS counterpart: src/components/driver/DemandHeatmap.tsx.
-- Idempotent: drop + recreate.
-- ─────────────────────────────────────────────────────────────────

drop view if exists public.driver_demand_heatmap cascade;

create view public.driver_demand_heatmap
  with (security_invoker = true) as
select
  coalesce(booking_country, 'unknown')                                          as country,
  coalesce(pickup_city, 'Unspecified')                                          as city,
  count(*)                                                                      as bookings_total,
  count(*) filter (where created_at > now() - interval '7 days')                as bookings_7d,
  count(*) filter (where created_at > now() - interval '30 days')               as bookings_30d
from public.bookings
where created_at > now() - interval '30 days'
group by 1, 2
order by bookings_30d desc, bookings_total desc;

grant select on public.driver_demand_heatmap to authenticated;

-- Sanity (run as an authenticated driver):
-- select * from public.driver_demand_heatmap where country = 'US' limit 8;
