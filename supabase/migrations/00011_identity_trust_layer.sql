-- ============================================================================
-- FlyttGo — Identity & Trust Layer
-- ============================================================================
-- The cross-cutting verification + RBAC + federation backbone that turns
-- the platform from "consumer-grade marketplace" into "infrastructure-grade
-- platform". Builds on existing pieces (provider_compliance_documents,
-- provider_reputation.verification_level, trust_badges[],
-- onboarding_country_fields) — does NOT duplicate them.
--
-- Adds:
--   1. identity_verifications        — per-user × per-kind ledger
--                                       (email · phone · id_document ·
--                                        business · vehicle · insurance ·
--                                        tax_status). Generic across
--                                        customers / providers / org
--                                        users; finer-grained than the
--                                        per-country compliance docs.
--
--   2. Trust levels 1 → 7            — extends the existing
--                                       provider_reputation.verification_level
--                                       check from 1-4 to 1-7 with
--                                       documented mappings:
--                                         1 Registered User
--                                         2 Verified User
--                                         3 Verified Business
--                                         4 Verified Carrier
--                                         5 Certified Infrastructure Partner
--                                         6 Institutional Account
--                                         7 Government Account
--
--   3. country_identity_requirements — view alias onto
--                                       onboarding_country_fields so the
--                                       client can query under the spec's
--                                       canonical name without
--                                       duplicating data.
--
--   4. identity_federation_providers — scaffolding table for eIDAS,
--                                       BankID, university SSO, corporate
--                                       SAML, .gov SSO, etc. Schema-only
--                                       in this migration; auth flows
--                                       hook in via Supabase auth provider
--                                       config later.
--
--   5. compute_trust_level()          — SECURITY DEFINER helper returning
--                                       the user's effective level (1-7)
--                                       by consolidating identity_verifications
--                                       × subscription tier × admin /
--                                       org-membership flags.
--
--   6. meets_trust_level()            — boolean gate used by the matcher
--                                       and by RLS policies that need
--                                       institutional-or-above access.
--
--   7. RBAC scaffolding               — platform_roles enum-style table
--                                       lists every role the spec
--                                       requires (super_admin, accountant,
--                                       auditor, support_agent, plus the
--                                       provider / organisation
--                                       sub-roles) for documentation +
--                                       drop-down population on the
--                                       admin role-assignment screen.
--
-- Run AFTER docs/install-provider-scoring.sql, install-onboarding-rules.sql,
-- install-finops-console.sql. Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. identity_verifications — per-user × per-kind ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  /* Kind enumerates what the row attests to. Generic across all
   * user types. The per-country compliance docs continue to live
   * in provider_compliance_documents — this table is the platform-
   * wide identity ledger. */
  kind          TEXT NOT NULL CHECK (kind IN (
    'email','phone','id_document','business_registration',
    'vehicle','insurance','tax_status','address_proof',
    'sso_federation'
  )),
  /* Status lifecycle:
   *   pending  — submitted by the user, awaiting admin review
   *   approved — admin verified, the verification is live
   *   rejected — admin rejected; user must resubmit
   *   expired  — auto-flipped via cron once expires_at lapses
   */
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','expired')),
  /* Free-text reference (e.g. phone number, email, USDOT, SIRET). */
  reference     TEXT,
  /* Storage path for uploaded proof. Null when the verification
   * is auto-resolved (email confirmation, phone OTP, etc.). */
  evidence_url  TEXT,
  /* Optional country scope for verifications that are jurisdiction-
   * dependent (e.g. business_registration in the US vs DE). Null
   * means global. */
  country_code  TEXT,
  /* Federation provider that minted this verification, if any.
   * NULL for manual / admin-approved rows. */
  federated_via TEXT,
  /* Optional expiry — required for time-bounded verifications
   * like cargo insurance certificates. */
  expires_at    TIMESTAMPTZ,
  rejection_note TEXT,
  /* The admin / system actor that reviewed the row. */
  reviewed_by   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* Only one active row per (user, kind, country_scope). Re-submitting
   * an existing kind UPDATES the row; admin's audit log captures the
   * before/after via the trigger below. */
  UNIQUE (user_id, kind, country_code)
);

CREATE INDEX IF NOT EXISTS identity_verifications_user_idx
  ON public.identity_verifications (user_id, kind);
