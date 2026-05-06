-- ─────────────────────────────────────────────────────────────────
-- install-driver-application-admin-notification.sql
--
-- Fires a notifications row for every admin user the moment a new
-- driver_applications row is inserted. Lets admins see new submissions
-- in real time via the existing useNotifications() hook (Header bell)
-- without polling.
--
-- Idempotent — re-running the script drops + recreates the trigger.
-- Tolerant — if the notifications table or profiles.role column
-- doesn't exist yet, the trigger silently skips (no failures
-- propagate to the application insert).
-- ─────────────────────────────────────────────────────────────────

create or replace function public.notify_admins_of_new_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  applicant_name text;
begin
  /* Skip silently when the notifications table isn't installed. */
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'notifications'
  ) then
    return new;
  end if;

  /* Compose the applicant display name from the structured columns
   * if available; fall back to the legacy "name" column. */
  applicant_name := coalesce(
    nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''),
    new.name,
    'A new applicant'
  );

  /* Fan out to every admin profile. */
  for admin_id in
    select id from public.profiles where role = 'admin'
  loop
    insert into public.notifications (
      user_id, type, title, body, link_page, created_at
    )
    values (
      admin_id,
      'driver_application_submitted',
      'New driver application',
      applicant_name || ' just submitted a driver application — review pending.',
      'admin',
      now()
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_of_new_application on public.driver_applications;
create trigger trg_notify_admins_of_new_application
  after insert on public.driver_applications
  for each row
  execute function public.notify_admins_of_new_application();

comment on function public.notify_admins_of_new_application() is
  'Fans out a notification row to every admin profile when a driver_applications insert lands. Drives the Header bell without polling.';
