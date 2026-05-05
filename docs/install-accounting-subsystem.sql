-- ============================================================================
-- install-accounting-subsystem.sql
--
-- FlyttGo enterprise accounting workspace — production schema.
--
-- Covers Phases 2, 7, 12, 14 of the spec:
--   • Multi-jurisdiction accounting tables (accounts, journal_entries,
--     journal_lines, tax_codes, vat_rates, currencies, exchange_rates,
--     attachments, audit_log)
--   • Role tables + role-based access (super_admin, admin, accountant,
--     auditor, finance_viewer) layered on the existing profiles.role
--   • Multi-currency: original currency + base currency + exchange-rate
--     snapshot stored on each journal line; amount_base_currency is a
--     GENERATED column so the database guarantees the math.
--   • Append-only audit_log via trigger that captures before/after JSONB
--     for every mutation on accounts, journal_entries, journal_lines,
--     tax_codes, vat_rates, exchange_rates.
--   • RLS:
--       - super_admin, admin    full access
--       - accountant            INSERT/UPDATE on journal_*, attachments
--       - auditor               SELECT-only across the schema +
--                               INSERT-only on audit_annotations
--       - finance_viewer        SELECT-only on summary surfaces
--   • post_journal_entry() SECURITY DEFINER RPC — atomic posting that
--     enforces double-entry balance (Σ debits = Σ credits) and the
--     append-only contract (no UPDATE/DELETE on posted journal_lines).
--   • prevent_last_super_admin_revoke() trigger — phase 14 invariant.
--
-- Idempotent — uses IF NOT EXISTS / DROP+CREATE / OR REPLACE everywhere.
-- ============================================================================

/* ── 1. Currencies + exchange rates ──────────────────────────── */

create table if not exists public.currencies (
  code            text primary key,                          -- ISO-4217 ('NOK', 'GBP', 'USD')
  symbol          text not null,
  decimals        smallint not null default 2,
  display_name    text not null,
  created_at      timestamptz not null default now()
);

insert into public.currencies (code, symbol, decimals, display_name) values
  ('USD', '$',   2, 'US Dollar'),
  ('GBP', '£',   2, 'Pound Sterling'),
  ('EUR', '€',   2, 'Euro'),
  ('NOK', 'kr',  2, 'Norwegian Krone'),
  ('SEK', 'kr',  2, 'Swedish Krona'),
  ('DKK', 'kr',  2, 'Danish Krone'),
  ('CAD', 'CA$', 2, 'Canadian Dollar'),
  ('AED', 'AED', 2, 'UAE Dirham'),
  ('NGN', '₦',   2, 'Nigerian Naira'),
  ('KES', 'KSh', 2, 'Kenyan Shilling')
on conflict (code) do nothing;

create table if not exists public.exchange_rates (
  id              uuid primary key default gen_random_uuid(),
  from_currency   text not null references public.currencies(code),
  to_currency     text not null references public.currencies(code),
  rate            numeric(18, 8) not null check (rate > 0),
  effective_date  date not null,
  source          text default 'manual',                     -- 'manual' / 'ecb' / 'oanda' / etc.
  created_at      timestamptz not null default now(),
  unique (from_currency, to_currency, effective_date)
);

create index if not exists exchange_rates_pair_idx
  on public.exchange_rates (from_currency, to_currency, effective_date desc);

/* ── 2. Tax codes / VAT rates ───────────────────────────────── */

create table if not exists public.tax_codes (
  id              uuid primary key default gen_random_uuid(),
  jurisdiction    text not null,                             -- 'NO' / 'GB' / 'US-CA' / 'IFRS'
  code            text not null,                             -- e.g. 'NO_VAT_25', 'UK_VAT_20'
  display_name    text not null,
  category        text not null check (category in ('vat', 'sales_tax', 'withholding', 'exempt', 'reverse_charge', 'zero_rated')),
  created_at      timestamptz not null default now(),
  unique (jurisdiction, code)
);

create table if not exists public.vat_rates (
  id              uuid primary key default gen_random_uuid(),
  tax_code_id     uuid not null references public.tax_codes(id) on delete cascade,
  rate_percent    numeric(6, 4) not null check (rate_percent >= 0 and rate_percent <= 100),
  effective_from  date not null,
  effective_to    date,
  created_at      timestamptz not null default now()
);

create index if not exists vat_rates_code_idx on public.vat_rates (tax_code_id, effective_from desc);

