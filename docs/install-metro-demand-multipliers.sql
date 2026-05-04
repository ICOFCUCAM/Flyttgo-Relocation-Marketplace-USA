-- ============================================================================
-- FlyttGo — Metro demand multipliers
-- ============================================================================
-- Surge multipliers for the 6 high-demand US metros. Combines four
-- timing dimensions:
--
--   weekday_multiplier         — Mon–Fri baseline lift
--   weekend_multiplier         — Sat / Sun lift (vs baseline)
--   month_end_multiplier       — last week of the month (lease turnover)
--   student_season_multiplier  — Aug + early Sept (university intake)
--
-- The lib/route-price-estimator module mirrors this row shape in a
-- static TS map (src/lib/route-price-estimator.ts → METRO_DEMAND).
-- Once this table is applied, services/route-cache.ts can be
-- extended with a `resolveDemandMultiplier(zipPrefix, ts)` helper
-- that selects from this table — the static map is the spec, the
-- DB is authoritative.
--
-- ── Why metro_code as the key? ────────────────────────────────────
-- ZIP prefixes alone don't capture all of, say, Greater LA — 90xxx,
-- 91xxx, and parts of 92xxx all dispatch from the same labor pool.
-- A small mapping table (zip_prefix → metro_code) lives client-side
-- in lib/route-price-estimator.detectMetroFromZip; if and when we
-- need server-side parity we'll add a metro_zip_prefixes table.
--
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.metro_demand_multipliers (
  metro_code                 TEXT         NOT NULL PRIMARY KEY,
  weekday_multiplier         NUMERIC(4,3) NOT NULL CHECK (weekday_multiplier        BETWEEN 1.000 AND 2.000),
  weekend_multiplier         NUMERIC(4,3) NOT NULL CHECK (weekend_multiplier        BETWEEN 1.000 AND 2.000),
  month_end_multiplier       NUMERIC(4,3) NOT NULL CHECK (month_end_multiplier      BETWEEN 1.000 AND 2.000),
  student_season_multiplier  NUMERIC(4,3) NOT NULL CHECK (student_season_multiplier BETWEEN 1.000 AND 2.000),
  notes                      TEXT,
  updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.metro_demand_multipliers IS
  'Per-metro surge multipliers across four timing dimensions
   (weekday / weekend / month-end / student season). Mirrored
   client-side in src/lib/route-price-estimator.ts; this table is
   authoritative once applied.';


-- ----------------------------------------------------------------------------
-- RLS — public read, service-role only write. Multipliers are
-- non-sensitive and need to be reachable from the homepage cards
-- without forcing a sign-in.
-- ----------------------------------------------------------------------------
ALTER TABLE public.metro_demand_multipliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS metro_demand_multipliers_read ON public.metro_demand_multipliers;
CREATE POLICY metro_demand_multipliers_read
  ON public.metro_demand_multipliers
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS metro_demand_multipliers_write ON public.metro_demand_multipliers;
CREATE POLICY metro_demand_multipliers_write
  ON public.metro_demand_multipliers
  FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ----------------------------------------------------------------------------
-- Seed the 6 launch metros. Numbers match the static TS map in
-- src/lib/route-price-estimator.ts so swapping the data source
-- doesn't visibly shift prices.
-- ----------------------------------------------------------------------------
INSERT INTO public.metro_demand_multipliers
  (metro_code, weekday_multiplier, weekend_multiplier, month_end_multiplier, student_season_multiplier, notes)
VALUES
  ('NYC', 1.08, 1.12, 1.18, 1.10, 'Manhattan + outer boroughs · 100xx / 110xx / 112xx'),
  ('LA',  1.06, 1.10, 1.15, 1.04, 'Greater LA · 900xx / 910xx / 911xx'),
  ('SF',  1.07, 1.11, 1.16, 1.06, 'Bay Area · 940xx / 941xx / 942xx'),
  ('BOS', 1.05, 1.09, 1.14, 1.18, 'Greater Boston · 020xx / 021xx — high student-season lift'),
  ('CHI', 1.04, 1.08, 1.12, 1.03, 'Chicagoland · 606xx / 607xx'),
  ('ATL', 1.03, 1.07, 1.10, 1.02, 'Metro Atlanta · 300xx / 303xx')
ON CONFLICT (metro_code)
DO UPDATE SET
  weekday_multiplier         = EXCLUDED.weekday_multiplier,
  weekend_multiplier         = EXCLUDED.weekend_multiplier,
  month_end_multiplier       = EXCLUDED.month_end_multiplier,
  student_season_multiplier  = EXCLUDED.student_season_multiplier,
  notes                      = EXCLUDED.notes,
  updated_at                 = now();
