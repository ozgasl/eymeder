-- Fix: `is_private` on `groups` was cosmetic only. `group_posts` and
-- `group_members` both carried `USING (true)` SELECT policies from the
-- original schema (20260411185726) with no reference to `is_private` at
-- all — so a private group's posts and member list were already fully
-- readable by any authenticated user, member or not. Independent of
-- whether groups ever become reachable by logged-out visitors: this closes
-- the gap between members of the same platform.
--
-- `groups` itself keeps `public_read_groups USING (true)`: a private
-- group's existence/name/description being visible (as with a private
-- Facebook group turning up in search) is a deliberately different,
-- lesser exposure than its posts or member list — not touched here.

-- SECURITY DEFINER + STABLE like is_staff()/is_dernek_uyesi(): a policy on
-- group_members querying group_members itself would otherwise recurse into
-- its own RLS (see the roles-table 42P17 lesson in PROJECT_MEMORY.md).
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "public_read_group_posts" ON group_posts;
CREATE POLICY "read_group_posts" ON group_posts FOR SELECT USING (
  NOT EXISTS (SELECT 1 FROM groups g WHERE g.id = group_posts.group_id AND g.is_private)
  OR public.is_group_member(group_id, auth.uid())
);

DROP POLICY IF EXISTS "public_read_members" ON group_members;
CREATE POLICY "read_group_members" ON group_members FOR SELECT USING (
  NOT EXISTS (SELECT 1 FROM groups g WHERE g.id = group_members.group_id AND g.is_private)
  OR public.is_group_member(group_id, auth.uid())
);
