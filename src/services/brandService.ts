import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  buildLogoObjectPath,
  logoObjectPathFromUrl,
  LOGO_BUCKET,
  validateLogoFile,
  type AllowedLogoType,
} from "@/lib/imageUpload";

type Brand = Database["public"]["Tables"]["brands"]["Row"];
type BrandInsert = Database["public"]["Tables"]["brands"]["Insert"];
type BrandUpdate = Database["public"]["Tables"]["brands"]["Update"];

export const brandService = {
  // Get all active brands
  async getBrands(): Promise<{ data: Brand[] | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .select("*, connected_member:profiles!brands_connected_member_id_fkey(id, full_name)")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    console.log("getBrands:", { data, error });
    return { data, error };
  },

  // Get all brands (admin)
  async getAllBrands(): Promise<{ data: Brand[] | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .select("*, connected_member:profiles!brands_connected_member_id_fkey(id, full_name)")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    console.log("getAllBrands:", { data, error });
    return { data, error };
  },

  // Get brand by ID
  async getBrandById(id: string): Promise<{ data: Brand | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("id", id)
      .single();

    console.log("getBrandById:", { data, error });
    return { data, error };
  },

  // Create brand (admin)
  async createBrand(brand: BrandInsert): Promise<{ data: Brand | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .insert(brand)
      .select()
      .single();

    console.log("createBrand:", { data, error });
    return { data, error };
  },

  // Update brand (admin)
  async updateBrand(id: string, updates: BrandUpdate): Promise<{ data: Brand | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    console.log("updateBrand:", { data, error });
    return { data, error };
  },

  // Delete brand (admin)
  async deleteBrand(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", id);

    console.log("deleteBrand:", { error });
    return { error };
  },

  /**
   * Uploads a logo file to the brand-logos bucket and returns its public URL,
   * to be stored in `brands.logo_url` like any other logo address. Writing to
   * that bucket is restricted to admin/moderator by storage RLS, and the
   * bucket enforces the type and size limits again server-side.
   */
  async uploadLogo(file: File, brandName: string): Promise<{ url: string | null; error: any }> {
    const validation = validateLogoFile(file);
    if (!validation.ok) {
      return { url: null, error: new Error(validation.message) };
    }

    const path = buildLogoObjectPath(brandName, file.type.toLowerCase() as AllowedLogoType);
    const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
      contentType: file.type,
      // The path carries a timestamp, so a URL never points at different bytes.
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      console.error("uploadLogo failed:", error);
      return { url: null, error };
    }

    const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  },

  /**
   * Removes a logo file we uploaded. A URL pointing anywhere else is left
   * alone — a brand hosting its own logo must never have a file deleted on its
   * behalf. Call this only once the row no longer references the URL, so a
   * cancelled edit can't leave a brand pointing at a deleted file.
   */
  async deleteLogo(url: string | null | undefined): Promise<{ error: any }> {
    const path = logoObjectPathFromUrl(url);
    if (!path) return { error: null };

    const { error } = await supabase.storage.from(LOGO_BUCKET).remove([path]);
    if (error) console.error("deleteLogo failed:", error);
    return { error };
  },

  // Toggle brand active status
  async toggleBrandStatus(id: string, isActive: boolean): Promise<{ data: Brand | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    console.log("toggleBrandStatus:", { data, error });
    return { data, error };
  },
};