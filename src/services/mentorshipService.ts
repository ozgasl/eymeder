import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const mentorshipService = {
  async getMentors() {
    // Explicit columns, not "*": this list is what the mentorship page shows,
    // and the row otherwise carried every member's email and phone into the
    // browser of anyone who opened the page.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, profession, company, mentor_bio, mentorship_areas, department, graduation_year")
      .eq("is_mentor", true);
    return { data, error };
  },

  async requestMentorship(mentorId: string, message: string) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { error: new Error("User not found") };

    const { data, error } = await supabase
      .from("mentorship_requests")
      .insert({
        mentor_id: mentorId,
        mentee_id: user.user.id,
        message,
        status: "pending"
      })
      .select()
      .single();

    return { data, error };
  },

  async getMyRequests() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: new Error("User not found") };

    const { data, error } = await supabase
      .from("mentorship_requests")
      .select(`
        *,
        mentor:profiles!mentorship_requests_mentor_id_fkey(id, full_name, avatar_url, profession, company),
        mentee:profiles!mentorship_requests_mentee_id_fkey(id, full_name, avatar_url, department, graduation_year)
      `)
      .or(`mentor_id.eq.${user.user.id},mentee_id.eq.${user.user.id}`)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  async updateRequestStatus(requestId: string, status: "accepted" | "rejected" | "completed") {
    const { data, error } = await supabase
      .from("mentorship_requests")
      .update({ status })
      .eq("id", requestId)
      .select()
      .single();

    return { data, error };
  }
};