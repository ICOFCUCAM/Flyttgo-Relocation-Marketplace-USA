-- ─────────────────────────────────────────────────────────────────
-- install-backoffice-schema.sql
--
-- FlyttGo Back-Office System (BOS) — single migration that creates
-- the entire bos_* namespace. Idempotent: re-running drops and
-- recreates triggers + policies, preserves table data via
-- `create table if not exists`. Apply once per environment.
--
-- Tables:
--   bos_roles               · catalogue of role ids (super_admin, admin, …)
--   bos_role_permissions    · role → permission strings (many-to-many)
--   bos_user_roles          · user → role assignments
--   bos_market_rollout      · per-country / per-city rollout state
--   bos_transactions        · central payment ledger header
--   bos_ledger_entries      · double-entry-style debit/credit lines
--   bos_invoices            · invoice records with accounting system tag
--   bos_feature_flags       · global feature toggles
--   bos_audit_log           · every BOS-state-changing action
--   bos_accounting_config   · single-row config (active accounting system)
--
-- RLS: every bos_* table is protected. Reads are gated by
-- has_bos_permission(<perm>); writes go via SECURITY DEFINER helpers
-- that audit-log on success. Super-admin permission is the literal
-- string '*' which short-circuits the check.
--
-- Booking system is NOT modified by this migration. BOS reads
-- existing tables (bookings, profiles, driver_applications, …)
-- but never writes to them.
-- ─────────────────────────────────────────────────────────────────

/* ── Roles + permissions ─────────────────────────────────── */

create table if not exists public.bos_roles (
  id          text primary key,
  label       text not null,
  description text,
  created_at  timestamptz default now()
);

create table if not exists public.bos_role_permissions (
  role_id    text not null references public.bos_roles(id) on delete cascade,
  permission text not null,
  primary key (role_id, permission)
);

create table if not exists public.bos_user_roles (
  user_id    uuid not null references auth.users on delete cascade,
  role_id    text not null references public.bos_roles(id) on delete cascade,
  granted_at timestamptz default now(),
  granted_by uuid references auth.users,
  primary key (user_id, role_id)
);

/* ── Permission resolver ──────────────────────────────────
 *
 * has_bos_permission(uid, perm) returns true when the user holds a
 * role whose permission set contains either the literal `perm` or
 * the wildcard `*`. Used by every RLS policy in the BOS namespace.
 * ──────────────────────────────────────────────────────── */

create or replace function public.has_bos_permission(uid uuid, perm text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.bos_user_roles ur
    join public.bos_role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = uid
      and (rp.permission = perm or rp.permission = '*')
  );
$$;

comment on function public.has_bos_permission(uuid, text) is
  'Returns true when the user has the named BOS permission (directly or via the * wildcard).';

/* ── Market rollout ──────────────────────────────────────
 *
 * One row per (country, optional city) tuple. status moves
 * locked → pilot → live; super_admin can toggle freely. The
 * marketplace UI consults this table when deciding whether to
 * surface a booking widget on a given country page.
 * ──────────────────────────────────────────────────────── */

create table if not exists public.bos_market_rollout (
  id            uuid primary key default gen_random_uuid(),
  country_code  text not null,
  city_slug     text,
  status        text not null default 'locked'
                check (status in ('locked','pilot','live')),
  unlocked_at   timestamptz,
  unlocked_by   uuid references auth.users,
  notes         text,
  updated_at    timestamptz default now(),
  unique (country_code, city_slug)
);

create index if not exists idx_bos_market_rollout_country
  on public.bos_market_rollout (country_code);

/* ── Central payment system ──────────────────────────────
 *
 * Every customer charge / driver payout / refund / escrow movement
 * is recorded as a `bos_transactions` row plus N `bos_ledger_entries`
 * rows. The ledger is double-entry-friendly: callers post matching
 * debit + credit lines (sum to zero per transaction). Reports read
 * the ledger by `account` for revenue / escrow / payout views.
 * ──────────────────────────────────────────────────────── */

