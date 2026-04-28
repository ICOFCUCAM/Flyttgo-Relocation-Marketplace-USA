-- ────────────────────────────────────────────────────────────────
-- FlyttGo pricing engine · Supabase schema (forward migration)
--
-- These tables back the curated TypeScript data in ./data.ts so the
-- engine can run against live Supabase rows once we move past the
-- curated phase. Mirror is 1:1 — the engine reads either source
-- via the same QuoteInput shape.
--
-- Run as a single migration; the seed data block at the bottom
-- mirrors src/lib/pricing-engine/data.ts so day-1 production parity
-- is guaranteed.
-- ────────────────────────────────────────────────────────────────

-- 1. Countries — base hourly rate per market (per-mover anchor).
create table if not exists public.countries_pricing (
  id            serial primary key,
  country_code  text not null unique,           -- 'us', 'gb', …
  base_hourly   numeric(10,2) not null,         -- per-mover hourly anchor
  currency      text not null,                  -- 'USD', 'GBP', …
  symbol        text not null,                  -- '$', '£', …
  per_km        numeric(10,2) not null,         -- mileage rate
  updated_at    timestamptz not null default now()
);

-- 2. Cities — metro multiplier on top of country baseline.
create table if not exists public.cities_pricing (
  id            serial primary key,
  country_code  text not null references public.countries_pricing(country_code) on delete cascade,
  city_slug     text not null,                  -- lowercase, normalised
  display_name  text not null,                  -- 'New York', 'München'
  multiplier    numeric(6,3) not null,          -- 1.0 = baseline, 1.6 = NYC
  updated_at    timestamptz not null default now(),
  unique (country_code, city_slug)
);

-- 3. Crew multipliers — per crew size.
create table if not exists public.crew_multipliers (
  id          serial primary key,
  crew_size   smallint not null unique check (crew_size between 1 and 8),
  multiplier  numeric(6,3) not null,
  updated_at  timestamptz not null default now()
);

-- 4. Service-type adjustments — additive + multiplier.
create table if not exists public.service_type_adjustments (
  id                  serial primary key,
  service_slug        text not null unique,     -- 'labor-only', 'movers-truck', …
  label               text not null,
  additive_per_hour   numeric(10,2) not null default 0,
  multiplier          numeric(6,3)  not null default 1.0,
  updated_at          timestamptz not null default now()
);

-- 5. Complexity adjustments — additive percentages.
create table if not exists public.complexity_adjustments (
  id            serial primary key,
  factor_slug   text not null unique,           -- 'stairs_per_flight', 'long_carry', …
  pct           numeric(6,3) not null,          -- 0.05 = +5%
  updated_at    timestamptz not null default now()
);

-- 6. Seasonal / time-of-day adjustments.
create table if not exists public.seasonal_adjustments (
  id            serial primary key,
  factor_slug   text not null unique,           -- 'weekend', 'evening', 'peak_season'
  pct           numeric(6,3) not null,
  updated_at    timestamptz not null default now()
);

-- 7. Insurance options.
create table if not exists public.insurance_options (
  id            serial primary key,
  tier_slug     text not null unique,           -- 'basic', 'full', 'premium'
  label         text not null,
  per_hour      numeric(10,2) not null default 0,
  blurb         text,
  coverage_max  integer,                         -- USD limit, optional
  updated_at    timestamptz not null default now()
);

-- 8. Commission rules.
create table if not exists public.commission_rules (
  id            serial primary key,
  scope         text not null,                   -- 'default' | 'enterprise:{slug}'
  pct           numeric(6,3) not null check (pct between 0 and 0.5),
  updated_at    timestamptz not null default now()
);

-- 9. Provider pricing overrides (joins to providers).
create table if not exists public.provider_pricing (
  id                       serial primary key,
  provider_id              uuid not null references public.providers(id) on delete cascade,
  home_city_slug           text,                -- denorm; recomputed on city change
  service_radius_km        integer not null default 25,
  min_hourly_override      numeric(10,2),        -- provider can floor their rate
  weekend_multiplier_override numeric(6,3),      -- e.g. 1.10 instead of 1.12
  truck_per_hour_override     numeric(10,2),
  packing_per_hour_override   numeric(10,2),
  updated_at               timestamptz not null default now(),
  unique (provider_id)
);

-- ────────────────────────────────────────────────────────────────
-- RLS — read-only for anon (public-facing pricing transparency),
-- update restricted to service_role + authenticated providers
-- editing their own row in provider_pricing.
-- ────────────────────────────────────────────────────────────────

alter table public.countries_pricing         enable row level security;
alter table public.cities_pricing            enable row level security;
alter table public.crew_multipliers          enable row level security;
alter table public.service_type_adjustments  enable row level security;
alter table public.complexity_adjustments    enable row level security;
alter table public.seasonal_adjustments      enable row level security;
alter table public.insurance_options         enable row level security;
alter table public.commission_rules          enable row level security;
alter table public.provider_pricing          enable row level security;

create policy "anon read pricing"   on public.countries_pricing         for select using (true);
create policy "anon read pricing"   on public.cities_pricing            for select using (true);
create policy "anon read pricing"   on public.crew_multipliers          for select using (true);
create policy "anon read pricing"   on public.service_type_adjustments  for select using (true);
create policy "anon read pricing"   on public.complexity_adjustments    for select using (true);
create policy "anon read pricing"   on public.seasonal_adjustments      for select using (true);
create policy "anon read pricing"   on public.insurance_options         for select using (true);
create policy "anon read commission" on public.commission_rules          for select using (true);

-- Providers may read + update their own override row only.
create policy "provider reads own pricing"
  on public.provider_pricing for select
  using (provider_id = auth.uid());

create policy "provider updates own pricing"
  on public.provider_pricing for update
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());

-- ────────────────────────────────────────────────────────────────
-- SEED — mirrors src/lib/pricing-engine/data.ts. Generate from
-- the TS module with a small build script if you want this kept
-- automatically in sync; for now treat the TS as source of truth
-- and seed manually on first deploy.
-- ────────────────────────────────────────────────────────────────

-- Example country seed:
-- insert into countries_pricing (country_code, base_hourly, currency, symbol, per_km)
-- values ('us', 75, 'USD', '$', 1.4) on conflict (country_code) do update
-- set base_hourly = excluded.base_hourly, currency = excluded.currency,
--     symbol = excluded.symbol, per_km = excluded.per_km;

-- Full seed file generated by `npm run pricing:seed:sql` — see ./seed-data.sql
-- (this file deliberately avoids inlining 100+ INSERT lines that would rot).
