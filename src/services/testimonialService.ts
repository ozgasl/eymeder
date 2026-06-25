import { supabase } from "@/integrations/supabase/client";

export const testimonialService = {
  async createTestimonial(data: {
    quote: string;
    achievement?: string;
    current_position?: string;
  }) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: new Error("User not found") };

    const { data: testimonial, error } = await supabase
      .from("testimonials")
      .insert({
        ...data,
        user_id: user.user.id,
        approved: false, // Requires admin approval
      })
      .select()
      .single();

    return { data: testimonial, error };
  },

  async getAllTestimonials(featuredOnly = false) {
    let query = supabase
      .from("testimonials")
      .select(`
        *,
        profiles!testimonials_user_id_fkey(full_name, avatar_url, profession, company)
      `)
      .eq("approved", true)
      .order("created_at", { ascending: false });

    if (featuredOnly) {
      query = query.eq("featured", true);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async getMyTestimonial() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: new Error("User not found") };

    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .eq("user_id", user.user.id)
      .maybeSingle();

    return { data, error };
  },

  async updateTestimonial(id: string, updates: {
    quote?: string;
    achievement?: string;
    current_position?: string;
  }) {
    const { data, error } = await supabase
      .from("testimonials")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  },

  async deleteTestimonial(id: string) {
    const { error } = await supabase
      .from("testimonials")
      .delete()
      .eq("id", id);

    return { error };
  },
};