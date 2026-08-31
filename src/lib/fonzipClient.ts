import { supabaseAdmin } from "@/integrations/supabase/admin";

const FONZIP_BASE_URL = "https://fonzip.com/api/v2";
const TOKEN_ROW_ID = 1;
// Fonzip tokens last 3600s; refresh a bit early so we never try to use one
// that expires mid-request.
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function requestNewToken(): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.FONZIP_CLIENT_ID;
  const clientSecret = process.env.FONZIP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing FONZIP_CLIENT_ID or FONZIP_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetchWithTimeout(`${FONZIP_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Fonzip token request failed: ${data.error_description || data.error || res.status}`);
  }

  return data;
}

async function getAccessToken(): Promise<string> {
  const { data: cached } = await supabaseAdmin
    .from("fonzip_token_cache")
    .select("access_token, expires_at")
    .eq("id", TOKEN_ROW_ID)
    .maybeSingle();

  if (cached && new Date(cached.expires_at as string).getTime() - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
    return cached.access_token as string;
  }

  const { access_token, expires_in } = await requestNewToken();
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("fonzip_token_cache")
    .upsert({ id: TOKEN_ROW_ID, access_token, expires_at: expiresAt });

  return access_token;
}

export interface FonzipUserSearchResult {
  // Whether a Fonzip member with this membership_no exists at all.
  membershipFound: boolean;
  // Whether that member has unpaid dues. null when no matching member was
  // found (the question doesn't apply).
  hasDebt: boolean | null;
}

// Looks up a Fonzip user by their composite membership_no (see
// buildFonzipMembershipNo), returning membership existence and dues status
// as two separate facts rather than a single "good standing" boolean — a
// member who exists but has unpaid dues is a different situation from no
// matching member at all, and the two used to be indistinguishable. Fonzip
// enforces one active token per client credential pair, so the token is
// cached in fonzip_token_cache rather than re-requested on every call.
export async function findFonzipMember(membershipNo: number): Promise<FonzipUserSearchResult> {
  const token = await getAccessToken();

  const res = await fetchWithTimeout(`${FONZIP_BASE_URL}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      search: {
        start_page: 1,
        how_many: 1,
        order_by: "id",
        filter: {
          condition: "and",
          attributes: [
            { type: "default", parameter: "membership_no", condition: "eq", value: membershipNo },
          ],
        },
      },
      values_list: ["id", "unpaid_debt_count"],
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Fonzip user search failed: ${data.error_description || data.error || res.status}`);
  }

  const data = await res.json();
  const row = data.rows?.[0];

  if (!row || (data.total ?? 0) === 0) {
    return { membershipFound: false, hasDebt: null };
  }

  const unpaidDebtCount = Array.isArray(row) ? row[1] : row.unpaid_debt_count;
  return { membershipFound: true, hasDebt: Number(unpaidDebtCount ?? 0) > 0 };
}
