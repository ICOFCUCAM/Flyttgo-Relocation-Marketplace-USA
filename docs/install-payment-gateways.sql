-- ============================================================================
-- FlyttGo — Multi-gateway adaptive payments
-- ============================================================================
-- Backs the typed gateway catalogue in lib/payment-gateways.ts. The
-- TypeScript module ships with curated rows so the picker works
-- client-side on day one; this migration creates the Supabase tables
-- so payment routing can switch source (TS curated → Supabase live)
-- with no code change.
--
-- ── Tables ──────────────────────────────────────────────────────────
--
--   payment_gateways          — gateway catalogue (Stripe, Flutterwave,
--                                Paystack, Razorpay, PayPal, M-Pesa direct)
--   payment_methods           — supported method catalogue (card, wallet,
--                                regional)
--   gateway_methods           — many-to-many: which methods each
--                                gateway can route
--   country_payment_routing   — per-country ranked gateway list
--   country_payment_fallback  — per-country fallback method
--
-- Run AFTER docs/install-pricing-engine.sql + install-country-profiles.sql.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. payment_gateways
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id                  SERIAL PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  blurb               TEXT,
  settlement          TEXT NOT NULL CHECK (settlement IN ('escrow','direct','hybrid')),
  /* ISO currency codes the gateway settles natively. */
  supports_currencies TEXT[] NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.payment_gateways (slug, name, blurb, settlement, supports_currencies) VALUES
  ('stripe',        'Stripe',
   'Card processing across US/EU/UK/Norway. Apple Pay + Google Pay built-in.',
   'escrow', ARRAY['USD','CAD','GBP','EUR','NOK','AED']),
  ('flutterwave',   'Flutterwave',
   'Pan-African card + bank-transfer rails. Naira / Cedi / Shilling settlement.',
   'escrow', ARRAY['NGN','KES','USD']),
  ('paystack',      'Paystack',
   'West-Africa-first. Card + USSD + bank transfer in NGN / GHS / ZAR.',
   'escrow', ARRAY['NGN','KES']),
  ('razorpay',      'Razorpay',
   'India-native. UPI / netbanking / card / wallet.',
   'escrow', ARRAY['INR']),
  ('paypal',        'PayPal',
   'Global fallback for cross-border bookings + buyer protection.',
   'escrow', ARRAY['USD','EUR','GBP','CAD','AED']),
  ('mpesa-direct',  'M-Pesa (Daraja)',
   'Safaricom Daraja STK push. Lowest take rate in Kenya.',
   'escrow', ARRAY['KES'])
ON CONFLICT (slug) DO UPDATE
  SET name                = EXCLUDED.name,
      blurb               = EXCLUDED.blurb,
      settlement          = EXCLUDED.settlement,
      supports_currencies = EXCLUDED.supports_currencies,
      updated_at          = now();


-- ----------------------------------------------------------------------------
-- 2. payment_methods
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  /* Display category — drives the picker's icon + grouping. */
  category      TEXT NOT NULL CHECK (category IN ('card','wallet','regional','invoice')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.payment_methods (slug, label, category) VALUES
  ('card-visa',                  'Visa',                       'card'),
  ('card-mastercard',            'Mastercard',                 'card'),
  ('card-amex',                  'American Express',           'card'),
  ('apple-pay',                  'Apple Pay',                  'wallet'),
  ('google-pay',                 'Google Pay',                 'wallet'),
  ('paypal',                     'PayPal',                     'wallet'),
  ('mpesa',                      'M-Pesa (STK push)',          'regional'),
  ('flutterwave-bank-transfer',  'Bank transfer · Flutterwave','regional'),
  ('paystack-bank-transfer',     'Bank transfer · Paystack',   'regional'),
  ('upi',                        'UPI',                        'regional'),
  ('razorpay-netbanking',        'Net banking · Razorpay',     'regional'),
  ('invoice',                    'Corporate invoice',          'invoice')
ON CONFLICT (slug) DO UPDATE
  SET label      = EXCLUDED.label,
      category   = EXCLUDED.category,
      updated_at = now();


-- ----------------------------------------------------------------------------
-- 3. gateway_methods — many-to-many
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gateway_methods (
  id            SERIAL PRIMARY KEY,
  gateway_slug  TEXT NOT NULL REFERENCES public.payment_gateways(slug) ON DELETE CASCADE,
  method_slug   TEXT NOT NULL REFERENCES public.payment_methods(slug)  ON DELETE CASCADE,
  position      SMALLINT NOT NULL DEFAULT 100,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gateway_slug, method_slug)
);

INSERT INTO public.gateway_methods (gateway_slug, method_slug, position) VALUES
  -- Stripe
  ('stripe',       'card-visa',                  10),
  ('stripe',       'card-mastercard',            20),
  ('stripe',       'card-amex',                  30),
  ('stripe',       'apple-pay',                  40),
  ('stripe',       'google-pay',                 50),
  -- Flutterwave
  ('flutterwave',  'card-visa',                  10),
  ('flutterwave',  'card-mastercard',            20),
  ('flutterwave',  'flutterwave-bank-transfer',  30),
  ('flutterwave',  'mpesa',                      40),
  -- Paystack
  ('paystack',     'card-visa',                  10),
  ('paystack',     'card-mastercard',            20),
  ('paystack',     'paystack-bank-transfer',     30),
  -- Razorpay
  ('razorpay',     'card-visa',                  10),
  ('razorpay',     'card-mastercard',            20),
  ('razorpay',     'upi',                        30),
  ('razorpay',     'razorpay-netbanking',        40),
  -- PayPal
  ('paypal',       'paypal',                     10),
  -- M-Pesa direct
  ('mpesa-direct', 'mpesa',                      10)