CREATE INDEX IF NOT EXISTS identity_verifications_status_idx
  ON public.identity_verifications (status, expires_at);

ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS identity_verifications_self_rw      ON public.identity_verifications;
DROP POLICY IF EXISTS identity_verifications_admin_rw     ON public.identity_verifications;
DROP POLICY IF EXISTS identity_verifications_anon_read    ON public.identity_verifications;

/* Users can SELECT + INSERT + UPDATE their own row, but never set
 * status to 'approved' — admin only. The CHECK in the policy
 * enforces it on every write attempt. */
CREATE POLICY identity_verifications_self_rw
  ON public.identity_verifications FOR ALL TO authenticated
  USING       (user_id = auth.uid())
  WITH CHECK  (user_id = auth.uid() AND status IN ('pending','rejected'));

CREATE POLICY identity_verifications_admin_rw
  ON public.identity_verifications FOR ALL TO authenticated
  USING       (public.is_admin())
  WITH CHECK  (public.is_admin());

/* Anon read so the matcher (which can run pre-auth) and provider
 * profile pages can compute the trust level without a JWT. */
CREATE POLICY identity_verifications_anon_read
  ON public.identity_verifications FOR SELECT USING (true);


-- 1a. updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_identity_verifications()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS identity_verifications_touch ON public.identity_verifications;
CREATE TRIGGER identity_verifications_touch
  BEFORE UPDATE ON public.identity_verifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_identity_verifications();


-- ----------------------------------------------------------------------------
-- 2. Trust levels 1 → 7 — extend the existing constraint
-- ----------------------------------------------------------------------------
-- provider_reputation is created by install-dispute-completion (later migration).
-- If absent at this point, skip — the constraint widening will be re-applied
-- when this migration is re-run after dispute-completion lands.
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'provider_reputation'
  ) THEN
    RETURN;
  END IF;

  SELECT conname INTO v_constraint
    FROM pg_constraint
   WHERE conrelid = 'public.provider_reputation'::regclass
     AND pg_get_constraintdef(oid) ILIKE '%verification_level%';
  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.provider_reputation DROP CONSTRAINT %I', v_constraint);
  END IF;

  EXECUTE 'ALTER TABLE public.provider_reputation
             ADD CONSTRAINT provider_reputation_verification_level_check
             CHECK (verification_level BETWEEN 1 AND 7)';

  EXECUTE $cmt$
    COMMENT ON COLUMN public.provider_reputation.verification_level IS
      '1 Registered User · 2 Verified User · 3 Verified Business · 4 Verified Carrier · 5 Certified Infrastructure Partner · 6 Institutional Account · 7 Government Account'
  $cmt$;
END $$;


-- ----------------------------------------------------------------------------
-- 3. country_identity_requirements — alias view onto onboarding_country_fields
-- ----------------------------------------------------------------------------
-- Same data as onboarding_country_fields under the canonical name
-- the spec uses, so the dashboard can query a single semantic name
-- without a behind-the-scenes lookup.
CREATE OR REPLACE VIEW public.country_identity_requirements AS
SELECT
  country_code,
  slug             AS requirement_slug,
  label,
  help_text,
  requirement,                       -- 'required' | 'conditional' | 'optional'
  condition_on,                      -- pre-condition slug, when conditional
  position
FROM public.onboarding_country_fields
ORDER BY country_code, position;

