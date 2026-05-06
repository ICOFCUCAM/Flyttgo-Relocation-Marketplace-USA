-- ─────────────────────────────────────────────────────────────────
-- install-driver-documents-bucket-rls.sql
--
-- Allows admin users to read every object in the `driver-documents`
-- storage bucket via signed URLs. Without this policy, the
-- ApplicationDocsPanel's createSignedUrl() call returns the path
-- but the resulting URL 403s when the admin's browser tries to
-- fetch the bytes.
--
-- Driver applicants already have a self-write policy (their upload
-- step succeeds because the bucket is owned by them). What's
-- missing is the admin-read policy.
--
-- Pre-requisites:
--   - install-admin-rls.sql installed (creates public.is_admin()).
--
-- Idempotent: drops + recreates the policies.
-- ─────────────────────────────────────────────────────────────────

/* Storage RLS lives on storage.objects, scoped per bucket via the
 * `bucket_id` column. The bucket itself stays private (bucket.public
 * = false); access is mediated entirely by these policies. */

drop policy if exists driver_documents_admin_read on storage.objects;
create policy driver_documents_admin_read on storage.objects
  for select
  using (
    bucket_id = 'driver-documents'
    and public.is_admin()
  );

/* Optional companion: admins may also delete their own copies if
 * a doc needs to be purged for compliance reasons. Leave the write
 * policy off for now — admins shouldn't be replacing a driver's
 * uploads from the back-office in normal flow. Uncomment if needed. */
-- drop policy if exists driver_documents_admin_delete on storage.objects;
-- create policy driver_documents_admin_delete on storage.objects
--   for delete
--   using (
--     bucket_id = 'driver-documents'
--     and public.is_admin()
--   );

/* Sanity check the bucket itself stays private. Run this once after
 * applying the migration:
 *
 *   select id, name, public from storage.buckets where id = 'driver-documents';
 *
 * Expected: public = false. If it's true, flip it back:
 *
 *   update storage.buckets set public = false where id = 'driver-documents';
 *
 * (A public bucket would let anyone with a guessable path enumerate
 *  every driver's licence + ID — exactly the leak this RLS prevents.)
 */
