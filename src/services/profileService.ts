import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  graduation_year: number | null;
  high_school_graduation_year: number | null;
  department: string | null;
  university: string | null;
  university_status: string | null;
  university_graduation_year: number | null;
  profession: string | null;
  company: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  is_mentor: boolean;
  mentor_bio: string | null;
  mentorship_areas: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string | null;
  bio?: string | null;
  graduation_year?: number | null;
  high_school_graduation_year?: number | null;
  department?: string | null;
  university?: string | null;
  university_status?: string | null;
  university_graduation_year?: number | null;
  profession?: string | null;
  company?: string | null;
  country?: string | null;
  city?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  is_mentor?: boolean;
  mentor_bio?: string | null;
  mentorship_areas?: string[] | null;
}

export interface SearchFilters {
  searchTerm?: string;
  graduation_year?: number;
  department?: string;
  profession?: string;
  city?: string;
}

export const profileService = {
  // Get current user's profile
  async getMyProfile(): Promise<{ data: Profile | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      console.log("Get my profile:", { data, error });
      return { data, error };
    } catch (error: any) {
      console.error("Get my profile error:", error);
      return { data: null, error };
    }
  },

  // Get profile by ID
  async getProfileById(userId: string): Promise<{ data: Profile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      console.log("Get profile by ID:", { data, error });
      return { data, error };
    } catch (error: any) {
      console.error("Get profile by ID error:", error);
      return { data: null, error };
    }
  },

  // Update current user's profile
  async updateMyProfile(updates: ProfileUpdate): Promise<{ data: Profile | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select()
      .single();

    console.log("updateMyProfile:", { data, error });
    return { data, error };
  },

  // Update any profile (Admin only)
  async updateProfileById(userId: string, updates: ProfileUpdate): Promise<{ data: Profile | null; error: any }> {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    console.log("updateProfileById:", { data, error });
    return { data, error };
  },

  // Search and filter alumni directory
  async searchAlumni(filters: SearchFilters = {}): Promise<{ data: Profile[]; error: any }> {
    try {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.searchTerm) {
        query = query.or(`full_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%`);
      }

      if (filters.graduation_year) {
        query = query.eq("graduation_year", filters.graduation_year);
      }

      if (filters.department) {
        query = query.ilike("department", `%${filters.department}%`);
      }

      if (filters.profession) {
        query = query.ilike("profession", `%${filters.profession}%`);
      }

      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }

      const { data, error } = await query;

      console.log("Search alumni:", { filters, data, error });
      return { data: data || [], error };
    } catch (error: any) {
      console.error("Search alumni error:", error);
      return { data: [], error };
    }
  },

  // Get all unique departments for filter options
  async getDepartments(): Promise<{ data: string[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("department")
        .not("department", "is", null)
        .order("department");

      if (error) {
        return { data: [], error };
      }

      const uniqueDepartments = [...new Set(data?.map(p => p.department).filter(Boolean) || [])];
      return { data: uniqueDepartments, error: null };
    } catch (error: any) {
      console.error("Get departments error:", error);
      return { data: [], error };
    }
  },

  // Get all unique cities for filter options
  async getCities(): Promise<{ data: string[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("city")
        .not("city", "is", null)
        .order("city");

      if (error) {
        return { data: [], error };
      }

      const uniqueCities = [...new Set(data?.map(p => p.city).filter(Boolean) || [])];
      return { data: uniqueCities, error: null };
    } catch (error: any) {
      console.error("Get cities error:", error);
      return { data: [], error };
    }
  },

  // Upload avatar
  async uploadAvatar(file: File): Promise<{ data: string | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        return { data: null, error: uploadError };
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      await this.updateMyProfile({ avatar_url: publicUrl });

      return { data: publicUrl, error: null };
    } catch (error: any) {
      console.error("Upload avatar error:", error);
      return { data: null, error };
    }
  },

  // Get all profiles
  async getAllProfiles(): Promise<{ data: Profile[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Get all profiles:", { data, error });
      return { data: data || [], error };
    } catch (error: any) {
      console.error("Get all profiles error:", error);
      return { data: [], error };
    }
  },
};