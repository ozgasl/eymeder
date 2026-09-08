import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BrandCode = Database["public"]["Tables"]["brand_discount_codes"]["Row"];
type BrandCodeInsert = Database["public"]["Tables"]["brand_discount_codes"]["Insert"];
type BrandCodeUpdate = Database["public"]["Tables"]["brand_discount_codes"]["Update"];

/** Per-campaign counters shown in the admin panel. */
export interface BrandCodeStats {
  /** Members who revealed the code — interest, not proof of use. */
  viewedCount: number;
  /** Members who were issued their own single-use code. */
  issuedCount: number;
  /** Members whose use was confirmed by staff at the till — the real figure. */
  redeemedCount: number;
}

export const EMPTY_STATS: BrandCodeStats = { viewedCount: 0, issuedCount: 0, redeemedCount: 0 };

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token || ""}`,
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: await authHeaders(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "İşlem başarısız oldu.");
  return data as T;
}

export const brandCodeService = {
  // Reads are gated by RLS: only dernek_uyesi members and staff get rows back,
  // so a logged-out visitor simply sees no codes (not an error).
  async getCodes(): Promise<{ data: BrandCode[] | null; error: any }> {
    const { data, error } = await supabase
      .from("brand_discount_codes")
      .select("*")
      .order("created_at", { ascending: true });

    return { data: data as BrandCode[] | null, error };
  },

  async getCodesForBrand(brandId: string): Promise<{ data: BrandCode[] | null; error: any }> {
    const { data, error } = await supabase
      .from("brand_discount_codes")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true });

    return { data: data as BrandCode[] | null, error };
  },

  // Admin CRUD goes through RLS (staff_manage_brand_codes), same as brands.
  async createCode(code: BrandCodeInsert): Promise<{ data: BrandCode | null; error: any }> {
    const { data, error } = await supabase.from("brand_discount_codes").insert(code).select().single();
    return { data: data as BrandCode | null, error };
  },

  async updateCode(id: string, updates: BrandCodeUpdate): Promise<{ data: BrandCode | null; error: any }> {
    const { data, error } = await supabase
      .from("brand_discount_codes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    return { data: data as BrandCode | null, error };
  },

  async deleteCode(id: string): Promise<{ error: any }> {
    const { error } = await supabase.from("brand_discount_codes").delete().eq("id", id);
    return { error };
  },

  /**
   * Usage counters per campaign, aggregated from the usage ledger.
   * `brand_code_usages` holds one row per (campaign, member) with a timestamp
   * for each stage, so counting non-null timestamps gives the three figures
   * without a separate counter column that could drift.
   */
  async getStats(): Promise<{ data: Record<string, BrandCodeStats>; error: any }> {
    const { data, error } = await supabase
      .from("brand_code_usages")
      .select("brand_code_id, first_viewed_at, issued_at, redeemed_at");

    const stats: Record<string, BrandCodeStats> = {};
    for (const row of (data ?? []) as Array<{
      brand_code_id: string;
      first_viewed_at: string | null;
      issued_at: string | null;
      redeemed_at: string | null;
    }>) {
      const entry = (stats[row.brand_code_id] ??= { ...EMPTY_STATS });
      if (row.first_viewed_at) entry.viewedCount++;
      if (row.issued_at) entry.issuedCount++;
      if (row.redeemed_at) entry.redeemedCount++;
    }

    return { data: stats, error };
  },

  /** The signed-in member's own rows (RLS: users_read_own_code_usages). */
  async getMyUsages(): Promise<{ data: Array<Database["public"]["Tables"]["brand_code_usages"]["Row"]> | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: null };

    const { data, error } = await supabase
      .from("brand_code_usages")
      .select("*")
      .eq("user_id", user.id);

    return { data: data as any, error };
  },

  /** Records that the member revealed a shared code (see /api/brand-codes/view). */
  async recordView(brandCodeId: string): Promise<void> {
    try {
      await postJson("/api/brand-codes/view", { brandCodeId });
    } catch (error) {
      // Losing a view count must never break the page for the member.
      console.error("recordView failed:", error);
    }
  },

  /** Issues (or re-reads) the member's personal single-use code. */
  async issueMyCode(brandCodeId: string): Promise<{ code: string; expiresAt: string | null; reissued: boolean }> {
    return postJson("/api/brand-codes/issue", { brandCodeId });
  },

  /** Staff-only: marks a code used at the till. */
  async redeemCode(input: { code: string; memberQrCode?: string; note?: string }): Promise<{
    brandName: string;
    memberName: string;
    discountInfo: string;
    label: string | null;
    code: string;
    redeemedAt: string;
  }> {
    return postJson("/api/admin/brand-codes/redeem", input);
  },
};
