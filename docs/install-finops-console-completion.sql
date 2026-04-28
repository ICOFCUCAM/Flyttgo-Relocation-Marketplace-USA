-- ============================================================================
-- FlyttGo — Financial Operations Console completion
-- ============================================================================
-- Closes the two ledger gaps identified post-deploy:
--
--   1. platform_commissions   — sourced from escrow_payments.commission_amount
--                                when status = 'released'. The
--                                LedgerKind enum already reserves
--                                'commission'; this just makes
--                                unified_ledger compute it.
--
--   2. enterprise_invoices    — sourced from organization_invoices
--                                (total_amount, currency,
--                                period_start). Surfaces every
--                                organisation invoice as kind =
--                                'enterprise_invoice' so the
--                                Enterprise Billing tab and any
--                                CSV / Word / PDF export pulls
--                                the real institutional revenue
--                                stream rather than proxying via
--                                subscriptions.
--
-- Run AFTER docs/install-finops-console.sql. Idempotent —
-- CREATE OR REPLACE VIEW redefines unified_ledger in-place.
-- ============================================================================


CREATE OR REPLACE VIEW public.unified_ledger AS
WITH
booking_payments AS (
  SELECT
    'customer_payment'::TEXT                    AS kind,
    b.id::TEXT                                  AS reference_id,
    b.id                                        AS booking_id,
    NULL::UUID                                  AS provider_user_id,
    b.customer_id                               AS customer_user_id,
    COALESCE(UPPER(b.booking_country), 'US')    AS country_code,
    CASE COALESCE(UPPER(b.booking_country), 'US')
      WHEN 'NO' THEN 'NOK' WHEN 'GB' THEN 'GBP' WHEN 'DE' THEN 'EUR'
      WHEN 'FR' THEN 'EUR' WHEN 'CA' THEN 'CAD' WHEN 'AE' THEN 'AED'
      WHEN 'NG' THEN 'NGN' WHEN 'KE' THEN 'KES' WHEN 'IN' THEN 'INR'
      ELSE 'USD'
    END                                          AS currency,
    COALESCE(b.final_price, b.original_price, b.price_estimate, 0)::NUMERIC AS amount_original,
    COALESCE(b.payment_status, 'unknown')        AS status,
    COALESCE(b.created_at, now())                AS occurred_at
  FROM public.bookings b
  WHERE b.payment_status IN ('paid','escrow','released','refunded') OR b.status = 'completed'
),
escrow_holds AS (
  SELECT
    CASE
      WHEN e.status = 'released' THEN 'escrow_release'
      WHEN e.status = 'refunded' THEN 'refund'
      ELSE 'escrow_hold'
    END                                          AS kind,
    e.id::TEXT                                   AS reference_id,
    e.booking_id                                 AS booking_id,
    NULL::UUID                                   AS provider_user_id,
    NULL::UUID                                   AS customer_user_id,
    'USD'::TEXT                                  AS country_code,
    'USD'::TEXT                                  AS currency,
    COALESCE(e.amount, 0)::NUMERIC               AS amount_original,
    COALESCE(e.status, 'pending')                AS status,
    COALESCE(e.created_at, now())                AS occurred_at
  FROM public.escrow_payments e
),
provider_payouts AS (
  SELECT
    'provider_payout'::TEXT                       AS kind,
    w.id::TEXT                                    AS reference_id,
    NULL::UUID                                    AS booking_id,
    w.driver_id                                   AS provider_user_id,
    NULL::UUID                                    AS customer_user_id,
    'USD'::TEXT                                   AS country_code,
    'USD'::TEXT                                   AS currency,
    COALESCE(w.amount, 0)::NUMERIC                AS amount_original,
    COALESCE(w.type, 'unknown')                   AS status,
    COALESCE(w.created_at, now())                 AS occurred_at
  FROM public.driver_wallet_transactions w
),
subscription_payments AS (
  SELECT
    'subscription_payment'::TEXT                  AS kind,
    s.id::TEXT                                    AS reference_id,
    NULL::UUID                                    AS booking_id,
    s.driver_id                                   AS provider_user_id,
    NULL::UUID                                    AS customer_user_id,
    'USD'::TEXT                                   AS country_code,
    'USD'::TEXT                                   AS currency,
    COALESCE(st.baseline_usd, 0)::NUMERIC         AS amount_original,
    COALESCE(s.subscription_status, 'unknown')    AS status,
    COALESCE(s.start_date, now())                 AS occurred_at
  FROM public.driver_subscriptions s
  LEFT JOIN public.subscription_tiers st ON st.slug = s.plan
  WHERE s.subscription_status = 'active' AND COALESCE(st.baseline_usd, 0) > 0
),
/* NEW — platform commissions
 * Booked when escrow releases. commission_amount sits on
 * escrow_payments alongside driver_earning, so the spread
 * (gross - driver_earning = platform commission) is already
 * persisted; we surface it under a stable kind so the ledger,
 * audit log, and Currency report all see commission revenue
 * separately from the gross booking and the payout. */
