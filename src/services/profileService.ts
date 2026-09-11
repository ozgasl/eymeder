import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  AVATAR_UPLOAD,
  buildObjectPath,
  describeStorageFailure,
  validateUpload,
} from "@/lib/fileUpload";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  graduation_year: number | null;
  high_school_graduation_year: number | null;
  school_number: string | null;
  membership_tier: string;
  fonzip_membership_status: string | null;
  fonzip_tags: string | null;
  fonzip_checked_at: string | null;
  department: string | null;
  university: string | null;
  university_status: string | null;
  university_graduation_year: number | null;
  profession: string | null;
  profession_group: string | null;
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
  // Not a `profiles` column — attached by getMyProfile/getProfileById/
  // getAllProfiles from profile_universities (own rows) or
  // member_profile_universities (someone else's, column-masked).
  profile_universities?: ProfileUniversity[];
}

export interface ProfileUniversity {
  id: string;
  profile_id: string;
  university: string;
  // "studying" | "graduated" in practice (DB CHECK constraint), typed as
  // string here because the generated Supabase Row type doesn't narrow it.
  status: string | null;
  graduation_year: number | null;
  sort_order: number;
  created_at: string;
}

export interface ProfileUniversityInput {
  university: string;
  status: "studying" | "graduated" | null;
  graduation_year: number | null;
}

export interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string | null;
  bio?: string | null;
  department?: string | null;
  university?: string | null;
  university_status?: string | null;
  university_graduation_year?: number | null;
  profession?: string | null;
  profession_group?: string | null;
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
  profession_group?: string;
  city?: string;
}

export const profileService = {
  // Get current user's profile
  // Deliberately reads `profiles`, not `member_profiles`: this is the member's
  // OWN row, which the narrowed SELECT policy (20260911130000) always allows
  // and which the profile edit form needs unmasked. The same goes for
  // updateMyProfile below, Navigation and useAccessControl (own
  // membership_tier) and gamificationService.checkAndAwardBadges (own row).
  // Every read of SOMEONE ELSE goes through the view.
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

      if (error || !data) {
        console.log("Get my profile:", { data, error });
        return { data, error };
      }

      // Own rows: read `profile_universities` directly, not the masked view —
      // same reasoning as reading `profiles` instead of `member_profiles` above.
      const { data: universities } = await supabase
        .from("profile_universities")
        .select("*")
        .eq("profile_id", user.id)
        .order("sort_order", { ascending: true });

      const result = { ...data, profile_universities: universities || [] };
      console.log("Get my profile:", { data: result, error });
      return { data: result, error };
    } catch (error: any) {
      console.error("Get my profile error:", error);
      return { data: null, error };
    }
  },

  // Get profile by ID
  //
  // Read through `member_profiles`, never `profiles`: this is how a member
  // looks at SOMEONE ELSE, and the view is what decides which of that member's
  // columns they may see. It exposes exactly the same column set, so the shape
  // is unchanged — a member without the "Dernek Üyesi" tag simply gets null
  // where the table would have had an e-mail or a phone number.
  async getProfileById(userId: string): Promise<{ data: Profile | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("member_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        console.log("Get profile by ID:", { data, error });
        return { data, error };
      }

      // Someone else's rows go through the masked view, same as the profile
      // itself came through member_profiles rather than profiles.
      const { data: universities } = await supabase
        .from("member_profile_universities")
        .select("*")
        .eq("profile_id", userId)
        .order("sort_order", { ascending: true });

      const result = { ...data, profile_universities: universities || [] };
      console.log("Get profile by ID:", { data: result, error });
      return { data: result, error };
    } catch (error: any) {
      console.error("Get profile by ID error:", error);
      return { data: null, error };
    }
  },

  // Update current user's profile
  // Note: there is deliberately no "update any profile" helper. profiles RLS
  // only lets a member write their own row, and staff changes go through the
  // admin API routes with the service role.
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

  // Replace the signed-in member's university list. Delete-then-insert rather
  // than diffing: a member edits a handful of rows at a time in one form
  // submit, so there's no meaningful "which row is which" to preserve, and a
  // full replace is simpler than upserting against ids the UI doesn't track
  // between adds/removes/reorders.
  async replaceMyUniversities(
    universities: ProfileUniversityInput[]
  ): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Not authenticated" } };

    const { error: deleteError } = await supabase
      .from("profile_universities")
      .delete()
      .eq("profile_id", user.id);

    if (deleteError) {
      console.error("Replace my universities (delete) error:", deleteError);
      return { error: deleteError };
    }

    if (universities.length === 0) {
      return { error: null };
    }

    const { error: insertError } = await supabase
      .from("profile_universities")
      .insert(
        universities.map((u, index) => ({
          ...u,
          profile_id: user.id,
          sort_order: index,
        }))
      );

    if (insertError) {
      console.error("Replace my universities (insert) error:", insertError);
    }
    return { error: insertError };
  },

  // Search and filter alumni directory
  async searchAlumni(filters: SearchFilters = {}): Promise<{ data: Profile[]; error: any }> {
    try {
      let query = supabase
        .from("member_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // Filters run against the view's columns, so a masked column cannot be
      // used as an oracle: searching by e-mail returns nothing for a member
      // who is not allowed to see e-mail addresses, rather than confirming
      // that some address is registered here.
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
        .from("member_profiles")
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
        .from("member_profiles")
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
  //
  // Nothing calls this yet — the profile page takes an avatar URL as text — but
  // it is validated all the same, so whoever wires up a real picker doesn't
  // inherit an unchecked upload. The `avatars` bucket enforces the same limits
  // (see 20260908200000_avatars_media_bucket_limits.sql), which is what protects
  // the bucket regardless of which code path uploads.
  async uploadAvatar(file: File): Promise<{ data: string | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error("Kullanıcı oturumu bulunamadı") };
      }

      const validation = validateUpload(file, AVATAR_UPLOAD);
      if (!validation.ok) {
        return { data: null, error: new Error(validation.message) };
      }

      // Extension from the MIME type, not from the browser-reported file name.
      const filePath = buildObjectPath(user.id, file.type, AVATAR_UPLOAD);

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_UPLOAD.bucket)
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) {
        return {
          data: null,
          error: new Error(describeStorageFailure(AVATAR_UPLOAD.bucket, uploadError)),
        };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(AVATAR_UPLOAD.bucket)
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
  //
  // The directory and the admin panel both read this. Through the view an
  // admin still gets every column (member_sees_full_profile is true for
  // staff), while a member without the "Dernek Üyesi" tag gets a directory of
  // names, schools and graduation years — which is the rule.
  async getAllProfiles(): Promise<{ data: Profile[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("member_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) {
        console.log("Get all profiles:", { data, error });
        return { data: data || [], error };
      }

      const ids = data.map((p) => p.id).filter((id): id is string => !!id);
      const { data: universities } = ids.length
        ? await supabase
            .from("member_profile_universities")
            .select("*")
            .in("profile_id", ids)
            .order("sort_order", { ascending: true })
        : { data: [] as any[] };

      const universitiesByProfile = new Map<string, ProfileUniversity[]>();
      for (const u of universities || []) {
        if (!u.profile_id) continue;
        const list = universitiesByProfile.get(u.profile_id) || [];
        list.push(u);
        universitiesByProfile.set(u.profile_id, list);
      }

      const result = data.map((p) => ({
        ...p,
        profile_universities: (p.id && universitiesByProfile.get(p.id)) || [],
      }));

      console.log("Get all profiles:", { data: result, error });
      return { data: result, error };
    } catch (error: any) {
      console.error("Get all profiles error:", error);
      return { data: [], error };
    }
  },
};