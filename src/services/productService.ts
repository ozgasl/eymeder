import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  PRODUCT_IMAGE_UPLOAD,
  buildObjectPath,
  objectPathFromUrl,
  slugifyForPath,
  validateUpload,
} from "@/lib/fileUpload";

type ProductBase = Database["public"]["Tables"]["products"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

/** A product with its per-size stock rows (only filled for clothing). */
export type Product = ProductBase & { product_variants?: ProductVariant[] | null };

export interface VariantInput {
  size: string;
  stock_quantity: number;
}

// Every read brings the size rows along, so the store and admin can show stock per size.
const PRODUCT_SELECT = "*, product_variants(*)";

export const productService = {
  // Get all active products
  async getProducts(): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get products by category
  async getProductsByCategory(category: string): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .eq("category", category)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Get featured products
  async getFeaturedProducts(): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .eq("featured", true)
      .limit(6);

    return { data, error };
  },

  // Get product by ID
  async getProductById(id: string): Promise<{ data: Product | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .single();

    return { data, error };
  },

  // Get all products (admin)
  async getAllProducts(): Promise<{ data: Product[] | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Create product (admin)
  async createProduct(product: ProductInsert): Promise<{ data: ProductBase | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("products")
      .insert({ ...product, created_by: user?.id })
      .select()
      .single();

    return { data, error };
  },

  // Update product (admin)
  async updateProduct(id: string, updates: ProductUpdate): Promise<{ data: ProductBase | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  },

  /**
   * Makes a product's size rows exactly `variants`: upserts each size on
   * (product_id, size) and deletes the sizes no longer listed. An empty list
   * clears them all, which is what moving a product out of clothing needs.
   */
  async saveVariants(productId: string, variants: VariantInput[]): Promise<{ error: any }> {
    if (variants.length > 0) {
      const { error } = await supabase.from("product_variants").upsert(
        variants.map((v) => ({
          product_id: productId,
          size: v.size,
          stock_quantity: v.stock_quantity,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "product_id,size" },
      );
      if (error) return { error };
    }

    let removal = supabase.from("product_variants").delete().eq("product_id", productId);
    if (variants.length > 0) {
      removal = removal.not("size", "in", `(${variants.map((v) => `"${v.size}"`).join(",")})`);
    }
    const { error } = await removal;
    return { error };
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
  async toggleProductStatus(id: string, isActive: boolean): Promise<{ data: ProductBase | null; error: any }> {
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
  async updateStock(id: string, quantity: number): Promise<{ data: ProductBase | null; error: any }> {
    const { data, error } = await supabase
      .from("products")
      .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    console.log("updateStock:", { data, error });
    return { data, error };
  },

  /**
   * Uploads a product photo to the product-images bucket and returns its public
   * URL, to be stored in `products.image_url`. Writing to that bucket is
   * restricted to admin/moderator by storage RLS, and the bucket enforces the
   * type and size limits again server-side.
   */
  async uploadImage(file: File, productName: string): Promise<{ url: string | null; error: any }> {
    const validation = validateUpload(file, PRODUCT_IMAGE_UPLOAD);
    if (!validation.ok) {
      return { url: null, error: new Error(validation.message) };
    }

    const path = buildObjectPath(slugifyForPath(productName, "urun"), file.type, PRODUCT_IMAGE_UPLOAD);
    const { error } = await supabase.storage.from(PRODUCT_IMAGE_UPLOAD.bucket).upload(path, file, {
      contentType: file.type,
      // The path carries a timestamp, so a URL never points at different bytes.
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      console.error("uploadImage failed:", error);
      return { url: null, error };
    }

    const { data } = supabase.storage.from(PRODUCT_IMAGE_UPLOAD.bucket).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  },

  /**
   * Removes a product photo we uploaded; a URL pointing anywhere else is left
   * alone. Call this only once the row no longer references the URL.
   */
  async removeImage(url: string | null | undefined): Promise<{ error: any }> {
    const path = objectPathFromUrl(url, PRODUCT_IMAGE_UPLOAD);
    if (!path) return { error: null };

    const { error } = await supabase.storage.from(PRODUCT_IMAGE_UPLOAD.bucket).remove([path]);
    if (error) console.error("removeImage failed:", error);
    return { error };
  },
};
