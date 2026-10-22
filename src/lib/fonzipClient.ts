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
const MAX_RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_BACKOFF_MS = 2000;

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

// Runs a single Fonzip /users search and returns the matching user ids.
// Tags are deliberately NOT requested via values_list: Fonzip now answers
// 403 "Erişim izniniz yok" for any /users request that selects the `tags`
// field (confirmed 2026-09-29; /tags and tag *filters* still work), which
// made every membership check fail. See fetchTagNamesForUser for how tags are
// read instead. Fonzip enforces one active token per client credential pair,
// so the token is cached in fonzip_token_cache rather than re-requested on
// every call.
async function postFonzipUsers(token: string, attributes: unknown[]): Promise<Array<{ id: number }>> {
  const res = await fetchWithTimeout(`${FONZIP_BASE_URL}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      search: {
        start_page: 1,
        // Generous enough for a couple of same-value accounts, without paging.
        how_many: 20,
        order_by: "id",
        filter: { condition: "and", attributes },
      },
      values_list: ["id"],
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Fonzip user search failed: ${data.error_description || data.error || res.status}`);
  }

  // The response envelope key is `user_list`, not `rows`.
  const data = await res.json();
  return data.user_list ?? [];
}

// Reads a user's tags without selecting the `tags` field: for each known tag
// id, asks whether a user with (id = userId AND tags = tagId) exists.
async function fetchTagNamesForUser(token: string, userId: number): Promise<string[]> {
  const checks = await Promise.all(
    Object.entries(FONZIP_TAG_NAMES).map(async ([tagId, name]) => {
      const rows = await postFonzipUsers(token, [
        { type: "default", parameter: "id", condition: "eq", value: userId },
        { type: "default", parameter: "tags", condition: "eq", value: Number(tagId) },
      ]);
      return rows.length > 0 ? name : null;
    })
  );
  return checks.filter((name): name is string => name !== null);
}

// Searches by one attribute, then resolves tags. Refuses to guess when the
// hits span more than one distinct Fonzip user (e.g. a shared phone number)
// - misattributing another member's tags is worse than reporting "not found".
async function searchFonzipMember(parameter: string, condition: string, value: string | number): Promise<FonzipUserSearchResult> {
  const token = await getAccessToken();
  const rows = await postFonzipUsers(token, [{ type: "default", parameter, condition, value }]);

  const distinctIds = new Set(rows.map((row) => row.id));
  if (distinctIds.size !== 1) {
    return { membershipFound: false, tags: [] };
  }

  const tags = await fetchTagNamesForUser(token, rows[0].id);
  return { membershipFound: true, tags };
}

// Looks up a Fonzip user by their composite membership_no (see
// buildFonzipMembershipNo).
export async function findFonzipMember(membershipNo: number): Promise<FonzipUserSearchResult> {
  return searchFonzipMember("membership_no", "eq", membershipNo);
}

export interface FonzipContactMatchInput {
  email: string;
  phone?: string;
}

// Fallback for when membership_no doesn't match anyone: some members' Fonzip
// accounts predate graduation_year+school_number being adopted as the
// numbering convention (see memory/PROJECT_MEMORY.md) and keep whatever
// membership_no they were originally assigned there, unrelated to their
// school record. Without this fallback, a real Dernek Üyesi/Yönetim member
// looks like they were never found in Fonzip. Tries email first (exact,
// reliable), then phone (last 10 digits, to tolerate country-code/formatting
// differences) only if email didn't match.
export async function findFonzipMemberByContact(input: FonzipContactMatchInput): Promise<FonzipUserSearchResult> {
  const email = input.email.trim().toLowerCase();
  if (email) {
    const byEmail = await searchFonzipMember("email", "eq", email);
    if (byEmail.membershipFound) return byEmail;
  }

  const phoneDigits = input.phone?.replace(/\D/g, "").slice(-10);
  if (phoneDigits && phoneDigits.length === 10) {
    const byPhone = await searchFonzipMember("phone", "contains", phoneDigits);
    if (byPhone.membershipFound) return byPhone;
  }

  return { membershipFound: false, tags: [] };
}

export interface FonzipRawResponse {
  status: number;
  // Parsed JSON body, or null when Fonzip answered with something else (or timed out).
  body: any;
}

