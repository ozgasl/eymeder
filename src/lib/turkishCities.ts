import { normalizePlace } from "@/lib/placeNormalize";

// The 81 provinces of Türkiye, in their official spelling. What gets stored in
// `profiles.city` for members who live in Türkiye (abroad it stays free text).
// Alphabetical order below is Turkish (Ç/Ğ/İ/Ö/Ş/Ü sort after their plain
// letters).
export const TURKISH_CITIES: readonly string[] = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
  "Şırnak", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat",
  "Zonguldak",
];

// Common short forms for the provinces people don't write in full.
const CITY_ALIASES: Record<string, string> = {
  afyon: "Afyonkarahisar",
  maras: "Kahramanmaraş",
  urfa: "Şanlıurfa",
  antep: "Gaziantep",
  icel: "Mersin",
  izmit: "Kocaeli",
  adapazari: "Sakarya",
};

const BY_NORMALIZED: ReadonlyMap<string, string> = new Map(
  TURKISH_CITIES.map((name) => [normalizePlace(name), name] as const)
);

// The province's official name for what someone typed ("istanbul", "HATAY",
// "Izmir", "Afyon"), or null when it isn't one of the 81 provinces.
export function canonicalTurkishCity(input: string | null | undefined): string | null {
  const key = normalizePlace(input);
  if (!key) return null;
  return BY_NORMALIZED.get(key) ?? CITY_ALIASES[key] ?? null;
}
