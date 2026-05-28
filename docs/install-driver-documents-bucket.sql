-- ─────────────────────────────────────────────────────────────────
-- install-driver-documents-bucket.sql
--
-- Creates the `driver-documents` storage bucket (private) and the
-- four RLS policies that gate it. Required to make driver onboarding
-- uploads land somewhere AND to make admin View/Download work.
--
-- Why the bucket might be missing:
--   - Supabase projects don't auto-create storage buckets. They have
--     to exist before the upload call from src/components/
--     DriverOnboarding.tsx will succeed.
--   - The bucket name is hard-coded in the client (driver-documents),
--     so renaming requires a code change.
--
-- Pre-requisites:
--   - install-admin-rls.sql (creates public.is_admin())
--
-- Idempotent: re-running drops + recreates the policies, leaves
-- the bucket alone if it already exists.
-- ─────────────────────────────────────────────────────────────────

/* ── 1. Create the bucket as PRIVATE ──────────────────────
 *
 * public = false → no /object/public/<bucket>/<key> access; every
 * read goes through RLS + signed URLs. Keeps driver licences + IDs
 * out of public reach.
 *
 * file_size_limit is set generously (10 MB) so drivers uploading a
 * high-res phone photo of their licence don't get rejected.
 *
 * allowed_mime_types is intentionally permissive (nullable) — the
 * onboarding UI already restricts to image MIME types + application/pdf,
 * and locking it server-side breaks legacy mime types from older phones. */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-documents',
  'driver-documents',
  false,
  10 * 1024 * 1024,         -- 10 MB
  null
)
on conflict (id) do nothing;

/* If the bucket already exists from a previous deploy but was
 * accidentally created public, force it back to private. */
update storage.buckets
   set public = false
 where id = 'driver-documents'
   and public is distinct from false;

/* ── 2. Drop existing policies so re-runs don't error ───── */

drop policy if exists driver_documents_self_insert on storage.objects;
drop policy if exists driver_documents_self_update on storage.objects;
drop policy if exists driver_documents_self_read   on storage.objects;
drop policy if exists driver_documents_admin_read  on storage.objects;
drop policy if exists driver_documents_admin_all   on storage.objects;

/* ── 3. Driver can write their own folder ────────────────
 *
 * Upload path pattern from DriverOnboarding.tsx:
 *   `${user.id}/${doc.key}.${ext}`
 *
 * So the first folder segment is the authenticated user's UUID.
 * storage.foldername() returns the path split into a text[]; we
 * compare element 1 (1-indexed) against auth.uid()::text. */
create policy driver_documents_self_insert on storage.objects
  for insert
  with check (
    bucket_id = 'driver-documents'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy driver_documents_self_update on storage.objects
  for update
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy driver_documents_self_read on storage.objects
  for select
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/* ── 4. Admin can read every file (signed-URL flow) ────── */

create policy driver_documents_admin_all on storage.objects
  for all
  using (
    bucket_id = 'driver-documents'
    and public.is_admin()
  )
  with check (
    bucket_id = 'driver-documents'
    and public.is_admin()
  );

/* ── 5. Verification queries ──────────────────────────────
 *
 * Run these after applying the migration to confirm:
 *
 *   -- Bucket exists + is private?
 *   select id, name, public, file_size_limit
 *     from storage.buckets
 *    where id = 'driver-documents';
 *
 *   -- Policies installed?
 *   select policyname, cmd
 *     from pg_policies
 *    where schemaname = 'storage'
 *      and tablename = 'objects'
 *      and policyname like 'driver_documents_%';
 *
 *   -- Existing files (none on a fresh install)
 *   select name, owner, created_at
 *     from storage.objects
 *    where bucket_id = 'driver-documents'
 *    limit 10;
 */
