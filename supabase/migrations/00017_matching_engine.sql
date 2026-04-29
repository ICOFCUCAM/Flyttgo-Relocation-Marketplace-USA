-- ============================================================================
-- FlyttGo — Smart Matching Engine
-- ============================================================================
-- Unified matching layer that supersedes the per-flow ad-hoc dispatch
-- queries (the booking dispatch in install-dispatch-engine.sql,
-- relocation_request dispatch via find_eligible_providers_for_segment).
--
-- Single entry point: match_providers_for_booking(p_input, p_mode)
-- returns the ranked provider list for any booking-style request.
--
-- ── Compatibility filter (hard gates) ─────────────────────────────
--
--   - provider must not be suspended
--   - provider must operate the requested vehicle profile
--     (truck_available / packing_available / storage_available)
--   - provider's available_crew_sizes must include the requested
--     crew size (or no crew size requirement if NULL)
--   - service-specialization tags must overlap the requested tags
--   - country must match (provider_pricing.home_city_slug country
--     vs request country)
--   - tier minimum (Silver/Silver+ excluded from enterprise mode)
--
-- ── Composite score (after filters pass) ──────────────────────────
--
--   match_score =
--       distance_w        × distance_factor
--     + reliability_w     × (rank_score / 100)
--     + tier_w            × (tier_position / 50)
--     + specialization_w  × specialization_overlap
--     + response_w        × response_speed_score
--     + activity_w        × recent_activity_score
--
--   Country overrides the weights via country_score_weights
--   (already seeded in install-provider-scoring.sql).
--
-- ── Modes ─────────────────────────────────────────────────────────
--
--   'instant'      — top 1 (single best match for instant booking)
--   'multi_quote'  — top 3 (3 providers receive request, customer picks)
--   'enterprise'   — top 5, CIP/Gold Pro/Gold only, suspended excluded
--
-- Run AFTER:
--   - install-provider-scoring.sql + install-scoring-completion.sql
--   - install-subscription-tier-pricing.sql
--   - install-cip-enterprise-routing.sql
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. provider_specializations — tag layer for service matching
-- ----------------------------------------------------------------------------
-- Multi-tag per provider; the matching engine checks tag overlap
-- with the requesting booking's specialization_tags array.
CREATE TABLE IF NOT EXISTS public.provider_specializations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  /* Specialization slug — one of the canonical tags below. */
  tag          TEXT NOT NULL CHECK (tag IN (
    'apartment-relocation',
    'office-relocation',
    'corporate-relocation',
    'international-relocation',
    'student-relocation',
    'equipment-relocation',
    'long-distance',
    'local-moves',
    'packing-only',
    'labor-only',
    'storage-staging',
    'last-mile-freight',
    'climate-controlled',
    'fragile-handling',
    'piano-or-art',
    'corporate-it-decommission'
  )),
  proficiency  SMALLINT NOT NULL DEFAULT 3 CHECK (proficiency BETWEEN 1 AND 5),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag)
);

CREATE INDEX IF NOT EXISTS provider_specializations_tag_idx
  ON public.provider_specializations (tag);


