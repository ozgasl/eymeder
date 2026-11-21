-- Staff (admin / moderator) moderation of events, job postings and news.
--
-- The admin panel's Etkinlikler / İş İlanları / Haberler tabs list every row
-- and let staff hide/show or delete it. Before this migration the only
-- policies were owner-based (organizer_id / posted_by / author_id = auth.uid())
-- plus "visible rows only" SELECTs, so staff could not see an unapproved event,
-- a deactivated job or an unpublished news item, and an update/delete on
-- someone else's row silently matched nothing.
--
-- Additive only: existing policies stay, these OR in alongside them. No DROP
-- (see PROJECT_MEMORY: destructive statements stall the MCP apply). Each
-- CREATE POLICY is guarded so re-running the file is harmless.
--
-- Rollback:
--   DROP POLICY "staff_read_all_events" ON public.events;
--   DROP POLICY "staff_update_events" ON public.events;
--   DROP POLICY "staff_delete_events" ON public.events;
--   DROP POLICY "staff_read_all_job_postings" ON public.job_postings;
--   DROP POLICY "staff_update_job_postings" ON public.job_postings;
--   DROP POLICY "staff_delete_job_postings" ON public.job_postings;
--   DROP POLICY "staff_read_all_news" ON public.news;
--   DROP POLICY "staff_update_news" ON public.news;
--   DROP POLICY "staff_delete_news" ON public.news;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['events', 'job_postings', 'news'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'staff_read_all_' || t) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_staff(auth.uid()))', 'staff_read_all_' || t, t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'staff_update_' || t) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', 'staff_update_' || t, t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'staff_delete_' || t) THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (public.is_staff(auth.uid()))', 'staff_delete_' || t, t);
    END IF;
  END LOOP;
END $$;
