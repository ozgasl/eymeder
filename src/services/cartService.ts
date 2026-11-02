import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { missingOptionMessage, stockShortageMessage } from "@/lib/cartOptions";

type CartItem = Database["public"]["Tables"]["cart_items"]["Row"];
type CartItemInsert = Database["public"]["Tables"]["cart_items"]["Insert"];

export const cartService = {
  // Get current user's cart
  async getCart(): Promise<{ data: any[] | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("cart_items")
      .select("*, products(*, product_variants(*)), product_variants(*)")
      .eq("user_id", user.id);

    console.log("getCart:", { data, error });
    return { data, error };
  },

  // Add item to cart. A line is identified by product + size + graduation year.
  async addToCart(
    productId: string,
    quantity: number = 1,
    options: { variantId?: string | null; graduationYear?: number | null } = {},
  ): Promise<{ data: CartItem | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    const variantId = options.variantId ?? null;
    const graduationYear = options.graduationYear ?? null;

    // Load the product (with sizes) to validate options and stock
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      return { data: null, error: productError ?? { message: "Ürün bulunamadı" } };
    }

    const missing = missingOptionMessage(product, { variantId, graduationYear });
    if (missing) return { data: null, error: { message: missing } };

    // Check if the same line is already in the cart
    let existingQuery = supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("product_id", productId);
    existingQuery = variantId
      ? existingQuery.eq("variant_id", variantId)
      : existingQuery.is("variant_id", null);
    existingQuery = graduationYear != null
      ? existingQuery.eq("graduation_year", graduationYear)
      : existingQuery.is("graduation_year", null);
    const { data: existing } = await existingQuery.maybeSingle();

    const newQuantity = (existing?.quantity ?? 0) + quantity;
    const shortage = stockShortageMessage(product, variantId, newQuantity);
    if (shortage) return { data: null, error: { message: shortage } };

    if (existing) {
      // Update quantity
      const { data, error } = await supabase
        .from("cart_items")
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();

      console.log("updateCartItem:", { data, error });
      return { data, error };
    } else {
      // Insert new item
      const { data, error } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          variant_id: variantId,
          graduation_year: graduationYear,
        })
        .select()
        .single();

      console.log("addToCart:", { data, error });
      return { data, error };
    }
  },

  // Update cart item quantity (limited by the size's / product's stock)
  async updateQuantity(itemId: string, quantity: number): Promise<{ data: CartItem | null; error: any }> {
    const { data: item } = await supabase
      .from("cart_items")
      .select("*, products(*, product_variants(*))")
      .eq("id", itemId)
      .maybeSingle();

    if (item?.products) {
      const shortage = stockShortageMessage(item.products as any, item.variant_id, quantity);
      if (shortage) return { data: null, error: { message: shortage } };
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .select()
      .single();

    console.log("updateQuantity:", { data, error });
    return { data, error };
  },

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId);

    console.log("removeFromCart:", { error });
    return { error };
  },

  // Clear cart
  async clearCart(): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Not authenticated" } };

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    console.log("clearCart:", { error });
    return { error };
  },

  // Get cart total
  async getCartTotal(): Promise<{ total: number; itemCount: number }> {
    const { data } = await this.getCart();
    
    if (!data) return { total: 0, itemCount: 0 };

    const total = data.reduce((sum, item) => {
      return sum + (item.products.price * item.quantity);
    }, 0);

    const itemCount = data.reduce((sum, item) => sum + item.quantity, 0);

    return { total, itemCount };
  },
};