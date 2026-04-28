-- ============================================================================
-- FlyttGo — Country-specific provider onboarding rules
-- ============================================================================
-- Backs the typed onboarding rules in lib/onboarding-rules.ts +
-- lib/provider-categories.ts. The /providers/requirements page can
-- run client-side from the curated TS today, or swap to the live
-- Supabase rows once these tables are populated.
--
-- ── Tables ──────────────────────────────────────────────────────────
--
--   provider_categories          — the 9 top-level marketplace lanes
--   onboarding_universal_fields  — the 11 fields every provider sees
--   onboarding_country_fields    — country-specific field add-ons
--                                   keyed by country_code
--   onboarding_country_categories — which provider categories are
--                                    actively supported per country
--   compliance_disclosures       — the coordination-layer disclosure
--                                    text shown above every form
--
-- ── RLS ─────────────────────────────────────────────────────────────
--
--   All tables are anon-read so the public requirements page works
--   for unauthenticated visitors. Writes are service-role only —
--   marketplace ops curates the rules out of band.
--
-- Run AFTER docs/install-pricing-engine.sql + install-country-profiles.sql.
-- Safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. provider_categories
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_categories (
  id                          SERIAL PRIMARY KEY,
  slug                        TEXT NOT NULL UNIQUE,
  name                        TEXT NOT NULL,
  description                 TEXT NOT NULL,
  icon                        TEXT,                        -- lucide icon name
  default_vehicle_operation   BOOLEAN NOT NULL DEFAULT false,
  default_licensing_required  BOOLEAN NOT NULL DEFAULT false,
  position                    SMALLINT NOT NULL DEFAULT 100,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.provider_categories
  (slug, name, description, icon, default_vehicle_operation, default_licensing_required, position) VALUES
  ('licensed-carrier',         'Licensed moving carrier',
   'Registered motor carrier — operates trucks under FMCSA / GVOL / GüKG / equivalent operator licence.',
   'Truck',         true,  true,  10),
  ('moving-labor',             'Moving labor provider',
   'Loading, unloading, and in-home labor crews. Customer brings their own truck or rental.',
   'Users',         false, false, 20),
  ('packing',                  'Packing services provider',
   'Independent packing crews + materials. Full-pack, partial-pack, or fragile-only.',
   'Package',       false, false, 30),
  ('storage',                  'Storage facility partner',
   'Self-storage, bonded warehouses, and staging facilities for staged or international moves.',
   'Boxes',         false, true,  40),
  ('vehicle-rental',           'Vehicle rental partner',
   'Truck and van rental partners reserved alongside labor and carrier coordination.',
   'Car',           true,  true,  50),
  ('freight-forwarding',       'Freight forwarding partner',
   'Cross-border freight, customs documentation coordination, and consolidation.',
   'Ship',          false, true,  60),
  ('international-relocation', 'International relocation coordinator',
   'End-to-end origin-country and arrival-country relocation orchestration.',
   'Globe2',        false, false, 70),
  ('university-relocation',    'University relocation partner',
   'Student move-in / move-out, residence hall windows, and semester mobility.',
   'GraduationCap', true,  false, 80),
  ('corporate-relocation',     'Corporate relocation vendor',
   'Talent mobility, project relocation, and consolidated procurement workflows.',
   'Building2',     false, false, 90)
ON CONFLICT (slug) DO UPDATE
  SET name                       = EXCLUDED.name,
      description                = EXCLUDED.description,
      icon                       = EXCLUDED.icon,
      default_vehicle_operation  = EXCLUDED.default_vehicle_operation,
      default_licensing_required = EXCLUDED.default_licensing_required,
      position                   = EXCLUDED.position,
      updated_at                 = now();


-- ----------------------------------------------------------------------------
-- 2. onboarding_universal_fields
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_universal_fields (
  id            SERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  help_text     TEXT,
  requirement   TEXT NOT NULL CHECK (requirement IN ('required','optional','conditional')),
  position      SMALLINT NOT NULL DEFAULT 100,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.onboarding_universal_fields
  (slug, label, help_text, requirement, position) VALUES
  ('provider-name',          'Provider name (company or sole trader)', NULL,                                                          'required', 10),
  ('phone-verified',         'Verified phone number',                  'We send an SMS code to confirm.',                              'required', 20),
  ('address',                'Operating address',                      NULL,                                                          'required', 30),
  ('service-cities',         'Cities you serve',                       'Add up to 8 cities at registration; you can edit later.',     'required', 40),
  ('service-radius-km',      'Service radius (km)',                    'Maximum distance from your home city you accept.',             'required', 50),
  ('crew-size',              'Crew sizes you offer',                   '2 / 3 / 4 / 5 movers — pick all that apply.',                  'required', 60),
  ('vehicle-availability',   'Vehicle availability',                   'Truck included? Bring-your-own? Both?',                        'required', 70),
  ('packing-availability',   'Packing services',                       NULL,                                                          'optional', 80),
  ('storage-availability',   'Storage staging',                        NULL,                                                          'optional', 90),
  ('availability-schedule',  'Operating hours + days',                 NULL,                                                          'required', 100),
  ('insurance-confirmation', 'Insurance declaration',                  'Confirm your active goods-in-transit / public liability cover.','required', 110)
ON CONFLICT (slug) DO UPDATE
  SET label       = EXCLUDED.label,
      help_text   = EXCLUDED.help_text,
      requirement = EXCLUDED.requirement,
      position    = EXCLUDED.position,
      updated_at  = now();


-- ----------------------------------------------------------------------------
-- 3. onboarding_country_fields  — country-specific field add-ons
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_country_fields (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL,
  slug          TEXT NOT NULL,
  label         TEXT NOT NULL,
  help_text     TEXT,
  requirement   TEXT NOT NULL CHECK (requirement IN ('required','optional','conditional')),
  /* When requirement = 'conditional', the field shows only if the
   * named pre-condition is true. */
  condition_on  TEXT CHECK (condition_on IS NULL OR condition_on IN (
    'vehicle-operation','interstate-only','heavy-transport-only'
  )),
  position      SMALLINT NOT NULL DEFAULT 100,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, slug)
);

CREATE INDEX IF NOT EXISTS onboarding_country_fields_country_idx
  ON public.onboarding_country_fields (country_code);

-- Mirrors lib/onboarding-rules.ts ONBOARDING_RULES per country.
INSERT INTO public.onboarding_country_fields
  (country_code, slug, label, help_text, requirement, condition_on, position) VALUES
  -- US
  ('us', 'usdot-number',     'USDOT number',
   'Required for any provider operating commercial motor vehicles. fmcsa.dot.gov/registration',
   'conditional', 'vehicle-operation', 10),
  ('us', 'mc-number',        'MC number',
   'Required for interstate household-goods carriers. Apply via the FMCSA Unified Registration System.',
   'conditional', 'interstate-only', 20),
  ('us', 'cargo-insurance',  'Cargo insurance certificate',
   'BMC-91 / BMC-91X for HHG carriers; minimum $750k liability.',
   'conditional', 'vehicle-operation', 30),

  -- CA
  ('ca', 'province',                       'Province of operation',                          NULL, 'required',     NULL,                  10),
  ('ca', 'business-registration',          'Business registration number',
   'Federal or provincial corporation number, or sole-proprietor BN.',
   'required', NULL, 20),
  ('ca', 'commercial-transport-licence',   'Commercial transport licence',
   'Required in some provinces for vehicles over 4,500 kg GVWR.',
   'conditional', 'heavy-transport-only', 30),

  -- GB
  ('gb', 'company-registration',  'Companies House registration',
   'Sole traders can skip this and tick the self-employed declaration instead.',
   'optional', NULL, 10),
  ('gb', 'self-employed-status',  'Self-employed status declaration', NULL, 'optional',     NULL,                  20),
  ('gb', 'operator-licence-uk',   'GVOL operator licence',
   'Required for vehicles over 3.5t. Apply via the Traffic Commissioner.',
   'conditional', 'heavy-transport-only', 30),

  -- DE
  ('de', 'gewerbeanmeldung', 'Gewerbeanmeldung',
   'Business registration with your local Gewerbeamt.',
   'required', NULL, 10),
  ('de', 'vat-number',       'USt-IdNr (VAT number)',
   'Optional at early stage — can be added once turnover exceeds Kleinunternehmer threshold.',
   'optional', NULL, 20),

  -- FR
  ('fr', 'siret',             'SIRET number',
   'Établissement registration. 14 digits.',
   'required', NULL, 10),
  ('fr', 'business-category', 'Code APE / NAF',
   '52.10A (storage), 52.29B (transport auxiliaries), 49.41B (freight road transport), 81.22Z (cleaning), etc.',
   'required', NULL, 20),

  -- NO
  ('no', 'organisation-number', 'Organisasjonsnummer',
   'Brønnøysundregistrene. 9 digits.',
   'required', NULL, 10),

  -- AE
  ('ae', 'trade-licence', 'Trade licence number',
   'Issued by the Department of Economic Development in your Emirate.',
   'required', NULL, 10),
  ('ae', 'emirate',       'Emirate of operation',
   'Dubai / Abu Dhabi / Sharjah / Ajman / Ras Al Khaimah / Fujairah / Umm Al Quwain.',
   'required', NULL, 20),

  -- NG
  ('ng', 'cac-registration', 'CAC registration',
   'Corporate Affairs Commission. Optional at early stage; required to access corporate accounts.',
   'optional', NULL, 10),

  -- KE
  ('ke', 'business-permit',  'County business permit',
   'Issued by your county government. Renew annually.',
   'required', NULL, 10),
  ('ke', 'county-coverage',  'Counties served',
   'Pick the counties you cover — 47 in Kenya.',
   'required', NULL, 20),

  -- IN
  ('in', 'gst-registration', 'GST registration',
   'Optional for providers under the ₹20 lakh turnover threshold; mandatory above.',
   'optional', NULL, 10),
  ('in', 'service-city',     'Service city', NULL, 'required', NULL, 20)

ON CONFLICT (country_code, slug) DO UPDATE
  SET label        = EXCLUDED.label,
      help_text    = EXCLUDED.help_text,
      requirement  = EXCLUDED.requirement,
      condition_on = EXCLUDED.condition_on,
      position     = EXCLUDED.position,
      updated_at   = now();


-- ----------------------------------------------------------------------------
-- 4. onboarding_country_categories  — which categories are supported per country
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_country_categories (
  id            SERIAL PRIMARY KEY,
  country_code  TEXT NOT NULL,
  category_slug TEXT NOT NULL REFERENCES public.provider_categories(slug) ON DELETE CASCADE,
  position      SMALLINT NOT NULL DEFAULT 100,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, category_slug)
);

