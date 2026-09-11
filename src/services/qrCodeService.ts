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

  // A verifyQRCode helper used to live here, selecting `*, profiles(*)` — every
  // column of the matching member. Nothing called it, and the staff redemption
  // flow resolves a QR code server-side in /api/admin/brand-codes/redeem, so it
  // was removed rather than left as an all-columns read waiting to be wired up.
};