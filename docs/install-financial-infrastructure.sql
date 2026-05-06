-- ─────────────────────────────────────────────────────────────────
-- install-financial-infrastructure.sql
--
-- Layer 2 of the FlyttGo finance system. Sits on top of the
-- accounting subsystem (install-accounting-subsystem.sql) and the
-- auto-posting engine (install-financial-engine.sql) to add:
--
--   1. provider_payouts                    payout scheduling state
--   2. fraud_alerts + fn_run_fraud_scan    anomaly detection
--   3. v_top_corridors                     intelligence: corridor GMV
--   4. v_provider_earnings_distribution    intelligence: earnings histogram
--   5. v_tax_collected                     VAT report by jurisdiction
--   6. v_subscription_billing_status       subscription health
--   7. v_invoice_lines                     auto-generated invoice payload
--
-- Idempotent. Apply AFTER install-accounting-subsystem.sql and
-- install-financial-engine.sql.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.provider_payouts (
  id              uuid primary key default gen_random_uuid(),
  driver_id       uuid not null references auth.users(id) on delete cascade,
  booking_id      uuid references public.bookings(id) on delete set null,
  amount          numeric(18,4) not null check (amount > 0),
  currency        text not null references public.currencies(code) default 'USD',
  status          text not null default 'scheduled'
                  check (status in ('scheduled','processing','paid','failed','cancelled')),
  schedule_kind   text not null default 'instant'
                  check (schedule_kind in ('instant','weekly','monthly','manual')),
  scheduled_for   timestamptz not null default now(),
  processed_at    timestamptz,
  failure_reason  text,
  external_ref    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.fraud_alerts (
  id            uuid primary key default gen_random_uuid(),
  detected_at   timestamptz not null default now(),
  severity      text not null check (severity in ('low','medium','high','critical')),
  category      text not null,
  subject_type  text not null,
  subject_id    uuid not null,
  amount        numeric(18,4),
  metric_value  numeric(18,4),
  message       text not null,
  status        text not null default 'open'
                check (status in ('open','reviewing','dismissed','confirmed_fraud')),
  resolved_by   uuid references auth.users(id),
  resolved_at   timestamptz
);

-- See applied migration in Supabase project ewzjsxsttsgflhcwjekc for the
-- full RLS policies, fn_run_fraud_scan() function body, and the five
-- analytics / invoice views (v_top_corridors, v_provider_earnings_
-- distribution, v_tax_collected, v_subscription_billing_status,
-- v_invoice_lines). Truncated locally to keep this file readable; the
-- canonical source of truth is the live database.
