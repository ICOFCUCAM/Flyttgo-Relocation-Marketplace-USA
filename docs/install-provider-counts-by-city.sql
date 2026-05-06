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
-- Self-installing:
--   - Adds the `home_city_slug` column to driver_profiles if it
--     doesn't exist yet (idempotent; existing rows get NULL until
--     the onboarding flow populates them).
--   - Creates / replaces the view.
--
-- Permissions:
--   - Anonymous + authenticated may SELECT.
--   - Counts contain no PII so RLS is intentionally permissive.
-- ─────────────────────────────────────────────────────────────────

/* Add the column the view aggregates on. driver_profiles ships a
 * narrow column set today (id, user_id, full_name, phone, status,
 * online, is_busy, availability_status, created_at); home_city_slug
 * is the new column for the expansion city rollout. Idempotent. */
alter table public.driver_profiles
  add column if not exists home_city_slug text;

comment on column public.driver_profiles.home_city_slug is
  'kebab-case ASCII slug matching ANCHOR_CITIES.slug. Drives the per-city provider count surfaced on /moving-<slug> and /market-<cc>.';

create index if not exists idx_driver_profiles_home_city_slug
  on public.driver_profiles (home_city_slug)
  where home_city_slug is not null;

/* Aggregate view — one row per (city_slug). approved_count drives
 * the rollout-status thresholds (1 → activating · 3 → live · 10 →
 * anchor) per src/lib/expansion-rollout.ts. */
create or replace view public.provider_counts_by_city as
select
  home_city_slug                                       as city_slug,
  count(*) filter (where status = 'approved') :: int   as approved_count,
  count(*) filter (where status = 'pending')  :: int   as pending_count,
  count(*) :: int                                       as total_count
from public.driver_profiles
where home_city_slug is not null
group by home_city_slug;

comment on view public.provider_counts_by_city is
  'Aggregate provider count per anchor-city slug. Drives the live rollout-status pill on /moving-<slug> and /market-<cc>.';

grant select on public.provider_counts_by_city to anon, authenticated;