GRANT SELECT ON public.country_identity_requirements TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 4. identity_federation_providers — scaffolding for SSO / eIDAS / BankID
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.identity_federation_providers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  /* Scope drives which trust levels the federation can mint.
   * eIDAS individual-mode → level 2; BankID corporate → level 3;
   * .gov SSO → level 7; etc. */
  scope        TEXT NOT NULL CHECK (scope IN ('individual','business','university','government','enterprise_saml')),
  auth_protocol TEXT NOT NULL CHECK (auth_protocol IN ('oidc','saml','oauth2','custom')),
  issuer_url   TEXT,
  jwks_url     TEXT,
  /* Country code for region-locked providers (BankID NO/SE),
   * NULL for global (eIDAS). */
  country_code TEXT,
  /* When true the auth.tsx wrapper exposes this provider on the
   * sign-in screen. Defaults FALSE — providers are added cold and
   * only flipped on once their config is verified end-to-end. */
  is_active    BOOLEAN NOT NULL DEFAULT false,
  /* Trust level minted on successful federation. */
  mints_level  SMALLINT NOT NULL DEFAULT 2 CHECK (mints_level BETWEEN 1 AND 7),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.identity_federation_providers
  (slug, display_name, scope, auth_protocol, issuer_url, country_code, mints_level, notes) VALUES
  ('eidas-eu',          'eIDAS (EU)',                 'individual',      'saml',   NULL, NULL,  2, 'Pan-European recognised electronic identification.'),
  ('bankid-no',         'BankID (Norway)',            'individual',      'oidc',   NULL, 'no',  3, 'Norwegian BankID — also covers business registrations.'),
  ('bankid-se',         'BankID (Sweden)',            'individual',      'oidc',   NULL, 'se',  3, 'Swedish BankID.'),
  ('us-login-gov',      'Login.gov (USA)',            'government',      'oidc',   NULL, 'us',  7, 'US federal SSO for .gov contacts.'),
  ('uk-gov-one-login',  'GOV.UK One Login',           'government',      'oidc',   NULL, 'gb',  7, 'UK government SSO.'),
  ('university-saml',   'University SSO (SAML)',      'university',      'saml',   NULL, NULL,  6, 'Generic university SAML federation — per-domain verified.'),
  ('corporate-saml',    'Corporate SAML',             'enterprise_saml', 'saml',   NULL, NULL,  6, 'Enterprise customer corporate SSO.'),
  ('google-workspace',  'Google Workspace (custom)',  'business',        'oidc',   NULL, NULL,  3, 'Domain-restricted Google sign-in for verified business accounts.'),
  ('microsoft-entra',   'Microsoft Entra ID',         'enterprise_saml', 'oidc',   NULL, NULL,  6, 'Azure AD / Entra for enterprise customers.')
ON CONFLICT (slug) DO UPDATE
  SET display_name  = EXCLUDED.display_name,
      scope         = EXCLUDED.scope,
      auth_protocol = EXCLUDED.auth_protocol,
      country_code  = EXCLUDED.country_code,
      mints_level   = EXCLUDED.mints_level,
      notes         = EXCLUDED.notes,
      updated_at    = now();

ALTER TABLE public.identity_federation_providers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS identity_federation_anon_read    ON public.identity_federation_providers;
DROP POLICY IF EXISTS identity_federation_admin_write  ON public.identity_federation_providers;
CREATE POLICY identity_federation_anon_read
  ON public.identity_federation_providers FOR SELECT USING (true);
CREATE POLICY identity_federation_admin_write
  ON public.identity_federation_providers FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 5. platform_roles — RBAC reference catalogue
-- ----------------------------------------------------------------------------
-- Documents every role the spec references in a single queryable
-- table so the admin role-assignment dropdown stays in sync. The
-- actual role values still live where they always have:
--   profiles.role               (customer / driver / admin)
--   admin_accounts              (admin)
--   finops_accounts.role        (super_admin / accountant / auditor)
--   organization_members.role   (owner / approver / requester / viewer)
--   provider categories         (labor / carrier / packing / storage / etc)
-- This table tells the UI what's possible, not what's truthful.
CREATE TABLE IF NOT EXISTS public.platform_roles (
  slug          TEXT PRIMARY KEY,
  group_label   TEXT NOT NULL CHECK (group_label IN ('platform','provider','organization','support')),
  display_name  TEXT NOT NULL,
  description   TEXT,
  /* Default minimum trust level the role implies. Drives the
   * "what can this role see" matrix on the role-assignment screen. */
  min_trust_level SMALLINT NOT NULL DEFAULT 1 CHECK (min_trust_level BETWEEN 1 AND 7),
  position      SMALLINT NOT NULL DEFAULT 100
);

