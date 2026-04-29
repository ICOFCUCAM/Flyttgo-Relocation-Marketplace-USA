-- ============================================================================
-- FlyttGo — Matching engine completion
-- ============================================================================
-- Closes follow-up gaps from PR #63's Smart Matching Engine:
--
--   1. Calendar-driven availability — provider_availability_blackouts
--      table; matcher excludes providers with an active blackout
--      covering the request's move_date.
--   2. Distance-driven scoring — provider_pricing.home_lat / home_lng;
--      matcher computes haversine distance from the booking's
--      pickup coords to the provider's home base.
--
-- Run AFTER docs/install-matching-engine.sql.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Coordinate columns on provider_pricing
-- ----------------------------------------------------------------------------
ALTER TABLE public.provider_pricing
  ADD COLUMN IF NOT EXISTS home_lat NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS home_lng NUMERIC(10,6);


-- ----------------------------------------------------------------------------
-- 2. provider_availability_blackouts — date-range blackouts
-- ----------------------------------------------------------------------------
-- Provider self-managed via the /driver/pricing page. Blocks
-- dispatch when the booking's move_date lands within the range.
-- Closed-closed range — the blackout includes both endpoints.
CREATE TABLE IF NOT EXISTS public.provider_availability_blackouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_on   DATE NOT NULL,
  ends_on     DATE NOT NULL CHECK (ends_on >= starts_on),
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_availability_blackouts_user_idx
  ON public.provider_availability_blackouts (user_id, starts_on, ends_on);


