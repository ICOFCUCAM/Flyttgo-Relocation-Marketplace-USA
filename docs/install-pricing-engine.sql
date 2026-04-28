-- ============================================================================
-- FlyttGo — Pricing Engine (Supabase-native)
-- ============================================================================
-- Backs the 9-layer pricing engine that lives in
-- src/lib/pricing-engine/. The TypeScript engine reads either the
-- curated tables in src/lib/pricing-engine/data.ts (today) or these
-- Supabase rows (when the data fetcher swaps source) — same QuoteInput
-- shape on both ends.
--
-- ── Engine layers (mirrors data.ts) ─────────────────────────────────
--
--   1. countries_pricing       — per-mover hourly anchor + currency
--                                 + perKm
--   2. cities_pricing          — metro multiplier on top of country
--   3. crew_multipliers        — per crew size 2..5
--   4. service_type_adjustments— additive per-hour + multiplier
--   5. complexity_adjustments  — stairs / long carry / fragile / etc
--   6. seasonal_adjustments    — weekend / evening / peak season
--   7. (distance is computed inline from countries_pricing.per_km)
--   8. insurance_options       — basic / full / premium per-hour
--   9. commission_rules        — default 20%, band 10–25%
--   *  provider_pricing        — per-provider overrides (radius,
--                                 truck/packing availability, hourly
--                                 floor, weekend multiplier override)
--
-- ── RLS posture ─────────────────────────────────────────────────────
--
--   - Public catalogue tables (countries / cities / crew / service /
--     complexity / seasonal / insurance / commission) are anon-read
--     so the engine can run client-side on the marketing surfaces.
--   - provider_pricing is restricted to the owning provider via
--     auth.uid() = user_id, plus a dedicated policy for admins.
--
-- Safe to re-run — every CREATE uses IF NOT EXISTS / OR REPLACE.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Layer 1 — countries_pricing
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.countries_pricing (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL UNIQUE,
  base_hourly   NUMERIC(10,2) NOT NULL,
  currency      TEXT NOT NULL,
  symbol        TEXT NOT NULL,
  per_km        NUMERIC(10,2) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.countries_pricing (country_code, base_hourly, currency, symbol, per_km) VALUES
  ('us', 75,  'USD', '$',  1.4),
  ('ca', 70,  'CAD', 'C$', 1.5),
  ('gb', 55,  'GBP', '£',  1.2),
  ('de', 60,  'EUR', '€',  1.3),
  ('fr', 55,  'EUR', '€',  1.3),
  ('no', 600, 'NOK', 'kr', 12)
ON CONFLICT (country_code) DO UPDATE
  SET base_hourly = EXCLUDED.base_hourly,
      currency    = EXCLUDED.currency,
      symbol      = EXCLUDED.symbol,
      per_km      = EXCLUDED.per_km,
      updated_at  = now();

-- ----------------------------------------------------------------------------
-- Layer 2 — cities_pricing
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cities_pricing (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL REFERENCES public.countries_pricing(country_code) ON DELETE CASCADE,
  city_slug     TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  multiplier    NUMERIC(6,3) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, city_slug)
);

CREATE INDEX IF NOT EXISTS cities_pricing_country_idx ON public.cities_pricing (country_code);

