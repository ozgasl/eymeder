-- Avatar visibility follow-up (Bugfix 3 oturumu, kullanıcı kararı).
--
-- 20260911110000 / 20260911130000 avatar_url'i "yalnızca kendi satırı /
-- dernek üyesi / staff görür" listesine koymuştu, tıpkı email/phone gibi.
-- Kullanıcı kararı: full_name zaten herkese (giriş yapmış her üyeye) açık,
-- fotoğrafı ayrıca maskelemenin ek bir gizlilik faydası yok — o yüzden
-- avatar_url artık full_name/university/graduation_year ile aynı grupta,
-- her zaman görünür.
--
-- Bu migration SADECE avatar_url satırını taşıyor; 20260911130000 zaten
-- production'da olduğu için o dosyaya dokunulmadı (bkz. PROJECT_MEMORY.md,
-- "migration uygulandıktan sonra o dosya dokunulmaz" dersi). Kolon sırası,
-- WHERE auth.uid() IS NOT NULL filtresi ve GRANT'ler aynı kalıyor.

CREATE OR REPLACE VIEW public.member_profiles AS
SELECT
  -- Always visible: this is what a non-dernek-üyesi member may see of another.
  p.id,
  p.full_name,
  p.university,
  p.graduation_year,
  -- Not personal data, and the mentorship list filters on it.
  p.is_mentor,
  -- Ordering key used by the directory and the admin panel.
  p.created_at,
  -- A picture next to a name everyone already sees adds nothing to mask.
  p.avatar_url,

  -- Everything else is visible only to the member themselves, to a dues-paying
  -- member, or to staff. is_dernek_uyesi/is_staff are SECURITY DEFINER, so a
  -- view over profiles asking them cannot recurse back into profiles RLS.
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.email END                      AS email,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.phone END                      AS phone,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.bio END                        AS bio,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.city END                       AS city,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.country END                    AS country,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.company END                    AS company,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.profession END                 AS profession,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.department END                 AS department,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.university_status END          AS university_status,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.university_graduation_year END AS university_graduation_year,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.high_school_graduation_year END AS high_school_graduation_year,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.linkedin_url END               AS linkedin_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.twitter_url END                AS twitter_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.instagram_url END              AS instagram_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.facebook_url END               AS facebook_url,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.mentor_bio END                 AS mentor_bio,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.mentorship_areas END           AS mentorship_areas,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.membership_tier END            AS membership_tier,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.school_number END              AS school_number,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.fonzip_membership_status END   AS fonzip_membership_status,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.fonzip_tags END                AS fonzip_tags,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.fonzip_checked_at END          AS fonzip_checked_at,
  CASE WHEN public.member_sees_full_profile(p.id) THEN p.updated_at END                 AS updated_at
FROM public.profiles p
WHERE auth.uid() IS NOT NULL;

ALTER VIEW public.member_profiles SET (security_invoker = false);

GRANT SELECT ON public.member_profiles TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
