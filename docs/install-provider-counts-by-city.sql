-- ─────────────────────────────────────────────────────────────────
-- install-provider-counts-by-city.sql
--
-- Live provider counts for the FlyttGo expansion city rollout.
-- Drives src/lib/expansion-rollout.ts → computeCityStatus() so a
-- city's status pill ("Activating" / "Live" / "Anchor") reflects
-- real registered providers instead of the static initialProviderCount.
--
-- Aggregation logic:
--   - Count each driver_profile row whose home_city_slug matches an
--     ANCHOR_CITY slug (kebab-case, ASCII).
--   - Optionally include driver_profiles whose service_radius_km
--     covers the anchor city centroid — defer until coordinates land.
--
-- Permissions:
--   - Anonymous + authenticated may SELECT.
--   - Counts contain no PII so RLS is intentionally permissive.
-- ─────────────────────────────────────────────────────────────────

create or replace view public.provider_counts_by_city as
select
  home_city_slug                            as city_slug,
  count(*) filter (where status = 'approved') :: int as approved_count,
  count(*) filter (where status = 'pending')  :: int as pending_count,
  count(*) :: int                                    as total_count
from public.driver_profiles
where home_city_slug is not null
group by home_city_slug;

comment on view public.provider_counts_by_city is
  'Aggregate provider count per anchor-city slug. Drives the live rollout-status pill on /moving-<slug> and /market-<cc>.';

grant select on public.provider_counts_by_city to anon, authenticated;
