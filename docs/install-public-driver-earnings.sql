-- ─────────────────────────────────────────────────────────────────
-- install-public-driver-earnings.sql
--
-- Powers the public /drivers-earnings page (acquisition funnel).
-- Returns aggregate per-city driver earnings over a rolling 90-day
-- window. No PII (no driver ids, no booking ids, no customer info).
--
-- security_invoker = false so anonymous prospects can read the view
-- without RLS exposing the underlying wallet rows. We deliberately
-- expose only city + currency + counts + earnings buckets — the
-- driver_id is never selected.
--
-- Sample-size guard: we hide cities with fewer than 3 active drivers
-- AND fewer than 8 transactions in the window so we never expose a
-- single driver's identifiable income via the aggregate.
--
-- TS counterpart: src/hooks/usePublicDriverEarnings.ts
-- Idempotent: drop + recreate.
-- ─────────────────────────────────────────────────────────────────

drop view if exists public.public_driver_earnings_by_city cascade;

create view public.public_driver_earnings_by_city
  with (security_invoker = false) as
with payouts as (
  select
    coalesce(b.booking_country, 'unknown')           as country,
    coalesce(b.pickup_city, 'Unspecified')           as city,
    t.driver_id,
    t.amount
  from public.driver_wallet_transactions t
  join public.bookings b on b.id = t.booking_id
  where t.type in ('escrow_release', 'payout')
    and t.created_at > now() - interval '90 days'
    and t.amount > 0
),
aggregates as (
  select
    country,
    city,
    count(*)                                                  as payouts_total,
    count(distinct driver_id)                                 as drivers_active,
    round(avg(amount)::numeric, 0)                            as earnings_avg,
    round(percentile_cont(0.5) within group (order by amount)::numeric, 0)
                                                              as earnings_median,
    round(percentile_cont(0.75) within group (order by amount)::numeric, 0)
                                                              as earnings_p75,
    round(sum(amount)::numeric, 0)                            as earnings_sum_90d
  from payouts
  group by country, city
)
select *
from aggregates
where drivers_active >= 3
  and payouts_total  >= 8
order by country, payouts_total desc;

grant select on public.public_driver_earnings_by_city to anon, authenticated;

-- Sanity:
-- select * from public.public_driver_earnings_by_city
--   where country = 'US' order by payouts_total desc limit 8;
