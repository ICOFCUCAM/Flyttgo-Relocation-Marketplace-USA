-- ============================================================================
-- FlyttGo — Subscription tier pricing engine (country-multiplier model)
-- ============================================================================
-- Backs the typed catalogue in src/lib/subscription-tiers.ts so live
-- Supabase reads return identical numbers and ops can tune
-- multipliers per market without a code release.
--
-- ── Tables ──────────────────────────────────────────────────────────
--
--   subscription_tiers                  — tier catalogue (5 rows)
--   subscription_country_multipliers    — country → multiplier
--   subscription_tier_pricing_by_country — view that pre-resolves the
--                                            local price for every
--                                            (tier, country) pair
--
-- ── Notes ──────────────────────────────────────────────────────────
--
--   - The DB tier slug stays `elite` (referenced by
--     driver_subscriptions.plan everywhere); display copy
--     "Certified Infrastructure Partner" is on the row.
--   - Local price = USD baseline × country multiplier × USD-rate
--     pulled from currency_settings. The view does the math so any
--     consumer (booking widget / provider dashboard / admin UI) can
--     SELECT one row per (tier, country).
--
-- Run AFTER:
--   - docs/install-pricing-engine.sql
--   - docs/install-country-profiles.sql
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. subscription_tiers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  slug              TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  short_name        TEXT NOT NULL,
  tagline           TEXT,
  baseline_usd      NUMERIC(10,2) NOT NULL,
  commission_pct    NUMERIC(4,3) NOT NULL CHECK (commission_pct BETWEEN 0 AND 0.5),
  privileges        TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  trust_badge       TEXT,
  popular           BOOLEAN NOT NULL DEFAULT false,
  position          SMALLINT NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_tiers
  (slug, display_name, short_name, tagline, baseline_usd, commission_pct,
   privileges, trust_badge, popular, position) VALUES
  ('silver',      'Silver',      'Silver',
   'Entry tier · all standard jobs',
   0,    0.30,
   ARRAY['standard-queue'],
   'registered-provider', false, 10),

  ('silver_plus', 'Silver Plus', 'Silver+',
   'Visibility unlock — moderate dispatch priority',
   29,   0.25,
   ARRAY['standard-queue','moderate-dispatch'],
   'verified-provider',   false, 20),

  ('gold',        'Gold',        'Gold',
   'Growth acceleration · high-priority dispatch + dedicated AM',
   79,   0.20,
   ARRAY['standard-queue','high-dispatch','dedicated-account-manager'],
   'verified-provider',   true,  30),

  ('gold_pro',    'Gold Pro',    'Gold Pro',
   'Commercial-grade — top placement + corporate eligibility',
   199,  0.15,
   ARRAY['standard-queue','priority-dispatch','top-of-marketplace',
         'corporate-relocation-access','featured-listing',
         'advanced-analytics','dedicated-account-manager','priority-phone-support'],
   'corporate-ready',     false, 40),

  ('elite',       'Certified Infrastructure Partner', 'CIP',
   'Institutional gateway · government + enterprise + university procurement',
   499,  0.10,
   ARRAY['first-access-jobs','priority-dispatch','top-of-marketplace',
         'corporate-relocation-access','enterprise-relocation-access',
         'university-relocation-access','government-deployment-access',
         'api-routing-priority','accelerated-payout',
         'advanced-analytics','featured-listing',
         'dedicated-account-manager','priority-phone-support'],
   'government-ready',    false, 50)
ON CONFLICT (slug) DO UPDATE
  SET display_name   = EXCLUDED.display_name,
      short_name     = EXCLUDED.short_name,
      tagline        = EXCLUDED.tagline,
      baseline_usd   = EXCLUDED.baseline_usd,
      commission_pct = EXCLUDED.commission_pct,
      privileges     = EXCLUDED.privileges,
      trust_badge    = EXCLUDED.trust_badge,
      popular        = EXCLUDED.popular,
      position       = EXCLUDED.position,
      updated_at     = now();


-- ----------------------------------------------------------------------------
-- 2. subscription_country_multipliers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_country_multipliers (
  country_code  TEXT PRIMARY KEY,
  multiplier    NUMERIC(4,3) NOT NULL CHECK (multiplier > 0 AND multiplier <= 5),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_country_multipliers (country_code, multiplier) VALUES
  ('us', 1.00),
  ('ca', 0.95),
  ('gb', 0.85),
  ('de', 0.75),
  ('fr', 0.75),
  ('no', 1.20),
  ('ae', 0.90),
  ('ng', 0.35),     -- West Africa anchor
  ('ke', 0.25)      -- East Africa anchor
ON CONFLICT (country_code) DO UPDATE
  SET multiplier = EXCLUDED.multiplier,
      updated_at = now();


-- ----------------------------------------------------------------------------
-- 3. subscription_tier_pricing_by_country — pre-resolved view
-- ----------------------------------------------------------------------------
-- Joins tiers × multipliers × currency_settings so consumers query
-- one row per (tier, country) and get the local-currency price.
CREATE OR REPLACE VIEW public.subscription_tier_pricing_by_country AS
SELECT
  st.slug                             AS tier_slug,
  st.display_name,
  st.short_name,
  st.tagline,
  st.commission_pct,
  st.privileges,
  st.trust_badge,
  st.popular,
  st.position,
  cp.country_code,
  cp.display_name                     AS country_name,
  cs.currency,
  cs.symbol,
  cs.locale,
  COALESCE(scm.multiplier, 1.0)       AS country_multiplier,
  st.baseline_usd,
  /* local price = baseline_usd × country_multiplier × usd_rate */
  ROUND(st.baseline_usd * COALESCE(scm.multiplier, 1.0) * cs.usd_rate)::NUMERIC(12,2)
                                       AS local_price
FROM public.subscription_tiers st
CROSS JOIN public.country_profiles cp
JOIN public.currency_settings cs ON cs.currency = cp.currency
LEFT JOIN public.subscription_country_multipliers scm ON scm.country_code = cp.country_code
ORDER BY st.position, cp.country_code;


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.subscription_tiers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_country_multipliers    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_tiers_anon_read                ON public.subscription_tiers;
DROP POLICY IF EXISTS subscription_country_multipliers_anon_read  ON public.subscription_country_multipliers;

CREATE POLICY subscription_tiers_anon_read
  ON public.subscription_tiers FOR SELECT USING (true);
CREATE POLICY subscription_country_multipliers_anon_read
  ON public.subscription_country_multipliers FOR SELECT USING (true);

GRANT SELECT ON public.subscription_tier_pricing_by_country TO anon, authenticated;
