-- ============================================================================
-- FlyttGo — Country profiles · global pricing metadata
-- ============================================================================
-- Adds the country-adaptive metadata layer the pricing engine needs
-- to operate across the USA, Canada, UK, Germany, France, Norway,
-- Nigeria, Kenya, and UAE — and ship into Africa / Middle East /
-- Asia from day one.
--
-- ── Tables ──────────────────────────────────────────────────────────
--
--   country_profiles          — per-country metadata: currency,
--                                tax mode, dominant service model,
--                                marketing copy
--   service_types_by_country  — which service slugs are available in
--                                each market (UI adapts dynamically)
--   currency_settings         — per-currency display + USD rate
--                                (cross-market display only — no
--                                FX conversion in the booking flow)
--   tax_modes_by_country      — which tax model the country uses
--                                (vat-included / sales-tax-added /
--                                quoted-net)
--   seasonal_adjustments_by_country  — per-country override of the
--                                       global weekend / evening /
--                                       peak-season factors
--
-- ── Coverage ────────────────────────────────────────────────────────
--
--   Also seeds 3 new rows in countries_pricing + cities_pricing for
--   the expansion markets (ng / ke / ae). Country shopfronts stay
--   scoped to the 6 launch markets — these new rows let the engine
--   project realistic rates for prospects in expansion markets.
--
-- Run AFTER docs/install-pricing-engine.sql.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Top up countries_pricing + cities_pricing with the new markets.
-- ----------------------------------------------------------------------------

INSERT INTO public.countries_pricing (country_code, base_hourly, currency, symbol, per_km) VALUES
  ('ng', 8500,   'NGN', '₦',   350),
  ('ke', 1400,   'KES', 'KSh', 60),
  ('ae', 110,    'AED', 'AED', 5)
ON CONFLICT (country_code) DO UPDATE
  SET base_hourly = EXCLUDED.base_hourly,
      currency    = EXCLUDED.currency,
      symbol      = EXCLUDED.symbol,
      per_km      = EXCLUDED.per_km,
      updated_at  = now();

INSERT INTO public.cities_pricing (country_code, city_slug, display_name, multiplier) VALUES
  ('ng', 'lagos',         'Lagos',         1.4),
  ('ng', 'abuja',         'Abuja',         1.2),
  ('ng', 'port-harcourt', 'Port Harcourt', 1.05),
  ('ng', 'ibadan',        'Ibadan',        0.9),
  ('ng', 'kano',          'Kano',          0.85),

  ('ke', 'nairobi',       'Nairobi',       1.4),
  ('ke', 'mombasa',       'Mombasa',       1.15),
  ('ke', 'kisumu',        'Kisumu',        0.95),
  ('ke', 'nakuru',        'Nakuru',        0.9),
  ('ke', 'eldoret',       'Eldoret',       0.85),

  ('ae', 'dubai',         'Dubai',         1.3),
  ('ae', 'abu-dhabi',     'Abu Dhabi',     1.25),
  ('ae', 'sharjah',       'Sharjah',       1.05),
  ('ae', 'ajman',         'Ajman',         0.95),
  ('ae', 'al-ain',        'Al Ain',        0.95)
ON CONFLICT (country_code, city_slug) DO UPDATE
  SET multiplier   = EXCLUDED.multiplier,
      display_name = EXCLUDED.display_name,
      updated_at   = now();


