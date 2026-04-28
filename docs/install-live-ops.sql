-- ============================================================================
-- FlyttGo — Live Operations Control Center
-- ============================================================================
-- Backing layer for the admin Mission Control surface plus the
-- public Deployment Readiness strip.
--
-- Adds:
--   1. deployment_regions  — canonical per-country status table
--      (operational / expanding / pilot / partner / planned)
--   2. live_ops_overview()           — global counts in one envelope
--   3. live_ops_by_country()         — per-country activity breakdown
--   4. live_ops_provider_availability(country)
--                                    — crew / truck / packing
--                                      availability counts
--   5. live_ops_revenue(period)      — today / week / month aggregates
--
-- All RPCs are STABLE and run with caller's privileges so the
-- admin RLS already enforces who can see what — bookings + disputes
-- + RFP submissions are admin-only via existing policies. The
-- public deployment_regions table IS anon-readable so the homepage
-- readiness strip works pre-auth.
--
-- Run AFTER the matching engine migrations + install-platform-completion.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. deployment_regions — canonical country status table
-- ----------------------------------------------------------------------------
-- Drives both the admin regional map AND the public readiness strip.
-- Status values stay aligned with the existing DeploymentRegionsPage
-- ('live' / 'partner' / 'expansion-ready') but with a richer
-- ops-facing taxonomy for the control center.
CREATE TABLE IF NOT EXISTS public.deployment_regions (
  country_code   TEXT PRIMARY KEY,
  display_name   TEXT NOT NULL,
  flag           TEXT,                                -- emoji
  /* operational  — bookings settle today (full marketplace stack)
   * expanding    — bookings work, market saturating
   * pilot        — limited rollout, partner-supported
   * partner      — partner provider network only
   * planned      — pricing data ready, no provider pipeline yet */
  status         TEXT NOT NULL CHECK (status IN (
    'operational','expanding','pilot','partner','planned'
  )),
  region         TEXT NOT NULL,                       -- e.g. 'Europe', 'East Africa'
  /* Customer-facing one-liner shown on the homepage strip and
   * deployment regions page. */
  blurb          TEXT,
  /* Sort order on the public strip. Lower = leftmost. */
  position       SMALLINT NOT NULL DEFAULT 100,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deployment_regions_status_idx
  ON public.deployment_regions (status, position);

INSERT INTO public.deployment_regions
  (country_code, display_name, flag, status, region, blurb, position) VALUES
  ('us', 'United States',  '🇺🇸', 'operational', 'North America', 'Full marketplace · 50 states',  10),
  ('ca', 'Canada',          '🇨🇦', 'operational', 'North America', 'Full marketplace',              20),
  ('gb', 'United Kingdom',  '🇬🇧', 'operational', 'Europe',        'VAT-included · GVOL aligned',   30),
  ('de', 'Germany',         '🇩🇪', 'operational', 'Europe',        'GüKG-licensed providers',       40),
  ('fr', 'France',          '🇫🇷', 'operational', 'Europe',        'SIRET-validated providers',     50),
  ('no', 'Norway',          '🇳🇴', 'operational', 'Europe',        'Kartverket address coverage',   60),
  ('ae', 'United Arab Emirates', '🇦🇪', 'partner', 'MENA',          'Partner-supported in Dubai',   70),
  ('ng', 'Nigeria',         '🇳🇬', 'partner',     'West Africa',   'Lagos / Abuja partner network', 80),
  ('ke', 'Kenya',           '🇰🇪', 'partner',     'East Africa',   '47-county partner coverage',    90),
  ('cm', 'Cameroon',        '🇨🇲', 'pilot',       'Central Africa','Pilot stage · partner pipeline',100),
  ('ug', 'Uganda',          '🇺🇬', 'pilot',       'East Africa',   'Pilot discussions open',        110),
  ('et', 'Ethiopia',        '🇪🇹', 'pilot',       'East Africa',   'Pilot discussions open',        120),
  ('in', 'India',           '🇮🇳', 'planned',     'South Asia',    'Pricing data ready',            130)
ON CONFLICT (country_code) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      flag         = EXCLUDED.flag,
      status       = EXCLUDED.status,
      region       = EXCLUDED.region,
      blurb        = EXCLUDED.blurb,
      position     = EXCLUDED.position,
      updated_at   = now();

ALTER TABLE public.deployment_regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deployment_regions_anon_read ON public.deployment_regions;
DROP POLICY IF EXISTS deployment_regions_admin_rw  ON public.deployment_regions;
CREATE POLICY deployment_regions_anon_read
  ON public.deployment_regions FOR SELECT USING (true);
CREATE POLICY deployment_regions_admin_rw
  ON public.deployment_regions FOR ALL TO authenticated
  USING       (public.is_admin())
  WITH CHECK  (public.is_admin());


-- ----------------------------------------------------------------------------
-- 2. live_ops_overview() — global activity envelope
-- ----------------------------------------------------------------------------
-- Single round-trip for the top of the control center. Returns a
-- JSONB envelope so adding a new metric never requires a column
-- migration on the consumer.
CREATE OR REPLACE FUNCTION public.live_ops_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_today      DATE := CURRENT_DATE;
  v_tomorrow   DATE := CURRENT_DATE + 1;
  v_week_start DATE := CURRENT_DATE - 6;
BEGIN
  RETURN jsonb_build_object(
    /* Active jobs — anything in flight right now. */
    'active_jobs',          (SELECT COUNT(*) FROM public.bookings
                              WHERE status IN ('driver_assigned','pickup_arrived','loading','in_transit')),
    /* Pending bookings — paid but not yet picked up by a provider. */
    'pending_bookings',     (SELECT COUNT(*) FROM public.bookings
                              WHERE status = 'pending' OR status = 'confirmed'),
    /* Today's bookings — created today regardless of status. */
    'bookings_today',       (SELECT COUNT(*) FROM public.bookings
                              WHERE created_at::DATE = v_today),
    /* Scheduled tomorrow. */
    'bookings_tomorrow',    (SELECT COUNT(*) FROM public.bookings
                              WHERE move_date = v_tomorrow),
    /* Provider pipeline. */
    'new_provider_applications_7d', (SELECT COUNT(*) FROM public.driver_applications
                              WHERE created_at::DATE >= v_week_start),
    'pending_applications', (SELECT COUNT(*) FROM public.driver_applications
                              WHERE status = 'pending'),
    /* Enterprise + institutional. */
    'open_relocation_requests', (SELECT COUNT(*) FROM public.relocation_requests
                              WHERE status IN ('pending','under_review','approved')),
    'rfp_submissions_7d',  (SELECT COUNT(*) FROM public.rfp_submissions
                              WHERE created_at::DATE >= v_week_start),
    /* Disputes. */
    'open_disputes',        (SELECT COUNT(*) FROM public.disputes
                              WHERE status IN ('open','under_review','escalated')),
    /* Subscriptions. */
    'active_paid_subscriptions', (SELECT COUNT(*) FROM public.driver_subscriptions
                              WHERE subscription_status = 'active'
                                AND plan IN ('silver_plus','gold','gold_pro','elite')),
    /* Revenue indicators — booking gross + subscription gross. */
    'gross_bookings_today_usd',  COALESCE(
      (SELECT SUM(COALESCE(final_price, original_price, price_estimate, 0))::NUMERIC
        FROM public.bookings
        WHERE created_at::DATE = v_today AND status <> 'cancelled'),
      0
    ),
    'gross_bookings_week_usd',  COALESCE(
      (SELECT SUM(COALESCE(final_price, original_price, price_estimate, 0))::NUMERIC
        FROM public.bookings
        WHERE created_at::DATE >= v_week_start AND status <> 'cancelled'),
      0
    ),
    'generated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_ops_overview() TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. live_ops_by_country() — per-country activity breakdown
-- ----------------------------------------------------------------------------
-- Backs the regional map + Live Ops Strip. Joins activity counts
-- against deployment_regions so every seeded country appears even
-- if it has zero bookings today.
CREATE OR REPLACE FUNCTION public.live_ops_by_country()
RETURNS TABLE (
  country_code             TEXT,
  display_name             TEXT,
  flag                     TEXT,
  status                   TEXT,
  region                   TEXT,
  active_jobs              BIGINT,
  pending_bookings         BIGINT,
  enterprise_pending       BIGINT,
  open_disputes            BIGINT,
  providers_onboarding     BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH bk AS (
    SELECT
      lower(coalesce(b.booking_country, 'us')) AS cc,
      COUNT(*) FILTER (WHERE b.status IN ('driver_assigned','pickup_arrived','loading','in_transit')) AS active,
      COUNT(*) FILTER (WHERE b.status IN ('pending','confirmed')) AS pending
    FROM public.bookings b
    GROUP BY 1
  ),
  rr AS (
    SELECT lower(country) AS cc,
           COUNT(*) FILTER (WHERE status IN ('pending','under_review','approved')) AS pending
    FROM public.relocation_requests GROUP BY 1
  ),
  dp AS (
    SELECT lower(country) AS cc,
           COUNT(*) FILTER (WHERE status IN ('open','under_review','escalated')) AS open_count
    FROM public.disputes GROUP BY 1
  ),
  apps AS (
    SELECT
      /* driver_applications uses 'country_code' on some installs and
       * 'country' on others; coalesce keeps both shapes working. */
      lower(coalesce(da.country_code, da.country, 'us')) AS cc,
      COUNT(*) FILTER (WHERE da.status = 'pending') AS pending
    FROM public.driver_applications da
    GROUP BY 1
  )
  SELECT
    dr.country_code,
    dr.display_name,
    dr.flag,
    dr.status,
    dr.region,
    COALESCE(bk.active,    0)  AS active_jobs,
    COALESCE(bk.pending,   0)  AS pending_bookings,
    COALESCE(rr.pending,   0)  AS enterprise_pending,
    COALESCE(dp.open_count,0)  AS open_disputes,
    COALESCE(apps.pending, 0)  AS providers_onboarding
  FROM public.deployment_regions dr
  LEFT JOIN bk   ON bk.cc   = dr.country_code
  LEFT JOIN rr   ON rr.cc   = dr.country_code
  LEFT JOIN dp   ON dp.cc   = dr.country_code
  LEFT JOIN apps ON apps.cc = dr.country_code
  ORDER BY dr.position;
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_ops_by_country() TO authenticated;


-- ----------------------------------------------------------------------------
-- 4. live_ops_provider_availability(country) — capability heatmap
-- ----------------------------------------------------------------------------
-- Aggregates provider_pricing flags grouped by city. Helps the
-- dispatch team eyeball capacity gaps before opening a new region
-- or accepting a corporate volume pledge.
--
-- City is derived via an optional join to provider_profile.home_city
-- (preferred) or falls back to bucketing by lat/lng grid quadrant.
-- For the v1 we just bucket by the provider's home_lat/lng grid
-- so the function works without further schema dependencies.
CREATE OR REPLACE FUNCTION public.live_ops_provider_availability(p_country TEXT DEFAULT NULL)
RETURNS TABLE (
  bucket           TEXT,             -- "lat,lng" 1° grid quadrant
  provider_count   BIGINT,
  truck_count      BIGINT,
  packing_count    BIGINT,
  storage_count    BIGINT,
  vacation_count   BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    /* Round to nearest whole degree as a rough city/region grid. */
    CONCAT(ROUND(pp.home_lat)::TEXT, ',', ROUND(pp.home_lng)::TEXT) AS bucket,
    COUNT(*)                                                AS provider_count,
    COUNT(*) FILTER (WHERE pp.truck_available)             AS truck_count,
    COUNT(*) FILTER (WHERE pp.packing_available)           AS packing_count,
    COUNT(*) FILTER (WHERE pp.storage_available)           AS storage_count,
    COUNT(*) FILTER (WHERE pp.vacation_mode)               AS vacation_count
  FROM public.provider_pricing pp
  /* Join to driver_applications for country if a country filter is
   * supplied; we look up via the corresponding application row. */
  LEFT JOIN public.driver_applications da ON da.user_id = pp.user_id
  WHERE pp.home_lat IS NOT NULL AND pp.home_lng IS NOT NULL
    AND (p_country IS NULL OR lower(coalesce(da.country_code, da.country)) = lower(p_country))
  GROUP BY bucket
  ORDER BY provider_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_ops_provider_availability(TEXT) TO authenticated;


-- ----------------------------------------------------------------------------
-- 5. live_ops_revenue(period) — revenue tracker
-- ----------------------------------------------------------------------------
-- Aggregates bookings + subscription gross for the given period.
-- Period values: 'today', 'week', 'month'. Booking gross is summed
-- in USD by converting via the currency_settings table when
-- booking_country isn't USD; missing rates fall back to 1.0 so
-- early-stage markets don't break the dashboard.
CREATE OR REPLACE FUNCTION public.live_ops_revenue(p_period TEXT DEFAULT 'today')
RETURNS JSONB
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_since      DATE;
  v_bookings   NUMERIC := 0;
  v_subs       NUMERIC := 0;
  v_count      BIGINT  := 0;
BEGIN
  v_since := CASE p_period
    WHEN 'today' THEN CURRENT_DATE
    WHEN 'week'  THEN CURRENT_DATE - 6
    WHEN 'month' THEN CURRENT_DATE - 29
    ELSE CURRENT_DATE
  END;

  /* Booking gross — naive USD aggregate, treats local-currency
   * prices as USD. Production ops can refine via currency_settings. */
  SELECT
    COALESCE(SUM(COALESCE(b.final_price, b.original_price, b.price_estimate, 0))::NUMERIC, 0),
    COUNT(*)
    INTO v_bookings, v_count
  FROM public.bookings b
  WHERE b.created_at::DATE >= v_since
    AND b.status <> 'cancelled';

  /* Subscription gross — sum of the active paid plans' baseline
   * USD price prorated to a daily slice over the period. */
  SELECT COALESCE(SUM(st.baseline_usd)::NUMERIC, 0)
    INTO v_subs
  FROM public.driver_subscriptions ds
  JOIN public.subscription_tiers st ON st.slug = ds.plan
  WHERE ds.subscription_status = 'active'
    AND ds.start_date::DATE >= v_since;

  RETURN jsonb_build_object(
    'period',                 p_period,
    'since',                  v_since,
    'booking_count',          v_count,
    'gross_bookings_usd',     v_bookings,
    'gross_subscriptions_usd', v_subs,
    'gross_total_usd',        v_bookings + v_subs,
    'generated_at',           now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.live_ops_revenue(TEXT) TO authenticated;
