-- ============================================================================
-- FlyttGo — Dispute completion (escrow hold + reputation + admin RPCs)
-- ============================================================================
-- Closes the three honest gaps from PR #51:
--
--   1. Escrow hold trigger     — flips bookings.payment_status to
--                                  'on_hold' when a dispute fires;
--                                  back to 'escrow' or 'refunded' on
--                                  resolution.
--   2. provider_reputation     — per-provider rolling score updated
--                                  automatically when dispute_resolutions
--                                  rows insert.
--   3. Admin override RPCs     — security-definer functions admins
--                                  call to release_payout / refund /
--                                  request_evidence / escalate /
--                                  suspend / flag — bound by an
--                                  is_admin() helper.
--
-- Run AFTER:
--   - docs/install-pricing-engine.sql
--   - docs/install-country-profiles.sql
--   - docs/install-disputes.sql
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. is_admin() helper — central admin check
-- ----------------------------------------------------------------------------
-- Reads from public.profiles.role. Mirrors the existing pattern from
-- docs/admin-rls-policies.sql.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$;


-- ----------------------------------------------------------------------------
-- 1. Escrow hold trigger
-- ----------------------------------------------------------------------------
-- Filing a dispute on a booking flips its payment_status to 'on_hold'.
-- Resolving the dispute flips it back to 'escrow' (so the existing
-- payout-release machinery can release on the configured schedule)
-- OR to 'refunded' when the resolution is full_refund.

CREATE OR REPLACE FUNCTION public.dispute_apply_escrow_hold()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  /* Only flip on insert with status='open' or transition into
   * 'open'/'under_review' from a non-hold state. */
  IF TG_OP = 'INSERT' THEN
    UPDATE public.bookings
       SET payment_status = 'on_hold'
     WHERE id = NEW.booking_id
       AND payment_status NOT IN ('refunded','on_hold');
  ELSIF TG_OP = 'UPDATE' THEN
    /* Resolution paths flip the booking back. */
    IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
      IF NEW.final_path = 'full_refund' THEN
        UPDATE public.bookings
           SET payment_status = 'refunded'
         WHERE id = NEW.booking_id;
      ELSE
        UPDATE public.bookings
           SET payment_status = 'escrow'
         WHERE id = NEW.booking_id;
      END IF;
    ELSIF NEW.status = 'closed_no_action' AND OLD.status <> 'closed_no_action' THEN
      UPDATE public.bookings
         SET payment_status = 'escrow'
       WHERE id = NEW.booking_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispute_escrow_hold_trigger ON public.disputes;
CREATE TRIGGER dispute_escrow_hold_trigger
  AFTER INSERT OR UPDATE OF status, final_path ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.dispute_apply_escrow_hold();


-- ----------------------------------------------------------------------------
-- 2. provider_reputation — rolling per-provider scorecard
-- ----------------------------------------------------------------------------
-- Updated automatically by a trigger on dispute_resolutions inserts.
-- Scoring weights:
--   - dispute_count              : every dispute filed against the provider
--   - dispute_loss_count         : disputes resolved against the provider
--                                   (any path other than mediation /
--                                   close_no_action / request_evidence)
--   - service_credits_total      : sum of service_credit amounts issued
--   - refunds_total              : sum of refunds (partial + full)
--   - reliability_score (0-100)  : 100 baseline, − points per loss

