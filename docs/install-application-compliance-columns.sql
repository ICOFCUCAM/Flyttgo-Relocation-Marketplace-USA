-- ============================================================================
-- FlyttGo — driver_applications structured compliance columns
-- ============================================================================
-- Adds nullable, per-jurisdiction columns to driver_applications so the
-- onboarding flow can write structured compliance data instead of
-- cramming everything into vehicle_model. The legacy cram-string
-- format ("{categoryLabel} · {make} {model} · compliance={JSON}")
-- continues to work — application-compliance.ts parses it as a
-- legacy fallback.
--
-- ── Why ────────────────────────────────────────────────────────────
-- The customer-facing /driver-application-status page was rendering
-- raw JSON from the vehicle_model field — the cram-string was meant
-- as an internal admin-only carrier and was never supposed to
-- surface to drivers. Structured columns let:
--
--   1. The driver status page show clean rows.
--   2. The admin docs modal show clean rows.
--   3. Search / filter / export work without parsing.
--   4. Future RLS rules target individual fields (e.g. "providers
--      must declare USDOT before they can accept long-distance").
--
-- ── What we add ────────────────────────────────────────────────────
-- All columns nullable so existing rows keep working unchanged.
-- DriverOnboarding writes the new columns AND keeps a clean
-- vehicle_model = "{make} {model}" so old admin queries that
-- LIKE-match on vehicle_model don't break.
--
-- Column set covers the 6 launch-market jurisdictions:
--
--   us → usdot_number · mc_number · cargo_insurance
--   uk → gvol_number
--   de → gukg_licence
--   no → yrkestransport
--   fr → siret · tva
--   ca → ca_provincial_licence (placeholder for provincial bodies)
--
-- Plus one normalized provider category column.
--
-- Safe to re-run.
-- ============================================================================

ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS provider_category    TEXT,

  -- USA · FMCSA / USDOT
  ADD COLUMN IF NOT EXISTS usdot_number         TEXT,
  ADD COLUMN IF NOT EXISTS mc_number            TEXT,
  ADD COLUMN IF NOT EXISTS cargo_insurance      TEXT,

  -- UK · GVOL operator licence
  ADD COLUMN IF NOT EXISTS gvol_number          TEXT,

  -- Germany · GüKG
  ADD COLUMN IF NOT EXISTS gukg_licence         TEXT,

  -- Norway · yrkestransportløyve
  ADD COLUMN IF NOT EXISTS yrkestransport       TEXT,

  -- France · SIRET + TVA registration
  ADD COLUMN IF NOT EXISTS siret                TEXT,
  ADD COLUMN IF NOT EXISTS tva                  TEXT,

  -- Canada · provincial transport licence
  ADD COLUMN IF NOT EXISTS ca_provincial_licence TEXT;

-- Lightweight CHECK so empty strings don't pile up next to NULLs.
-- We don't constrain the format — too much variation across
-- jurisdictions and the marketplace doesn't validate format here
-- (that's the licensing body's job). Empty strings are coerced to
-- NULL on insert so SELECT WHERE usdot_number IS NULL behaves
-- correctly without callers having to also check `<> ''`.
DO $$
DECLARE
  col TEXT;
BEGIN
  FOR col IN
    SELECT unnest(ARRAY[
      'provider_category', 'usdot_number', 'mc_number', 'cargo_insurance',
      'gvol_number', 'gukg_licence', 'yrkestransport', 'siret', 'tva',
      'ca_provincial_licence'
    ])
  LOOP
    EXECUTE format(
      'ALTER TABLE public.driver_applications
         ADD CONSTRAINT %I CHECK (%I IS NULL OR length(trim(%I)) > 0)',
      'driver_applications_' || col || '_nonempty_chk', col, col
    );
  END LOOP;
EXCEPTION WHEN duplicate_object THEN
  -- Re-running the migration: constraints already exist, ignore.
  NULL;
END $$;

-- ----------------------------------------------------------------------------
-- Index — admin's most common compliance lookup is "show me every
-- pending US application that has a USDOT number". Partial index
-- on (status, usdot_number) keeps that query cheap as the table
-- grows. Other jurisdictions don't need indexes yet (volumes are
-- low; add when the workload demands).
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS driver_applications_pending_usdot_idx
  ON public.driver_applications (status, usdot_number)
  WHERE status IN ('pending', 'submitted', 'under_review')
    AND usdot_number IS NOT NULL;

COMMENT ON COLUMN public.driver_applications.provider_category IS
  'Normalised provider category (licensed_moving_carrier, moving_labor, packing_services, …). Mirrors src/components/DriverOnboarding.tsx PROVIDER_CATEGORIES.';

COMMENT ON COLUMN public.driver_applications.usdot_number IS
  'USA · USDOT number (FMCSA registry). Optional; required only for licensed_moving_carrier applicants in the US market.';

COMMENT ON COLUMN public.driver_applications.gvol_number IS
  'UK · Goods Vehicle Operator Licence (GVOL) reference.';

COMMENT ON COLUMN public.driver_applications.gukg_licence IS
  'Germany · GüKG (Güterkraftverkehrsgesetz) operator licence reference.';

COMMENT ON COLUMN public.driver_applications.yrkestransport IS
  'Norway · yrkestransportløyve (Statens vegvesen).';