ON CONFLICT (gateway_slug, method_slug) DO UPDATE
  SET position   = EXCLUDED.position,
      updated_at = now();


-- ----------------------------------------------------------------------------
-- 4. country_payment_routing
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.country_payment_routing (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL,
  gateway_slug  TEXT NOT NULL REFERENCES public.payment_gateways(slug) ON DELETE CASCADE,
  position      SMALLINT NOT NULL,                -- 1 = preferred
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, gateway_slug)
);

CREATE INDEX IF NOT EXISTS country_payment_routing_country_idx
  ON public.country_payment_routing (country_code, position);

INSERT INTO public.country_payment_routing (country_code, gateway_slug, position) VALUES
  -- Structured markets
  ('us', 'stripe', 1), ('us', 'paypal', 2),
  ('ca', 'stripe', 1), ('ca', 'paypal', 2),
  ('gb', 'stripe', 1), ('gb', 'paypal', 2),
  ('de', 'stripe', 1), ('de', 'paypal', 2),
  ('fr', 'stripe', 1), ('fr', 'paypal', 2),
  ('no', 'stripe', 1), ('no', 'paypal', 2),
  -- Africa — local rails first
  ('ng', 'paystack',     1), ('ng', 'flutterwave', 2), ('ng', 'stripe', 3),
  ('ke', 'mpesa-direct', 1), ('ke', 'flutterwave', 2), ('ke', 'stripe', 3),
  -- Middle East
  ('ae', 'stripe', 1), ('ae', 'paypal', 2)
ON CONFLICT (country_code, gateway_slug) DO UPDATE
  SET position   = EXCLUDED.position,
      updated_at = now();


-- ----------------------------------------------------------------------------
-- 5. country_payment_fallback
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.country_payment_fallback (
  id              SERIAL PRIMARY KEY,
  country_code    TEXT NOT NULL UNIQUE,
  fallback_method TEXT NOT NULL REFERENCES public.payment_methods(slug) ON DELETE RESTRICT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.country_payment_fallback (country_code, fallback_method) VALUES
  ('us', 'invoice'),
  ('ca', 'invoice'),
  ('gb', 'invoice'),
  ('de', 'invoice'),
  ('fr', 'invoice'),
  ('no', 'invoice'),
  ('ng', 'paystack-bank-transfer'),
  ('ke', 'mpesa'),
  ('ae', 'invoice')
ON CONFLICT (country_code) DO UPDATE
  SET fallback_method = EXCLUDED.fallback_method,
      updated_at      = now();


-- ----------------------------------------------------------------------------
-- 6. country_payment_picker — convenience view that pre-joins
--    routing + gateway methods + display labels for the booking widget.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.country_payment_picker AS
SELECT
  cpr.country_code,
  cpr.position             AS gateway_rank,
  pg.slug                  AS gateway_slug,
  pg.name                  AS gateway_name,
  pg.settlement,
  pm.slug                  AS method_slug,
  pm.label                 AS method_label,
  pm.category              AS method_category,
  gm.position              AS method_position
FROM public.country_payment_routing cpr
JOIN public.payment_gateways pg  ON pg.slug = cpr.gateway_slug
JOIN public.gateway_methods  gm  ON gm.gateway_slug = pg.slug
JOIN public.payment_methods  pm  ON pm.slug = gm.method_slug
ORDER BY cpr.country_code, cpr.position, gm.position;


-- ----------------------------------------------------------------------------
-- RLS — anon read on every catalogue table.
-- ----------------------------------------------------------------------------

ALTER TABLE public.payment_gateways          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_methods           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_payment_routing   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_payment_fallback  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_gateways_anon_read         ON public.payment_gateways;
DROP POLICY IF EXISTS payment_methods_anon_read          ON public.payment_methods;
DROP POLICY IF EXISTS gateway_methods_anon_read          ON public.gateway_methods;
DROP POLICY IF EXISTS country_payment_routing_anon_read  ON public.country_payment_routing;
DROP POLICY IF EXISTS country_payment_fallback_anon_read ON public.country_payment_fallback;

CREATE POLICY payment_gateways_anon_read         ON public.payment_gateways         FOR SELECT USING (true);
CREATE POLICY payment_methods_anon_read          ON public.payment_methods          FOR SELECT USING (true);
CREATE POLICY gateway_methods_anon_read          ON public.gateway_methods          FOR SELECT USING (true);
CREATE POLICY country_payment_routing_anon_read  ON public.country_payment_routing  FOR SELECT USING (true);
CREATE POLICY country_payment_fallback_anon_read ON public.country_payment_fallback FOR SELECT USING (true);

GRANT SELECT ON public.country_payment_picker TO anon, authenticated;
