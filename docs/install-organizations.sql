-- ============================================================================
-- FlyttGo — Corporate & Government Booking Portal
-- ============================================================================
-- Adds the institutional layer that turns the consumer marketplace
-- into procurement-compatible logistics infrastructure: multi-user
-- organization accounts, departments, approval workflows, contract
-- pricing, invoice billing.
--
-- ── Tables ──────────────────────────────────────────────────────────
--
--   organizations              — the institutional account
--   organization_members       — multi-user membership + roles
--   departments                — cost-centre splits within an org
--   organization_contracts     — framework pricing agreements
--   relocation_requests        — institutional booking briefs
--   relocation_request_approvals — multi-step approval audit trail
--   organization_invoices      — monthly billing summaries
--
-- ── Roles within an organization ────────────────────────────────────
--
--   owner       — full admin (typically HR / mobility lead)
--   approver    — finance / dept head; must approve relocations
--   requester   — submits relocation briefs (line manager / employee)
--   viewer      — read-only access (auditor / observer)
--
-- ── Workflow ────────────────────────────────────────────────────────
--
--   1. Member with 'requester' role files a relocation_request
--      (status='draft' → 'submitted').
--   2. Approver reviews; status flips to 'approved' or 'rejected'.
--   3. Approval triggers dispatch — match providers via
--      find_eligible_providers_for_segment(segment) so CIPs
--      surface first.
--   4. Booking completes → organization_invoices line items rolled
--      up monthly.
--
-- Run AFTER the existing pricing / disputes / scoring stack.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. organizations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  /* Display name + procurement-side legal name. */
  name                TEXT NOT NULL,
  legal_name          TEXT,
  /* Sector — drives which institutional segment routes apply. */
  sector              TEXT NOT NULL CHECK (sector IN (
    'corporate','enterprise','university','municipal','government',
    'embassy','ngo','transit-authority'
  )),
  country_code        TEXT NOT NULL,
  /* Tax registration — required for invoice billing. */
  tax_registration    TEXT,
  /* Procurement compliance — admin-managed; admins flip the flag
   * once vendor onboarding is complete. */
  procurement_verified BOOLEAN NOT NULL DEFAULT false,
  /* Default billing model. card = pay-on-booking; invoice = monthly
   * batched billing tied to the organization_contracts row. */
  billing_model       TEXT NOT NULL DEFAULT 'card'
                      CHECK (billing_model IN ('card','invoice')),
  /* Free-form contact + address. */
  primary_contact     TEXT,
  primary_phone       TEXT,
  primary_email       TEXT,
  address             TEXT,
  /* Soft-delete + audit. */
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organizations_sector_idx   ON public.organizations (sector);
CREATE INDEX IF NOT EXISTS organizations_country_idx  ON public.organizations (country_code);


-- ----------------------------------------------------------------------------
-- 2. organization_members
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('owner','approver','requester','viewer')),
  /* Optional department scope — null means org-wide. */
  department_id   UUID,
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at       TIMESTAMPTZ,
  /* Soft-revoke. */
  revoked_at      TIMESTAMPTZ,
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_members_user_idx
  ON public.organization_members (user_id);


-- ----------------------------------------------------------------------------
-- 3. departments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  cost_center     TEXT,
  /* Monthly budget cap (null = unlimited). The booking flow checks
   * this before submitting an invoice-billed booking. */
  monthly_budget  NUMERIC(12,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_department_fk
  FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED
  NOT VALID;


-- ----------------------------------------------------------------------------
-- 4. organization_contracts
-- ----------------------------------------------------------------------------
-- Framework agreement pricing — discount % off the public rate, or
-- absolute hourly rate caps for high-volume customers.
CREATE TABLE IF NOT EXISTS public.organization_contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  /* Discount percentage (0–1) applied to the customer-facing total
   * before commission. Mutually exclusive with hourly_cap_usd. */
  discount_pct        NUMERIC(4,3) CHECK (discount_pct IS NULL OR discount_pct BETWEEN 0 AND 0.5),
  hourly_cap_usd      NUMERIC(10,2),
  /* Pre-approved provider tier minimum — dispatch refuses
   * sub-tier providers for this org's bookings. */
  min_provider_tier   TEXT CHECK (min_provider_tier IS NULL OR min_provider_tier IN
                       ('silver','silver_plus','gold','gold_pro','elite')),
  /* Validity window. */
  starts_at           DATE,
  expires_at          DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------------------
-- 5. relocation_requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.relocation_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_id         UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  contract_id           UUID REFERENCES public.organization_contracts(id) ON DELETE SET NULL,
  requested_by_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  /* Brief — stored as JSONB so the shape can vary (single move /
   * group cohort / lab equipment / framework draw-down). */
  brief                 JSONB NOT NULL DEFAULT '{}'::JSONB,
  /* Routing segment matches find_eligible_providers_for_segment. */
  segment               TEXT NOT NULL CHECK (segment IN (
    'corporate','enterprise','university','municipal','government'
  )),
  country               TEXT NOT NULL,
  city                  TEXT,
  /* Workflow status. */
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'submitted',     -- awaiting approver review
    'approved',      -- routed to providers
    'rejected',
    'dispatched',    -- provider matched
    'completed',
    'cancelled'
  )),
  /* Estimated cost in the org's billing currency (set by the
   * pricing engine at submission time; admins can override). */
  estimated_total       NUMERIC(12,2),
  approved_by_user_id   UUID,
  approved_at           TIMESTAMPTZ,
  dispatched_booking_id UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relocation_requests_org_idx     ON public.relocation_requests (organization_id);
