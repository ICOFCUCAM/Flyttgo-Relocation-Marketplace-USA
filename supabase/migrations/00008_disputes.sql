-- ============================================================================
-- FlyttGo — Dispute system
-- ============================================================================
-- Implements the structured dispute lifecycle the spec calls for:
-- a 24h confirmation window, 8 standard categories, two-sided
-- evidence upload, automatic classification, escrow hold during
-- review, 4 resolution paths (partial refund / service credit /
-- insurance claim / full refund), admin override layer, country-
-- aware resolution templates, and provider-fairness rate-limiting.
--
-- ── Tables ──────────────────────────────────────────────────────────
--
--   dispute_categories            — the 8 standard categories
--   dispute_resolution_templates  — country × category recommended path
--   dispute_automation_rules      — auto-suggestion rules
--   disputes                      — case rows
--   dispute_evidence              — files / notes attached to a case
--   dispute_resolutions           — resolution history per case
--
-- ── Hold semantics ──────────────────────────────────────────────────
--
--   Filing a dispute writes a row with status='open' AND flips the
--   referenced booking's payment_status to 'on_hold'. The existing
--   payout-release trigger MUST refuse to release while
--   payment_status='on_hold'. Resolution updates re-flip back to
--   'escrow' (release) / 'refunded' (refund) as appropriate.
--
-- Run AFTER docs/install-pricing-engine.sql + install-country-profiles.sql.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. dispute_categories — standardised case taxonomy
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispute_categories (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  description   TEXT,
  /* Default resolution path when no country override applies. */
  default_path  TEXT NOT NULL CHECK (default_path IN (
    'partial_refund','service_credit','insurance_claim','full_refund','mediation'
  )),
  /* Severity drives admin queue priority. */
  severity      SMALLINT NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  position      SMALLINT NOT NULL DEFAULT 100,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.dispute_categories (slug, label, description, default_path, severity, position) VALUES
  ('delay',                 'Delay',
   'Provider arrived later than the booking window or job overran significantly.',
   'service_credit',  3, 10),
  ('price_mismatch',        'Price mismatch',
   'Final invoice did not match the quoted total without prior approval.',
   'partial_refund',  4, 20),
  ('missing_items',         'Missing items',
   'Inventory items were not delivered to the destination.',
   'insurance_claim', 5, 30),
  ('damage_claim',          'Damage claim',
   'Items arrived damaged. Routes to provider insurance workflow.',
   'insurance_claim', 5, 40),
  ('crew_professionalism',  'Crew professionalism',
   'Crew behaviour fell below marketplace standards.',
   'mediation',       2, 50),
  ('service_incomplete',    'Service incomplete',
   'Crew left before the agreed scope was finished.',
   'partial_refund',  4, 60),
  ('wrong_vehicle_size',    'Wrong vehicle size',
   'Vehicle did not fit the brief — required a second trip or alternative.',
   'partial_refund',  3, 70),
  ('other',                 'Other',
   'Issue not captured by the standard categories — describe in evidence.',
   'mediation',       3, 80)
ON CONFLICT (slug) DO UPDATE
  SET label        = EXCLUDED.label,
      description  = EXCLUDED.description,
      default_path = EXCLUDED.default_path,
      severity     = EXCLUDED.severity,
      position     = EXCLUDED.position,
      updated_at   = now();


-- ----------------------------------------------------------------------------
-- 2. dispute_resolution_templates — country × category override path
-- ----------------------------------------------------------------------------
-- Reflects the spec's regional resolution preferences:
--   USA   → refund-driven
--   EU    → documentation-driven (slower, stricter evidence bar)
--   UK    → mediation-driven
--   Africa → negotiation-driven
--   ME    → contract-driven
CREATE TABLE IF NOT EXISTS public.dispute_resolution_templates (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL,
  category_slug TEXT NOT NULL REFERENCES public.dispute_categories(slug) ON DELETE CASCADE,
  /* The recommended resolution for this country × category. */
  path          TEXT NOT NULL CHECK (path IN (
    'partial_refund','service_credit','insurance_claim','full_refund','mediation'
  )),
  /* Suggested refund / credit pct, where the path is monetary. NULL
   * for non-monetary paths. */
  suggested_pct NUMERIC(4,3),
  note          TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, category_slug)
);

CREATE INDEX IF NOT EXISTS dispute_templates_country_idx
  ON public.dispute_resolution_templates (country_code);

