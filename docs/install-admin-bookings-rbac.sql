-- ─────────────────────────────────────────────────────────────────
-- install-admin-bookings-rbac.sql
--
-- Admin booking management + super-admin tier. Enables:
--   1. Admins create bookings on behalf of customers and email
--      them a payment link (no instant charge — customer pays on
--      their own).
--   2. Admins edit existing bookings, but the change stages into a
--      `pending_admin_edits` jsonb until the customer confirms it.
--   3. Only super-admins can DELETE bookings or accounts.
--
-- This file owns:
--   - `is_super_admin` boolean column on profiles
--   - `created_by_admin` / `pending_admin_edits` columns on bookings
--   - RLS policies that gate DELETE behind is_super_admin
--   - delete_user_account() SECURITY DEFINER function for super-admin
--     account deletion (cascades to profile + driver records via FK)
--
-- Companion code:
--   src/services/adminBookings.ts
--   src/components/admin/modals/AdminBookingFormModal.tsx
--   src/components/admin/modals/PendingAdminEditsBanner.tsx (customer)
--   supabase/functions/send-booking-email/index.ts
--
-- Bootstrap (last section): you MUST run the BOOTSTRAP block once
-- with your own admin email to promote yourself to the first
-- super-admin. Otherwise nobody can delete anything.
--
-- Idempotent: every ALTER uses IF NOT EXISTS / IF EXISTS guards.
-- ─────────────────────────────────────────────────────────────────

/* ── 1. profiles.is_super_admin ──────────────────────────────────
 * Boolean flag rather than a separate role so existing
 * `role = 'admin'` checks across the codebase keep working for
 * super-admins (they're still admins; just with extra DELETE
 * capabilities). */
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

/* ── 2. bookings: admin-created + pending edits columns ──────── */
alter table public.bookings
  add column if not exists created_by_admin           boolean default false,
  add column if not exists created_by_admin_user_id   uuid references auth.users(id),
  add column if not exists pending_admin_edits        jsonb,
  add column if not exists pending_edit_status        text
    check (pending_edit_status is null or pending_edit_status in ('pending_customer_approval', 'declined')),
  add column if not exists pending_edit_requested_by  uuid references auth.users(id),
  add column if not exists pending_edit_requested_at  timestamptz,
  add column if not exists pending_edit_resolved_at   timestamptz;

create index if not exists bookings_pending_edit_idx
  on public.bookings (customer_id)
  where pending_edit_status = 'pending_customer_approval';

/* ── 3. RLS — DELETE policies gated to super-admins only ─────── */

/* Drop and recreate so re-running this file is safe even if the
 * policies were created with a different gate previously. */

drop policy if exists bookings_super_admin_delete on public.bookings;
create policy bookings_super_admin_delete on public.bookings
  for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
       where user_id = auth.uid()
         and role = 'admin'
         and is_super_admin = true
    )
  );

/* Admin INSERT — admins can create bookings on behalf of any
 * customer. customer_id and customer_email reference the customer
 * the booking is for, not the admin. */
drop policy if exists bookings_admin_insert on public.bookings;
create policy bookings_admin_insert on public.bookings
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
       where user_id = auth.uid() and role = 'admin'
    )
  );

/* Admin UPDATE — admins can update ANY booking row. The pending-
 * edit machinery is enforced at the service layer (admins write
 * to pending_admin_edits, customers approve into the live columns). */
drop policy if exists bookings_admin_update on public.bookings;
create policy bookings_admin_update on public.bookings
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles
       where user_id = auth.uid() and role = 'admin'
    )
  );

/* Customer UPDATE — customers can only update pending_edit_status
 * (approve/decline) on their own bookings, plus the legacy
 * customer_confirmation flag. The whitelist check is enforced via a
 * row-level rule that compares OLD/NEW columns; we keep it simple
 * here and rely on the service layer to call the dedicated
 * approve_pending_admin_edit() function below. */

