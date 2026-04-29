-- ============================================================================
-- FlyttGo — Matching engine compliance gate
-- ============================================================================
-- Closes the "country compliance status" filter required for global
-- marketplace deployment readiness.
--
-- Adds:
--   1. provider_compliance_documents — per-provider, per-country
--      submissions tied to onboarding_country_fields. Status +
--      expires_at let admin approve / reject / expire each doc.
--   2. provider_compliance_status(user_id, country)  — helper that
--      returns whether the provider has every NON-conditional
--      required doc currently approved (and non-expired).
--   3. match_providers_for_booking — adds compliance gate +
--      exposes provider_match_rank alongside match_score, and
--      strict tier-priority sort in enterprise mode.
--
-- Run AFTER:
--   - install-onboarding-rules.sql
--   - install-matching-engine.sql
--   - install-matching-engine-completion.sql
--   - install-platform-completion.sql
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. provider_compliance_documents — submission ledger
-- ----------------------------------------------------------------------------
-- One row per (provider, country, document slug). The document slug
-- references onboarding_country_fields.slug — that table is the
-- canonical source of truth for what each country requires. Admin
-- approval flips the status; an expires_at cutoff is enforced by
-- the matcher's filter so providers are auto-excluded the moment
-- their cargo insurance / operator licence lapses.
CREATE TABLE IF NOT EXISTS public.provider_compliance_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_code    TEXT NOT NULL,
  document_slug   TEXT NOT NULL,           -- matches onboarding_country_fields.slug
  /* pending      — submitted by provider, awaiting admin review
   * approved     — admin verified, document is on file
   * rejected     — admin rejected (with reason); provider must resubmit
   * expired      — auto-flipped via cron once expires_at is in the past */
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','expired')),
  /* Optional file path in the dispute-evidence / compliance-docs
   * storage bucket. Null when the field is a number-only attestation
   * (e.g. SIRET, GST registration). */
  file_url        TEXT,
  /* Free-text identifier — DOT number, MC number, SIRET, etc. */
  reference       TEXT,
  /* Optional expiry — required for time-bounded docs (cargo
   * insurance, operator licence) and null for permanent ones
   * (CAC, Companies House registration). The matcher treats
   * expires_at IS NOT NULL AND expires_at <= now() as a hard fail. */
  expires_at      DATE,
  rejection_note  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, country_code, document_slug)
);

CREATE INDEX IF NOT EXISTS provider_compliance_docs_user_idx
  ON public.provider_compliance_documents (user_id, country_code);
CREATE INDEX IF NOT EXISTS provider_compliance_docs_status_idx
  ON public.provider_compliance_documents (status, expires_at);

ALTER TABLE public.provider_compliance_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_compliance_docs_self_rw   ON public.provider_compliance_documents;
DROP POLICY IF EXISTS provider_compliance_docs_admin_rw  ON public.provider_compliance_documents;
DROP POLICY IF EXISTS provider_compliance_docs_anon_read ON public.provider_compliance_documents;

CREATE POLICY provider_compliance_docs_self_rw
  ON public.provider_compliance_documents FOR ALL TO authenticated
  USING       (user_id = auth.uid())
  WITH CHECK  (user_id = auth.uid() AND status IN ('pending','rejected'));
/* Provider can write their own row but never set status='approved' —
 * approval is admin-only. The constraint covers SET (UPDATE) writes
 * too because RLS WITH CHECK runs on the post-update row. */

CREATE POLICY provider_compliance_docs_admin_rw
  ON public.provider_compliance_documents FOR ALL TO authenticated
  USING       (public.is_admin())
  WITH CHECK  (public.is_admin());

/* Anon read is fine — the matcher needs to evaluate compliance
 * pre-auth (e.g. when the booking widget runs the matcher before
 * checkout) and there's nothing PII-sensitive on the row. The
 * uploaded file URLs are signed when fetched from storage. */
CREATE POLICY provider_compliance_docs_anon_read
  ON public.provider_compliance_documents FOR SELECT USING (true);


-- ----------------------------------------------------------------------------
-- 1a. updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_provider_compliance_documents()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS provider_compliance_docs_touch ON public.provider_compliance_documents;
CREATE TRIGGER provider_compliance_docs_touch
  BEFORE UPDATE ON public.provider_compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_provider_compliance_documents();


