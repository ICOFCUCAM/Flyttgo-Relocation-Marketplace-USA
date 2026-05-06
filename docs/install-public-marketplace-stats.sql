-- ─────────────────────────────────────────────────────────────────
-- install-public-marketplace-stats.sql
--
-- Public aggregate counts for the home page + footer trust strip.
-- Returns scalar counts only — no PII, no row-level data — so
-- granting anon SELECT is safe.
--
-- security_invoker = false (default for views in PG14+) so the
-- view executes with the owner's privileges and bypasses RLS on
-- the underlying tables. That's the point: the public-facing
-- numbers should reflect the entire marketplace, not just the
-- caller's slice.
--
-- TS counterpart: src/hooks/usePublicMarketplaceStats.ts.
-- Idempotent: drop + recreate.
-- ─────────────────────────────────────────────────────────────────

drop view if exists public.public_marketplace_stats cascade;

create view public.public_marketplace_stats
  with (security_invoker = false) as
select
  (select count(*) from public.country_profiles)                              as countries_total,
  (select count(*) from public.driver_profiles where status = 'approved')     as drivers_approved,
  (select count(*) from public.bookings        where status = 'completed')    as bookings_completed,
  (select count(*) from public.bookings
    where created_at > now() - interval '30 days')                            as bookings_last_30d,
  (select count(distinct currency) from public.country_profiles)              as currencies_total;

grant select on public.public_marketplace_stats to anon, authenticated;

-- Sanity:
-- select * from public.public_marketplace_stats;