/* ── 4. approve_pending_admin_edit() RPC ───────────────────────
 * Atomic merge of pending_admin_edits into the live columns,
 * scoped to the calling customer. Server-side enforcement so a
 * malicious client can't approve and edit at the same time. */
create or replace function public.approve_pending_admin_edit(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  row_b public.bookings%rowtype;
  edits jsonb;
  caller uuid := auth.uid();
begin
  select * into row_b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;
  if row_b.customer_id <> caller then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if row_b.pending_edit_status is distinct from 'pending_customer_approval' then
    raise exception 'no pending edits' using errcode = 'P0001';
  end if;
  edits := coalesce(row_b.pending_admin_edits, '{}'::jsonb);

  /* Whitelist of mergeable fields. Anything else in the jsonb is
   * silently ignored — defends against an admin shoehorning a
   * customer_id swap into the edit. */
  update public.bookings set
    pickup_address    = coalesce(edits->>'pickup_address',    pickup_address),
    pickup_city       = coalesce(edits->>'pickup_city',       pickup_city),
    pickup_postcode   = coalesce(edits->>'pickup_postcode',   pickup_postcode),
    dropoff_address   = coalesce(edits->>'dropoff_address',   dropoff_address),
    dropoff_city      = coalesce(edits->>'dropoff_city',      dropoff_city),
    dropoff_postcode  = coalesce(edits->>'dropoff_postcode',  dropoff_postcode),
    move_date         = coalesce(edits->>'move_date',         move_date::text)::date,
    move_time         = coalesce(edits->>'move_time',         move_time::text)::time,
    van_type          = coalesce(edits->>'van_type',          van_type),
    helpers           = coalesce((edits->>'helpers')::int,    helpers),
    customer_notes    = coalesce(edits->>'customer_notes',    customer_notes),
    price_estimate    = coalesce((edits->>'price_estimate')::numeric, price_estimate),
    pending_admin_edits        = null,
    pending_edit_status        = null,
    pending_edit_resolved_at   = now()
  where id = p_booking_id
  returning * into row_b;

  return row_b;
end;
$$;

revoke all on function public.approve_pending_admin_edit(uuid) from public;
grant execute on function public.approve_pending_admin_edit(uuid) to authenticated;

/* ── 5. decline_pending_admin_edit() RPC ───────────────────────
 * Customer rejects the staged change — clears the pending payload
 * but records the rejection so admin can see it. */
create or replace function public.decline_pending_admin_edit(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  row_b public.bookings%rowtype;
  caller uuid := auth.uid();
begin
  select * into row_b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;
  if row_b.customer_id <> caller then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  update public.bookings set
    pending_edit_status      = 'declined',
    pending_edit_resolved_at = now()
  where id = p_booking_id
  returning * into row_b;
  return row_b;
end;
$$;

revoke all on function public.decline_pending_admin_edit(uuid) from public;
grant execute on function public.decline_pending_admin_edit(uuid) to authenticated;

/* ── 6. delete_user_account() RPC — super-admin only ──────────
 * Soft alternative to ALTER auth.users. Deletes the row from
 * auth.users; CASCADE on profiles / driver_profiles cleans up the
 * rest. Wrapped in a function so we can audit + gate by role. */
create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  is_super boolean;
begin
  select is_super_admin into is_super
    from public.profiles
   where user_id = caller and role = 'admin';

  if coalesce(is_super, false) is not true then
    raise exception 'not authorised — super-admin role required'
      using errcode = '42501';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.delete_user_account(uuid) from public;
grant execute on function public.delete_user_account(uuid) to authenticated;

-- ──────────────────────────────────────────────────────────────────
-- BOOTSTRAP — RUN ONCE
-- ──────────────────────────────────────────────────────────────────
-- Replace 'you@example.com' with the email of the admin you want to
-- promote to super-admin. After this you can promote other admins
-- via the same UPDATE (or build a UI for it).
--
-- update public.profiles
--    set is_super_admin = true
--  where role = 'admin'
--    and email = 'you@example.com';
--
-- Verify:
-- select email, role, is_super_admin from public.profiles
--  where role = 'admin';