create table if not exists public.bos_transactions (
  id            uuid primary key default gen_random_uuid(),
  external_ref  text,
  source        text not null,
  amount        numeric(12,2) not null,
  currency      text not null default 'USD',
  type          text not null check (type in (
    'charge','payout','refund','escrow_hold','escrow_release','adjustment'
  )),
  status        text not null default 'pending'
                check (status in ('pending','completed','failed','reversed')),
  customer_id   uuid references auth.users,
  driver_id     uuid references auth.users,
  occurred_at   timestamptz default now(),
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);

create index if not exists idx_bos_transactions_external_ref
  on public.bos_transactions (external_ref);
create index if not exists idx_bos_transactions_occurred_at
  on public.bos_transactions (occurred_at desc);

create table if not exists public.bos_ledger_entries (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid references public.bos_transactions on delete cascade,
  account         text not null,
  debit           numeric(12,2) default 0,
  credit          numeric(12,2) default 0,
  currency        text not null default 'USD',
  posted_at       timestamptz default now(),
  metadata        jsonb default '{}'::jsonb
);

create index if not exists idx_bos_ledger_entries_account
  on public.bos_ledger_entries (account);
create index if not exists idx_bos_ledger_entries_transaction
  on public.bos_ledger_entries (transaction_id);

/* ── Invoices ────────────────────────────────────────────
 *
 * Issued invoices with an explicit accounting_system tag so US-GAAP
 * vs EU-VAT reports filter correctly. pdf_url is set when the
 * accounting system stamps a permanent PDF; otherwise null and the
 * UI re-renders on demand.
 * ──────────────────────────────────────────────────────── */

create table if not exists public.bos_invoices (
  id                 uuid primary key default gen_random_uuid(),
  invoice_number     text unique not null,
  booking_id         uuid,
  customer_id        uuid references auth.users,
  amount             numeric(12,2) not null,
  tax                numeric(12,2) default 0,
  currency           text not null default 'USD',
  accounting_system  text not null default 'us_gaap',
  status             text not null default 'issued'
                     check (status in ('draft','issued','paid','void')),
  issued_at          timestamptz default now(),
  paid_at            timestamptz,
  pdf_url            text,
  metadata           jsonb default '{}'::jsonb
);

create index if not exists idx_bos_invoices_status
  on public.bos_invoices (status);

/* ── Feature flags ───────────────────────────────────────── */

create table if not exists public.bos_feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text,
  updated_at  timestamptz default now(),
  updated_by  uuid references auth.users
);

/* ── Audit log ────────────────────────────────────────────
 *
 * Append-only. Captures every state-changing BOS action with the
 * actor's user id + role, the action name, target type+id, and an
 * optional diff (before/after). Read access is gated on
 * `audit.view`; nobody (including super_admin) can update or delete
 * rows from the application — RLS denies UPDATE + DELETE outright.
 * ──────────────────────────────────────────────────────── */

create table if not exists public.bos_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users,
  actor_role   text,
  action       text not null,
  target_type  text,
  target_id    text,
  diff         jsonb,
  ip_address   text,
  user_agent   text,
  occurred_at  timestamptz default now()
);

create index if not exists idx_bos_audit_log_occurred_at
  on public.bos_audit_log (occurred_at desc);
create index if not exists idx_bos_audit_log_actor
  on public.bos_audit_log (actor_id);
create index if not exists idx_bos_audit_log_action
  on public.bos_audit_log (action);

/* ── Accounting system config (single-row pattern) ─────── */

create table if not exists public.bos_accounting_config (
  id                int primary key default 1 check (id = 1),
  active_system     text not null default 'us_gaap'
                    check (active_system in ('us_gaap','eu_vat','custom')),
  fiscal_year_start text default '01-01',
  default_tax_rate  numeric(5,4) default 0,
  updated_at        timestamptz default now(),
  updated_by        uuid references auth.users
);

insert into public.bos_accounting_config (id) values (1)
on conflict (id) do nothing;

/* ── RLS — every bos_* table is protected ──────────────── */

alter table public.bos_roles               enable row level security;
alter table public.bos_role_permissions    enable row level security;
alter table public.bos_user_roles          enable row level security;
alter table public.bos_market_rollout      enable row level security;
alter table public.bos_transactions        enable row level security;
alter table public.bos_ledger_entries      enable row level security;
alter table public.bos_invoices            enable row level security;
alter table public.bos_feature_flags       enable row level security;
alter table public.bos_audit_log           enable row level security;
alter table public.bos_accounting_config   enable row level security;

