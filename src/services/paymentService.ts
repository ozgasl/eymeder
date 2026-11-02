import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

import { getBankDetails } from "@/lib/payments/bankTransfer";
import { listEnabledProviders } from "@/lib/payments/registry";
import type { InitializeResult } from "@/lib/payments/types";

type PaymentLink = Database["public"]["Tables"]["payment_links"]["Row"];

export const paymentService = {
  // Bank transfer info. Client-side copy: BANK_* are server-only env vars, so
  // here the defaults apply; /api/payments/bank_transfer/initialize returns the
  // authoritative (env-overridable) details.
  bankInfo: {
    ...getBankDetails(),
    accountNumber: "0000000000", // To be updated by admin
  },

  // Payment methods currently available to buyers.
  listPaymentMethods(): { id: string; label: string }[] {
    return listEnabledProviders().map((p) => ({ id: p.id, label: p.label }));
  },

  // Starts a payment for an existing pending order. The amount is read from
  // the order in the database by the server, never sent from here.
  async initializePayment(orderId: string, provider: string): Promise<InitializeResult> {
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(provider)}/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ orderId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { status: "error", message: body.error || "Ödeme başlatılamadı." };
      }
      return body as InitializeResult;
    } catch {
      return { status: "error", message: "Ödeme başlatılamadı, lütfen tekrar deneyin." };
    }
  },

  /** @deprecated Use initializePayment(orderId, "iyzico"). The amount/buyer args are ignored: the server reads them from the order. */
  async initializeIyzicoPayment(orderData: {
    orderId: string;
    amount: number;
    buyerEmail: string;
    buyerName: string;
    buyerPhone: string;
  }): Promise<{ success: boolean; paymentPageUrl?: string; error?: string }> {
    const result = await this.initializePayment(orderData.orderId, "iyzico");
    if (result.status === "redirect") return { success: true, paymentPageUrl: result.url };
    if (result.status === "error") return { success: false, error: result.message };
    return { success: false, error: "Bu ödeme yöntemi yönlendirme desteklemiyor." };
  },

  /** @deprecated Payment results arrive server-side at /api/payments/[provider]/callback. */
  async verifyIyzicoPayment(_token: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "Ödeme doğrulaması sunucu tarafında yapılır." };
  },

  // Create payment link
  async createPaymentLink(data: {
    orderId?: string;
    amount: number;
    description: string;
    expiresInDays?: number;
  }): Promise<{ data: PaymentLink | null; error: any }> {
    const linkCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = data.expiresInDays 
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: { user } } = await supabase.auth.getUser();

    const { data: link, error } = await supabase
      .from("payment_links")
      .insert({
        order_id: data.orderId,
        link_code: linkCode,
        amount: data.amount,
        description: data.description,
        expires_at: expiresAt,
        created_by: user?.id,
      })
      .select()
      .single();

    console.log("createPaymentLink:", { data: link, error });
    return { data: link, error };
  },

  // Get payment link by code
  async getPaymentLink(code: string): Promise<{ data: PaymentLink | null; error: any }> {
    const { data, error } = await supabase
      .from("payment_links")
      .select("*")
      .eq("link_code", code)
      .eq("is_used", false)
      .single();

    console.log("getPaymentLink:", { data, error });
    return { data, error };
  },

  // Mark payment link as used
  async markPaymentLinkUsed(code: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from("payment_links")
      .update({ 
        is_used: true, 
        used_at: new Date().toISOString() 
      })
      .eq("link_code", code);

    console.log("markPaymentLinkUsed:", { error });
    return { error };
  },

  // Get bank transfer info
  getBankInfo() {
    return this.bankInfo;
  },
};