import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type UserQRCode = Database["public"]["Tables"]["user_qr_codes"]["Row"];

export const qrCodeService = {
  // Get user's QR code
  async getUserQRCode(userId: string): Promise<{ data: UserQRCode | null; error: any }> {
    const { data, error } = await supabase
      .from("user_qr_codes")
      .select("*")
      .eq("user_id", userId)
      .single();

    console.log("getUserQRCode:", { data, error });
    return { data, error };
  },

  // Get current user's QR code
  async getMyQRCode(): Promise<{ data: UserQRCode | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    return this.getUserQRCode(user.id);
  },

  // Verify QR code exists
  async verifyQRCode(qrCode: string): Promise<{ data: UserQRCode | null; error: any }> {
    const { data, error } = await supabase
      .from("user_qr_codes")
      .select("*, profiles(*)")
      .eq("qr_code", qrCode)
      .single();

    console.log("verifyQRCode:", { data, error });
    return { data, error };
  },
};