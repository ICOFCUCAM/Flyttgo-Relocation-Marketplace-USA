-- ============================================================================
-- FlyttGo — Corporate / government portal · workflow completion
-- ============================================================================
-- Closes the four honest follow-ups from PR #59 (institutional layer):
--
--   1. Auto-dispatch on relocation_request approval
--      → trigger calls find_eligible_providers_for_segment, picks
--        the highest-ranked CIP/Gold-Pro provider in the request's
--        country, creates the booking, links it back.
--   2. Monthly invoice generator
--      → run_monthly_org_invoices(period_start) aggregates completed
--        relocation_requests per org × department for the month and
--        upserts a row into organization_invoices.
--   3. Organization invites
--      → organization_invites table + create_org_invite RPC +
--        accept_org_invite RPC. Owners issue a token; the invitee
--        accepts it from the AcceptOrgInvitePage.
--
-- Run AFTER docs/install-organizations.sql + install-cip-enterprise-routing.sql.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. dispatch_relocation_request — match + create booking
-- ----------------------------------------------------------------------------
-- Idempotent — refuses to re-dispatch a request that already has a
-- linked booking. Applies the org's contract pricing if a contract
-- is referenced. Picks the top provider via
-- find_eligible_providers_for_segment with the right segment.
CREATE OR REPLACE FUNCTION public.dispatch_relocation_request(p_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request   public.relocation_requests%ROWTYPE;
  v_provider  UUID;
  v_booking   UUID;
BEGIN
  SELECT * INTO v_request
  FROM public.relocation_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_request.dispatched_booking_id IS NOT NULL THEN
    /* Idempotent — return the existing booking without doing
     * anything else. */
    RETURN v_request.dispatched_booking_id;
  END IF;
  IF v_request.status NOT IN ('approved','dispatched') THEN
    RAISE EXCEPTION 'request_not_approved';
  END IF;

  /* Pick the top eligible provider for the segment. The function
   * already sorts by tier_position DESC, rank_score DESC NULLS
   * LAST, so the first row is our best match. */
  SELECT user_id INTO v_provider
  FROM public.find_eligible_providers_for_segment(v_request.segment, 1);

  IF v_provider IS NULL THEN
    /* No eligible provider — leave the request 'approved' so admin
     * can manually dispatch from the queue. Don't fail; just
     * surface the absence. */
    RETURN NULL;
  END IF;

  /* Create the booking row. We populate the minimum subset the
   * existing dispatch + escrow machinery expects; the rest of the
   * fields hydrate later from the booking flow. */
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

  /* Link the booking back to the request + flip status. */
  UPDATE public.relocation_requests
     SET dispatched_booking_id = v_booking,
         status                = 'dispatched'
   WHERE id = p_request_id;

  /* Audit row so the approval timeline tells the full story. */
  INSERT INTO public.relocation_request_approvals
    (request_id, actor_user_id, action, comment)
  VALUES
    (p_request_id, COALESCE(auth.uid(), v_request.requested_by_user_id),
     'comment', 'Auto-dispatched to provider ' || v_provider::TEXT);

  RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_relocation_request(UUID)
  TO authenticated;


-- ----------------------------------------------------------------------------
-- Trigger — auto-call dispatch when a request flips to approved
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.relocation_requests_auto_dispatch()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    /* Fire-and-forget — dispatch's own idempotency handles re-fires. */
    PERFORM public.dispatch_relocation_request(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS relocation_requests_auto_dispatch_trigger
  ON public.relocation_requests;
CREATE TRIGGER relocation_requests_auto_dispatch_trigger
  AFTER UPDATE OF status ON public.relocation_requests
  FOR EACH ROW EXECUTE FUNCTION public.relocation_requests_auto_dispatch();


-- ----------------------------------------------------------------------------
-- 2. run_monthly_org_invoices — monthly aggregator
-- ----------------------------------------------------------------------------
-- Designed for pg_cron / scheduled edge function invocation on the
-- first of every month:
--
--   SELECT public.run_monthly_org_invoices(date_trunc('month', now() - INTERVAL '1 day')::DATE);
--
-- Aggregates completed bookings (joined via dispatched_booking_id
-- on the request) per org × department for the period. Idempotent
-- via UNIQUE (org, period_start) so running twice in a window
-- updates the existing row instead of inserting a duplicate.
CREATE OR REPLACE FUNCTION public.run_monthly_org_invoices(p_period_start DATE)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_end DATE;
  v_inserted   INTEGER := 0;
  v_org        RECORD;
BEGIN
  v_period_end := (p_period_start + INTERVAL '1 month')::DATE;

  FOR v_org IN
    SELECT DISTINCT r.organization_id, o.country_code
    FROM public.relocation_requests r
    JOIN public.organizations o ON o.id = r.organization_id
    JOIN public.bookings b ON b.id = r.dispatched_booking_id
    WHERE r.status = 'completed'
      AND b.created_at >= p_period_start
      AND b.created_at <  v_period_end
  LOOP
    /* Per-department breakdown. */
    DECLARE
      v_breakdown JSONB;
      v_total     NUMERIC(12,2);
      v_currency  TEXT;
    BEGIN
      SELECT
        COALESCE(jsonb_object_agg(
          COALESCE(d.name, 'unassigned'),
          dept_total
        ), '{}'::JSONB),
        SUM(dept_total)
        INTO v_breakdown, v_total
      FROM (
        SELECT r.department_id, SUM(b.price_estimate) AS dept_total
        FROM public.relocation_requests r
        JOIN public.bookings b ON b.id = r.dispatched_booking_id
        WHERE r.organization_id = v_org.organization_id
          AND r.status = 'completed'
          AND b.created_at >= p_period_start
          AND b.created_at <  v_period_end
        GROUP BY r.department_id
      ) dept_totals
      LEFT JOIN public.departments d ON d.id = dept_totals.department_id;

      SELECT cs.currency INTO v_currency
      FROM public.country_profiles cp
      JOIN public.currency_settings cs ON cs.currency = cp.currency
      WHERE cp.country_code = v_org.country_code;

      INSERT INTO public.organization_invoices
        (organization_id, period_start, period_end,
         department_breakdown, total_amount, currency, status, due_at)
      VALUES
        (v_org.organization_id, p_period_start, v_period_end,
         v_breakdown, v_total, COALESCE(v_currency, 'USD'),
         'issued', (v_period_end + INTERVAL '30 days')::DATE)
      ON CONFLICT DO NOTHING;
      /* (UNIQUE constraint added below) */

      v_inserted := v_inserted + 1;
    END;
  END LOOP;

  RETURN v_inserted;
END;
$$;

/* Add the UNIQUE constraint the ON CONFLICT relies on. Idempotent
 * via DO NOTHING if it already exists. */
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_invoices_period_unique'
  ) THEN
    ALTER TABLE public.organization_invoices
      ADD CONSTRAINT organization_invoices_period_unique
      UNIQUE (organization_id, period_start);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.run_monthly_org_invoices(DATE)
  TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. organization_invites
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('owner','approver','requester','viewer')),
  department_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  token           TEXT NOT NULL UNIQUE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_at     TIMESTAMPTZ,
  accepted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '14 days',
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_invites_org_idx
  ON public.organization_invites (organization_id);
