-- ─────────────────────────────────────────────────────────────────
-- install-stripe-connect.sql
--
-- Stripe Connect Express onboarding for drivers — self-serve payouts.
-- Replaces the manual admin-approves-bank-details flow with a
-- Stripe-hosted KYC + bank-collection flow that takes ~60 s.
--
-- This file owns:
--   1. stripe_connect_accounts  — one row per driver, linking
--                                 their Supabase user_id to a Stripe
--                                 Connect account id
--   2. RLS                      — drivers see/update their own row
--                                 only; admins see everything
--   3. trigger                  — auto-create the row when a driver
--                                 application is approved
--
-- Companion code:
--   supabase/functions/stripe-connect-onboarding/index.ts
--   supabase/functions/stripe-webhook/index.ts            (account.updated)
--   src/services/stripeConnect.ts
--   src/components/driver/StripeConnectCard.tsx
--
-- Idempotent: drop + recreate.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.stripe_connect_accounts (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id    text unique,

  /* Cached snapshot of Stripe's `Account.charges_enabled` /
   * `payouts_enabled` so the driver portal can render the right
   * state without an API round-trip. Refreshed by the
   * `account.updated` webhook handler. */
  charges_enabled      boolean not null default false,
  payouts_enabled      boolean not null default false,
  details_submitted    boolean not null default false,
  /* Free-form requirement codes Stripe lists in
   * `requirements.currently_due` — surfaced in the UI so drivers
   * know exactly what's blocking them. */
  requirements_due     text[]  not null default '{}'::text[],

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.stripe_connect_accounts enable row level security;

drop policy if exists stripe_connect_self_select on public.stripe_connect_accounts;
create policy stripe_connect_self_select on public.stripe_connect_accounts
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

/* INSERT/UPDATE — server-side only (edge functions use the service
 * role key). No client-side write policy by design. */

/* Auto-create an empty row when an application is approved so the
 * driver portal has something to render the "Set up payouts" CTA
 * against. The edge function backfills the stripe_account_id when
 * the driver clicks through. */
create or replace function public.handle_driver_application_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status = 'approved' and (old.status is distinct from new.status)) then
    insert into public.stripe_connect_accounts (user_id)
    values (new.user_id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists driver_app_approved_creates_stripe_row on public.driver_applications;
create trigger driver_app_approved_creates_stripe_row
  after update on public.driver_applications
  for each row
  execute function public.handle_driver_application_approved();

-- Sanity:
-- select user_id, charges_enabled, payouts_enabled, requirements_due
--   from public.stripe_connect_accounts limit 5;
