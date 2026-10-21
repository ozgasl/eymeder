import { getDisplayFonzipTags } from "@/lib/fonzipTags";

export type UserSortKey =
  | "full_name"
  | "email"
  | "membership_tier"
  | "fonzip_membership_status"
  | "created_at"
  | "fonzip_checked_at";

export type SortDirection = "asc" | "desc";

export interface UserTableFilters {
  search: string;
  tier: string; // "all" | membership_tier
  fonzipStatus: string; // "all" | "var" | "yok" | "unchecked"
  tag: string; // "all" | tag name | "none"
}

export const DEFAULT_USER_FILTERS: UserTableFilters = {
  search: "",
  tier: "all",
  fonzipStatus: "all",
  tag: "all",
};

export const USER_FILTER_TAGS = ["Dernek Üyesi", "Yönetim", "Mezun Üye", "Bağışçı", "Fahri Üye"];

// Turkish-aware, case/diacritic-insensitive text for search matching.
function normalize(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");
}

export function matchesUserFilters(user: any, filters: UserTableFilters): boolean {
  const query = normalize(filters.search.trim());
  if (query) {
    const haystack = normalize(
      [user.full_name, user.email, user.phone, user.school_number, user.graduation_year].join(" ")
    );
    if (!query.split(/\s+/).every((word) => haystack.includes(word))) return false;
  }

  if (filters.tier !== "all" && user.membership_tier !== filters.tier) return false;

  if (filters.fonzipStatus !== "all") {
    const status = user.fonzip_membership_status ?? "unchecked";
    if (status !== filters.fonzipStatus) return false;
  }

  if (filters.tag !== "all") {
    const tags = getDisplayFonzipTags(user.fonzip_tags);
    if (filters.tag === "none" ? tags.length > 0 : !tags.includes(filters.tag)) return false;
  }

  return true;
}

export function sortUsers(users: any[], key: UserSortKey, direction: SortDirection): any[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...users].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    // Missing values always sink to the bottom, whichever way we sort.
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return factor * String(av).localeCompare(String(bv), "tr", { numeric: true });
  });
}
