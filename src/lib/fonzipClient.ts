import { supabaseAdmin } from "@/integrations/supabase/admin";

const FONZIP_BASE_URL = "https://fonzip.com/api/v2";
// Fonzip's own public events page for this association, used to turn an
// event's bare slug (what /events actually returns in `url` - not a full
// link) into a page members can click through to. Confirmed against a live
// event: https://fonzip.com/eymeder/etkinlikler/{slug}.
const FONZIP_PUBLIC_EVENTS_URL = "https://fonzip.com/eymeder/etkinlikler";
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
  // Raw Fonzip tag names attached to that member (see FONZIP_TAG_NAMES).
  // Empty when the member has no tags, or wasn't found.
  tags: string[];
}

// Fonzip's fixed tag set for this association's account, discovered via
// `GET /tags` (there is no OpenAPI spec available in this environment - see
// project memory). Tag ids are stable but not guessable from their names, so
// they're hardcoded here rather than re-fetched on every lookup.
const FONZIP_TAG_NAMES: Record<number, string> = {
  1297198: "Dernek Üyesi",
  1297199: "Mezun Üye",
  1297221: "Bağışçı",
  1297222: "Fahri Üye",
  1297468: "Yönetim",
};

// Looks up a Fonzip user by their composite membership_no (see
// buildFonzipMembershipNo). `tags` is a left-joined field: requesting it in
// values_list returns one row per assigned tag (each with the same `id` but
// a different numeric `tags` value), a single row with `tags: null` if the
// member has no tags, or zero rows if membership_no doesn't match anyone.
// Fonzip enforces one active token per client credential pair, so the token
// is cached in fonzip_token_cache rather than re-requested on every call.
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
        // Fonzip only has 5 tags total, so a member can have at most 5 rows.
        how_many: 10,
        order_by: "id",
        filter: {
          condition: "and",
          attributes: [
            { type: "default", parameter: "membership_no", condition: "eq", value: membershipNo },
          ],
        },
      },
      values_list: ["id", "tags"],
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Fonzip user search failed: ${data.error_description || data.error || res.status}`);
  }

  // The response envelope key is `user_list`, not `rows`.
  const data = await res.json();
  const rows: Array<{ id: number; tags: number | null }> = data.user_list ?? [];

  if (rows.length === 0) {
    return { membershipFound: false, tags: [] };
  }

  const tags = rows
    .map((row) => (row.tags != null ? FONZIP_TAG_NAMES[row.tags] : undefined))
    .filter((name): name is string => Boolean(name));

  return { membershipFound: true, tags };
}

export interface FonzipEvent {
  id: number;
  name: string;
  url: string;
  startDate: string;
  endDate: string;
}

// Lists upcoming (not yet ended) events from Fonzip's own events calendar
// (GET /events, per Fonzip API v2 - see docs/fonzip-api/fonzip-api-v2.yaml),
// so the events page can link members straight to Fonzip's ticket page for
// each one instead of just a generic "see Fonzip" link.
export async function listUpcomingFonzipEvents(limit = 6): Promise<FonzipEvent[]> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    target: "u",
    order_by: "start_date",
    how_many: String(limit),
  });

  const res = await fetchWithTimeout(`${FONZIP_BASE_URL}/events?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Fonzip events request failed: ${data.error_description || data.error || res.status}`);
  }

  const data = await res.json();
  const eventList: Array<{ id: number; name: string; url: string; start_date: string; end_date: string }> =
    data.event_list ?? [];

  return eventList.map((event) => ({
    id: event.id,
    name: event.name,
    url: toFonzipPublicUrl(event.url),
    startDate: event.start_date,
    endDate: event.end_date,
  }));
}

// Fonzip's /events response puts a bare slug (e.g. "eyb-outdoor-macera-turu")
// in `url`, not a full link - resolving it as-is against the member app's
// own origin 404s. Only prefix it if it isn't already absolute, in case
// Fonzip starts returning full URLs later.
function toFonzipPublicUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${FONZIP_PUBLIC_EVENTS_URL}/${url.replace(/^\//, "")}`;
}
