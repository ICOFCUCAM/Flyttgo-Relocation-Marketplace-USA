-- ============================================================================
-- FlyttGo — Provider scoring completion (booking triggers + activity decay)
-- ============================================================================
-- Closes the three honest gaps from PR #53:
--
--   1. Booking-status triggers — refresh_provider_scoring fires when
--                                 bookings flip to completed / cancelled /
--                                 no_show, so the score reflects the real
--                                 outcome without waiting for the next
--                                 rating insert.
--   2. last_active_at tracker  — bumps on every provider-side event
--                                 (booking accepted, status moved,
--                                 location ping, rating received).
--   3. Activity decay          — recent_activity_score added to
--                                 provider_reputation, weighted at 5%
--                                 in the score formula. Decays linearly
--                                 from 1.0 (active in last 24h) to 0
--                                 (inactive 60+ days).
--
-- Run AFTER docs/install-provider-scoring.sql.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Activity tracker column (already exists from PR #53 as
--    last_active_at; we add the derived recent_activity_score here).
-- ----------------------------------------------------------------------------
ALTER TABLE public.provider_reputation
  ADD COLUMN IF NOT EXISTS recent_activity_score NUMERIC(4,3) DEFAULT 1.0
    CHECK (recent_activity_score BETWEEN 0 AND 1);


-- ----------------------------------------------------------------------------
-- 2. Activity decay — linear from 1.0 (≤24h) → 0 (≥60 days)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_recent_activity_score(p_last_active TIMESTAMPTZ)
RETURNS NUMERIC(4,3)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_hours NUMERIC;
BEGIN
  IF p_last_active IS NULL THEN RETURN 0.5; END IF;     -- neutral for never-active
  v_hours := EXTRACT(EPOCH FROM (now() - p_last_active)) / 3600.0;
  IF v_hours <= 24       THEN RETURN 1.0;   END IF;     -- active in last day
  IF v_hours >= 24 * 60  THEN RETURN 0.0;   END IF;     -- inactive 60+ days
  /* Linear decay between the two anchors. */
  RETURN GREATEST(0, 1.0 - (v_hours - 24) / (24.0 * 59))::NUMERIC(4,3);
END;
$$;


-- ----------------------------------------------------------------------------
-- 3. Stamp last_active_at + recent_activity_score
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_provider_activity(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  /* Make sure a row exists. */
  PERFORM public.refresh_provider_reputation(p_user_id);
  UPDATE public.provider_reputation
     SET last_active_at        = now(),
         recent_activity_score = 1.0,
         updated_at            = now()
   WHERE user_id = p_user_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- 4. Booking-status trigger — refresh scoring on terminal status flips
-- ----------------------------------------------------------------------------
-- Fires when a booking transitions into completed / cancelled /
-- no_show. Calls refresh_provider_scoring on the assigned driver,
-- and stamps last_active_at on completion.
CREATE OR REPLACE FUNCTION public.bookings_refresh_provider_scoring()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver UUID;
BEGIN
  v_driver := NEW.driver_id;
  IF v_driver IS NULL THEN RETURN NEW; END IF;

  /* Stamp activity on every status transition that involves the
   * provider — not just terminal states. */
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
    PERFORM public.touch_provider_activity(v_driver);
  END IF;

  /* Refresh scoring on terminal states. */
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('completed','cancelled','no_show') THEN
    PERFORM public.refresh_provider_scoring(v_driver);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_refresh_provider_scoring_trigger ON public.bookings;
CREATE TRIGGER bookings_refresh_provider_scoring_trigger
  AFTER INSERT OR UPDATE OF status, driver_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_refresh_provider_scoring();


-- ----------------------------------------------------------------------------
-- 5. Driver-location-ping trigger — stamps activity on location updates
-- ----------------------------------------------------------------------------
-- driver_locations is updated every ~10 seconds while a driver is
-- in_transit (see DriverPortal location beacon hook). Cheap way to
-- keep last_active_at fresh without polling.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'driver_locations'
  ) THEN
    EXECUTE $T$
      CREATE OR REPLACE FUNCTION public.driver_locations_touch_activity()
      RETURNS TRIGGER
      LANGUAGE plpgsql SECURITY DEFINER
      SET search_path = public
      AS $F$
      BEGIN
        PERFORM public.touch_provider_activity(NEW.driver_id);
        RETURN NEW;
      END;
      $F$;

      DROP TRIGGER IF EXISTS driver_locations_touch_activity_trigger
        ON public.driver_locations;
      CREATE TRIGGER driver_locations_touch_activity_trigger
        AFTER INSERT OR UPDATE ON public.driver_locations
        FOR EACH ROW EXECUTE FUNCTION public.driver_locations_touch_activity();
    $T$;
  END IF;
