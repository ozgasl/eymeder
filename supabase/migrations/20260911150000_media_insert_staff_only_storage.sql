-- Match the `media` storage bucket to the table policy `staff_insert_media`
-- (20260830100000): once media_gallery INSERT requires staff, a storage rule
-- that still lets any signed-in member write into the bucket serves no
-- purpose — nobody but staff could ever attach that file to a gallery row —
-- and leaves members with pointless write access to arbitrary files in a
-- public bucket. Tighten storage to match.
--
-- Must run after 20260911120000 (already live in production, created
-- own_folder_insert_media): a fresh environment applies migrations in
-- filename order, and dropping a policy before it exists is a harmless
-- no-op, but creating it here and then re-creating the permissive version
-- in 20260911120000 afterwards would silently undo this fix.
--
-- own_folder_update_media / own_folder_delete_media are left alone: a member
-- updating or deleting a file already in their own folder doesn't grant them
-- the ability to create a new media_gallery row, so there's nothing to tighten
-- there.

DROP POLICY IF EXISTS "own_folder_insert_media" ON storage.objects;
CREATE POLICY "staff_insert_media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_staff(auth.uid())
  );