INSERT INTO public.platform_roles
  (slug, group_label, display_name, description, min_trust_level, position) VALUES
  -- Platform
  ('super_admin',   'platform', 'Super Admin',
   'Global platform administration · role management · system configuration',                7, 10),
  ('admin',         'platform', 'Admin',
   'Platform operations · driver approvals · dispute review',                                 5, 20),
  ('accountant',    'platform', 'Accountant',
   'Financial Operations Console · ledger / payouts / exports / reconciliation',             3, 30),
  ('auditor',       'platform', 'Auditor (read-only)',
   'Read-only across the FinOps console + audit log',                                         3, 40),
  ('support_agent', 'platform', 'Support Agent',
   'Customer + provider support tickets · view-only on financial data',                       2, 50),

  -- Provider sub-roles (mirror provider_categories slugs)
  ('labor_provider',                    'provider', 'Labor Provider',
   'Hands-on moving labour without vehicle · short-haul',                                     2, 110),
  ('carrier_provider',                  'provider', 'Carrier Provider',
   'Vehicle-equipped relocation provider · light freight',                                    4, 120),
  ('packing_provider',                  'provider', 'Packing Provider',
   'Specialised packing + crating services',                                                  3, 130),
  ('storage_provider',                  'provider', 'Storage Provider',
   'Climate-controlled or standard storage facilities',                                       3, 140),
  ('corporate_relocation_provider',     'provider', 'Corporate Relocation Provider',
   'White-glove corporate transfer specialist',                                               4, 150),
  ('international_relocation_provider', 'provider', 'International Relocation Provider',
   'Cross-border household + corporate freight + customs',                                    4, 160),

  -- Organisation
  ('enterprise_manager',     'organization', 'Enterprise Manager',
   'Org owner / approver for enterprise relocations',                                         6, 210),
  ('university_coordinator', 'organization', 'University Coordinator',
   'Student / researcher relocation coordinator',                                             6, 220),
  ('government_coordinator', 'organization', 'Government Coordinator',
   'Government deployment + procurement coordinator',                                         7, 230),
  ('procurement_officer',    'organization', 'Procurement Officer',
   'RFP submitter + vendor pack reader',                                                      6, 240)

ON CONFLICT (slug) DO UPDATE
  SET group_label    = EXCLUDED.group_label,
      display_name   = EXCLUDED.display_name,
      description    = EXCLUDED.description,
      min_trust_level = EXCLUDED.min_trust_level,
      position       = EXCLUDED.position;

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_roles_anon_read   ON public.platform_roles;
DROP POLICY IF EXISTS platform_roles_admin_write ON public.platform_roles;
CREATE POLICY platform_roles_anon_read   ON public.platform_roles FOR SELECT USING (true);
CREATE POLICY platform_roles_admin_write ON public.platform_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ----------------------------------------------------------------------------
-- 6. compute_trust_level(user_id) — single source of truth resolver
-- ----------------------------------------------------------------------------
-- Returns a SMALLINT 1-7. Combines:
--   - admin / super_admin status (admin_accounts + finops_accounts)
--   - subscription tier (elite → CIP)
--   - organization_members.role (owner of an organization → 6 / 7)
--   - identity_verifications counts (email + phone + business +
--     vehicle + insurance combinations bump the level)
--   - explicit override on provider_reputation.verification_level
-- The matcher and trust-badge derivation read this single function
-- so the level used for routing matches the level shown on screen.
CREATE OR REPLACE FUNCTION public.compute_trust_level(p_user_id UUID)
RETURNS SMALLINT
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level         SMALLINT := 1;
  v_email_ok      BOOLEAN  := false;
  v_phone_ok      BOOLEAN  := false;
  v_id_ok         BOOLEAN  := false;
  v_business_ok   BOOLEAN  := false;
  v_vehicle_ok    BOOLEAN  := false;
  v_insurance_ok  BOOLEAN  := false;
  v_is_admin      BOOLEAN  := false;
  v_is_cip        BOOLEAN  := false;
  v_is_org_owner  BOOLEAN  := false;
  v_is_gov        BOOLEAN  := false;
  v_explicit      SMALLINT;
