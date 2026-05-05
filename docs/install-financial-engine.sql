-- ─────────────────────────────────────────────────────────────────
-- install-financial-engine.sql
--
-- Automatic accounting engine for the FlyttGo marketplace. Booking
-- escrow capture, escrow release, refunds, and subscription
-- payments now post balanced double-entry journal entries on the
-- PLATFORM books in the same transaction as the source mutation —
-- there is no manual ledger work.
--
-- Idempotent: every CREATE / ALTER uses IF NOT EXISTS / OR REPLACE
-- and every trigger function checks for an existing source row
-- before posting, so re-running the migration is safe.
--
-- Companion files:
--   docs/install-accounting-subsystem.sql  (base schema)
--   src/accounting/components/StatutoryReports.tsx (Cash Flow tab)
--   src/accounting/service.ts (fetchCashFlow / payouts / reconciliation)
-- ─────────────────────────────────────────────────────────────────

/* ── 1. Source tracking on journal entries ───────────────────── */
alter table public.journal_entries
  add column if not exists source_type text
    check (source_type is null or source_type in (
      'manual','booking_escrow_held','booking_escrow_released',
      'booking_refund','subscription_payment','adjustment')),
  add column if not exists source_id uuid;
create index if not exists journal_entries_source_idx
  on public.journal_entries (source_type, source_id);

/* ── 2. Allow PLATFORM jurisdiction ──────────────────────────── */
alter table public.accounts        drop constraint if exists accounts_jurisdiction_check;
alter table public.accounts        add  constraint accounts_jurisdiction_check
  check (jurisdiction in ('NO','GB','US','IFRS','PLATFORM'));
alter table public.journal_entries drop constraint if exists journal_entries_jurisdiction_check;
alter table public.journal_entries add  constraint journal_entries_jurisdiction_check
  check (jurisdiction in ('NO','GB','US','IFRS','PLATFORM'));

/* ── 3. PLATFORM chart-of-accounts seed ─────────────────────── */
insert into public.accounts (jurisdiction, code, display_name, account_type, is_statutory) values
  ('PLATFORM','1000','Cash and bank',                'asset',     true),
  ('PLATFORM','1100','Accounts receivable',          'asset',     true),
  ('PLATFORM','1200','Stripe in-transit',            'asset',     true),
  ('PLATFORM','2100','Customer escrow funds',        'liability', true),
  ('PLATFORM','2200','Accounts payable to providers','liability', true),
  ('PLATFORM','2300','Sales tax / VAT payable',      'liability', true),
  ('PLATFORM','3000','Retained earnings',            'equity',    true),
  ('PLATFORM','4000','Platform commission revenue',  'income',    true),
  ('PLATFORM','4100','Subscription revenue',         'income',    true),
  ('PLATFORM','4200','Enterprise contract revenue',  'income',    true),
  ('PLATFORM','5000','Payment processor fees',       'expense',   true),
  ('PLATFORM','5100','Refunds and chargebacks',      'expense',   true),
  ('PLATFORM','5200','Operational costs',            'expense',   true)
on conflict (jurisdiction, code) do nothing;

/* ── 4. Account lookup helper ──────────────────────────────── */
create or replace function public.fn_platform_account(p_code text) returns uuid
language sql stable as $$
  select id from public.accounts where jurisdiction='PLATFORM' and code=p_code limit 1;
$$;

