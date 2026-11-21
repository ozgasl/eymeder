import { supabase } from "@/integrations/supabase/client";

/**
 * Staff moderation of member-facing content (events, job postings, news) for
 * the admin panel. Each kind has one boolean that decides whether members see
 * the row (events.is_approved, job_postings.is_active, news.published).
 *
 * RLS decides what a staff member can actually touch: without the staff
 * policies from 20261121150000_staff_content_moderation.sql the list only
 * holds rows that are already visible (or the staff member's own), and an
 * update/delete on someone else's row matches nothing. That is not an error
 * to PostgREST, so every write selects the affected ids back and reports
 * `affected: 0` instead of pretending it worked.
 */
export type AdminContentKind = "events" | "jobs" | "news";

export interface AdminContentItem {
  id: string;
  title: string;
  /** Secondary line: event date + place, company + location, view count. */
  detail: string | null;
  /** The date the list is sorted by: event date for events, created_at otherwise. */
  date: string | null;
  owner: string | null;
  visible: boolean;
}

interface KindConfig {
  table: "events" | "job_postings" | "news";
  visibleColumn: "is_approved" | "is_active" | "published";
  select: string;
  orderBy: string;
  toItem: (row: any) => AdminContentItem;
}

const joinParts = (...parts: Array<string | null | undefined>) =>
  parts.filter((p) => p && String(p).trim()).join(" · ") || null;

export const ADMIN_CONTENT_CONFIG: Record<AdminContentKind, KindConfig> = {
  events: {
    table: "events",
    visibleColumn: "is_approved",
    select: "id, title, event_date, location, is_approved, organizer:member_profiles!events_organizer_id_fkey(full_name)",
    orderBy: "event_date",
    toItem: (row) => ({
      id: row.id,
      title: row.title,
      detail: joinParts(row.location),
      date: row.event_date,
      owner: row.organizer?.full_name ?? null,
      visible: row.is_approved === true,
    }),
  },
  jobs: {
    table: "job_postings",
    visibleColumn: "is_active",
    select: "id, title, company, location, is_active, created_at, poster:member_profiles!job_postings_posted_by_fkey(full_name)",
    orderBy: "created_at",
    toItem: (row) => ({
      id: row.id,
      title: row.title,
      detail: joinParts(row.company, row.location),
      date: row.created_at,
      owner: row.poster?.full_name ?? null,
      visible: row.is_active === true,
    }),
  },
  news: {
    table: "news",
    visibleColumn: "published",
    select: "id, title, published, views_count, created_at, author:member_profiles!news_author_id_fkey(full_name)",
    orderBy: "created_at",
    toItem: (row) => ({
      id: row.id,
      title: row.title,
      detail: row.views_count ? `${row.views_count} görüntülenme` : null,
      date: row.created_at,
      owner: row.author?.full_name ?? null,
      visible: row.published === true,
    }),
  },
};

export const adminContentService = {
  async list(kind: AdminContentKind): Promise<{ data: AdminContentItem[]; error: any }> {
    const cfg = ADMIN_CONTENT_CONFIG[kind];
    const { data, error } = await supabase
      .from(cfg.table)
      .select(cfg.select)
      .order(cfg.orderBy, { ascending: false });
    return { data: (data ?? []).map(cfg.toItem), error };
  },

  async setVisible(kind: AdminContentKind, id: string, visible: boolean): Promise<{ affected: number; error: any }> {
    const cfg = ADMIN_CONTENT_CONFIG[kind];
    const { data, error } = await supabase
      .from(cfg.table)
      .update({ [cfg.visibleColumn]: visible } as any)
      .eq("id", id)
      .select("id");
    return { affected: data?.length ?? 0, error };
  },

  async remove(kind: AdminContentKind, id: string): Promise<{ affected: number; error: any }> {
    const cfg = ADMIN_CONTENT_CONFIG[kind];
    const { data, error } = await supabase.from(cfg.table).delete().eq("id", id).select("id");
    return { affected: data?.length ?? 0, error };
  },
};