-- ----------------------------------------------------------------------------
-- 3. Update match_providers_for_booking to use both
-- ----------------------------------------------------------------------------
-- Now accepts:
--   - move_date in the input — used for blackout filtering
--   - distance scoring is computed from real coordinates when both
--     the request and the provider have them
--
-- The function signature stays the same so existing callers keep
-- working; new fields are read out of p_input.
DROP FUNCTION IF EXISTS public.match_providers_for_booking(JSONB, TEXT);
CREATE OR REPLACE FUNCTION public.match_providers_for_booking(
  p_input  JSONB,
  p_mode   TEXT DEFAULT 'instant'
) RETURNS TABLE (
  user_id          UUID,
  match_score      NUMERIC,
  distance_km      NUMERIC,
  tier_slug        TEXT,
  tier_position    SMALLINT,
  rank_score       SMALLINT,
  is_cip           BOOLEAN,
  is_top_rated     BOOLEAN,
  reasons          TEXT[]
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_country         TEXT       := lower(coalesce(p_input ->> 'country', 'us'));
  v_pickup_lat      NUMERIC    := (p_input ->> 'pickup_lat')::NUMERIC;
  v_pickup_lng      NUMERIC    := (p_input ->> 'pickup_lng')::NUMERIC;
  v_move_date       DATE       := nullif(p_input ->> 'move_date', '')::DATE;
  v_crew_size       SMALLINT   := nullif(p_input ->> 'crew_size', '')::SMALLINT;
  v_needs_truck     BOOLEAN    := coalesce((p_input ->> 'needs_truck')::BOOLEAN, false);
  v_needs_packing   BOOLEAN    := coalesce((p_input ->> 'needs_packing')::BOOLEAN, false);
  v_needs_storage   BOOLEAN    := coalesce((p_input ->> 'needs_storage')::BOOLEAN, false);
  v_tags            TEXT[]     := coalesce(
    ARRAY(SELECT jsonb_array_elements_text(p_input -> 'specialization_tags')),
    ARRAY[]::TEXT[]
  );
  v_exclude_silver  BOOLEAN    := (p_mode = 'enterprise')
                                  OR coalesce((p_input ->> 'exclude_silver')::BOOLEAN, false);
  v_limit           INTEGER    := CASE p_mode
                                    WHEN 'instant'     THEN 1
                                    WHEN 'multi_quote' THEN 3
                                    WHEN 'enterprise'  THEN 5
                                    ELSE 10
                                  END;
  v_w_distance      NUMERIC := 0.20;
  v_w_reliability   NUMERIC := 0.30;
  v_w_tier          NUMERIC := 0.20;
  v_w_specialization NUMERIC := 0.15;
  v_w_response      NUMERIC := 0.10;
  v_w_activity      NUMERIC := 0.05;
BEGIN
  SELECT
    COALESCE(rating_weight,        v_w_reliability),
    COALESCE(response_weight,      v_w_response)
    INTO v_w_reliability, v_w_response
  FROM public.country_score_weights
  WHERE country_code = v_country;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      pr.user_id,
      pr.rank_score,
      pr.is_top_rated,
      pr.recent_activity_score,
      pr.response_speed_score,
      ds.plan                      AS tier_slug,
      COALESCE(st.position, 0)     AS tier_position,
      pp.truck_available,
      pp.packing_available,
      pp.storage_available,
      pp.available_crew_sizes,
      pp.service_radius_km,
      pp.home_lat, pp.home_lng,
      /* Real distance when both ends have coords; null otherwise so
       * the score formula's 0.5 fallback applies. */
      CASE
        WHEN v_pickup_lat IS NOT NULL AND v_pickup_lng IS NOT NULL
             AND pp.home_lat IS NOT NULL AND pp.home_lng IS NOT NULL
        THEN public.haversine_km(v_pickup_lat, v_pickup_lng, pp.home_lat, pp.home_lng)
        ELSE NULL
      END                          AS distance_km,
      /* Specialization overlap (0–1). */
      CASE
        WHEN array_length(v_tags, 1) IS NULL THEN 1.0
        ELSE COALESCE(
          (SELECT COUNT(*)::NUMERIC FROM public.provider_specializations s
            WHERE s.user_id = pr.user_id AND s.tag = ANY(v_tags))
          / NULLIF(array_length(v_tags, 1), 0)::NUMERIC,
          0
        )
      END                          AS specialization_overlap
    FROM public.provider_reputation pr
    LEFT JOIN public.driver_subscriptions ds
           ON ds.driver_id = pr.user_id AND ds.subscription_status = 'active'
    LEFT JOIN public.subscription_tiers st
           ON st.slug = ds.plan
    LEFT JOIN public.provider_pricing pp
           ON pp.user_id = pr.user_id
    WHERE pr.is_suspended = false
      AND (NOT v_needs_truck    OR COALESCE(pp.truck_available,    false))
      AND (NOT v_needs_packing  OR COALESCE(pp.packing_available,  false))
      AND (NOT v_needs_storage  OR COALESCE(pp.storage_available,  false))
      AND (v_crew_size IS NULL OR pp.available_crew_sizes IS NULL
           OR v_crew_size = ANY(pp.available_crew_sizes))
      AND (NOT v_exclude_silver OR ds.plan IN ('gold','gold_pro','elite'))
      /* Calendar availability — exclude providers with an active
       * blackout covering the requested move_date. When move_date
       * is null (TBC), no blackout filter applies. */
      AND (
        v_move_date IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.provider_availability_blackouts b
          WHERE b.user_id = pr.user_id
            AND b.starts_on <= v_move_date
            AND b.ends_on   >= v_move_date
        )
      )
      /* Service radius — when distance is known and exceeds the
       * provider's stated radius, exclude. */
      AND (
        v_pickup_lat IS NULL OR pp.home_lat IS NULL
        OR pp.service_radius_km IS NULL
        OR public.haversine_km(v_pickup_lat, v_pickup_lng, pp.home_lat, pp.home_lng) <= pp.service_radius_km
      )
  ),
  scored AS (
    SELECT
      c.*,
      (
          v_w_distance       * COALESCE(1.0 - LEAST(c.distance_km / 50.0, 1.0), 0.5)
        + v_w_reliability    * (COALESCE(c.rank_score, 60)::NUMERIC / 100.0)
        + v_w_tier           * (c.tier_position::NUMERIC / 50.0)
        + v_w_specialization * c.specialization_overlap
        + v_w_response       * COALESCE(c.response_speed_score, 0.5)
        + v_w_activity       * COALESCE(c.recent_activity_score, 0.5)
      ) * 100                                                              AS match_score
    FROM candidates c
  )
  SELECT
    s.user_id,
    ROUND(s.match_score, 2)                                                AS match_score,
    COALESCE(ROUND(s.distance_km, 1), 0)                                   AS distance_km,
    s.tier_slug,
    s.tier_position,
    s.rank_score,
    (s.tier_slug = 'elite')                                                AS is_cip,
    s.is_top_rated,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN s.tier_slug = 'elite'  THEN 'Certified Infrastructure Partner' END,
      CASE WHEN s.is_top_rated         THEN 'Top-rated provider' END,
      CASE WHEN s.specialization_overlap >= 0.5
                                       THEN 'Strong specialization match' END,
      CASE WHEN s.response_speed_score IS NOT NULL AND s.response_speed_score >= 0.85
                                       THEN 'Fast response history' END,
      CASE WHEN s.rank_score IS NOT NULL AND s.rank_score >= 90
                                       THEN 'High reliability score' END,
      CASE WHEN s.distance_km IS NOT NULL AND s.distance_km <= 5
                                       THEN 'Inside the service radius' END
    ], NULL) AS reasons
  FROM scored s
  ORDER BY s.match_score DESC NULLS LAST,
           s.tier_position DESC,
           s.rank_score    DESC NULLS LAST
  LIMIT v_limit;
END;
$$;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.provider_availability_blackouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_blackouts_self_all ON public.provider_availability_blackouts;
DROP POLICY IF EXISTS provider_blackouts_anon_read ON public.provider_availability_blackouts;

CREATE POLICY provider_blackouts_self_all
  ON public.provider_availability_blackouts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

/* Anon read so the matcher can run without an authenticated context
 * (e.g. when the booking widget calls it pre-checkout). */
CREATE POLICY provider_blackouts_anon_read
  ON public.provider_availability_blackouts FOR SELECT USING (true);