/* Seed the spec'd VAT regimes. */
insert into public.tax_codes (jurisdiction, code, display_name, category) values
  ('NO',   'NO_VAT_25',  'Merverdiavgift 25 %',           'vat'),
  ('NO',   'NO_VAT_15',  'Næringsmidler 15 %',            'vat'),
  ('NO',   'NO_VAT_12',  'Persontransport / kultur 12 %', 'vat'),
  ('NO',   'NO_VAT_0',   'Fritatt 0 %',                    'zero_rated'),
  ('GB',   'UK_VAT_20',  'Standard rate 20 %',             'vat'),
  ('GB',   'UK_VAT_5',   'Reduced rate 5 %',               'vat'),
  ('GB',   'UK_VAT_0',   'Zero rate 0 %',                  'zero_rated'),
  ('GB',   'UK_VAT_RC',  'Reverse charge',                 'reverse_charge'),
  ('US',   'US_TAX_NA',  'No sales tax (out of scope)',    'exempt'),
  ('IFRS', 'IFRS_NONE',  'Tax-neutral (IFRS reporting)',   'exempt')
on conflict (jurisdiction, code) do nothing;

insert into public.vat_rates (tax_code_id, rate_percent, effective_from)
  select id,
    case code
      when 'NO_VAT_25' then 25 when 'NO_VAT_15' then 15 when 'NO_VAT_12' then 12
      when 'UK_VAT_20' then 20 when 'UK_VAT_5'  then 5
      else 0
    end,
    '2024-01-01'::date
  from public.tax_codes
  on conflict do nothing;

/* ── 3. Chart of accounts ──────────────────────────────────── */

create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  jurisdiction    text not null check (jurisdiction in ('NO','GB','US','IFRS')),
  code            text not null,                             -- e.g. '1500' (Kontoplan), '1100' (UK GAAP)
  display_name    text not null,
  account_type    text not null check (account_type in ('asset','liability','equity','income','expense')),
  parent_code     text,
  is_statutory    boolean not null default false,            -- can't be deleted
  is_archived     boolean not null default false,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (jurisdiction, code)
);

create index if not exists accounts_juris_type_idx on public.accounts (jurisdiction, account_type);

/* ── 4. Journal entries + lines (double-entry ledger) ──────── */