-- ----------------------------------------------------------------------------
-- 1. country_profiles  — per-country metadata
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.country_profiles (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL UNIQUE
                REFERENCES public.countries_pricing(country_code) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  flag_emoji    TEXT NOT NULL,
  /* Tax model — drives quote-display copy on the booking widget. */
  tax_mode      TEXT NOT NULL CHECK (tax_mode IN ('vat-included','sales-tax-added','quoted-net')),
  /* Dominant relocation service model — drives the booking widget's
   * default chip ordering and the country shopfront copy. */
  service_model TEXT NOT NULL CHECK (service_model IN (
    'labor-only-plus-truck',
    'full-service-bundle',
    'packing-heavy',
    'hourly-crew',
    'crew-only-distance',
    'employer-sponsored'
  )),
  /* Customer-facing strategic copy. */
  market_note   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.country_profiles
  (country_code, display_name, flag_emoji, tax_mode, service_model, market_note) VALUES
  ('us', 'United States',         '🇺🇸', 'sales-tax-added', 'labor-only-plus-truck',
   'Largest opportunity is labor-only + coordination. FMCSA-aware verification for interstate; sales tax handled per-state at checkout.'),
  ('ca', 'Canada',                 '🇨🇦', 'sales-tax-added', 'labor-only-plus-truck',
   'GST/PST/HST handled per-province at checkout. Cross-border (US↔CA) freight coordination available.'),
  ('gb', 'United Kingdom',         '🇬🇧', 'vat-included',    'hourly-crew',
   '20% VAT included in every quote. GVOL operator licensing for full-truck moves; sub-3.5t crews can run unlicensed.'),
  ('de', 'Germany',                '🇩🇪', 'vat-included',    'full-service-bundle',
   '19% MwSt. included. GüKG-licensed Umzugsfirma. Customers expect bundled crew + vehicle + packing — labor-only is rare.'),
  ('fr', 'France',                 '🇫🇷', 'vat-included',    'packing-heavy',
   '20% TVA included. Inscription au registre des transporteurs. Packing (emballage) typically leads the quote, hauling follows.'),
  ('no', 'Norway',                 '🇳🇴', 'vat-included',    'full-service-bundle',
   '25% MVA included. Yrkestransportløyve required for commercial transport. Premium market — highest hourly in the marketplace.'),
  ('ng', 'Nigeria',                '🇳🇬', 'quoted-net',      'crew-only-distance',
   'Crew-only with distance-based pricing dominates. Lagos premium of ~40% over national baseline; Abuja federal capital follows.'),
  ('ke', 'Kenya',                  '🇰🇪', 'quoted-net',      'crew-only-distance',
   'Nairobi metro carries the highest multiplier; Mombasa coastal moves carry their own logistics premium. Negotiated services common.'),
  ('ae', 'United Arab Emirates',   '🇦🇪', 'vat-included',    'employer-sponsored',
   '5% VAT included. Employer-sponsored relocation dominates — corporate and packing services lead. Dubai + Abu Dhabi top the multiplier.')
ON CONFLICT (country_code) DO UPDATE
  SET display_name  = EXCLUDED.display_name,
      flag_emoji    = EXCLUDED.flag_emoji,
      tax_mode      = EXCLUDED.tax_mode,
      service_model = EXCLUDED.service_model,
      market_note   = EXCLUDED.market_note,
      updated_at    = now();


-- ----------------------------------------------------------------------------
-- 2. service_types_by_country — which services even exist in this market
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_types_by_country (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL REFERENCES public.country_profiles(country_code) ON DELETE CASCADE,
  service_slug  TEXT NOT NULL REFERENCES public.service_type_adjustments(service_slug) ON DELETE CASCADE,
  position      SMALLINT NOT NULL DEFAULT 100,   -- lower = surface higher in UI
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, service_slug)
);

CREATE INDEX IF NOT EXISTS service_types_by_country_country_idx
  ON public.service_types_by_country (country_code);

-- Seed: per the COUNTRY_PROFILES.availableServices list in lib/country-profiles.ts.
-- Position values reflect each country's dominant service model so the
-- booking widget surfaces the most-used services first.
INSERT INTO public.service_types_by_country (country_code, service_slug, position) VALUES
  -- US — labor-only-plus-truck
  ('us','labor-only',10),('us','movers-truck',20),('us','packing',30),('us','storage',40),('us','corporate',50),
  -- CA — same as US
  ('ca','labor-only',10),('ca','movers-truck',20),('ca','packing',30),('ca','storage',40),('ca','corporate',50),
  -- GB — hourly-crew
  ('gb','labor-only',10),('gb','movers-truck',15),('gb','packing',30),('gb','storage',40),('gb','corporate',50),
  -- DE — full-service-bundle (no labor-only)
  ('de','movers-truck',10),('de','packing',15),('de','storage',30),('de','corporate',40),
  -- FR — packing-heavy
  ('fr','packing',10),('fr','movers-truck',20),('fr','storage',30),('fr','corporate',40),
  -- NO — full-service-bundle
  ('no','movers-truck',10),('no','packing',15),('no','storage',30),('no','corporate',40),
  -- NG — crew-only-distance
  ('ng','labor-only',10),('ng','movers-truck',20),
  -- KE — crew-only-distance
  ('ke','labor-only',10),('ke','movers-truck',20),
  -- AE — employer-sponsored
  ('ae','corporate',10),('ae','movers-truck',20),('ae','packing',30),('ae','storage',40)
ON CONFLICT (country_code, service_slug) DO UPDATE
  SET position   = EXCLUDED.position,
      updated_at = now();


