-- One-time bootstrap: grant the admin role to the association's initial
-- platform administrators. Safe to re-run — skips an email with no matching
-- signed-up user instead of failing, and upserts on the existing
-- roles.user_id unique constraint if a role row already exists.
DO $$
DECLARE
  target_email TEXT;
  target_user_id UUID;
BEGIN
  FOREACH target_email IN ARRAY ARRAY['ozgasl@gmail.com', 'orhunhoca@gmail.com'] LOOP
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
      RAISE NOTICE 'No signed-up user found for %, skipping — they must sign up first.', target_email;
      CONTINUE;
    END IF;

    INSERT INTO roles (user_id, role) VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END LOOP;
END $$;
