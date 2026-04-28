-- ============================================================================
-- FlyttGo — Coverage map extensions to deployment_regions
-- ============================================================================
-- Layers map-rendering metadata onto the deployment_regions table:
--   - lat / lng coordinates for SVG projection
--   - is_headquarters flag for the Oslo HQ node
--   - upcoming_rollout copy shown in the hover tooltip
--
-- Plus reseeds the country roster + status taxonomy to match the
-- Global Coverage Expansion Map spec:
--   operational : US · UK · DE · FR · NO · AE
--   expanding   : CA · NL · BE · SE · DK · IN · ZA
--   pilot       : CM · UG · ET · KE · NG
--
-- Norway is the HQ. The map's HQ node renders distinctly (star,
-- pulse) on top of the standard operational style.
--
-- Run AFTER docs/install-live-ops.sql. Safe to re-run.
-- ============================================================================


ALTER TABLE public.deployment_regions
  ADD COLUMN IF NOT EXISTS lat              NUMERIC(8,5),
  ADD COLUMN IF NOT EXISTS lng              NUMERIC(8,5),
  ADD COLUMN IF NOT EXISTS is_headquarters  BOOLEAN NOT NULL DEFAULT false,
  /* Tooltip detail — shown when the visitor hovers a node on the map. */
  ADD COLUMN IF NOT EXISTS upcoming_rollout TEXT;


-- Reseed the canonical roster. INSERTs that already exist update in
-- place; the new countries land fresh. Lat/lng are capital-city
-- centroids — close enough for a 1000×500 SVG projection.
INSERT INTO public.deployment_regions
  (country_code, display_name, flag, status, region, blurb,
   position, lat, lng, is_headquarters, upcoming_rollout) VALUES

  -- HQ
  ('no', 'Norway',          '🇳🇴', 'operational', 'Europe',
   'Operational HQ · global coordination · Wankong LLC (Delaware, USA)',
   10,  59.91, 10.75, true,
   'Operational HQ · Global coordination · Incorporated in Delaware, USA'),

  -- Operational
  ('us', 'United States',   '🇺🇸', 'operational', 'North America',
   'Full marketplace · 50 states · enterprise-ready',
   20,  38.90, -77.04, false,
   'Provider onboarding active · Enterprise + university lanes live'),
  ('gb', 'United Kingdom',  '🇬🇧', 'operational', 'Europe',
   'VAT-included pricing · GVOL-aligned providers',
   30,  51.51, -0.13,  false,
   'Provider onboarding active · Corporate relocation lanes live'),
  ('de', 'Germany',         '🇩🇪', 'operational', 'Europe',
   'GüKG-licensed providers · Verkehrshaftpflicht baseline',
   40,  52.52, 13.41,  false,
   'Provider onboarding active · DSGVO-aligned data handling'),
  ('fr', 'France',          '🇫🇷', 'operational', 'Europe',
   'SIRET-validated providers · code APE filtered',
   50,  48.86, 2.35,   false,
   'Provider onboarding active · Corporate relocation lanes live'),
  ('ae', 'United Arab Emirates', '🇦🇪', 'operational', 'MENA',
   'Trade-licence verified providers · Dubai operational',
   60,  25.20, 55.27,  false,
   'Provider onboarding active · Enterprise + corporate lanes live'),

  -- Expansion
  ('ca', 'Canada',          '🇨🇦', 'expanding', 'North America',
   'Cross-border (US ↔ CA) coordination',
   70,  45.42, -75.69, false,
   'Provider network forming · Coverage activation underway'),
  ('nl', 'Netherlands',     '🇳🇱', 'expanding', 'Europe',
   'Provider pipeline forming · Schengen freight ready',
   80,  52.37, 4.90,   false,
   'Provider network forming · Coverage activation underway'),
  ('be', 'Belgium',         '🇧🇪', 'expanding', 'Europe',
   'Provider pipeline forming',
   90,  50.85, 4.35,   false,
   'Provider network forming · Coverage activation underway'),
  ('se', 'Sweden',          '🇸🇪', 'expanding', 'Europe',
   'Nordic corridor expansion',
   100, 59.33, 18.06,  false,
   'Provider network forming · Nordic corridor activation'),
  ('dk', 'Denmark',         '🇩🇰', 'expanding', 'Europe',
   'Nordic corridor expansion',
   110, 55.68, 12.57,  false,
   'Provider network forming · Nordic corridor activation'),
  ('in', 'India',           '🇮🇳', 'expanding', 'South Asia',
   'Pricing data ready · provider pipeline building',
   120, 28.61, 77.21,  false,
   'Provider network forming · University corridor first'),
  ('za', 'South Africa',    '🇿🇦', 'expanding', 'Southern Africa',
   'Provider pipeline forming · Johannesburg first',
   130, -26.20, 28.05, false,
   'Provider network forming · Coverage activation underway'),

  -- Pilot
  ('cm', 'Cameroon',        '🇨🇲', 'pilot', 'Central Africa',
   'Pilot deployment · partner-supported rollout',
   140, 3.85, 11.50,   false,
   'Pilot stage · Government readiness · University mobility rollout'),
  ('ug', 'Uganda',          '🇺🇬', 'pilot', 'East Africa',
   'Pilot deployment · university mobility focus',
   150, 0.35, 32.58,   false,
   'Pilot stage · University mobility rollout · Provider onboarding active'),
  ('et', 'Ethiopia',        '🇪🇹', 'pilot', 'East Africa',
   'Pilot deployment · government infrastructure entry',
   160, 9.03, 38.74,   false,
   'Pilot stage · Government infrastructure entry · NGO deployment lanes'),
  ('ke', 'Kenya',           '🇰🇪', 'pilot', 'East Africa',
   '47-county partner network · pilot rollout',
   170, -1.29, 36.82,  false,
   'Pilot stage · Partner-supported rollout · Government readiness'),
  ('ng', 'Nigeria',         '🇳🇬', 'pilot', 'West Africa',
   'Pilot deployment · Lagos / Abuja partner network',
   180, 9.08, 7.40,    false,
   'Pilot stage · Partner-supported rollout · University corridor')

ON CONFLICT (country_code) DO UPDATE
  SET display_name     = EXCLUDED.display_name,
      flag             = EXCLUDED.flag,
      status           = EXCLUDED.status,
      region           = EXCLUDED.region,
      blurb            = EXCLUDED.blurb,
      position         = EXCLUDED.position,
      lat              = EXCLUDED.lat,
      lng              = EXCLUDED.lng,
      is_headquarters  = EXCLUDED.is_headquarters,
      upcoming_rollout = EXCLUDED.upcoming_rollout,
      updated_at       = now();


/* Drop any rows that aren't in the canonical roster — keeps the
 * map free of legacy seeds (e.g. 'planned' India, 'partner' UAE)
 * after re-running this migration. Safe: deployment_regions only
 * holds presentation metadata, not transactional data. */
DELETE FROM public.deployment_regions
 WHERE country_code NOT IN (
  'no','us','gb','de','fr','ae',
  'ca','nl','be','se','dk','in','za',
  'cm','ug','et','ke','ng'
);