-- Seed: examples for each region.
INSERT INTO public.dispute_resolution_templates
  (country_code, category_slug, path, suggested_pct, note) VALUES
  -- USA — refund-driven
  ('us', 'delay',           'partial_refund',  0.10, '10% refund per overrun hour > 60 min'),
  ('us', 'price_mismatch',  'full_refund',     1.00, 'Charge above quote without consent → full delta refund'),
  ('us', 'damage_claim',    'insurance_claim', NULL, 'Route to FMCSA-aware carrier insurance + BMC-91'),
  -- EU — documentation-driven (slower, stricter evidence bar)
  ('de', 'delay',           'mediation',       NULL, 'Documentation required before refund — ZPO §286'),
  ('de', 'damage_claim',    'insurance_claim', NULL, 'Verkehrshaftpflicht claim'),
  ('fr', 'delay',           'mediation',       NULL, 'Recours amiable obligatoire avant remboursement'),
  -- UK — mediation-driven
  ('gb', 'delay',           'mediation',       NULL, 'Mediation default; small claims if unresolved'),
  ('gb', 'damage_claim',    'insurance_claim', NULL, 'BAR insurance bond claim path'),
  -- Africa — negotiation-driven
  ('ng', 'delay',           'service_credit',  0.10, 'Service credit preferred; cash refund only on escalation'),
  ('ke', 'delay',           'service_credit',  0.10, 'Service credit preferred; cash refund only on escalation'),
  -- Middle East — contract-driven (lean on the corporate SLA)
  ('ae', 'delay',           'mediation',       NULL, 'Defer to corporate SLA terms first')
ON CONFLICT (country_code, category_slug) DO UPDATE
  SET path          = EXCLUDED.path,
      suggested_pct = EXCLUDED.suggested_pct,
      note          = EXCLUDED.note,
      updated_at    = now();


-- ----------------------------------------------------------------------------
-- 3. dispute_automation_rules — auto-suggest based on observable conditions
-- ----------------------------------------------------------------------------
-- The condition is a free-form key the API/edge function evaluates
-- ("provider_late_minutes > 60") — keeping it as a string lets ops
-- tune rules without a code release.
CREATE TABLE IF NOT EXISTS public.dispute_automation_rules (
  id              SERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  condition_key   TEXT NOT NULL,
  threshold       NUMERIC(10,2),
  /* The path the rule auto-suggests when condition is met. */
  suggested_path  TEXT NOT NULL CHECK (suggested_path IN (
    'partial_refund','service_credit','insurance_claim','full_refund','mediation','none'
  )),
  suggested_pct   NUMERIC(4,3),
  description     TEXT,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.dispute_automation_rules
  (slug, condition_key, threshold, suggested_path, suggested_pct, description, enabled) VALUES
  ('late-under-30',    'provider_late_minutes', 30,    'none',           NULL,
   'Late by less than 30 min → no penalty.', true),
  ('late-30-to-60',    'provider_late_minutes', 60,    'service_credit', 0.05,
   'Late 30–60 min → 5% service credit.', true),
  ('late-over-60',     'provider_late_minutes', 60,    'partial_refund', 0.10,
   'Late more than 60 min → 10% refund.', true),
  ('no-show',          'provider_no_show',      1,     'full_refund',    1.00,
   'Provider no-show → full refund auto-recommended.', true),
  ('repeated-disputes','customer_dispute_count_30d', 3, 'mediation',     NULL,
   'Customer has filed 3+ disputes in 30 days → manual review required.', true)
ON CONFLICT (slug) DO UPDATE
  SET condition_key  = EXCLUDED.condition_key,
      threshold      = EXCLUDED.threshold,
      suggested_path = EXCLUDED.suggested_path,
      suggested_pct  = EXCLUDED.suggested_pct,
      description    = EXCLUDED.description,
      enabled        = EXCLUDED.enabled,
      updated_at     = now();


-- ----------------------------------------------------------------------------
-- 4. disputes — case rows
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disputes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  /* Booking + auth scoping. */
  booking_id         UUID NOT NULL,
  customer_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_user_id   UUID,
  country            TEXT NOT NULL,
  category_slug      TEXT NOT NULL REFERENCES public.dispute_categories(slug) ON DELETE RESTRICT,
  /* Customer's free-form description. */
  summary            TEXT NOT NULL,
  /* Workflow status. */
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',          -- accepting evidence + provider response
    'under_review',  -- platform reviewing
    'resolved',      -- final resolution applied
    'closed_no_action',
    'escalated'      -- pushed to admin queue
  )),
  /* Auto-suggested resolution computed at file-time from the
   * country × category template + matching automation rule. Admin
   * sees this in the queue but isn't bound by it. */
  suggested_path     TEXT,
  suggested_pct      NUMERIC(4,3),
  /* Final resolution — set when status flips to 'resolved'. */
  final_path         TEXT,
  final_pct          NUMERIC(4,3),
  final_amount       NUMERIC(12,2),
  /* SLA — 24h customer-confirmation window applies before filing
   * is allowed; once filed, the platform commits to a 7-day
   * review SLA. */
  filed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_due_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  resolved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS disputes_booking_idx        ON public.disputes (booking_id);
CREATE INDEX IF NOT EXISTS disputes_customer_idx       ON public.disputes (customer_user_id);
CREATE INDEX IF NOT EXISTS disputes_provider_idx       ON public.disputes (provider_user_id);
CREATE INDEX IF NOT EXISTS disputes_status_idx         ON public.disputes (status);
CREATE INDEX IF NOT EXISTS disputes_review_due_idx     ON public.disputes (review_due_at)
  WHERE status IN ('open','under_review');


