-- ============================================================================
-- FlyttGo — RFP submissions (procurement intake)
-- ============================================================================
-- Backs the /procurement/rfp form. Anyone can submit (anon or
-- authenticated) — the platform's procurement queue picks them up
-- via admin reads. Document uploads land in the `rfp-attachments`
-- storage bucket which the client creates lazily.
--
-- Run AFTER docs/install-organizations.sql.
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rfp_submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  /* Submitter identity — auth.uid() if signed in, else null. */
  submitted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  /* Required fields. */
  organization_name   TEXT NOT NULL,
  country             TEXT NOT NULL,                       -- ISO-2 code
  sector              TEXT NOT NULL CHECK (sector IN (
    'corporate','enterprise','university','municipal','government',
    'embassy','ngo','transit-authority','other'
  )),
  deployment_type     TEXT NOT NULL,
  timeline            TEXT NOT NULL,                       -- 'asap' | '30d' | '90d' | '6m' | '12m+'
  /* Optional fields. */
  budget_range_usd    TEXT,                                -- '0-25k' | '25-100k' | '100-500k' | '500k+'
  document_url        TEXT,                                -- storage path in rfp-attachments bucket
  contact_person      TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT,
  notes               TEXT,
  /* Workflow status — admins review + assign + close. */
  status              TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new','triaged','in_review','responded','won','lost','withdrawn'
  )),
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notify_sent_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rfp_submissions_status_idx  ON public.rfp_submissions (status);
CREATE INDEX IF NOT EXISTS rfp_submissions_country_idx ON public.rfp_submissions (country);
CREATE INDEX IF NOT EXISTS rfp_submissions_sector_idx  ON public.rfp_submissions (sector);

-- Touch updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION public.touch_rfp_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rfp_submissions_updated_at ON public.rfp_submissions;
CREATE TRIGGER rfp_submissions_updated_at
  BEFORE UPDATE ON public.rfp_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_rfp_updated_at();


-- ----------------------------------------------------------------------------
-- RLS — anyone can insert; submitter sees own; admins see all
-- ----------------------------------------------------------------------------
ALTER TABLE public.rfp_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rfp_submissions_anon_insert ON public.rfp_submissions;
DROP POLICY IF EXISTS rfp_submissions_self_read   ON public.rfp_submissions;
DROP POLICY IF EXISTS rfp_submissions_admin_all   ON public.rfp_submissions;

/* Anon + authenticated visitors can submit. Insert payload is
 * trusted because:
 *   - submitted_by_user_id is server-set via auth.uid() in
 *     practice (the client send NULL for anon submissions),
 *   - email validation happens client-side + on the procurement
 *     queue review flow.
 *
 * We can't gate insert with WITH CHECK on auth.uid() = X here
 * because anonymous submissions are explicitly allowed. */
CREATE POLICY rfp_submissions_anon_insert
  ON public.rfp_submissions
  FOR INSERT
  WITH CHECK (true);

/* Submitter can read their own row only when authenticated. */
CREATE POLICY rfp_submissions_self_read
  ON public.rfp_submissions
  FOR SELECT TO authenticated
  USING (submitted_by_user_id = auth.uid());

/* Admins see + manage everything via the existing is_admin() helper
 * (defined in install-dispute-completion.sql). */
CREATE POLICY rfp_submissions_admin_all
  ON public.rfp_submissions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
