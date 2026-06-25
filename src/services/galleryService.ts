import { supabase } from "@/integrations/supabase/client";

export const galleryService = {
  async uploadMedia(file: File, metadata: {
    title: string;
    description?: string;
    media_type: "photo" | "video";
    year?: number;
    tags?: string[];
  }) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: new Error("User not found") };

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.user.id}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, file);

    if (uploadError) return { data: null, error: uploadError };

    const { data: { publicUrl } } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    // Create media record
    const { data, error } = await supabase
      .from("media_gallery")
      .insert({
        user_id: user.user.id,
        title: metadata.title,
        description: metadata.description || null,
        media_type: metadata.media_type,
        media_url: publicUrl,
        year: metadata.year || null,
        tags: metadata.tags || null,
      })
      .select()
      .single();

    return { data, error };
  },

  async getAllMedia(filters?: { type?: string; year?: number; userId?: string }) {
    let query = supabase
      .from("media_gallery")
      .select(`
        *,
        profiles!media_gallery_user_id_fkey(full_name, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (filters?.type) {
      query = query.eq("media_type", filters.type);
    }
    if (filters?.year) {
      query = query.eq("year", filters.year);
    }
    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async getMediaById(id: string) {
    const { data, error } = await supabase
      .from("media_gallery")
      .select(`
        *,
        profiles!media_gallery_user_id_fkey(full_name, avatar_url)
      `)
      .eq("id", id)
      .single();

    return { data, error };
  },

  async likeMedia(mediaId: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { error: new Error("User not found") };

    const { error } = await supabase
      .from("media_likes")
      .insert({ media_id: mediaId, user_id: user.user.id });

    if (!error) {
      await supabase.rpc("increment_media_likes", { media_id: mediaId });
    }

    return { error };
  },

  async unlikeMedia(mediaId: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { error: new Error("User not found") };

    const { error } = await supabase
      .from("media_likes")
      .delete()
      .eq("media_id", mediaId)
      .eq("user_id", user.user.id);

    if (!error) {
      await supabase.rpc("decrement_media_likes", { media_id: mediaId });
    }

    return { error };
  },

  async deleteMedia(id: string) {
    const { error } = await supabase
      .from("media_gallery")
      .delete()
      .eq("id", id);

    return { error };
  },
};