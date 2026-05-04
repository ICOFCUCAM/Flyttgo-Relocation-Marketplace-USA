-- ─────────────────────────────────────────────────────────────────
-- install-admin-geography-views.sql
--
-- Backs the AdminDashboard "Geography" tab with four aggregate views
-- so client-side aggregation doesn't pull every row to the browser.
--
-- Each view is created with security_invoker = true so the existing
-- admin RLS policies on the underlying tables decide visibility:
-- admins see everything, non-admins see only their own rows (which
-- means non-admin queries return tiny / empty aggregations rather
-- than leaking PII).
--
-- Country source priority (drivers + applications + documents):
--   1. driver_applications.zone   ← what onboarding writes
--   2. driver_profiles.zone       ← persisted after activation
--   3. profiles.country           ← generic fallback
--   4. literal 'unknown'          ← so rows don't get dropped
--
-- For bookings the country lives directly on bookings.booking_country.
--
-- Idempotent: each view is dropped and recreated.
-- ─────────────────────────────────────────────────────────────────

-- ── 1. Drivers per country ───────────────────────────────────────
drop view if exists public.admin_country_driver_stats cascade;
create view public.admin_country_driver_stats
  with (security_invoker = true) as
select
  coalesce(dp.zone, p.country, 'unknown') as country,
  count(*)                                                             as drivers_total,
  count(*) filter (where dp.online)                                    as drivers_online,
  count(*) filter (where dp.status = 'approved')                       as drivers_approved,
  count(*) filter (where dp.status = 'suspended')                      as drivers_suspended,
  count(*) filter (where dp.subscription_active)                       as drivers_subscribed,
  round(avg(dp.rating)::numeric, 2)                                    as avg_rating,
  round(avg(dp.acceptance_rate)::numeric, 2)                           as avg_acceptance_rate
from public.driver_profiles dp
left join public.profiles p on p.user_id = dp.user_id
group by 1;

grant select on public.admin_country_driver_stats to authenticated;

-- ── 2. Applications per country × status ─────────────────────────
drop view if exists public.admin_country_application_stats cascade;
create view public.admin_country_application_stats
  with (security_invoker = true) as
select
  coalesce(da.zone, p.country, 'unknown')                              as country,
  count(*)                                                             as applications_total,
  count(*) filter (where da.status = 'pending')                        as pending,
  count(*) filter (where da.status = 'approved')                       as approved,
  count(*) filter (where da.status = 'rejected')                       as rejected,
  count(*) filter (where da.created_at > now() - interval '30 days')   as last_30d
from public.driver_applications da
left join public.profiles p on p.user_id = da.user_id
group by 1;

grant select on public.admin_country_application_stats to authenticated;

-- ── 3. Documents per country × document_type × status ────────────
drop view if exists public.admin_country_document_stats cascade;
create view public.admin_country_document_stats
  with (security_invoker = true) as
select
  coalesce(da.zone, dp.zone, p.country, 'unknown')                     as country,
  dd.document_type,
  count(*)                                                             as docs_total,
  count(*) filter (where dd.verification_status = 'approved')          as approved,
  count(*) filter (where dd.verification_status = 'pending')           as pending,
  count(*) filter (where dd.verification_status = 'rejected')          as rejected
from public.driver_documents dd
left join public.driver_applications da on da.user_id = dd.driver_id
left join public.driver_profiles    dp on dp.user_id = dd.driver_id
left join public.profiles           p  on p.user_id  = dd.driver_id
group by 1, 2;

grant select on public.admin_country_document_stats to authenticated;

-- ── 4. Bookings + revenue per country ────────────────────────────
drop view if exists public.admin_country_booking_stats cascade;
create view public.admin_country_booking_stats
  with (security_invoker = true) as
select
  coalesce(booking_country, 'unknown')                                                            as country,
  count(*)                                                                                        as bookings_total,
  count(*) filter (where status = 'completed')                                                    as completed,
  count(*) filter (where status = 'cancelled')                                                    as cancelled,
  count(*) filter (where status in ('pending','confirmed','assigned','in_transit'))               as in_flight,
  count(*) filter (where created_at > now() - interval '30 days')                                 as last_30d,
  coalesce(sum(final_price)        filter (where status = 'completed'), 0)::numeric(14,2)         as gross_revenue,
  coalesce(sum(commission_amount)  filter (where status = 'completed'), 0)::numeric(14,2)         as platform_commission,
  coalesce(sum(driver_earning)     filter (where status = 'completed'), 0)::numeric(14,2)         as driver_payouts
