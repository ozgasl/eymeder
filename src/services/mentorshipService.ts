import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { notificationService } from "@/services/notificationService";

export const mentorshipService = {
  async getMentors() {
    // Explicit columns, not "*": this list is what the mentorship page shows,
    // and the row otherwise carried every member's email and phone into the
    // browser of anyone who opened the page.
    //
    // `is_mentor` is one of the view's always-visible columns, so the filter
    // still works for every member; the mentor's profession, company and
    // mentor_bio come back null for a member without the "Dernek Üyesi" tag.
    const { data, error } = await supabase
      .from("member_profiles")
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

    if (!error) {
      const { data: menteeProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.user.id)
        .single();

      await notificationService.createNotification(
        mentorId,
        "mentorship_request",
        "Yeni Mentorluk Talebi",
        `${menteeProfile?.full_name || "Bir üye"} size bir mentorluk talebi gönderdi.`,
        "/mentorship"
      );
    }

    return { data, error };
  },

  async getMyRequests() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { data: null, error: new Error("User not found") };

    // Contact fields (email/phone/bio/city/country/social) are included so an
    // accepted match's profile card can show them — member_profiles still
    // masks them to null per the viewer's own tier, same as everywhere else.
    const { data, error } = await supabase
      .from("mentorship_requests")
      .select(`
        *,
        mentor:member_profiles!mentorship_requests_mentor_id_fkey(id, full_name, avatar_url, profession, company, bio, city, country, email, phone, linkedin_url, twitter_url, instagram_url, facebook_url),
        mentee:member_profiles!mentorship_requests_mentee_id_fkey(id, full_name, avatar_url, department, graduation_year, bio, city, country, email, phone, linkedin_url, twitter_url, instagram_url, facebook_url)
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

    if (!error && data && (status === "accepted" || status === "rejected")) {
      const { data: mentorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.mentor_id)
        .single();

      const mentorName = mentorProfile?.full_name || "Mentor";
      await notificationService.createNotification(
        data.mentee_id,
        "mentorship_request",
        status === "accepted" ? "Mentorluk Talebiniz Kabul Edildi" : "Mentorluk Talebiniz Reddedildi",
        status === "accepted"
          ? `${mentorName} mentorluk talebinizi kabul etti.`
          : `${mentorName} mentorluk talebinizi reddetti.`,
        "/mentorship"
      );
    }

    return { data, error };
  }
};