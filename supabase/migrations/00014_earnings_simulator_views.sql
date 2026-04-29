-- ============================================================================
-- FlyttGo — Earnings Simulator view aliases
-- ============================================================================
-- The earnings simulator + the pricing engine share the same backing
-- data — provider rates, city multipliers, crew sizes, service bonuses,
-- and commission rules. The spec the customer asked for uses slightly
-- different table names than the canonical pricing-engine tables that
-- live in docs/install-pricing-engine.sql:
--
--   spec name                  →  canonical table
--   ─────────────────────────     ──────────────────────────────
--   earnings_country_rates     →  countries_pricing
--   earnings_city_rates        →  cities_pricing
--   crew_size_multipliers      →  crew_multipliers
--   service_bonus_rates        →  service_type_adjustments  (additive_per_hour)
--   commission_rules           →  commission_rules         (already matches)
--
-- Rather than duplicate the rows, we expose plain SQL views that
-- present the canonical tables under the spec's names. External
-- integrations + future earnings-specific reporting can query either
-- name; updates flow through the canonical tables.
--
-- Safe to re-run — every CREATE uses CREATE OR REPLACE VIEW.
-- Run AFTER docs/install-pricing-engine.sql.
-- ============================================================================

-- 1. earnings_country_rates → countries_pricing
CREATE OR REPLACE VIEW public.earnings_country_rates AS
SELECT
  country_code,
  base_hourly  AS hourly_rate,
  currency,
  symbol,
  per_km,
  updated_at
FROM public.countries_pricing;

-- 2. earnings_city_rates → cities_pricing
CREATE OR REPLACE VIEW public.earnings_city_rates AS
SELECT
  country_code,
  city_slug,
  display_name,
  multiplier,
  updated_at
FROM public.cities_pricing;

-- 3. crew_size_multipliers → crew_multipliers
CREATE OR REPLACE VIEW public.crew_size_multipliers AS
SELECT
  crew_size,
  multiplier,
  updated_at
FROM public.crew_multipliers;

-- 4. service_bonus_rates → service_type_adjustments
--    Surfaces only the additive per-hour bonus (the simulator's
--    "truck_bonus / packing_bonus / storage_bonus" inputs); the
--    multiplier column on the canonical table is for the customer-
--    side pricing engine and intentionally hidden from this view.
CREATE OR REPLACE VIEW public.service_bonus_rates AS
SELECT
  service_slug,
  label,
  additive_per_hour AS bonus_per_hour,
  updated_at
FROM public.service_type_adjustments
WHERE additive_per_hour > 0;

-- 5. availability_adjustments → seasonal_adjustments
--    Spec calls the simulator's weekend / evening / peak-season
--    layer "availability_adjustments"; canonical table is named
--    seasonal_adjustments (mirrors how the pricing engine's
--    types.ts already groups them).
CREATE OR REPLACE VIEW public.availability_adjustments AS
SELECT
  factor_slug,
  pct,
  updated_at
FROM public.seasonal_adjustments;

-- ────────────────────────────────────────────────────────────────
-- RLS — views inherit the underlying tables' row-level policies,
-- but the GRANT layer needs an explicit anon SELECT for views
-- since views aren't tables. (Catalogue tables already have
-- "anon read" RLS from install-pricing-engine.sql.)
-- ────────────────────────────────────────────────────────────────

GRANT SELECT ON public.earnings_country_rates    TO anon, authenticated;
GRANT SELECT ON public.earnings_city_rates       TO anon, authenticated;
GRANT SELECT ON public.crew_size_multipliers     TO anon, authenticated;
GRANT SELECT ON public.service_bonus_rates       TO anon, authenticated;
GRANT SELECT ON public.availability_adjustments  TO anon, authenticated;
