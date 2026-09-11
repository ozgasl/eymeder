import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  BRAND_LOGO_UPLOAD,
  buildObjectPath,
  objectPathFromUrl,
  slugifyForPath,
  validateUpload,
} from "@/lib/fileUpload";

type Brand = Database["public"]["Tables"]["brands"]["Row"];
type BrandInsert = Database["public"]["Tables"]["brands"]["Insert"];
type BrandUpdate = Database["public"]["Tables"]["brands"]["Update"];

/**
 * Fills in each brand's `connected_member` from the `brand_connected_members`
 * view, in the shape the pages already read (`brand.connected_member?.full_name`).
 *
 * This used to be a PostgREST embed on `profiles`, which stopped working for
 * logged-out visitors once profiles got RLS — and the brands page is public.
 * The view exposes only the names of members an admin deliberately linked to a
 * brand, and it is read here as a separate query rather than an embed on the
 * view, so the public page does not depend on PostgREST resolving a foreign
 * key through a view.
 */
async function attachConnectedMembers(brands: any[]): Promise<any[]> {
  const ids = Array.from(
    new Set(brands.map((brand) => brand.connected_member_id).filter(Boolean)),
  ) as string[];

  if (ids.length === 0) {
    return brands.map((brand) => ({ ...brand, connected_member: null }));
  }

  const { data, error } = await supabase
    .from("brand_connected_members")
    .select("id, full_name")
    .in("id", ids);

  // A missing name is not worth failing the brands page over.
  if (error) console.error("attachConnectedMembers failed:", error);

  const byId = new Map((data ?? []).map((member: any) => [member.id, member]));
  return brands.map((brand) => ({
    ...brand,
    connected_member: brand.connected_member_id ? byId.get(brand.connected_member_id) ?? null : null,
  }));
}

export const brandService = {
  // Get all active brands
  async getBrands(): Promise<{ data: Brand[] | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data) return { data, error };
    return { data: (await attachConnectedMembers(data)) as Brand[], error: null };
  },

  // Get all brands (admin)
  async getAllBrands(): Promise<{ data: Brand[] | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error || !data) return { data, error };
    return { data: (await attachConnectedMembers(data)) as Brand[], error: null };
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
    const validation = validateUpload(file, BRAND_LOGO_UPLOAD);
    if (!validation.ok) {
      return { url: null, error: new Error(validation.message) };
    }

    const path = buildObjectPath(slugifyForPath(brandName, "marka"), file.type, BRAND_LOGO_UPLOAD);
    const { error } = await supabase.storage.from(BRAND_LOGO_UPLOAD.bucket).upload(path, file, {
      contentType: file.type,
      // The path carries a timestamp, so a URL never points at different bytes.
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      console.error("uploadLogo failed:", error);
      return { url: null, error };
    }

    const { data } = supabase.storage.from(BRAND_LOGO_UPLOAD.bucket).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  },

  /**
   * Removes a logo file we uploaded. A URL pointing anywhere else is left
   * alone — a brand hosting its own logo must never have a file deleted on its
   * behalf. Call this only once the row no longer references the URL, so a
   * cancelled edit can't leave a brand pointing at a deleted file.
   */
  async deleteLogo(url: string | null | undefined): Promise<{ error: any }> {
    const path = objectPathFromUrl(url, BRAND_LOGO_UPLOAD);
    if (!path) return { error: null };

    const { error } = await supabase.storage.from(BRAND_LOGO_UPLOAD.bucket).remove([path]);
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