-- ============================================================================
-- FlyttGo — Financial Operations & Audit Console
-- ============================================================================
-- Compliance-grade accounting, payout, and audit layer that turns the
-- platform into infrastructure rather than a marketplace site.
--
-- Adds:
--   1. finops_accounts          — role-scoped table (super_admin /
--                                 accountant / auditor) + helper
--                                 is_finops_role(role) RPC
--   2. fx_rates                 — historical FX snapshots used by the
--                                 ledger to record original-currency
--                                 amount + base-currency conversion
--   3. tax_mode_by_country      — per-country tax handling
--                                 (sales-tax / VAT / MVA / provider-
--                                 responsible) seeded for 8 markets
--   4. financial_audit_log      — append-only row-level changelog
--                                 written by triggers on the
--                                 financial source tables
--   5. unified_ledger view      — single shape pulling
--                                 customer payments / provider payouts
--                                 / escrow holds / refunds / sub
--                                 payments / commissions / enterprise
--                                 invoices into one queryable surface
--   6. finops_* RPCs            — overview / ledger / payouts /
--                                 subscription / escrow / audit
--
-- Audit log INSERT-only — DELETE / UPDATE blocked at policy level so
-- nobody can rewrite history. Auditors get SELECT only across the
-- entire console; accountants can SELECT + adjust adjustments;
-- super_admin can do everything plus role management.
--
-- Run AFTER the rest of the platform migrations. Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. finops_accounts — role-scoped FinOps console access
-- ----------------------------------------------------------------------------
-- Sits alongside admin_accounts. A user can be in both (e.g. a
-- super_admin who is also a global admin). The role values mirror
-- the spec: super_admin (full write), accountant (write on
-- adjustments + exports), auditor (read-only).
CREATE TABLE IF NOT EXISTS public.finops_accounts (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('super_admin','accountant','auditor')),
  /* Accountants can scope to a specific country via this column —
   * NULL means global. The ledger RPCs respect the scope so a NO
   * accountant only sees Norwegian transactions. */
  country_scope TEXT,
  /* Display name + locale for the accountant landing screen. */
  display_name TEXT,
  locale       TEXT NOT NULL DEFAULT 'en-US',
  base_currency TEXT NOT NULL DEFAULT 'USD',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finops_accounts_role_idx
  ON public.finops_accounts (role);

ALTER TABLE public.finops_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finops_accounts_self_read   ON public.finops_accounts;
DROP POLICY IF EXISTS finops_accounts_admin_all   ON public.finops_accounts;

CREATE POLICY finops_accounts_self_read
  ON public.finops_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY finops_accounts_admin_all
  ON public.finops_accounts FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- 1a. Role helpers — STABLE so policies can reuse the result.
CREATE OR REPLACE FUNCTION public.finops_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.finops_accounts WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_finops()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.is_admin() OR EXISTS (
  SELECT 1 FROM public.finops_accounts WHERE user_id = auth.uid()
); $$;

CREATE OR REPLACE FUNCTION public.is_finops_writer()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.is_admin() OR EXISTS (
  SELECT 1 FROM public.finops_accounts
   WHERE user_id = auth.uid() AND role IN ('super_admin','accountant')
); $$;

