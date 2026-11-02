import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { missingOptionMessage, stockShortageMessage } from "@/lib/cartOptions";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

export const orderService = {
  // Get current user's orders
  async getMyOrders(): Promise<{ data: any[] | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products(*), product_variants(*))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    console.log("getMyOrders:", { data, error });
    return { data, error };
  },

  // Get all orders (admin)
  async getAllOrders(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products(*), product_variants(*)), profiles(full_name, email)")
      .order("created_at", { ascending: false });

    console.log("getAllOrders:", { data, error });
    return { data, error };
  },

  // Get order by ID
  async getOrderById(id: string): Promise<{ data: any | null; error: any }> {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products(*), product_variants(*)), profiles(full_name, email, phone)")
      .eq("id", id)
      .single();

    console.log("getOrderById:", { data, error });
    return { data, error };
  },

  // Create order from cart
  async createOrder(orderData: {
    payment_method: string;
    shipping_address: string;
    shipping_city: string;
    shipping_zip?: string;
    shipping_phone: string;
    notes?: string;
  }): Promise<{ data: any | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    // Get cart items
    const { data: cartItems } = await supabase
      .from("cart_items")
      .select("*, products(*, product_variants(*)), product_variants(*)")
      .eq("user_id", user.id);

    if (!cartItems || cartItems.length === 0) {
      return { data: null, error: { message: "Cart is empty" } };
    }

    // Validate options and stock per line (the DB trigger decrements stock later)
    const requested = new Map<string, number>();
    for (const item of cartItems) {
      const product = item.products as any;
      const missing = missingOptionMessage(product, {
        variantId: item.variant_id,
        graduationYear: item.graduation_year,
      });
      if (missing) {
        return { data: null, error: { message: `${product.name}: ${missing}` } };
      }
      // The same product/size can appear in several lines (different years)
      const key = `${item.product_id}:${item.variant_id ?? ""}`;
      const total = (requested.get(key) ?? 0) + item.quantity;
      requested.set(key, total);
      const shortage = stockShortageMessage(product, item.variant_id, total);
      if (shortage) return { data: null, error: { message: shortage } };
    }

    // Calculate total
    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + (item.products.price * item.quantity);
    }, 0);

    // Generate order number
    const { data: orderNumber } = await supabase.rpc("generate_order_number");

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber || `ORD-${Date.now()}`,
        total_amount: totalAmount,
        ...orderData,
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.log("createOrder error:", orderError);
      return { data: null, error: orderError };
    }

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      variant_id: item.variant_id,
      size: item.product_variants?.size ?? null,
      graduation_year: item.graduation_year,
      unit_price: item.products.price,
      total_price: item.products.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.log("createOrderItems error:", itemsError);
      return { data: null, error: itemsError };
    }

    // Clear cart
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    console.log("createOrder success:", { order });
    return { data: order, error: null };
  },

  // Update order status (admin)
  async updateOrderStatus(orderId: string, status: string): Promise<{ data: Order | null; error: any }> {
    const { data, error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    console.log("updateOrderStatus:", { data, error });
    return { data, error };
  },

  // Update payment status (admin)
  async updatePaymentStatus(orderId: string, paymentStatus: string): Promise<{ data: Order | null; error: any }> {
    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    console.log("updatePaymentStatus:", { data, error });
    return { data, error };
  },

  // Upload payment proof
  async uploadPaymentProof(orderId: string, fileUrl: string): Promise<{ data: Order | null; error: any }> {
    const { data, error } = await supabase
      .from("orders")
      .update({ payment_proof_url: fileUrl, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    console.log("uploadPaymentProof:", { data, error });
    return { data, error };
  },

  // Cancel order
  async cancelOrder(orderId: string): Promise<{ data: Order | null; error: any }> {
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    console.log("cancelOrder:", { data, error });
    return { data, error };
  },
};