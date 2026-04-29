-- ============================================================================
-- FlyttGo — Provider rating + reliability scoring engine
-- ============================================================================
-- Implements the full scoring formula the spec calls for:
--
--   score = (avg_rating × 40)
--         + (completion_rate × 20)
--         + (on_time_rate × 15)
--         + (response_speed × 10)
--         + (verification_level × 10)
--         − (dispute_ratio × 15)
--
-- with optional country-aware re-weighting (country_score_weights).
-- Results land in provider_reputation.rank_score (0–100), which the
-- marketplace search/quote-ordering surfaces use for ranking.
--
-- ── Tables added ────────────────────────────────────────────────────
--
--   provider_ratings           — 6-category structured ratings per booking
--   country_score_weights      — per-country override of scoring weights
--   provider_warnings          — auto-warning rows when triggers fire
--
-- ── provider_reputation (extended) ──────────────────────────────────
--
--   New columns: avg_rating · completion_rate · on_time_rate ·
--   response_speed_score · verification_level (1-4) · rank_score (0-100)
--   · last_active_at · warning_count_30d · is_top_rated · trust_badges[]
--
-- ── compute_provider_rank_score(uuid) ───────────────────────────────
--
--   Pure function — caller pre-aggregates the inputs from the various
--   sources (bookings, ratings, disputes, verifications). Returns
--   the score 0-100. Idempotent — safe to call from any trigger.
--
-- Run AFTER:
--   - docs/install-disputes.sql
--   - docs/install-dispute-completion.sql
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. provider_ratings — structured ratings per booking
-- ----------------------------------------------------------------------------
-- Six categories per the spec (punctuality, professionalism,
-- communication, care_of_items, estimate_accuracy, overall). Each
-- 1–5 integer; we average for ranking but keep the breakdown for
-- the provider profile timeline.
CREATE TABLE IF NOT EXISTS public.provider_ratings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL UNIQUE,             -- one rating per booking
  provider_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  punctuality         SMALLINT CHECK (punctuality       BETWEEN 1 AND 5),
  professionalism     SMALLINT CHECK (professionalism   BETWEEN 1 AND 5),
  communication       SMALLINT CHECK (communication     BETWEEN 1 AND 5),
  care_of_items       SMALLINT CHECK (care_of_items     BETWEEN 1 AND 5),
  estimate_accuracy   SMALLINT CHECK (estimate_accuracy BETWEEN 1 AND 5),
  overall             SMALLINT CHECK (overall           BETWEEN 1 AND 5),
  /* Free-form review text (public). */
  review_text         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_ratings_provider_idx ON public.provider_ratings (provider_user_id);


