// Turns the stored profiles.fonzip_tags string (raw tag names joined by ", ")
// into the list of tags the admin panel shows.
//
// - "Yönetim" implies "Dernek Üyesi" (see DERNEK_UYESI_TAG_NAMES in
//   membershipProvider), so it's shown alongside it even when Fonzip itself
//   didn't carry the explicit tag.
// - "Mezun Üye" is hidden once the member is a Dernek Üyesi: it only marks
//   alumnus status, which a Dernek Üyesi already is.
export function getDisplayFonzipTags(fonzipTags: string | null): string[] {
  const tags = (fonzipTags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (tags.includes("Yönetim") && !tags.includes("Dernek Üyesi")) {
    tags.unshift("Dernek Üyesi");
  }

  return tags.includes("Dernek Üyesi") ? tags.filter((tag) => tag !== "Mezun Üye") : tags;
}
