-- ============================================================================
-- FlyttGo — newsletter_subscribers table for the subscribe-newsletter
-- edge function (wired from the ExitIntentModal).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  source      TEXT,
  locale      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_created_at_idx
  ON public.newsletter_subscribers (created_at DESC);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_subscribers_admin_read ON public.newsletter_subscribers;

-- Inserts come from the edge function (service-role bypass), so no INSERT
-- policy is needed. Admins can read for marketing exports.
CREATE POLICY newsletter_subscribers_admin_read
  ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.is_admin());