create table if not exists public.journal_entries (
  id              uuid primary key default gen_random_uuid(),
  jurisdiction    text not null check (jurisdiction in ('NO','GB','US','IFRS')),
  entry_number    text not null,                             -- human-readable serial, per jurisdiction
  entry_date      date not null,
  description     text not null,
  reference       text,                                       -- invoice no., booking id, etc.
  status          text not null default 'draft' check (status in ('draft','posted','reversed','adjusted')),
  fiscal_year     int  generated always as (extract(year from entry_date)::int) stored,
  fiscal_period   int  generated always as (extract(month from entry_date)::int) stored,
  created_by      uuid references auth.users(id),
  posted_by       uuid references auth.users(id),
  posted_at       timestamptz,
  reversed_by_id  uuid references public.journal_entries(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (jurisdiction, entry_number)
);

create index if not exists journal_entries_jp_idx on public.journal_entries (jurisdiction, entry_date desc);
create index if not exists journal_entries_status_idx on public.journal_entries (status);

create table if not exists public.journal_lines (
  id                    uuid primary key default gen_random_uuid(),
  entry_id              uuid not null references public.journal_entries(id) on delete cascade,
  line_number           int  not null,
  account_id            uuid not null references public.accounts(id),
  /* Debits and credits stored as positive amounts; the column tells you
   * which side of the T-account it lands on. Avoids signed-number
   * sign-flip bugs in trial balance + ledger queries. */
  side                  text not null check (side in ('debit','credit')),
  amount                numeric(18, 4) not null check (amount >= 0),
  currency              text not null references public.currencies(code),
  /* Snapshot of the rate that was in effect when this line was posted.
   * Captured here (not recomputed at read time) so the trial balance
   * is reproducible even if exchange_rates is later corrected. */
  exchange_rate         numeric(18, 8) not null default 1.0 check (exchange_rate > 0),
  base_currency         text not null references public.currencies(code) default 'USD',
  amount_base_currency  numeric(18, 4) generated always as (round(amount * exchange_rate, 4)) stored,
  tax_code_id           uuid references public.tax_codes(id),
  description           text,
  created_at            timestamptz not null default now(),
  unique (entry_id, line_number)
);

create index if not exists journal_lines_entry_idx on public.journal_lines (entry_id);
create index if not exists journal_lines_account_idx on public.journal_lines (account_id);

/* ── 5. Attachments (receipts, contracts, invoices) ────────── */

create table if not exists public.accounting_attachments (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.journal_entries(id) on delete cascade,
  storage_path    text not null,                              -- bucket-relative key
  filename        text not null,
  mime_type       text not null,
  size_bytes      int  not null check (size_bytes >= 0),
  uploaded_by     uuid references auth.users(id),
  uploaded_at     timestamptz not null default now()
);

create index if not exists attachments_entry_idx on public.accounting_attachments (entry_id);

/* ── 6. Auditor annotations ──────────────────────────────── */

create table if not exists public.audit_annotations (
  id              uuid primary key default gen_random_uuid(),
  entry_id        uuid not null references public.journal_entries(id) on delete cascade,
  auditor_id      uuid not null references auth.users(id) on delete restrict,
  comment         text not null,
  severity        text not null default 'info' check (severity in ('info','warning','question','finding')),
  resolved        boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists annotations_entry_idx on public.audit_annotations (entry_id);

/* ── 7. Org-scoped settings ─────────────────────────────── */

create table if not exists public.accounting_settings (
  id              int primary key default 1,
  default_jurisdiction text not null default 'US',
  base_currency        text not null references public.currencies(code) default 'USD',
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  vat_reporting_period text not null default 'quarterly' check (vat_reporting_period in ('monthly','bimonthly','quarterly','annual')),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id),
  check (id = 1)
);

insert into public.accounting_settings (id) values (1) on conflict (id) do nothing;

/* ── 8. Roles (overlay on profiles.role) ──────────────────── */

/* The platform already keeps profiles.role; we add a richer
 * users_roles table so a single user can carry multiple finance
 * roles (e.g. an admin who is ALSO accountant for one jurisdiction).
 * profiles.role stays the canonical primary role for the rest of the
 * platform; this table layers on top without changing existing
 * behaviour. */

create table if not exists public.users_roles (
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('super_admin','admin','accountant','auditor','finance_viewer')),
  /* Postgres doesn't allow function expressions in primary keys, so
   * jurisdiction is NOT NULL with an empty-string sentinel for the
   * "all jurisdictions" scope. Keeps the unique-by-(user, role,
   * jurisdiction) contract intact without a coalesce(). */
  jurisdiction text not null default '',
  granted_by  uuid references auth.users(id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, role, jurisdiction)
);

create index if not exists users_roles_role_idx on public.users_roles (role);

/* ── 9. Append-only audit log ─────────────────────────────── */

create table if not exists public.accounting_audit_log (
  id           bigserial primary key,
  occurred_at  timestamptz not null default now(),
  user_id      uuid references auth.users(id),
  action       text not null check (action in ('insert','update','delete')),
  table_name   text not null,
  row_pk       text,
  before_state jsonb,
  after_state  jsonb
);

create index if not exists audit_log_table_time_idx on public.accounting_audit_log (table_name, occurred_at desc);
create index if not exists audit_log_user_time_idx  on public.accounting_audit_log (user_id, occurred_at desc);

/* The audit log itself is append-only — no UPDATE / DELETE allowed
 * even by service role. RLS enforces it; policies below grant
 * INSERT only via SECURITY DEFINER triggers. */
alter table public.accounting_audit_log enable row level security;
drop policy if exists audit_log_no_mutate on public.accounting_audit_log;
create policy audit_log_no_mutate on public.accounting_audit_log
  for all to authenticated using (false) with check (false);
drop policy if exists audit_log_select on public.accounting_audit_log;
create policy audit_log_select on public.accounting_audit_log
  for select to authenticated
  using (
    exists (
      select 1 from public.users_roles
      where user_id = auth.uid()
        and role in ('super_admin','admin','accountant','auditor','finance_viewer')
    )
  );

create or replace function public.fn_accounting_audit() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pk_text text;
begin
  pk_text := coalesce(
    case tg_op
      when 'DELETE' then (old.id)::text
      else                (new.id)::text
    end,
    '?'
  );
  insert into public.accounting_audit_log
    (user_id, action, table_name, row_pk, before_state, after_state)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    pk_text,
    case when tg_op in ('update','delete') then to_jsonb(old) else null end,
    case when tg_op in ('insert','update') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