// Never throws: the read-only field probe (see fonzipProbe.ts) needs to see
// *which* Fonzip request got a 403 rather than abort on the first one, since
// Fonzip has been known to refuse individual /users fields.
async function fonzipRaw(path: string, init: RequestInit): Promise<FonzipRawResponse> {
  try {
    const token = await getAccessToken();
    // Fonzip rate-limits (429) bursts of paged requests: wait (its Retry-After
    // if given) and retry a few times before reporting the 429.
    for (let attempt = 1; ; attempt++) {
      const res = await fetchWithTimeout(`${FONZIP_BASE_URL}${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      });
      if (res.status === 429 && attempt < MAX_RATE_LIMIT_ATTEMPTS) {
        const retryAfterMs = Number(res.headers.get("retry-after")) * 1000;
        const waitMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : RATE_LIMIT_BACKOFF_MS * attempt;
        await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 8000)));
        continue;
      }
      const body = await res.json().catch(() => null);
      return { status: res.status, body };
    }
  } catch {
    return { status: 0, body: null };
  }
}

// Same as GET /user-defined-values in the Fonzip API spec.
export function fetchFonzipUserDefinedValues(): Promise<FonzipRawResponse> {
  return fonzipRaw("/user-defined-values", { method: "GET" });
}

// One page of POST /users with an arbitrary values_list. Lists every user
// unless `filterAttributes` narrows it (the spec requires a `filter` object
// but doesn't say whether an empty attribute list is accepted).
export function fetchFonzipUsersPage(
  valuesList: string[],
  startPage: number,
  howMany = 100,
  filterAttributes: unknown[] = []
): Promise<FonzipRawResponse> {
  return fonzipRaw("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      search: {
        start_page: startPage,
        how_many: howMany,
        order_by: "id",
        filter: { condition: "and", attributes: filterAttributes },
      },
      values_list: valuesList,
    }),
  });
}

// Fetches the shared token once up front so parallel field probes don't each
// race to request one (Fonzip allows a single active token per client).
export async function warmFonzipToken(): Promise<void> {
  await getAccessToken();
}

const PAGE_SIZE = 100;
const MAX_PAGES = 30;
// The spec marks `filter` required but not whether an empty attribute list is
// accepted; if it isn't, every user has a membership_no >= 1 anyway.
const FALLBACK_FILTER = [{ type: "default", parameter: "membership_no", condition: "gte", value: 1 }];

// Fonzip's list endpoints wrap rows in a differently named key per resource
// (`user_list`, `event_list`...), and the spec doesn't name the one for
// user-defined values: take the first array in the body.
export function fonzipExtractList(body: unknown): any[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    for (const v of Object.values(body as Record<string, unknown>)) {
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

// Every user, page after page, with the given values_list. Stops (truncated)
// at MAX_PAGES or at the first non-200 page, so callers must check `truncated`
// before treating the rows as complete.
export interface FonzipPagedRows {
  status: number;
  filterUsed: "empty" | "membership_no>=1" | null;
  pagesRead: number;
  truncated: boolean;
  rows: any[];
}

export async function fetchAllFonzipUsers(valuesList: string[]): Promise<FonzipPagedRows> {
  let filter: unknown[] = [];
  let filterUsed: FonzipPagedRows["filterUsed"] = "empty";
  let first: FonzipRawResponse = await fetchFonzipUsersPage(valuesList, 1, PAGE_SIZE, filter);
  if (first.status === 400) {
    filter = FALLBACK_FILTER;
    filterUsed = "membership_no>=1";
    first = await fetchFonzipUsersPage(valuesList, 1, PAGE_SIZE, filter);
  }
  if (first.status !== 200) {
    return { status: first.status, filterUsed: null, pagesRead: 0, truncated: false, rows: [] };
  }

  const rows: any[] = [...fonzipExtractList(first.body?.user_list ?? first.body)];
  let pages = 1;
  let lastCount = rows.length;
  let truncated = false;
  while (lastCount >= PAGE_SIZE) {
    if (pages >= MAX_PAGES) {
      truncated = true;
      break;
    }
    const next = await fetchFonzipUsersPage(valuesList, pages + 1, PAGE_SIZE, filter);
    if (next.status !== 200) {
      truncated = true;
      break;
    }
    const list = fonzipExtractList(next.body?.user_list ?? next.body);
    rows.push(...list);
    lastCount = list.length;
    pages += 1;
  }
  return { status: 200, filterUsed, pagesRead: pages, truncated, rows };
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
