import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Brand = Database["public"]["Tables"]["brands"]["Row"];
type BrandInsert = Database["public"]["Tables"]["brands"]["Insert"];
type BrandUpdate = Database["public"]["Tables"]["brands"]["Update"];

export const brandService = {
  // Get all active brands
  async getBrands(): Promise<{ data: Brand[] | null; error: any }> {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
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
      .select("*")
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