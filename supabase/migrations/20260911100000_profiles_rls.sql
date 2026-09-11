-- Row Level Security on profiles.
--
-- Until now the table had none, and Supabase grants anon/authenticated full DML
-- on public tables by default (which is why 20260830110000 had to REVOKE UPDATE
-- on membership_tier from both). That left three holes, and the worst was not
-- the one we went looking for:
--
--   1. WRITE — any signed-in member could UPDATE or DELETE any other member's
--      row (every column but membership_tier). Not just tampering: profiles(id)
--      is the FK target for messages, group members, gallery media, job
--      postings and more, all ON DELETE CASCADE, so one DELETE took a member's
--      whole history with it.
--   2. READ, no account — anon could select every profile, so the contact
--      details of all members could be collected without logging in.
--   3. READ, with an account — any signed-in member, including a mezun_uye the
--      UI keeps out of the directory, could read everyone's email and phone.
--
-- This migration closes 1 and 2 and changes nothing about what the app can
-- read: every page that reads profiles requires a session (news, testimonials,
-- events, jobs and groups redirect to /auth/login; gallery, directory and
-- mentorship go through useAccessControl), and the one public page that reads
-- them, /brands, is handled by the view at the bottom.
--
-- 3 is column-level, which RLS cannot express, and is deliberately left for a
-- separate change.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Reads stay exactly as they are today for a signed-in member, so no page
-- loses data. Narrowing this is the next step, and needs the column-level
-- work to land with it.
DROP POLICY IF EXISTS "authenticated_read_profiles" ON profiles;
CREATE POLICY "authenticated_read_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- The only profile write the client makes is a member editing their own row
-- (profileService.updateMyProfile). Staff changes go through
-- /api/admin/membership-tier and /api/admin/recheck-fonzip with the service
-- role, per the pattern the rest of the admin tooling follows, so staff
-- deliberately get no policy here.
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT policy on purpose: rows are created by public.handle_new_user(),
-- an AFTER INSERT trigger on auth.users that is SECURITY DEFINER and so is not
-- subject to RLS. The app never inserts into profiles.
--
-- No DELETE policy on purpose: nothing in the app deletes a profile, and the
-- cascades above make an accidental one expensive.

-- 20260830110000 tried to stop a member promoting themselves with
--   REVOKE UPDATE (membership_tier) ON profiles FROM authenticated;
-- That has never had any effect. Postgres privileges are additive, and a
-- column-level REVOKE cannot take away a table-level one: Supabase grants
-- authenticated UPDATE on the whole table, so has_column_privilege(
-- 'authenticated','profiles','membership_tier','UPDATE') stays true and any
-- member could make themselves a dernek_uyesi — and with it take the member
-- directory, discount codes, job posting, groups and messaging. Verified
-- against a local Postgres with the same grants, as the Supabase SQL editor
-- runs as superuser and never sees it.
--
-- Two ways to fix it. Revoking table-level UPDATE and granting back a list of
-- editable columns works, but the list is long and grows with every new
-- profile field, and forgetting one breaks the profile form. A trigger states
-- the short, stable list instead — the columns the system owns — and keeps
-- working when a new editable field is added.
-- Deliberately NOT security definer: inside such a function current_user is
-- the function's owner, so the role check below would never match and the
-- trigger would silently protect nothing. It touches no tables, so it has no
-- need for the owner's rights anyway.
CREATE OR REPLACE FUNCTION public.protect_system_owned_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only what reaches the database through PostgREST as a member. The service
  -- role (admin API routes: membership-tier, recheck-fonzip, verify-code) has
  -- to be able to set every one of these.
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.membership_tier           := OLD.membership_tier;
    NEW.fonzip_membership_status  := OLD.fonzip_membership_status;
    NEW.fonzip_tags               := OLD.fonzip_tags;
    NEW.fonzip_checked_at         := OLD.fonzip_checked_at;
    -- graduation_year and school_number decide the Fonzip membership_no, and
    -- graduation_year is a deliberate single source that the profile page
    -- shows read-only. Editing either would silently re-point a member at
    -- someone else's Fonzip record.
    NEW.graduation_year           := OLD.graduation_year;
    NEW.school_number             := OLD.school_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_system_columns ON profiles;
CREATE TRIGGER protect_profile_system_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_system_owned_profile_columns();

-- The brands page is public and shows which alumnus a discount is connected to
-- (brands.tsx: "Bağlantılı mezun"). That name has to survive anon losing its
-- read of profiles, so it is exposed through a view narrowed to exactly those
-- members an admin deliberately linked to a brand, and to two columns.
--
-- security_invoker stays false (the default) so the view reads profiles as its
-- owner and is not blocked by the policies above. Supabase's linter flags such
-- views; here it is the point — it is what lets a deliberately published name
-- through while everything else stays behind RLS.
CREATE OR REPLACE VIEW public.brand_connected_members AS
SELECT p.id, p.full_name
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.brands b WHERE b.connected_member_id = p.id
);

ALTER VIEW public.brand_connected_members SET (security_invoker = false);

GRANT SELECT ON public.brand_connected_members TO anon, authenticated;