INSERT INTO public.cities_pricing (country_code, city_slug, display_name, multiplier) VALUES
  -- US
  ('us', 'new-york',      'New York',      1.6),
  ('us', 'manhattan',     'Manhattan',     1.65),
  ('us', 'brooklyn',      'Brooklyn',      1.55),
  ('us', 'san-francisco', 'San Francisco', 1.55),
  ('us', 'los-angeles',   'Los Angeles',   1.45),
  ('us', 'boston',        'Boston',        1.4),
  ('us', 'washington',    'Washington',    1.35),
  ('us', 'seattle',       'Seattle',       1.3),
  ('us', 'chicago',       'Chicago',       1.2),
  ('us', 'miami',         'Miami',         1.1),
  ('us', 'denver',        'Denver',        1.1),
  ('us', 'austin',        'Austin',        1.05),
  ('us', 'dallas',        'Dallas',        1.0),
  ('us', 'houston',       'Houston',       0.95),
  ('us', 'atlanta',       'Atlanta',       0.95),
  ('us', 'phoenix',       'Phoenix',       0.95),
  ('us', 'nashville',     'Nashville',     0.95),
  ('us', 'tampa',         'Tampa',         0.9),
  ('us', 'charlotte',     'Charlotte',     0.9),

  -- CA
  ('ca', 'toronto',       'Toronto',       1.35),
  ('ca', 'vancouver',     'Vancouver',     1.4),
  ('ca', 'montreal',      'Montréal',      1.15),
  ('ca', 'calgary',       'Calgary',       1.1),
  ('ca', 'ottawa',        'Ottawa',        1.05),
  ('ca', 'edmonton',      'Edmonton',      1.0),
  ('ca', 'halifax',       'Halifax',       0.95),

  -- GB
  ('gb', 'london',        'London',        1.55),
  ('gb', 'edinburgh',     'Edinburgh',     1.1),
  ('gb', 'manchester',    'Manchester',    1.05),
  ('gb', 'bristol',       'Bristol',       1.05),
  ('gb', 'birmingham',    'Birmingham',    1.0),
  ('gb', 'leeds',         'Leeds',         0.95),
  ('gb', 'glasgow',       'Glasgow',       0.95),

  -- DE
  ('de', 'munchen',       'München',       1.35),
  ('de', 'frankfurt',     'Frankfurt',     1.3),
  ('de', 'berlin',        'Berlin',        1.2),
  ('de', 'hamburg',       'Hamburg',       1.2),
  ('de', 'stuttgart',     'Stuttgart',     1.2),
  ('de', 'dusseldorf',    'Düsseldorf',    1.15),
  ('de', 'koln',          'Köln',          1.1),

  -- FR
  ('fr', 'paris',         'Paris',         1.45),
  ('fr', 'nice',          'Nice',          1.15),
  ('fr', 'lyon',          'Lyon',          1.1),
  ('fr', 'bordeaux',      'Bordeaux',      1.05),
  ('fr', 'marseille',     'Marseille',     1.05),
  ('fr', 'toulouse',      'Toulouse',      1.0),
  ('fr', 'lille',         'Lille',         0.95),

  -- NO
  ('no', 'oslo',          'Oslo',          1.15),
  ('no', 'tromso',        'Tromsø',        1.1),
  ('no', 'bergen',        'Bergen',        1.05),
  ('no', 'stavanger',     'Stavanger',     1.05),
  ('no', 'trondheim',     'Trondheim',     1.0),
  ('no', 'drammen',       'Drammen',       0.95)
ON CONFLICT (country_code, city_slug) DO UPDATE
  SET multiplier   = EXCLUDED.multiplier,
      display_name = EXCLUDED.display_name,
      updated_at   = now();

