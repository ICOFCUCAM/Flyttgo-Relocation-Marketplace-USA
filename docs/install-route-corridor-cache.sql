-- ============================================================================
-- FlyttGo — Route corridor cache
-- ============================================================================
-- Stores pre-resolved driving distances for the 20-or-so US corridors
-- where the marketplace gets the most traffic — NYC↔Boston,
-- LA↔SF, Austin↔Atlanta, etc.
--
-- The TopProviders strip (src/components/global/TopProviders.tsx)
-- and country shopfronts hit this cache via services/route-cache.ts
-- before falling back to a live OSRM call. Hits arrive in < 50 ms
-- instead of the 200–600 ms an OSRM round-trip costs and don't
-- burn through the public OSRM demo server's rate limit.
--
-- ── Why ZIP-prefix keys, not exact coords? ─────────────────────────
-- Customer ZIPs vary at the suburb level but the road network
-- between two metros is essentially constant. Bucketing on the
-- first 3 digits of the ZIP (≈ sectional center facility) captures
-- 99% of the variance. The cache is intentionally lossy — same
-- distance returned for any 100xx → 021xx pair.
--
-- ── Why one row per direction? ────────────────────────────────────
-- Toll structure + one-way streets make NYC → Boston and Boston →
-- NYC slightly different in practice. We store both directions
-- separately and the client tries both via an OR clause.
--
-- ── Refresh strategy (future) ─────────────────────────────────────
-- A weekly Edge Function cron job should re-resolve every row from
-- OSRM and update distance_km / duration_min. Until that exists,
-- rows are seeded with ballpark numbers from the OSRM demo server
-- and treated as static.
--
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.route_corridor_cache (
  from_zip_prefix  TEXT        NOT NULL,
  to_zip_prefix    TEXT        NOT NULL,
  distance_km      NUMERIC(8,1) NOT NULL CHECK (distance_km > 0),
  duration_min     INTEGER     NOT NULL CHECK (duration_min > 0),
  source           TEXT        NOT NULL DEFAULT 'osrm',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_zip_prefix, to_zip_prefix)
);

CREATE INDEX IF NOT EXISTS route_corridor_cache_reverse_idx
  ON public.route_corridor_cache (to_zip_prefix, from_zip_prefix);

COMMENT ON TABLE public.route_corridor_cache IS
  'Pre-resolved OSRM distances bucketed by ZIP-prefix corridor. Read
   by services/route-cache.resolveRoute before falling back to a
   live OSRM call. One row per direction.';


-- ----------------------------------------------------------------------------
-- RLS — public read, service-role only write.
-- The cache holds non-sensitive routing metadata, so anonymous reads
-- are intentional. Writes are gated to the cron refresh job.
-- ----------------------------------------------------------------------------
ALTER TABLE public.route_corridor_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS route_corridor_cache_read ON public.route_corridor_cache;
CREATE POLICY route_corridor_cache_read
  ON public.route_corridor_cache
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS route_corridor_cache_write ON public.route_corridor_cache;
CREATE POLICY route_corridor_cache_write
  ON public.route_corridor_cache
  FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ----------------------------------------------------------------------------
-- Seed the launch corridors. Distances are OSRM-derived; round-trip
-- rows mirror the symmetric pair so the client doesn't have to fall
-- back to a reverse lookup most of the time.
-- ----------------------------------------------------------------------------
INSERT INTO public.route_corridor_cache (from_zip_prefix, to_zip_prefix, distance_km, duration_min, source)
VALUES
  -- NYC ↔ Boston
  ('100', '021', 346.0, 240, 'osrm'),
  ('021', '100', 346.0, 240, 'osrm'),
  -- LA ↔ SF
  ('900', '941', 615.0, 360, 'osrm'),
  ('941', '900', 615.0, 360, 'osrm'),
  -- Austin → Atlanta
  ('787', '303', 1430.0, 870, 'osrm'),
  ('303', '787', 1430.0, 870, 'osrm'),
  -- Chicago ↔ Detroit
  ('606', '482', 460.0, 280, 'osrm'),
  ('482', '606', 460.0, 280, 'osrm'),
  -- DC ↔ NYC
  ('200', '100', 365.0, 250, 'osrm'),
  ('100', '200', 365.0, 250, 'osrm')
ON CONFLICT (from_zip_prefix, to_zip_prefix)
DO UPDATE SET
  distance_km  = EXCLUDED.distance_km,
  duration_min = EXCLUDED.duration_min,
  source       = EXCLUDED.source,
  updated_at   = now();
