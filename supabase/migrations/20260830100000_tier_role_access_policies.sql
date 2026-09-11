-- Back the client-side membership-tier / staff-role feature gating with RLS,
-- so the restrictions hold even against direct API calls, not just the UI.
--
-- Two independent axes:
--   - membership_tier ('dernek_uyesi' vs 'mezun_uye'): dues-linked member perks.
--   - roles.role ('admin'/'moderator'): official-content and admin tooling.
--
-- Written 2026-08-30, never applied to production until now (2026-09-11 —
-- see PROJECT_MEMORY.md). Rewritten before finally running it: at authoring
-- time public.is_staff()/public.is_dernek_uyesi() did not exist yet, so this
-- used raw EXISTS subqueries against roles/profiles; those SECURITY DEFINER
-- helpers exist now (used by member_profiles, brand_discount_codes, the
-- media/avatars storage policies) and are the established pattern, so the
-- policies below call them instead of re-deriving the same check ad hoc.

-- Official content: only admin/moderator may publish events, news, or gallery media.
DROP POLICY IF EXISTS "auth_create_events" ON events;
CREATE POLICY "staff_create_events" ON events FOR INSERT WITH CHECK (
  public.is_staff(auth.uid())
);

DROP POLICY IF EXISTS "auth_insert_news" ON news;
CREATE POLICY "staff_insert_news" ON news FOR INSERT WITH CHECK (
  auth.uid() = author_id AND
  public.is_staff(auth.uid())
);

DROP POLICY IF EXISTS "auth_insert_media" ON media_gallery;
CREATE POLICY "staff_insert_media" ON media_gallery FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  public.is_staff(auth.uid())
);

-- Dues-linked perks: only dernek_uyesi may post jobs, create groups, message
-- other members, or request mentorship.
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON job_postings;
CREATE POLICY "dernek_uyesi_create_jobs" ON job_postings FOR INSERT WITH CHECK (
  auth.uid() = posted_by AND
  public.is_dernek_uyesi(auth.uid())
);

DROP POLICY IF EXISTS "auth_create_groups" ON groups;
CREATE POLICY "dernek_uyesi_create_groups" ON groups FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  public.is_dernek_uyesi(auth.uid())
);

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "dernek_uyesi_send_messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  public.is_dernek_uyesi(auth.uid())
);

DROP POLICY IF EXISTS "Users can create requests" ON mentorship_requests;
CREATE POLICY "dernek_uyesi_create_mentorship_requests" ON mentorship_requests FOR INSERT WITH CHECK (
  auth.uid() = mentee_id AND
  public.is_dernek_uyesi(auth.uid())
);