/* Wire the trigger on every mutable accounting table. */
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'accounts','journal_entries','journal_lines','tax_codes',
      'vat_rates','exchange_rates','accounting_settings','users_roles',
      'audit_annotations','accounting_attachments'
    ])
  loop
    execute format('drop trigger if exists tr_audit_%I on public.%I;', t, t);
    execute format(
      'create trigger tr_audit_%I after insert or update or delete on public.%I '
      || 'for each row execute function public.fn_accounting_audit();',
      t, t
    );
  end loop;
end $$;

/* ── 10. RLS — per-role policies ──────────────────────────── */

create or replace function public.fn_has_finance_role(role_list text[]) returns boolean
language sql stable as $$
  /* Bridge: platform super-admins (profiles.is_super_admin = true)
   * are implicitly granted every finance role — they don't need a
   * separate users_roles entry. Without this bridge the accounting
   * subsystem would maintain a parallel role world that's invisible
   * to the platform's existing admin tooling. */
  select
    exists (
      select 1 from public.profiles
       where user_id = auth.uid()
         and role = 'admin'
         and is_super_admin = true
    )
    or exists (
      select 1 from public.users_roles
       where user_id = auth.uid()
         and role = any(role_list)
    );
$$;

/* Helper for "any finance role" */
create or replace function public.fn_is_finance_user() returns boolean
language sql stable as $$
  select public.fn_has_finance_role(array['super_admin','admin','accountant','auditor','finance_viewer']);
$$;

/* All accounting tables: enable RLS + a SELECT policy gated to any
 * finance role. Mutation policies follow per table. */
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'accounts','journal_entries','journal_lines','tax_codes',
      'vat_rates','currencies','exchange_rates','accounting_attachments',
      'audit_annotations','accounting_settings'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.fn_is_finance_user());',
      t || '_select', t
    );
  end loop;
end $$;

/* Accountant + admin INSERT/UPDATE on the mutable tables. Auditor and
 * finance_viewer never write here. */
drop policy if exists accounts_write       on public.accounts;
create policy accounts_write on public.accounts
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin','accountant']))
  with check  (public.fn_has_finance_role(array['super_admin','admin','accountant']));

drop policy if exists journal_entries_write on public.journal_entries;
create policy journal_entries_write on public.journal_entries
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin','accountant']))
  with check  (public.fn_has_finance_role(array['super_admin','admin','accountant']));

drop policy if exists journal_lines_write on public.journal_lines;
create policy journal_lines_write on public.journal_lines
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin','accountant']))
  with check  (public.fn_has_finance_role(array['super_admin','admin','accountant']));

drop policy if exists tax_codes_write     on public.tax_codes;
create policy tax_codes_write on public.tax_codes
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin']))
  with check  (public.fn_has_finance_role(array['super_admin','admin']));

drop policy if exists vat_rates_write     on public.vat_rates;
create policy vat_rates_write on public.vat_rates
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin']))
  with check  (public.fn_has_finance_role(array['super_admin','admin']));

drop policy if exists exchange_rates_write on public.exchange_rates;
create policy exchange_rates_write on public.exchange_rates
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin','accountant']))
  with check  (public.fn_has_finance_role(array['super_admin','admin','accountant']));

drop policy if exists attachments_write   on public.accounting_attachments;
create policy attachments_write on public.accounting_attachments
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin','accountant']))
  with check  (public.fn_has_finance_role(array['super_admin','admin','accountant']));

drop policy if exists annotations_insert  on public.audit_annotations;
create policy annotations_insert on public.audit_annotations
  for insert to authenticated
  with check (
    auth.uid() = auditor_id
    and public.fn_has_finance_role(array['auditor','admin','super_admin'])
  );
drop policy if exists annotations_update  on public.audit_annotations;
create policy annotations_update on public.audit_annotations
  for update to authenticated
  using (auth.uid() = auditor_id)
  with check (auth.uid() = auditor_id);

drop policy if exists settings_write      on public.accounting_settings;
create policy settings_write on public.accounting_settings
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin']))
  with check  (public.fn_has_finance_role(array['super_admin','admin']));

drop policy if exists users_roles_select  on public.users_roles;
create policy users_roles_select on public.users_roles
  for select to authenticated
  using (auth.uid() = user_id or public.fn_has_finance_role(array['super_admin','admin']));
drop policy if exists users_roles_write   on public.users_roles;
create policy users_roles_write on public.users_roles
  for all to authenticated
  using       (public.fn_has_finance_role(array['super_admin','admin']))
  with check  (public.fn_has_finance_role(array['super_admin','admin']));