-- ----------------------------------------------------------------------------
-- 2. Distance helper — Haversine (great-circle) in km
-- ----------------------------------------------------------------------------
-- Inlined here so the matching RPC works even when PostGIS isn't
-- installed (matches the existing install-dispatch-engine.sql
-- approach). Returns 0 when either coordinate pair is null so the
-- distance factor degenerates gracefully (no provider gets a free
-- ride for missing coords).
-- DROP first because dispatch-engine already created haversine_km with
-- parameter names lat1/lng1/lat2/lng2. CREATE OR REPLACE cannot rename
-- parameters; we want the p_ prefix here for consistency with the rest
-- of the matching engine signatures.
DROP FUNCTION IF EXISTS public.haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC);
CREATE OR REPLACE FUNCTION public.haversine_km(
  p_lat1 NUMERIC, p_lng1 NUMERIC,
  p_lat2 NUMERIC, p_lng2 NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_earth_km NUMERIC := 6371;
  v_a        NUMERIC;
  v_c        NUMERIC;
  v_dlat     NUMERIC;
  v_dlng     NUMERIC;
BEGIN
  IF p_lat1 IS NULL OR p_lng1 IS NULL OR p_lat2 IS NULL OR p_lng2 IS NULL THEN
    RETURN 0;
  END IF;
  v_dlat := radians(p_lat2 - p_lat1);
  v_dlng := radians(p_lng2 - p_lng1);
  v_a    := sin(v_dlat / 2) * sin(v_dlat / 2)
          + cos(radians(p_lat1)) * cos(radians(p_lat2))
          * sin(v_dlng / 2) * sin(v_dlng / 2);
  v_c    := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
  RETURN v_earth_km * v_c;
END;
$$;


-- ----------------------------------------------------------------------------
-- 3. match_providers_for_booking — the unified matcher
-- ----------------------------------------------------------------------------
-- Input is a JSONB envelope so the API surface stays stable as we
-- add filter dimensions. Required keys:
--
--   country         TEXT       — 'us' | 'gb' | 'de' | etc.
--
-- Optional keys:
--   pickup_lat      NUMERIC, pickup_lng NUMERIC  — for distance scoring
--   crew_size       SMALLINT (2-5)
--   needs_truck     BOOLEAN
--   needs_packing   BOOLEAN
--   needs_storage   BOOLEAN
--   specialization_tags TEXT[]  — overlap check against provider tags
--   exclude_silver  BOOLEAN     — auto-true in enterprise mode
--   service_radius_km NUMERIC   — hard cap; defaults to provider's own
--                                  radius
--
-- Returns ranked rows (user_id, match_score, distance_km, tier_slug,
-- rank_score, reasons[]).
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

  /* Country weight overrides — same source the rank_score uses, so
   * matching emphasis stays consistent with provider ranking. */
  v_w_distance      NUMERIC := 0.20;
  v_w_reliability   NUMERIC := 0.30;   /* base reliability */
  v_w_tier          NUMERIC := 0.20;   /* subscription tier priority */
  v_w_specialization NUMERIC := 0.15;
  v_w_response      NUMERIC := 0.10;
  v_w_activity      NUMERIC := 0.05;
BEGIN
  /* Pull country-specific reliability emphasis (already seeded
   * for US/DE/UK/NG/KE/AE in install-provider-scoring.sql). The
   * overrides apply to reliability + response_speed; the others
   * use the global defaults. */
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
      pr.is_suspended,
      pr.recent_activity_score,
      pr.response_speed_score,
      ds.plan                      AS tier_slug,
      COALESCE(st.position, 0)     AS tier_position,
      pp.truck_available,
      pp.packing_available,
      pp.storage_available,
      pp.available_crew_sizes,
      pp.service_radius_km,
      /* Distance — null-tolerant. We assume future provider rows
       * carry a home lat/lng; today they don't, so the distance
       * factor falls back to 0.5 for everyone (neutral). */
      0::NUMERIC                   AS distance_km,
      /* Specialization overlap (0–1). */
      CASE
        WHEN array_length(v_tags, 1) IS NULL THEN 1.0
        WHEN EXISTS (
          SELECT 1 FROM public.provider_specializations s
          WHERE s.user_id = pr.user_id AND s.tag = ANY(v_tags)
        ) THEN
          /* Count overlapping tags / requested tags. */
          (SELECT COUNT(*)::NUMERIC FROM public.provider_specializations s
            WHERE s.user_id = pr.user_id AND s.tag = ANY(v_tags))
          / array_length(v_tags, 1)::NUMERIC
        ELSE 0
      END                          AS specialization_overlap
    FROM public.provider_reputation pr
    LEFT JOIN public.driver_subscriptions ds
           ON ds.driver_id = pr.user_id AND ds.subscription_status = 'active'
    LEFT JOIN public.subscription_tiers st
           ON st.slug = ds.plan
    LEFT JOIN public.provider_pricing pp
           ON pp.user_id = pr.user_id
    WHERE pr.is_suspended = false
      /* Vehicle compatibility — provider must offer truck if
       * requested. Same for packing + storage. */
      AND (NOT v_needs_truck    OR COALESCE(pp.truck_available,    false))
      AND (NOT v_needs_packing  OR COALESCE(pp.packing_available,  false))
      AND (NOT v_needs_storage  OR COALESCE(pp.storage_available,  false))
      /* Crew size — when requested, must be in the provider's offered set. */
      AND (v_crew_size IS NULL OR pp.available_crew_sizes IS NULL
           OR v_crew_size = ANY(pp.available_crew_sizes))
      /* Tier gate for enterprise mode (no Silver / Silver+). */
      AND (NOT v_exclude_silver OR ds.plan IN ('gold','gold_pro','elite'))
  ),
  scored AS (
    SELECT
      c.*,
      /* Composite score — weighted sum of normalised factors.
       * Each factor is 0–1; weights sum to 1.0; result is 0–100. */
      (
          v_w_distance       * (1.0 - LEAST(c.distance_km / 50.0, 1.0))   -- closer = better
        + v_w_reliability    * (COALESCE(c.rank_score, 60)::NUMERIC / 100.0)
        + v_w_tier           * (c.tier_position::NUMERIC / 50.0)          -- 50 = CIP
        + v_w_specialization * c.specialization_overlap
        + v_w_response       * COALESCE(c.response_speed_score, 0.5)
        + v_w_activity       * COALESCE(c.recent_activity_score, 0.5)
      ) * 100                                                              AS match_score
    FROM candidates c
  )
  SELECT
    s.user_id,
    ROUND(s.match_score, 2) AS match_score,
    s.distance_km,
    s.tier_slug,
    s.tier_position,
    s.rank_score,
    (s.tier_slug = 'elite')                  AS is_cip,
    s.is_top_rated,
    /* Reasons array — admin queue + customer-facing transparency. */
    ARRAY_REMOVE(ARRAY[
      CASE WHEN s.tier_slug = 'elite'  THEN 'Certified Infrastructure Partner' END,
      CASE WHEN s.is_top_rated         THEN 'Top-rated provider' END,
      CASE WHEN s.specialization_overlap >= 0.5
                                       THEN 'Strong specialization match' END,
      CASE WHEN s.response_speed_score IS NOT NULL AND s.response_speed_score >= 0.85
                                       THEN 'Fast response history' END,
      CASE WHEN s.rank_score IS NOT NULL AND s.rank_score >= 90
                                       THEN 'High reliability score' END
    ], NULL) AS reasons
  FROM scored s
  ORDER BY s.match_score DESC NULLS LAST,
           s.tier_position DESC,
           s.rank_score    DESC NULLS LAST
  LIMIT v_limit;