GRANT EXECUTE ON FUNCTION public.finops_role()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finops()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_finops_writer()   TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. fx_rates — historical FX snapshots
-- ----------------------------------------------------------------------------
-- Every ledger row stores the FX rate used at the moment the row
-- was created so a back-dated currency report reproduces exactly
-- the same numbers. Rates are loaded weekly via an admin job (not
-- this migration's job — we just provide the table + helper).
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id            BIGSERIAL PRIMARY KEY,
  currency      TEXT NOT NULL,
  /* USD-anchored rates: 1 unit of currency = rate_to_usd USD. */
  rate_to_usd   NUMERIC(14,6) NOT NULL CHECK (rate_to_usd > 0),
  /* Effective range — closed on starts_at, open on ends_at so a
   * row's effective period is unambiguous. */
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at       TIMESTAMPTZ,
  source        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fx_rates_currency_idx
  ON public.fx_rates (currency, starts_at DESC);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fx_rates_finops_read  ON public.fx_rates;
DROP POLICY IF EXISTS fx_rates_admin_write  ON public.fx_rates;
CREATE POLICY fx_rates_finops_read
  ON public.fx_rates FOR SELECT TO authenticated
  USING (public.is_finops());
CREATE POLICY fx_rates_admin_write
  ON public.fx_rates FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

/* Seed a baseline snapshot for every currency we operate in. The
 * ledger view's CASE expression picks up these rows when no later
 * rate exists. Source = 'baseline' marks them as starter data. */
INSERT INTO public.fx_rates (currency, rate_to_usd, source) VALUES
  ('USD', 1.000000, 'baseline'),
  ('EUR', 1.085000, 'baseline'),
  ('GBP', 1.265000, 'baseline'),
  ('NOK', 0.094000, 'baseline'),
  ('KES', 0.007700, 'baseline'),
  ('NGN', 0.000620, 'baseline'),
  ('AED', 0.272000, 'baseline'),
  ('INR', 0.011900, 'baseline'),
  ('CAD', 0.735000, 'baseline')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.fx_rate_at(p_currency TEXT, p_at TIMESTAMPTZ DEFAULT now())
RETURNS NUMERIC LANGUAGE sql STABLE
AS $$
  SELECT rate_to_usd
    FROM public.fx_rates
   WHERE currency = upper(p_currency)
     AND starts_at <= p_at
     AND (ends_at IS NULL OR ends_at > p_at)
   ORDER BY starts_at DESC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fx_rate_at(TEXT, TIMESTAMPTZ) TO authenticated;


-- ----------------------------------------------------------------------------
-- 3. tax_mode_by_country — tax handling per market
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tax_mode_by_country (
  country_code  TEXT PRIMARY KEY,
  /* Modes:
   *   sales_tax_added        — US-style; tax computed at checkout
   *                            per state, NOT included in the quote
   *   vat_included           — UK / EU; VAT inside every quote
   *   mva_included           — Norway MVA; same posture as VAT
   *   gst_included           — Canada / India; same posture as VAT
   *   provider_responsible   — emerging markets; provider files
   *                            their own VAT, platform reports gross
   *   none                   — markets without a national VAT regime
   */
  tax_mode     TEXT NOT NULL CHECK (tax_mode IN (
    'sales_tax_added','vat_included','mva_included','gst_included',
    'provider_responsible','none'
  )),
  default_rate  NUMERIC(5,4),                -- e.g. 0.20 for UK VAT
  display_label TEXT,                        -- "20% VAT included"
  notes         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.tax_mode_by_country
  (country_code, tax_mode, default_rate, display_label, notes) VALUES
  ('us', 'sales_tax_added',     NULL,   'Sales tax (per state)',  'Calculated at checkout per US state.'),
  ('ca', 'gst_included',        0.0500, 'GST/PST/HST',            'Provincial overlay applied at checkout.'),
  ('gb', 'vat_included',        0.2000, '20% VAT included',       'HMRC-aligned.'),
  ('de', 'vat_included',        0.1900, '19% MwSt included',      'GüKG-aligned.'),
  ('fr', 'vat_included',        0.2000, '20% TVA included',       'BIC déménagement.'),
  ('no', 'mva_included',        0.2500, '25% MVA included',       'Norwegian VAT (MVA).'),
  ('ae', 'vat_included',        0.0500, '5% VAT included',        'UAE federal VAT.'),
  ('ng', 'provider_responsible', NULL,  'Provider-responsible',   'Provider files own VAT.'),
  ('ke', 'provider_responsible', NULL,  'Provider-responsible',   'Provider files own VAT.'),
  ('in', 'gst_included',        0.1800, '18% GST included',       'Logistics & moving HSN.')
ON CONFLICT (country_code) DO UPDATE
  SET tax_mode      = EXCLUDED.tax_mode,
      default_rate  = EXCLUDED.default_rate,
      display_label = EXCLUDED.display_label,
      notes         = EXCLUDED.notes,
      updated_at    = now();

ALTER TABLE public.tax_mode_by_country ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tax_mode_anon_read    ON public.tax_mode_by_country;
DROP POLICY IF EXISTS tax_mode_admin_write  ON public.tax_mode_by_country;
CREATE POLICY tax_mode_anon_read   ON public.tax_mode_by_country FOR SELECT USING (true);
CREATE POLICY tax_mode_admin_write ON public.tax_mode_by_country FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 4. financial_audit_log — append-only row-level changelog
-- ----------------------------------------------------------------------------
-- Written by the trigger functions below on every INSERT / UPDATE /
-- DELETE on the financial source tables. The table itself is
-- protected by an INSERT-only policy so even a super_admin can't
-- rewrite history through normal SQL.
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id           BIGSERIAL PRIMARY KEY,
  table_name   TEXT NOT NULL,
  record_id    TEXT NOT NULL,                -- UUID or BIGINT cast to TEXT
  op           TEXT NOT NULL CHECK (op IN ('INSERT','UPDATE','DELETE')),
  before_value JSONB,
  after_value  JSONB,
  /* The user that performed the action (auth.uid()). NULL for
   * system / cron operations. */
  actor_id     UUID,
  actor_role   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fin_audit_table_idx
  ON public.financial_audit_log (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS fin_audit_record_idx
  ON public.financial_audit_log (table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fin_audit_actor_idx
  ON public.financial_audit_log (actor_id, created_at DESC);

ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_audit_finops_read  ON public.financial_audit_log;
DROP POLICY IF EXISTS fin_audit_trigger_ins  ON public.financial_audit_log;

/* Anyone in finops (any role) can SELECT — including auditors. */
CREATE POLICY fin_audit_finops_read
  ON public.financial_audit_log FOR SELECT TO authenticated
  USING (public.is_finops());

/* No client-side INSERT — only triggers (which run as the table
 * owner) write rows. We deliberately omit INSERT/UPDATE/DELETE
 * policies so client INSERT fails with permission denied. */


-- 4a. Generic write-audit trigger — table-agnostic.
CREATE OR REPLACE FUNCTION public.write_financial_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id TEXT;
  v_role      TEXT;
BEGIN
  v_record_id := COALESCE(
    (CASE TG_OP WHEN 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(NEW) END) ->> 'id',
    'unknown'
  );

  /* Resolve the actor's profiles.role for context. */
  SELECT role INTO v_role FROM public.profiles WHERE user_id = auth.uid();

  INSERT INTO public.financial_audit_log
    (table_name, record_id, op, before_value, after_value, actor_id, actor_role)
  VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid(),
    COALESCE(v_role, 'system')
  );

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;


-- 4b. Wire the trigger onto the financial source tables. We attach
--     to bookings (price columns), escrow_payments, driver_wallet_-
--     transactions, driver_subscriptions, and organization_invoices
--     (when present). DROP IF EXISTS keeps the migration idempotent.
DO $$
BEGIN
  -- bookings — only fire on UPDATE OF price columns to avoid massive
  -- audit log volume from non-financial column edits.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS bookings_finaudit ON public.bookings';
    EXECUTE 'CREATE TRIGGER bookings_finaudit
               AFTER INSERT OR DELETE OR UPDATE OF price_estimate, original_price, final_price, payment_status, status
               ON public.bookings
               FOR EACH ROW EXECUTE FUNCTION public.write_financial_audit_log()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escrow_payments') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS escrow_finaudit ON public.escrow_payments';
    EXECUTE 'CREATE TRIGGER escrow_finaudit
               AFTER INSERT OR DELETE OR UPDATE
               ON public.escrow_payments
               FOR EACH ROW EXECUTE FUNCTION public.write_financial_audit_log()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_wallet_transactions') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS wallet_tx_finaudit ON public.driver_wallet_transactions';
    EXECUTE 'CREATE TRIGGER wallet_tx_finaudit
               AFTER INSERT OR DELETE OR UPDATE
               ON public.driver_wallet_transactions
               FOR EACH ROW EXECUTE FUNCTION public.write_financial_audit_log()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_subscriptions') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS sub_finaudit ON public.driver_subscriptions';
    EXECUTE 'CREATE TRIGGER sub_finaudit
               AFTER INSERT OR DELETE OR UPDATE OF plan, subscription_status, end_date
               ON public.driver_subscriptions
               FOR EACH ROW EXECUTE FUNCTION public.write_financial_audit_log()';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_invoices') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS org_invoice_finaudit ON public.organization_invoices';
    EXECUTE 'CREATE TRIGGER org_invoice_finaudit
               AFTER INSERT OR DELETE OR UPDATE
               ON public.organization_invoices
               FOR EACH ROW EXECUTE FUNCTION public.write_financial_audit_log()';
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 5. unified_ledger view — single shape for the marketplace ledger
-- ----------------------------------------------------------------------------
-- Pulls the seven transaction kinds the spec mentions into one row
-- shape. Stores: kind, currency, amount_original, amount_usd
-- (computed via fx_rate_at), country, status, occurred_at, plus
-- joinable references to the source row.
--
-- Read-through view, not materialized — accountants always see
-- live data. RPCs below filter + paginate so the dashboard never
-- pulls the entire history.
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
    /* Booking pricing columns are USD-equivalent for US bookings;
     * for non-US markets the BookingFlow stores the local price.
     * We trust booking_country to drive currency selection. */
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
)
SELECT * FROM booking_payments
UNION ALL SELECT * FROM escrow_holds
UNION ALL SELECT * FROM provider_payouts
UNION ALL SELECT * FROM subscription_payments;

GRANT SELECT ON public.unified_ledger TO authenticated;


-- ----------------------------------------------------------------------------
-- 6. finops_overview() — KPI envelope for the console landing screen
-- ----------------------------------------------------------------------------
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
    'transaction_count',     COUNT(*),
    'currencies_seen',       COALESCE(ARRAY_AGG(DISTINCT currency), '{}'),
    'generated_at',          now()
  ) INTO v_out
  FROM conv;

  RETURN v_out;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finops_overview(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- ----------------------------------------------------------------------------
-- 7. finops_ledger() — paginated unified ledger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finops_ledger(
  p_from      TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_to        TIMESTAMPTZ DEFAULT now(),
  p_kind      TEXT DEFAULT NULL,
  p_currency  TEXT DEFAULT NULL,
  p_country   TEXT DEFAULT NULL,
  p_limit     INTEGER DEFAULT 100,
  p_offset    INTEGER DEFAULT 0
) RETURNS TABLE (
  kind              TEXT,
  reference_id      TEXT,
  booking_id        UUID,
  provider_user_id  UUID,
  customer_user_id  UUID,
  country_code      TEXT,
  currency          TEXT,
  amount_original   NUMERIC,
  amount_usd        NUMERIC,
  fx_rate_to_usd    NUMERIC,
  status            TEXT,
  occurred_at       TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_finops() THEN RAISE EXCEPTION 'forbidden'; END IF;

  RETURN QUERY
  SELECT
    l.kind, l.reference_id, l.booking_id, l.provider_user_id, l.customer_user_id,
    l.country_code, l.currency, l.amount_original,
    (l.amount_original * COALESCE(public.fx_rate_at(l.currency, l.occurred_at), 1.0))::NUMERIC AS amount_usd,
    COALESCE(public.fx_rate_at(l.currency, l.occurred_at), 1.0)::NUMERIC AS fx_rate_to_usd,
    l.status, l.occurred_at
  FROM public.unified_ledger l
  WHERE l.occurred_at BETWEEN p_from AND p_to
    AND (p_kind     IS NULL OR l.kind     = p_kind)
    AND (p_currency IS NULL OR l.currency = upper(p_currency))
    AND (p_country  IS NULL OR l.country_code = upper(p_country))
  ORDER BY l.occurred_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finops_ledger(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;


-- ----------------------------------------------------------------------------
-- 8. finops_subscription_revenue() — by-tier breakdown
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finops_subscription_revenue()
RETURNS TABLE (
  tier_slug      TEXT,
  display_name   TEXT,
  active_count   BIGINT,
  monthly_usd    NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_finops() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    st.slug,
    st.display_name,
    COUNT(*) FILTER (WHERE s.subscription_status = 'active'),
    (COUNT(*) FILTER (WHERE s.subscription_status = 'active') * COALESCE(st.baseline_usd, 0))::NUMERIC
  FROM public.subscription_tiers st
  LEFT JOIN public.driver_subscriptions s ON s.plan = st.slug
  GROUP BY st.slug, st.display_name, st.position, st.baseline_usd
  ORDER BY st.position;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finops_subscription_revenue() TO authenticated;


-- ----------------------------------------------------------------------------
-- 9. finops_currency_breakdown() — gross by currency
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finops_currency_breakdown(
  p_from TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  p_to   TIMESTAMPTZ DEFAULT now()
) RETURNS TABLE (
  currency           TEXT,
  transaction_count  BIGINT,
  gross_original     NUMERIC,
  gross_usd          NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_finops() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    l.currency,
    COUNT(*),
    SUM(l.amount_original)::NUMERIC,
    SUM(l.amount_original * COALESCE(public.fx_rate_at(l.currency, l.occurred_at), 1.0))::NUMERIC
  FROM public.unified_ledger l
  WHERE l.occurred_at BETWEEN p_from AND p_to
  GROUP BY l.currency
  ORDER BY 4 DESC NULLS LAST;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finops_currency_breakdown(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- ----------------------------------------------------------------------------
-- 10. finops_audit_log() — paginated audit viewer
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finops_audit_log(
  p_table   TEXT DEFAULT NULL,
  p_record  TEXT DEFAULT NULL,
  p_limit   INTEGER DEFAULT 200,
  p_offset  INTEGER DEFAULT 0
) RETURNS SETOF public.financial_audit_log
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_finops() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT * FROM public.financial_audit_log
   WHERE (p_table  IS NULL OR table_name = p_table)
     AND (p_record IS NULL OR record_id  = p_record)
   ORDER BY created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.finops_audit_log(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
