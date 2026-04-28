-- ============================================================================
-- FlyttGo — Insurance rules by country
-- ============================================================================
-- Closes the last gap in the country-adaptive pricing spec — which
-- insurance tiers each market offers, and what per-hour multiplier
-- applies vs the global insurance_options.per_hour rate.
--
-- Why per-country: insurance markets are deeply regulated and vary
-- by jurisdiction. DE law already includes carrier liability so
-- "Basic" isn't a meaningful customer-facing tier; NO regulates the
-- insurance industry up so customers pick Full or Premium minimum;
-- AE corporate-sponsored sector defaults to Full+; NG/KE informal
-- sector offers a discounted Basic only.
--
-- Mirrors COUNTRY_PROFILES.insuranceAvailability in lib/country-profiles.ts.
-- The pricing engine reads from either source via the same shape.
--
-- Run AFTER:
--   - docs/install-pricing-engine.sql      (insurance_options table)
--   - docs/install-country-profiles.sql    (country_profiles table)
--
-- Safe to re-run.
-- ============================================================================


CREATE TABLE IF NOT EXISTS public.insurance_rules_by_country (
  id                    SERIAL PRIMARY KEY,
  country_code          TEXT NOT NULL
                        REFERENCES public.country_profiles(country_code) ON DELETE CASCADE,
  tier_slug             TEXT NOT NULL
                        REFERENCES public.insurance_options(tier_slug) ON DELETE CASCADE,
  per_hour_multiplier   NUMERIC(6,3) NOT NULL DEFAULT 1.0
                        CHECK (per_hour_multiplier BETWEEN 0 AND 5),
  /* Optional country-specific footnote shown next to the tier in the
   * booking widget's insurance picker. Localized via the i18n layer
   * — store the source-language string here. */
  note                  TEXT,
  /* Lower position = higher in the picker. */
  position              SMALLINT NOT NULL DEFAULT 100,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, tier_slug)
);

CREATE INDEX IF NOT EXISTS insurance_rules_by_country_country_idx
  ON public.insurance_rules_by_country (country_code);


-- ----------------------------------------------------------------------------
-- Seed — mirrors COUNTRY_PROFILES.insuranceAvailability.
-- Rows that aren't seeded mean the tier ISN'T offered in that country
-- (the booking widget hides it; the pricing engine refuses the input).
-- ----------------------------------------------------------------------------

INSERT INTO public.insurance_rules_by_country
  (country_code, tier_slug, per_hour_multiplier, note, position)
VALUES
  -- US — all three tiers, no markup
  ('us', 'basic',   1.00, NULL,                                     10),
  ('us', 'full',    1.00, NULL,                                     20),
  ('us', 'premium', 1.00, 'High-value home + interstate',           30),

  -- CA — same as US
  ('ca', 'basic',   1.00, NULL,                                     10),
  ('ca', 'full',    1.00, NULL,                                     20),
  ('ca', 'premium', 1.00, NULL,                                     30),

  -- GB — Premium markup reflects ABTA-aligned cover surcharge
  ('gb', 'basic',   1.00, NULL,                                     10),
  ('gb', 'full',    1.00, NULL,                                     20),
  ('gb', 'premium', 1.05, 'Includes ABTA-aligned cover',            30),

  -- DE — Basic absent (carrier liability mandatory by law); Full+ at +10%
  ('de', 'full',    1.10, 'Carrier liability already included by law', 10),
  ('de', 'premium', 1.10, NULL,                                     20),

  -- FR — Full+ at +5% to reflect garantie déménageur
  ('fr', 'basic',   1.00, NULL,                                     10),
  ('fr', 'full',    1.05, NULL,                                     20),
  ('fr', 'premium', 1.05, 'Inclut la garantie déménageur',          30),

  -- NO — Basic absent; Full+ at +15% reflecting NOK-level premiums
  ('no', 'full',    1.15, 'Bredde-dekning · NOK levels',            10),
  ('no', 'premium', 1.15, NULL,                                     20),

  -- NG — informal sector; Basic only at half-rate
  ('ng', 'basic',   0.50, 'Limited goods-in-transit cover',         10),

  -- KE — informal sector; Basic only at half-rate
  ('ke', 'basic',   0.50, 'Limited goods-in-transit cover',         10),

  -- AE — corporate-sponsored default; Full minimum at +10%
  ('ae', 'full',    1.10, 'Mandatory minimum for corporate accounts', 10),
  ('ae', 'premium', 1.10, NULL,                                     20)

ON CONFLICT (country_code, tier_slug) DO UPDATE
  SET per_hour_multiplier = EXCLUDED.per_hour_multiplier,
      note                = EXCLUDED.note,
      position            = EXCLUDED.position,
      updated_at          = now();


-- ----------------------------------------------------------------------------
-- View — convenience join with insurance_options for the booking
-- widget so the picker can hydrate everything in one SELECT.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.country_insurance_picker AS
SELECT
  ir.country_code,
  io.tier_slug,
  io.label,
  ROUND(io.per_hour * ir.per_hour_multiplier, 2) AS effective_per_hour,
  io.coverage_max,
  io.blurb,
  ir.note          AS country_note,
  ir.position
FROM public.insurance_rules_by_country ir
JOIN public.insurance_options          io ON io.tier_slug = ir.tier_slug
ORDER BY ir.country_code, ir.position;


-- ----------------------------------------------------------------------------
-- RLS — anon read; service-role write only.
-- ----------------------------------------------------------------------------

ALTER TABLE public.insurance_rules_by_country ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS insurance_rules_by_country_anon_read ON public.insurance_rules_by_country;
CREATE POLICY insurance_rules_by_country_anon_read
  ON public.insurance_rules_by_country FOR SELECT USING (true);

GRANT SELECT ON public.country_insurance_picker TO anon, authenticated;