INSERT INTO public.onboarding_country_categories (country_code, category_slug) VALUES
  -- US, CA, GB — all 9 categories
  ('us','licensed-carrier'),('us','moving-labor'),('us','packing'),('us','storage'),
  ('us','vehicle-rental'),('us','freight-forwarding'),('us','international-relocation'),
  ('us','university-relocation'),('us','corporate-relocation'),

  ('ca','licensed-carrier'),('ca','moving-labor'),('ca','packing'),('ca','storage'),
  ('ca','vehicle-rental'),('ca','freight-forwarding'),('ca','international-relocation'),
  ('ca','university-relocation'),('ca','corporate-relocation'),

  ('gb','licensed-carrier'),('gb','moving-labor'),('gb','packing'),('gb','storage'),
  ('gb','vehicle-rental'),('gb','freight-forwarding'),('gb','international-relocation'),
  ('gb','university-relocation'),('gb','corporate-relocation'),

  -- DE, FR, NO — 7 categories (drop moving-labor + university; full-service-bundle markets)
  ('de','licensed-carrier'),('de','packing'),('de','storage'),('de','vehicle-rental'),
  ('de','freight-forwarding'),('de','international-relocation'),('de','corporate-relocation'),
  ('fr','licensed-carrier'),('fr','packing'),('fr','storage'),('fr','vehicle-rental'),
  ('fr','freight-forwarding'),('fr','international-relocation'),('fr','corporate-relocation'),
  ('no','licensed-carrier'),('no','packing'),('no','storage'),('no','vehicle-rental'),
  ('no','freight-forwarding'),('no','international-relocation'),('no','corporate-relocation'),

  -- AE — 7 categories
  ('ae','licensed-carrier'),('ae','packing'),('ae','storage'),('ae','vehicle-rental'),
  ('ae','freight-forwarding'),('ae','international-relocation'),('ae','corporate-relocation'),

  -- NG — 5 categories (lean marketplace-first)
  ('ng','moving-labor'),('ng','licensed-carrier'),('ng','vehicle-rental'),
  ('ng','university-relocation'),('ng','corporate-relocation'),

  -- KE — 4 categories
  ('ke','moving-labor'),('ke','licensed-carrier'),('ke','vehicle-rental'),('ke','corporate-relocation'),

  -- IN — 5 categories
  ('in','moving-labor'),('in','packing'),('in','vehicle-rental'),
  ('in','university-relocation'),('in','corporate-relocation')
