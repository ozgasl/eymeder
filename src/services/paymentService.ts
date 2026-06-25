import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PaymentLink = Database["public"]["Tables"]["payment_links"]["Row"];

export const paymentService = {
  // Iyzico configuration (to be filled by admin)
  iyzicoConfig: {
    apiKey: process.env.NEXT_PUBLIC_IYZICO_API_KEY || "",
    secretKey: process.env.NEXT_PUBLIC_IYZICO_SECRET_KEY || "",
    baseUrl: process.env.NEXT_PUBLIC_IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
  },

  // Bank transfer info
  bankInfo: {
    bankName: "Türkiye İş Bankası",
    accountName: "Eyüboğlu Mezunlar Derneği",
    iban: "TR00 0000 0000 0000 0000 0000 00", // To be updated by admin
    accountNumber: "0000000000", // To be updated by admin
  },

  // Initialize Iyzico payment (placeholder - needs backend implementation)
  async initializeIyzicoPayment(orderData: {
    orderId: string;
    amount: number;
    buyerEmail: string;
    buyerName: string;
    buyerPhone: string;
  }): Promise<{ success: boolean; paymentPageUrl?: string; error?: string }> {
    console.log("initializeIyzicoPayment:", orderData);
    
    // This is a placeholder. In production, this should call your backend API
    // which then communicates with Iyzico
    
    if (!this.iyzicoConfig.apiKey || !this.iyzicoConfig.secretKey) {
      return { 
        success: false, 
        error: "Iyzico API anahtarları yapılandırılmamış. Lütfen yönetici ile iletişime geçin." 
      };
    }

    // Backend API endpoint (to be implemented)
    // const response = await fetch('/api/payments/iyzico/initialize', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(orderData)
    // });

    return {
      success: false,
      error: "Iyzico entegrasyonu backend'de yapılacak. API endpoint: /api/payments/iyzico/initialize"
    };
  },

  // Verify Iyzico payment callback
  async verifyIyzicoPayment(token: string): Promise<{ success: boolean; error?: string }> {
    console.log("verifyIyzicoPayment:", token);
    
    // Backend API endpoint (to be implemented)
    // const response = await fetch('/api/payments/iyzico/verify', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ token })
    // });

    return {
      success: false,
      error: "Iyzico doğrulama backend'de yapılacak. API endpoint: /api/payments/iyzico/verify"
    };
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