/* Drop and recreate policies so re-running the migration is safe. */

do $$ begin
  /* Helper to drop all bos_* policies in one block. */
  drop policy if exists bos_roles_read              on public.bos_roles;
  drop policy if exists bos_role_permissions_read   on public.bos_role_permissions;
  drop policy if exists bos_user_roles_read         on public.bos_user_roles;
  drop policy if exists bos_user_roles_write        on public.bos_user_roles;
  drop policy if exists bos_market_rollout_read     on public.bos_market_rollout;
  drop policy if exists bos_market_rollout_write    on public.bos_market_rollout;
  drop policy if exists bos_transactions_read       on public.bos_transactions;
  drop policy if exists bos_transactions_write      on public.bos_transactions;
  drop policy if exists bos_ledger_entries_read     on public.bos_ledger_entries;
  drop policy if exists bos_ledger_entries_write    on public.bos_ledger_entries;
  drop policy if exists bos_invoices_read           on public.bos_invoices;
  drop policy if exists bos_invoices_write          on public.bos_invoices;
  drop policy if exists bos_feature_flags_read      on public.bos_feature_flags;
  drop policy if exists bos_feature_flags_write     on public.bos_feature_flags;
  drop policy if exists bos_audit_log_read          on public.bos_audit_log;
  drop policy if exists bos_audit_log_insert        on public.bos_audit_log;
  drop policy if exists bos_accounting_config_read  on public.bos_accounting_config;
  drop policy if exists bos_accounting_config_write on public.bos_accounting_config;
end $$;

/* Read policies — gated on the page-specific permission. */

create policy bos_roles_read on public.bos_roles
  for select using (public.has_bos_permission(auth.uid(), 'rbac.view'));

create policy bos_role_permissions_read on public.bos_role_permissions
  for select using (public.has_bos_permission(auth.uid(), 'rbac.view'));

create policy bos_user_roles_read on public.bos_user_roles
  for select using (public.has_bos_permission(auth.uid(), 'rbac.view'));

create policy bos_user_roles_write on public.bos_user_roles
  for all using (public.has_bos_permission(auth.uid(), 'rbac.assign'));

create policy bos_market_rollout_read on public.bos_market_rollout
  for select using (public.has_bos_permission(auth.uid(), 'markets.view'));

create policy bos_market_rollout_write on public.bos_market_rollout
  for all using (public.has_bos_permission(auth.uid(), 'markets.unlock'));

create policy bos_transactions_read on public.bos_transactions
  for select using (public.has_bos_permission(auth.uid(), 'payments.view'));

create policy bos_transactions_write on public.bos_transactions
  for all using (public.has_bos_permission(auth.uid(), 'payments.write'));

create policy bos_ledger_entries_read on public.bos_ledger_entries
  for select using (public.has_bos_permission(auth.uid(), 'payments.view'));

create policy bos_ledger_entries_write on public.bos_ledger_entries
  for all using (public.has_bos_permission(auth.uid(), 'payments.write'));

create policy bos_invoices_read on public.bos_invoices
  for select using (public.has_bos_permission(auth.uid(), 'invoices.view'));

create policy bos_invoices_write on public.bos_invoices
  for all using (public.has_bos_permission(auth.uid(), 'invoices.generate'));

create policy bos_feature_flags_read on public.bos_feature_flags
  for select using (public.has_bos_permission(auth.uid(), 'feature_flags.view'));

create policy bos_feature_flags_write on public.bos_feature_flags
  for all using (public.has_bos_permission(auth.uid(), 'feature_flags.write'));

/* Audit log — readable to auditors, append-only via service insert.
 * Update + delete are intentionally NOT granted to anyone. */
create policy bos_audit_log_read on public.bos_audit_log
  for select using (public.has_bos_permission(auth.uid(), 'audit.view'));

create policy bos_audit_log_insert on public.bos_audit_log
  for insert with check (auth.uid() is not null);

create policy bos_accounting_config_read on public.bos_accounting_config
  for select using (public.has_bos_permission(auth.uid(), 'accounting.view'));

