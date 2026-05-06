-- ─────────────────────────────────────────────────────────────────
-- backfill-booking-country.sql
--
-- One-shot backfill for bookings rows that pre-date the
-- booking_country column. New bookings get the country tagged at
-- insert time by services/bookings.createBookingWithEscrow; this
-- script tags historical rows by inferring the country from
-- pickup_address / pickup_city.
--
-- Run once. Subsequent inserts populate booking_country directly.
--
-- Inference rules (extend per market as needed):
--   - 'British Columbia' / 'Ontario' / 'Quebec' → CA
--   - US state abbreviation in pickup_address → US
--   - default fallback when neither matches → US (most legacy
--     bookings are US-origin)
-- ─────────────────────────────────────────────────────────────────

update public.bookings
   set booking_country = 'CA'
 where booking_country is null
   and (
        pickup_address ilike '%british columbia%'
     or pickup_address ilike '%ontario%'
     or pickup_address ilike '%quebec%'
     or pickup_address ilike '%alberta%'
   );

update public.bookings
   set booking_country = 'US'
 where booking_country is null
   and pickup_address ~ '\m(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\M';

-- Anything still NULL (rare): assume US, the home market.
update public.bookings
   set booking_country = 'US'
 where booking_country is null;

-- Verify
select booking_country, count(*)
  from public.bookings
 group by booking_country
 order by count(*) desc;