/* ── 5. Two-legged auto-post helper ────────────────────────── */
create or replace function public.fn_post_two_legged_entry(
  p_entry_number text, p_entry_date date, p_description text,
  p_source_type text, p_source_id uuid,
  p_dr_account uuid, p_cr_account uuid, p_amount numeric,
  p_currency text default 'USD', p_base_currency text default 'USD'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.journal_entries
    (jurisdiction, entry_number, entry_date, description, status, source_type, source_id, posted_at)
  values
    ('PLATFORM', p_entry_number, p_entry_date, p_description, 'posted', p_source_type, p_source_id, now())
  returning id into v_id;
  insert into public.journal_lines
    (entry_id, line_number, account_id, side, amount, currency, base_currency, description)
  values
    (v_id, 1, p_dr_account, 'debit',  p_amount, p_currency, p_base_currency, p_description),
    (v_id, 2, p_cr_account, 'credit', p_amount, p_currency, p_base_currency, p_description);
  return v_id;
end;
$$;

/* ── 6. Booking ledger trigger ────────────────────────────── */
create or replace function public.fn_post_booking_ledger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric; v_driver numeric; v_commission numeric;
  v_currency text := 'USD';
  v_cash_id uuid; v_esc_id uuid; v_ap_id uuid; v_rev_id uuid; v_refund_id uuid;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  if old.payment_status is not distinct from new.payment_status then return new; end if;
  v_amount := coalesce(new.final_price, new.price_estimate, 0);
  if v_amount <= 0 then return new; end if;

  v_cash_id := public.fn_platform_account('1000');
  v_esc_id  := public.fn_platform_account('2100');
  v_ap_id   := public.fn_platform_account('2200');
  v_rev_id  := public.fn_platform_account('4000');
  v_refund_id := public.fn_platform_account('5100');

  if new.payment_status in ('paid','escrow') and old.payment_status not in ('paid','escrow','released','refunded') then
    if not exists (select 1 from public.journal_entries where source_type='booking_escrow_held' and source_id=new.id) then
      perform public.fn_post_two_legged_entry(
        'AUTO-' || substr(new.id::text,1,8) || '-ESC',
        coalesce(new.move_date, current_date),
        'Booking escrow capture · ' || coalesce(new.id::text,''),
        'booking_escrow_held', new.id,
        v_cash_id, v_esc_id, v_amount, v_currency, v_currency);
    end if;
  end if;

  if new.payment_status = 'released' and old.payment_status <> 'released' then
    select coalesce(driver_earning,0) into v_driver
      from public.escrow_payments where booking_id=new.id order by created_at desc limit 1;
    v_driver := coalesce(v_driver, 0);
    v_commission := greatest(v_amount - v_driver, 0);

    if not exists (select 1 from public.journal_entries where source_type='booking_escrow_released' and source_id=new.id) then
      declare v_release_id uuid;
      begin
        insert into public.journal_entries
          (jurisdiction, entry_number, entry_date, description, status, source_type, source_id, posted_at)
        values
          ('PLATFORM','AUTO-' || substr(new.id::text,1,8) || '-REL', current_date,
           'Escrow release + commission split · ' || coalesce(new.id::text,''),
           'posted','booking_escrow_released', new.id, now())
        returning id into v_release_id;

        insert into public.journal_lines (entry_id, line_number, account_id, side, amount, currency, base_currency)
          values (v_release_id, 1, v_esc_id, 'debit', v_amount, v_currency, v_currency);
        if v_driver > 0 then
          insert into public.journal_lines (entry_id, line_number, account_id, side, amount, currency, base_currency)
            values (v_release_id, 2, v_ap_id, 'credit', v_driver, v_currency, v_currency);
        end if;
        if v_commission > 0 then
          insert into public.journal_lines (entry_id, line_number, account_id, side, amount, currency, base_currency)
            values (v_release_id, 3, v_rev_id, 'credit', v_commission, v_currency, v_currency);
        end if;
      end;
    end if;
  end if;

  if new.payment_status = 'refunded' and old.payment_status <> 'refunded' then
    if not exists (select 1 from public.journal_entries where source_type='booking_refund' and source_id=new.id) then
      perform public.fn_post_two_legged_entry(
        'AUTO-' || substr(new.id::text,1,8) || '-REF', current_date,
        'Booking refund · ' || coalesce(new.id::text,''),
        'booking_refund', new.id,
        v_refund_id, v_cash_id, v_amount, v_currency, v_currency);
    end if;
  end if;

  return new;
end;
$$;
drop trigger if exists tr_booking_ledger_post on public.bookings;
create trigger tr_booking_ledger_post
  after update on public.bookings
  for each row execute function public.fn_post_booking_ledger();

/* ── 7. Subscription ledger trigger ───────────────────────── */
create or replace function public.fn_post_subscription_ledger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cash_id uuid := public.fn_platform_account('1000');
  v_sub_rev uuid := public.fn_platform_account('4100');
begin
  if new.amount is null or new.amount <= 0 then return new; end if;
  if exists (select 1 from public.journal_entries where source_type='subscription_payment' and source_id=new.id) then return new; end if;
  perform public.fn_post_two_legged_entry(
    'AUTO-SUB-' || substr(new.id::text,1,8),
    coalesce(new.created_at::date, current_date),
    'Subscription payment · driver ' || coalesce(new.driver_id::text,''),
    'subscription_payment', new.id,
    v_cash_id, v_sub_rev, new.amount, 'USD', 'USD');
  return new;
end;
$$;
drop trigger if exists tr_subscription_ledger_post on public.subscription_payments;
create trigger tr_subscription_ledger_post
  after insert on public.subscription_payments
  for each row execute function public.fn_post_subscription_ledger();

/* ── 8. Cash flow statement view ─────────────────────────── */
drop view if exists public.v_cash_flow_statement cascade;
create view public.v_cash_flow_statement with (security_invoker = true) as
with cash_lines as (
  select e.id as entry_id, e.entry_date, e.fiscal_year, e.fiscal_period,
         e.description, e.source_type, e.jurisdiction,
         case when l.side='debit' then l.amount_base_currency else -l.amount_base_currency end as cash_delta
  from public.journal_entries e
  join public.journal_lines   l on l.entry_id=e.id
  join public.accounts        a on a.id=l.account_id
  where e.status='posted' and a.jurisdiction='PLATFORM' and a.code='1000'
),
classified as (
  select c.*,
    (select a.account_type from public.journal_lines l2
       join public.accounts a on a.id=l2.account_id
      where l2.entry_id=c.entry_id and a.code <> '1000' limit 1) as counterparty_type
  from cash_lines c
)
select jurisdiction, fiscal_year, fiscal_period, entry_date, entry_id, description, source_type, cash_delta,
  case
    when counterparty_type in ('income','expense','liability') then 'operating'
    when counterparty_type = 'asset'                            then 'investing'
    when counterparty_type = 'equity'                           then 'financing'
    else 'operating'
  end as activity_section
from classified order by entry_date, entry_id;
grant select on public.v_cash_flow_statement to authenticated;

/* ── 9. Provider payouts report ─────────────────────────── */
drop view if exists public.v_provider_payouts cascade;
create view public.v_provider_payouts with (security_invoker = true) as
select t.driver_id, dp.full_name as driver_name, dp.zone as driver_country,
  date_trunc('month', t.created_at)::date as month,
  count(*) as payout_count,
  sum(case when t.type in ('escrow_release','payout') then t.amount else 0 end) as gross_paid,
  sum(case when t.type = 'subscription_credit'         then t.amount else 0 end) as credits_issued,
  sum(t.amount) as total_movement
from public.driver_wallet_transactions t
left join public.driver_profiles dp on dp.user_id = t.driver_id
group by t.driver_id, dp.full_name, dp.zone, date_trunc('month', t.created_at)
order by month desc, gross_paid desc;
grant select on public.v_provider_payouts to authenticated;

/* ── 10. Reconciliation view ────────────────────────────── */
drop view if exists public.v_payment_reconciliation cascade;
create view public.v_payment_reconciliation with (security_invoker = true) as
select b.id as booking_id, b.created_at as booking_created_at, b.payment_status,
  coalesce(b.final_price, b.price_estimate, 0) as booking_amount,
  e.id as entry_id, e.entry_date as posted_at, e.source_type,
  sum(case when l.side='debit'  then l.amount_base_currency else 0 end) as ledger_debit,
  sum(case when l.side='credit' then l.amount_base_currency else 0 end) as ledger_credit,
  case when abs(coalesce(b.final_price, b.price_estimate, 0)
              - sum(case when l.side='debit' then l.amount_base_currency else 0 end)) > 0.01
       then true else false end as has_mismatch
from public.bookings b
left join public.journal_entries e on e.source_id=b.id and e.source_type like 'booking_%'
left join public.journal_lines   l on l.entry_id=e.id
left join public.accounts        a on a.id=l.account_id and a.code='1000' and a.jurisdiction='PLATFORM'
where b.payment_status is not null
group by b.id, b.created_at, b.payment_status, b.final_price, b.price_estimate, e.id, e.entry_date, e.source_type
order by b.created_at desc;
grant select on public.v_payment_reconciliation to authenticated;
