-- Fix infinite recursion in RLS policy on `roles`.
--
-- "Admins can manage roles" queried `roles` from within its own USING
-- clause. Evaluating that policy re-enters RLS on `roles`, which evaluates
-- the same policy again, recursing until Postgres aborts with
-- "infinite recursion detected in policy for relation \"roles\"" (42P17).
-- Because every "admin manages X" policy on other tables (brands,
-- products, orders, order_items, payment_links, membership_numbers,
-- user_qr_codes) also queries `roles`, this broke reads/writes on all of
-- them too, not just the roles table itself.
--
-- Fix: move the self-check into a SECURITY DEFINER function. Its inner
-- query runs as the function owner (bypasses RLS in Supabase), so it no
-- longer re-triggers the policy it's being evaluated from.

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM roles WHERE user_id = check_user_id AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (public.is_admin(auth.uid()));
