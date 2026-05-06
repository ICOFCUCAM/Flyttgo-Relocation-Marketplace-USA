-- ─────────────────────────────────────────────────────────────────
-- install-subscription-tier-price-overrides.sql
--
-- Adds per-country USD price overrides to subscription_tiers so ops
-- can set explicit dollar amounts per market instead of relying on
-- the country-multiplier model.
--
-- New shape per tier row:
--
--   prices_by_country  jsonb    e.g. {"us": 79, "no": 100, "gb": 70}
--
-- Resolution order in the rebuilt view:
--
--   1. prices_by_country[country_code]  (USD, multiplier SKIPPED)
--   2. baseline_usd × country_multiplier (legacy fallback)
--
-- TS counterpart: SubscriptionTier.pricesByCountry in
--                 src/lib/subscription-tiers.ts.
--
-- Idempotent: column is added only if missing; view is rebuilt.
-- ─────────────────────────────────────────────────────────────────

alter table public.subscription_tiers
  add column if not exists prices_by_country jsonb not null default '{}'::jsonb;

drop view if exists public.subscription_tier_pricing_by_country cascade;

create view public.subscription_tier_pricing_by_country as
select
  st.slug                             as tier_slug,
  st.display_name,
  st.short_name,
  st.tagline,
  st.commission_pct,
  st.privileges,
  st.trust_badge,
  st.popular,
  st.position,
  cp.country_code,
  cp.display_name                     as country_name,
  cs.currency,
  cs.symbol,
  cs.locale,
  coalesce(scm.multiplier, 1.0)       as country_multiplier,
  st.baseline_usd,
  -- Resolved USD baseline: per-country override wins.
  coalesce(
    (st.prices_by_country ->> cp.country_code)::numeric,
    st.baseline_usd
  )                                   as effective_usd,
  -- Local price: override → already country-specific, multiplier
  -- skipped. Otherwise baseline × multiplier × usd_rate.
  round(
    coalesce(
      (st.prices_by_country ->> cp.country_code)::numeric * cs.usd_rate,
      st.baseline_usd * coalesce(scm.multiplier, 1.0) * cs.usd_rate
    )
  )::numeric(12,2)                    as local_price
from public.subscription_tiers st
cross join public.country_profiles cp
join public.currency_settings cs on cs.currency = cp.currency
left join public.subscription_country_multipliers scm on scm.country_code = cp.country_code
order by st.position, cp.country_code;

grant select on public.subscription_tier_pricing_by_country to anon, authenticated;

-- ── Setting an override (example) ────────────────────────────────
--
-- update public.subscription_tiers
--    set prices_by_country = jsonb_set(
--      coalesce(prices_by_country, '{}'::jsonb),
--      '{no}',
--      to_jsonb(35)         -- USD price for Norway
--    )
--  where slug = 'silver_plus';
--
-- ── Inspecting current effective prices per (tier, country) ──────
--
-- select tier_slug, country_code, effective_usd, local_price, currency
--   from public.subscription_tier_pricing_by_country
--  where country_code in ('us','ca','gb','de','fr','no')
--  order by position, country_code;