from public.bookings
group by 1;

grant select on public.admin_country_booking_stats to authenticated;

-- ── 5. Document expiry tracking ──────────────────────────────────
--
-- Adds an expires_at column to driver_documents so admins can
-- record when a licence / insurance certificate expires. Nullable
-- for doc types that don't expire (profile_photo, identity_document).
alter table public.driver_documents
  add column if not exists expires_at date;

-- View: documents expired or expiring soon, grouped by country.
drop view if exists public.admin_country_document_expiry cascade;
create view public.admin_country_document_expiry
  with (security_invoker = true) as
select
  coalesce(da.zone, dp.zone, p.country, 'unknown')                                              as country,
  dd.document_type,
  count(*) filter (where dd.expires_at < current_date)                                           as expired,
  count(*) filter (where dd.expires_at >= current_date and dd.expires_at < current_date + 30)   as expiring_30d,
  count(*) filter (where dd.expires_at is not null)                                              as tracked,
  count(*)                                                                                       as docs_total
from public.driver_documents dd
left join public.driver_applications da on da.user_id = dd.driver_id
left join public.driver_profiles    dp on dp.user_id = dd.driver_id
left join public.profiles           p  on p.user_id  = dd.driver_id
group by 1, 2;
grant select on public.admin_country_document_expiry to authenticated;

-- ── 6. Country compliance scoring ────────────────────────────────
--
-- Per-country health score across the universal application fields
-- + that country's regulatory column (USDOT/MC/cargo for US, GUKG
-- for DE, GVOL for GB, SIRET/TVA for FR, etc.). Countries without
-- a dedicated column on driver_applications score 1/1 on the
-- country-specific axis so the schema gap doesn't penalise them.
drop view if exists public.admin_country_compliance cascade;
create view public.admin_country_compliance
  with (security_invoker = true) as
with rows as (
  select
    coalesce(da.zone, p.country, 'unknown') as country,
    (da.license_number is not null and da.license_number <> '')::int             as has_license,
    (da.license_expiry is not null)::int                                          as has_license_expiry,
    (da.vehicle_registration is not null and da.vehicle_registration <> '')::int as has_vehicle_reg,
    (da.provider_category is not null and da.provider_category <> '')::int       as has_provider_category,
    case
      when coalesce(da.zone, p.country) ilike 'us'
        then ((da.usdot_number is not null) or (da.mc_number is not null) or (da.cargo_insurance is not null))::int
      when coalesce(da.zone, p.country) ilike 'gb'
        then (da.gvol_number is not null)::int
      when coalesce(da.zone, p.country) ilike 'de'
        then (da.gukg_licence is not null)::int
      when coalesce(da.zone, p.country) ilike 'no'
        then (da.yrkestransport is not null)::int
      when coalesce(da.zone, p.country) ilike 'fr'
        then ((da.siret is not null) or (da.tva is not null))::int
      when coalesce(da.zone, p.country) ilike 'ca'
        then (da.ca_provincial_licence is not null)::int
      else 1
    end as has_country_specific
  from public.driver_applications da
  left join public.profiles p on p.user_id = da.user_id
)
select
  country,
  count(*)                                                                               as applications_total,
  sum(has_license)                                                                       as with_license,
  sum(has_license_expiry)                                                                as with_license_expiry,
  sum(has_vehicle_reg)                                                                   as with_vehicle_reg,
  sum(has_provider_category)                                                             as with_provider_category,
  sum(has_country_specific)                                                              as with_country_specific,
  round(
    (sum(has_license + has_license_expiry + has_vehicle_reg + has_provider_category + has_country_specific)::numeric
     / nullif(count(*) * 5, 0)) * 100,
    1
  ) as compliance_pct
from rows
group by country;
grant select on public.admin_country_compliance to authenticated;

-- ── 7. Verification queries ──────────────────────────────────────
--
-- After applying, sanity-check from the SQL editor (admin role):
--
--   select * from public.admin_country_driver_stats        order by drivers_total desc;
--   select * from public.admin_country_application_stats   order by applications_total desc;
--   select * from public.admin_country_document_stats      order by country, document_type;
--   select * from public.admin_country_booking_stats       order by bookings_total desc;