END$$;


-- ----------------------------------------------------------------------------
-- 6. Inactivity sweep — flags providers with no activity in N days
-- ----------------------------------------------------------------------------
-- Returns the count of providers whose recent_activity_score
-- changed. Designed to be invoked by pg_cron (or a Supabase scheduled
-- edge function) once an hour:
--
--   SELECT public.run_provider_inactivity_sweep();
CREATE OR REPLACE FUNCTION public.run_provider_inactivity_sweep()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed INTEGER := 0;
BEGIN
  WITH updated AS (
    UPDATE public.provider_reputation
       SET recent_activity_score = public.compute_recent_activity_score(last_active_at),
           updated_at            = now()
     WHERE recent_activity_score IS DISTINCT FROM
           public.compute_recent_activity_score(last_active_at)
    RETURNING user_id
  )
  SELECT COUNT(*) INTO v_changed FROM updated;

  /* Recompute rank_score for every provider whose activity decayed.
   * SECURITY DEFINER lets us call refresh from the same function. */
  PERFORM public.refresh_provider_scoring(user_id)
  FROM public.provider_reputation
  WHERE last_active_at < now() - INTERVAL '24 hours';

  RETURN v_changed;
END;
$$;


-- ----------------------------------------------------------------------------
-- 7. Updated scoring formula — incorporate activity decay
-- ----------------------------------------------------------------------------
-- The original formula in install-provider-scoring.sql sums to 1.0
-- with the listed weights. We add activity at 5% AND scale the
-- existing dispute penalty + verification down by 2.5% each so the
-- total stays normalized.
--
-- New default weights:
--   rating         : 0.40
--   completion     : 0.20
--   on_time        : 0.15
--   response       : 0.10
--   verification   : 0.075   (was 0.10 — −2.5%)
--   activity       : 0.05    (NEW)
--   dispute penalty: 0.125   (was 0.15 — −2.5%)
--
-- Country overrides in country_score_weights still apply via the
-- existing columns; activity uses the global default until / unless
-- a country-specific override column is added.

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
  v_activity           NUMERIC(4,3);
  v_total_jobs         INTEGER := 0;
  /* Updated default global weights (sum to 1.0). */
  v_w_rating       NUMERIC := 0.40;
  v_w_completion   NUMERIC := 0.20;
  v_w_on_time      NUMERIC := 0.15;
  v_w_response     NUMERIC := 0.10;
  v_w_verification NUMERIC := 0.075;
  v_w_activity     NUMERIC := 0.05;
  v_w_dispute      NUMERIC := 0.125;
  v_score          NUMERIC;
BEGIN
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

  SELECT avg_rating, completion_rate, on_time_rate, response_speed_score,
         verification_level, dispute_count, dispute_loss_count, recent_activity_score
    INTO v_avg_rating, v_completion_rate, v_on_time_rate, v_response_score,
         v_verification_level, v_dispute_count, v_dispute_loss, v_activity
  FROM provider_reputation
  WHERE user_id = p_user_id;

  IF v_avg_rating IS NULL THEN v_avg_rating := 4.0; END IF;
  IF v_completion_rate IS NULL THEN v_completion_rate := 1.0; END IF;
  IF v_on_time_rate IS NULL THEN v_on_time_rate := 1.0; END IF;
  IF v_response_score IS NULL THEN v_response_score := 0.6; END IF;
  IF v_verification_level IS NULL THEN v_verification_level := 1; END IF;
  IF v_dispute_count IS NULL THEN v_dispute_count := 0; END IF;
  IF v_dispute_loss IS NULL THEN v_dispute_loss := 0; END IF;
  IF v_activity IS NULL THEN v_activity := 0.5; END IF;

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
    + v_activity            * v_w_activity   * 100
    - ((v_dispute_loss::NUMERIC) / GREATEST(v_total_jobs, 1)) * v_w_dispute * 100;

  IF v_score < 0   THEN v_score := 0;   END IF;
  IF v_score > 100 THEN v_score := 100; END IF;

  RETURN ROUND(v_score)::SMALLINT;
END;
$$;


GRANT EXECUTE ON FUNCTION public.compute_recent_activity_score(TIMESTAMPTZ)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_provider_activity(UUID)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_provider_inactivity_sweep()              TO authenticated;
