-- ============================================================================
-- FlyttGo — RLS gaps + missing RPCs
-- ============================================================================
-- Closes lapses surfaced by the codebase audit:
--   1. admin_accounts had RLS on with no policies → is_admin() returned
--      false for everyone (AdminDashboard rendered empty).
--   2. driver_wallets, payout_requests, subscription_plans had RLS on
--      with no policies → DriverPortal selects came back empty.
--   3. AdminDashboard called rpc('increment_driver_wallet') /
--      rpc('decrement_driver_wallet') — neither existed in the DB, so
--      escrow release / refund silently failed.
--   4. DriverPortal called rpc('change_driver_subscription', { p_driver_id,
--      p_new_plan }) — also missing, so tier changes didn't persist.
-- Idempotent: re-running is safe.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. admin_accounts — self-read so is_admin() works under RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS admin_accounts_self_read ON public.admin_accounts;
CREATE POLICY admin_accounts_self_read
  ON public.admin_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS admin_accounts_admin_all ON public.admin_accounts;
CREATE POLICY admin_accounts_admin_all
  ON public.admin_accounts FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 2. driver_wallets / payout_requests / subscription_plans — self + admin
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS driver_wallets_self_read     ON public.driver_wallets;
DROP POLICY IF EXISTS driver_wallets_admin_all     ON public.driver_wallets;
CREATE POLICY driver_wallets_self_read
  ON public.driver_wallets FOR SELECT TO authenticated
  USING (driver_id = auth.uid());
CREATE POLICY driver_wallets_admin_all
  ON public.driver_wallets FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS payout_requests_self_read   ON public.payout_requests;
DROP POLICY IF EXISTS payout_requests_self_insert ON public.payout_requests;
DROP POLICY IF EXISTS payout_requests_admin_all   ON public.payout_requests;
CREATE POLICY payout_requests_self_read
  ON public.payout_requests FOR SELECT TO authenticated
  USING (driver_id = auth.uid());
CREATE POLICY payout_requests_self_insert
  ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());
CREATE POLICY payout_requests_admin_all
  ON public.payout_requests FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- subscription_plans is legacy (replaced by subscription_tiers in 00004)
-- but driver_subscriptions.plan_id still FKs it. Allow anon read so any
-- residual seed data is visible; admin-only writes.
DROP POLICY IF EXISTS subscription_plans_anon_read  ON public.subscription_plans;
DROP POLICY IF EXISTS subscription_plans_admin_all  ON public.subscription_plans;
CREATE POLICY subscription_plans_anon_read
  ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY subscription_plans_admin_all
  ON public.subscription_plans FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 3. increment_driver_wallet — credits a driver's balance + total_earned.
--    Used by AdminDashboard's escrow-release flow.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_driver_wallet(
  p_driver_id UUID,
  p_amount    NUMERIC
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.driver_wallets (driver_id, balance, total_earned)
       VALUES (p_driver_id, p_amount, p_amount)
  ON CONFLICT (driver_id) DO UPDATE
       SET balance      = COALESCE(public.driver_wallets.balance, 0)      + EXCLUDED.balance,
           total_earned = COALESCE(public.driver_wallets.total_earned, 0) + EXCLUDED.total_earned;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_driver_wallet(UUID, NUMERIC) TO authenticated;


-- ----------------------------------------------------------------------------
-- 4. decrement_driver_wallet — debits balance only (total_earned untouched
--    so refund reversals don't distort lifetime earnings).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_driver_wallet(
  p_driver_id UUID,
  p_amount    NUMERIC
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.driver_wallets (driver_id, balance)
       VALUES (p_driver_id, -p_amount)
  ON CONFLICT (driver_id) DO UPDATE
       SET balance = COALESCE(public.driver_wallets.balance, 0) - p_amount;
END;
$$;
GRANT EXECUTE ON FUNCTION public.decrement_driver_wallet(UUID, NUMERIC) TO authenticated;


-- ----------------------------------------------------------------------------
-- 5. driver_wallets needs a UNIQUE on driver_id so the upserts above work.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname  = 'driver_wallets_driver_id_uniq'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX driver_wallets_driver_id_uniq ON public.driver_wallets (driver_id)';
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 6. change_driver_subscription — switch a driver to a new tier slug.
--    Updates driver_subscriptions.plan and resets the billing window.
--    Callers: DriverPortal tier upgrade/downgrade.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_driver_subscription(
  p_driver_id UUID,
  p_new_plan  TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_exists BOOLEAN;
BEGIN
  /* Allow the driver themselves OR an admin. */
  IF auth.uid() <> p_driver_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE slug = p_new_plan)
    INTO v_tier_exists;
  IF NOT v_tier_exists THEN
    RAISE EXCEPTION 'unknown plan %', p_new_plan;
  END IF;

  /* Upsert by driver — one active subscription row per driver. */
  IF EXISTS (SELECT 1 FROM public.driver_subscriptions WHERE driver_id = p_driver_id) THEN
    UPDATE public.driver_subscriptions
       SET plan                = p_new_plan,
           subscription_status = 'active',
           start_date          = COALESCE(start_date, now()),
           end_date            = now() + INTERVAL '30 days'
     WHERE driver_id = p_driver_id;
  ELSE
    INSERT INTO public.driver_subscriptions
      (driver_id, plan, subscription_status, start_date, end_date)
      VALUES (p_driver_id, p_new_plan, 'active', now(), now() + INTERVAL '30 days');
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.change_driver_subscription(UUID, TEXT) TO authenticated;