-- ----------------------------------------------------------------------------
-- 5. dispute_evidence — files / notes attached to a case
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispute_evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id    UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  /* Side that uploaded the evidence — customer / provider / admin. */
  uploader_role TEXT NOT NULL CHECK (uploader_role IN ('customer','provider','admin')),
  uploader_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  /* Evidence kind — drives icon + ordering in the case timeline. */
  kind          TEXT NOT NULL CHECK (kind IN (
    'photo','video','receipt','chat_screenshot','inventory_list','timeline_note','arrival_proof','other'
  )),
  /* Storage path (bucket: dispute-evidence). */
  file_url      TEXT,
  /* Free-form note (when no file is attached). */
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispute_evidence_dispute_idx ON public.dispute_evidence (dispute_id);


-- ----------------------------------------------------------------------------
-- 6. dispute_resolutions — resolution history per case
-- ----------------------------------------------------------------------------
-- Keeps an audit trail when admin overrides happen (e.g. bumping
-- a partial-refund up to full-refund after evidence review).
CREATE TABLE IF NOT EXISTS public.dispute_resolutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id    UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  /* Who performed the action — admin or system (auto-rule). */
  actor_role    TEXT NOT NULL CHECK (actor_role IN ('admin','system','customer','provider')),
  actor_user_id UUID,
  /* The resolution applied. */
  path          TEXT NOT NULL CHECK (path IN (
    'partial_refund','service_credit','insurance_claim','full_refund','mediation','request_evidence','close_no_action'
  )),
  pct           NUMERIC(4,3),
  amount        NUMERIC(12,2),
  rationale     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dispute_resolutions_dispute_idx ON public.dispute_resolutions (dispute_id);


-- ----------------------------------------------------------------------------
-- Touch-updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS disputes_updated_at ON public.disputes;
CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.touch_disputes_updated_at();


-- ----------------------------------------------------------------------------
-- Helper — file_dispute() resolves the suggested path before insert
-- ----------------------------------------------------------------------------
-- Encapsulates the country × category template lookup + the
-- automation-rule check so the client doesn't have to. Returns the
-- fresh dispute_id.
CREATE OR REPLACE FUNCTION public.file_dispute(
  p_booking_id     UUID,
  p_country        TEXT,
  p_category       TEXT,
  p_summary        TEXT,
  p_provider_user  UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id            UUID;
  v_path          TEXT;
  v_pct           NUMERIC(4,3);
BEGIN
  /* Look up the country × category template; fall back to the
   * category default. */
  SELECT path, suggested_pct
    INTO v_path, v_pct
  FROM dispute_resolution_templates
  WHERE country_code = p_country
    AND category_slug = p_category;

  IF v_path IS NULL THEN
    SELECT default_path INTO v_path
    FROM dispute_categories WHERE slug = p_category;
  END IF;

  INSERT INTO disputes
    (booking_id, customer_user_id, provider_user_id, country,
     category_slug, summary, suggested_path, suggested_pct)
  VALUES
    (p_booking_id, auth.uid(), p_provider_user, p_country,
     p_category, p_summary, v_path, v_pct)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.dispute_categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_resolution_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_automation_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_resolutions           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dispute_categories_anon_read            ON public.dispute_categories;
DROP POLICY IF EXISTS dispute_resolution_templates_anon_read  ON public.dispute_resolution_templates;
DROP POLICY IF EXISTS dispute_automation_rules_anon_read      ON public.dispute_automation_rules;
DROP POLICY IF EXISTS disputes_party_read                     ON public.disputes;
DROP POLICY IF EXISTS disputes_customer_insert                ON public.disputes;
DROP POLICY IF EXISTS dispute_evidence_party_all              ON public.dispute_evidence;
DROP POLICY IF EXISTS dispute_resolutions_party_read          ON public.dispute_resolutions;

CREATE POLICY dispute_categories_anon_read
  ON public.dispute_categories FOR SELECT USING (true);
CREATE POLICY dispute_resolution_templates_anon_read
  ON public.dispute_resolution_templates FOR SELECT USING (true);
CREATE POLICY dispute_automation_rules_anon_read
  ON public.dispute_automation_rules FOR SELECT USING (true);

-- Customer + provider on a dispute can read it; nobody else.
CREATE POLICY disputes_party_read
  ON public.disputes
  FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid() OR provider_user_id = auth.uid());

-- Customer can file a dispute on their own bookings.
CREATE POLICY disputes_customer_insert
  ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (customer_user_id = auth.uid());

-- Customer + provider can read + add evidence on their own dispute.
CREATE POLICY dispute_evidence_party_all
  ON public.dispute_evidence
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.disputes d
             WHERE d.id = dispute_evidence.dispute_id
               AND (d.customer_user_id = auth.uid() OR d.provider_user_id = auth.uid()))
  )
  WITH CHECK (uploader_user_id = auth.uid());

-- Resolution history readable by the parties.
CREATE POLICY dispute_resolutions_party_read
  ON public.dispute_resolutions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.disputes d
             WHERE d.id = dispute_resolutions.dispute_id
               AND (d.customer_user_id = auth.uid() OR d.provider_user_id = auth.uid()))
  );

GRANT EXECUTE ON FUNCTION public.file_dispute(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;