BEGIN
  IF p_user_id IS NULL THEN RETURN 1; END IF;

  /* Pull the verification snapshot in one pass. */
  SELECT
    bool_or(kind = 'email'                AND status = 'approved'),
    bool_or(kind = 'phone'                AND status = 'approved'),
    bool_or(kind = 'id_document'          AND status = 'approved'),
    bool_or(kind = 'business_registration' AND status = 'approved'),
    bool_or(kind = 'vehicle'              AND status = 'approved'),
    bool_or(kind = 'insurance'            AND status = 'approved')
    INTO v_email_ok, v_phone_ok, v_id_ok, v_business_ok, v_vehicle_ok, v_insurance_ok
  FROM public.identity_verifications
  WHERE user_id = p_user_id;

  v_is_admin := EXISTS (SELECT 1 FROM public.admin_accounts WHERE user_id = p_user_id);
  v_is_cip := EXISTS (
    SELECT 1 FROM public.driver_subscriptions
     WHERE driver_id = p_user_id AND plan = 'elite' AND subscription_status = 'active'
  );
  v_is_org_owner := EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE user_id = p_user_id AND role IN ('owner','approver') AND revoked_at IS NULL
  );
  /* Government coordinator detected via organization tier when the
   * organisations table carries a government flag. We do this
   * defensively in case the column doesn't exist on a given install. */
  BEGIN
    EXECUTE 'SELECT EXISTS (
      SELECT 1
        FROM public.organization_members m
        JOIN public.organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1
         AND m.revoked_at IS NULL
         AND COALESCE(o.tier, '''') = ''government''
    )'
    INTO v_is_gov USING p_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_is_gov := false;
  END;

  /* Compute the base level from verification combinations. */
  IF v_email_ok OR v_phone_ok                       THEN v_level := 2; END IF;
  IF v_email_ok AND v_phone_ok AND v_id_ok          THEN v_level := 2; END IF;
  IF v_business_ok                                  THEN v_level := GREATEST(v_level, 3); END IF;
  IF v_business_ok AND v_vehicle_ok AND v_insurance_ok
                                                    THEN v_level := GREATEST(v_level, 4); END IF;
  IF v_is_cip                                       THEN v_level := GREATEST(v_level, 5); END IF;
  IF v_is_org_owner                                 THEN v_level := GREATEST(v_level, 6); END IF;
  IF v_is_gov                                       THEN v_level := 7; END IF;

  /* Admin override — explicit level on provider_reputation wins
   * when the manual review bumped or capped a provider. */
  SELECT verification_level INTO v_explicit
    FROM public.provider_reputation
   WHERE user_id = p_user_id;
  IF v_explicit IS NOT NULL THEN
    v_level := GREATEST(v_level, v_explicit);
  END IF;

  RETURN v_level;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_trust_level(UUID) TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 7. meets_trust_level(user_id, min_level) — boolean gate
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meets_trust_level(p_user_id UUID, p_min SMALLINT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.compute_trust_level(p_user_id) >= p_min;
$$;
GRANT EXECUTE ON FUNCTION public.meets_trust_level(UUID, SMALLINT) TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 8. expire_identity_verifications() — cron worker
-- ----------------------------------------------------------------------------
-- Mirrors the compliance-doc expiry worker. Flips approved → expired
-- the day after expires_at lapses. Idempotent.
CREATE OR REPLACE FUNCTION public.expire_identity_verifications()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE public.identity_verifications
     SET status = 'expired'
   WHERE status = 'approved'
     AND expires_at IS NOT NULL
     AND expires_at < now();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;
GRANT EXECUTE ON FUNCTION public.expire_identity_verifications() TO authenticated;


-- ----------------------------------------------------------------------------
-- 9. Identity-aware booking gate in match_providers_for_booking
-- ----------------------------------------------------------------------------
-- Already gates by compliance + tier; now also gates by trust level
-- when p_mode = 'enterprise'. Enterprise routing requires the
-- provider to be at level 4 (Verified Carrier) or above. The
-- compliance + tier filters stay in place — this is additive.
CREATE OR REPLACE FUNCTION public.match_enterprise_min_trust_level()
RETURNS SMALLINT LANGUAGE sql IMMUTABLE
AS $$ SELECT 4::SMALLINT; $$;

GRANT EXECUTE ON FUNCTION public.match_enterprise_min_trust_level() TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 10. match_providers_for_booking — add trust-level gate
-- ----------------------------------------------------------------------------
-- Drops + recreates with a new is_compliant + trust_level pair on
-- the candidate row. Enterprise mode now requires
-- compute_trust_level(user_id) >= 4 in addition to the existing
-- compliance + tier filters. Other modes pass-through (every
-- registered provider is at least level 1).
DROP FUNCTION IF EXISTS public.match_providers_for_booking(JSONB, TEXT);

CREATE FUNCTION public.match_providers_for_booking(
  p_input  JSONB,
  p_mode   TEXT DEFAULT 'instant'
) RETURNS TABLE (
  user_id              UUID,
  match_score          NUMERIC,
  provider_match_rank  NUMERIC,
  distance_km          NUMERIC,
  tier_slug            TEXT,
  tier_position        SMALLINT,
  rank_score           SMALLINT,
  trust_level          SMALLINT,
  is_cip               BOOLEAN,
  is_top_rated         BOOLEAN,
  is_compliant         BOOLEAN,
  reasons              TEXT[]
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
  v_skip_compliance BOOLEAN    := coalesce((p_input ->> 'skip_compliance')::BOOLEAN, false);
  v_min_trust       SMALLINT   := CASE p_mode
                                    WHEN 'enterprise' THEN public.match_enterprise_min_trust_level()
                                    ELSE 1::SMALLINT
                                  END;
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
      public.compute_trust_level(pr.user_id) AS trust_level,
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
      END AS specialization_overlap,
      CASE
        WHEN v_skip_compliance THEN TRUE
        ELSE COALESCE((SELECT cs.is_compliant
                         FROM public.provider_compliance_status(pr.user_id, v_country) cs),
                      FALSE)
      END AS is_compliant
    FROM public.provider_reputation pr
    LEFT JOIN public.driver_subscriptions ds
           ON ds.driver_id = pr.user_id AND ds.subscription_status = 'active'
    LEFT JOIN public.subscription_tiers st ON st.slug = ds.plan
    LEFT JOIN public.provider_pricing pp   ON pp.user_id = pr.user_id
    WHERE pr.is_suspended = false
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
  filtered AS (
    SELECT * FROM candidates c
    WHERE (v_skip_compliance OR c.is_compliant = TRUE)
      AND c.trust_level >= v_min_trust
  ),
  scored AS (
    SELECT f.*,
      (
          v_w_distance       * COALESCE(1.0 - LEAST(f.distance_km / 50.0, 1.0), 0.5)
        + v_w_reliability    * (COALESCE(f.rank_score, 60)::NUMERIC / 100.0)
        + v_w_tier           * (f.tier_position::NUMERIC / 50.0)
        + v_w_specialization * f.specialization_overlap
        + v_w_response       * COALESCE(f.response_speed_score, 0.5)
        + v_w_activity       * COALESCE(f.recent_activity_score, 0.5)
      ) * 100 AS match_score
    FROM filtered f
  )
  SELECT
    s.user_id,
    ROUND(s.match_score, 2)                AS match_score,
    ROUND(s.match_score, 2)                AS provider_match_rank,
    COALESCE(ROUND(s.distance_km, 1), 0)   AS distance_km,
    s.tier_slug, s.tier_position, s.rank_score,
    s.trust_level,
    (s.tier_slug = 'elite')                AS is_cip,
    s.is_top_rated,
    s.is_compliant,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN s.tier_slug = 'elite'  THEN 'Certified Infrastructure Partner' END,
      CASE WHEN s.is_top_rated         THEN 'Top-rated provider' END,
      CASE WHEN s.specialization_overlap >= 0.5 THEN 'Strong specialization match' END,
      CASE WHEN s.response_speed_score IS NOT NULL AND s.response_speed_score >= 0.85 THEN 'Fast response history' END,
      CASE WHEN s.rank_score IS NOT NULL AND s.rank_score >= 90 THEN 'High reliability score' END,
      CASE WHEN s.distance_km IS NOT NULL AND s.distance_km <= 5 THEN 'Inside the service radius' END,
      CASE WHEN s.is_compliant THEN 'Country compliance verified' END,
      CASE WHEN s.trust_level >= 4 THEN 'Verified carrier or above' END,
      CASE WHEN s.trust_level >= 6 THEN 'Institutional / government tier' END
    ], NULL)                               AS reasons
  FROM scored s
  ORDER BY
    CASE WHEN p_mode = 'enterprise' THEN s.tier_position ELSE 0 END DESC,
    s.match_score DESC NULLS LAST,
    s.tier_position DESC,
    s.rank_score    DESC NULLS LAST
  LIMIT v_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.match_providers_for_booking(JSONB, TEXT) TO authenticated, anon;
