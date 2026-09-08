-- Type and size limits for the avatars and media buckets.
--
-- Both were created by hand in the dashboard (the only reference to them in
-- this repo is a commented-out insert in 20260414171443) and carry no
-- restrictions at all: `galleryService.uploadMedia` and
-- `profileService.uploadAvatar` never checked the file either, so a member
-- could put an arbitrary file of any size into a public bucket through the
-- gallery form. The app now validates before uploading, but that check runs on
-- the client and can be skipped by calling storage directly — so the limits
-- have to live here too, exactly as they do for brand-logos.
--
-- Keep these in step with the presets in src/lib/fileUpload.ts.

-- Profile photos: images only, 5 MB (a phone photo, unresized).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Gallery: photos and videos share one bucket, so the limit has to be the
-- larger of the two (50 MB, for video). The photo ceiling of 10 MB is enforced
-- by the app, since a bucket cannot hold a different limit per media type.
--
-- Supabase also applies a project-wide upload limit; if that is lower than
-- 50 MB it is what actually applies, and it has to be raised in the dashboard
-- (Storage -> Settings) before larger videos can be uploaded.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 52428800,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- `public` is deliberately left alone on conflict: both buckets are already
-- serving public URLs stored in profiles.avatar_url and media_gallery.media_url,
-- and flipping it would break every image already on the site.
