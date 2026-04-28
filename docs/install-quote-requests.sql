-- ============================================================================
-- FlyttGo — Quote-approval workflow
-- ============================================================================
-- Implements the spec's Step 3 — provider confirmation — for moves
-- that don't fit the instant-booking flow:
--
--   - long-distance / interstate
--   - international relocation
--   - corporate relocation
--   - any move where the customer wants competing quotes vs accepting
--     the platform-calculated estimate
--
-- Two-table model:
--   1. quote_requests — customer brief (origin / destination / move
--                        details) created when the customer hits "Request
--                        quotes" instead of "Book now".
--   2. provider_quotes — providers' bids on a request: amount,
--                        deposit %, validity window, optional notes.
--
-- The customer reviews the quotes received, picks a winner, and the
-- accepted quote is converted into a booking with a known final
-- price. Existing escrow + commission machinery in process-payment
-- then settles as usual.
--
-- Run AFTER docs/install-pricing-engine.sql + install-country-profiles.sql.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. quote_requests — customer brief
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  /* Owner — the customer who created the request. RLS scopes
   * SELECT/UPDATE to user_id = auth.uid(). */
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  /* Country drives which providers see the request (paired with the
   * provider's country in their profile) and which currency the
   * quotes settle in. */
  country               TEXT NOT NULL,
  /* Service category the customer needs — matches provider_categories.slug
   * so we can fan the request out to providers in that lane only. */
  category              TEXT NOT NULL,
  /* Move brief. Free-form pickup / dropoff strings keep this table
   * portable across the addressless flows (international/corporate)
   * where structured-address data isn't always available. */
  pickup_address        TEXT NOT NULL,
  pickup_city           TEXT,
  dropoff_address       TEXT NOT NULL,
  dropoff_city          TEXT,
  move_date             DATE,
  /* JSON brief the customer fills in — bedrooms, special items,
   * stairs, expected hours, contact preference. Keeping this
   * unstructured is intentional; the brief shape varies by category. */
  brief                 JSONB NOT NULL DEFAULT '{}'::JSONB,
  /* Workflow status. */
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',          -- accepting provider quotes
    'quoting',       -- at least one provider quote received
    'accepted',      -- customer picked a winning quote
    'expired',       -- closed without acceptance
    'cancelled'      -- customer cancelled
  )),
  /* Optional accepted quote pointer — set when status = 'accepted'. */
  accepted_quote_id     UUID,
  /* Auto-expiry. Quotes are most useful while customer attention is
   * fresh; default 7 days. */
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_requests_user_idx        ON public.quote_requests (user_id);
CREATE INDEX IF NOT EXISTS quote_requests_country_idx     ON public.quote_requests (country);
CREATE INDEX IF NOT EXISTS quote_requests_status_idx      ON public.quote_requests (status);
CREATE INDEX IF NOT EXISTS quote_requests_expires_idx     ON public.quote_requests (expires_at)
  WHERE status IN ('open','quoting');


-- ----------------------------------------------------------------------------
-- 2. provider_quotes — provider responses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_quotes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  provider_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  /* Total quoted in the request's country currency. */
  amount_total        NUMERIC(12,2) NOT NULL CHECK (amount_total > 0),
  /* Deposit fraction (0-1). Default 0.20 — 20% deposit + 80% on
   * completion is the spec's recommended structure. */
  deposit_pct         NUMERIC(4,3) NOT NULL DEFAULT 0.20
                      CHECK (deposit_pct BETWEEN 0 AND 1),
  /* Free-form note — what's included, when crew is available,
   * caveats. */
  note                TEXT,
  /* Quote validity. Provider sets the window; defaults to 48h. */
  valid_until         TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '48 hours',
  /* Workflow status. */
  status              TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted',     -- waiting for customer
    'accepted',      -- customer picked this quote
    'declined',      -- customer picked another / rejected this
    'withdrawn',     -- provider pulled the quote before customer chose
    'expired'        -- valid_until passed without action
  )),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* One provider can only submit one active quote per request. */
  UNIQUE (request_id, provider_user_id)
);

CREATE INDEX IF NOT EXISTS provider_quotes_request_idx     ON public.provider_quotes (request_id);
CREATE INDEX IF NOT EXISTS provider_quotes_provider_idx    ON public.provider_quotes (provider_user_id);
CREATE INDEX IF NOT EXISTS provider_quotes_status_idx      ON public.provider_quotes (status);


-- ----------------------------------------------------------------------------
-- Touch-updated_at triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_quote_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_requests_updated_at ON public.quote_requests;
CREATE TRIGGER quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_quote_requests_updated_at();

CREATE OR REPLACE FUNCTION public.touch_provider_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS provider_quotes_updated_at ON public.provider_quotes;
CREATE TRIGGER provider_quotes_updated_at
  BEFORE UPDATE ON public.provider_quotes
  FOR EACH ROW EXECUTE FUNCTION public.touch_provider_quotes_updated_at();


-- ----------------------------------------------------------------------------
-- Acceptance helper — atomically marks the chosen quote as accepted,
-- rejects every sibling, and stamps the request.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_provider_quote(p_quote_id UUID)
RETURNS UUID                  -- returns request_id for the caller
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_owner      UUID;
BEGIN
  /* Auth gate — only the request owner may accept. */
  SELECT pq.request_id, qr.user_id
    INTO v_request_id, v_owner
  FROM provider_quotes pq
  JOIN quote_requests qr ON qr.id = pq.request_id
  WHERE pq.id = p_quote_id;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'quote_not_found';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  /* Atomic: mark winner accepted, others declined, request closed. */
  UPDATE provider_quotes
     SET status = 'accepted'
   WHERE id = p_quote_id;

  UPDATE provider_quotes
     SET status = 'declined'
   WHERE request_id = v_request_id
     AND id        <> p_quote_id
     AND status    = 'submitted';

  UPDATE quote_requests
     SET status            = 'accepted',
         accepted_quote_id = p_quote_id
   WHERE id = v_request_id;

  RETURN v_request_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.quote_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_quotes  ENABLE ROW LEVEL SECURITY;

-- quote_requests: customer reads/writes own; providers can SELECT
-- the open ones in their country (so the inbox surfaces them).
DROP POLICY IF EXISTS quote_requests_owner_all   ON public.quote_requests;
DROP POLICY IF EXISTS quote_requests_provider_read ON public.quote_requests;

CREATE POLICY quote_requests_owner_all
  ON public.quote_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Providers see open / quoting requests in any country — the
-- inbox UI filters down to their own country client-side.
-- (A future tightening: join provider_pricing to scope by country,
-- but that requires a security-definer wrapper to avoid the join
-- complicating the RLS predicate.)
CREATE POLICY quote_requests_provider_read
  ON public.quote_requests
  FOR SELECT TO authenticated
  USING (status IN ('open','quoting'));

-- provider_quotes: provider reads/writes their own; the request
-- owner can read every quote on their own request.
DROP POLICY IF EXISTS provider_quotes_provider_all  ON public.provider_quotes;
DROP POLICY IF EXISTS provider_quotes_owner_read    ON public.provider_quotes;

CREATE POLICY provider_quotes_provider_all
  ON public.provider_quotes
  FOR ALL TO authenticated
  USING (provider_user_id = auth.uid())
  WITH CHECK (provider_user_id = auth.uid());

CREATE POLICY provider_quotes_owner_read
  ON public.provider_quotes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests qr
       WHERE qr.id      = provider_quotes.request_id
         AND qr.user_id = auth.uid()
    )
  );

GRANT EXECUTE ON FUNCTION public.accept_provider_quote(UUID) TO authenticated;