platform_commissions AS (
  SELECT
    'commission'::TEXT                            AS kind,
    e.id::TEXT                                    AS reference_id,
    e.booking_id                                  AS booking_id,
    NULL::UUID                                    AS provider_user_id,
    NULL::UUID                                    AS customer_user_id,
    'USD'::TEXT                                   AS country_code,
    'USD'::TEXT                                   AS currency,
    COALESCE(e.commission_amount, 0)::NUMERIC     AS amount_original,
    COALESCE(e.status, 'pending')                 AS status,
    COALESCE(e.released_at, e.created_at, now()) AS occurred_at
  FROM public.escrow_payments e
  WHERE COALESCE(e.commission_amount, 0) > 0
    AND e.status = 'released'
),
/* NEW — enterprise invoices
 * Sourced from organization_invoices (department-rolled monthly
 * statements). Period_start drives occurred_at so invoices for
 * January show up in January's report regardless of when they
 * were finalised. */
enterprise_invoices AS (
  SELECT
    'enterprise_invoice'::TEXT                    AS kind,
    oi.id::TEXT                                   AS reference_id,
    NULL::UUID                                    AS booking_id,
    NULL::UUID                                    AS provider_user_id,
    NULL::UUID                                    AS customer_user_id,
    /* Country is loosely org-scoped; we don't store it on the
     * invoice itself, so default to USD until the org table
     * carries a billing_country. */
    'US'::TEXT                                    AS country_code,
    UPPER(COALESCE(oi.currency, 'USD'))           AS currency,
    COALESCE(oi.total_amount, 0)::NUMERIC         AS amount_original,
    COALESCE(oi.status, 'draft')                  AS status,
    COALESCE(oi.period_start::TIMESTAMPTZ, oi.created_at, now()) AS occurred_at
  FROM public.organization_invoices oi
  WHERE COALESCE(oi.total_amount, 0) > 0
)
SELECT * FROM booking_payments
UNION ALL SELECT * FROM escrow_holds
UNION ALL SELECT * FROM provider_payouts
UNION ALL SELECT * FROM subscription_payments
UNION ALL SELECT * FROM platform_commissions
UNION ALL SELECT * FROM enterprise_invoices;


-- ----------------------------------------------------------------------------
-- finops_overview() — extend the JSONB envelope with the new kinds
-- ----------------------------------------------------------------------------
-- Two new rollups so the Overview tab surfaces both streams as
-- separate cards rather than burying them inside gross_revenue.
CREATE OR REPLACE FUNCTION public.finops_overview(
  p_from TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_to   TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out JSONB;
BEGIN
  IF NOT public.is_finops() THEN RAISE EXCEPTION 'forbidden'; END IF;

  WITH conv AS (
    SELECT
      l.kind,
      l.amount_original,
      l.currency,
      l.amount_original * COALESCE(public.fx_rate_at(l.currency, l.occurred_at), 1.0) AS amount_usd
    FROM public.unified_ledger l
    WHERE l.occurred_at BETWEEN p_from AND p_to
  )
  SELECT jsonb_build_object(
    'window_from',   p_from,
    'window_to',     p_to,
    'gross_revenue_usd',     COALESCE(SUM(amount_usd) FILTER (WHERE kind = 'customer_payment'),    0),
    'gross_payouts_usd',     COALESCE(SUM(amount_usd) FILTER (WHERE kind = 'provider_payout'),     0),
    'gross_subscriptions_usd', COALESCE(SUM(amount_usd) FILTER (WHERE kind = 'subscription_payment'), 0),
    'gross_refunds_usd',     COALESCE(SUM(amount_usd) FILTER (WHERE kind = 'refund'),              0),
    'escrow_held_usd',       COALESCE(SUM(amount_usd) FILTER (WHERE kind = 'escrow_hold'),         0),
    'escrow_released_usd',   COALESCE(SUM(amount_usd) FILTER (WHERE kind = 'escrow_release'),      0),
    'platform_commissions_usd', COALESCE(SUM(amount_usd) FILTER (WHERE kind = 'commission'),       0),
    'enterprise_invoices_usd',  COALESCE(SUM(amount_usd) FILTER (WHERE kind = 'enterprise_invoice'), 0),
    'transaction_count',     COUNT(*),
    'currencies_seen',       COALESCE(ARRAY_AGG(DISTINCT currency), '{}'),
    'generated_at',          now()
  ) INTO v_out
  FROM conv;

  RETURN v_out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finops_overview(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
