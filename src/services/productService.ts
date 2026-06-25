import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export const productService = {
  // Get all active products
  async getProducts(): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    console.log("getProducts:", { data, error });
    return { data, error };
  },

  // Get products by category
  async getProductsByCategory(category: string): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .eq("category", category)
      .order("created_at", { ascending: false });

    console.log("getProductsByCategory:", { data, error });
    return { data, error };
  },

  // Get featured products
  async getFeaturedProducts(): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .eq("featured", true)
      .limit(6);

    console.log("getFeaturedProducts:", { data, error });
    return { data, error };
  },

  // Get product by ID
  async getProductById(id: string): Promise<{ data: Product | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    console.log("getProductById:", { data, error });
    return { data, error };
  },

  // Get all products (admin)
  async getAllProducts(): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("getAllProducts:", { data, error });
    return { data, error };
  },

  // Create product (admin)
  async createProduct(product: ProductInsert): Promise<{ data: Product | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("products")
      .insert({ ...product, created_by: user?.id })
      .select()
      .single();

    console.log("createProduct:", { data, error });
    return { data, error };
  },

  // Update product (admin)
  async updateProduct(id: string, updates: ProductUpdate): Promise<{ data: Product | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    console.log("updateProduct:", { data, error });
    return { data, error };
  },

  // Delete product (admin)
  async deleteProduct(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    console.log("deleteProduct:", { error });
    return { error };
  },

  // Toggle product active status (admin)
  async toggleProductStatus(id: string, isActive: boolean): Promise<{ data: Product | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    console.log("toggleProductStatus:", { data, error });
    return { data, error };
  },

  // Update stock (admin)
  async updateStock(id: string, quantity: number): Promise<{ data: Product | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    console.log("updateStock:", { data, error });
    return { data, error };
  },
};