-- ----------------------------------------------------------------------------
-- 2. provider_compliance_status — derived per-provider per-country gate
-- ----------------------------------------------------------------------------
-- Returns:
--   - is_compliant       : all NON-conditional required docs approved
--                          AND non-expired
--   - missing_required   : array of slugs the provider hasn't submitted
--   - expired_required   : array of slugs whose approved doc has lapsed
--   - rejected_required  : array of slugs admin pushed back on
--
-- "Conditional" docs (vehicle-operation, interstate-only,
-- heavy-transport-only) only apply when the provider opts into the
-- pre-condition. They're excluded from the required gate so a
-- labor-only provider isn't locked out for not having a USDOT
-- number they don't need.
CREATE OR REPLACE FUNCTION public.provider_compliance_status(
  p_user_id     UUID,
  p_country     TEXT
) RETURNS TABLE (
  is_compliant      BOOLEAN,
  missing_required  TEXT[],
  expired_required  TEXT[],
  rejected_required TEXT[]
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_country  TEXT := lower(p_country);
BEGIN
  RETURN QUERY
  WITH required_slugs AS (
    SELECT slug
      FROM public.onboarding_country_fields
     WHERE country_code = v_country
       AND requirement  = 'required'
  ),
  provider_docs AS (
    SELECT document_slug, status, expires_at
      FROM public.provider_compliance_documents
     WHERE user_id      = p_user_id
       AND country_code = v_country
  ),
  joined AS (
    SELECT
      r.slug,
      pd.status,
      pd.expires_at,
      (pd.expires_at IS NOT NULL AND pd.expires_at < CURRENT_DATE) AS is_expired
    FROM required_slugs r
    LEFT JOIN provider_docs pd ON pd.document_slug = r.slug
  )
  SELECT
    /* Compliant = every required slug has an approved + non-expired row. */
    bool_and(j.status = 'approved' AND NOT j.is_expired) AS is_compliant,
    /* Missing = no row at all. */
    COALESCE(ARRAY_AGG(j.slug) FILTER (WHERE j.status IS NULL),         '{}') AS missing_required,
    /* Expired = row exists, status approved, but expires_at < today. */
    COALESCE(ARRAY_AGG(j.slug) FILTER (WHERE j.is_expired),             '{}') AS expired_required,
    /* Rejected = admin rejected the latest submission. */
    COALESCE(ARRAY_AGG(j.slug) FILTER (WHERE j.status = 'rejected'),    '{}') AS rejected_required
  FROM joined j;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provider_compliance_status(UUID, TEXT) TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 3. match_providers_for_booking — compliance gate + provider_match_rank
-- ----------------------------------------------------------------------------
-- Drop existing signature so we can return a new column.
DROP FUNCTION IF EXISTS public.match_providers_for_booking(JSONB, TEXT);

CREATE FUNCTION public.match_providers_for_booking(
  p_input  JSONB,
  p_mode   TEXT DEFAULT 'instant'
) RETURNS TABLE (
  user_id              UUID,
  match_score          NUMERIC,
  /* Canonical alias used in dispatch logs / admin queues. Same value
   * as match_score; surfaced under both names so consumers can pick
   * the more meaningful term. */
  provider_match_rank  NUMERIC,
  distance_km          NUMERIC,
  tier_slug            TEXT,
  tier_position        SMALLINT,
  rank_score           SMALLINT,
  is_cip               BOOLEAN,
  is_top_rated         BOOLEAN,
  /* Compliance gate result — only providers passing the country
   * filter get returned, but we expose the resolved value here for
   * admin queues that want to render the badge alongside the row. */
  is_compliant         BOOLEAN,
  reasons              TEXT[]
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
  /* Skip the compliance gate when the caller explicitly opts out
   * (e.g. seeding test data, admin diagnostic queries). Defaults
   * to enforced. */
  v_skip_compliance BOOLEAN    := coalesce((p_input ->> 'skip_compliance')::BOOLEAN, false);
  v_limit           INTEGER    := CASE p_mode
                                    WHEN 'instant'     THEN 1
                                    WHEN 'multi_quote' THEN 3
                                    WHEN 'enterprise'  THEN 5
                                    ELSE 10
                                  END;
  v_w_distance       NUMERIC := 0.20;
  v_w_reliability    NUMERIC := 0.30;
  v_w_tier           NUMERIC := 0.20;
  v_w_specialization NUMERIC := 0.15;
  v_w_response       NUMERIC := 0.10;
  v_w_activity       NUMERIC := 0.05;
BEGIN
  SELECT
    COALESCE(rating_weight,    v_w_reliability),
    COALESCE(response_weight,  v_w_response)
    INTO v_w_reliability, v_w_response
  FROM public.country_score_weights
  WHERE country_code = v_country;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      pr.user_id, pr.rank_score, pr.is_top_rated,
      pr.recent_activity_score, pr.response_speed_score,
      ds.plan AS tier_slug, COALESCE(st.position, 0) AS tier_position,
      pp.truck_available, pp.packing_available, pp.storage_available,
      pp.available_crew_sizes, pp.service_radius_km,
      pp.home_lat, pp.home_lng,
      CASE
        WHEN v_pickup_lat IS NOT NULL AND v_pickup_lng IS NOT NULL
             AND pp.home_lat IS NOT NULL AND pp.home_lng IS NOT NULL
        THEN public.haversine_km(v_pickup_lat, v_pickup_lng, pp.home_lat, pp.home_lng)
        ELSE NULL
      END AS distance_km,
      CASE
        WHEN array_length(v_tags, 1) IS NULL THEN 1.0
        ELSE COALESCE(
          (SELECT COUNT(*)::NUMERIC FROM public.provider_specializations s
            WHERE s.user_id = pr.user_id AND s.tag = ANY(v_tags))
          / NULLIF(array_length(v_tags, 1), 0)::NUMERIC, 0)
      END AS specialization_overlap,
      /* Compliance gate — evaluated once per candidate. When skip
       * is true, every provider is treated as compliant. */
      CASE
        WHEN v_skip_compliance THEN TRUE
        ELSE COALESCE((SELECT cs.is_compliant
                         FROM public.provider_compliance_status(pr.user_id, v_country) cs),
                      FALSE)
      END AS is_compliant
    FROM public.provider_reputation pr
    LEFT JOIN public.driver_subscriptions ds
           ON ds.driver_id = pr.user_id AND ds.subscription_status = 'active'
    LEFT JOIN public.subscription_tiers st ON st.slug = ds.plan
    LEFT JOIN public.provider_pricing pp   ON pp.user_id = pr.user_id
    WHERE pr.is_suspended = false
      AND (pp.vacation_mode IS NOT TRUE)
      AND (NOT v_needs_truck   OR COALESCE(pp.truck_available,   false))
      AND (NOT v_needs_packing OR COALESCE(pp.packing_available, false))
      AND (NOT v_needs_storage OR COALESCE(pp.storage_available, false))
      AND (v_crew_size IS NULL OR pp.available_crew_sizes IS NULL
           OR v_crew_size = ANY(pp.available_crew_sizes))
      AND (NOT v_exclude_silver OR ds.plan IN ('gold','gold_pro','elite'))
      AND (
        v_move_date IS NULL OR NOT EXISTS (
          SELECT 1 FROM public.provider_availability_blackouts b
          WHERE b.user_id = pr.user_id
            AND b.starts_on <= v_move_date AND b.ends_on >= v_move_date
        )
      )
      AND (
        v_pickup_lat IS NULL OR pp.home_lat IS NULL
        OR pp.service_radius_km IS NULL
        OR public.haversine_km(v_pickup_lat, v_pickup_lng, pp.home_lat, pp.home_lng) <= pp.service_radius_km
      )
  ),
  /* Compliance is a HARD gate when not skipped — non-compliant
   * providers fall out before scoring. */
  filtered AS (
    SELECT * FROM candidates c
    WHERE v_skip_compliance OR c.is_compliant = TRUE
  ),
  scored AS (
    SELECT f.*,
      (
          v_w_distance       * COALESCE(1.0 - LEAST(f.distance_km / 50.0, 1.0), 0.5)
        + v_w_reliability    * (COALESCE(f.rank_score, 60)::NUMERIC / 100.0)
        + v_w_tier           * (f.tier_position::NUMERIC / 50.0)
        + v_w_specialization * f.specialization_overlap
        + v_w_response       * COALESCE(f.response_speed_score, 0.5)
        + v_w_activity       * COALESCE(f.recent_activity_score, 0.5)
      ) * 100 AS match_score
    FROM filtered f
  )
  SELECT
    s.user_id,
    ROUND(s.match_score, 2)                AS match_score,
    ROUND(s.match_score, 2)                AS provider_match_rank,
    COALESCE(ROUND(s.distance_km, 1), 0)   AS distance_km,
    s.tier_slug, s.tier_position, s.rank_score,
    (s.tier_slug = 'elite')                AS is_cip,
    s.is_top_rated,
    s.is_compliant,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN s.tier_slug = 'elite'  THEN 'Certified Infrastructure Partner' END,
      CASE WHEN s.is_top_rated         THEN 'Top-rated provider' END,
      CASE WHEN s.specialization_overlap >= 0.5 THEN 'Strong specialization match' END,
      CASE WHEN s.response_speed_score IS NOT NULL AND s.response_speed_score >= 0.85 THEN 'Fast response history' END,
      CASE WHEN s.rank_score IS NOT NULL AND s.rank_score >= 90 THEN 'High reliability score' END,
      CASE WHEN s.distance_km IS NOT NULL AND s.distance_km <= 5 THEN 'Inside the service radius' END,
      CASE WHEN s.is_compliant THEN 'Country compliance verified' END
    ], NULL)                               AS reasons
  FROM scored s
  /* Enterprise mode → strict tier-priority order
   * (CIP > Gold Pro > Gold > Silver+ > Silver). The instant +
   * multi_quote modes keep the score-weighted ranking so a
   * higher-rated Gold can still beat a lower-rated Gold Pro. */
  ORDER BY
    CASE WHEN p_mode = 'enterprise' THEN s.tier_position ELSE 0 END DESC,
    s.match_score DESC NULLS LAST,
    s.tier_position DESC,
    s.rank_score    DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_providers_for_booking(JSONB, TEXT) TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 4. expire_provider_compliance_documents — daily cron worker
-- ----------------------------------------------------------------------------
-- Flips approved → expired the day after expires_at lapses. Runs
-- via pg_cron (caller's responsibility to schedule); idempotent so
-- a missed run is harmless. Returns the number of rows flipped so
-- ops can dashboard the queue.
CREATE OR REPLACE FUNCTION public.expire_provider_compliance_documents()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE public.provider_compliance_documents
     SET status = 'expired'
   WHERE status = 'approved'
     AND expires_at IS NOT NULL
     AND expires_at < CURRENT_DATE;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_provider_compliance_documents() TO authenticated;