create policy bos_accounting_config_write on public.bos_accounting_config
  for all using (public.has_bos_permission(auth.uid(), 'accounting.config'));

/* ── Seed: roles + permission map ──────────────────────── */

insert into public.bos_roles (id, label, description) values
  ('super_admin',  'Super Admin',   'Full system control. Manages users, roles, feature flags, and rollout state.'),
  ('admin',        'Admin',         'Operations admin. Markets, payments, audit visibility — no user/role management.'),
  ('accountant_us','US Accountant', 'US-GAAP accounting access: ledger view, invoice generation, CSV/PDF exports.'),
  ('auditor',      'Auditor',       'Read-only across audit log, ledger, and invoices. No mutation permissions.'),
  ('support',      'Support',       'Customer + driver support. Read-only booking + profile context.')
on conflict (id) do nothing;

/* Permissions per role. The * wildcard for super_admin short-
 * circuits has_bos_permission so every check passes. */
insert into public.bos_role_permissions (role_id, permission) values
  ('super_admin', '*'),

  ('admin',          'markets.view'),
  ('admin',          'markets.unlock'),
  ('admin',          'payments.view'),
  ('admin',          'invoices.view'),
  ('admin',          'audit.view'),
  ('admin',          'feature_flags.view'),
  ('admin',          'rbac.view'),
  ('admin',          'accounting.view'),

  ('accountant_us',  'accounting.view'),
  ('accountant_us',  'accounting.export'),
  ('accountant_us',  'invoices.view'),
  ('accountant_us',  'invoices.generate'),
  ('accountant_us',  'payments.view'),

  ('auditor',        'audit.view'),
  ('auditor',        'payments.view'),
  ('auditor',        'invoices.view'),
  ('auditor',        'accounting.view'),
  ('auditor',        'rbac.view'),

  ('support',        'bookings.view'),
  ('support',        'customers.view')
on conflict do nothing;

/* ── Seed: market rollout default state ─────────────────
 *
 * Pre-seeds the 6 legacy markets as 'live' and the 10 expansion
 * markets as 'locked' so the BOS rollout panel renders meaningful
 * state on day one. The status can be flipped manually in the UI.
 * ──────────────────────────────────────────────────────── */

insert into public.bos_market_rollout (country_code, city_slug, status, notes) values
  ('us', null, 'live',   'Legacy market — full booking + payment + autocomplete.'),
  ('ca', null, 'live',   'Legacy market — bilingual EN/FR.'),
  ('gb', null, 'live',   'Legacy market — GVOL operators.'),
  ('fr', null, 'live',   'Legacy market — déménageur compliance.'),
  ('de', null, 'live',   'Legacy market — GüKG compliance.'),
  ('no', null, 'live',   'Legacy market — yrkestrafiktillstånd.'),
  ('nl', null, 'locked', 'Expansion · first wave — payment + autocomplete pending.'),
  ('se', null, 'locked', 'Expansion · first wave.'),
  ('es', null, 'locked', 'Expansion · first wave.'),
  ('it', null, 'locked', 'Expansion · first wave.'),
  ('pl', null, 'locked', 'Expansion · first wave.'),
  ('dk', null, 'locked', 'Expansion · second wave.'),
  ('be', null, 'locked', 'Expansion · second wave.'),
  ('at', null, 'locked', 'Expansion · second wave.'),
  ('ch', null, 'locked', 'Expansion · second wave.'),
  ('cz', null, 'locked', 'Expansion · second wave.')
on conflict do nothing;

/* ── Seed: feature flags ──────────────────────────────── */

insert into public.bos_feature_flags (key, enabled, description) values
  ('expansion.booking_widget',   false, 'Show the BookingShortcut widget on expansion country pages once payment + autocomplete are wired.'),
  ('accounting.eu_vat',           false, 'Enable EU-VAT accounting mode (sets bos_accounting_config.active_system = ''eu_vat'').'),
  ('payments.test_mode',          false, 'Route all charges through Stripe test keys.'),
  ('audit.realtime_alerts',       false, 'Push high-severity audit events to the operator alert channel.'),
  ('rollout.auto_promote_cities', true,  'Allow city status to auto-promote based on provider density (1/3/10 thresholds).')
on conflict (key) do nothing;
