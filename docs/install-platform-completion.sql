-- ============================================================================
-- FlyttGo — Platform completion (notifications · GDPR · vacation mode)
-- ============================================================================
-- Closes the high-impact gaps identified in the post-PR-#64 audit:
--
--   1. New auto-trigger wires on the existing public.notifications
--      table for the dispute / RFP / relocation-request flows. The
--      table + bell UI + booking triggers already shipped in
--      docs/notifications-migration.sql; this just extends coverage.
--   2. Provider vacation-mode column on provider_pricing, wired into
--      the matcher's exclusion filter.
--   3. GDPR export + delete-account RPCs (Article 20 + 17).
--
-- Run AFTER all earlier migrations. Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Notification triggers — extend coverage to dispute / RFP / relocation
-- ----------------------------------------------------------------------------
-- We reuse public.notifications (kind, title, body, link_page, link_id)
-- so the existing Header bell + useNotifications hook + Realtime
-- publication continue working unchanged.

-- 1a. Disputes — notify the provider on filing, both parties on resolution.
CREATE OR REPLACE FUNCTION public.notify_on_dispute_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.provider_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link_page, link_id)
      VALUES (
        NEW.provider_user_id, 'dispute',
        'Dispute filed against your booking',
        'Open the dispute to add your response or counter-evidence.',
        'driver-portal', NEW.id
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    IF NEW.customer_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link_page, link_id)
      VALUES (
        NEW.customer_user_id, 'dispute',
        'Your dispute has been resolved',
        'Check the resolution and any refund / credit details.',
        'dispute', NEW.id
      );
    END IF;
    IF NEW.provider_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, kind, title, body, link_page, link_id)
      VALUES (
        NEW.provider_user_id, 'dispute',
        'Dispute resolution applied',
        'Reputation + payout reflect the outcome.',
        'driver-portal', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_dispute_change ON public.disputes;
CREATE TRIGGER trg_notify_on_dispute_change
  AFTER INSERT OR UPDATE OF status ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_dispute_change();


-- 1b. RFP submissions — confirm receipt to the submitter.
CREATE OR REPLACE FUNCTION public.notify_on_rfp_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.submitted_by_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link_page, link_id)
    VALUES (
      NEW.submitted_by_user_id, 'system',
      'Procurement inquiry received',
      'We respond within 2 business days.',
      'home', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_rfp_submitted ON public.rfp_submissions;
CREATE TRIGGER trg_notify_on_rfp_submitted
  AFTER INSERT ON public.rfp_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_rfp_submitted();


-- 1c. Relocation requests — status flips notify the requester.
CREATE OR REPLACE FUNCTION public.notify_on_relocation_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link_page, link_id)
    VALUES (
      NEW.requested_by_user_id, 'booking_status',
      'Your relocation request was approved',
      'Auto-dispatching to the best-matched provider.',
      'corporate-dashboard', NEW.id
    );
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link_page, link_id)
    VALUES (
      NEW.requested_by_user_id, 'booking_status',
      'Your relocation request was rejected',
      'Open the request to see the rationale.',
      'corporate-dashboard', NEW.id
    );
  ELSIF NEW.status = 'dispatched' AND OLD.status IS DISTINCT FROM 'dispatched' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link_page, link_id)
    VALUES (
      NEW.requested_by_user_id, 'driver_assigned',
      'Provider dispatched',
      'A booking has been opened for your request.',
      'corporate-dashboard', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_relocation_status ON public.relocation_requests;
CREATE TRIGGER trg_notify_on_relocation_status
  AFTER UPDATE OF status ON public.relocation_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_relocation_status();


-- 1d. Customer rating request — fired when a booking flips to
--     'completed' so the customer gets nudged to rate the provider.
--     The existing booking-completed trigger already notifies the
--     customer to confirm; this is a separate, lower-priority entry
--     pointing at the rating form on /my-bookings.
CREATE OR REPLACE FUNCTION public.notify_on_rating_request()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed'
     AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link_page, link_id)
    VALUES (
      NEW.customer_id, 'system',
      'How was your move?',
      'Rate your provider — it helps the next customer choose well.',
      'my-bookings', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_rating_request ON public.bookings;
CREATE TRIGGER trg_notify_on_rating_request
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_rating_request();


-- ----------------------------------------------------------------------------
-- 2. Provider vacation mode — soft "hide me" toggle
-- ----------------------------------------------------------------------------
-- Sits alongside the existing service_radius / available_crew_sizes /
-- truck/packing flags on provider_pricing. The matcher treats
-- vacation_mode = true the same as is_suspended = true: filtered out
-- of every match. Schema first, matcher rewrite second.
ALTER TABLE public.provider_pricing
  ADD COLUMN IF NOT EXISTS vacation_mode  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vacation_until DATE;


-- 2a. Wire vacation_mode into the matcher's existing filter.
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
      END AS specialization_overlap
    FROM public.provider_reputation pr
    LEFT JOIN public.driver_subscriptions ds
           ON ds.driver_id = pr.user_id AND ds.subscription_status = 'active'
    LEFT JOIN public.subscription_tiers st ON st.slug = ds.plan
    LEFT JOIN public.provider_pricing pp   ON pp.user_id = pr.user_id
    WHERE pr.is_suspended = false
      /* Vacation-mode exclusion — same posture as suspended. */
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
  scored AS (
    SELECT c.*,
      (
          v_w_distance       * COALESCE(1.0 - LEAST(c.distance_km / 50.0, 1.0), 0.5)
        + v_w_reliability    * (COALESCE(c.rank_score, 60)::NUMERIC / 100.0)
        + v_w_tier           * (c.tier_position::NUMERIC / 50.0)
        + v_w_specialization * c.specialization_overlap
        + v_w_response       * COALESCE(c.response_speed_score, 0.5)
        + v_w_activity       * COALESCE(c.recent_activity_score, 0.5)
      ) * 100 AS match_score
    FROM candidates c
  )
  SELECT s.user_id, ROUND(s.match_score, 2),
         COALESCE(ROUND(s.distance_km, 1), 0),
         s.tier_slug, s.tier_position, s.rank_score,
         (s.tier_slug = 'elite'), s.is_top_rated,
         ARRAY_REMOVE(ARRAY[
           CASE WHEN s.tier_slug = 'elite'  THEN 'Certified Infrastructure Partner' END,
           CASE WHEN s.is_top_rated         THEN 'Top-rated provider' END,
           CASE WHEN s.specialization_overlap >= 0.5 THEN 'Strong specialization match' END,
           CASE WHEN s.response_speed_score IS NOT NULL AND s.response_speed_score >= 0.85 THEN 'Fast response history' END,
           CASE WHEN s.rank_score IS NOT NULL AND s.rank_score >= 90 THEN 'High reliability score' END,
           CASE WHEN s.distance_km IS NOT NULL AND s.distance_km <= 5 THEN 'Inside the service radius' END
         ], NULL)
  FROM scored s
  ORDER BY s.match_score DESC NULLS LAST,
           s.tier_position DESC,
           s.rank_score    DESC NULLS LAST
  LIMIT v_limit;
END;
$$;


-- ----------------------------------------------------------------------------
-- 3. GDPR — data export + account deletion RPCs
-- ----------------------------------------------------------------------------
-- Article 20 (data portability) + Article 17 (right to erasure).
-- Customer calls these from /profile; admin can call on behalf of a
-- user via the admin dashboard. Returns / actions are idempotent.

-- profiles.deleted_at backs the soft-delete posture below.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target UUID;
  v_out    JSONB;
BEGIN
  v_target := COALESCE(p_user_id, auth.uid());
  IF v_target IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF v_target <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_out := jsonb_build_object(
    'user_id', v_target,
    'exported_at', now(),
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.user_id = v_target),
    'bookings', COALESCE(
      (SELECT jsonb_agg(to_jsonb(b)) FROM public.bookings b WHERE b.customer_id = v_target),
      '[]'::jsonb
    ),
    'disputes_filed', COALESCE(
      (SELECT jsonb_agg(to_jsonb(d)) FROM public.disputes d WHERE d.customer_user_id = v_target),
      '[]'::jsonb
    ),
    'ratings_submitted', COALESCE(
      (SELECT jsonb_agg(to_jsonb(r)) FROM public.provider_ratings r WHERE r.customer_user_id = v_target),
      '[]'::jsonb
    ),
    'organization_memberships', COALESCE(
      (SELECT jsonb_agg(to_jsonb(m)) FROM public.organization_members m WHERE m.user_id = v_target),
      '[]'::jsonb
    ),
    'notifications', COALESCE(
      (SELECT jsonb_agg(to_jsonb(n)) FROM public.notifications n WHERE n.user_id = v_target),
      '[]'::jsonb
    )
  );

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target UUID;
BEGIN
  v_target := COALESCE(p_user_id, auth.uid());
  IF v_target IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF v_target <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  /* Soft-delete posture — null out PII on the profile row + revoke
   * memberships. We don't drop bookings / disputes / ratings: those
   * are needed for audit + provider scoring continuity. The profile
   * row is anonymised so no contact info remains. */
  UPDATE public.profiles
     SET first_name = NULL,
         last_name  = NULL,
         phone      = NULL,
         deleted_at = now()
   WHERE user_id = v_target;

  UPDATE public.organization_members
     SET revoked_at = now()
   WHERE user_id = v_target AND revoked_at IS NULL;

  /* Mark every notification as read so a re-activated account
   * doesn't open with a fake unread count. */
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = v_target AND read_at IS NULL;

  /* The auth.users row itself stays — admins can reactivate via the
   * admin dashboard. Hard delete is a separate ops action. */
END;
$$;


GRANT EXECUTE ON FUNCTION public.export_user_data(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
