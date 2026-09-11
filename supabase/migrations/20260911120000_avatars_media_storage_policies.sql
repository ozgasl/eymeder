-- Row-level policies for the `avatars` and `media` storage buckets.
--
-- Both buckets were created by hand in the dashboard; the previous migration
-- gave them type and size limits but deliberately left their policies alone,
-- because policies written in the dashboard are not visible from this repo and
-- I did not want to drop rules I could not read. A gallery upload then failed
-- with "new row violates row-level security policy", and the diagnostic ruled
-- out the table: `media_gallery`'s only INSERT policy is
-- `auth.uid() = user_id`, and the member uploading was inserting their own id.
-- What is left is `storage.objects`, which rejects an upload with exactly the
-- same sentence.
--
-- Everything below is additive. Postgres ORs policies of the same command
-- together, and the names here are new, so whatever the dashboard already
-- allows keeps working — this can only permit uploads that are being refused
-- today, never take an existing one away.
--
-- Both services write to `<user id>/<timestamp>-<random>.<ext>`
-- (`buildObjectPath` in src/lib/fileUpload.ts), so "own folder" means the
-- first path segment is the uploader's id.

-- Reading: both buckets are public and serve URLs already stored in
-- profiles.avatar_url and media_gallery.media_url, so the row-level rule says
-- the same thing the bucket does rather than contradicting it.
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "public_read_media" ON storage.objects;
CREATE POLICY "public_read_media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- Writing: a signed-in member may only write inside their own folder, which is
-- the storage equivalent of the `auth.uid() = user_id` rule the two tables
-- already carry. Deliberately NOT staff-only: `media_gallery` in production
-- lets any signed-in member insert their own row, and a storage rule stricter
-- than the table's would refuse the upload of a member the table would then
-- happily accept.
DROP POLICY IF EXISTS "own_folder_insert_avatars" ON storage.objects;
CREATE POLICY "own_folder_insert_avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "own_folder_update_avatars" ON storage.objects;
CREATE POLICY "own_folder_update_avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "own_folder_delete_avatars" ON storage.objects;
CREATE POLICY "own_folder_delete_avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "own_folder_insert_media" ON storage.objects;
CREATE POLICY "own_folder_insert_media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "own_folder_update_media" ON storage.objects;
CREATE POLICY "own_folder_update_media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "own_folder_delete_media" ON storage.objects;
CREATE POLICY "own_folder_delete_media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin/moderator may remove or replace anyone's file: a gallery entry taken
-- down by staff should not leave its file behind, and the member who uploaded
-- it may no longer be around to delete it themselves.
DROP POLICY IF EXISTS "staff_update_media" ON storage.objects;
CREATE POLICY "staff_update_media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'media' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_delete_media" ON storage.objects;
CREATE POLICY "staff_delete_media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_staff(auth.uid()));
