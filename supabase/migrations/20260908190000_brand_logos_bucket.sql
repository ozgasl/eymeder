-- Storage for brand logos uploaded from the admin panel.
--
-- Until now `brands.logo_url` could only hold a URL an admin typed in by hand,
-- so a brand that sent us a PNG had to be hosted somewhere else first. The
-- column stays exactly as it is — an uploaded file's public URL goes in the
-- same place, so brands already pointing at an external logo keep working.
--
-- The limits live on the bucket, not only in the UI, because the upload runs
-- from the client (same as the existing avatars/media uploads): a staff member
-- could call storage directly and skip any check the form does. `avatars` and
-- `media` were created by hand in the dashboard and have no such limits — this
-- bucket is defined here instead so it is reviewable and re-runnable.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-logos',
  'brand-logos',
  true,                       -- the brands page is public, so logos must be
  2097152,                    -- 2 MB; a logo has no business being larger
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif',
    'image/gif'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- SVG is deliberately absent: served from a public bucket it is inert inside
-- an <img> but executes scripts when the file URL is opened directly, and a
-- logo never needs to be a vector for us. HEIC/HEIF are absent because no
-- browser renders them in an <img> — they would upload fine and show broken.

-- Anyone may read a logo (public bucket serving aside, this keeps the row-level
-- rule honest); only admin/moderator may add, replace or remove one.
DROP POLICY IF EXISTS "public_read_brand_logos" ON storage.objects;
CREATE POLICY "public_read_brand_logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'brand-logos');

DROP POLICY IF EXISTS "staff_insert_brand_logos" ON storage.objects;
CREATE POLICY "staff_insert_brand_logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_update_brand_logos" ON storage.objects;
CREATE POLICY "staff_update_brand_logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-logos' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'brand-logos' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff_delete_brand_logos" ON storage.objects;
CREATE POLICY "staff_delete_brand_logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand-logos' AND public.is_staff(auth.uid()));