-- ----------------------------------------------------------------------------
-- Layer 3 — crew_multipliers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crew_multipliers (
  id          SERIAL PRIMARY KEY,
  crew_size   SMALLINT NOT NULL UNIQUE CHECK (crew_size BETWEEN 1 AND 8),
  multiplier  NUMERIC(6,3) NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.crew_multipliers (crew_size, multiplier) VALUES
  (2, 1.0),
  (3, 1.45),
  (4, 1.9),
  (5, 2.3)
ON CONFLICT (crew_size) DO UPDATE
  SET multiplier = EXCLUDED.multiplier, updated_at = now();

-- ----------------------------------------------------------------------------
-- Layer 4 — service_type_adjustments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_type_adjustments (
  id                  SERIAL PRIMARY KEY,
  service_slug        TEXT NOT NULL UNIQUE,
  label               TEXT NOT NULL,
  additive_per_hour   NUMERIC(10,2) NOT NULL DEFAULT 0,
  multiplier          NUMERIC(6,3)  NOT NULL DEFAULT 1.0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.service_type_adjustments (service_slug, label, additive_per_hour, multiplier) VALUES
  ('labor-only',   'Labor-only crew',          0,  1.0),
  ('movers-truck', 'Movers + truck',           60, 1.0),
  ('packing',      'Packing crew',             25, 1.0),
  ('storage',      'Storage staging',          20, 1.0),
  ('corporate',    'Corporate coordination',   0,  1.7)
ON CONFLICT (service_slug) DO UPDATE
  SET label             = EXCLUDED.label,
      additive_per_hour = EXCLUDED.additive_per_hour,
      multiplier        = EXCLUDED.multiplier,
      updated_at        = now();

-- ----------------------------------------------------------------------------
-- Layer 5 — complexity_adjustments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complexity_adjustments (
  id            SERIAL PRIMARY KEY,
  factor_slug   TEXT NOT NULL UNIQUE,
  pct           NUMERIC(6,3) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.complexity_adjustments (factor_slug, pct) VALUES
  ('stairs_per_flight', 0.05),
  ('long_carry',        0.05),
  ('elevator_wait',     0.03),
  ('fragile',           0.04),
  ('assembly',          0.05)
ON CONFLICT (factor_slug) DO UPDATE
  SET pct = EXCLUDED.pct, updated_at = now();

-- ----------------------------------------------------------------------------
-- Layer 6 — seasonal_adjustments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seasonal_adjustments (
  id            SERIAL PRIMARY KEY,
  factor_slug   TEXT NOT NULL UNIQUE,
  pct           NUMERIC(6,3) NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.seasonal_adjustments (factor_slug, pct) VALUES
  ('weekend',     0.12),
  ('evening',     0.08),
  ('peak_season', 0.15)
ON CONFLICT (factor_slug) DO UPDATE
  SET pct = EXCLUDED.pct, updated_at = now();

-- ----------------------------------------------------------------------------
-- Layer 8 — insurance_options
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.insurance_options (
  id            SERIAL PRIMARY KEY,
  tier_slug     TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  per_hour      NUMERIC(10,2) NOT NULL DEFAULT 0,
  blurb         TEXT,
  coverage_max  INTEGER,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.insurance_options (tier_slug, label, per_hour, blurb, coverage_max) VALUES
  ('basic',
   'Basic liability',
   0,
   'Goods-in-transit cover. Included in every booking.',
   50000),
  ('full',
   'Full-value protection',
   12,
   'Replacement-value cover for declared inventory.',
   250000),
  ('premium',
   'Premium coverage',
   22,
   'Replacement value + accidental damage + delay cover.',
   500000)
ON CONFLICT (tier_slug) DO UPDATE
  SET label        = EXCLUDED.label,
      per_hour     = EXCLUDED.per_hour,
      blurb        = EXCLUDED.blurb,
      coverage_max = EXCLUDED.coverage_max,
      updated_at   = now();

-- ----------------------------------------------------------------------------
-- Layer 9 — commission_rules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id            SERIAL PRIMARY KEY,
  scope         TEXT NOT NULL UNIQUE,           -- 'default' | 'enterprise:{slug}'
  pct           NUMERIC(6,3) NOT NULL CHECK (pct BETWEEN 0 AND 0.5),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.commission_rules (scope, pct) VALUES
  ('default', 0.20)
ON CONFLICT (scope) DO UPDATE
  SET pct = EXCLUDED.pct, updated_at = now();

-- ----------------------------------------------------------------------------
-- provider_pricing — per-provider overrides + capacity
-- ----------------------------------------------------------------------------
-- Joins to public.driver_profiles (the canonical provider profile
-- table on FlyttGo Supabase). Each provider has at most one row,
-- created on first edit from the Pricing Settings page.
CREATE TABLE IF NOT EXISTS public.provider_pricing (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE
                              REFERENCES auth.users(id) ON DELETE CASCADE,
  /* Capacity */
  service_radius_km           INTEGER NOT NULL DEFAULT 25
                              CHECK (service_radius_km BETWEEN 1 AND 500),
  available_crew_sizes        SMALLINT[] NOT NULL DEFAULT '{2,3}'::SMALLINT[],
  truck_available             BOOLEAN  NOT NULL DEFAULT true,
  packing_available           BOOLEAN  NOT NULL DEFAULT false,
  storage_available           BOOLEAN  NOT NULL DEFAULT false,
  /* Pricing overrides — NULL = inherit from country/city baseline. */
  hourly_base_override        NUMERIC(10,2),
  weekend_multiplier_override NUMERIC(6,3)
                              CHECK (weekend_multiplier_override IS NULL
                                     OR weekend_multiplier_override BETWEEN 1.0 AND 2.0),
  truck_per_hour_override     NUMERIC(10,2),
  packing_per_hour_override   NUMERIC(10,2),
  /* Audit */
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_pricing_user_idx ON public.provider_pricing (user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_provider_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS provider_pricing_updated_at ON public.provider_pricing;
CREATE TRIGGER provider_pricing_updated_at
  BEFORE UPDATE ON public.provider_pricing
  FOR EACH ROW EXECUTE FUNCTION public.touch_provider_pricing_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — anon-read on catalogue tables, self-edit on provider_pricing
-- ----------------------------------------------------------------------------

ALTER TABLE public.countries_pricing         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities_pricing            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_multipliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_type_adjustments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complexity_adjustments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_adjustments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_pricing          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS countries_pricing_anon_read         ON public.countries_pricing;
DROP POLICY IF EXISTS cities_pricing_anon_read            ON public.cities_pricing;
DROP POLICY IF EXISTS crew_multipliers_anon_read          ON public.crew_multipliers;
DROP POLICY IF EXISTS service_type_adjustments_anon_read  ON public.service_type_adjustments;
DROP POLICY IF EXISTS complexity_adjustments_anon_read    ON public.complexity_adjustments;
DROP POLICY IF EXISTS seasonal_adjustments_anon_read      ON public.seasonal_adjustments;
DROP POLICY IF EXISTS insurance_options_anon_read         ON public.insurance_options;
DROP POLICY IF EXISTS commission_rules_anon_read          ON public.commission_rules;

CREATE POLICY countries_pricing_anon_read         ON public.countries_pricing         FOR SELECT USING (true);
CREATE POLICY cities_pricing_anon_read            ON public.cities_pricing            FOR SELECT USING (true);
CREATE POLICY crew_multipliers_anon_read          ON public.crew_multipliers          FOR SELECT USING (true);
CREATE POLICY service_type_adjustments_anon_read  ON public.service_type_adjustments  FOR SELECT USING (true);
CREATE POLICY complexity_adjustments_anon_read    ON public.complexity_adjustments    FOR SELECT USING (true);
CREATE POLICY seasonal_adjustments_anon_read      ON public.seasonal_adjustments      FOR SELECT USING (true);
CREATE POLICY insurance_options_anon_read         ON public.insurance_options         FOR SELECT USING (true);
CREATE POLICY commission_rules_anon_read          ON public.commission_rules          FOR SELECT USING (true);

-- provider_pricing — authenticated providers manage their own row.
DROP POLICY IF EXISTS provider_pricing_self_select ON public.provider_pricing;
DROP POLICY IF EXISTS provider_pricing_self_insert ON public.provider_pricing;
DROP POLICY IF EXISTS provider_pricing_self_update ON public.provider_pricing;
DROP POLICY IF EXISTS provider_pricing_admin_all   ON public.provider_pricing;

CREATE POLICY provider_pricing_self_select
  ON public.provider_pricing
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY provider_pricing_self_insert
  ON public.provider_pricing
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY provider_pricing_self_update
  ON public.provider_pricing
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins see + manage every row.
CREATE POLICY provider_pricing_admin_all
  ON public.provider_pricing
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin');