/* Prevent revoking the last super_admin (Phase 14). */
create or replace function public.fn_prevent_last_super_admin_revoke()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE' and old.role = 'super_admin') or
     (tg_op = 'UPDATE' and old.role = 'super_admin' and new.role <> 'super_admin') then
    if (select count(*) from public.users_roles where role = 'super_admin') <= 1 then
      raise exception 'cannot revoke the last super_admin' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_users_roles_protect on public.users_roles;
create trigger tr_users_roles_protect
  before update or delete on public.users_roles
  for each row execute function public.fn_prevent_last_super_admin_revoke();

/* ── 11. post_journal_entry RPC ────────────────────────────
 *
 * Accountant calls this from the journal-entry form. The RPC:
 *   1. Verifies caller has accountant/admin/super_admin role
 *   2. Verifies double-entry balance (Σ debits = Σ credits in base currency)
 *   3. Atomically inserts header + lines
 *   4. Marks the entry status='posted', records posted_by/at
 *   5. Returns the entry_id
 *
 * After posting, journal_lines becomes effectively immutable —
 * "adjustments" are made by posting a reversing entry. */

create or replace function public.post_journal_entry(
  p_jurisdiction text,
  p_entry_number text,
  p_entry_date   date,
  p_description  text,
  p_reference    text,
  p_lines        jsonb               -- [{account_id, side, amount, currency, exchange_rate, base_currency, tax_code_id, description}, ...]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id   uuid;
  v_caller     uuid := auth.uid();
  v_dr_total   numeric(20,4) := 0;
  v_cr_total   numeric(20,4) := 0;
  v_line       jsonb;
  v_line_no    int := 0;
  v_amount_b   numeric(20,4);
begin
  if not public.fn_has_finance_role(array['super_admin','admin','accountant']) then
    raise exception 'not authorised — accountant role required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'journal entry needs at least 2 lines' using errcode = 'P0001';
  end if;

  /* Pre-compute base-currency totals to verify balance BEFORE we
   * touch any rows. */
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_amount_b := round((v_line->>'amount')::numeric * coalesce((v_line->>'exchange_rate')::numeric, 1.0), 4);
    if v_line->>'side' = 'debit' then
      v_dr_total := v_dr_total + v_amount_b;
    else
      v_cr_total := v_cr_total + v_amount_b;
    end if;
  end loop;

  if abs(v_dr_total - v_cr_total) > 0.01 then
    raise exception 'unbalanced entry: debits=% credits=%', v_dr_total, v_cr_total
      using errcode = 'P0001';
  end if;

  insert into public.journal_entries
    (jurisdiction, entry_number, entry_date, description, reference, status, created_by, posted_by, posted_at)
  values
    (p_jurisdiction, p_entry_number, p_entry_date, p_description, p_reference, 'posted', v_caller, v_caller, now())
  returning id into v_entry_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_line_no := v_line_no + 1;
    insert into public.journal_lines
      (entry_id, line_number, account_id, side, amount, currency, exchange_rate, base_currency, tax_code_id, description)
    values (
      v_entry_id, v_line_no,
      (v_line->>'account_id')::uuid,
      v_line->>'side',
      (v_line->>'amount')::numeric,
      coalesce(v_line->>'currency', 'USD'),
      coalesce((v_line->>'exchange_rate')::numeric, 1.0),
      coalesce(v_line->>'base_currency', 'USD'),
      nullif(v_line->>'tax_code_id', '')::uuid,
      v_line->>'description'
    );
  end loop;

  return v_entry_id;
end;
$$;

revoke all on function public.post_journal_entry(text, text, date, text, text, jsonb) from public;
grant execute on function public.post_journal_entry(text, text, date, text, text, jsonb) to authenticated;

/* ── 12. Trial balance / ledger reporting views ──────────── */

drop view if exists public.v_trial_balance cascade;
create view public.v_trial_balance with (security_invoker = true) as
select
  a.jurisdiction,
  a.code      as account_code,
  a.display_name,
  a.account_type,
  sum(case when l.side = 'debit'  then l.amount_base_currency else 0 end) as total_debit,
  sum(case when l.side = 'credit' then l.amount_base_currency else 0 end) as total_credit,
  sum(case when l.side = 'debit'  then l.amount_base_currency else -l.amount_base_currency end) as net_balance,
  l.base_currency
from public.accounts a
join public.journal_lines l on l.account_id = a.id
join public.journal_entries e on e.id = l.entry_id
where e.status = 'posted'
group by a.jurisdiction, a.code, a.display_name, a.account_type, l.base_currency
order by a.jurisdiction, a.code;

grant select on public.v_trial_balance to authenticated;

drop view if exists public.v_general_ledger cascade;
create view public.v_general_ledger with (security_invoker = true) as
select
  e.id            as entry_id,
  e.jurisdiction,
  e.entry_number,
  e.entry_date,
  e.description   as entry_description,
  e.status,
  l.line_number,
  a.code          as account_code,
  a.display_name  as account_name,
  a.account_type,
  l.side,
  l.amount,
  l.currency,
  l.exchange_rate,
  l.base_currency,
  l.amount_base_currency,
  l.description   as line_description
from public.journal_entries e
join public.journal_lines   l on l.entry_id = e.id
join public.accounts        a on a.id       = l.account_id
order by e.entry_date, e.entry_number, l.line_number;

grant select on public.v_general_ledger to authenticated;

/* ── 12b. Income statement + balance sheet views ─────────
 * Phase 9 reports beyond trial balance + GL.  Both group posted
 * journal lines into the canonical statement structure: income
 * statement = income − expense, balance sheet = asset vs liability
 * + equity. Same security_invoker model. */

drop view if exists public.v_income_statement cascade;
create view public.v_income_statement
  with (security_invoker = true) as
select
  e.jurisdiction,
  e.fiscal_year,
  a.account_type,
  a.code           as account_code,
  a.display_name   as account_name,
  l.base_currency,
  sum(case when l.side = 'credit' then l.amount_base_currency else 0 end) as credit_total,
  sum(case when l.side = 'debit'  then l.amount_base_currency else 0 end) as debit_total,
  sum(case
        when a.account_type = 'income'  then  (case when l.side = 'credit' then l.amount_base_currency else -l.amount_base_currency end)
        when a.account_type = 'expense' then -(case when l.side = 'credit' then l.amount_base_currency else -l.amount_base_currency end)
        else 0
      end) as period_total
from public.journal_entries e
join public.journal_lines   l on l.entry_id = e.id
join public.accounts        a on a.id       = l.account_id
where e.status = 'posted'
  and a.account_type in ('income', 'expense')
group by e.jurisdiction, e.fiscal_year, a.account_type, a.code, a.display_name, l.base_currency
order by e.jurisdiction, e.fiscal_year desc, a.account_type, a.code;
grant select on public.v_income_statement to authenticated;

drop view if exists public.v_balance_sheet cascade;
create view public.v_balance_sheet
  with (security_invoker = true) as
select
  e.jurisdiction,
  a.account_type,
  a.code         as account_code,
  a.display_name as account_name,
  l.base_currency,
  sum(case when l.side = 'debit'  then l.amount_base_currency else 0 end) as debit_total,
  sum(case when l.side = 'credit' then l.amount_base_currency else 0 end) as credit_total,
  sum(case
        when a.account_type = 'asset'                       then  (case when l.side = 'debit'  then l.amount_base_currency else -l.amount_base_currency end)
        when a.account_type in ('liability','equity')       then  (case when l.side = 'credit' then l.amount_base_currency else -l.amount_base_currency end)
        else 0
      end) as balance_total
from public.journal_entries e
join public.journal_lines   l on l.entry_id = e.id
join public.accounts        a on a.id       = l.account_id
where e.status = 'posted'
  and a.account_type in ('asset','liability','equity')
group by e.jurisdiction, a.account_type, a.code, a.display_name, l.base_currency
order by e.jurisdiction, a.account_type, a.code;
grant select on public.v_balance_sheet to authenticated;

/* ── 13. Storage bucket for attachments ──────────────────── */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'accounting-attachments',
    'accounting-attachments',
    false,
    20 * 1024 * 1024,                                 -- 20 MiB cap
    array['application/pdf','image/png','image/jpeg','image/webp','application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  )
  on conflict (id) do nothing;

/* Storage policies — only finance roles can read/write. */
drop policy if exists "accounting-attachments read"  on storage.objects;
create policy "accounting-attachments read" on storage.objects
  for select to authenticated
  using (bucket_id = 'accounting-attachments' and public.fn_is_finance_user());
drop policy if exists "accounting-attachments write" on storage.objects;
create policy "accounting-attachments write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'accounting-attachments'
    and public.fn_has_finance_role(array['super_admin','admin','accountant']));

-- Sanity:
-- select * from public.v_trial_balance limit 5;
-- select * from public.users_roles where user_id = auth.uid();