ON CONFLICT (country_code, category_slug) DO UPDATE
  SET position   = EXCLUDED.position,
      updated_at = now();


-- ----------------------------------------------------------------------------
-- 5. compliance_disclosures  — the coordination-layer disclosure
-- ----------------------------------------------------------------------------
-- Single global disclosure today (rendered above every onboarding
-- form). Schema supports per-country variants for future regulatory
-- requirements (e.g. an EU-wide GDPR addendum).
CREATE TABLE IF NOT EXISTS public.compliance_disclosures (
  id            SERIAL PRIMARY KEY,
  scope         TEXT NOT NULL UNIQUE,         -- 'global' | 'country:{code}'
  body          TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.compliance_disclosures (scope, body) VALUES
  ('global',
   'FlyttGo operates as a digital coordination marketplace connecting customers with independent relocation service providers. Service providers are responsible for compliance with their national licensing, taxation, insurance, and regulatory obligations.')
ON CONFLICT (scope) DO UPDATE
  SET body       = EXCLUDED.body,
      updated_at = now();


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.provider_categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_universal_fields     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_country_fields       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_country_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_disclosures          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS provider_categories_anon_read             ON public.provider_categories;
DROP POLICY IF EXISTS onboarding_universal_fields_anon_read     ON public.onboarding_universal_fields;
DROP POLICY IF EXISTS onboarding_country_fields_anon_read       ON public.onboarding_country_fields;
DROP POLICY IF EXISTS onboarding_country_categories_anon_read   ON public.onboarding_country_categories;
DROP POLICY IF EXISTS compliance_disclosures_anon_read          ON public.compliance_disclosures;

CREATE POLICY provider_categories_anon_read             ON public.provider_categories             FOR SELECT USING (true);
CREATE POLICY onboarding_universal_fields_anon_read     ON public.onboarding_universal_fields     FOR SELECT USING (true);
CREATE POLICY onboarding_country_fields_anon_read       ON public.onboarding_country_fields       FOR SELECT USING (true);
CREATE POLICY onboarding_country_categories_anon_read   ON public.onboarding_country_categories   FOR SELECT USING (true);
CREATE POLICY compliance_disclosures_anon_read          ON public.compliance_disclosures          FOR SELECT USING (true);
