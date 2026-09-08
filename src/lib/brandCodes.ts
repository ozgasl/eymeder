import { supabaseAdmin } from "@/integrations/supabase/admin";
import type { Database } from "@/integrations/supabase/types";
import { isCodeUsable } from "./discountCode";

export type BrandDiscountCode = Database["public"]["Tables"]["brand_discount_codes"]["Row"];
export type BrandCodeUsage = Database["public"]["Tables"]["brand_code_usages"]["Row"];

// Shared server-side rules for brand discount codes. Every write to
// brand_code_usages goes through an API route using these (there is no member
// INSERT/UPDATE policy on the table), so the usage counters can only be moved
// by a real view/issue/redeem action.

/**
 * Redemptions recorded so far for a campaign — the figure `max_redemptions`
 * caps. Issuing a personal code is deliberately NOT counted here: holding a
 * code is not using it, and the cap is enforced again at redemption time.
 */
export async function countRedemptions(brandCodeId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("brand_code_usages")
    .select("id", { count: "exact", head: true })
    .eq("brand_code_id", brandCodeId)
    .not("redeemed_at", "is", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Turkish reason why a campaign can't be used right now, or null when it can. */
export function campaignUnavailableReason(code: BrandDiscountCode): string | null {
  if (!code.is_active) return "Bu indirim kodu şu anda aktif değil.";
  if (!isCodeUsable(code)) return "Bu indirim kodu geçerlilik tarihi dışında.";
  return null;
}

/** True when the campaign has a redemption cap and it is already full. */
export async function isCapReached(code: BrandDiscountCode): Promise<boolean> {
  if (!code.max_redemptions) return false;
  return (await countRedemptions(code.id)) >= code.max_redemptions;
}

export async function loadCampaign(brandCodeId: string): Promise<BrandDiscountCode | null> {
  const { data } = await supabaseAdmin
    .from("brand_discount_codes")
    .select("*")
    .eq("id", brandCodeId)
    .single();

  return (data as BrandDiscountCode) ?? null;
}

export async function loadUsage(brandCodeId: string, userId: string): Promise<BrandCodeUsage | null> {
  const { data } = await supabaseAdmin
    .from("brand_code_usages")
    .select("*")
    .eq("brand_code_id", brandCodeId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as BrandCodeUsage) ?? null;
}