CREATE TABLE IF NOT EXISTS public.provider_reputation (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dispute_count        INTEGER NOT NULL DEFAULT 0,
  dispute_loss_count   INTEGER NOT NULL DEFAULT 0,
  service_credits_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  refunds_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  reliability_score    SMALLINT NOT NULL DEFAULT 100
                       CHECK (reliability_score BETWEEN 0 AND 100),
  /* Soft suspension flag — blocks dispatch + new bookings while
   * true. Admins flip it via the suspend_provider RPC below. */
  is_suspended         BOOLEAN NOT NULL DEFAULT false,
  flagged_at           TIMESTAMPTZ,
  flagged_reason       TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_reputation_score_idx
  ON public.provider_reputation (reliability_score);


-- Reputation update trigger — runs after every dispute_resolutions insert.
-- Aggregates fresh from disputes + dispute_resolutions so partial
-- updates can't drift the score (idempotent recompute on every insert).
CREATE OR REPLACE FUNCTION public.refresh_provider_reputation(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count       INTEGER := 0;
  v_loss        INTEGER := 0;
  v_credits     NUMERIC(12,2) := 0;
  v_refunds     NUMERIC(12,2) := 0;
  v_score       SMALLINT;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.disputes
  WHERE provider_user_id = p_user_id;

  SELECT COUNT(*) INTO v_loss
  FROM public.disputes d
  WHERE d.provider_user_id = p_user_id
    AND d.status = 'resolved'
    AND d.final_path IN ('partial_refund','service_credit','full_refund','insurance_claim');

  SELECT
    COALESCE(SUM(CASE WHEN dr.path = 'service_credit'                                  THEN dr.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN dr.path IN ('partial_refund','full_refund','insurance_claim') THEN dr.amount ELSE 0 END), 0)
    INTO v_credits, v_refunds
  FROM public.dispute_resolutions dr
  JOIN public.disputes d ON d.id = dr.dispute_id
  WHERE d.provider_user_id = p_user_id;

  /* Score: 100 − 5×loss, floored at 0. Crude but legible — replace
   * with a properly tuned weighting once we have the dispute volume
   * to calibrate against. */
  v_score := GREATEST(0, 100 - (v_loss * 5));

  INSERT INTO public.provider_reputation
    (user_id, dispute_count, dispute_loss_count, service_credits_total,
     refunds_total, reliability_score, updated_at)
  VALUES
    (p_user_id, v_count, v_loss, v_credits, v_refunds, v_score, now())
  ON CONFLICT (user_id) DO UPDATE
    SET dispute_count        = EXCLUDED.dispute_count,
        dispute_loss_count   = EXCLUDED.dispute_loss_count,
        service_credits_total = EXCLUDED.service_credits_total,
        refunds_total        = EXCLUDED.refunds_total,
        reliability_score    = EXCLUDED.reliability_score,
        updated_at           = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.dispute_resolutions_refresh_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider UUID;
BEGIN
  SELECT provider_user_id INTO v_provider
  FROM public.disputes WHERE id = NEW.dispute_id;
  PERFORM public.refresh_provider_reputation(v_provider);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dispute_resolutions_refresh_reputation_trigger
  ON public.dispute_resolutions;
CREATE TRIGGER dispute_resolutions_refresh_reputation_trigger
  AFTER INSERT ON public.dispute_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.dispute_resolutions_refresh_reputation();


-- ----------------------------------------------------------------------------
-- 3. Admin override RPCs
-- ----------------------------------------------------------------------------

-- Resolve a dispute with a final path + amount. Writes the
-- dispute_resolutions audit row (which fires the reputation trigger)
-- and stamps the parent dispute. The escrow-hold trigger above
-- handles the booking.payment_status transition.
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_dispute_id UUID,
  p_path       TEXT,
  p_amount     NUMERIC,
  p_pct        NUMERIC,
  p_rationale  TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_path NOT IN ('partial_refund','service_credit','insurance_claim','full_refund','mediation') THEN
    RAISE EXCEPTION 'invalid_path';
  END IF;

  INSERT INTO public.dispute_resolutions
    (dispute_id, actor_role, actor_user_id, path, pct, amount, rationale)
  VALUES
    (p_dispute_id, 'admin', auth.uid(), p_path, p_pct, p_amount, p_rationale);

  UPDATE public.disputes
     SET status        = 'resolved',
         final_path    = p_path,
         final_pct     = p_pct,
         final_amount  = p_amount,
         resolved_at   = now()
   WHERE id = p_dispute_id;
END;
$$;

-- Release the escrowed payout for a dispute's booking. Used when
-- admin reviews the case and decides no refund is warranted.
-- Equivalent to admin_resolve_dispute(close_no_action), but kept as
-- a separate verb because the surface area on the dashboard reads
-- more clearly with named buttons.
CREATE OR REPLACE FUNCTION public.admin_release_payout(p_dispute_id UUID, p_rationale TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.dispute_resolutions
    (dispute_id, actor_role, actor_user_id, path, rationale)
  VALUES
    (p_dispute_id, 'admin', auth.uid(), 'close_no_action', p_rationale);

  UPDATE public.disputes
     SET status      = 'closed_no_action',
         resolved_at = now()
   WHERE id = p_dispute_id;
END;
$$;

-- Request more evidence — keeps the case open + extends review SLA.
CREATE OR REPLACE FUNCTION public.admin_request_evidence(p_dispute_id UUID, p_rationale TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.dispute_resolutions
    (dispute_id, actor_role, actor_user_id, path, rationale)
  VALUES
    (p_dispute_id, 'admin', auth.uid(), 'request_evidence', p_rationale);

  UPDATE public.disputes
     SET status        = 'under_review',
         review_due_at = now() + INTERVAL '7 days'
   WHERE id = p_dispute_id;
END;
$$;

-- Escalate to senior review — flips status to 'escalated' so the
-- queue surfaces it under a separate column.
CREATE OR REPLACE FUNCTION public.admin_escalate_dispute(p_dispute_id UUID, p_rationale TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.dispute_resolutions
    (dispute_id, actor_role, actor_user_id, path, rationale)
  VALUES
    (p_dispute_id, 'admin', auth.uid(), 'mediation', p_rationale);

  UPDATE public.disputes
     SET status = 'escalated'
   WHERE id = p_dispute_id;
END;
$$;

-- Suspend / unsuspend / flag a provider. Updates provider_reputation
-- directly so the suspension state is colocated with the score.
CREATE OR REPLACE FUNCTION public.admin_set_provider_suspension(
  p_user_id    UUID,
  p_suspended  BOOLEAN,
  p_reason     TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  /* Make sure a row exists. */
  PERFORM public.refresh_provider_reputation(p_user_id);

  UPDATE public.provider_reputation
     SET is_suspended  = p_suspended,
         flagged_at    = CASE WHEN p_suspended THEN now() ELSE NULL END,
         flagged_reason= CASE WHEN p_suspended THEN p_reason ELSE NULL END,
         updated_at    = now()
   WHERE user_id = p_user_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- RLS — provider_reputation is anon-readable (so the marketplace
-- can show reliability badges) but only admins can write.
-- ----------------------------------------------------------------------------

ALTER TABLE public.provider_reputation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_reputation_anon_read ON public.provider_reputation;
DROP POLICY IF EXISTS provider_reputation_admin_all ON public.provider_reputation;

CREATE POLICY provider_reputation_anon_read
  ON public.provider_reputation FOR SELECT USING (true);

CREATE POLICY provider_reputation_admin_all
  ON public.provider_reputation FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only RLS additions on disputes — read every row + update.
DROP POLICY IF EXISTS disputes_admin_all          ON public.disputes;
DROP POLICY IF EXISTS dispute_evidence_admin_all  ON public.dispute_evidence;
DROP POLICY IF EXISTS dispute_resolutions_admin_all ON public.dispute_resolutions;

CREATE POLICY disputes_admin_all
  ON public.disputes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY dispute_evidence_admin_all
  ON public.dispute_evidence FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY dispute_resolutions_admin_all
  ON public.dispute_resolutions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT EXECUTE ON FUNCTION public.is_admin()                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_release_payout(UUID, TEXT)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_request_evidence(UUID, TEXT)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_escalate_dispute(UUID, TEXT)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_provider_suspension(UUID, BOOLEAN, TEXT) TO authenticated;
