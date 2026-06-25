import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];
type JobPostingInsert = Database["public"]["Tables"]["job_postings"]["Insert"];
type JobApplication = Database["public"]["Tables"]["job_applications"]["Row"];
type JobApplicationInsert = Database["public"]["Tables"]["job_applications"]["Insert"];

export const jobService = {
  async getAllJobs() {
    const { data, error } = await supabase
      .from("job_postings")
      .select(`
        *,
        poster:profiles!job_postings_posted_by_fkey(id, full_name, company, profession)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  async getJobById(jobId: string) {
    const { data, error } = await supabase
      .from("job_postings")
      .select(`
        *,
        poster:profiles!job_postings_posted_by_fkey(id, full_name, company, profession, avatar_url),
        applications:job_applications(count)
      `)
      .eq("id", jobId)
      .single();

    return { data, error };
  },

  async createJob(job: JobPostingInsert) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("job_postings")
      .insert({ ...job, posted_by: user.id })
      .select()
      .single();

    return { data, error };
  },

  async updateJob(jobId: string, updates: Partial<JobPostingInsert>) {
    const { data, error } = await supabase
      .from("job_postings")
      .update(updates)
      .eq("id", jobId)
      .select()
      .single();

    return { data, error };
  },

  async deleteJob(jobId: string) {
    const { error } = await supabase
      .from("job_postings")
      .delete()
      .eq("id", jobId);

    return { error };
  },

  async applyToJob(jobId: string, application: Partial<JobApplicationInsert>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        job_id: jobId,
        applicant_id: user.id,
        ...application,
      })
      .select()
      .single();

    return { data, error };
  },

  async getMyApplications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("job_applications")
      .select(`
        *,
        job:job_postings(*)
      `)
      .eq("applicant_id", user.id)
      .order("applied_at", { ascending: false });

    return { data, error };
  },

  async getJobApplications(jobId: string) {
    const { data, error } = await supabase
      .from("job_applications")
      .select(`
        *,
        applicant:profiles!job_applications_applicant_id_fkey(id, full_name, profession, city, avatar_url)
      `)
      .eq("job_id", jobId)
      .order("applied_at", { ascending: false });

    return { data, error };
  },

  async updateApplicationStatus(applicationId: string, status: string) {
    const { data, error } = await supabase
      .from("job_applications")
      .update({ status })
      .eq("id", applicationId)
      .select()
      .single();

    return { data, error };
  },

  async createReferral(jobId: string, refereeEmail: string, refereeName: string, message?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("job_referrals")
      .insert({
        job_id: jobId,
        referrer_id: user.id,
        referee_email: refereeEmail,
        referee_name: refereeName,
        message,
      })
      .select()
      .single();

    return { data, error };
  },
};