-- ----------------------------------------------------------------------------
-- 3. currency_settings — display + USD rate per currency
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.currency_settings (
  id            SERIAL PRIMARY KEY,
  currency      TEXT NOT NULL UNIQUE,
  symbol        TEXT NOT NULL,
  /* Approximate USD rate snapshot — used only for cross-market
   * display panels ("comparable to $X in the US"). The booking flow
   * never converts. Refresh quarterly via a small admin job. */
  usd_rate      NUMERIC(12,4) NOT NULL,
  /* Locale for Intl.NumberFormat client-side. */
  locale        TEXT NOT NULL DEFAULT 'en-US',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.currency_settings (currency, symbol, usd_rate, locale) VALUES
  ('USD', '$',   1.00,   'en-US'),
  ('CAD', 'C$',  1.36,   'en-CA'),
  ('GBP', '£',   0.79,   'en-GB'),
  ('EUR', '€',   0.92,   'en-IE'),
  ('NOK', 'kr',  10.5,   'nb-NO'),
  ('NGN', '₦',   1580,   'en-NG'),
  ('KES', 'KSh', 129,    'en-KE'),
  ('AED', 'AED', 3.67,   'en-AE')
ON CONFLICT (currency) DO UPDATE
  SET symbol     = EXCLUDED.symbol,
      usd_rate   = EXCLUDED.usd_rate,
      locale     = EXCLUDED.locale,
      updated_at = now();


-- ----------------------------------------------------------------------------
-- 4. tax_modes_by_country — convenience view (mirrors country_profiles.tax_mode)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.tax_modes_by_country AS
SELECT
  country_code,
  tax_mode,
  CASE tax_mode
    WHEN 'vat-included'    THEN 'VAT included in quote'
    WHEN 'sales-tax-added' THEN 'Sales tax added at checkout'
    WHEN 'quoted-net'      THEN 'Net quote · no tax line'
  END AS display_label,
  updated_at
FROM public.country_profiles;


-- ----------------------------------------------------------------------------
-- 5. seasonal_adjustments_by_country — per-country uplift overrides
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seasonal_adjustments_by_country (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL REFERENCES public.country_profiles(country_code) ON DELETE CASCADE,
  factor_slug   TEXT NOT NULL REFERENCES public.seasonal_adjustments(factor_slug) ON DELETE CASCADE,
  /* NULL = inherit the global rate from seasonal_adjustments. */
  pct_override  NUMERIC(6,3),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, factor_slug)
);

CREATE INDEX IF NOT EXISTS seasonal_adjustments_by_country_country_idx
  ON public.seasonal_adjustments_by_country (country_code);

-- Initial overrides — Norway peak season is sharper (Easter / midsummer
-- congestion); UAE evenings carry a bigger uplift (heat-of-day moves
-- shift to night windows). Most countries inherit the global default.
INSERT INTO public.seasonal_adjustments_by_country (country_code, factor_slug, pct_override) VALUES
  ('no', 'peak_season', 0.20),
  ('ae', 'evening',     0.15),
  ('ng', 'weekend',     0.08),
  ('ke', 'weekend',     0.08)
ON CONFLICT (country_code, factor_slug) DO UPDATE
  SET pct_override = EXCLUDED.pct_override,
      updated_at   = now();


-- ----------------------------------------------------------------------------
-- RLS — anon read on every catalogue table.
-- ----------------------------------------------------------------------------

ALTER TABLE public.country_profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types_by_country          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_settings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_adjustments_by_country   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS country_profiles_anon_read                   ON public.country_profiles;
DROP POLICY IF EXISTS service_types_by_country_anon_read           ON public.service_types_by_country;
DROP POLICY IF EXISTS currency_settings_anon_read                  ON public.currency_settings;
DROP POLICY IF EXISTS seasonal_adjustments_by_country_anon_read    ON public.seasonal_adjustments_by_country;

CREATE POLICY country_profiles_anon_read
  ON public.country_profiles FOR SELECT USING (true);
CREATE POLICY service_types_by_country_anon_read
  ON public.service_types_by_country FOR SELECT USING (true);
CREATE POLICY currency_settings_anon_read
  ON public.currency_settings FOR SELECT USING (true);
CREATE POLICY seasonal_adjustments_by_country_anon_read
  ON public.seasonal_adjustments_by_country FOR SELECT USING (true);

GRANT SELECT ON public.tax_modes_by_country TO anon, authenticated;