CREATE INDEX IF NOT EXISTS relocation_requests_status_idx  ON public.relocation_requests (status);
CREATE INDEX IF NOT EXISTS relocation_requests_segment_idx ON public.relocation_requests (segment);


-- ----------------------------------------------------------------------------
-- 6. relocation_request_approvals — audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.relocation_request_approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id        UUID NOT NULL REFERENCES public.relocation_requests(id) ON DELETE CASCADE,
  actor_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action            TEXT NOT NULL CHECK (action IN (
    'submitted','approved','rejected','reopened','cancelled','comment'
  )),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relocation_request_approvals_request_idx
  ON public.relocation_request_approvals (request_id, created_at);


-- ----------------------------------------------------------------------------
-- 7. organization_invoices
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  /* Billing period (month). */
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  /* Per-department breakdown stored as JSONB so reporting can drill
   * down without a join. */
  department_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
  total_amount      NUMERIC(12,2) NOT NULL,
  currency          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','issued','paid','overdue','disputed','void'
  )),
  /* External invoice number for the customer's accounting system. */
  external_ref      TEXT,
  due_at            DATE,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_invoices_org_idx ON public.organization_invoices (organization_id, period_start DESC);


-- ----------------------------------------------------------------------------
-- Touch-updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organizations_updated_at ON public.organizations;
CREATE TRIGGER organizations_updated_at  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_organizations_updated_at();

DROP TRIGGER IF EXISTS relocation_requests_updated_at ON public.relocation_requests;
CREATE TRIGGER relocation_requests_updated_at  BEFORE UPDATE ON public.relocation_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_organizations_updated_at();


-- ----------------------------------------------------------------------------
-- Membership helper — quick auth.uid() check
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(p_org UUID, p_role TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_org
      AND user_id          = auth.uid()
      AND revoked_at IS NULL
      AND (p_role IS NULL OR role = p_role)
  );
$$;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.organizations                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_contracts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relocation_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relocation_request_approvals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invoices          ENABLE ROW LEVEL SECURITY;

-- Organizations — members see their own; admins see all.
DROP POLICY IF EXISTS organizations_member_read ON public.organizations;
DROP POLICY IF EXISTS organizations_admin_all   ON public.organizations;
CREATE POLICY organizations_member_read
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(id) OR public.is_admin());
CREATE POLICY organizations_admin_all
  ON public.organizations FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Members — members see fellow members; owners can write.
DROP POLICY IF EXISTS organization_members_member_read ON public.organization_members;
DROP POLICY IF EXISTS organization_members_owner_write ON public.organization_members;
CREATE POLICY organization_members_member_read
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY organization_members_owner_write
  ON public.organization_members FOR ALL TO authenticated
  USING (public.is_org_member(organization_id, 'owner') OR public.is_admin())
  WITH CHECK (public.is_org_member(organization_id, 'owner') OR public.is_admin());

-- Departments + contracts + invoices — members read; owners write.
DROP POLICY IF EXISTS departments_member_read ON public.departments;
DROP POLICY IF EXISTS departments_owner_write ON public.departments;
CREATE POLICY departments_member_read
  ON public.departments FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY departments_owner_write
  ON public.departments FOR ALL TO authenticated
  USING (public.is_org_member(organization_id, 'owner') OR public.is_admin())
  WITH CHECK (public.is_org_member(organization_id, 'owner') OR public.is_admin());

DROP POLICY IF EXISTS organization_contracts_member_read ON public.organization_contracts;
DROP POLICY IF EXISTS organization_contracts_admin_write ON public.organization_contracts;
CREATE POLICY organization_contracts_member_read
  ON public.organization_contracts FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY organization_contracts_admin_write
  ON public.organization_contracts FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS organization_invoices_member_read ON public.organization_invoices;
CREATE POLICY organization_invoices_member_read
  ON public.organization_invoices FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_admin());

-- Relocation requests — requesters insert + read own org's; approvers
-- can update status; viewers read.
DROP POLICY IF EXISTS relocation_requests_member_read   ON public.relocation_requests;
DROP POLICY IF EXISTS relocation_requests_member_insert ON public.relocation_requests;
DROP POLICY IF EXISTS relocation_requests_approver_update ON public.relocation_requests;
CREATE POLICY relocation_requests_member_read
  ON public.relocation_requests FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_admin());
CREATE POLICY relocation_requests_member_insert
  ON public.relocation_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, 'requester')
           OR public.is_org_member(organization_id, 'owner')
           OR public.is_admin());
CREATE POLICY relocation_requests_approver_update
  ON public.relocation_requests FOR UPDATE TO authenticated
  USING (public.is_org_member(organization_id, 'approver')
       OR public.is_org_member(organization_id, 'owner')
       OR public.is_admin())
  WITH CHECK (public.is_org_member(organization_id, 'approver')
       OR public.is_org_member(organization_id, 'owner')
       OR public.is_admin());

DROP POLICY IF EXISTS relocation_request_approvals_member_read ON public.relocation_request_approvals;
DROP POLICY IF EXISTS relocation_request_approvals_member_insert ON public.relocation_request_approvals;
CREATE POLICY relocation_request_approvals_member_read
  ON public.relocation_request_approvals FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.relocation_requests r
             WHERE r.id = relocation_request_approvals.request_id
               AND (public.is_org_member(r.organization_id) OR public.is_admin()))
  );
CREATE POLICY relocation_request_approvals_member_insert
  ON public.relocation_request_approvals FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.relocation_requests r
       WHERE r.id = relocation_request_approvals.request_id
         AND (public.is_org_member(r.organization_id) OR public.is_admin())
    )
  );

GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, TEXT) TO authenticated;