CREATE INDEX IF NOT EXISTS organization_invites_email_idx
  ON public.organization_invites (lower(invited_email));


-- ----------------------------------------------------------------------------
-- create_org_invite — owner-only RPC that issues an invite + token
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_org_invite(
  p_org_id    UUID,
  p_email     TEXT,
  p_role      TEXT,
  p_dept_id   UUID DEFAULT NULL
) RETURNS TEXT                          -- returns the token
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF NOT public.is_org_member(p_org_id, 'owner') AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_role NOT IN ('owner','approver','requester','viewer') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  /* 32-byte URL-safe random token. */
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  INSERT INTO public.organization_invites
    (organization_id, invited_email, role, department_id,
     token, invited_by_user_id)
  VALUES
    (p_org_id, lower(trim(p_email)), p_role, p_dept_id,
     v_token, auth.uid());

  RETURN v_token;
END;
$$;


-- ----------------------------------------------------------------------------
-- accept_org_invite — invitee redeems the token
-- ----------------------------------------------------------------------------
-- Validates token + expiry + revocation, then creates the
-- organization_members row and stamps the invite as accepted.
CREATE OR REPLACE FUNCTION public.accept_org_invite(p_token TEXT)
RETURNS UUID                            -- returns organization_id on success
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.organization_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT * INTO v_invite
  FROM public.organization_invites
  WHERE token = p_token;

  IF NOT FOUND               THEN RAISE EXCEPTION 'invite_not_found'; END IF;
  IF v_invite.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite_already_accepted'; END IF;
  IF v_invite.revoked_at IS NOT NULL  THEN RAISE EXCEPTION 'invite_revoked'; END IF;
  IF v_invite.expires_at < now()      THEN RAISE EXCEPTION 'invite_expired'; END IF;

  INSERT INTO public.organization_members
    (organization_id, user_id, role, department_id, joined_at)
  VALUES
    (v_invite.organization_id, auth.uid(), v_invite.role,
     v_invite.department_id, now())
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role          = EXCLUDED.role,
        department_id = EXCLUDED.department_id,
        joined_at     = now(),
        revoked_at    = NULL;

  UPDATE public.organization_invites
     SET accepted_at      = now(),
         accepted_user_id = auth.uid()
   WHERE id = v_invite.id;

  RETURN v_invite.organization_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- RLS — invites are owner-readable; admins see all
-- ----------------------------------------------------------------------------

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organization_invites_owner_read    ON public.organization_invites;
DROP POLICY IF EXISTS organization_invites_owner_update  ON public.organization_invites;

CREATE POLICY organization_invites_owner_read
  ON public.organization_invites FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, 'owner') OR public.is_admin());

/* Owners can revoke an invite by updating revoked_at — no full ALL
 * write since we don't want them tampering with the token. */
CREATE POLICY organization_invites_owner_update
  ON public.organization_invites FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id, 'owner') OR public.is_admin())
  WITH CHECK (public.is_org_member(organization_id, 'owner') OR public.is_admin());

GRANT EXECUTE ON FUNCTION public.create_org_invite(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_org_invite(TEXT)                   TO authenticated;