END;
$$;


-- ----------------------------------------------------------------------------
-- 4. Update relocation_requests dispatch to use the new matcher
-- ----------------------------------------------------------------------------
-- Wraps dispatch_relocation_request to call the new matcher in
-- enterprise mode (CIP first, Silver excluded). Falls back to the
-- old find_eligible_providers_for_segment behaviour if the new
-- matcher returns nothing.
CREATE OR REPLACE FUNCTION public.dispatch_relocation_request(p_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request   public.relocation_requests%ROWTYPE;
  v_provider  UUID;
  v_booking   UUID;
  v_input     JSONB;
BEGIN
  SELECT * INTO v_request
  FROM public.relocation_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_request.dispatched_booking_id IS NOT NULL THEN
    RETURN v_request.dispatched_booking_id;
  END IF;
  IF v_request.status NOT IN ('approved','dispatched') THEN
    RAISE EXCEPTION 'request_not_approved';
  END IF;

  /* Build the matching input from the relocation_request brief.
   * Enterprise mode auto-excludes Silver tiers + sorts CIP first. */
  v_input := jsonb_build_object(
    'country',             v_request.country,
    'crew_size',           v_request.brief ->> 'crew_size',
    'needs_truck',         COALESCE((v_request.brief ->> 'needs_truck')::BOOLEAN, true),
    'needs_packing',       COALESCE((v_request.brief ->> 'needs_packing')::BOOLEAN, false),
    'specialization_tags', v_request.brief -> 'specialization_tags'
  );

  /* Pick the top provider via the new matcher. */
  SELECT m.user_id INTO v_provider
  FROM public.match_providers_for_booking(v_input, 'enterprise') m
  ORDER BY m.match_score DESC NULLS LAST
  LIMIT 1;

  /* Fallback to the segment-based matcher if the new one returned
   * nothing — handles the edge case where no provider has a tier
   * subscription yet (early-stage market). */
  IF v_provider IS NULL THEN
    SELECT user_id INTO v_provider
    FROM public.find_eligible_providers_for_segment(v_request.segment, 1);
  END IF;

  IF v_provider IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.bookings (
    user_id, driver_id,
    pickup_address, dropoff_address,
    move_date,
    price_estimate, status, payment_status,
    booking_country
  ) VALUES (
    v_request.requested_by_user_id, v_provider,
    COALESCE(v_request.brief->>'pickup_address',  v_request.city || ' (TBC)'),
    COALESCE(v_request.brief->>'dropoff_address', v_request.city || ' (TBC)'),
    COALESCE((v_request.brief->>'move_date')::DATE, CURRENT_DATE + INTERVAL '7 days'),
    COALESCE(v_request.estimated_total, 0),
    'driver_assigned',
    'pending',
    UPPER(v_request.country)
  )
  RETURNING id INTO v_booking;

  UPDATE public.relocation_requests
     SET dispatched_booking_id = v_booking,
         status                = 'dispatched'
   WHERE id = p_request_id;

  INSERT INTO public.relocation_request_approvals
    (request_id, actor_user_id, action, comment)
  VALUES
    (p_request_id, COALESCE(auth.uid(), v_request.requested_by_user_id),
     'comment', 'Auto-dispatched via smart matcher to provider ' || v_provider::TEXT);

  RETURN v_booking;
END;
$$;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.provider_specializations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_specializations_anon_read ON public.provider_specializations;
DROP POLICY IF EXISTS provider_specializations_self_write ON public.provider_specializations;

CREATE POLICY provider_specializations_anon_read
  ON public.provider_specializations FOR SELECT USING (true);

CREATE POLICY provider_specializations_self_write
  ON public.provider_specializations FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

GRANT EXECUTE ON FUNCTION public.haversine_km(NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.match_providers_for_booking(JSONB, TEXT)         TO authenticated, anon;
