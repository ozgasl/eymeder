import { supabase } from "@/integrations/supabase/client";

export const newsService = {
  async createNews(data: {
    title: string;
    content: string;
    cover_image_url?: string;
    published?: boolean;
  }) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: new Error("User not found") };

    const { data: news, error } = await supabase
      .from("news")
      .insert({
        ...data,
        author_id: user.user.id,
        published: data.published ?? true,
      })
      .select()
      .single();

    return { data: news, error };
  },

  async getAllNews() {
    const { data, error } = await supabase
      .from("news")
      .select(`
        *,
        profiles!news_author_id_fkey(full_name, avatar_url)
      `)
      .eq("published", true)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  async getNewsById(id: string) {
    const { data, error } = await supabase
      .from("news")
      .select(`
        *,
        profiles!news_author_id_fkey(full_name, avatar_url)
      `)
      .eq("id", id)
      .single();

    // Increment view count
    if (data) {
      await supabase
        .from("news")
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq("id", id);
    }

    return { data, error };
  },

  async updateNews(id: string, updates: {
    title?: string;
    content?: string;
    cover_image_url?: string;
    published?: boolean;
  }) {
    const { data, error } = await supabase
      .from("news")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  },

  async deleteNews(id: string) {
    const { error } = await supabase
      .from("news")
      .delete()
      .eq("id", id);

    return { error };
  },
};