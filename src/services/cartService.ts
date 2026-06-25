import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CartItem = Database["public"]["Tables"]["cart_items"]["Row"];
type CartItemInsert = Database["public"]["Tables"]["cart_items"]["Insert"];

export const cartService = {
  // Get current user's cart
  async getCart(): Promise<{ data: any[] | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("cart_items")
      .select("*, products(*)")
      .eq("user_id", user.id);

    console.log("getCart:", { data, error });
    return { data, error };
  },

  // Add item to cart
  async addToCart(productId: string, quantity: number = 1): Promise<{ data: CartItem | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    // Check if item already in cart
    const { data: existing } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .single();

    if (existing) {
      // Update quantity
      const { data, error } = await supabase
        .from("cart_items")
        .update({ 
          quantity: existing.quantity + quantity,
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
        .insert({ user_id: user.id, product_id: productId, quantity })
        .select()
        .single();

      console.log("addToCart:", { data, error });
      return { data, error };
    }
  },

  // Update cart item quantity
  async updateQuantity(itemId: string, quantity: number): Promise<{ data: CartItem | null; error: any }> {
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