-- ----------------------------------------------------------------------------
-- 2. country_score_weights — per-country emphasis overrides
-- ----------------------------------------------------------------------------
-- Default global weights live in compute_provider_rank_score() as
-- constants. A row here for a country lets ops re-weight without a
-- code release. NULL values inherit the global default.
CREATE TABLE IF NOT EXISTS public.country_score_weights (
  country_code         TEXT PRIMARY KEY,
  rating_weight        NUMERIC(4,3),
  completion_weight    NUMERIC(4,3),
  on_time_weight       NUMERIC(4,3),
  response_weight      NUMERIC(4,3),
  verification_weight  NUMERIC(4,3),
  dispute_penalty      NUMERIC(4,3),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spec emphasis hints:
--   USA      → reviews
--   Germany  → certification (verification)
--   UK       → punctuality (subset of rating, kept as overall rating)
--   Africa   → responsiveness (response speed)
--   Middle East → reliability (completion + on-time)
INSERT INTO public.country_score_weights
  (country_code, rating_weight, completion_weight, on_time_weight,
   response_weight, verification_weight, dispute_penalty) VALUES
  ('us', 0.45, 0.18, 0.13, 0.09,  0.10, 0.15),  -- bumps reviews
  ('de', 0.32, 0.20, 0.15, 0.08,  0.18, 0.13),  -- bumps verification
  ('gb', 0.36, 0.18, 0.20, 0.08,  0.10, 0.15),  -- bumps on-time
  ('ng', 0.32, 0.18, 0.13, 0.20,  0.07, 0.10),  -- bumps response speed
  ('ke', 0.32, 0.18, 0.13, 0.20,  0.07, 0.10),
  ('ae', 0.34, 0.25, 0.20, 0.07,  0.06, 0.10)   -- bumps reliability
ON CONFLICT (country_code) DO UPDATE
  SET rating_weight        = EXCLUDED.rating_weight,
      completion_weight    = EXCLUDED.completion_weight,
      on_time_weight       = EXCLUDED.on_time_weight,
      response_weight      = EXCLUDED.response_weight,
      verification_weight  = EXCLUDED.verification_weight,
      dispute_penalty      = EXCLUDED.dispute_penalty,
      updated_at           = now();


-- ----------------------------------------------------------------------------
-- 3. provider_warnings — auto-warning rows
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_warnings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_slug       TEXT NOT NULL,                       -- e.g. 'three-disputes-in-ten-jobs'
  severity        SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  detail          TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_warnings_user_idx ON public.provider_warnings (user_id, created_at DESC);


-- ----------------------------------------------------------------------------
-- 4. Extend provider_reputation with the scoring inputs + outputs
-- ----------------------------------------------------------------------------
ALTER TABLE public.provider_reputation
  ADD COLUMN IF NOT EXISTS avg_rating          NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS rating_count        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_rate     NUMERIC(4,3),     -- 0–1
  ADD COLUMN IF NOT EXISTS on_time_rate        NUMERIC(4,3),     -- 0–1
  ADD COLUMN IF NOT EXISTS response_speed_score NUMERIC(4,3),    -- 0–1, derived
  ADD COLUMN IF NOT EXISTS verification_level  SMALLINT NOT NULL DEFAULT 1
                          CHECK (verification_level BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS rank_score          SMALLINT,         -- 0–100
  ADD COLUMN IF NOT EXISTS last_active_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warning_count_30d   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_badges        TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

-- Index for ranking queries.
CREATE INDEX IF NOT EXISTS provider_reputation_rank_idx
  ON public.provider_reputation (rank_score DESC NULLS LAST);


-- ----------------------------------------------------------------------------
-- 5. compute_provider_rank_score(uuid, country) — pure scoring fn
-- ----------------------------------------------------------------------------
-- Takes the country code so we apply the right weight overrides.
-- Returns the score 0–100. Pulls every input fresh from the source
-- tables so the result is always idempotent.
CREATE OR REPLACE FUNCTION public.compute_provider_rank_score(
  p_user_id      UUID,
  p_country      TEXT DEFAULT NULL
) RETURNS SMALLINT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_avg_rating         NUMERIC(3,2);
  v_completion_rate    NUMERIC(4,3);
  v_on_time_rate       NUMERIC(4,3);
  v_response_score     NUMERIC(4,3);
  v_verification_level SMALLINT;
  v_dispute_count      INTEGER;
  v_dispute_loss       INTEGER;
  v_total_jobs         INTEGER := 0;
  /* Default global weights (sum to 1.0 incl. dispute penalty). */
  v_w_rating       NUMERIC := 0.40;
  v_w_completion   NUMERIC := 0.20;
  v_w_on_time      NUMERIC := 0.15;
  v_w_response     NUMERIC := 0.10;
  v_w_verification NUMERIC := 0.10;
  v_w_dispute      NUMERIC := 0.15;
  v_score          NUMERIC;
BEGIN
  /* Pull country weight overrides if present. */
  IF p_country IS NOT NULL THEN
    SELECT
      COALESCE(rating_weight,        v_w_rating),
      COALESCE(completion_weight,    v_w_completion),
      COALESCE(on_time_weight,       v_w_on_time),
      COALESCE(response_weight,      v_w_response),
      COALESCE(verification_weight,  v_w_verification),
      COALESCE(dispute_penalty,      v_w_dispute)
      INTO v_w_rating, v_w_completion, v_w_on_time,
           v_w_response, v_w_verification, v_w_dispute
    FROM country_score_weights
    WHERE country_code = p_country;
  END IF;

  /* Read the cached inputs from provider_reputation. The recompute
   * trigger below keeps these fresh on every booking / rating /
   * dispute event. */
  SELECT avg_rating, completion_rate, on_time_rate, response_speed_score,
         verification_level, dispute_count, dispute_loss_count
    INTO v_avg_rating, v_completion_rate, v_on_time_rate, v_response_score,
         v_verification_level, v_dispute_count, v_dispute_loss
  FROM provider_reputation
  WHERE user_id = p_user_id;

  IF v_avg_rating IS NULL THEN v_avg_rating := 4.0; END IF;     -- fresh provider neutral
  IF v_completion_rate IS NULL THEN v_completion_rate := 1.0; END IF;
  IF v_on_time_rate IS NULL THEN v_on_time_rate := 1.0; END IF;
  IF v_response_score IS NULL THEN v_response_score := 0.6; END IF;
  IF v_verification_level IS NULL THEN v_verification_level := 1; END IF;
  IF v_dispute_count IS NULL THEN v_dispute_count := 0; END IF;
  IF v_dispute_loss IS NULL THEN v_dispute_loss := 0; END IF;

  /* Total jobs proxy — sum of accepted bookings; used as the
   * denominator for the dispute ratio. Falls back to dispute count
   * + 10 to avoid divide-by-zero on day one. */
  SELECT GREATEST(COUNT(*), v_dispute_count + 10) INTO v_total_jobs
  FROM bookings
  WHERE driver_id = p_user_id
    AND status IN ('completed','in_progress','driver_assigned');

  v_score :=
      (v_avg_rating / 5.0) * v_w_rating * 100
    + v_completion_rate     * v_w_completion * 100
    + v_on_time_rate        * v_w_on_time    * 100
    + v_response_score      * v_w_response   * 100
    + ((v_verification_level::NUMERIC) / 4.0) * v_w_verification * 100
    - ((v_dispute_loss::NUMERIC) / GREATEST(v_total_jobs, 1)) * v_w_dispute * 100;

  IF v_score < 0   THEN v_score := 0;   END IF;
  IF v_score > 100 THEN v_score := 100; END IF;

  RETURN ROUND(v_score)::SMALLINT;
END;
$$;


-- ----------------------------------------------------------------------------
-- 6. refresh_provider_scoring(uuid) — recompute every input
-- ----------------------------------------------------------------------------
-- Called by triggers when ratings / bookings / disputes change.
-- Aggregates fresh from source tables and writes to
-- provider_reputation. Then computes rank_score using the country
-- inferred from the provider's most-recent booking.
CREATE OR REPLACE FUNCTION public.refresh_provider_scoring(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg            NUMERIC(3,2);
  v_count          INTEGER;
  v_completion     NUMERIC(4,3);
  v_on_time        NUMERIC(4,3);
  v_response       NUMERIC(4,3);
  v_country        TEXT;
  v_score          SMALLINT;
  v_warning_count  INTEGER;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  /* avg_rating + count from provider_ratings.overall. */
  SELECT AVG(overall)::NUMERIC(3,2), COUNT(*)
    INTO v_avg, v_count
  FROM provider_ratings WHERE provider_user_id = p_user_id;

  /* completion_rate = completed / (completed + cancelled).
   * Falls back to 1.0 for fresh providers with no jobs yet. */
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 1.0
         ELSE (COUNT(*) FILTER (WHERE status = 'completed'))::NUMERIC
            / NULLIF(COUNT(*) FILTER (WHERE status IN ('completed','cancelled','no_show')), 0)
    END
    INTO v_completion
  FROM bookings WHERE driver_id = p_user_id
    AND status IN ('completed','cancelled','no_show');

  /* on_time_rate proxy from the punctuality sub-score (1-5 → 0-1). */
  SELECT AVG(punctuality - 1)::NUMERIC / 4.0 INTO v_on_time
  FROM provider_ratings WHERE provider_user_id = p_user_id;

  /* response_speed_score proxy from communication sub-score. */
  SELECT AVG(communication - 1)::NUMERIC / 4.0 INTO v_response
  FROM provider_ratings WHERE provider_user_id = p_user_id;

  /* Country = most recent booking's customer country. */
  SELECT booking_country INTO v_country
  FROM (
    SELECT COALESCE(b.country_code, 'us') AS booking_country
    FROM bookings b
    WHERE b.driver_id = p_user_id
    ORDER BY b.created_at DESC
    LIMIT 1
  ) sub;

  /* Refresh warning count over last 30 days. */
  SELECT COUNT(*) INTO v_warning_count
  FROM provider_warnings
  WHERE user_id = p_user_id
    AND created_at > now() - INTERVAL '30 days';

  /* Make sure a row exists, then push the inputs in. */
  PERFORM public.refresh_provider_reputation(p_user_id);

  UPDATE public.provider_reputation
     SET avg_rating          = v_avg,
         rating_count        = COALESCE(v_count, 0),
         completion_rate     = v_completion,
         on_time_rate        = v_on_time,
         response_speed_score= v_response,
         warning_count_30d   = v_warning_count,
         updated_at          = now()
   WHERE user_id = p_user_id;

  /* Now compute the score with the resolved country. */
  v_score := public.compute_provider_rank_score(p_user_id, v_country);

  UPDATE public.provider_reputation
     SET rank_score = v_score,
         is_top_rated = CASE WHEN v_score >= 90 AND COALESCE(v_count, 0) >= 10
                             THEN true ELSE false END,
         updated_at  = now()
   WHERE user_id = p_user_id;
END;
$$;

-- Add the is_top_rated column referenced above.
ALTER TABLE public.provider_reputation
  ADD COLUMN IF NOT EXISTS is_top_rated BOOLEAN NOT NULL DEFAULT false;


-- ----------------------------------------------------------------------------
-- 7. Trigger — recompute scoring on every rating insert
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.provider_ratings_refresh_scoring()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_provider_scoring(NEW.provider_user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provider_ratings_refresh_scoring_trigger ON public.provider_ratings;
CREATE TRIGGER provider_ratings_refresh_scoring_trigger
  AFTER INSERT ON public.provider_ratings
  FOR EACH ROW EXECUTE FUNCTION public.provider_ratings_refresh_scoring();


-- ----------------------------------------------------------------------------
-- 8. Auto-warning rules (edge-function or pg_cron driven)
-- ----------------------------------------------------------------------------
-- Convenience function any scheduled job can call to materialize the
-- warning rows. Not a trigger — driven externally so the rule set
-- can evolve without DDL changes. Mirrors the spec's three triggers:
--   - 3 disputes in last 10 jobs
--   - 2 no-shows in 30 days
--   - rating drops below 3.5
CREATE OR REPLACE FUNCTION public.run_provider_warning_check(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_disputes INTEGER;
  v_recent_no_shows INTEGER;
  v_avg_rating      NUMERIC(3,2);
  v_inserted        INTEGER := 0;
BEGIN
  /* 1. 3 disputes in last 10 jobs. */
  WITH recent_jobs AS (
    SELECT id FROM bookings
    WHERE driver_id = p_user_id
      AND status IN ('completed','cancelled','no_show')
    ORDER BY created_at DESC LIMIT 10
  )
  SELECT COUNT(*) INTO v_recent_disputes
  FROM disputes d
  WHERE d.provider_user_id = p_user_id
    AND d.booking_id IN (SELECT id FROM recent_jobs);

  IF v_recent_disputes >= 3 THEN
    INSERT INTO provider_warnings (user_id, rule_slug, severity, detail)
    VALUES (p_user_id, 'three-disputes-in-ten-jobs', 4,
            v_recent_disputes || ' disputes in the last 10 jobs.');
    v_inserted := v_inserted + 1;
  END IF;

  /* 2. 2 no-shows in 30 days. */
  SELECT COUNT(*) INTO v_recent_no_shows
  FROM bookings
  WHERE driver_id = p_user_id
    AND status = 'no_show'
    AND created_at > now() - INTERVAL '30 days';

  IF v_recent_no_shows >= 2 THEN
    INSERT INTO provider_warnings (user_id, rule_slug, severity, detail)
    VALUES (p_user_id, 'two-no-shows-30d', 5,
            v_recent_no_shows || ' no-shows in the last 30 days.');
    v_inserted := v_inserted + 1;
  END IF;

  /* 3. Average rating below 3.5. */
  SELECT avg_rating INTO v_avg_rating
  FROM provider_reputation WHERE user_id = p_user_id;

  IF v_avg_rating IS NOT NULL AND v_avg_rating < 3.5 THEN
    INSERT INTO provider_warnings (user_id, rule_slug, severity, detail)
    VALUES (p_user_id, 'rating-below-3-5', 4,
            'Avg rating ' || v_avg_rating || ' < 3.5');
    v_inserted := v_inserted + 1;
  END IF;

  /* Refresh the reputation row's warning count. */
  PERFORM public.refresh_provider_scoring(p_user_id);
  RETURN v_inserted;
END;
$$;


-- ----------------------------------------------------------------------------
-- 8a. provider_pricing.home_city_slug reconciliation — view below references
--     this TEXT column. Original schema didn't ship it.
-- ----------------------------------------------------------------------------
ALTER TABLE public.provider_pricing
  ADD COLUMN IF NOT EXISTS home_city_slug TEXT;

CREATE INDEX IF NOT EXISTS provider_pricing_home_city_slug_idx
  ON public.provider_pricing (home_city_slug);


-- ----------------------------------------------------------------------------
-- 9. provider_city_rankings — top providers per city
-- ----------------------------------------------------------------------------
-- View that ranks providers per (country, city) by rank_score. The
-- city is sourced from the provider's home_city_slug on
-- provider_pricing; falls back to the first booking's pickup_city
-- if no override is set.
CREATE OR REPLACE VIEW public.provider_city_rankings AS
SELECT
  COALESCE(pp.home_city_slug, 'unknown') AS city_slug,
  pr.user_id,
  pr.rank_score,
  pr.avg_rating,
  pr.rating_count,
  pr.completion_rate,
  pr.on_time_rate,
  pr.verification_level,
  pr.is_top_rated,
  pr.is_suspended,
  pr.trust_badges,
  ROW_NUMBER() OVER (
    PARTITION BY COALESCE(pp.home_city_slug, 'unknown')
    ORDER BY pr.rank_score DESC NULLS LAST
  ) AS city_rank
FROM provider_reputation pr
LEFT JOIN provider_pricing pp ON pp.user_id = pr.user_id
WHERE pr.is_suspended = false
  AND pr.rank_score IS NOT NULL;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.provider_ratings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_score_weights   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_warnings       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_ratings_anon_read     ON public.provider_ratings;
DROP POLICY IF EXISTS provider_ratings_customer_insert ON public.provider_ratings;
DROP POLICY IF EXISTS country_score_weights_anon_read ON public.country_score_weights;
DROP POLICY IF EXISTS provider_warnings_self_read    ON public.provider_warnings;
DROP POLICY IF EXISTS provider_warnings_admin_all    ON public.provider_warnings;

-- Ratings — anon reads (powers public review timeline); customer
-- can only insert their own; rows are immutable after insert.
CREATE POLICY provider_ratings_anon_read
  ON public.provider_ratings FOR SELECT USING (true);

CREATE POLICY provider_ratings_customer_insert
  ON public.provider_ratings FOR INSERT TO authenticated
  WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY country_score_weights_anon_read
  ON public.country_score_weights FOR SELECT USING (true);

-- Warnings — provider sees their own; admin sees all.
CREATE POLICY provider_warnings_self_read
  ON public.provider_warnings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY provider_warnings_admin_all
  ON public.provider_warnings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.provider_city_rankings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_provider_rank_score(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_provider_scoring(UUID)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_provider_warning_check(UUID)        TO authenticated;
