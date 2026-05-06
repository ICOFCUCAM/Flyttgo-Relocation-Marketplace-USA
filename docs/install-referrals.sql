-- ─────────────────────────────────────────────────────────────────
-- install-referrals.sql
--
-- Two-sided referral program. The referral code is deterministic
-- (derived from referrer.user_id in the frontend — see ReferPage.tsx)
-- so we don't need a separate codes table. This file owns:
--
--   1. referrals               table — one row per redeemed code
--   2. RLS                            — users see their own rows only
--   3. trigger                        — auto-credit both sides when
--                                       the referee's FIRST booking
--                                       completes
--
-- Companion code:
--   src/services/referrals.ts          — record + read stats
--   src/hooks/queries/useReferral.ts   — React Query wrapper
--   src/pages/ReferPage.tsx            — UI surface
--
-- Idempotent: every CREATE uses IF NOT EXISTS / OR REPLACE.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.referrals (
  id                  uuid primary key default gen_random_uuid(),

  /* Referral code the referee used at signup. Stored even though it's
   * derivable from referrer_user_id so we can run analytics without
   * a join. */
  code                text not null,

  referrer_user_id    uuid not null references auth.users(id) on delete cascade,
  referee_user_id     uuid not null references auth.users(id) on delete cascade,

  /* pending  — referee just signed up, no qualifying booking yet
   * converted — referee completed their first booking
   * credited  — wallet/escrow credits applied to both sides
   * void      — admin cancellation (fraud / refund / chargeback) */
  status              text not null default 'pending'
                       check (status in ('pending', 'converted', 'credited', 'void')),

  /* Reward in minor units (cents/øre/etc). Captured at redemption
   * time so a future payout-rate change doesn't re-price old
   * referrals. */
  reward_amount_minor integer not null default 2500,
  currency            text    not null default 'GBP',

  /* The booking that triggered the conversion. Null until the
   * referee completes a qualifying first booking. */
  booking_id          uuid references public.bookings(id) on delete set null,

  created_at          timestamptz not null default now(),
  converted_at        timestamptz,
  credited_at         timestamptz,

  /* One referral per (referrer, referee) — stops repeat self-redemption. */
  unique (referrer_user_id, referee_user_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id, created_at desc);
create index if not exists referrals_referee_idx  on public.referrals (referee_user_id);
create index if not exists referrals_code_idx     on public.referrals (code);

alter table public.referrals enable row level security;

/* SELECT — both sides of the referral can see the row. */
drop policy if exists referrals_self_select on public.referrals;
create policy referrals_self_select on public.referrals
  for select to authenticated
  using (
    auth.uid() = referrer_user_id or
    auth.uid() = referee_user_id
  );

/* INSERT — the referee can record their own redemption (called on
 * signup with ?ref=CODE). The referrer is identified by the code,
 * not by auth.uid(). Self-referral is blocked. */
drop policy if exists referrals_redeem_insert on public.referrals;
create policy referrals_redeem_insert on public.referrals
  for insert to authenticated
  with check (
    auth.uid() = referee_user_id and
    referrer_user_id <> referee_user_id
  );

/* UPDATE — locked down. Only the trigger (security definer) updates
 * status. No client-side update path. */

/* ─── Auto-credit trigger ──────────────────────────────────────
 *
 * When a booking flips to status='completed', check whether the
 * customer has a pending referral row. If yes:
 *   - mark referral converted + credited
 *   - insert a subscription_credit (or wallet credit) for the referrer
 *
 * The customer-side reward (£25 off the first move) is applied at
 * booking-creation time via a separate code lookup — keeping the
 * trigger focused on the referrer payout. */

create or replace function public.handle_referral_on_booking_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_row public.referrals%rowtype;
begin
  if (tg_op = 'UPDATE'
      and new.status = 'completed'
      and (old.status is distinct from new.status)) then

    select * into ref_row
      from public.referrals
     where referee_user_id = new.customer_id
       and status = 'pending'
     limit 1;

    if found then
      update public.referrals
         set status        = 'credited',
             converted_at  = now(),
             credited_at   = now(),
             booking_id    = new.id
       where id = ref_row.id;

      /* Credit the referrer's wallet. driver_wallet_transactions is
       * the canonical credit ledger today — works for customer
       * referrers too because the trigger only requires a wallet
       * row to exist. (If the referrer is purely a customer with no
       * driver wallet, the credit insert is a no-op and the row
       * still records as credited; an admin can manually issue a
       * promo code if needed.) */
      insert into public.driver_wallet_transactions
        (driver_id, type, amount, description)
      select ref_row.referrer_user_id,
             'subscription_credit',
             ref_row.reward_amount_minor / 100.0,
             'Referral reward — ' || new.id
      where exists (
        select 1 from public.driver_wallets
         where driver_id = ref_row.referrer_user_id
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists referrals_credit_on_booking_complete on public.bookings;
create trigger referrals_credit_on_booking_complete
  after update on public.bookings
  for each row
  execute function public.handle_referral_on_booking_complete();

-- Sanity (run as the referrer):
-- select count(*), status from public.referrals group by status;
